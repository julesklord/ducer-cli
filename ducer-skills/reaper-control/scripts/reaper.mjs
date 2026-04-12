#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'knowledge', 'db', 'actions.json');

const REAPER_IP = '172.25.112.1';
const isSandbox = process.argv.includes('--sandbox');
const REAPER_PORT = isSandbox ? '8081' : '8080';
const BASE_URL = `http://${REAPER_IP}:${REAPER_PORT}/_`;

async function reaperCmd(cmd) {
    try {
        const response = await fetch(`${BASE_URL}/${cmd}`, { signal: AbortSignal.timeout(3000) });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        return await response.text();
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}

function loadDB() {
    try {
        if (!fs.existsSync(DB_PATH)) return {};
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) { return {}; }
}

function saveDB(db) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

const args = process.argv.slice(2).filter(arg => arg !== '--sandbox');
const command = args[0];

switch (command) {
    case 'status':
        reaperCmd('').then(text => {
            const lines = text.split('\n');
            const status = lines[0]?.split('\t');
            console.log(JSON.stringify({
                transport: status[0] === '1' ? 'playing' : (status[0] === '2' ? 'paused' : 'stopped'),
                position: status[3],
                bpm: status[1],
                timeSig: `${status[2]}`,
            }, null, 2));
        });
        break;
    case 'play': reaperCmd('1007').then(() => console.log('Playing')); break;
    case 'stop': reaperCmd('1016').then(() => console.log('Stopped')); break;
    case 'record': reaperCmd('1013').then(() => console.log('Recording')); break;
    case 'add-track': reaperCmd('40001').then(() => console.log('Track added')); break;
    
    case 'learn':
        const name = args[1];
        const id = args[2];
        if (!name || !id) {
            console.error('Uso: reaper learn <nombre> <id_accion>');
            process.exit(1);
        }
        const db = loadDB();
        db[name.toLowerCase()] = id;
        saveDB(db);
        console.log(`✅ Aprendizaje guardado: "${name}" ahora apunta a la acción ${id}`);
        break;

    case 'run':
        const searchName = args[1];
        const actions = loadDB();
        const actionId = actions[searchName.toLowerCase()];
        if (!actionId) {
            console.error(`❌ No conozco la acción "${searchName}". Prueba con "reaper learn" primero.`);
            process.exit(1);
        }
        reaperCmd(actionId).then(() => console.log(`Ejecutando acción aprendida: ${searchName} (${actionId})`));
        break;

    case 'action':
        const rawId = args[1];
        if (!rawId) {
            console.error('Uso: reaper action <id>');
            process.exit(1);
        }
        reaperCmd(rawId).then(() => console.log(`Acción ${rawId} ejecutada`));
        break;
    default:
        console.log('Uso: reaper <status|play|stop|record|add-track|learn name id|run name|action id>');
}
