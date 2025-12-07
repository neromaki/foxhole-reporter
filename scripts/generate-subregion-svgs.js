#!/usr/bin/env node
/**
 * Generate SUBREGION_SVGS constant from src/map/subregions directory
 * Scans for .svg files and generates TypeScript code
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const subregionsDir = path.join(__dirname, '..', 'src', 'map', 'subregions');

// Get all .svg files in the subregions directory
const svgFiles = fs.readdirSync(subregionsDir).filter(f => f.endsWith('.svg'));

if (svgFiles.length === 0) {
  console.warn('[generate-subregion-svgs] No SVG files found in', subregionsDir);
  process.exit(0);
}

// Convert filename to hex key (e.g., Kalokai.svg -> KalokaiHex)
function fileNameToKey(filename) {
  const basename = filename.replace(/\.svg$/, '');
  return `${basename}Hex`;
}

// Generate TypeScript code
const imports = svgFiles
  .map((file, i) => {
    const key = fileNameToKey(file);
    return `  ${key}: new URL('../map/subregions/${file}', import.meta.url).href,`;
  })
  .join('\n');

const code = `const SUBREGION_SVGS: Record<string, string> = {
${imports}
};`;

console.log('[generate-subregion-svgs] Generated SUBREGION_SVGS for files:', svgFiles);
console.log('\n' + code + '\n');
console.log('[generate-subregion-svgs] Copy the above into TerritorySubregionLayer.tsx');
