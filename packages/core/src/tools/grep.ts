/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { globStream } from 'glob';
import { execStreaming } from '../utils/shell-utils.js';
import {
  type ToolResult,
  BaseDeclarativeTool,
  Kind,
  type ToolInvocation,
} from './tools.js';
import { type Config } from '../config/config.js';
import {
  type GrepToolParams,
  GREP_TOOL_NAME,
  GREP_DEFINITION,
  GREP_DISPLAY_NAME,
} from './definitions/coreTools.js';
import { resolveToolDeclaration } from './definitions/resolver.js';
import { debugLogger } from '../utils/debugLogger.js';
import { getErrorMessage, isNodeError } from '../utils/errors.js';
import { makeRelative, shortenPath } from '../utils/paths.js';
import { type MessageBus } from '../utils/message-bus.js';
import { buildPatternArgsPattern } from './grep-utils.js';

/**
 * Grep match result.
 */
export interface GrepMatch {
  filePath: string;
  absolutePath: string;
  lineNumber: number;
  line: string;
}

/**
 * Logic to perform the grep search.
 */
class GrepToolInvocation extends BaseDeclarativeTool<GrepToolParams, ToolResult> {
  constructor(
    private readonly config: Config,
    private readonly params: GrepToolParams,
    messageBus: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(
      toolName || GREP_TOOL_NAME,
      toolDisplayName || GREP_DISPLAY_NAME,
      GREP_DEFINITION.base.description!,
      Kind.Search,
      GREP_DEFINITION.base.parametersJsonSchema,
      messageBus,
      true,
      false,
    );
  }

  async run(options: { signal: AbortSignal }): Promise<ToolResult> {
    const {
      pattern,
      dir_path,
      include_pattern,
      exclude_pattern,
      max_matches_per_file,
      total_max_matches,
    } = this.params;

    const targetDir = this.config.getTargetDir();
    const absolutePath = dir_path ? path.resolve(targetDir, dir_path) : targetDir;

    // Path validation
    const accessError = this.config.validatePathAccess(absolutePath, 'read');
    if (accessError) {
      return {
        content: [{ type: 'text', text: `Access denied: ${accessError}` }],
        isError: true,
      };
    }

    const maxMatches = total_max_matches || 100;
    const results = await this.performGrepSearch({
      pattern,
      absolutePath,
      include_pattern,
      exclude_pattern,
      max_matches_per_file,
      maxMatches,
      signal: options.signal,
    });

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No matches found for pattern '${pattern}' in ${dir_path || './'}.`,
          },
        ],
      };
    }

    const formattedResults = results
      .map(
        (m) =>
          `File: ${m.filePath}\nLine: ${m.lineNumber}\nMatch: ${m.line}\n${'-'.repeat(20)}`,
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${results.length} matches:\n\n${formattedResults}`,
        },
      ],
      data: {
        matches: results.map((r) => ({
          file: r.filePath,
          line: r.lineNumber,
          content: r.line,
        })),
      },
    };
  }

  getLlmUsage(): Record<string, unknown> {
    return {
      argsPattern: buildPatternArgsPattern(this.params.pattern),
    };
  }

  /**
   * Checks if a command is available in the system's PATH.
   * @param {string} command The command name (e.g., 'git', 'grep').
   * @returns {Promise<boolean>} True if the command is available, false otherwise.
   */
  private async isCommandAvailable(command: string): Promise<boolean> {
    const checkCommand = process.platform === 'win32' ? 'where' : 'which';
    const checkArgs = [command];
    try {
      const sandboxManager = this.config.sandboxManager;

      let finalCommand = checkCommand;
      let finalArgs = checkArgs;
      let finalEnv = process.env;
      let cleanup: (() => void) | undefined;

      if (sandboxManager) {
        try {
          const prepared = await sandboxManager.prepareCommand({
            command: checkCommand,
            args: checkArgs,
            cwd: process.cwd(),
            env: process.env,
          });
          finalCommand = prepared.program;
          finalArgs = prepared.args;
          finalEnv = prepared.env;
          cleanup = prepared.cleanup;
        } catch (err) {
          debugLogger.debug(
            `[GrepTool] Sandbox preparation failed for '${command}':`,
            err,
          );
        }
      }

      try {
        return await new Promise((resolve) => {
          const child = spawn(finalCommand, finalArgs, {
            stdio: 'ignore',
            shell: false,
            env: finalEnv,
          });
          child.on('close', (code) => {
            resolve(code === 0);
          });
          child.on('error', (err) => {
            debugLogger.debug(
              `[GrepTool] Failed to start process for '${command}':`,
              err.message,
            );
            resolve(false);
          });
        });
      } finally {
        cleanup?.();
      }
    } catch {
      return false;
    }
  }

  /**
   * Performs the actual search using the prioritized strategies.
   * @param options Search options including pattern, absolute path, and include glob.
   */
  private async performGrepSearch(options: {
    pattern: string;
    absolutePath: string;
    include_pattern?: string;
    exclude_pattern?: string;
    max_matches_per_file?: number;
    maxMatches: number;
    signal: AbortSignal;
  }): Promise<GrepMatch[]> {
    const {
      pattern,
      absolutePath,
      include_pattern,
      exclude_pattern,
      max_matches_per_file,
      maxMatches,
    } = options;

    let strategyUsed = 'none';

    try {
      let excludeRegex: RegExp | null = null;
      if (exclude_pattern) {
        excludeRegex = new RegExp(exclude_pattern, 'i');
      }

      // --- Strategy 1: git grep ---
      const isGit = isGitRepository(absolutePath);
      const gitAvailable = isGit && (await this.isCommandAvailable('git'));

      if (gitAvailable) {
        strategyUsed = 'git grep';
        const gitArgs = [
          'grep',
          '--untracked',
          '-n',
          '-E',
          '--ignore-case',
          pattern,
        ];
        if (max_matches_per_file) {
          gitArgs.push('--max-count', max_matches_per_file.toString());
        }
        if (include_pattern) {
          gitArgs.push('--', include_pattern);
        }

        try {
          const generator = execStreaming('git', gitArgs, {
            cwd: absolutePath,
            signal: options.signal,
            allowedExitCodes: [0, 1],
            sandboxManager: this.config.sandboxManager,
          });

          const results: GrepMatch[] = [];
          for await (const line of generator) {
            const match = this.parseGrepLine(line, absolutePath);
            if (match) {
              if (excludeRegex && excludeRegex.test(match.line)) {
                continue;
              }
              results.push(match);
              if (results.length >= maxMatches) {
                break;
              }
            }
          }
          return results;
        } catch (gitError: unknown) {
          debugLogger.debug(
            `GrepLogic: git grep failed: ${getErrorMessage(
              gitError,
            )}. Falling back...`,
          );
        }
      }

      // --- Strategy 2: System grep ---
      debugLogger.debug(
        'GrepLogic: System grep is being considered as fallback strategy.',
      );

      const grepAvailable = await this.isCommandAvailable('grep');
      if (grepAvailable) {
        strategyUsed = 'system grep';
        const grepArgs = ['-r', '-n', '-H', '-E', '-I'];
        // Extract directory names from exclusion patterns for grep --exclude-dir
        const globExcludes = this.fileExclusions.getGlobExcludes();
        const commonExcludes = globExcludes
          .map((pattern) => {
            let dir = pattern;
            if (dir.startsWith('**/')) {
              dir = dir.substring(3);
            }
            if (dir.endsWith('/**')) {
              dir = dir.slice(0, -3);
            } else if (dir.endsWith('/')) {
              dir = dir.slice(0, -1);
            }

            // Only consider patterns that are likely directories. This filters out file patterns.
            if (dir && !dir.includes('/') && !dir.includes('*')) {
              return dir;
            }
            return null;
          })
          .filter((dir): dir is string => !!dir);
        commonExcludes.forEach((dir) => grepArgs.push(`--exclude-dir=${dir}`));
        if (max_matches_per_file) {
          grepArgs.push('--max-count', max_matches_per_file.toString());
        }
        if (include_pattern) {
          grepArgs.push(`--include=${include_pattern}`);
        }
        grepArgs.push(pattern);
        grepArgs.push('.');

        const results: GrepMatch[] = [];
        try {
          const generator = execStreaming('grep', grepArgs, {
            cwd: absolutePath,
            signal: options.signal,
            allowedExitCodes: [0, 1],
            sandboxManager: this.config.sandboxManager,
          });

          for await (const line of generator) {
            const match = this.parseGrepLine(line, absolutePath);
            if (match) {
              if (excludeRegex && excludeRegex.test(match.line)) {
                continue;
              }
              results.push(match);
              if (results.length >= maxMatches) {
                break;
              }
            }
          }
          return results;
        } catch (grepError: unknown) {
          if (
            grepError instanceof Error &&
            /Permission denied|Is a directory/i.test(grepError.message)
          ) {
            return results;
          }
          debugLogger.debug(
            `GrepLogic: System grep failed: ${getErrorMessage(
              grepError,
            )}. Falling back...`,
          );
        }
      }

      // --- Strategy 3: Pure JavaScript Fallback ---
      debugLogger.debug(
        'GrepLogic: Falling back to JavaScript grep implementation.',
      );
      strategyUsed = 'javascript fallback';
      const globPattern = include_pattern ? include_pattern : '**/*';
      const ignorePatterns = this.fileExclusions.getGlobExcludes();

      const filesStream = globStream(globPattern, {
        cwd: absolutePath,
        dot: true,
        ignore: ignorePatterns,
        absolute: true,
        nodir: true,
        signal: options.signal,
      });

      const regex = new RegExp(pattern, 'i');
      const allMatches: GrepMatch[] = [];

      for await (const filePath of filesStream) {
        if (allMatches.length >= maxMatches) break;
        const fileAbsolutePath = filePath;
        // security check
        const relativePath = path.relative(absolutePath, fileAbsolutePath);
        if (
          relativePath === '..' ||
          relativePath.startsWith(`..${path.sep}`) ||
          path.isAbsolute(relativePath)
        )
          continue;

        try {
          const content = await fsPromises.readFile(fileAbsolutePath, 'utf8');
          const lines = content.split(/\r?\n/);
          let matchesInFile = 0;
          for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            if (regex.test(line)) {
              if (excludeRegex && excludeRegex.test(line)) {
                continue;
              }
              allMatches.push({
                filePath:
                  path.relative(absolutePath, fileAbsolutePath) ||
                  path.basename(fileAbsolutePath),
                absolutePath: fileAbsolutePath,
                lineNumber: index + 1,
                line,
              });
              matchesInFile++;
              if (allMatches.length >= maxMatches) break;
              if (
                max_matches_per_file &&
                matchesInFile >= max_matches_per_file
              ) {
                break;
              }
            }
          }
        } catch (readError: unknown) {
          // Ignore errors like permission denied or file gone during read
          if (!isNodeError(readError) || readError.code !== 'ENOENT') {
            debugLogger.debug(
              `GrepLogic: Could not read/process ${fileAbsolutePath}: ${getErrorMessage(
                readError,
              )}`,
            );
          }
        }
      }

      return allMatches;
    } catch (error: unknown) {
      debugLogger.warn(
        `GrepLogic: Error in performGrepSearch (Strategy: ${strategyUsed}): ${getErrorMessage(
          error,
        )}`,
      );
      throw error; // Re-throw
    }
  }

  private parseGrepLine(line: string, absolutePath: string): GrepMatch | null {
    // Expected format: filePath:lineNumber:lineContent
    const parts = line.split(':');
    if (parts.length >= 3) {
      const filePath = parts[0];
      const lineNumber = parseInt(parts[1], 10);
      const lineContent = parts.slice(2).join(':');

      if (filePath && !isNaN(lineNumber)) {
        return {
          filePath,
          absolutePath: path.resolve(absolutePath, filePath),
          lineNumber,
          line: lineContent,
        };
      }
    }
    return null;
  }

  getDescription(): string {
    let description = `'${this.params.pattern}'`;
    if (this.params.include_pattern) {
      description += ` in ${this.params.include_pattern}`;
    }
    if (this.params.dir_path) {
      const resolvedPath = path.resolve(
        this.config.getTargetDir(),
        this.params.dir_path,
      );
      if (
        resolvedPath === this.config.getTargetDir() ||
        this.params.dir_path === '.'
      ) {
        description += ` within ./`;
      } else {
        const relativePath = makeRelative(
          resolvedPath,
          this.config.getTargetDir(),
        );
        description += ` within ${shortenPath(relativePath)}`;
      }
    } else {
      // When no path is specified, indicate searching all workspace directories
      const workspaceContext = this.config.getWorkspaceContext();
      const directories = workspaceContext.getDirectories();
      if (directories.length > 1) {
        description += ` across all workspace directories`;
      }
    }
    return description;
  }
}

/**
 * Implementation of the Grep tool logic (moved from CLI)
 */
export class GrepTool extends BaseDeclarativeTool<GrepToolParams, ToolResult> {
  static readonly Name = GREP_TOOL_NAME;
  constructor(
    private readonly config: Config,
    messageBus: MessageBus,
  ) {
    super(
      GrepTool.Name,
      GREP_DISPLAY_NAME,
      GREP_DEFINITION.base.description!,
      Kind.Search,
      GREP_DEFINITION.base.parametersJsonSchema,
      messageBus,
      true,
      false,
    );
  }

  /**
   * Validates the parameters for the tool
   * @param params Parameters to validate
   * @returns An error message string if invalid, null otherwise
   */
  protected override validateToolParamValues(
    params: GrepToolParams,
  ): string | null {
    try {
      new RegExp(params.pattern);
    } catch (error) {
      return `Invalid regular expression pattern provided: ${params.pattern}. Error: ${getErrorMessage(error)}`;
    }

    if (params.exclude_pattern) {
      try {
        new RegExp(params.exclude_pattern);
      } catch (error) {
        return `Invalid exclude regular expression pattern provided: ${params.exclude_pattern}. Error: ${getErrorMessage(error)}`;
      }
    }

    if (
      params.max_matches_per_file !== undefined &&
      params.max_matches_per_file < 1
    ) {
      return 'max_matches_per_file must be at least 1.';
    }

    if (
      params.total_max_matches !== undefined &&
      params.total_max_matches < 1
    ) {
      return 'total_max_matches must be at least 1.';
    }

    // Only validate dir_path if one is provided
    if (params.dir_path) {
      const resolvedPath = path.resolve(
        this.config.getTargetDir(),
        params.dir_path,
      );
      const validationError = this.config.validatePathAccess(
        resolvedPath,
        'read',
      );
      if (validationError) {
        return validationError;
      }

      // We still want to check if it's a directory
      try {
        const stats = fs.statSync(resolvedPath);
        if (!stats.isDirectory()) {
          return `Path is not a directory: ${resolvedPath}`;
        }
      } catch (error: unknown) {
        if (isNodeError(error) && error.code === 'ENOENT') {
          return `Path does not exist: ${resolvedPath}`;
        }
        return `Failed to access path stats for ${resolvedPath}: ${getErrorMessage(error)}`;
      }
    }

    return null; // Parameters are valid
  }

  protected createInvocation(
    params: GrepToolParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<GrepToolParams, ToolResult> {
    return new GrepToolInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }

  override getSchema(modelId?: string) {
    return resolveToolDeclaration(GREP_DEFINITION, modelId);
  }
}

function isGitRepository(dir: string): boolean {
  try {
    return fs.existsSync(path.join(dir, '.git'));
  } catch {
    return false;
  }
}
