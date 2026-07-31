# Unified Public Data

A TypeScript and Apollo Server GraphQL gateway over three public REST APIs:
JSONPlaceholder, Open-Meteo, and REST Countries.

This is a supporting portfolio project. It demonstrates a single typed API over
third-party sources, DataLoader-backed lookups, request-budget controls, and
explicit upstream HTTP failure handling. It is not presented as production,
scale, reliability, or deployment evidence.

## Implemented source paths

- GraphQL queries for posts, users, comments, weather, and countries
- Nested post/user/comment resolution with DataLoader
- In-process response caching
- Query depth and cost limits
- Per-process rate limiting
- Persisted-query and metrics plugins
- Weather subscription resolver logic
- Vercel and Cloudflare Workers configuration

The automated suite covers resolver behavior, query-cost rejection, nested
resolution, and the upstream HTTP failure contract. Source presence for the
other plugins and hosting adapters is not a production or deployment receipt.

## Upstream failure contract

- Non-success HTTP responses from all three providers raise an
  `UpstreamHttpError` carrying the provider name, status code, and GraphQL
  extensions.
- A REST Countries `404` for a single-country lookup remains a valid `null`
  result.
- A success-status response with the wrong REST Countries shape raises an
  `UpstreamResponseError` instead of being treated as missing data.
- Network, JSON parsing, and transformation failures propagate as errors rather
  than being converted into empty lists or `null`.

The gateway does not currently provide retries, request deadlines, circuit
breaking, stale-if-error responses, or comprehensive runtime validation of
third-party payloads.

### Current REST Countries gate

The checked-in adapter targets the retired unauthenticated v3.1 contract. A
live smoke on 2026-07-31 received the provider's deprecation envelope, which the
gateway now exposes as contract drift. The maintained v5 API requires a bearer
key, a new hostname, and a new response mapping. Until that credentialed
migration is deliberately selected, the country fields are not live-operational.
See the provider's
[API version policy](https://restcountries.com/docs/countries/api-versions).

## Quick start

Prerequisites: Node.js 18+ and npm.

```bash
npm ci
npm run type-check
npm test
npm run build
npm run dev
```

The local server starts at `http://localhost:4000/graphql`.

## Example query

```graphql
query GetData {
  posts(limit: 3) {
    title
    user {
      name
    }
  }

  weather(latitude: 40.7128, longitude: -74.0060) {
    current {
      temperature
    }
  }

  countries(limit: 3) {
    name {
      common
    }
    capital
  }
}
```

More examples are in [EXAMPLE_QUERIES.md](./EXAMPLE_QUERIES.md).

## Project structure

```text
src/
├── datasources/   # REST clients and shared HTTP-status contract
├── plugins/       # Apollo request controls, caching, and metrics
├── resolvers/     # Query and nested-field resolvers
├── schema/        # GraphQL schema
├── index.ts       # Node.js entry point
└── worker.ts      # Cloudflare Workers adapter
```

## Verification and delivery boundary

Use `npm test`, `npm run type-check`, and `npm run build` as the local gates.
There is currently no repository CI workflow, checked-in container definition,
or verified live deployment. The Vercel and Cloudflare files are configuration
targets only; see [DEPLOYMENT.md](./DEPLOYMENT.md).

The built-process smoke currently passes health, JSONPlaceholder, and
Open-Meteo. REST Countries remains behind the explicit migration gate above.

The current dependency audit is not clean and includes high-severity production
findings rooted in Apollo Server 4. Do not deploy this project without a
separate dependency-upgrade pass and exact-final-tree verification.

`package.json` declares the MIT identifier, but the repository does not
currently include a standalone license file.
