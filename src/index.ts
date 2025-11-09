import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import depthLimit from 'graphql-depth-limit';
import { typeDefs } from './schema';
import { resolvers, Context } from './resolvers';
import { JSONPlaceholderAPI } from './datasources/JSONPlaceholderAPI';
import { WeatherAPI } from './datasources/WeatherAPI';
import { CountriesAPI } from './datasources/CountriesAPI';
import { queryCostPlugin } from './plugins/queryCostPlugin';
import { responseCachePlugin } from './plugins/responseCachePlugin';
import { persistedQueriesPlugin } from './plugins/persistedQueriesPlugin';
import { rateLimitPlugin } from './plugins/rateLimitPlugin';
import { metricsPlugin, MetricsCollector } from './plugins/metricsPlugin';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const METRICS_LOG_INTERVAL = process.env.METRICS_LOG_INTERVAL
  ? parseInt(process.env.METRICS_LOG_INTERVAL, 10)
  : 60000; // 1 minute default

async function startServer() {
  // Initialize metrics collector
  const metricsCollector = new MetricsCollector({
    logInterval: METRICS_LOG_INTERVAL,
  });

  const server = new ApolloServer<Context>({
    typeDefs,
    resolvers,
    plugins: [
      // Metrics plugin - collect performance data
      metricsPlugin(metricsCollector),
      // Rate limiting plugin - prevent abuse
      rateLimitPlugin({
        max: 100, // 100 requests
        windowMs: 60000, // per minute
        skipSuccessfulRequests: false,
      }),
      // Query cost analysis plugin - reject queries exceeding cost limit
      queryCostPlugin({
        maximumCost: 1000,
        defaultCost: 1,
        scalarCost: 1,
        objectCost: 1,
        listMultiplier: 10,
      }),
      // Response caching plugin - cache query results
      responseCachePlugin({
        ttl: 300, // 5 minutes
        maxSize: 100,
      }),
      // Persisted queries plugin - support APQ
      persistedQueriesPlugin({
        ttl: 86400, // 24 hours
      }),
    ],
    validationRules: [depthLimit(10)], // Limit query depth to prevent abuse
    introspection: true, // Enable for playground
  });

  const { url } = await startStandaloneServer(server, {
    context: async () => {
      // Create new datasource instances for each request
      // This ensures DataLoader batching works correctly per-request
      return {
        dataSources: {
          jsonPlaceholder: new JSONPlaceholderAPI(),
          weather: new WeatherAPI(),
          countries: new CountriesAPI(),
        },
      };
    },
    listen: { port: PORT },
  });

  console.log(`🚀 Unified Public Data GraphQL Gateway ready at ${url}`);
  console.log(`\n📊 Features enabled:`);
  console.log(`   - Metrics & monitoring (logging every ${METRICS_LOG_INTERVAL / 1000}s)`);
  console.log(`   - Rate limiting (100 requests/minute per IP)`);
  console.log(`   - Query complexity analysis (max cost: 1000)`);
  console.log(`   - Response caching (TTL: 5 minutes, GET requests only)`);
  console.log(`   - Persisted queries (APQ support, TTL: 24 hours)`);
  console.log(`   - Query depth limiting (max depth: 10)`);
  console.log(`   - DataLoader batching for efficient API calls`);
  console.log(`\n📡 Integrated APIs:`);
  console.log(`   - JSONPlaceholder (posts, users, comments)`);
  console.log(`   - Open Meteo (weather data)`);
  console.log(`   - REST Countries (country information)`);
  console.log(`\n🎮 GraphQL Playground: ${url}`);
  console.log(`📊 Metrics: Logged to console every ${METRICS_LOG_INTERVAL / 1000}s\n`);
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
