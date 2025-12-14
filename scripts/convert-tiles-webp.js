#!/usr/bin/env node
/**
 * Convert hex tile PNGs to WebP format for better compression.
 * Reduces tile payload by 30-60% while maintaining quality.
 */

import sharp from 'sharp';
import { readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TILES_DIR = join(__dirname, '../src/map/tiles');
const OUTPUT_DIR = TILES_DIR; // Convert in-place

async function main() {
  console.log('🗺️  Converting hex tiles to WebP...');
  
  const files = readdirSync(TILES_DIR)
    .filter(f => f.endsWith('.png'))
    .sort();
  
  if (files.length === 0) {
    console.error('❌ No PNG files found in', TILES_DIR);
    process.exit(1);
  }

  console.log(`📊 Found ${files.length} PNG tiles to convert\n`);

  let totalOriginalSize = 0;
  let totalWebPSize = 0;
  let converted = 0;

  for (const file of files) {
    const inputPath = join(TILES_DIR, file);
    const outputPath = join(OUTPUT_DIR, file.replace('.png', '.webp'));
    
    try {
      // Get original file size
      const originalStats = statSync(inputPath);
      totalOriginalSize += originalStats.size;
      
      // Convert to WebP with high quality settings
      await sharp(inputPath)
        .webp({
          quality: 90,        // High quality (90-100 recommended for maps)
          lossless: false,    // Use lossy compression for better size reduction
          effort: 6,          // Encoding effort (0-6, higher = better compression but slower)
        })
        .toFile(outputPath);
      
      // Get WebP file size
      const webpStats = statSync(outputPath);
      totalWebPSize += webpStats.size;
      
      const reduction = ((1 - webpStats.size / originalStats.size) * 100).toFixed(1);
      const originalMB = (originalStats.size / 1024 / 1024).toFixed(2);
      const webpMB = (webpStats.size / 1024 / 1024).toFixed(2);
      
      console.log(`  ✓ ${basename(file, '.png')}: ${originalMB}MB → ${webpMB}MB (${reduction}% smaller)`);
      converted++;
      
    } catch (e) {
      console.warn(`  ⚠️  Failed to convert ${file}:`, e.message);
    }
  }

  const totalReduction = ((1 - totalWebPSize / totalOriginalSize) * 100).toFixed(1);
  const savedMB = ((totalOriginalSize - totalWebPSize) / 1024 / 1024).toFixed(2);
  const totalOriginalMB = (totalOriginalSize / 1024 / 1024).toFixed(2);
  const totalWebPMB = (totalWebPSize / 1024 / 1024).toFixed(2);

  console.log(`\n✅ Converted ${converted} tiles`);
  console.log(`📦 Total size: ${totalOriginalMB}MB → ${totalWebPMB}MB`);
  console.log(`💾 Saved ${savedMB}MB (${totalReduction}% reduction)`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
