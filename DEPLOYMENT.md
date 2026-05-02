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
- Pricing page with PayPal checkout for single clean PDF exports.
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
   - PayPal client secret
   - Solana USDC receiver wallet
6. Replace subscription buttons with real checkout flows when monthly plans are ready.
7. Replace sponsor/ad spaces with AdSense units only after approval.

## PayPal Environment Variables

Set these in Vercel under Project Settings -> Environment Variables.

Sandbox:

```bash
PAYPAL_CLIENT_ID=<sandbox client id>
PAYPAL_CLIENT_SECRET=<sandbox secret>
PAYPAL_ENV=sandbox
VITE_PAYPAL_CLIENT_ID=<sandbox client id>
```

Live:

```bash
PAYPAL_CLIENT_ID=<live client id>
PAYPAL_CLIENT_SECRET=<live secret>
PAYPAL_ENV=live
VITE_PAYPAL_CLIENT_ID=<live client id>
```

Do not store or paste the PayPal secret in public files or chat. After changing Vercel environment variables, redeploy production.

Checkout diagnostics are hidden by default. To show the checkout log while testing, open:

```text
https://bizformflow.vercel.app/pricing?debug=1
```

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
- No fake ad widgets on the production domain unless clearly labeled sponsor/ad spaces are removed.
- Enough useful content beyond a thin tool shell.
