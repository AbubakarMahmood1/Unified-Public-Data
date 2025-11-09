import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../src/schema';
import { resolvers, Context } from '../src/resolvers';
import { JSONPlaceholderAPI } from '../src/datasources/JSONPlaceholderAPI';
import { WeatherAPI } from '../src/datasources/WeatherAPI';
import { CountriesAPI } from '../src/datasources/CountriesAPI';

describe('GraphQL Resolvers', () => {
  let testServer: ApolloServer<Context>;

  beforeAll(() => {
    testServer = new ApolloServer<Context>({
      typeDefs,
      resolvers,
    });
  });

  afterAll(async () => {
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
        expect(response.body.singleResult.data?.post?.user).toBeDefined();
      }
    });
  });
});
