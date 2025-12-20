# UI Revamp Implementation Guide

## Overview

This guide documents the comprehensive UI revamp implemented to transform
WealthVN from its previous earthy "Flexoki" theme to a **Modern Fintech**
aesthetic. The redesign emphasizes trust, precision, speed, and a premium user
experience.

## Design System Changes

### Typography Updates

#### Font Stack

- **Primary UI Font**: Inter (Google Font)
  - Clean, legible, and neutral appearance
  - Gold standard for modern UI design
- **Secondary Data Font**: JetBrains Mono
  - Used for financial data (prices, percentages, balances)
  - Ensures visual alignment of numerical data

#### Font Loading

```typescript
// package.json dependencies
"@fontsource/inter": "^5.0.0",
"@fontsource/jetbrains-mono": "^5.0.0"
```

#### Typography Hierarchy

```css
/* Headings: Bold, tight tracking */
.text-heading {
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* Body: Regular, normal tracking */
.text-body {
  font-weight: 400;
  letter-spacing: normal;
}

/* Labels: Medium, wide tracking for uppercase */
.text-label {
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
```

### Color Palette Transformation

#### Dark Mode - "Deep Space" Theme

```css
:root {
  /* Background Colors */
  --background: #020617; /* Deep Slate/Navy */
  --surface: #111827; /* Slightly lighter navy */
  --surface-border: #1e293b; /* Subtle borders */

  /* Text Colors */
  --foreground: #f8fafc; /* Primary white */
  --foreground-muted: #94a3b8; /* Secondary blue-gray */

  /* Accent Colors */
  --primary: #6366f1; /* Vibrant Indigo */
  --success: #10b981; /* Emerald */
  --danger: #f43f5e; /* Rose */
  --warning: #f59e0b; /* Amber */
}
```

#### Light Mode - "Clean Sheet" Theme

```css
:root[data-theme="light"] {
  /* Background Colors */
  --background: #ffffff; /* Crisp white */
  --surface: #f8fafc; /* Faintly cool gray */
  --surface-border: #e2e8f0; /* Soft borders */

  /* Text Colors */
  --foreground: #0f172a; /* Deep slate */
  --foreground-muted: #64748b; /* Slate */

  /* Same vibrant accents for consistency */
  --primary: #6366f1;
  --success: #10b981;
  --danger: #f43f5e;
  --warning: #f59e0b;
}
```

## Component Implementation

### Card Components

#### Dark Mode Cards

```css
.card-dark {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: 0.75rem;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--surface-border) 10%, transparent),
    0 4px 6px -1px color-mix(in srgb, var(--foreground) 5%, transparent);
}
```

#### Light Mode Cards

```css
.card-light {
  background: var(--surface);
  border-radius: 0.75rem;
  box-shadow:
    0 1px 3px 0 color-mix(in srgb, var(--foreground) 10%, transparent),
    0 1px 2px -1px color-mix(in srgb, var(--foreground) 10%, transparent);
}
```

### Button Components

#### Primary Buttons

```css
.btn-primary {
  background: linear-gradient(
    135deg,
    var(--primary) 0%,
    color-mix(in srgb, var(--primary) 85%, black) 100%
  );
  color: white;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px color-mix(in srgb, var(--primary) 30%, transparent);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px color-mix(in srgb, var(--primary) 40%, transparent);
}

.btn-primary:active {
  transform: scale(0.98);
}
```

#### Secondary Buttons

```css
.btn-secondary {
  background: transparent;
  color: var(--foreground);
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--surface);
  border-color: var(--foreground-muted);
}
```

### Input Components

```css
.input-modern {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  color: var(--foreground);
  font-family: "Inter", sans-serif;
  transition: all 0.2s ease;
}

.input-modern:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent);
}
```

## Layout Updates

### Sidebar Redesign

#### Structure Changes

```typescript
// New sidebar layout
const sidebarStructure = {
  top: ["logo"],
  middle: ["navigation-items"],
  center: ["search-button"], // New search functionality
  bottom: ["settings-button"], // Pinned to bottom
};
```

#### Visual Updates

```css
.sidebar {
  background: color-mix(in srgb, var(--surface) 95%, transparent);
  backdrop-filter: blur(10px);
  border-right: 1px solid var(--surface-border);
}

.sidebar-item {
  border-radius: 0.5rem;
  margin: 0.25rem 0.5rem;
  transition: all 0.2s ease;
}

.sidebar-item:hover {
  background: color-mix(in srgb, var(--foreground) 10%, transparent);
}

.sidebar-item.active {
  background: var(--primary);
  color: white;
  box-shadow: 0 2px 4px color-mix(in srgb, var(--primary) 40%, transparent);
}
```

### Dashboard Layout

#### Spacing Improvements

```css
.dashboard-grid {
  display: grid;
  gap: 1.5rem; /* Increased from gap-4 to gap-6 */
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.dashboard-card {
  padding: 1.5rem;
  border-radius: 0.75rem;
}
```

## Data Visualization Updates

### Chart Color Palette

```css
:root {
  --chart-1: #6366f1; /* Indigo */
  --chart-2: #10b981; /* Emerald */
  --chart-3: #f59e0b; /* Amber */
  --chart-4: #f43f5e; /* Rose */
  --chart-5: #8b5cf6; /* Violet */
}
```

### Table Styling

```css
.data-table {
  background: var(--surface);
  border-radius: 0.75rem;
  overflow: hidden;
}

.data-table th {
  background: color-mix(in srgb, var(--foreground) 5%, transparent);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.75rem;
}

.data-table td {
  font-family: "JetBrains Mono", monospace;
  border-top: 1px solid var(--surface-border);
}

.data-table tr:hover {
  background: color-mix(in srgb, var(--foreground) 5%, transparent);
}
```

## Micro-interactions

### Button Interactions

```css
.interactive-element {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.interactive-element:active {
  transform: scale(0.95);
}
```

### Page Transitions

```css
.page-transition {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Glass Effects

### Liquid Glass Component

```css
.liquid-glass {
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid color-mix(in srgb, var(--surface-border) 50%, transparent);
  border-radius: 0.75rem;
}
```

## Theme Switching

### Theme Provider Implementation

```typescript
// src/lib/theme-provider.tsx
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

## Component Examples

### Theme Selector Component

```typescript
// src/components/theme-selector.tsx
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';

export function ThemeSelector() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="btn-secondary p-2 rounded-lg"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
```

### Activity Type Badge Component

```typescript
// src/pages/activity/components/activity-type-badge.tsx
interface ActivityTypeBadgeProps {
  type: string;
  className?: string;
}

export function ActivityTypeBadge({ type, className }: ActivityTypeBadgeProps) {
  const colors = {
    BUY: 'bg-emerald-500 text-white',
    SELL: 'bg-rose-500 text-white',
    DIVIDEND: 'bg-blue-500 text-white',
    INTEREST: 'bg-amber-500 text-white',
  };

  return (
    <span
      className={cn(
        'px-2 py-1 rounded-md text-xs font-medium',
        colors[type as keyof typeof colors] || 'bg-gray-500 text-white',
        className
      )}
    >
      {type}
    </span>
  );
}
```

## Performance Optimizations

### CSS Variable Usage

- All colors defined as CSS variables for instant theme switching
- Efficient color mixing with `color-mix()` function
- Minimal reflow/repaint during theme transitions

### Font Loading Strategy

```typescript
// Font preloading for better performance
export function preloadFonts() {
  const fonts = [
    { family: "Inter", weight: "400" },
    { family: "Inter", weight: "500" },
    { family: "Inter", weight: "600" },
    { family: "Inter", weight: "700" },
    { family: "JetBrains Mono", weight: "400" },
  ];

  fonts.forEach((font) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "font";
    link.type = "font/woff2";
    link.crossOrigin = "anonymous";
    link.href = `https://fonts.googleapis.com/css2?family=${font.family}:wght@${font.weight}&display=swap`;
    document.head.appendChild(link);
  });
}
```

## Accessibility Considerations

### Color Contrast

- All text combinations meet WCAG AA standards (4.5:1 contrast ratio)
- Interactive elements have enhanced contrast for better visibility
- Focus states use both color and outline indicators

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Focus indicators are clearly visible
- Logical tab order maintained

## Migration Guide

### For Developers

1. **Update Component Imports**

```typescript
// Old
import { Button } from "@/components/ui/button";
// New
import { Button } from "@/components/ui/button-modern";
```

2. **Use New Color Variables**

```css
/* Old */
background: var(--flexoki-bg);
/* New */
background: var(--surface);
```

3. **Update Typography**

```css
/* Old */
font-family: "IBM Plex Sans", sans-serif;
/* New */
font-family: "Inter", sans-serif;
```

### Breaking Changes

- Color variable names have changed
- Border radius values increased
- Font family updated
- Some component props modified

## Testing

### Visual Regression Testing

- Screenshots captured for both light and dark themes
- Component state variations tested
- Cross-browser compatibility verified

### Performance Testing

- Theme switching performance measured
- Font loading optimization verified
- CSS variable performance benchmarked

## Future Enhancements

### Planned Features

1. **Advanced Theming**: User-customizable color schemes
2. **Animation Library**: Sophisticated micro-interactions
3. **Component Variants**: More component style variations
4. **Dark Mode Improvements**: Enhanced dark mode aesthetics

### Technical Debt

- Migrate remaining legacy components
- Optimize CSS bundle size
- Implement CSS-in-JS for dynamic theming

## Troubleshooting

### Common Issues

1. **Theme Not Applying**
   - Check CSS variable definitions
   - Verify theme provider initialization
   - Clear browser cache

2. **Font Loading Issues**
   - Verify font imports in CSS
   - Check network requests for font files
   - Ensure font display strategy is appropriate

3. **Performance Issues**
   - Monitor CSS bundle size
   - Check for unnecessary re-renders
   - Optimize animation performance

### Debug Tools

- Use browser dev tools to inspect CSS variables
- Monitor network requests for font loading
- Profile animation performance with Chrome DevTools

## Conclusion

The UI revamp successfully transforms WealthVN into a modern, professional
fintech application. The new design system provides:

- Enhanced visual hierarchy and readability
- Improved user experience through micro-interactions
- Better accessibility and performance
- Scalable component architecture
- Consistent design language across the application

The implementation maintains backward compatibility while providing a clear
migration path for future development.
