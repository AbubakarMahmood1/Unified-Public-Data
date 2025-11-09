import {
  ApolloServerPlugin,
  GraphQLRequestListener,
  BaseContext,
  HeaderMap,
} from '@apollo/server';

interface CacheEntry {
  data: Record<string, unknown> | null;
  timestamp: number;
}

interface ResponseCachePluginOptions {
  ttl?: number; // Time to live in seconds
  maxSize?: number; // Maximum cache size
}

export const responseCachePlugin = <TContext extends BaseContext>(
  options: ResponseCachePluginOptions = {}
): ApolloServerPlugin<TContext> => {
  const { ttl = 300, maxSize = 100 } = options; // Default 5 minutes TTL, 100 entries max
  const cache = new Map<string, CacheEntry>();

  // Simple LRU-like cleanup
  const cleanupCache = () => {
    if (cache.size > maxSize) {
      const entriesToDelete = cache.size - maxSize;
      const keys = Array.from(cache.keys());
      for (let i = 0; i < entriesToDelete; i++) {
        cache.delete(keys[i]);
      }
    }
  };

  // Remove expired entries
  const removeExpired = () => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > ttl * 1000) {
        cache.delete(key);
      }
    }
  };

  return {
    async requestDidStart(): Promise<GraphQLRequestListener<TContext>> {
      let cacheKey: string | null = null;

      return {
        async responseForOperation(requestContext) {
          // Only cache GET requests (queries, not mutations)
          if (requestContext.request.http?.method !== 'GET') {
            return null;
          }

          // Create cache key from query and variables
          cacheKey = JSON.stringify({
            query: requestContext.request.query,
            variables: requestContext.request.variables,
            operationName: requestContext.request.operationName,
          });

          removeExpired();

          // Check if we have a cached response
          const cached = cache.get(cacheKey);
          if (cached) {
            const age = Math.floor((Date.now() - cached.timestamp) / 1000);
            console.log(`Cache hit! Age: ${age}s`);

            const headers = new HeaderMap();
            headers.set('cache-control', `max-age=${ttl}`);
            headers.set('age', age.toString());

            return {
              http: {
                headers,
              },
              body: {
                kind: 'single' as const,
                singleResult: {
                  data: cached.data,
                },
              },
            };
          }

          return null;
        },

        async willSendResponse(requestContext) {
          const { response } = requestContext;

          // Only cache successful GET requests
          if (
            requestContext.request.http?.method === 'GET' &&
            response.body &&
            response.body.kind === 'single' &&
            !response.body.singleResult.errors &&
            cacheKey
          ) {
            cache.set(cacheKey, {
              data: response.body.singleResult.data ?? null,
              timestamp: Date.now(),
            });

            cleanupCache();

            // Add cache headers
            response.http.headers.set('cache-control', `max-age=${ttl}`);
          }
        },
      };
    },
  };
};
