# Debugging Navigation in Mobile App

## Method 1: Using React DevTools Console

1. **Open React DevTools**:
   - Shake device → "Debug" or "Open Developer Menu"
   - Select "Debug Remote JS" or "Open React DevTools"
   - This opens Chrome DevTools with React DevTools

2. **Access Navigation Object**:
   - In Chrome DevTools Console, you can access the navigation object from any screen component
   - React DevTools → Components → Find `HomeScreen` or any screen → Inspect props → Find `navigation` prop

3. **Call Navigation Programmatically**:

   ```javascript
   // If you can access a screen's navigation prop:
   $r.props.navigation.navigate('Dashboard');

   // Or use replace:
   $r.props.navigation.replace('Dashboard');
   ```

## Method 2: Using Expo Dev Menu + Console

1. **Open Expo Dev Menu**: Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)

2. **Enable Remote JS Debugging**:
   - Select "Debug Remote JS"
   - This opens Chrome DevTools

3. **In Chrome Console**:
   ```javascript
   // If you have a reference to navigation, you can use it
   // But this requires you to expose it somehow
   ```

## Method 3: Add Dev-Only Test Button (Easiest)

Add a button that's always visible (even when signed out) that navigates to Dashboard for testing purposes. This is the most reliable method for testing.

See the implementation below - we can add this temporarily to HomeScreen.

## Method 4: Using React Native Debugger

If you have React Native Debugger installed:

1. Open React Native Debugger
2. Connect to your app
3. In the console:
   ```javascript
   // Navigate to a component that has navigation
   // Then access navigation from $r
   ```

## Recommended: Add Temporary Test Button

The easiest and most reliable way is to add a temporary test button to HomeScreen that always navigates to Dashboard, regardless of auth state. This makes testing protection straightforward.
