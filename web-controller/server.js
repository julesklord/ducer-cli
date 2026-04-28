/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { spawn } from 'child_process';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Session management
const sessions = new Map();
const taskHistory = [];
const MAX_HISTORY = 100;

// Socket.io setup - attach to httpServer instead of app
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
});

/**
 * Execute a Ducer task via CLI
 */
async function executeDucerTask(taskId, query) {
  return new Promise((resolve) => {
    console.log(`[${taskId}] Executing: ${query}`);

    const ducerProcess = spawn('node', [
      path.join(process.cwd(), '../bundle/gemini.js'),
      'ducer',
      'do',
      '--query',
      query,
    ]);

    let stdout = '';
    let stderr = '';

    ducerProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      io.emit('task_output', {
        task_id: taskId,
        type: 'stdout',
        data: text,
        timestamp: new Date().toISOString(),
      });
    });

    ducerProcess.stderr?.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      io.emit('task_output', {
        task_id: taskId,
        type: 'stderr',
        data: text,
        timestamp: new Date().toISOString(),
      });
    });

    ducerProcess.on('close', (code) => {
      const task = sessions.get(taskId);
      const duration = Date.now() - task.startTime;

      // Extract metrics from stdout using regex
      const modelMatch = stdout.match(/model: ['"]?([^'",\s]+)['"]?/i);
      const promptTokensMatch = stdout.match(/promptTokenCount: (\d+)/i);
      const candidatesTokensMatch = stdout.match(
        /candidatesTokenCount: (\d+)/i,
      );
      const totalTokensMatch = stdout.match(/totalTokenCount: (\d+)/i);

      const metrics = {
        model: modelMatch ? modelMatch[1] : 'gemini-1.5-pro',
        prompt_tokens: promptTokensMatch ? parseInt(promptTokensMatch[1]) : 0,
        candidates_tokens: candidatesTokensMatch
          ? parseInt(candidatesTokensMatch[1])
          : 0,
        total_tokens: totalTokensMatch ? parseInt(totalTokensMatch[1]) : 0,
      };

      const result = {
        id: taskId,
        type: task.type,
        query,
        status: code === 0 ? 'success' : 'failed',
        duration_ms: duration,
        stdout,
        stderr,
        exit_code: code,
        metrics,
        timestamp: new Date().toISOString(),
      };

      // Update sessions
      sessions.set(taskId, { ...task, ...result });

      // Add to history
      taskHistory.unshift(result);
      if (taskHistory.length > MAX_HISTORY) taskHistory.pop();

      // Broadcast completion
      io.emit('task_complete', {
        task_id: taskId,
        success: code === 0,
        duration_ms: duration,
        exit_code: code,
      });

      resolve(result);
    });

    ducerProcess.on('error', (err) => {
      const task = sessions.get(taskId);
      const duration = Date.now() - task.startTime;

      const result = {
        id: taskId,
        type: task.type,
        query,
        status: 'error',
        duration_ms: duration,
        error: err.message,
        exit_code: null,
        timestamp: new Date().toISOString(),
      };

      sessions.set(taskId, { ...task, ...result });
      taskHistory.unshift(result);

      io.emit('task_error', {
        task_id: taskId,
        error: err.message,
      });

      resolve(result);
    });
  });
}

// ─────── REST API ENDPOINTS ───────

app.post('/api/tasks/normalize', async (req, res) => {
  const taskId = uuid();
  const { file_path = 'current_track.wav', quality = 'standard' } = req.body;

  sessions.set(taskId, {
    id: taskId,
    type: 'normalize',
    status: 'running',
    startTime: Date.now(),
    file_path,
    quality,
  });

  const query = `normaliza ${file_path} con calidad ${quality}`;
  res.json({ task_id: taskId, status: 'started' });

  executeDucerTask(taskId, query);
});

app.post('/api/tasks/remix', async (req, res) => {
  const taskId = uuid();
  const { file_path = 'track.wav', model = 'UVR-MDX23C' } = req.body;

  sessions.set(taskId, {
    id: taskId,
    type: 'remix',
    status: 'running',
    startTime: Date.now(),
    file_path,
    model,
  });

  const query = `separa los stems de ${file_path} usando modelo ${model} e importa a REAPER`;
  res.json({ task_id: taskId, status: 'started' });

  executeDucerTask(taskId, query);
});

app.post('/api/tasks/analyze', async (req, res) => {
  const taskId = uuid();
  const { file_path = 'track.wav', mode = 'advanced' } = req.body;

  sessions.set(taskId, {
    id: taskId,
    type: 'analyze',
    status: 'running',
    startTime: Date.now(),
    file_path,
    mode,
  });

  const query = `analiza ${file_path} en modo ${mode} y dame recomendaciones de EQ`;
  res.json({ task_id: taskId, status: 'started' });

  executeDucerTask(taskId, query);
});

app.post('/api/tasks/custom', async (req, res) => {
  const taskId = uuid();
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query required' });
  }

  sessions.set(taskId, {
    id: taskId,
    type: 'custom',
    status: 'running',
    startTime: Date.now(),
  });

  res.json({ task_id: taskId, status: 'started' });
  executeDucerTask(taskId, query);
});

app.get('/api/tasks/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json(taskHistory.slice(0, limit));
});

app.get('/api/tasks/:id', (req, res) => {
  const task = sessions.get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

app.get('/api/status', (req, res) => {
  const totalTokens = taskHistory.reduce(
    (sum, t) => sum + (t.metrics?.total_tokens || 0),
    0,
  );
  res.json({
    server_version: '0.1.0',
    uptime_seconds: Math.floor(process.uptime()),
    active_tasks: Array.from(sessions.values()).filter(
      (t) => t.status === 'running',
    ),
    total_tasks_completed: taskHistory.filter((t) => t.status === 'success')
      .length,
    total_tasks_failed: taskHistory.filter(
      (t) => t.status === 'error' || t.status === 'failed',
    ).length,
    total_tokens_consumed: totalTokens,
    memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    last_model_used: taskHistory[0]?.metrics?.model || 'gemini-1.5-pro',
  });
});

// ─────── WEBSOCKET EVENTS ───────

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send initial status
  socket.emit('connected', {
    server_version: '0.1.0',
    uptime_seconds: Math.floor(process.uptime()),
  });

  // Client can request full task details
  socket.on('get_task', (taskId) => {
    const task = sessions.get(taskId);
    if (task) {
      socket.emit('task_data', task);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════╗`);
  console.log(`║  DUCER WEB CONTROLLER RUNNING      ║`);
  console.log(`║  http://localhost:${PORT}              ║`);
  console.log(`╚════════════════════════════════════╝\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  httpServer.close(() => {
    process.exit(0);
  });
});
