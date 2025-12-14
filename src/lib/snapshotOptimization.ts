/**
 * Snapshot payload optimization utilities
 * Provides coordinate quantization and payload analysis
 */

import type { Snapshot, LocationTile } from '../types/war';

/**
 * Quantization precision: number of decimal places to round coordinates to
 * 0.01 precision = ~1.1km error at world scale (acceptable for territory markers)
 */
export const COORDINATE_PRECISION = 2; // Round to 2 decimal places

/**
 * Quantize a coordinate value to reduce precision
 * @param value - Original coordinate (0-1 normalized)
 * @param precision - Decimal places to keep
 * @returns Quantized coordinate
 */
export function quantizeCoordinate(value: number, precision: number = COORDINATE_PRECISION): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/**
 * Create a quantized copy of a LocationTile
 */
export function quantizeTile(tile: LocationTile): LocationTile {
  return {
    ...tile,
    x: quantizeCoordinate(tile.x),
    y: quantizeCoordinate(tile.y),
  };
}

/**
 * Create a quantized copy of a Snapshot
 */
export function quantizeSnapshot(snapshot: Snapshot): Snapshot {
  return {
    ...snapshot,
    territories: snapshot.territories.map(quantizeTile),
  };
}

/**
 * Analyze snapshot payload size and composition
 */
export function analyzeSnapshotPayload(snapshot: Snapshot): {
  totalBytes: number;
  territoryCount: number;
  avgBytesPerTerritory: number;
  jsonString: string;
  breakdown: {
    metadata: number; // id, created_at, war_number, day_number
    territories: number; // Full territories array
  };
} {
  const jsonString = JSON.stringify(snapshot);
  const totalBytes = new TextEncoder().encode(jsonString).length;
  const territoryCount = snapshot.territories.length;
  const avgBytesPerTerritory = territoryCount > 0 ? totalBytes / territoryCount : 0;

  // Estimate metadata overhead
  const metadataJson = JSON.stringify({
    id: snapshot.id,
    created_at: snapshot.created_at,
    war_number: snapshot.war_number,
    day_number: snapshot.day_number,
  });
  const metadataBytes = new TextEncoder().encode(metadataJson).length;

  return {
    totalBytes,
    territoryCount,
    avgBytesPerTerritory,
    jsonString,
    breakdown: {
      metadata: metadataBytes,
      territories: totalBytes - metadataBytes,
    },
  };
}

/**
 * Compare original and quantized snapshot sizes
 */
export function compareQuantization(snapshot: Snapshot): {
  original: ReturnType<typeof analyzeSnapshotPayload>;
  quantized: ReturnType<typeof analyzeSnapshotPayload>;
  reduction: {
    bytes: number;
    percentage: number;
  };
} {
  const original = analyzeSnapshotPayload(snapshot);
  const quantized = analyzeSnapshotPayload(quantizeSnapshot(snapshot));

  const bytesReduced = original.totalBytes - quantized.totalBytes;
  const percentageReduced = original.totalBytes > 0 ? (bytesReduced / original.totalBytes) * 100 : 0;

  return {
    original,
    quantized,
    reduction: {
      bytes: bytesReduced,
      percentage: percentageReduced,
    },
  };
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/**
 * Log comprehensive payload analysis to console
 */
export function logPayloadAnalysis(snapshot: Snapshot): void {
  const comparison = compareQuantization(snapshot);
  const { original, quantized, reduction } = comparison;

  console.group('📊 Snapshot Payload Analysis');
  console.log(`Territory count: ${original.territoryCount}`);
  console.log('');
  console.log('Original JSON:');
  console.log(`  Total size: ${formatBytes(original.totalBytes)}`);
  console.log(`  Metadata: ${formatBytes(original.breakdown.metadata)}`);
  console.log(`  Territories: ${formatBytes(original.breakdown.territories)}`);
  console.log(`  Avg per territory: ${original.avgBytesPerTerritory.toFixed(1)}B`);
  console.log('');
  console.log('With Quantization (precision=' + COORDINATE_PRECISION + '):');
  console.log(`  Total size: ${formatBytes(quantized.totalBytes)}`);
  console.log(`  Avg per territory: ${quantized.avgBytesPerTerritory.toFixed(1)}B`);
  console.log('');
  console.log('💾 Savings:');
  console.log(`  ${formatBytes(reduction.bytes)} (${reduction.percentage.toFixed(1)}%)`);
  console.groupEnd();
}
