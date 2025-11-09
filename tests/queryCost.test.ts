import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../src/schema';
import { resolvers, Context } from '../src/resolvers';
import { JSONPlaceholderAPI } from '../src/datasources/JSONPlaceholderAPI';
import { WeatherAPI } from '../src/datasources/WeatherAPI';
import { CountriesAPI } from '../src/datasources/CountriesAPI';
import { queryCostPlugin } from '../src/plugins/queryCostPlugin';

describe('Query Cost Plugin', () => {
  let testServer: ApolloServer<Context>;

  beforeEach(() => {
    testServer = new ApolloServer<Context>({
      typeDefs,
      resolvers,
      plugins: [
        queryCostPlugin({
          maximumCost: 100, // Lower limit for testing
          defaultCost: 1,
          scalarCost: 1,
          objectCost: 1,
          listMultiplier: 10,
        }),
      ],
    });
  });

  afterEach(async () => {
    await testServer.stop();
  });

  it('should allow queries under the cost limit', async () => {
    const response = await testServer.executeOperation(
      {
        query: `
          query LowCostQuery {
            post(id: "1") {
              id
              title
            }
          }
        `,
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

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      expect(response.body.singleResult.errors).toBeUndefined();
    }
  });

  it('should reject queries over the cost limit', async () => {
    const response = await testServer.executeOperation(
      {
        query: `
          query HighCostQuery {
            posts {
              id
              title
              body
              user {
                name
                email
              }
            }
          }
        `,
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

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      expect(response.body.singleResult.errors).toBeDefined();
      expect(response.body.singleResult.errors?.[0].extensions?.code).toBe(
        'QUERY_COST_EXCEEDED'
      );
    }
  });

  it('should calculate cost correctly for nested queries', async () => {
    const response = await testServer.executeOperation(
      {
        query: `
          query NestedQuery {
            user(id: "1") {
              name
              posts {
                title
              }
            }
          }
        `,
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

    // This query should be allowed even with nested fields
    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      expect(response.body.singleResult.errors).toBeUndefined();
    }
  });
});
