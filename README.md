# Unified Public Data

A TypeScript and Apollo Server GraphQL gateway over three public REST APIs:
JSONPlaceholder, Open-Meteo, and REST Countries.

This is a supporting portfolio project. It demonstrates a single typed API over
third-party sources, DataLoader-backed lookups, request-budget controls, and
explicit upstream HTTP failure handling. It is not presented as production,
scale, reliability, or deployment evidence.

### Architecture boundary

This is one GraphQL service that aggregates three REST providers. It is not an
Apollo Federation deployment: there are no independently operated GraphQL
subgraphs, composed supergraph, or router. Federation would become useful only
if independently owned graph services or a real consumer created that boundary;
splitting these three adapters into separate services merely to recover the word
"federated" would add operational cost without improving the current product.

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

### REST Countries credential

The country adapter targets the maintained v5 API and maps its paginated
`data.objects` response into the existing GraphQL schema. It validates every
field the gateway consumes and fails closed on missing credentials, invalid
records, non-advancing pagination, and non-success HTTP responses.

Set `REST_COUNTRIES_API_KEY` only in the server environment. For local work,
copy `.env.example` to `.env` and enter the value there; `.env` is ignored by
Git and loaded by the Node.js entry point. The adapter sends the key in the
`Authorization: Bearer` header, never in the URL. Do not place it in browser
code or commit it. See the provider's [authentication and v5 documentation](https://restcountries.com/docs).

## Quick start

Prerequisites: Node.js 20.9+ and npm.

Copy `.env.example` to `.env`, then set your local REST Countries key:

```dotenv
REST_COUNTRIES_API_KEY=your-local-key
```

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

Use `npm run lint`, `npm run type-check`, `npm test`, `npm run build`, and
`npm audit` as the local gates. The checked-in GitHub Actions workflow repeats
those gates on Node.js 20 and 24, but it is not a public-CI receipt until it has
run on GitHub. There is no checked-in container definition or verified live
deployment. The Vercel and Cloudflare files are configuration targets only;
see [DEPLOYMENT.md](./DEPLOYMENT.md).

The adapter and datasource tests cover the REST Countries v5 mapping,
credential boundary, exact alpha-code routes, pagination, invalid payloads,
HTTP failures, and the intentional `404`-to-`null` case. A real-key smoke is a
local verification receipt, not deployment evidence.

The dependency tree uses Apollo Server 5 and currently passes a full `npm audit`
with zero known vulnerabilities. Re-run the audit on the exact revision before
making a future release claim.

The project is licensed under the [MIT License](./LICENSE).
