#!/usr/bin/env node
/**
 * generate_semantic_registry.js
 * 
 * Parsea reactions_db/db.ReaperKeyMap y genera
 * ducer-skills/reaper-control/knowledge/db/semantic_registry.json
 * 
 * Uso: node scripts/generate_semantic_registry.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const INPUT = path.join(ROOT, 'reactions_db', 'db.ReaperKeyMap');
const OUTPUT = path.join(
  ROOT,
  'ducer-skills',
  'reaper-control',
  'knowledge',
  'db',
  'semantic_registry.json',
);

function inferTags(name) {
  const lower = name.toLowerCase();
  const tagMap = {
    play: ['play', 'transport', 'start'],
    stop: ['stop', 'transport', 'halt'],
    record: ['record', 'rec', 'capture'],
    mute: ['mute', 'silence'],
    solo: ['solo', 'isolate'],
    volume: ['volume', 'gain', 'level'],
    pan: ['pan', 'stereo', 'position'],
    track: ['track'],
    item: ['item', 'clip', 'region'],
    midi: ['midi', 'note', 'piano'],
    fx: ['fx', 'effect', 'plugin', 'vst'],
    mix: ['mix', 'mixer', 'bus'],
    zoom: ['zoom', 'view'],
    select: ['select', 'selection'],
    tempo: ['tempo', 'bpm', 'time'],
    envelope: ['envelope', 'automation'],
    export: ['export', 'render', 'bounce'],
    import: ['import', 'insert', 'load'],
    script: ['script', 'lua', 'reascript'],
    color: ['color', 'colour'],
    grid: ['grid', 'snap'],
    marker: ['marker', 'region', 'cue'],
    undo: ['undo', 'redo', 'history'],
    save: ['save', 'project'],
    glue: ['glue', 'merge', 'consolidate'],
    split: ['split', 'cut', 'divide'],
    loop: ['loop', 'repeat'],
    pitch: ['pitch', 'tune', 'transpose'],
    send: ['send', 'route', 'bus'],
  };

  const tags = new Set();
  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      tags.add(tag);
    }
  }

  return Array.from(tags);
}

function parseKeyMap(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');
  const actions = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Parsear: ACT <flags> <section> "<guid>" "<name>" <action_ids...>
    // O:       SCR <flags> <section> <RS_id>  "<name>" "<path>"
    const nameMatch = trimmed.match(/"([^"]+)"/g);
    if (!nameMatch || nameMatch.length < 2) continue;

    // El nombre legible es siempre el segundo string entre comillas
    const name = nameMatch[1].replace(/"/g, '');

    // Extraer el ID principal:
    // - Para ACT: el primer token después del 4to campo que no empiece con _ o RS
    // - Para SCR: el token RSxxxxxxx después del tercer campo
    let id = null;

    const parts = trimmed.split(/\s+/);
    const type = parts[0]; // ACT o SCR

    if (type === 'ACT') {
      // Buscar el primer ID numérico después de los 4 campos fijos
      // Campos: ACT flags section "guid" "name" [ids...]
      // Los ids empiezan después del cierre de la segunda comilla
      const afterName = trimmed.split(nameMatch[1])[1]?.trim();
      if (afterName) {
        const firstId = afterName.split(/\s+/)[0];
        if (firstId && /^[0-9_]/.test(firstId)) {
          id = firstId.startsWith('_') ? firstId.substring(1) : firstId;
        }
      }
    } else if (type === 'SCR') {
      // SCR <flags> <section> <RS_id> "<name>" "<path>"
      // El RS_id es el 4to token
      if (parts.length >= 4) {
        id = parts[3];
      }
    }

    if (!id || !name) continue;

    actions.push({
      id: String(id),
      name: name,
      tags: inferTags(name),
    });
  }

  return actions;
}

function main() {
  console.log('[Ducer] Parseando db.ReaperKeyMap...');
  const actions = parseKeyMap(INPUT);

  const registry = { actions };

  const outDir = path.dirname(OUTPUT);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(OUTPUT, JSON.stringify(registry, null, 2), 'utf8');

  console.log(`[Ducer] ✅ semantic_registry.json generado.`);
  console.log(`        Acciones indexadas: ${actions.length}`);
  console.log(`        Destino: ${OUTPUT}`);
}

main();
