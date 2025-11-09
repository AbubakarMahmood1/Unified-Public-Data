# Deployment Guide

This guide covers deploying the Unified Public Data GraphQL Gateway to various platforms.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git repository set up

## Local Development

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Server will be available at http://localhost:4000/graphql
```

## Building for Production

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

## Cloudflare Workers

Cloudflare Workers provides edge computing with global distribution.

### Setup

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Configure `wrangler.toml` (already included):
```toml
name = "unified-public-data"
main = "dist/worker.js"
compatibility_date = "2024-01-01"
```

### Deploy

```bash
# Build and deploy to Cloudflare Workers
npm run deploy:cloudflare
```

### Features on Cloudflare Workers
- Global edge network distribution
- Automatic scaling
- Low latency worldwide
- ~1MB bundle size limit (we're well within this)

## Vercel

Vercel provides seamless serverless deployment with excellent DX.

### Setup

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

### Deploy

```bash
# Deploy to Vercel
npm run deploy:vercel

# Or use the Vercel CLI directly
vercel --prod
```

Alternatively, connect your GitHub repository to Vercel for automatic deployments on push.

### Features on Vercel
- Automatic GitHub integration
- Preview deployments for PRs
- Edge Functions support
- Built-in monitoring

## Railway / Render / Fly.io

The application can also be deployed to any Node.js hosting platform:

### Environment Variables

Set these environment variables in your hosting platform:

```bash
PORT=4000  # Optional, defaults to 4000
METRICS_LOG_INTERVAL=60000  # Optional, metrics logging interval in ms
NODE_ENV=production
```

### Deploy to Railway

1. Connect your GitHub repository
2. Select the repository
3. Railway will automatically detect Node.js and deploy

### Deploy to Render

1. Create a new Web Service
2. Connect your GitHub repository
3. Use these settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment: Node

### Deploy to Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch

# Deploy
fly deploy
```

## Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
```

Build and run:

```bash
# Build image
docker build -t unified-public-data .

# Run container
docker run -p 4000:4000 unified-public-data
```

## Health Checks

The server exposes a GraphQL endpoint at `/graphql` which can be used for health checks:

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

## Monitoring

### Metrics
The application includes built-in metrics collection:
- Total requests
- Success/failure rates
- Average response time
- Cache hit rates
- Query complexity averages
- Top operations
- Errors by type

Metrics are logged periodically (default: every 60 seconds).

### Logs
Standard output logging is used. Configure your platform's log aggregation:
- Cloudflare: Logpush
- Vercel: Runtime Logs
- Railway/Render: Built-in logging

## Performance Tuning

### Caching
- Response cache TTL: 5 minutes (configurable in `src/index.ts`)
- Persisted queries TTL: 24 hours
- Cache size: 100 entries (can be increased for better hit rates)

### Rate Limiting
- Default: 100 requests per minute per IP
- Configurable in `src/index.ts`

### Query Complexity
- Maximum cost: 1000 points
- List multiplier: 10x
- Maximum depth: 10 levels

## Troubleshooting

### Build Errors
```bash
# Clean and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Type Errors
```bash
# Run type checker
npm run type-check
```

### Tests Failing
```bash
# Run tests with verbose output
npm test -- --verbose
```

## Security Considerations

1. **CORS**: Configure CORS headers for production
2. **Rate Limiting**: Adjust limits based on your traffic
3. **Query Complexity**: Tune limits based on your needs
4. **Environment Variables**: Never commit secrets to Git
5. **HTTPS**: Always use HTTPS in production

## Next Steps

- Set up monitoring alerts
- Configure custom domain
- Add authentication if needed
- Set up CI/CD pipeline
- Configure CDN caching

## Support

For issues or questions:
- Check the README.md
- Review CLAUDE.md for development details
- Open an issue on GitHub
