# Icon Sprite Atlas - Quick Reference

## What Changed

**Before**: 135+ individual icon PNG files loaded on-demand
**After**: Single sprite sheet with all icons (auto-resized to 32x32px and optimized)

**New in sprite generation**:
- ✨ Automatic resizing to `ICON_SIZE` (32px, configurable in `appConfig.ts`)
- ✨ PNG optimization (palette-based, quality 90, compression level 9)
- ✨ Consistent icon dimensions across entire atlas

## Build Commands

```bash
# Generate sprite (automatic during build)
npm run build:sprite

# Full build (includes sprite generation)
npm run build
```

## Adding New Icons

### 1. Add Icon File
```bash
# Icons will be auto-resized to 32x32px during sprite generation
# You can add icons at any size (recommend 32px or larger for quality)
cp MyNewIcon.png src/map/icons/MapIconMyNewIcon.png
```

**Note**: The sprite generation script automatically:
- Resizes all icons to 32x32px (configured via `ICON_SIZE` in `appConfig.ts`)
- Optimizes PNGs for smaller file size
- Maintains transparency and aspect ratio (fit: contain)

### 2. Run Per-Team Icon Generation
- Use 55% fuzz for 48px icons and 70% for 24px
```bash
$src="C:\Users\nerom\Projects\foxhole-reporter\src\map\icons"; $fuzz="60%"; $colonial="#65875E"; $warden="#2F5DAA"; Get-ChildItem -Path $src -Filter *.png | Where-Object { $_.BaseName -notmatch 'Colonial|Warden' } | ForEach-Object { $in=$_.FullName; $base=$_.BaseName; $ext=$_.Extension; magick "$in" -fuzz $fuzz -fill $colonial -opaque white (Join-Path $src ($base + "Colonial" + $ext)); magick "$in" -fuzz $fuzz -fill $warden -opaque white (Join-Path $src ($base + "Warden" + $ext)) }
```

### 3. Rebuild Sprite
```bash
npm run build:sprite
```

### 4. Verify
Check that `src/data/icon-sprite.ts` includes your icon:
```typescript
export const ICON_SPRITE_METADATA = {
  // ...
  "MapIconMyNewIcon": {
    "x": 68,
    "y": 102,
    "width": 32,   // Auto-sized to ICON_SIZE
    "height": 32   // Auto-sized to ICON_SIZE
  },
  // ...
}
```

The sprite dimensions will adjust automatically based on icon count.

## Icon Naming Convention

Follow this pattern to ensure icons are picked up correctly:

- **Base icon**: `MapIcon{Name}.png`
- **Factioned**: `MapIcon{Name}Colonial.png`, `MapIcon{Name}Warden.png`

Examples:
- `MapIconFactory.png`
- `MapIconFactoryColonial.png`
- `MapIconFactoryWarden.png`

## Requirements

- **Size**: Exactly 24x24 pixels
- **Format**: PNG with alpha channel (transparency)
- **Naming**: CamelCase, no spaces or special characters
- **Colors**: Test on both light and dark map backgrounds

## Icon Requirements Checklist

Before adding an icon:

- [ ] Image is exactly 24x24 pixels
- [ ] Format is PNG with transparency
- [ ] File name follows `MapIcon{Name}.png` pattern
- [ ] Colors are legible on map backgrounds
- [ ] Icon tested with Colonial/Warden variants (if applicable)

## Troubleshooting

**Icon not appearing?**
1. Check filename matches pattern exactly (case-sensitive)
2. Verify icon is 24x24px
3. Run `npm run build:sprite` to regenerate
4. Check browser console for sprite loading errors

**Sprite not loading?**
1. Verify `public/icon-sprite.png` exists
2. Check network tab for sprite request
3. Ensure Vite is serving `public/` directory

**Build fails?**
1. Ensure `public/` directory exists
2. Verify `sharp` is installed: `npm install`
3. Check icon file permissions

## Performance Impact

- **Network Requests**: 135+ → 1 (99% reduction)
- **Total Download**: ~450KB → ~25KB (95% reduction)
- **Render Time**: Progressive → Instant
- **HTTP Connections**: Freed up for other resources

## File Locations

```
src/map/icons/              # Source icon PNGs
scripts/generate-icon-sprite.js  # Build script
public/icon-sprite.png      # Generated sprite (416x234px)
src/data/icon-sprite.ts     # Generated metadata
src/lib/icons.ts            # Icon helper functions
src/components/StaticMapLayer.tsx  # Icon rendering
```

## Example: Adding a New Building Icon

```bash
# 1. Create or obtain 24x24 PNG
# 2. Name it appropriately
cp MyBuilding.png src/map/icons/MapIconMyBuilding.png

# 3. Add factioned variants (optional)
cp MyBuildingBlue.png src/map/icons/MapIconMyBuildingColonial.png
cp MyBuildingGreen.png src/map/icons/MapIconMyBuildingWarden.png

# 4. Rebuild sprite
npm run build:sprite

# Output:
# 🎨 Generating icon sprite atlas...
# 📊 Creating sprite: 416x234 (138 icons in 9 rows)
# ✅ Sprite saved: public/icon-sprite.png (416x234)
# ✅ Metadata saved: src/data/icon-sprite.ts
# 📦 Sprite atlas complete: 138 icons packed into 416x234px

# 5. Build app
npm run build
```

## For Full Documentation

See [ICON_SPRITE_ATLAS.md](./ICON_SPRITE_ATLAS.md) for:
- Detailed configuration options
- Advanced optimization techniques
- Sprite customization
- Migration guide
- Troubleshooting details
