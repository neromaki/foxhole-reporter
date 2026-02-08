#!/usr/bin/env node
// Check for mismatches between territory-paths.ts path IDs and towns.tsx apiNames

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const territoryPathsFile = path.join(__dirname, '..', 'src', 'data', 'territory-paths.ts');
const townsFile = path.join(__dirname, '..', 'src', 'data', 'towns.tsx');

function extractPathIds(territoryPathsContent) {
  const pathIds = new Map(); // Map<regionHex, Set<pathId>>
  
  // Match region blocks and their paths
  const regionRegex = /"(\w+Hex)":\s*\{[^}]*"paths":\s*\[([\s\S]*?)\]/g;
  let regionMatch;
  
  while ((regionMatch = regionRegex.exec(territoryPathsContent)) !== null) {
    const region = regionMatch[1];
    const pathsBlock = regionMatch[2];
    
    // Extract path IDs from this region
    const idRegex = /"id":\s*"([^"]+)"/g;
    let idMatch;
    const ids = new Set();
    
    while ((idMatch = idRegex.exec(pathsBlock)) !== null) {
      ids.add(idMatch[1]);
    }
    
    pathIds.set(region, ids);
  }
  
  return pathIds;
}

function extractTownApiNames(townsContent) {
  const townsByRegion = new Map(); // Map<regionEnum, Set<apiName>>
  
  const townRegex = /\{\s*"apiName":\s*"([^"]+)",\s*"displayName":[^,]+,\s*"region":\s*Region\.(\w+),\s*"major":\s*true/g;
  let match;
  
  while ((match = townRegex.exec(townsContent)) !== null) {
    const apiName = match[1];
    const region = match[2];
    
    if (!townsByRegion.has(region)) {
      townsByRegion.set(region, new Set());
    }
    townsByRegion.get(region).add(apiName);
  }
  
  return townsByRegion;
}

function main() {
  const territoryPathsContent = fs.readFileSync(territoryPathsFile, 'utf-8');
  const townsContent = fs.readFileSync(townsFile, 'utf-8');
  
  const pathIdsByRegion = extractPathIds(territoryPathsContent);
  const townsByRegion = extractTownApiNames(townsContent);
  
  console.log('=== Territory Path ID vs Towns.tsx Mismatch Report ===\n');
  
  let totalMismatches = 0;
  let totalMatches = 0;
  
  for (const [regionHex, pathIds] of pathIdsByRegion.entries()) {
    // Convert regionHex to region enum (e.g., "OlavisWakeHex" -> "OlavisWake")
    const regionEnum = regionHex.replace(/Hex$/, '');
    const towns = townsByRegion.get(regionEnum) || new Set();
    
    const missing = [];
    const found = [];
    
    for (const pathId of pathIds) {
      if (!towns.has(pathId)) {
        missing.push(pathId);
        totalMismatches++;
      } else {
        found.push(pathId);
        totalMatches++;
      }
    }
    
    if (missing.length > 0) {
      console.log(`\n${regionHex} (Region.${regionEnum}):`);
      console.log(`  ✓ Matched: ${found.length}`);
      console.log(`  ✗ Missing in towns.tsx: ${missing.length}`);
      missing.forEach(id => {
        // Check for similar names
        const similar = Array.from(towns).filter(t => {
          const t_lower = t.toLowerCase();
          const id_lower = id.toLowerCase();
          return t_lower.includes(id_lower.slice(0, 4)) || id_lower.includes(t_lower.slice(0, 4));
        });
        if (similar.length > 0) {
          console.log(`    - "${id}" (similar: ${similar.map(s => `"${s}"`).join(', ')})`);
        } else {
          console.log(`    - "${id}"`);
        }
      });
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Total matched: ${totalMatches}`);
  console.log(`Total mismatches: ${totalMismatches}`);
  
  if (totalMismatches === 0) {
    console.log('\n✓ All territory paths have corresponding towns!');
  } else {
    console.log(`\n✗ ${totalMismatches} territory paths are missing corresponding towns.`);
    console.log('  These territories will not appear on the map.');
  }
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
