# Branding Guide

This document describes how to customize the branding for the Demo App, including the app icon, colors, and display strings.

## App Icon

### Source File

The app icon source is a **single SVG file** located at:
- **Source**: `assets/demo-flask-icon.svg` (root of the repository)

This is the single source of truth for the app icon. The icon is automatically copied to the required locations:
- **Web**: `apps/web/public/demo-flask-icon.svg` (served by Vite)
- **Mobile**: `apps/mobile/assets/demo-flask-icon.svg` (used by Expo)

### Syncing Icon Assets

If you update the source icon, sync it to all locations:

```bash
npm run sync-icons
```

This copies the source icon from `assets/demo-flask-icon.svg` to both web and mobile directories.

### Mobile App Icon

For mobile apps, Expo requires a PNG file. The PNG is generated from the SVG source:

- **Source SVG**: `assets/demo-flask-icon.svg` (root of repository)
- **Generated PNG**: `apps/mobile/assets/icon.png` (1024x1024 pixels)

#### Regenerating the Mobile Icon

If you update the source SVG file:

1. **Sync the icon to all locations:**
   ```bash
   npm run sync-icons
   ```

2. **Regenerate the mobile PNG:**
   ```bash
   cd apps/mobile
   npm run generate-icon
   ```

The `generate-icon` script will:
- Copy the source SVG to mobile assets (if needed)
- Convert the SVG to a 1024x1024 PNG that Expo uses to generate all required icon sizes for iOS and Android

#### Applying Icon Changes

After updating the icon, you need to rebuild the native projects:

```bash
cd apps/mobile
npx expo prebuild --clean
npx expo run:ios      # For iOS
npx expo run:android  # For Android
```

Or use the clean rebuild scripts:

```bash
cd apps/mobile
npx expo prebuild --clean
npm run ios:clean     # For iOS
npm run android:clean # For Android
```

**Important**: The icon changes only appear after:
1. Running `expo prebuild --clean` to regenerate native projects
2. Completely rebuilding the app (not just hot reload)
3. Uninstalling the old app from the device/simulator if needed

### Web App Icon

The web app uses the SVG directly in the header component. After syncing with `npm run sync-icons`, changes to the source SVG will appear immediately after refreshing the browser (no rebuild needed).

The icon is referenced in:
- `packages/shared/src/components/navigation/AppHeader.web.tsx` (as `/demo-flask-icon.svg`)

**Note**: The web app reads from `apps/web/public/demo-flask-icon.svg`, which is a copy of the source. Always update the source at `assets/demo-flask-icon.svg` and run `npm run sync-icons` to propagate changes.

### Web Favicons

The app includes favicon support for all major browsers. Favicons are generated from the source SVG icon:

- **Standard favicons**: `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`
- **Apple touch icon**: `apple-touch-icon.png` (180x180) for iOS Safari
- **Android Chrome icons**: `android-chrome-192x192.png`, `android-chrome-512x512.png`

#### Generating Favicons

To generate all favicon files from the source icon:

```bash
npm run generate-favicons
```

This will create all required favicon files in `apps/web/public/` from the source SVG at `assets/demo-flask-icon.svg`.

#### Updating Favicons

When you update the source icon:

1. **Update the source SVG**: Edit `assets/demo-flask-icon.svg`
2. **Sync icons**: Run `npm run sync-icons` to copy to web and mobile
3. **Regenerate favicons**: Run `npm run generate-favicons` to create new favicon files
4. **Refresh browser**: Clear browser cache or hard refresh to see new favicons

The favicon files are referenced in `apps/web/index.html` with appropriate link tags for all browsers.

## App Name and Title

### Display Name

The app name "Demo App" appears in:
- **Web header**: `packages/shared/src/components/navigation/AppHeader.web.tsx`
- **Mobile header**: `packages/shared/src/components/navigation/AppHeader.native.tsx`

To change the app name, update the text in both header components.

### Configuration Files

- **Mobile**: `apps/mobile/app.config.ts` - `name` and `slug` fields
- **Mobile**: `apps/mobile/app.json` - `name` field (legacy, may be auto-generated)

## Display Strings

All user-facing strings are centralized in:
- `packages/shared/src/utils/strings.ts`

### Available String Constants

- `HOME_TITLE` - Home page main title
- `HOME_SUBTITLE` - Home page subtitle
- `DASHBOARD_TITLE` - Dashboard page title
- `DASHBOARD_SUBTITLE` - Dashboard page subtitle

### Adding New Strings

1. Add the string constant to `packages/shared/src/utils/strings.ts`
2. Import and use it in your components:

```typescript
import { HOME_TITLE } from '@shared/utils/strings';
```

## Colors

### Primary Color

The primary brand color is `#4F46E5` (indigo-600 in Tailwind). This is used for:
- Primary buttons
- App icon background circle
- Links and interactive elements

### Color Configuration

- **Web**: Colors are defined in Tailwind config (`apps/web/tailwind.config.js`)
- **Mobile**: Colors are defined in component StyleSheets using hex values

The primary color appears in:
- `packages/shared/src/components/navigation/AppHeader.native.tsx` (SVG icon)
- Various button and link styles throughout the app

## Layout

### Web Layout

- **Max Width**: 800px (centered)
- **Responsive**: Adapts to window size with padding
- **Configuration**: Set in individual page components and `AppHeader.web.tsx`

### Mobile Layout

- **Header**: Fixed at top with status bar padding on Android
- **Content**: Scrollable with consistent padding
- **Configuration**: Set in individual screen components

## Branding Checklist

When updating branding:

- [ ] Update SVG icon files (web and mobile)
- [ ] Regenerate mobile PNG icon (`npm run generate-icon`)
- [ ] Run `expo prebuild --clean` for mobile
- [ ] Rebuild mobile apps completely
- [ ] Update app name in header components (web and mobile)
- [ ] Update app name in `app.config.ts` (mobile)
- [ ] Update string constants in `packages/shared/src/utils/strings.ts`
- [ ] Update colors in Tailwind config (web) and StyleSheets (mobile)
- [ ] Test on both web and mobile platforms

## Icon Specifications

### Mobile App Icon Requirements

- **Format**: PNG
- **Size**: 1024x1024 pixels (Expo generates all required sizes)
- **Background**: Transparent or solid color
- **Content**: Should be recognizable at small sizes (home screen icon)

### Web Icon

- **Format**: SVG (scalable)
- **Size**: Rendered at 32x32 pixels in header
- **Usage**: Inline in header component

## Troubleshooting

### Icon Not Appearing on Mobile

1. Verify `apps/mobile/assets/icon.png` exists and is 1024x1024
2. Run `npx expo prebuild --clean` to regenerate native projects
3. Completely rebuild the app (not just hot reload)
4. Uninstall the app from device/simulator
5. Reinstall the app

### Icon Not Updating

- **Web**: Clear browser cache or hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- **Mobile**: Ensure you ran `prebuild --clean` and did a full rebuild, not just a hot reload

### Colors Not Updating

- **Web**: Restart the dev server
- **Mobile**: Rebuild the app (colors are compiled into native code)

