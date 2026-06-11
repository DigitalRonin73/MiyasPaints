# Miya's Paints

A simple website project for Miya's painting work.

## Repository Purpose

This repository contains the source files for Miya's painting website. The site is intended to showcase artwork, provide basic information, and give visitors a way to contact or follow Miya's work.

## Project Structure

```text
.
├── index.html
├── styles.css
├── script.js
├── images/
├── OPENCLAW.md
├── package.json
├── README.md
└── .gitignore
```

## Notes for Development

- Keep the site simple, clean, and easy to maintain.
- Use placeholder images until real artwork photos are added.
- Avoid committing secrets, API keys, tokens, or private customer information.
- Major redesigns should be done on a branch before merging into `main`.

## Local Preview

Because this is a static site, it can be previewed by opening `index.html` in a browser.

For a Cloudflare Pages-style local preview:

```bash
npm install
npm run dev
```

## Cloudflare Pages

This site is ready to deploy as a static Cloudflare Pages project.

Recommended Pages setup:

- Project name: `miyaspaints`
- Git repository: `DigitalRonin73/MiyasPaints`
- Production branch: `main`
- Build command: `exit 0`
- Build output directory: `.`
- Custom domain: `miyaspaints.com`

### Reservation form environment variables

Set these in Cloudflare Pages under **Settings > Environment variables**:

- `TURNSTILE_SITE_KEY`: Public Cloudflare Turnstile site key for `miyaspaints.com`. Current value: `0x4AAAAAADdn6XCmdRLtEqWR`.
- `TURNSTILE_SECRET_KEY`: Private Turnstile secret key.
- `RESEND_API_KEY`: Resend API key.
- `RESEND_FROM_EMAIL`: Verified Resend sender: `Pinto Beetle <reservations@send.miyaspaints.com>`.
- `RESERVATION_TO_EMAIL`: Miyako's destination email address for new reservation requests: `hello.Pintobeetle@gmail.com`.

Rate-limit binding:

- `RESERVATION_RATE_LIMIT_KV`: Cloudflare KV namespace binding for reservation rate limiting. The function has an in-memory local fallback, but production should use KV.

KV namespace:

- Namespace ID: `ac79beed3ec743eba531f1114c5e2ea8`

To configure or verify the KV binding in the Cloudflare dashboard:

1. Create a KV namespace, for example `miyaspaints-reservation-rate-limit`.
2. Open the `miyaspaints` Pages project.
3. Go to **Settings > Bindings > Add > KV namespace**.
4. Set **Variable name** to `RESERVATION_RATE_LIMIT_KV`.
5. Select the KV namespace and redeploy the Pages project.

For local development, copy `.dev.vars.example` to `.dev.vars` and fill in real test values. Do not commit `.dev.vars`.

After Cloudflare is authenticated locally, deploy directly with:

```bash
npm run deploy
```

GitHub Actions also deploys the site to Cloudflare Pages whenever `main` is updated. The workflow uses the `CLOUDFLARE_API_TOKEN` repository secret and deploys to the existing `miyaspaints` Pages project.

The reservation form posts to the Cloudflare Pages Function at `/api/reservation`. The function validates the request, checks Turnstile, sends a formatted reservation email to Miyako, sends a confirmation email to the customer, and returns JSON success/error responses.
