# Brand Audit — RootWork Learning Hub

**Date:** 2026-02-16
**Auditor:** Orchestrator (Claude Opus 4.6)

## Source Asset Inventory

| Original File | Source | Canonical Output | Status |
|---------------|--------|-----------------|--------|
| RWFW Logo 1.png | ~/Downloads | `/public/brand/rwfw-seal.png` | DEPLOYED |
| Root icon 2-16-25.png | ~/Downloads | `/public/brand/5r-root.png` | DEPLOYED |
| REgulate Icon.png | ~/Downloads | `/public/brand/5r-regulate.png` | DEPLOYED |
| REflect icon.png | ~/Downloads | `/public/brand/5r-reflect.png` | DEPLOYED |
| Restore 21625.png | ~/Downloads | `/public/brand/5r-restore.png` | DEPLOYED |
| Reconnect Icon.png | ~/Downloads | `/public/brand/5r-reconnect.png` | DEPLOYED |
| (derived from seal) | — | `/public/brand/favicon.png` | DEPLOYED (copy of seal) |

## Component Audit

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| BrandLogo | `/src/components/brand/BrandLogo.tsx` | DEPLOYED | Uses `/brand/rwfw-seal.png` via next/image |
| FiveRIcon | `/src/components/brand/FiveRIcon.tsx` | DEPLOYED | Uses PNG assets from `/brand/5r-*.png` |
| FiveRStrip | `/src/components/brand/FiveRStrip.tsx` | DEPLOYED | Horizontal nav strip with PNG icons |
| rootwork-logo | `/src/components/brand/rootwork-logo.tsx` | DEPLOYED | Uses `/brand/rwfw-seal.png` via next/image |
| rootwork-icon | `/src/components/brand/rootwork-icon.tsx` | EXISTING | Lucide icon mapper for navigation |

## Token Audit

| Token File | Path | Status | Matches Spec |
|-----------|------|--------|-------------|
| tokens.json | `/styles/tokens.json` | DEPLOYED | YES — exact match to spec |
| tokens.css | `/src/brand/tokens.css` | DEPLOYED | Forest/gold palette mapped from spec |
| phase-tokens.css | `/src/brand/phase-tokens.css` | DEPLOYED | Brand-consistent 5R phase colors |
| brand.ts | `/src/brand/brand.ts` | EXISTING | TypeScript constants for programmatic use |

## Embedding Audit

| Location | BrandLogo | FiveRStrip/Icons | Status |
|----------|-----------|-----------------|--------|
| Global header | RWFW seal PNG | — | DEPLOYED |
| Homepage hero | RWFW seal PNG | 5R icon row | DEPLOYED |
| Footer | RWFW seal PNG | — | DEPLOYED |
| Session player header | — | PhaseIndicator (CSS tokens) | DEPLOYED |
| Favicon | `/brand/favicon.png` | — | DEPLOYED |

## Verified

- All brand assets referenced only from `/public/brand/`
- No duplicate scattered copies
- Accessibility alt text on all images
- Dark mode: Icons use colored backgrounds, readable on both light and dark
- CSS token values match `/styles/tokens.json` exactly
