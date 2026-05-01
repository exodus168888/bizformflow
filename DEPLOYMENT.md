# Deployment Readiness

## What Is Ready

- Vite production build.
- React Router app routes.
- Vercel SPA rewrite config in `vercel.json`.
- Netlify SPA fallback in `public/_redirects`.
- `robots.txt`.
- `sitemap.xml`.
- `site.webmanifest`.
- Route-specific titles, descriptions, canonical URLs, and social metadata.
- Pricing page with PayPal and Solana USDC placeholders.
- Privacy, terms, and contact pages.

## Before Public Launch

1. Choose a custom domain.
2. Replace every `https://bizformflow.vercel.app` value after connecting a custom domain:
   - `index.html`
   - `public/robots.txt`
   - `public/sitemap.xml`
   - `src/App.tsx`
   - `.env.example`
3. Add a real support email on the contact, privacy, and terms pages.
4. Decide analytics provider:
   - Google Analytics
   - Plausible
   - Umami
   - PostHog
5. Connect payment provider details:
   - PayPal client ID
   - Solana USDC receiver wallet
6. Replace placeholder checkout buttons with real checkout flows.
7. Replace placeholder ad slots with AdSense units only after approval.

## Vercel Deploy

Build command:

```bash
npm run build
```

Output directory:

```bash
dist
```

The included `vercel.json` rewrites all app routes to `index.html`, so direct visits like `/invoice-generator` work.

## Netlify Deploy

Build command:

```bash
npm run build
```

Publish directory:

```bash
dist
```

The included `public/_redirects` file rewrites all app routes to `index.html`.

## Google Search Console

After deployment:

1. Add the domain or URL-prefix property.
2. Verify ownership.
3. Submit `https://bizformflow.vercel.app/sitemap.xml` or the sitemap for the custom domain.
4. Request indexing for the main tool pages.

## AdSense Readiness Checklist

- Real domain with HTTPS.
- Original content on each tool page.
- Privacy policy.
- Terms page.
- Contact page.
- No broken routes.
- No fake ad widgets on the production domain unless clearly non-ad placeholders are removed.
- Enough useful content beyond a thin tool shell.
