# Icon Sprite Atlas System

## Overview

The icon sprite atlas system consolidates all map icons into a single optimized sprite sheet, replacing individual icon file requests. This dramatically reduces network overhead and improves initial load performance.

## Performance Impact

**Before (Individual Icons)**
- 135+ separate PNG file requests
- ~3-5 KB per icon file
- Multiple round-trips even with HTTP/2
- Browser connection limits cause queueing

**After (Sprite Atlas)**
- **1 sprite image** (~20-30 KB total)
- **1 metadata JS module** (bundled with app code)
- 100% reduction in icon-related network requests
- Instant icon rendering once sprite loads

**Estimated Savings**: 50-90% fewer icon requests, 10-30% faster icon layer render

## How It Works

### Build Process

1. **Script execution** (`scripts/generate-icon-sprite.js`)
   - Scans `src/map/icons/` for all `.png` files
   - **Preprocessing**: Resizes all icons to `ICON_SIZE` (32px, configurable in `appConfig.ts`)
   - **Optimization**: Applies PNG optimization (palette-based, quality 90, compression level 9)
   - Arranges icons in a grid (16 columns, N rows)
   - Creates single sprite PNG using Sharp
   - Generates TypeScript metadata with coordinates

2. **Build integration**
   ```bash
   npm run build  # Automatically runs build:sprite
   ```

3. **Output files**
   - `public/icon-sprite.png` - The sprite atlas image (optimized)
   - `src/data/icon-sprite.ts` - Metadata with coordinates
   - `.temp-icons/` - Temporary directory with preprocessed icons (auto-cleaned)

### Runtime Usage

The system uses CSS `background-position` to display the correct icon from the sprite:

```typescript
// Get sprite data for an icon
const sprite = getIconSprite(iconType, owner);
// { spritePath: '/icon-sprite.png', position: '-64px -32px', size: 32 }

// Rendered as a div with background styling
<div style="
  width: 32px;
  height: 32px;
  background-image: url(/icon-sprite.png);
  background-position: -64px -32px;
  background-repeat: no-repeat;
"></div>
```

## Adding New Icons

### Method 1: Add PNG Directly

1. **Add your icon to the source directory**
   ```bash
   # Icons will be auto-resized to 32x32px during sprite generation
   # You can add icons at any size (recommend 32px or larger for quality)
   cp MyNewIcon.png src/map/icons/MapIconMyNewIcon.png
   ```

2. **Follow naming convention**
   - Base icons: `MapIcon{Name}.png`
   - Factioned icons: `MapIcon{Name}Colonial.png` or `MapIcon{Name}Warden.png`
   - Examples:
     - `MapIconFactory.png`
     - `MapIconFactoryColonial.png`
     - `MapIconFactoryWarden.png`

3. **Rebuild the sprite**
   ```bash
   npm run build:sprite
   ```
   This automatically:
   - Resizes all icons to 32x32px (preserves aspect ratio with transparent padding)
   - Optimizes PNGs for smaller file size
   - Regenerates sprite PNG and metadata

4. **Verify the icon is included**
   Check `src/data/icon-sprite.ts` for your icon name in the metadata.

### Method 2: Batch Import

If adding multiple icons:

1. **Place all PNG files in `src/map/icons/`**
   - Icons can be any size (will be auto-resized to 32x32px)
   - Use transparent backgrounds
   - Follow naming convention

2. **Run sprite generator**
   ```bash
   npm run build:sprite
   ```
   
The script handles all preprocessing automatically.

3. **Check console output**
   ```
   ✓ Processed 140/142 icons...
   📦 Sprite atlas complete: 142 icons packed into 416x260px
   ```

### Method 3: Replace Existing Icon

1. **Overwrite the existing file**
   ```bash
   cp UpdatedFactory.png src/map/icons/MapIconFactory.png
   ```

2. **Rebuild sprite**
   ```bash
   npm run build:sprite
   ```

The sprite generation is deterministic (icons are sorted alphabetically), so replacing an icon doesn't change other icon positions.

## Icon Requirements

### Size
- **Flexible**: Any size (automatically resized to 32x32px)
- Script uses `fit: 'contain'` to preserve aspect ratio
- Transparent padding added if needed
- Recommend adding icons at 32px or larger for best quality

### Format
- **PNG with alpha channel** (transparency)
- Automatically optimized during sprite generation:
  - Palette-based PNG for smaller size
  - Quality 90, compression level 9
  - Adaptive filtering enabled
- Source PNGs can be unoptimized

### Naming
- Must match the pattern used by `iconTypeToFilename()` in `src/lib/icons.ts`
- Case-sensitive on build systems
- No spaces or special characters (use CamelCase)

### Color
- Use consistent color palette
- Consider how icons look on different map backgrounds
- Test with both Colonial/Warden/Neutral variants

## Configuration

### Global Icon Size

The icon size is centrally configured in `src/lib/appConfig.ts`:

```typescript
export const ICON_SIZE = 32;  // Standard icon size for sprite atlas
```

**To change icon size globally**:
1. Update `ICON_SIZE` in `appConfig.ts`
2. Run `npm run build:sprite` to regenerate sprite with new size
3. All icons automatically resized to new dimension

### Sprite Grid Settings

Edit `scripts/generate-icon-sprite.js` to adjust grid layout:

```javascript
const COLUMNS = 16;       // Icons per row
const PADDING = 2;        // Space between icons (prevents bleeding)
```

**When to change COLUMNS**:
- To optimize sprite dimensions (more square = better)
- Balance between sprite width and height
- More columns = wider, fewer rows

**When to change PADDING**:
- If you see icon bleeding/artifacts
- Increase for safety, decrease to save space
- Default 2px is usually sufficient

### Preprocessing Options

In `scripts/generate-icon-sprite.js`, the preprocessing step configures Sharp:

```javascript
await sharp(inputPath)
  .resize(ICON_SIZE, ICON_SIZE, {
    fit: 'contain',           // Preserve aspect ratio
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png({
    quality: 90,              // PNG quality (0-100)
    compressionLevel: 9,      // Max compression (0-9)
    adaptiveFiltering: true,  // Better compression
    palette: true             // Palette-based PNG
  })
```

**Tuning quality vs size**:
- Increase `quality` for better visuals (larger file)
- Decrease for smaller file size (may show artifacts)
- Default 90 is a good balance

### Output Paths

```javascript
const OUTPUT_SPRITE = join(__dirname, '../public/icon-sprite.png');
const OUTPUT_METADATA = join(__dirname, '../src/data/icon-sprite.ts');
const TEMP_DIR = join(__dirname, '../.temp-icons');  // Preprocessed icons
```

**public/icon-sprite.png**:
- Served as a static asset
- Path referenced in metadata: `ICON_SPRITE_PATH = '/foxhole-reporter/icon-sprite.png'`
- Ensure Vite config serves `public/` correctly

**src/data/icon-sprite.ts**:
- TypeScript module bundled with app
- Provides `ICON_SPRITE_METADATA` constant
- Imports `ICON_SIZE` from `appConfig.ts`
- Enables tree-shaking (unused icons removed from metadata)

**.temp-icons/**:
- Temporary directory for preprocessed (resized + optimized) icons
- Created during build, can be safely deleted
- Not tracked in git (add to `.gitignore`)

## Workflow Integration

### Development
```bash
# During development, rebuild sprite when icons change
npm run build:sprite

# Or use watch mode (requires additional tooling)
# Future: Add file watcher to auto-rebuild
```

### Production Build
```bash
# Sprite is automatically rebuilt before Vite build
npm run build

# Manual steps:
npm run bundle:territories  # Pre-bundle territory SVGs
npm run build:sprite        # Generate icon sprite
vite build                  # Bundle app
```

### Git Workflow

**Commit sprite artifacts?**

Two approaches:

**Option A: Commit generated files** (current)
- Commit `public/icon-sprite.png`
- Commit `src/data/icon-sprite.ts`
- ✅ Builds work immediately after clone
- ✅ No build tools required for reviewers
- ❌ Git diffs include sprite changes

**Option B: Generate at build time** (alternative)
- Add `public/icon-sprite.png` to `.gitignore`
- Add `src/data/icon-sprite.ts` to `.gitignore`
- ✅ Cleaner git history
- ❌ Requires `sharp` installed for all contributors
- ❌ CI/CD must run sprite generation

**Recommendation**: Commit artifacts for easier collaboration.

## Troubleshooting

### Icon Not Appearing

1. **Check sprite metadata**
   ```typescript
   import { hasIconInSprite } from '../data/icon-sprite';
   console.log(hasIconInSprite('MapIconFactory')); // Should be true
   ```

2. **Verify icon was processed**
   ```bash
   npm run build:sprite
   # Look for your icon in console output
   ```

3. **Check file name matches**
   - Icon file: `MapIconFactory.png`
   - Sprite key: `MapIconFactory` (no extension)
   - Case-sensitive!

### Sprite Not Loading

1. **Check network tab** - is `icon-sprite.png` requested?
2. **Verify path** - check `ICON_SPRITE_PATH` in metadata
3. **Check Vite config** - ensure `public/` is served
4. **Inspect element** - verify CSS background-image URL

### Icons Blurry or Misaligned

1. **Increase PADDING** in script (try 4px)
2. **Verify source icons are exactly 24x24**
3. **Check for non-integer coordinates** (shouldn't happen)
4. **Try different image-rendering CSS**:
   ```css
   .icon-sprite-marker {
     image-rendering: pixelated; /* or crisp-edges */
   }
   ```

### Build Fails

```
Error: unable to open for write
```
- **Solution**: Ensure `public/` directory exists
- Run: `mkdir public` or `New-Item -ItemType Directory -Path public`

```
Error: ENOENT: no such file or directory
```
- **Solution**: Check `ICONS_DIR` path in script
- Verify icons exist in `src/map/icons/`

## Advanced: Sprite Optimization

### Further Reduce Sprite Size

1. **Use pngquant before sprite generation**
   ```bash
   # Optimize all source icons
   pngquant --quality=65-80 --ext .png --force src/map/icons/*.png
   ```

2. **Use WebP instead of PNG** (requires browser support check)
   - Update script to output `.webp`
   - Provide `.png` fallback for older browsers

3. **Split sprites by usage**
   - Create separate sprites for common vs rare icons
   - Load on-demand based on visible map regions

### Lazy Loading

For very large sprite sheets:

```typescript
// Preload sprite early
const link = document.createElement('link');
link.rel = 'preload';
link.as = 'image';
link.href = ICON_SPRITE_PATH;
document.head.appendChild(link);
```

Or use intersection observer to load only when icons are visible.

## Migration Notes

### Upgrading from Individual Icons

If you have code using `getIconUrl()` directly:

**Before**:
```typescript
const icon = L.icon({
  iconUrl: getIconUrl(iconType, owner),
  iconSize: [24, 24]
});
```

**After**:
```typescript
const sprite = getIconSprite(iconType, owner);
const icon = sprite
  ? L.divIcon({
      html: `<div style="...sprite CSS..."></div>`,
      iconSize: [24, 24]
    })
  : L.icon({ iconUrl: getIconUrl(iconType, owner), iconSize: [24, 24] });
```

The updated `StaticMapLayer.tsx` shows the full implementation.

## Future Enhancements

- [ ] Auto-watch `src/map/icons/` and rebuild on change (dev mode)
- [ ] Generate multiple sprite sizes (1x, 2x for retina)
- [ ] Support WebP with PNG fallback
- [ ] Split sprites by icon category (buildings, resources, etc.)
- [ ] Generate CSS classes instead of inline styles
- [ ] Add sprite preview tool/documentation page
