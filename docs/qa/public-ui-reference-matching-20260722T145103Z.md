# Public UI Reference-Matching QA — 20260722T145103Z

Scope: Public UI finalization and reference-matching QA for the NEXS PPF public pages using the four generated/supplied hero assets currently wired in the repo.

## Routes checked

- `/`
- `/about-nexs`
- `/clear-ppf`
- `/matte-ppf`
- `/color-ppf`

## Source assets checked

- `public/media/nexs-home-hero-v2.png` — 554043 bytes
- `public/media/nexs-about-hero-v2.png` — 389483 bytes
- `public/media/nexs-clear-ppf-hero-v2.png` — 437149 bytes
- `public/media/nexs-matte-color-hero-v2.png` — 867528 bytes

## Changes made in this milestone

- Refined asset hero grid balance and fade overlay in `src/app/globals.css`.
- Added per-asset object-position rules for home, about, clear, matte/color hero crops.
- Reduced oversized hero headline scale and loosened line height for a more premium hierarchy.
- Improved Thai/paragraph readability by increasing contrast and line height.
- Increased secondary CTA contrast and depth.
- Added red vertical accents to product/category cards and ensured card content stays above decorative layers.

## Browser visual QA screenshots

- Homepage: `/opt/data/profiles/treee-tech-lead/cache/screenshots/browser_screenshot_95d18815c773426fb15a389431107815.png`
- About NEXS: `/opt/data/profiles/treee-tech-lead/cache/screenshots/browser_screenshot_014af620df654aceaae9478619780398.png`
- Clear PPF: `/opt/data/profiles/treee-tech-lead/cache/screenshots/browser_screenshot_31f4be4484294fd891521f8907cce168.png`
- Matte PPF: `/opt/data/profiles/treee-tech-lead/cache/screenshots/browser_screenshot_822d280abf414b79ae75412ed2813d94.png`
- Color PPF: `/opt/data/profiles/treee-tech-lead/cache/screenshots/browser_screenshot_bb774e4c2ae6494c8cedc13234d12ff4.png`

## Visual QA result

- Homepage: PASS
- About NEXS: PASS
- Clear PPF: PASS
- Matte PPF: PASS with minor note: left faded split-car detail is intentionally subtle and low-contrast.
- Color PPF: PASS with minor notes: left faded split-car detail is subtle; Carbon Fiber card is denser than others but readable.

## Remaining risks / missing approvals

- Commercial-use rights for all generated/supplied assets still require NEXS admin confirmation before production launch.
- This milestone did not change production DNS and did not deploy to `nexsppf.com`.
- Private preview deployment was not created in this milestone.
