import {
  ApolloServerPlugin,
  GraphQLRequestListener,
  BaseContext,
} from '@apollo/server';
import { GraphQLError } from 'graphql';

interface RateLimitPluginOptions {
  max?: number; // Maximum requests per window
  windowMs?: number; // Time window in milliseconds
  skipSuccessfulRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export const rateLimitPlugin = <TContext extends BaseContext>(
  options: RateLimitPluginOptions = {}
): ApolloServerPlugin<TContext> => {
  const { max = 100, windowMs = 60000, skipSuccessfulRequests = false } = options;
  const store = new Map<string, RateLimitEntry>();

  const getClientIp = (request: { http?: { headers: Map<string, string> } }): string => {
    if (!request.http?.headers) {
      return 'unknown';
    }

    // Check common headers for real IP
    const headers = request.http.headers;
    const xForwardedFor = headers.get('x-forwarded-for');
    const xRealIp = headers.get('x-real-ip');
    const cfConnectingIp = headers.get('cf-connecting-ip');

    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    if (xRealIp) {
      return xRealIp;
    }

    if (xForwardedFor) {
      // x-forwarded-for can be a comma-separated list, take the first one
      return xForwardedFor.split(',')[0].trim();
    }

    return 'unknown';
  };

  const cleanupExpired = () => {
    const now = Date.now();
    for (const [ip, entry] of store.entries()) {
      if (now > entry.resetTime) {
        store.delete(ip);
      }
    }
  };

  return {
    async requestDidStart(): Promise<GraphQLRequestListener<TContext>> {
      let clientIp: string | null = null;

      return {
        async didResolveOperation(requestContext) {
          clientIp = getClientIp(requestContext.request);

          const now = Date.now();
          let entry = store.get(clientIp);

          if (!entry || now > entry.resetTime) {
            entry = {
              count: 0,
              resetTime: now + windowMs,
            };
            store.set(clientIp, entry);
          }

          // Check if limit exceeded
          if (entry.count >= max) {
            const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
            throw new GraphQLError(
              `Too many requests, please try again in ${retryAfter} seconds`,
              {
                extensions: {
                  code: 'RATE_LIMIT_EXCEEDED',
                  retryAfter,
                  limit: max,
                  windowMs,
                },
              }
            );
          }

          // Increment counter
          entry.count++;

          // Periodic cleanup
          if (Math.random() < 0.01) {
            cleanupExpired();
          }
        },

        async willSendResponse(requestContext) {
          if (
            skipSuccessfulRequests &&
            clientIp &&
            requestContext.response.body &&
            requestContext.response.body.kind === 'single' &&
            !requestContext.response.body.singleResult.errors
          ) {
            const entry = store.get(clientIp);
            if (entry) {
              entry.count--;
            }
          }
        },
      };
    },
  };
};

// Export for testing
export const createRateLimitStore = () => {
  return new Map<string, RateLimitEntry>();
};
