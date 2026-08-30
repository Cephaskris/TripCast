# TripCast Permanent System & Design Guidelines

## 1. Official UI Design System (Crextio Aesthetic)
All future user interfaces, web portals, dashboards, and client components for TripCast MUST strictly follow this design system:

- **Canvas Atmosphere**:
  - Full-Screen Responsive Viewport: Smooth warm gradient canvas transitioning from soft cream/off-white (`#FAF8F4`) to sunset golden amber glow on the right (`#FDE9BE` to `#FDD98B`). Fills 100% of browser window width and height.
- **Color Palette & Accents**:
  - **Primary Dark / Contrast**: Charcoal Black (`#1E1E22`, `#222327`) for active pill navigation, time capsules, hero actions, and dark contrast cards.
  - **Signature Accent Yellow / Gold**: Energetic honey gold (`#F9D058`, `#FFCE47`) for stat highlights, dot matrix active nodes, wavy chart fills, and progress bars.
  - **Card Surfaces**: Pure white porcelain cards (`#FFFFFF`) with subtle border `rgba(0,0,0,0.05)` and `border-radius: 20px - 26px`.
  - **Pastel Status Badges**:
    - Paid / Verified: Soft Lavender (`#EBE5FF`, text `#7C3AED`)
    - Active / Online: Soft Emerald Green (`#E6F8EE`, text `#16A34A`)
    - Pending / Warning: Soft Amber (`#FEF3C7`, text `#D97706`)
- **Typography & Metrics**:
  - Primary Font: Geometric sans-serif (`Plus Jakarta Sans`).
  - Greetings: Large, lightweight, graceful typography (`34px`, font-weight `400`).
  - KPI Stat Numbers: Extra-bold (`font-weight: 800`), large numbers (`34px`) with subdued uppercase icon labels below.
  - Numbers & Coordinates: `JetBrains Mono` for tabular alignment.
- **Bento Grid Architecture**:
  - Left Column: Vertical connected timeline with active dark pill bubbles and mini calendar strip.
  - Center Column: Clean white data tables with pill search bar + wavy dual-line SVG velocity curve.
  - Right Column: Signature matte dark contrast telemetry card with golden/slate dot matrix + donut fulfillment chart.
  - Interactive Accents: Circular arrow buttons (`↗`) in the top right of each card.

## 2. Currency
- All platform currency is strictly **Nigerian Naira (`₦` / NGN)**.
- Standard Rates:
  - Advertiser Campaign Rate: `₦25.00` per verified video playback impression.
  - Driver Settlement Payout Rate: `₦10.00` per validated playback impression.

## 3. Expo Version Notice
- When modifying mobile client code, ensure compatibility with Expo SDK 54.
