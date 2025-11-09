# Unified-Public-Data
GraphQL Gateway “Unified Public Data” (REST→GraphQL, caching, query cost limits)

Why it matters: GraphQL adoption keeps rising in enterprises; a gateway that federates 2–3 public REST sources with caching and cost analysis shows API design maturity without external auth hurdles. 
Apollo GraphQL

What you’ll ship:

Apollo Server (Node/TS) schema; resolvers calling 2–3 public REST APIs

Response caching + persisted queries; query cost analysis to avoid abuse

Tests + playground
Roadmap:

Schema stitch → 2) caching → 3) cost limits → 4) deploy to Cloudflare Workers/Vercel.