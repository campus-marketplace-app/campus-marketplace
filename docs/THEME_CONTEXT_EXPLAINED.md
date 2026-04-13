# ThemeContext Explained (Simple Version)

## What Does ThemeContext Do?

It's the **control center** that manages all theme changes in the app. When a user picks a color, font, or dark mode, ThemeContext handles it.

---

## How It Works (Simple Flow)

```
User picks "Ocean Blue" in Appearance panel
        ↓
ThemeContext gets notified
        ↓
Reads the Ocean preset (blue colors, etc)
        ↓
Generates 25+ colors from that one color
        ↓
Sets all those colors as CSS variables on the page
        ↓
Every component uses those CSS variables
        ↓
Entire app instantly changes to blue ✨
```

---

## The 4 Main Components

### 1. **Helper Functions**
Small tools that do specific jobs:
- `loadInitialPrefs()` — Reads your last theme choice from localStorage
- `systemPrefersDark()` — Checks if your computer is in dark mode
- `buildCssVars()` — Creates 25+ colors from your chosen color
- `ensureFontLoaded()` — Downloads the font you picked

### 2. **ThemeProvider Component**
The wrapper that makes theme available everywhere:
```typescript
// In main.tsx, wrap the entire app:
<ThemeProvider>
  <App />
</ThemeProvider>
```

**What it does:**
1. Loads your saved theme choice from localStorage
2. Checks if you want auto/light/dark mode
3. Generates all the colors
4. Applies them to the `<html>` tag
5. Watches for changes and updates instantly

### 3. **CSS Variables**
The colors get applied as CSS variables:
```css
--color-primary: #1a6eb5      /* Main color */
--color-text: #111827          /* Text color */
--color-border: #e5e7eb        /* Border color */
--font-family: Inter, sans-serif
--radius: 0.375rem
/* ... 20+ more */
```

Every component uses these:
```jsx
<button style={{ backgroundColor: 'var(--color-primary)' }} />
```

### 4. **useTheme Hook**
How components access the theme:
```typescript
function MyComponent() {
  const { setPreset, activePresetId } = useTheme()
  
  return (
    <button onClick={() => setPreset('ocean')}>
      Change to Ocean
    </button>
  )
}
```

---

## What Gets Saved

When you change a theme, it saves to localStorage (on your device/browser):
```json
{
  "presetId": "ocean",
  "mode": "dark",
  "radius": "rounded",
  "fontId": "inter"
}
```

**On the same device:**
- Logout and login → **Appearance stays the same** ✓
- Close and reopen the app → **Appearance stays the same** ✓
- Next day → **Appearance stays the same** ✓

**On a different device:**
- Open app on phone → Uses default theme (not saved on phone) ✗
- Open app on different computer → Uses default theme ✗

**Note:** Currently, appearance is saved **locally on your device**, not synced to your account. In the future, this could be saved to the database so it follows you across devices.

---

## Why It Works This Way

- **One place to manage everything** — All theme logic in one file
- **localStorage** — Remembers your choice
- **CSS variables** — Instant updates to all components
- **One color generates 25+** — Primary color automatically makes hover states, darker versions, etc.
- **Auto dark mode** — Can follow your computer's preference

---

## Summary

"ThemeContext is like a control room. When you pick a color in the Appearance panel, it tells the entire app to change to that color. The whole thing happens instantly."

1. **The user action:**
   - "User opens Appearance panel and clicks 'Ocean Blue'"

2. **What happens behind the scenes:**
   - "ThemeContext takes that blue color and generates 25+ shades from it"
   - "It creates hover colors, darker colors, lighter colors, border colors - everything"
   - "All those colors become CSS variables (like little placeholders)"

3. **The result:**
   - "Every button, text, banner - everything that uses color instantly turns blue"
   - "The top banner changes, the Draft/Publish button changes, everything changes"

4. **It remembers:**
   - "When you logout and login, the app is still blue"
   - "When you close the browser and come back tomorrow, it's still blue"
   - "This is because it saves to localStorage on your device"

5. ** where it's saved:**
   - "On your device/browser, not on your account"
   - "So on your phone it would be different, but on THIS computer it stays blue"

**The simple analogy:**
"You pick one primary color. The system automatically makes all the variations it needs from that one color. Everything that depends on color uses those variations. One choice, everything updates."
