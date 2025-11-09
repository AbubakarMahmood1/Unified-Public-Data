import { JSONPlaceholderAPI } from '../datasources/JSONPlaceholderAPI';
import { WeatherAPI } from '../datasources/WeatherAPI';
import { CountriesAPI } from '../datasources/CountriesAPI';

export interface Context {
  dataSources: {
    jsonPlaceholder: JSONPlaceholderAPI;
    weather: WeatherAPI;
    countries: CountriesAPI;
  };
}

export const resolvers = {
  Query: {
    // JSONPlaceholder Queries
    posts: async (
      _parent: unknown,
      args: { limit?: number },
      context: Context
    ) => {
      return context.dataSources.jsonPlaceholder.fetchPosts(args.limit);
    },

    post: async (
      _parent: unknown,
      args: { id: string },
      context: Context
    ) => {
      return context.dataSources.jsonPlaceholder.getPost(parseInt(args.id, 10));
    },

    users: async (
      _parent: unknown,
      args: { limit?: number },
      context: Context
    ) => {
      return context.dataSources.jsonPlaceholder.fetchUsers(args.limit);
    },

    user: async (
      _parent: unknown,
      args: { id: string },
      context: Context
    ) => {
      return context.dataSources.jsonPlaceholder.getUser(parseInt(args.id, 10));
    },

    comments: async (
      _parent: unknown,
      args: { postId?: number },
      context: Context
    ) => {
      return context.dataSources.jsonPlaceholder.fetchComments(args.postId);
    },

    comment: async (
      _parent: unknown,
      args: { id: string },
      context: Context
    ) => {
      return context.dataSources.jsonPlaceholder.getComment(parseInt(args.id, 10));
    },

    // Weather Queries
    weather: async (
      _parent: unknown,
      args: { latitude: number; longitude: number },
      context: Context
    ) => {
      return context.dataSources.weather.getWeather(args.latitude, args.longitude);
    },

    // Country Queries
    countries: async (
      _parent: unknown,
      args: { limit?: number },
      context: Context
    ) => {
      return context.dataSources.countries.fetchAllCountries(args.limit);
    },

    country: async (
      _parent: unknown,
      args: { code: string },
      context: Context
    ) => {
      return context.dataSources.countries.getCountryByCode(args.code);
    },

    countriesByRegion: async (
      _parent: unknown,
      args: { region: string },
      context: Context
    ) => {
      return context.dataSources.countries.getCountriesByRegion(args.region);
    },
  },

  // Field resolvers for nested data
  Post: {
    user: async (
      parent: { userId: number },
      _args: unknown,
      context: Context
    ) => {
      return context.dataSources.jsonPlaceholder.getUser(parent.userId);
    },
  },

  User: {
    posts: async (
      parent: { id: number },
      _args: unknown,
      context: Context
    ) => {
      return context.dataSources.jsonPlaceholder.getPostsByUserId(parent.id);
    },
  },

  Comment: {
    post: async (
      parent: { postId: number },
      _args: unknown,
      context: Context
    ) => {
      return context.dataSources.jsonPlaceholder.getPost(parent.postId);
    },
  },
};
