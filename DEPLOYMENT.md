# Deployment Notes

This repository contains configuration targets for Vercel and Cloudflare
Workers. Their presence does not prove a successful deployment. No live
deployment receipt is currently recorded.

## Local build and process

```bash
npm ci
npm run type-check
npm test
npm run build
npm start
```

The Node.js process serves GraphQL at `http://localhost:4000/graphql`.

## Cloudflare Workers target

`wrangler.toml` and `src/worker.ts` define the current Worker target.

```bash
npm run deploy:cloudflare
```

This command requires an authenticated Wrangler environment and has not been
used as an authoritative release gate for the current repository revision.

## Vercel target

`vercel.json` and `api/graphql.ts` define the current Vercel target.

```bash
npm run deploy:vercel
```

This command requires an authenticated Vercel environment and has not been used
as an authoritative release gate for the current repository revision.

## GraphQL process probe

After starting the Node.js server locally:

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

## Current delivery boundary

- No checked-in container definition or Compose configuration
- No repository CI workflow
- No verified public deployment
- No rollback, recovery, load, soak, scale, or uptime evidence

Adding a delivery target should be driven by a selected role or an actual
hosting requirement, then verified on the exact final revision.
