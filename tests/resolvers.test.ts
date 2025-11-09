import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../src/schema';
import { resolvers, Context } from '../src/resolvers';
import { JSONPlaceholderAPI } from '../src/datasources/JSONPlaceholderAPI';
import { WeatherAPI } from '../src/datasources/WeatherAPI';
import { CountriesAPI } from '../src/datasources/CountriesAPI';

// Mock the datasources
jest.mock('../src/datasources/JSONPlaceholderAPI');
jest.mock('../src/datasources/WeatherAPI');
jest.mock('../src/datasources/CountriesAPI');

describe('GraphQL Resolvers', () => {
  let testServer: ApolloServer<Context>;
  let mockJsonPlaceholder: jest.Mocked<JSONPlaceholderAPI>;
  let mockWeather: jest.Mocked<WeatherAPI>;
  let mockCountries: jest.Mocked<CountriesAPI>;

  beforeEach(() => {
    testServer = new ApolloServer<Context>({
      typeDefs,
      resolvers,
    });

    mockJsonPlaceholder = new JSONPlaceholderAPI() as jest.Mocked<JSONPlaceholderAPI>;
    mockWeather = new WeatherAPI() as jest.Mocked<WeatherAPI>;
    mockCountries = new CountriesAPI() as jest.Mocked<CountriesAPI>;

    // Setup mock responses
    mockJsonPlaceholder.fetchPosts = jest.fn().mockResolvedValue([
      { id: 1, userId: 1, title: 'Test Post', body: 'Test body' },
      { id: 2, userId: 1, title: 'Test Post 2', body: 'Test body 2' },
    ]);

    mockJsonPlaceholder.getPost = jest.fn().mockResolvedValue({
      id: 1,
      userId: 1,
      title: 'Test Post',
      body: 'Test body',
    });

    mockJsonPlaceholder.fetchUsers = jest.fn().mockResolvedValue([
      { id: 1, name: 'John Doe', username: 'johndoe', email: 'john@example.com', phone: '123', website: 'example.com' },
    ]);

    mockJsonPlaceholder.getUser = jest.fn().mockResolvedValue({
      id: 1,
      name: 'John Doe',
      username: 'johndoe',
      email: 'john@example.com',
      phone: '123',
      website: 'example.com',
    });

    mockJsonPlaceholder.fetchComments = jest.fn().mockResolvedValue([
      { id: 1, postId: 1, name: 'Comment 1', email: 'user@example.com', body: 'Comment body' },
    ]);

    mockJsonPlaceholder.getPostsByUserId = jest.fn().mockResolvedValue([
      { id: 1, userId: 1, title: 'Test Post', body: 'Test body' },
    ]);

    mockWeather.getWeather = jest.fn().mockResolvedValue({
      latitude: 52.52,
      longitude: 13.41,
      timezone: 'Europe/Berlin',
      current: {
        temperature: 15.5,
        windSpeed: 10.2,
        windDirection: 180,
        weatherCode: 0,
        time: '2024-01-01T12:00:00',
      },
    });

    mockCountries.fetchAllCountries = jest.fn().mockResolvedValue([
      {
        name: { common: 'United States', official: 'United States of America' },
        cca2: 'US',
        cca3: 'USA',
        capital: ['Washington, D.C.'],
        region: 'Americas',
        population: 331000000,
        flags: { png: 'https://example.com/us.png', svg: 'https://example.com/us.svg' },
        currencies: [{ code: 'USD', name: 'United States dollar', symbol: '$' }],
        languages: ['English'],
      },
    ]);

    mockCountries.getCountryByCode = jest.fn().mockResolvedValue({
      name: { common: 'United States', official: 'United States of America' },
      cca2: 'US',
      cca3: 'USA',
      capital: ['Washington, D.C.'],
      region: 'Americas',
      population: 331000000,
      flags: { png: 'https://example.com/us.png', svg: 'https://example.com/us.svg' },
      currencies: [{ code: 'USD', name: 'United States dollar', symbol: '$' }],
      languages: ['English'],
    });
  });

  afterEach(async () => {
    await testServer.stop();
  });

  describe('JSONPlaceholder Queries', () => {
    it('should fetch posts', async () => {
      const response = await testServer.executeOperation(
        {
          query: `
            query GetPosts {
              posts(limit: 5) {
                id
                title
                userId
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
        expect(response.body.singleResult.data?.posts).toBeDefined();
        expect(Array.isArray(response.body.singleResult.data?.posts)).toBe(true);
      }
    });

    it('should fetch a single post by id', async () => {
      const response = await testServer.executeOperation(
        {
          query: `
            query GetPost($id: ID!) {
              post(id: $id) {
                id
                title
                body
              }
            }
          `,
          variables: { id: '1' },
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
        expect(response.body.singleResult.data?.post).toBeDefined();
      }
    });

    it('should fetch users', async () => {
      const response = await testServer.executeOperation(
        {
          query: `
            query GetUsers {
              users(limit: 3) {
                id
                name
                email
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
        expect(response.body.singleResult.data?.users).toBeDefined();
      }
    });
  });

  describe('Weather Queries', () => {
    it('should fetch weather data', async () => {
      const response = await testServer.executeOperation(
        {
          query: `
            query GetWeather($lat: Float!, $lon: Float!) {
              weather(latitude: $lat, longitude: $lon) {
                latitude
                longitude
                current {
                  temperature
                  windSpeed
                }
              }
            }
          `,
          variables: { lat: 52.52, lon: 13.41 },
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
        expect(response.body.singleResult.data?.weather).toBeDefined();
      }
    });
  });

  describe('Country Queries', () => {
    it('should fetch countries', async () => {
      const response = await testServer.executeOperation(
        {
          query: `
            query GetCountries {
              countries(limit: 5) {
                name {
                  common
                }
                capital
                population
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
        expect(response.body.singleResult.data?.countries).toBeDefined();
      }
    });

    it('should fetch a single country by code', async () => {
      const response = await testServer.executeOperation(
        {
          query: `
            query GetCountry($code: String!) {
              country(code: $code) {
                name {
                  common
                  official
                }
                capital
              }
            }
          `,
          variables: { code: 'US' },
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
        expect(response.body.singleResult.data?.country).toBeDefined();
      }
    });
  });

  describe('Nested Queries', () => {
    it('should resolve nested user from post', async () => {
      const response = await testServer.executeOperation(
        {
          query: `
            query GetPostWithUser {
              post(id: "1") {
                title
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
        expect(response.body.singleResult.errors).toBeUndefined();
        const data = response.body.singleResult.data as { post: { user: unknown } };
        expect(data.post.user).toBeDefined();
      }
    });
  });
});
