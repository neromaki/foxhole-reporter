#!/usr/bin/env node
// Assign snapshot-derived ids to major towns based on live WarAPI data.
// Uses dynamic map items (bases) + nearest major label to map to towns displayName.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEBUG_MODE } from '../lib/appConfig.js';
const fetchFn = globalThis.fetch;

const WAR_API_BASE = 'https://war-service-live.foxholeservices.com/api';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const townsPath = path.join(__dirname, '..', 'src', 'data', 'towns.tsx');

// Base town / relic iconType values
const MAJOR_ICON_TYPES = new Set([56, 57, 58, 45]);

function mapNameToRegion(mapName) {
  if (mapName === 'MarbanHollow') return 'MarbanHollow';
  return mapName.replace(/Hex$/, '');
}

function toId(mapName, x, y) {
  return `${mapName}-${x.toFixed(4)}-${y.toFixed(4)}`;
}

async function fetchJson(url) {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`Request failed ${res.status} ${url}`);
  return res.json();
}

async function fetchMapList() {
  return fetchJson(`${WAR_API_BASE}/worldconquest/maps`);
}

async function fetchDynamic(mapName) {
  return fetchJson(`${WAR_API_BASE}/worldconquest/maps/${mapName}/dynamic/public`);
}

async function fetchStatic(mapName) {
  return fetchJson(`${WAR_API_BASE}/worldconquest/maps/${mapName}/static`);
}

function nearestMajorLabel(staticData, x, y) {
  const majors = (staticData?.mapTextItems || []).filter((t) => t.mapMarkerType === 'Major');
  let best = null;
  let bestD2 = Infinity;
  for (const m of majors) {
    const dx = m.x - x;
    const dy = m.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = m;
    }
  }
  return best;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function updateTownId(tsx, town, newId) {
  const { apiName, displayName, region, major, x, y } = town;
  const regionPattern = escapeRegExp(region);
  const pattern = new RegExp(
    `\{\\s*"apiName":\\s*"${escapeRegExp(apiName)}",\\s*"displayName":\\s*"${escapeRegExp(displayName)}",\\s*"region":\\s*Region\\.${regionPattern},\\s*"major":\\s*${major},\\s*"x":\\s*${x},\\s*"y":\\s*${y}(?:,\\s*"id":\\s*"[^"]*")?\\s*\}`
  );
  const replacement = `{ "apiName": "${apiName}", "displayName": "${displayName}", "region": Region.${region}, "major": ${major}, "x": ${x}, "y": ${y}, "id": "${newId}" }`;
  if (!pattern.test(tsx)) {
    console.warn('Pattern not found for town', town);
    return tsx;
  }
  return tsx.replace(pattern, replacement);
}

async function main() {
  const mapNames = (await fetchMapList()).filter((m) => !m.startsWith('HomeRegion'));
  DEBUG_MODE ?? console.log('Fetched map list:', mapNames.length);

  const townFile = fs.readFileSync(townsPath, 'utf-8');
  const townRegex = /\{\s*"apiName":\s*"([^"]*)",\s*"displayName":\s*"([^"]+)",\s*"region":\s*Region\.(\w+),\s*"major":\s*(true|false),\s*"x":\s*([-\d.]+),\s*"y":\s*([-\d.]+)(?:,\s*"id":\s*"([^"]*)")?\s*\}/g;
  const towns = [];
  let m;
  while ((m = townRegex.exec(townFile))) {
    towns.push({
      apiName: m[1],
      displayName: m[2],
      region: m[3],
      major: m[4],
      x: parseFloat(m[5]),
      y: parseFloat(m[6]),
      id: m[7] || null,
    });
  }
  DEBUG_MODE ?? console.log('Parsed towns:', towns.length);

  let updated = townFile;
  let assigned = 0;
  let missingLabel = 0;
  let missingTown = 0;
  const missingTownEntries = new Map();

  for (const mapName of mapNames) {
    const [dyn, stat] = await Promise.all([fetchDynamic(mapName), fetchStatic(mapName)]);
    const regionEnum = mapNameToRegion(mapName);
    const majors = dyn.mapItems.filter((d) => MAJOR_ICON_TYPES.has(d.iconType));
    DEBUG_MODE ?? console.log(`Map ${mapName}: ${majors.length} major bases`);
    for (const item of majors) {
      const label = nearestMajorLabel(stat, item.x, item.y);
      if (!label) {
        missingLabel++;
        continue;
      }
      const labelKey = normalizeName(label.text);
      const town = towns.find(
        (t) => t.region === regionEnum && t.major === 'true' && normalizeName(t.displayName) === labelKey
      );
      if (!town) {
        missingTown++;
        const key = `${regionEnum}::${label.text}`;
        if (!missingTownEntries.has(key)) {
          missingTownEntries.set(key, { label: label.text, id: toId(mapName, item.x, item.y) });
        }
        continue;
      }
      const newId = toId(mapName, item.x, item.y);
      updated = updateTownId(updated, town, newId);
      assigned++;
    }
  }

  fs.writeFileSync(townsPath, updated, 'utf-8');
  DEBUG_MODE ?? console.log('Assigned ids:', assigned, 'missing labels:', missingLabel, 'missing towns:', missingTown);
  if (missingTownEntries.size) {
    DEBUG_MODE ?? console.log('Missing town matches:');
    for (const [key, info] of missingTownEntries.entries()) {
      DEBUG_MODE ?? console.log(`  ${key} -> ${info.label} (id ${info.id})`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
