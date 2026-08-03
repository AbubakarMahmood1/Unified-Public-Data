# Unified Public Data - Evidence Summary

## Disposition

Supporting TypeScript/GraphQL portfolio project. The live repository remains
the authority; it was not replaced by the broader generated contract-gateway
proposal.

## Current implementation

- Apollo Server 5 with a TypeScript GraphQL schema
- JSONPlaceholder, Open-Meteo, and REST Countries integrations
- DataLoader-backed nested lookups
- In-process response caching
- Query depth and cost controls
- Per-process rate limiting, persisted-query, and metrics source paths
- Vercel and Cloudflare Workers adapters/configuration

## Verified locally

- The original ten resolver and query-cost tests remain in the suite.
- Provider HTTP-status tests cover explicit `503` failures for all three
  integrations and preserve REST Countries `404` as a missing-country result.
- REST Countries v5 tests cover server-only bearer authentication, alpha-2 and
  alpha-3 lookups, schema mapping, pagination, invalid records, and contract
  drift.
- Semantic lint, TypeScript type-check, tests, build, and dependency audit are
  local verification gates.

## Failure semantics

Provider outages are not domain absence. Non-success HTTP responses raise an
`UpstreamHttpError` with source, status, and GraphQL extension metadata. Invalid
REST Countries envelopes use `UPSTREAM_INVALID_RESPONSE`. The only intentional
absence mapping introduced by HTTP status is a single-country REST Countries
`404`, which resolves to `null`.

The country adapter now uses the maintained v5 host and response contract. It
reads `REST_COUNTRIES_API_KEY` from the server environment, sends it only in a
bearer header, validates the consumed response fields, and keeps credential
absence distinct from a missing-country result.

This is deliberately smaller than the generated proposal. The project does not
claim bounded retries, deadlines, circuit breaking, stale-if-error caching,
typed warning envelopes, composed partial snapshots, or comprehensive runtime
validation of upstream JSON.

## Delivery and claim limits

- No checked-in container artifact
- GitHub Actions verification is checked in for Node.js 20 and 24, but has no
  remote run receipt yet
- No verified Vercel or Cloudflare deployment
- REST Countries requires a server-side account key at runtime
- The exact local dependency tree currently has zero known `npm audit` findings
- No load, scale, uptime, latency, or reliability receipt
- No production-ready, enterprise-grade, or battle-tested claim
- MIT license is explicit in both `package.json` and the standalone `LICENSE`

See [README.md](./README.md) for use and [DEPLOYMENT.md](./DEPLOYMENT.md) for
the bounded hosting configuration notes.
