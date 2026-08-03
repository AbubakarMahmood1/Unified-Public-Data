# Deployment Notes

This repository contains configuration targets for Vercel and Cloudflare
Workers. Their presence does not prove a successful deployment. No live
deployment receipt is currently recorded.

## Current deployment decision

Do not deploy the raw public gateway yet. There is no selected consumer, and
the REST Countries acceptable-use boundary does not permit simply re-exposing
its country data as another public API or feed. A future deployment contract
must first name the consuming feature, confirm provider permission for that
shape, add an abuse/quota boundary, and choose a host. Free-tier capacity alone
is not a deployment reason.

## Local build and process

```bash
npm ci
npm run lint
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
- GitHub Actions verification is checked in but has no remote run receipt yet
- No verified public deployment
- No rollback, recovery, load, soak, scale, or uptime evidence

Reopen deployment only for an actual consuming feature or hosting requirement,
then verify provider permission, cost ceiling, secrets, abuse controls, and the
exact final revision.
