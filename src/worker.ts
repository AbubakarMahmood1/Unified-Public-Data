import { ApolloServer } from '@apollo/server';
import depthLimit from 'graphql-depth-limit';
import { typeDefs } from './schema';
import { resolvers, Context } from './resolvers';
import { JSONPlaceholderAPI } from './datasources/JSONPlaceholderAPI';
import { WeatherAPI } from './datasources/WeatherAPI';
import { CountriesAPI } from './datasources/CountriesAPI';
import { queryCostPlugin } from './plugins/queryCostPlugin';
import { responseCachePlugin } from './plugins/responseCachePlugin';
import { rateLimitPlugin } from './plugins/rateLimitPlugin';
import { metricsPlugin, MetricsCollector } from './plugins/metricsPlugin';

// Initialize metrics collector
const metricsCollector = new MetricsCollector({
  logInterval: 0, // Disable periodic logging in worker environment
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

export interface Env {
  // Add any environment variables or bindings here
}

export default {
  async fetch(request: Request, _env: Env, _ctx: unknown): Promise<Response> {
    // Only accept POST requests and GET requests (for playground)
    if (request.method !== 'POST' && request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Parse GraphQL request
    const url = new URL(request.url);

    // Serve GraphQL Playground for GET requests to root
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>GraphQL Playground</title>
          <link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" />
        </head>
        <body style="margin: 0;">
          <div id="graphiql" style="height: 100vh;"></div>
          <script
            crossorigin
            src="https://unpkg.com/react/umd/react.production.min.js"
          ></script>
          <script
            crossorigin
            src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"
          ></script>
          <script
            crossorigin
            src="https://unpkg.com/graphiql/graphiql.min.js"
          ></script>
          <script>
            const fetcher = GraphiQL.createFetcher({
              url: window.location.origin,
            });
            ReactDOM.render(
              React.createElement(GraphiQL, { fetcher }),
              document.getElementById('graphiql'),
            );
          </script>
        </body>
        </html>
        `,
        {
          headers: {
            'content-type': 'text/html',
          },
        }
      );
    }

    try {
      const body = request.method === 'POST' ? await request.json() : null;

      const response = await server.executeOperation(
        {
          query: (body as { query?: string })?.query || '',
          variables: (body as { variables?: Record<string, unknown> })?.variables,
          operationName: (body as { operationName?: string })?.operationName,
        },
        {
          contextValue: {
            dataSources: {
              jsonPlaceholder: new JSONPlaceholderAPI(),
              weather: new WeatherAPI(),
              countries: new CountriesAPI(),
            },
          },
        }
      );

      if (response.body.kind === 'single') {
        return new Response(JSON.stringify(response.body.singleResult), {
          headers: {
            'content-type': 'application/json',
          },
        });
      }

      return new Response('Invalid response', { status: 500 });
    } catch (error) {
      console.error('Error processing GraphQL request:', error);
      return new Response('Internal server error', { status: 500 });
    }
  },
};
