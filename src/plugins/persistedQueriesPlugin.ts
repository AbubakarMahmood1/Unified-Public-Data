import {
  ApolloServerPlugin,
  GraphQLRequestListener,
  BaseContext,
} from '@apollo/server';
import crypto from 'crypto';

interface PersistedQueriesPluginOptions {
  ttl?: number; // Time to live in seconds
}

interface QueryEntry {
  query: string;
  timestamp: number;
}

export const persistedQueriesPlugin = <TContext extends BaseContext>(
  options: PersistedQueriesPluginOptions = {}
): ApolloServerPlugin<TContext> => {
  const { ttl = 86400 } = options; // Default 24 hours
  const queryStore = new Map<string, QueryEntry>();

  const removeExpired = () => {
    const now = Date.now();
    for (const [hash, entry] of queryStore.entries()) {
      if (now - entry.timestamp > ttl * 1000) {
        queryStore.delete(hash);
      }
    }
  };

  const hashQuery = (query: string): string => {
    return crypto.createHash('sha256').update(query).digest('hex');
  };

  return {
    async requestDidStart(): Promise<GraphQLRequestListener<TContext>> {
      return {
        async didResolveSource(requestContext) {
          if (!requestContext.source) {
            return;
          }

          const query = requestContext.source;
          const queryHash = hashQuery(query);

          // Store the query for future use
          queryStore.set(queryHash, {
            query,
            timestamp: Date.now(),
          });

          // Periodic cleanup
          if (Math.random() < 0.01) {
            // 1% chance to cleanup
            removeExpired();
          }
        },

        async responseForOperation(requestContext) {
          // Support APQ (Automatic Persisted Queries) protocol
          const extensions = requestContext.request.extensions;

          if (extensions?.persistedQuery) {
            const { sha256Hash, version } = extensions.persistedQuery as {
              sha256Hash?: string;
              version?: number;
            };

            if (version !== 1) {
              return null;
            }

            if (!sha256Hash) {
              return null;
            }

            const stored = queryStore.get(sha256Hash);

            if (stored && !requestContext.request.query) {
              // Query not provided but we have it stored
              console.log(`Persisted query hit: ${sha256Hash}`);
              // Note: We can't modify the request here, this is just for logging
              // The actual APQ implementation would be handled by Apollo Server
            }
          }

          return null;
        },
      };
    },
  };
};

// Manual persisted query store (alternative to APQ)
export class PersistedQueryStore {
  private store = new Map<string, string>();

  register(id: string, query: string): void {
    this.store.set(id, query);
  }

  get(id: string): string | undefined {
    return this.store.get(id);
  }

  has(id: string): boolean {
    return this.store.has(id);
  }

  getSize(): number {
    return this.store.size;
  }
}
