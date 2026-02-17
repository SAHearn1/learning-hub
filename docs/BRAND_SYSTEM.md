# Brand System — RootWork Learning Hub

## Identity

**Name:** RootWork Learning Hub
**Organization:** Community Exceptional Children's Services (CECS)
**Tagline:** Grow Your Thinking

## Color Palette

### Primary — Forest Green (Growth, Stability)
| Token | Hex | Usage |
|-------|-----|-------|
| forest.deep | `#0C3B2E` | Header backgrounds, primary CTAs |
| forest.primary | `#14532D` | Body accents, active states |
| forest.glow | `#1E6B45` | Hover states, gradient endpoints |

### Secondary — Gold (Achievement, Wisdom)
| Token | Hex | Usage |
|-------|-----|-------|
| gold.primary | `#C9A23E` | Badges, highlights, focus rings |
| gold.light | `#E5C76B` | Decorative accents |
| gold.muted | `#B68D2E` | Subtle gold on dark backgrounds |

### Neutrals & Status
- `surface.white` (#FFFFFF), `surface.soft` (#F8F7F2) — page backgrounds
- `text.primary` (#0F172A), `text.muted` (#475569), `text.inverse` (#FFFFFF)
- `status.success` (#1E6B45), `status.warning` (#C48A1D), `status.danger` (#B91C1C)

## Typography

- **Sans:** Inter, -apple-system, BlinkMacSystemFont, sans-serif
- **Mono:** JetBrains Mono, Fira Code, monospace
- **Dyslexic:** OpenDyslexic (accessibility accommodation)

## Logo Usage

### Clearspace
Maintain a minimum clearspace equal to the height of the "R" in "RootWork" on all sides.

### Background Rules
- On dark backgrounds: Use the gold (#C9A23E) leaf motif
- On light backgrounds: Use the forest green (#0C3B2E) gradient logo
- Never place the logo on busy/patterned backgrounds

### Minimum Size
- Digital: 32px height minimum
- Print: 0.5 inch height minimum

## 5R Phase Icons

Each phase of the RootWork 5Rs has a designated icon and color:

| Phase | Icon Asset | Phase Color | Description |
|-------|-----------|-------------|-------------|
| Root | `/brand/5r-root.png` | `#0C3B2E` (forest.deep) | Ground & Connect |
| Regulate | `/brand/5r-regulate.png` | `#14532D` (forest.primary) | Check In & Breathe |
| Reflect | `/brand/5r-reflect.png` | `#1E6B45` (forest.glow) | Think & Reason |
| Restore | `/brand/5r-restore.png` | `#B68D2E` (gold.muted) | Learn & Grow |
| Reconnect | `/brand/5r-reconnect.png` | `#C9A23E` (gold.primary) | Apply & Share |

### FiveRStrip Component
Use `<FiveRStrip />` as the primary navigation for 5R session players. Available in `compact` and `full` variants.

### Gold Accent Usage
- Use gold sparingly as an accent color — never as a primary background
- Gold is reserved for: achievement badges, focus states, active phase indicators, logo accents
- Do not combine gold text on white backgrounds (contrast too low)

## Asset Locations

### Canonical Assets (`/public/brand/`)
```
rwfw-seal.png       — Official RWFW seal logo
5r-root.png         — Root phase icon
5r-regulate.png     — Regulate phase icon
5r-reflect.png      — Reflect phase icon
5r-restore.png      — Restore phase icon
5r-reconnect.png    — Reconnect phase icon
favicon.png         — Browser favicon
```

### Components (`/src/components/brand/`)
```
BrandLogo.tsx       — RWFW seal logo (full/compact variants, uses /brand/rwfw-seal.png)
FiveRIcon.tsx       — Individual phase icon using PNG assets from /brand/
FiveRStrip.tsx      — Horizontal strip of all 5R phases with PNG icons
rootwork-logo.tsx   — Site logo component (uses /brand/rwfw-seal.png)
rootwork-icon.tsx   — Lucide icon mapper for navigation
```

### Design Tokens
- `/styles/tokens.json` — Canonical token definitions per spec
- `/src/brand/tokens.css` — CSS custom properties
- `/src/brand/brand.ts` — TypeScript constants

## Dark Mode Compatibility

All brand icons use white text on colored backgrounds — they remain readable on both light and dark page backgrounds. The SVG logo uses a gradient that works on any background.

## Accessibility

- All decorative icons include `aria-hidden="true"`
- Functional icons include `role="img"` + `aria-label`
- FiveRStrip uses `nav` landmark with `aria-label="5R Learning Phases"`
- Active phase indicated with `aria-current="step"`
- Color is never the sole differentiator — icons and labels supplement color coding
