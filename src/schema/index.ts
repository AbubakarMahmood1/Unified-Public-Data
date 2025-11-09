import gql from 'graphql-tag';

export const typeDefs = gql`
  # JSONPlaceholder Types
  type Post {
    id: ID!
    userId: Int!
    title: String!
    body: String!
    user: User
  }

  type User {
    id: ID!
    name: String!
    username: String!
    email: String!
    phone: String
    website: String
    posts: [Post!]!
  }

  type Comment {
    id: ID!
    postId: Int!
    name: String!
    email: String!
    body: String!
    post: Post
  }

  # Weather API Types
  type Weather {
    latitude: Float!
    longitude: Float!
    timezone: String!
    current: CurrentWeather!
  }

  type CurrentWeather {
    temperature: Float!
    windSpeed: Float!
    windDirection: Float!
    weatherCode: Int!
    time: String!
  }

  # REST Countries Types
  type Country {
    name: CountryName!
    cca2: String!
    cca3: String!
    capital: [String!]
    region: String!
    subregion: String
    population: Int!
    area: Float
    flags: CountryFlags!
    currencies: [Currency!]
    languages: [String!]
  }

  type CountryName {
    common: String!
    official: String!
  }

  type CountryFlags {
    png: String!
    svg: String!
    alt: String
  }

  type Currency {
    code: String!
    name: String!
    symbol: String
  }

  # Query Root
  type Query {
    # JSONPlaceholder Queries
    posts(limit: Int = 10): [Post!]!
    post(id: ID!): Post
    users(limit: Int = 10): [User!]!
    user(id: ID!): User
    comments(postId: Int): [Comment!]!
    comment(id: ID!): Comment

    # Weather Queries
    weather(latitude: Float!, longitude: Float!): Weather

    # Country Queries
    countries(limit: Int = 10): [Country!]!
    country(code: String!): Country
    countriesByRegion(region: String!): [Country!]!
  }

  # Subscription Root
  type Subscription {
    # Weather Updates
    weatherUpdates(latitude: Float!, longitude: Float!, intervalSeconds: Int = 60): Weather!
  }
`;
