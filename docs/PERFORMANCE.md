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

## Icon Sprite Atlas

### Problem
Previously, the app loaded 135+ individual icon PNG files on-demand. This caused:
- 135+ network requests for small images (3-5KB each)
- Connection queueing even with HTTP/2
- Slower icon layer rendering as icons loaded progressively
- Total ~450KB of icon data across many requests

### Solution
Build-time sprite generation (`scripts/generate-icon-sprite.js`) that:
1. Reads all PNG files in `src/map/icons/`
2. Packs icons into a single optimized sprite sheet (416x234px)
3. Generates TypeScript metadata with coordinates for each icon
4. Uses CSS `background-position` to display correct icon from sprite

### Impact
- **135+ requests → 1 request** (100% reduction)
- **~450KB total → ~25KB sprite** (95% size reduction)
- **Instant icon rendering** once sprite loads
- **Estimated savings**: 50-90% fewer icon requests, 10-30% faster icon layer render

### Usage
The sprite script runs automatically during build:
```bash
npm run build  # Runs build:sprite before vite build
```

Or manually:
```bash
npm run build:sprite
```

### Adding New Icons
See detailed guide: [ICON_SPRITE_ATLAS.md](./ICON_SPRITE_ATLAS.md)

Quick steps:
1. Add 24x24 PNG to `src/map/icons/`
2. Run `npm run build:sprite`
3. Icon automatically included in next build

## Future Optimizations

### High Priority
1. ~~Icon Sprite Atlas~~ ✅ **COMPLETED**
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
- [x] Icon Sprite Atlas
- [ ] Tile Format Optimization
- [ ] Snapshot Payload Reduction
- [ ] Parallel API Fetching
