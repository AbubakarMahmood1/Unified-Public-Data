import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../src/schema';
import { resolvers, Context } from '../src/resolvers';
import { JSONPlaceholderAPI } from '../src/datasources/JSONPlaceholderAPI';
import { WeatherAPI } from '../src/datasources/WeatherAPI';
import { CountriesAPI } from '../src/datasources/CountriesAPI';
import { queryCostPlugin } from '../src/plugins/queryCostPlugin';

// Mock the datasources
jest.mock('../src/datasources/JSONPlaceholderAPI');
jest.mock('../src/datasources/WeatherAPI');
jest.mock('../src/datasources/CountriesAPI');

describe('Query Cost Plugin', () => {
  let testServer: ApolloServer<Context>;
  let mockJsonPlaceholder: jest.Mocked<JSONPlaceholderAPI>;
  let mockWeather: jest.Mocked<WeatherAPI>;
  let mockCountries: jest.Mocked<CountriesAPI>;

  beforeEach(() => {
    mockJsonPlaceholder = new JSONPlaceholderAPI() as jest.Mocked<JSONPlaceholderAPI>;
    mockWeather = new WeatherAPI() as jest.Mocked<WeatherAPI>;
    mockCountries = new CountriesAPI() as jest.Mocked<CountriesAPI>;

    // Setup mock responses
    mockJsonPlaceholder.getPost = jest.fn().mockResolvedValue({
      id: 1,
      userId: 1,
      title: 'Test Post',
      body: 'Test body',
    });

    mockJsonPlaceholder.fetchPosts = jest.fn().mockResolvedValue([
      { id: 1, userId: 1, title: 'Test Post', body: 'Test body' },
    ]);

    mockJsonPlaceholder.getUser = jest.fn().mockResolvedValue({
      id: 1,
      name: 'John Doe',
      username: 'johndoe',
      email: 'john@example.com',
      phone: '123',
      website: 'example.com',
    });

    mockJsonPlaceholder.getPostsByUserId = jest.fn().mockResolvedValue([
      { id: 1, userId: 1, title: 'Test Post', body: 'Test body' },
    ]);

    testServer = new ApolloServer<Context>({
      typeDefs,
      resolvers,
      plugins: [
        queryCostPlugin({
          maximumCost: 5, // Very low limit for testing
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
            jsonPlaceholder: mockJsonPlaceholder,
            weather: mockWeather,
            countries: mockCountries,
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
            jsonPlaceholder: mockJsonPlaceholder,
            weather: mockWeather,
            countries: mockCountries,
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
            jsonPlaceholder: mockJsonPlaceholder,
            weather: mockWeather,
            countries: mockCountries,
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
