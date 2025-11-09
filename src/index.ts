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

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

async function startServer() {
  const server = new ApolloServer<Context>({
    typeDefs,
    resolvers,
    plugins: [
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
  console.log(`📊 Features enabled:`);
  console.log(`   - Query complexity analysis (max cost: 1000)`);
  console.log(`   - Response caching (TTL: 5 minutes)`);
  console.log(`   - Query depth limiting (max depth: 10)`);
  console.log(`   - DataLoader batching for efficient API calls`);
  console.log(`\n📡 Integrated APIs:`);
  console.log(`   - JSONPlaceholder (posts, users, comments)`);
  console.log(`   - Open Meteo (weather data)`);
  console.log(`   - REST Countries (country information)`);
  console.log(`\n🎮 Try the GraphQL Playground at ${url}`);
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
