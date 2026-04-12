/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
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
export declare function handleDucerCommand(argv: DucerArgs, config: {
    getGeminiClient: () => unknown;
    getSessionId: () => string;
}): Promise<void>;
export declare const ducerCommand: {
    command: string;
    describe: string;
    builder: (yargs: {
        positional: (name: string, opt: object) => unknown;
        option: (name: string, opt: object) => unknown;
    }) => any;
    handler: () => Promise<void>;
};
export {};
