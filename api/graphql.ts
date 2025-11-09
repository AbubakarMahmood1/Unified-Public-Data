import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import depthLimit from 'graphql-depth-limit';
import { typeDefs } from '../src/schema';
import { resolvers, Context } from '../src/resolvers';
import { JSONPlaceholderAPI } from '../src/datasources/JSONPlaceholderAPI';
import { WeatherAPI } from '../src/datasources/WeatherAPI';
import { CountriesAPI } from '../src/datasources/CountriesAPI';
import { queryCostPlugin } from '../src/plugins/queryCostPlugin';
import { responseCachePlugin } from '../src/plugins/responseCachePlugin';
import { rateLimitPlugin } from '../src/plugins/rateLimitPlugin';
import { metricsPlugin, MetricsCollector } from '../src/plugins/metricsPlugin';

// Initialize metrics collector (no periodic logging in serverless)
const metricsCollector = new MetricsCollector({
  logInterval: 0,
});

const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
  plugins: [
    metricsPlugin(metricsCollector),
    rateLimitPlugin({
      max: 100,
      windowMs: 60000,
    }),
    queryCostPlugin({
      maximumCost: 1000,
      defaultCost: 1,
      scalarCost: 1,
      listMultiplier: 10,
    }),
    responseCachePlugin({
      ttl: 300,
      maxSize: 100,
    }),
  ],
  validationRules: [depthLimit(10)],
  introspection: true,
});

const handler = startServerAndCreateNextHandler(server, {
  context: async () => {
    return {
      dataSources: {
        jsonPlaceholder: new JSONPlaceholderAPI(),
        weather: new WeatherAPI(),
        countries: new CountriesAPI(),
      },
    };
  },
});

export default handler;
