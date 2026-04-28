/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CommandModule, Argv } from 'yargs';
import { ducerCommand as pluginDucerCommand, handleDucerCommand } from '@google/gemini-cli-plugin-music';
import { initializeOutputListenersAndFlush, resolveSessionId } from '../gemini.js';
import { loadSettings } from '../config/settings.js';
import { loadCliConfig, type CliArgs } from '../config/config.js';
import { exitCli } from './utils.js';
import { validateNonInteractiveAuth } from '../validateNonInterActiveAuth.js';
import { debugLogger } from '@google/gemini-cli-core';

interface DucerArgs extends Partial<CliArgs> {
  subcommand?: string;
  resume?: string;
  advanced?: boolean;
  lite?: boolean;
  [key: string]: unknown;
}

/**
 * Bridge command to the Ducer production layer.
 */
export const ducerCommand: CommandModule<object, DucerArgs> = {
  ...pluginDucerCommand,
  builder: (yargs: Argv) =>
    pluginDucerCommand.builder(yargs).middleware((argv: DucerArgs) => {
      initializeOutputListenersAndFlush();
      if (argv.subcommand) {
        argv['isCommand'] = true;
      }
    }),
  handler: async (argv: DucerArgs) => {
    // Si no hay subcomando, no hacemos nada aquÃ­ y dejamos que el flujo
    // principal de la CLI continÃºe hacia startInteractiveUI.
    if (!argv.subcommand) {
      return;
    }

    try {
      // 1. Cargamos configuraciÃ³n base
      const settings = loadSettings();
      const { sessionId } = await resolveSessionId(argv.resume);

      // 2. Cargamos el Config completo
      const config = await loadCliConfig(
        settings.merged,
        sessionId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        argv as unknown as CliArgs,
      );
      
      // 3. AutenticaciÃ³n
      const authType = await validateNonInteractiveAuth(
        settings.merged.security.auth.selectedType,
        settings.merged.security.auth.useExternal,
        config,
        settings
      );
      
      if (authType) {
        await config.refreshAuth(authType);
      }

      await config.initialize();

      // 4. Ejecutamos la lÃ³gica de la capa musical (Ducer)
      await handleDucerCommand(argv, config);

      // 5. Salimos limpiamente
      await exitCli();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      debugLogger.error('Error en el comando ducer:', message);
      process.exit(1);
    }
  }
};
