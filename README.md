# TSKC

A PoC of website subscription platform for online stores.

One account, one plan, one branded website per seller. Built with Next.js 16, Neon (PostgreSQL), Stripe, and Cloudflare R2.

## Features

- **Single branded website** per seller with draft/publish workflow
- **Custom subdomain** hosting — `{shop}.{platform}`
- **Stripe billing** — card (checkout subscription) or PromptPay (send_invoice), THB 149/month
- **Auth** — email/password + Google/Discord OAuth via better-auth
- **Image storage** — Cloudflare R2 with magic-byte validation (PNG/JPEG/WebP)
- **Rate-limited checkout** — Vercel KV, 5 req/15 min per seller
- **Security** — CSP nonces, HSTS, strict permissions policy
- **Observability** — Sentry error tracking, Resend transactional email

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL (Neon) + Drizzle ORM |
| Auth | better-auth (Drizzle adapter) |
| Billing | Stripe |
| Storage | Cloudflare R2 (S3-compatible) |
| Rate limit | Vercel KV |
| Email | Resend |
| Observability | Sentry |

## Architecture

```
Pages / API routes / Middleware
    ↓
tRPC router / Server Actions
    ↓
Service layer (billing, subscriptions, websites, shops, r2, auth)
    ↓
Drizzle+Neon  │  Stripe  │  Cloudflare R2
```

Rendering: Pages use React Server Components. Auth state flows via cookies and request context. The middleware injects CSP nonces on every request.

## Getting started

### Prerequisites

- [Bun](https://bun.sh) 1.3+
- PostgreSQL database (Neon free tier works)
- Stripe account with a price ID
- Cloudflare R2 bucket
- Resend API key
- Vercel KV instance (for rate limiting)

### Setup

```bash
bun install
cp .env.example .env.local
```

Fill in `.env.local` — all integrations are optional in dev except `DATABASE_URL`. In production, every env group must be fully set (all-or-none per group).

```bash
bun run db:generate
bun run db:migrate
bun run dev
```

## Scripts

| Command | Action |
|---|---|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run test` | Run tests (Vitest) |
| `bun run lint` | Lint (oxlint) |
| `bun run typecheck` | TypeScript check (`tsc --noEmit`) |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Apply migrations |

## Environment variables

| Group | Variables |
|---|---|
| Platform | `PLATFORM_DOMAIN` |
| Database | `DATABASE_URL` |
| Auth | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |
| OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` |
| R2 | `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` |
| Resend | `RESEND_API_KEY`, `RESEND_FROM` |
| KV | `KV_REST_API_URL`, `KV_REST_API_TOKEN` |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` |

Production requires all groups complete. See `.env.example` for descriptions.

## Project structure

```
src/
  app/          Pages, API routes, error boundaries
  components/   UI primitives + feature components
  db/           Drizzle schema + client
  lib/          Shared utilities (env, auth, billing, websites, tenancy, resend)
  server/       tRPC router, service layer, Stripe, R2, rate limiting
tests/          34 test files covering auth, billing, subscriptions, websites, security
```

## Testing

```bash
bun test         # Run all tests
bun test --watch # Watch mode
```

Tests use Vitest with a mocked `server-only` guard and Bun setup.

## Deployment

Deploy to Vercel. Set all environment variables, then configure the Stripe webhook to point at `POST /api/stripe/webhook`.

## Design

Dark-only theme, single-product focus. Vocabulary uses "seller" and "branded website" — never "buyer" or "storefront" in marketing. See [`DESIGN.md`](DESIGN.md).

## License

Apache 2.0. See [LICENSE](LICENSE).
