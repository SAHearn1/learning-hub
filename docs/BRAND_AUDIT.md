# Brand Audit — RootWork Learning Hub

**Date:** 2026-02-16
**Auditor:** Orchestrator (Claude Opus 4.6)

## Source Asset Inventory

| Original File | Source | Canonical Output | Status |
|---------------|--------|-----------------|--------|
| RWFW Logo 1.png | Brand package | `/public/brand/rwfw-seal.png` | PENDING — requires source PNG |
| Root icon 2-16-25.png | Brand package | `/public/brand/5r-root.png` | PENDING — requires source PNG |
| REgulate Icon.png | Brand package | `/public/brand/5r-regulate.png` | PENDING — requires source PNG |
| Reflect Icon.png | Brand package | `/public/brand/5r-reflect.png` | PENDING — requires source PNG |
| Restore 21625.png | Brand package | `/public/brand/5r-restore.png` | PENDING — requires source PNG |
| Reconnect Icon.png | Brand package | `/public/brand/5r-reconnect.png` | PENDING — requires source PNG |
| (derived from seal) | — | `/public/brand/favicon.png` | PENDING — resize from seal |

## Component Audit

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| BrandLogo | `/src/components/brand/BrandLogo.tsx` | CREATED | SVG gradient logo, full/compact variants |
| FiveRIcon | `/src/components/brand/FiveRIcon.tsx` | CREATED | Individual phase icon with sm/md/lg sizes |
| FiveRStrip | `/src/components/brand/FiveRStrip.tsx` | CREATED | Horizontal nav strip, compact variant |
| rootwork-logo | `/src/components/brand/rootwork-logo.tsx` | EXISTING | Original SVG logo |
| rootwork-icon | `/src/components/brand/rootwork-icon.tsx` | EXISTING | Lucide icon mapper |

## Token Audit

| Token File | Path | Status | Matches Spec |
|-----------|------|--------|-------------|
| tokens.json | `/styles/tokens.json` | CREATED | YES — exact match to spec |
| tokens.css | `/src/brand/tokens.css` | EXISTING | Extended version with CSS custom properties |
| brand.ts | `/src/brand/brand.ts` | EXISTING | TypeScript constants for programmatic use |

## Embedding Audit

| Location | BrandLogo | FiveRStrip | Status |
|----------|-----------|-----------|--------|
| Global header | TODO | TODO | Needs integration |
| Student dashboard | TODO | TODO | Needs integration |
| Educator dashboard | TODO | TODO | Needs integration |
| Session player | — | TODO | FiveRStrip as primary nav |
| README.md | TODO | — | Embed seal + 5R strip |

## Action Items

1. **Source PNGs needed:** The 6 original PNG files (RWFW seal + 5 phase icons) must be placed in `/public/brand/` with canonical names. These are physical image files that cannot be generated from code.
2. **Favicon generation:** Once `rwfw-seal.png` is available, resize to 32x32 and 180x180 for favicon use.
3. **Header integration:** Embed `<BrandLogo />` in the global navigation header.
4. **Dashboard integration:** Add `<FiveRStrip />` to student and educator dashboard layouts.
5. **README update:** Embed brand assets in README.md with relative paths.

## Notes

- SVG components (`BrandLogo.tsx`, existing `rootwork-logo.tsx`) provide vector logos that work at any size
- PNG assets in `/public/brand/` serve as fallbacks for contexts where SVG isn't supported (favicons, Open Graph, email)
- All components include accessibility attributes (aria-hidden, aria-label, role="img")
