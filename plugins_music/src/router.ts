/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import type { Argv } from 'yargs';
import { DucerCore } from './ducer_core.js';
import {
  ReaperBridgeClient,
  getReaperScriptsDir,
} from './reaper_bridge_client.js';
import { generatePremiumHTML } from './ui_generator.js';
import { DAW_CONTROL_PROMPT } from './prompts.js';

/**
 * Performs an atomic write by writing to a temporary file and then renaming it.
 */
function atomicWriteSync(filePath: string, content: string): void {
  const tempPath = filePath + '.tmp';
  fs.writeFileSync(tempPath, content);
  fs.renameSync(tempPath, filePath);
}

interface DucerArgs {
  subcommand?: string;
  file?: string;
  advanced?: boolean;
  lite?: boolean;
  query?: string;
  [key: string]: unknown;
}

/**
 * handleDucerCommand: CLI entry point for the music layer.
 * Delegates actual logic to the DucerCore identity.
 */
export async function handleDucerCommand(
  argv: DucerArgs,
  config: { getGeminiClient: () => unknown; getSessionId: () => string },
) {
  const bridge = new ReaperBridgeClient();
  const ducer = new DucerCore(bridge);
  const subcommand = argv.subcommand;
  const filePath = argv.file;
  const isAdvanced = argv.advanced || false;
  const isLite = argv.lite || false;

  console.log(`\n[DUCER] Producer Intelligence active.`);

  if (subcommand === 'analyze') {
    if (!filePath) {
      console.error(
        'Error: Debes proporcionar una ruta de archivo con --file [ruta]',
      );
      return;
    }

    if (!fs.existsSync(filePath)) {
      console.error(`Error: El archivo no existe en la ruta: ${filePath}`);
      return;
    }

    const mode = isAdvanced ? 'advanced' : isLite ? 'lite' : 'standard';
    console.log(
      `[Ducer] Iniciando auditoría experta (${mode}): ${path.basename(filePath)}...`,
    );

    try {
      const fullResponse = await ducer.analyzeFile(filePath, mode, config);

      if (isAdvanced) {
        await handleAdvancedArtifacts(fullResponse, filePath);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Ducer] Error durante el análisis: ${message}`);
    }
  } else if (subcommand === 'do' || !subcommand || subcommand === 'service') {
    // prepare context
    const context = DAW_CONTROL_PROMPT;
    const finalQuery = (argv.query as string) || (argv['queryPositional'] as string);

    if (subcommand === 'do' && finalQuery) {
      await ducer.getInsight(finalQuery, context, config);
    } else if (subcommand === 'service') {
      await runServiceLoop(ducer, context, config);
    } else {
      console.log(
        '\n[Ducer] Entrando en Modo Productor Interactivo. (REAPER Linked)',
      );
      // Interactive mode integration with base CLI handled via core
    }
  } else {
    console.log(
      'Comando no reconocido. Usa "ducer analyze", "ducer do" o simplemente "ducer"',
    );
  }
}

/**
 * Professional service loop for DAW integration.
 */
async function runServiceLoop(
  ducer: DucerCore,
  context: string,
  config: { getGeminiClient: () => unknown; getSessionId: () => string },
) {
  console.log(
    `\n[Ducer] Service Mode Active. Listening for REAPER commands...`,
  );

  const scriptsDir = getReaperScriptsDir();
  const SERVICE_CMD_FILE = path.join(scriptsDir, 'ducer_commands.txt');
  const SERVICE_RESP_FILE = path.join(scriptsDir, 'ducer_response.txt');

  if (fs.existsSync(SERVICE_RESP_FILE)) atomicWriteSync(SERVICE_RESP_FILE, '');

  while (true) {
    if (fs.existsSync(SERVICE_CMD_FILE)) {
      const cmd = fs.readFileSync(SERVICE_CMD_FILE, 'utf8').trim();
      if (cmd !== '') {
        atomicWriteSync(SERVICE_CMD_FILE, '');
        console.log(`\n[Ducer Service] Incoming Command: ${cmd}`);

        try {
          const response = await ducer.getInsight(cmd, context, config);
          atomicWriteSync(SERVICE_RESP_FILE, response);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          atomicWriteSync(SERVICE_RESP_FILE, `Error: ${msg}`);
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

/**
 * Handles saving and opening the advanced reporting artifacts.
 */
async function handleAdvancedArtifacts(content: string, originalFile: string) {
  const baseFileName =
    'Ducer_Report_' +
    path.basename(originalFile, path.extname(originalFile)) +
    '_' +
    Date.now();
  const rootReportDir = path.join(process.cwd(), 'reports');

  if (!fs.existsSync(rootReportDir))
    fs.mkdirSync(rootReportDir, { recursive: true });

  // 1. Save Markdown
  fs.writeFileSync(path.join(rootReportDir, baseFileName + '.md'), content);

  // 2. Generate and Save HTML Premium
  const htmlContent = generatePremiumHTML(content, path.basename(originalFile));
  const htmlPath = path.join(rootReportDir, baseFileName + '.html');
  fs.writeFileSync(htmlPath, htmlContent);

  const fileUrl = pathToFileURL(htmlPath).href;

  console.log('\n[Ducer] Auditoría finalizada. Reportes generados:');
  console.log(`  -> MD: ${baseFileName}.md`);
  console.log(`  -> HTML: ${baseFileName}.html`);
  console.log(`  -> Link: ${fileUrl}`);

  // 3. Open in Browser
  const opener =
    process.platform === 'win32'
      ? 'start'
      : process.platform === 'darwin'
        ? 'open'
        : 'xdg-open';
  const command =
    process.platform === 'win32'
      ? `${opener} "" "${htmlPath}"`
      : `${opener} "${htmlPath}"`;

  exec(command, (err) => {
    if (err)
      console.error('[Ducer] No se pudo abrir automáticamente: ' + err.message);
  });
}

export const ducerCommand = {
  command: 'ducer [subcommand] [queryPositional]',
  describe: 'Ducer Production Layer (Audio/MIDI analysis and generation)',
  builder: (yargs: Argv) => {
    return yargs
      .positional('subcommand', {
        type: 'string',
        describe: 'Subcomando de Ducer (analyze, do, service)',
        choices: ['analyze', 'do', 'service'],
      })
      .positional('queryPositional', {
        type: 'string',
        describe: 'Consulta en lenguaje natural (solo para modo do)',
      })
      .option('file', {
        alias: 'f',
        type: 'string',
        describe: 'Ruta al archivo de audio/MIDI a procesar',
      })
      .option('advanced', {
        alias: 'a',
        type: 'boolean',
        describe: 'Generar reporte avanzado (HTML Premium)',
        default: false,
      })
      .option('lite', {
        alias: 'l',
        type: 'boolean',
        describe: 'Generar resumen técnico conciso',
        default: false,
      })
      .option('query', {
        alias: 'q',
        type: 'string',
        describe: 'Consulta en lenguaje natural para el modo do',
      });
  },
  handler: async () => {}, // Handled by the dispatcher
};
