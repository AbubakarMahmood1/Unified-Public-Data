# CLAUDE.md - Development Guide for Unified Public Data

## Project Overview

**Unified Public Data** is a GraphQL Gateway that federates multiple public REST APIs into a unified GraphQL interface with intelligent caching, query cost analysis, and abuse prevention.

### Key Features
- Apollo Server (Node.js/TypeScript) with GraphQL schema
- Resolvers calling 2-3 public REST APIs
- Response caching + persisted queries
- Query cost analysis to prevent abuse
- Comprehensive test suite
- GraphQL Playground for testing
- Deployment targets: Cloudflare Workers/Vercel

## Development Roadmap

1. **Phase 1: Schema Stitching** - Define GraphQL schema and integrate REST APIs
2. **Phase 2: Caching** - Implement response caching and persisted queries
3. **Phase 3: Cost Limits** - Add query cost analysis and rate limiting
4. **Phase 4: Deployment** - Deploy to Cloudflare Workers/Vercel

## Current Status

✅ Project initialized with README
🔄 Setting up project structure and dependencies

## Project Structure

```
Unified-Public-Data/
├── src/
│   ├── schema/           # GraphQL type definitions
│   ├── resolvers/        # GraphQL resolvers
│   ├── datasources/      # REST API clients
│   ├── plugins/          # Apollo plugins (caching, cost analysis)
│   ├── utils/            # Utility functions
│   └── index.ts          # Server entry point
├── tests/                # Test files
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
└── CLAUDE.md            # This file
```

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **GraphQL Server**: Apollo Server 4.x
- **Caching**: Apollo Server cache plugins
- **Testing**: Jest + Apollo Server Testing
- **Linting**: ESLint + Prettier
- **Type Safety**: TypeScript strict mode

## Public REST APIs to Integrate

Recommended public APIs (no auth required):
1. **JSONPlaceholder** - https://jsonplaceholder.typicode.com (posts, users, comments)
2. **Open Meteo** - https://api.open-meteo.com (weather data)
3. **REST Countries** - https://restcountries.com (country information)

## Development Workflow

### Initial Setup
```bash
# Install dependencies
npm install

# Run development server with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Build for production
npm run build
```

### GraphQL Playground
Once the server is running, access GraphQL Playground at:
```
http://localhost:4000/graphql
```

## Query Cost Analysis Strategy

Implement query complexity calculation based on:
- Field depth (nested queries cost more)
- Array fields (multiply by estimated result size)
- Specific expensive fields (API calls)

Example complexity calculation:
```
query {
  posts {           # Array field: 100 * fields
    title          # +1
    author {       # +1 (nested)
      name         # +1
    }
  }
}
Total complexity: 300 (100 posts × 3 fields)
```

## Caching Strategy

1. **In-Memory Cache**: For frequently accessed data (short TTL)
2. **Persisted Queries**: Cache full query results by query hash
3. **DataLoader**: Batch and cache REST API calls per request
4. **HTTP Caching**: Respect Cache-Control headers from REST APIs

## Testing Strategy

1. **Unit Tests**: Test individual resolvers and utilities
2. **Integration Tests**: Test full GraphQL queries against mocked REST APIs
3. **Cost Analysis Tests**: Verify query complexity calculations
4. **Cache Tests**: Verify caching behavior

## Git Workflow

### Branch Strategy
- `main` - Production-ready code
- `claude/*` - Feature branches created by Claude
- Branch naming: `claude/<feature>-<session-id>`

### Commit Guidelines
- Use conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`
- Keep commits atomic and focused
- Write clear, descriptive commit messages

### Current Branch
```bash
claude/initial-setup-claude-md-011CUxmC9PrpR4DkfxkTWSjm
```

## Deployment Considerations

### Cloudflare Workers
- Bundle size limits (~1MB compressed)
- Use lightweight dependencies
- Consider edge caching

### Vercel
- Serverless functions with generous limits
- Built-in edge caching
- Easy GitHub integration

## Security Considerations

1. **Rate Limiting**: Implement per-IP rate limits
2. **Query Complexity**: Enforce maximum query complexity
3. **Query Depth**: Limit maximum query depth
4. **Timeouts**: Set reasonable timeout limits for REST API calls
5. **Input Validation**: Validate all inputs and arguments

## Performance Targets

- Query response time: < 200ms (cached)
- Query response time: < 1000ms (uncached)
- Support 100+ concurrent requests
- Cache hit rate: > 70%

## Next Steps

1. Initialize Node.js project with TypeScript
2. Install Apollo Server and dependencies
3. Set up project structure
4. Define initial GraphQL schema
5. Implement first REST API datasource
6. Add basic resolvers
7. Set up testing framework
8. Implement caching layer
9. Add query cost analysis
10. Deploy to production

## Claude-Specific Notes

This project is being developed with Claude's assistance. All development occurs on feature branches prefixed with `claude/`. Each feature branch includes a session ID for tracking purposes.

### Working with Claude

- Claude will create commits for each logical unit of work
- Claude will push to the designated feature branch
- Review and merge to `main` when the project is complete
- Claude follows TypeScript best practices and Apollo Server patterns

## Resources

- [Apollo Server Docs](https://www.apollographql.com/docs/apollo-server/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Query Complexity](https://www.apollographql.com/blog/graphql/security/securing-your-graphql-api-from-malicious-queries/)

---

**Last Updated**: 2025-11-09
**Status**: Initial Setup
**Claude Session**: 011CUxmC9PrpR4DkfxkTWSjm
