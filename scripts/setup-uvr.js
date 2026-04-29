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
    // 1. Check for UV (preferred)
    let useUv = false;
    try {
      await runCommand('uv', ['--version'], { stdio: 'ignore' });
      useUv = true;
      console.log('UV detected! Using UV for faster and more reliable setup.');
    } catch (e) {
      console.log('UV not detected, falling back to standard venv/pip.');
    }

    let cudaSupported = false;
    let extra = '';
    try {
      await runCommand('nvidia-smi', [], { stdio: 'ignore' });
      cudaSupported = true;
      extra = '[gpu]';
      console.log('GPU NVIDIA detected. Preparing for hardware acceleration.');
    } catch (e) {
      console.log('No GPU NVIDIA detected or drivers not in PATH, proceeding with CPU installation.');
    }

    if (useUv) {
      // Use UV to create a compatible venv (3.11 is very stable for AI)
      if (!fs.existsSync(ENV_PATH)) {
        console.log('Creating virtual environment with Python 3.11 via UV...');
        try {
          await runCommand('uv', ['venv', ENV_PATH, '--python', '3.11']);
        } catch (e) {
          console.log('Python 3.11 not available in UV, trying 3.12...');
          await runCommand('uv', ['venv', ENV_PATH, '--python', '3.12']);
        }
      } else {
        console.log('Virtual environment already exists, skipping creation.');
      }
      
      // On Windows, UV needs the path to the venv
      process.env.VIRTUAL_ENV = ENV_PATH;

      if (cudaSupported) {
        console.log('Installing PyTorch with CUDA 12.1 support via UV...');
        await runCommand('uv', [
          'pip',
          'install',
          'torch',
          'torchvision',
          'torchaudio',
          '--index-url',
          'https://download.pytorch.org/whl/cu121',
        ]);
        console.log('Installing ONNX Runtime GPU via UV...');
        await runCommand('uv', ['pip', 'install', 'onnxruntime-gpu']);
      }

      console.log(`Installing audio-separator${extra} via UV...`);
      await runCommand('uv', ['pip', 'install', `audio-separator${extra}`]);
      
    } else {
      let pythonCmd = 'python';
      try {
        await runCommand('python', ['--version'], { stdio: 'ignore' });
      } catch (e) {
        pythonCmd = 'python3';
        await runCommand('python3', ['--version'], { stdio: 'ignore' });
      }
      console.log(`Using ${pythonCmd} for setup.`);

      if (!fs.existsSync(ENV_PATH)) {
        console.log('Creating virtual environment in:', ENV_PATH);
        await runCommand(pythonCmd, ['-m', 'venv', ENV_PATH]);
      }

      const isWin = process.platform === 'win32';
      const pythonExe = isWin
        ? path.join(ENV_PATH, 'Scripts', 'python.exe')
        : path.join(ENV_PATH, 'bin', 'python');

      console.log('Updating pip...');
      try {
        await runCommand(pythonExe, ['-m', 'pip', 'install', '--upgrade', 'pip']);
      } catch (e) {
        console.warn('Pip upgrade failed, continuing anyway...');
      }

      try {
        if (cudaSupported) {
          console.log('Installing PyTorch with CUDA 12.1 support...');
          await runCommand(pythonExe, [
            '-m',
            'pip',
            'install',
            'torch',
            'torchvision',
            'torchaudio',
            '--index-url',
            'https://download.pytorch.org/whl/cu121',
          ]);
          
          console.log('Installing ONNX Runtime GPU...');
          await runCommand(pythonExe, ['-m', 'pip', 'install', 'onnxruntime-gpu']);
        }
        
        console.log(`Installing audio-separator${extra}...`);
        await runCommand(pythonExe, [
          '-m',
          'pip',
          'install',
          '--prefer-binary',
          `audio-separator${extra}`,
        ]);
      } catch (e) {
        console.error('Advanced installation failed, trying basic installation...');
        await runCommand(pythonExe, [
          '-m',
          'pip',
          'install',
          '--prefer-binary',
          'audio-separator',
        ]);
      }
    }

    // Verification Step
    console.log('\n--- Verifying Installation ---');
    const isWin = process.platform === 'win32';
    const separatorExe = isWin
      ? path.join(ENV_PATH, 'Scripts', 'audio-separator.exe')
      : path.join(ENV_PATH, 'bin', 'audio-separator');

    if (fs.existsSync(separatorExe)) {
      try {
        await runCommand(separatorExe, ['--env_info']);
      } catch (e) {
        console.warn('Could not run verification command, but files exist.');
      }
    }

    console.log('\n--- Setup completed successfully! ---');
    console.log('You can now use UVR stem separation in Ducer.');
  } catch (error) {
    console.error('\nSetup failed:', error);
    process.exit(1);
  }
}

main();

