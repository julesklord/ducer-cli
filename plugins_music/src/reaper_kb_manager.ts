/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface ReaperAction {
  id: string;
  name: string;
  type: 'ACT' | 'SCR';
}

export interface ScriptEntry {
  filename: string;
  path: string;
  description: string;
}

export class ReaperKBManager {
  private static readonly KB_DIR = path.join(os.homedir(), '.gemini-cli', 'ducer', 'reaper_kb');
  private static readonly SCRIPTS_DIR = path.join(process.cwd(), 'scripts');
  private static readonly KEYMAP_PATH = path.join(process.cwd(), 'reactions_db', 'db.ReaperKeyMap');

  /**
   * Initializes the Reaper Knowledge Base by parsing the static KeyMap
   * and indexing the local scripts library.
   */
  public async initialize(): Promise<void> {
    if (!fs.existsSync(ReaperKBManager.KB_DIR)) {
      fs.mkdirSync(ReaperKBManager.KB_DIR, { recursive: true });
    }

    // For now, we use a simple static check or just force initialization if empty
    if (fs.readdirSync(ReaperKBManager.KB_DIR).length === 0) {
      console.log('[Ducer] Initializing Reaper Action Database...');
      await this.indexActions();
    }

    console.log('[Ducer] Indexing Local Scripts Library...');
    await this.indexScripts();
  }

  private async indexActions(): Promise<void> {
    if (!fs.existsSync(ReaperKBManager.KEYMAP_PATH)) {
      console.error('[Ducer] Error: db.ReaperKeyMap not found at', ReaperKBManager.KEYMAP_PATH);
      return;
    }

    const content = fs.readFileSync(ReaperKBManager.KEYMAP_PATH, 'utf8');
    const lines = content.split('\n');
    
    const categories: Record<string, ReaperAction[]> = {
      transport: [],
      tracks: [],
      items: [],
      midi: [],
      mixing_fx: [],
      automation: [],
      other: []
    };

    for (const line of lines) {
      const type = line.startsWith('ACT') ? 'ACT' : (line.startsWith('SCR') ? 'SCR' : null);
      if (!type) continue;

      // Extract Name between quotes
      const nameMatch = line.match(/"([^"]+)"/);
      const name = nameMatch ? nameMatch[1] : 'Unknown';
      
      // Extract ID (the hash or the script ID)
      // Format ACT: ACT <id> <context> "<hash>" "Name" ...
      // Format SCR: SCR <id> <context> <CommandID> "Name" "Path"
      const parts = line.split(/\s+/);
      const id = type === 'ACT' ? (parts[3] ? parts[3].replace(/"/g, '') : parts[1]) : parts[1];

      const action: ReaperAction = { id, name, type };
      const cat = this.categorizeAction(name);
      categories[cat].push(action);
    }

    // Save segmented JSON files
    for (const [cat, actions] of Object.entries(categories)) {
      const filePath = path.join(ReaperKBManager.KB_DIR, `${cat}.json`);
      fs.writeFileSync(filePath, JSON.stringify(actions, null, 2));
    }
  }

  private categorizeAction(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('play') || n.includes('stop') || n.includes('marker') || n.includes('transport') || n.includes('record')) return 'transport';
    if (n.includes('track') || n.includes('fader') || n.includes('solo') || n.includes('mute')) return 'tracks';
    if (n.includes('item') || n.includes('split') || n.includes('glue') || n.includes('take')) return 'items';
    if (n.includes('midi') || n.includes('note') || n.includes('quantize')) return 'midi';
    if (n.includes('fx') || n.includes('mixer') || n.includes('bus') || n.includes('send') || n.includes('comp') || n.includes('eq')) return 'mixing_fx';
    if (n.includes('automation') || n.includes('envelope')) return 'automation';
    return 'other';
  }

  private async indexScripts(): Promise<void> {
    if (!fs.existsSync(ReaperKBManager.SCRIPTS_DIR)) return;

    const scripts = fs.readdirSync(ReaperKBManager.SCRIPTS_DIR).filter(f => f.endsWith('.lua'));
    const index: ScriptEntry[] = [];

    for (const file of scripts) {
      const fullPath = path.join(ReaperKBManager.SCRIPTS_DIR, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Try to extract a description from the first few lines
      const descMatch = content.match(/--\s*Description:\s*(.*)/i) || content.match(/--\s*(.*)/);
      const description = descMatch ? descMatch[1].trim() : 'No description available';

      index.push({
        filename: file,
        path: fullPath,
        description
      });
    }

    const indexPath = path.join(ReaperKBManager.KB_DIR, 'scripts_library.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * Search for an action by name in the indexed database
   */
  public searchActions(query: string, category?: string): ReaperAction[] {
    const catsToSearch = category ? [category] : ['transport', 'tracks', 'items', 'midi', 'mixing_fx', 'automation', 'other'];
    let results: ReaperAction[] = [];

    for (const cat of catsToSearch) {
      const filePath = path.join(ReaperKBManager.KB_DIR, `${cat}.json`);
      if (fs.existsSync(filePath)) {
        const actions: ReaperAction[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const filtered = actions.filter(a => a.name.toLowerCase().includes(query.toLowerCase()));
        results = results.concat(filtered);
      }
    }

    return results.slice(0, 10); // Limit to top 10 for LLM balance
  }
}
