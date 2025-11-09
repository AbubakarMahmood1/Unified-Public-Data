# Unified-Public-Data

GraphQL Gateway that federates multiple public REST APIs into a unified GraphQL interface with intelligent caching, query cost analysis, and abuse prevention.

## Why It Matters

GraphQL adoption keeps rising in enterprises. A gateway that federates 2-3 public REST sources with caching and cost analysis demonstrates API design maturity without external auth hurdles.

## Features

✅ **Fully Implemented**
- **Apollo Server 4** (Node.js/TypeScript)
- **3 Public REST APIs** integrated (JSONPlaceholder, Open Meteo, REST Countries)
- **Response Caching** with configurable TTL (5 min default)
- **Persisted Queries** (APQ support, 24h TTL)
- **Query Cost Analysis** to prevent abuse (max 1000 points)
- **Query Depth Limiting** (max 10 levels)
- **Rate Limiting** (100 requests/min per IP)
- **Metrics & Monitoring** with real-time performance tracking
- **GraphQL Subscriptions** for live weather updates
- **DataLoader** for efficient request batching
- **Comprehensive Test Suite** (10 passing tests)
- **GraphQL Playground** for interactive testing
- **Deployment Ready** (Cloudflare Workers, Vercel, Docker)

## Integrated APIs

1. **JSONPlaceholder** - Posts, users, and comments
2. **Open Meteo** - Real-time weather data
3. **REST Countries** - Country information and statistics

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The server will start at `http://localhost:4000/graphql`

### Example Query

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

## Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Lint code
npm run format       # Format code with Prettier
```

## Architecture

### Directory Structure
```
src/
├── schema/          # GraphQL type definitions
├── resolvers/       # GraphQL resolvers
├── datasources/     # REST API clients with DataLoader
├── plugins/         # Apollo plugins (caching, cost analysis)
└── index.ts         # Server entry point
```

### Key Technologies
- **Apollo Server 4** - GraphQL server
- **TypeScript** - Type safety
- **DataLoader** - Request batching and caching
- **graphql-depth-limit** - Query depth limiting

## Security Features

- **Query Complexity Analysis** - Rejects queries exceeding cost limit (default: 1000)
- **Query Depth Limiting** - Maximum query depth of 10 levels
- **Response Caching** - 5-minute TTL to reduce API load
- **Input Validation** - Type-safe query arguments

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

Tests cover:
- GraphQL resolvers
- Query cost analysis
- Nested field resolution
- Error handling

## Deployment

Ready to deploy to multiple platforms:

### Cloudflare Workers
```bash
npm run deploy:cloudflare
```

### Vercel
```bash
npm run deploy:vercel
```

### Docker
```bash
docker build -t unified-public-data .
docker run -p 4000:4000 unified-public-data
```

### Other Platforms
Works on Railway, Render, Fly.io, Heroku, AWS, Google Cloud, Azure, and any Node.js hosting.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Example Queries

See [EXAMPLE_QUERIES.md](./EXAMPLE_QUERIES.md) for more query examples.

## Roadmap

- [x] Schema stitching with 3 public APIs
- [x] Response caching
- [x] Query cost limits
- [x] Persisted queries
- [x] Rate limiting per IP
- [x] Metrics and monitoring
- [x] GraphQL subscriptions (real-time weather updates)
- [x] Deploy configs for Cloudflare Workers/Vercel
- [ ] Authentication & authorization
- [ ] GraphQL Federation v2
- [ ] OpenTelemetry integration

## License

MIT