/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, 'plugins_music', 'python_env');

/**
 * Runs a command and returns a promise.
 */
async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`> ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, { stdio: 'inherit', shell: true, ...options });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with code ${code}`));
    });
  });
}

/**
 * Main setup function.
 */
async function main() {
  console.log('--- Ducer UVR Setup ---');
  try {
    // 1. Check Python
    try {
      // Try 'python' then 'python3'
      let pythonCmd = 'python';
      try {
        await runCommand('python', ['--version'], { stdio: 'ignore' });
      } catch (e) {
        pythonCmd = 'python3';
        await runCommand('python3', ['--version'], { stdio: 'ignore' });
      }
      console.log(`Using ${pythonCmd} for setup.`);

      // 2. Create VENV if it doesn't exist
      if (!fs.existsSync(ENV_PATH)) {
        console.log('Creating virtual environment in:', ENV_PATH);
        await runCommand(pythonCmd, ['-m', 'venv', ENV_PATH]);
      } else {
        console.log('Virtual environment already exists.');
      }

      // 3. Determine pip path
      const isWin = process.platform === 'win32';
      const pipPath = isWin
        ? path.join(ENV_PATH, 'Scripts', 'pip.exe')
        : path.join(ENV_PATH, 'bin', 'pip');

      // 4. Update pip
      console.log('Updating pip...');
      await runCommand(pipPath, ['install', '--upgrade', 'pip']);

      // 5. Install audio-separator
      console.log('Installing audio-separator...');
      // We try to detect GPU support (simple check for nvidia-smi)
      let extra = '';
      try {
        await runCommand('nvidia-smi', [], { stdio: 'ignore' });
        extra = '[gpu]';
        console.log('GPU detected, installing with GPU support.');
      } catch (e) {
        console.log('GPU not detected or nvidia-smi not found. Installing standard version.');
      }

      await runCommand(pipPath, ['install', `audio-separator${extra}`]);

      console.log('\n--- Setup completed successfully! ---');
      console.log('You can now use UVR stem separation in Ducer.');
    } catch (error) {
      console.error('\nError: Python is not installed or not in PATH.');
      console.error('Please install Python 3.9 or higher to use this feature.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\nSetup failed:', error);
    process.exit(1);
  }
}

main();
