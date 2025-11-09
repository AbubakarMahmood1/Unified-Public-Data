# Example GraphQL Queries

This file contains example queries you can run in the GraphQL Playground.

## JSONPlaceholder Queries

### Get all posts (with user information)
```graphql
query GetPosts {
  posts(limit: 5) {
    id
    title
    body
    user {
      name
      email
    }
  }
}
```

### Get a specific post with comments
```graphql
query GetPostWithComments {
  post(id: "1") {
    id
    title
    body
    user {
      name
      username
    }
  }
  comments(postId: 1) {
    id
    name
    email
    body
  }
}
```

### Get user with their posts
```graphql
query GetUserWithPosts {
  user(id: "1") {
    id
    name
    email
    posts {
      id
      title
    }
  }
}
```

## Weather Queries

### Get current weather for a location
```graphql
query GetWeather {
  weather(latitude: 52.52, longitude: 13.41) {
    latitude
    longitude
    timezone
    current {
      temperature
      windSpeed
      windDirection
      weatherCode
      time
    }
  }
}
```

### Multiple locations (New York and London)
```graphql
query GetMultipleWeather {
  newYork: weather(latitude: 40.7128, longitude: -74.0060) {
    timezone
    current {
      temperature
      windSpeed
    }
  }
  london: weather(latitude: 51.5074, longitude: -0.1278) {
    timezone
    current {
      temperature
      windSpeed
    }
  }
}
```

## Country Queries

### Get all countries (limited)
```graphql
query GetCountries {
  countries(limit: 5) {
    name {
      common
      official
    }
    capital
    population
    region
    flags {
      png
    }
  }
}
```

### Get specific country by code
```graphql
query GetCountry {
  country(code: "US") {
    name {
      common
      official
    }
    capital
    population
    area
    region
    currencies {
      code
      name
      symbol
    }
    languages
  }
}
```

### Get countries by region
```graphql
query GetCountriesByRegion {
  countriesByRegion(region: "Europe") {
    name {
      common
    }
    capital
    population
  }
}
```

## Combined Queries

### Get data from all three APIs
```graphql
query GetAllData {
  posts(limit: 2) {
    id
    title
    user {
      name
    }
  }

  weather(latitude: 40.7128, longitude: -74.0060) {
    current {
      temperature
    }
  }

  countries(limit: 3) {
    name {
      common
    }
    capital
  }
}
```

## Query Cost Examples

### Low cost query
```graphql
query LowCost {
  post(id: "1") {
    title
  }
}
```
**Estimated cost: ~2**

### Medium cost query
```graphql
query MediumCost {
  posts(limit: 10) {
    title
    body
  }
}
```
**Estimated cost: ~30 (10 posts × 3 fields)**

### High cost query (might exceed limit)
```graphql
query HighCost {
  posts(limit: 100) {
    id
    title
    body
    user {
      id
      name
      email
      posts {
        id
        title
      }
    }
  }
}
```
**Estimated cost: 1000+ (will likely be rejected)**

## Caching Examples

Run the same query twice to see caching in action:

```graphql
query CachedQuery {
  countries(limit: 5) {
    name {
      common
    }
    capital
  }
}
```

First run: Cache miss (fetch from API)
Second run (within 5 minutes): Cache hit (instant response)
Check the `age` header in the response!
