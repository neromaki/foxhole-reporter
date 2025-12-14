# Performance Optimizations

## Territory SVG Pre-bundling

### Problem
Previously, the app loaded 44 SVG files at runtime using `import.meta.glob`, then parsed each with `DOMParser` to extract territory paths. This caused:
- 44 network requests (even if cached, still round-trip overhead)
- Main thread blocked during DOM parsing of ~381 territories
- 2-5 seconds delay before territory layer appeared

### Solution
Build-time script (`scripts/bundle-territory-svgs.js`) that:
1. Reads all SVG files in `src/map/subregions/`
2. Extracts `<path>` elements from `#Territories` group using regex
3. Generates a static TypeScript module (`src/data/territory-paths.ts`) with all paths pre-extracted

### Impact
- **Zero runtime network requests** for SVG files
- **Zero DOM parsing** overhead
- **Instant territory layer** rendering (data is immediately available)
- **Estimated savings**: 1-3 seconds on initial load

### Usage
The bundle script runs automatically during build:
```bash
npm run build  # Runs bundle:territories before vite build
```

Or manually:
```bash
npm run bundle:territories
```

### File Size
- Generated module: ~450KB uncompressed
- After Vite minification + gzip: ~50-80KB
- Trade-off: Single larger JS chunk vs 44 small network requests (net win)

## Future Optimizations

### High Priority
1. **Icon Sprite Atlas** - Consolidate icon files into single sprite sheet
2. **Tile Optimization** - Convert to WebP/AVIF, serve via CDN
3. **Snapshot Payload Reduction** - Quantize coordinates, use binary format
4. **Parallel WarAPI Fetching** - Use `Promise.allSettled` for map data

### Medium Priority
5. **Precomputed Territory Overlays** - Server-side rendering of territory colors per snapshot
6. **Raster Low-Zoom Tiles** - Pre-rendered territory layers for distant views
7. **IndexedDB Caching** - Cache static data client-side
8. **CDN + HTTP/2** - Serve all static assets with long-lived cache headers

### Implementation Status
- [x] Territory SVG Pre-bundling
- [ ] Icon Sprite Atlas
- [ ] Tile Format Optimization
- [ ] Snapshot Payload Reduction
- [ ] Parallel API Fetching
