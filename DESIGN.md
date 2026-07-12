# TSKC Design System

## Product framing

TSKC sells one branded-website subscription to independent businesses. The interface should make the seller feel that they are setting up a direct home for their own brand, never entering a marketplace, buyer flow, or generic commerce dashboard.

## Visual direction

- **Scene:** A business owner works on their website late in the day, so the product uses a concentrated dark canvas rather than a bright administrative surface.
- **Voice:** Direct, poster-like, and confident; calm enough for long-lived business work.
- **Color strategy:** Near-black canvas and white type do the structural work. Blue is reserved for focus and links. Violet and orange appear only as scarce showcase tiles, never as full-section backgrounds.
- **Typography:** Use the existing narrow system display stack for large statements and the system sans stack for reading. Keep headings compact but do not allow words to overflow on small screens.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--canvas` | `#090909` | Page background |
| `--surface-1` | `#181818` | Cards and raised controls |
| `--surface-2` | `#262626` | Selected controls and featured plan card |
| `--hairline` | `#363636` | Form borders |
| `--hairline-soft` | `#252525` | Section and list dividers |
| `--ink` | `#ffffff` | Headings and strong text |
| `--ink-muted` | `#999999` | Supporting text |
| `--accent-blue` | `#72adff` | Focus indicators and links only |

## Components

The owned component layer is shadcn/ui using Base UI primitives and Tailwind CSS v4. It is dark-only: semantic shadcn tokens map directly to the palette above and there is no theme toggle.

### Navigation

The header keeps the TSKC wordmark, a small set of product anchors, a sign-in action, and a single white pill primary action. It collapses to a shadcn Sheet menu on small screens.

### Buttons

- Primary: white text-on-dark inversion, 44px minimum height, full pill.
- Secondary: `--surface-1` pill, same minimum height. Outline treatments are reserved for supporting actions and social sign-in.
- Do not add bordered ghost buttons or blue primary buttons.

### Account panel

- One centered `--surface-1` card on the canvas.
- Visible labels, 44px inputs, blue 3px focus outline, generic password-reset acknowledgement.
- Sign-in, account creation, social authentication, reset, and sign-out stay in one linear keyboard-friendly flow.
- Do not expose role pickers or buyer-related copy.

### Website showcase

Use a single browser-like website preview and no more than one violet and one orange feature tile per long landing page. These tiles demonstrate the outcome: a business's own website.

### Pricing

Present one clear branded-website plan. It is an offer card, not a multi-tier pricing table.

## Responsive and accessibility rules

- Keep the page width at or above 320px without horizontal overflow.
- Collapse multi-column sections to a single column below 810px.
- Preserve 44px minimum controls, visible focus, semantic headings, form labels, and status messages.
- Respect `prefers-reduced-motion`; button movement and smooth scrolling become instant.
- Maintain WCAG AA contrast for body text and do not use color as the only status signal.

## Content rules

- Say **seller**, **business owner**, **branded website**, and **plan**.
- Do not say buyer, storefront, product catalogue, checkout, wallet, receipt, order, delivery, or marketplace unless documenting a rejected historical alternative in an ADR.
- Explain features in terms of the business's direct web presence, not ecommerce operations.
