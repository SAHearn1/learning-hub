# Brand Asset Manifest

Required PNG files for the RootWork Learning Hub brand system.
These assets are referenced by components in `src/components/brand/`.

**Status:** Pending design team delivery.
See issue #179 and `docs/ops/ISSUES_174_176_178_179_192.md` for sourcing steps.

---

## Required Files

### RWFW Seal

| File path | Description | Dimensions |
|-----------|-------------|------------|
| `public/brand/rwfw-seal.png` | RootWork For Wellness primary seal | 512×512 px |
| `public/brand/rwfw-seal@2x.png` | High-DPI retina variant | 1024×1024 px |

Used by: `src/components/brand/BrandLogo.tsx`

---

### 5R Phase Icons

One icon per phase of the 5R framework. Used by `src/components/brand/FiveRIcon.tsx`
and `src/components/brand/FiveRStrip.tsx`.

| File path | Phase | Description | Dimensions |
|-----------|-------|-------------|------------|
| `public/brand/5r-regulate.png` | Regulate | Self-regulation / calm icon | 256×256 px |
| `public/brand/5r-restore.png` | Restore | Rest and renewal icon | 256×256 px |
| `public/brand/5r-reflect.png` | Reflect | Reflection / metacognition icon | 256×256 px |
| `public/brand/5r-reason.png` | Reason | Critical thinking / reasoning icon | 256×256 px |
| `public/brand/5r-reconnect.png` | Reconnect | Community / reconnection icon | 256×256 px |

---

## File Format Requirements

- Format: PNG with transparency (alpha channel)
- Color space: sRGB
- Naming: lowercase, hyphen-separated (no spaces)
- All icons should have consistent visual weight and style

## Checklist

- [ ] `rwfw-seal.png` sourced from design team
- [ ] `rwfw-seal@2x.png` sourced from design team
- [ ] `5r-regulate.png` sourced
- [ ] `5r-restore.png` sourced
- [ ] `5r-reflect.png` sourced
- [ ] `5r-reason.png` sourced
- [ ] `5r-reconnect.png` sourced
- [ ] All files committed to `public/brand/`
- [ ] `BrandLogo` renders without broken image in staging
- [ ] `FiveRIcon` renders all 5 phases in staging
- [ ] `FiveRStrip` renders correctly in staging
