# DESIGN.md

<!-- ryux-context:start -->
- **Product**: Prolog.co, stationery and Sudoku products.
- **Market**: Indonesia; interface language id-ID and prices in IDR (observed in the product UI).
- **UI direction**: Calm editorial. User-selected navy and cool-neutral palette (2026-11-09); layout, typography, product artwork, and interactions stay unchanged.
<!-- ryux-context:end -->

## Visual and motion language

```yaml
direction:
  id: navy-neutral
  name: Navy and cool neutral
  status: chosen
  philosophy: Carry the existing calm editorial brand through a restrained navy and neutral palette.
  evidence:
    - type: observed
      origin: user-provided palette
      reference: '#F3F4F6, #1D2846, #949492'
    - type: observed
      origin: existing UI
      reference: 'src/index.css, src/components/HeroBanner.jsx, src/admin/AdminLayout.jsx'
  colour:
    scheme: Monochromatic navy with cool-neutral surfaces.
    roles:
      background: '#F3F4F6'
      card: '#FFFFFF'
      primary-action-and-brand: '#1D2846'
      secondary-neutral: '#949492'
      muted-text: '#505563'
      status: 'Keep semantic success, pending, delivery, and destructive colors.'
    contrast:
      - pair: '#1D2846 on #F3F4F6'
        ratio: '13.21:1'
      - pair: '#505563 on #F3F4F6'
        ratio: '6.77:1'
      - pair: '#949492 on #F3F4F6'
        ratio: '2.76:1; decorative surfaces and borders only, not text.'
  surfaces:
    storefront: 'Use the palette for page ground, cards, headings, navigation, and primary actions.'
    admin: 'Use the same semantic tokens; retain compact layout and distinct status colors.'
  assets: 'Existing Sudoku covers and procedural product materials remain unchanged.'
  motion: 'Existing motion and reduced-motion behavior remain unchanged.'
  avoid:
    - 'Do not recolor product artwork as part of a palette-only change.'
    - 'Do not use #949492 for small text on #F3F4F6.'
```
