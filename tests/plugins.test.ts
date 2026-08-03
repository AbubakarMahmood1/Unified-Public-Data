import crypto from 'crypto';
import { ApolloServerPlugin, BaseContext, HeaderMap } from '@apollo/server';
import { MetricsCollector, metricsPlugin } from '../src/plugins/metricsPlugin';
import { persistedQueriesPlugin, PersistedQueryStore } from '../src/plugins/persistedQueriesPlugin';
import { createRateLimitStore, rateLimitPlugin } from '../src/plugins/rateLimitPlugin';
import { responseCachePlugin } from '../src/plugins/responseCachePlugin';

async function startPlugin(plugin: ApolloServerPlugin<BaseContext>) {
  const listener = await plugin.requestDidStart?.({} as never);
  if (!listener) {
    throw new Error('Expected plugin request listener');
  }
  return listener;
}

function singleResponse(data: Record<string, unknown>, errors?: Array<{ message: string }>) {
  return {
    http: { headers: new HeaderMap() },
    body: {
      kind: 'single',
      singleResult: {
        data,
        errors,
      },
    },
  };
}

describe('MetricsCollector', () => {
  it('records requests, cache activity, complexity, formatting, and reset state', () => {
    const onMetricsUpdate = jest.fn();
    const collector = new MetricsCollector({ onMetricsUpdate });

    collector.recordCacheHit(true);
    collector.recordCacheHit(false);
    collector.recordQueryComplexity(8);
    collector.recordQueryComplexity(4);
    collector.recordRequest('GetData', 20, true);
    collector.recordRequest('GetData', 40, false, [
      { extensions: { code: 'UPSTREAM_HTTP_ERROR' } },
      {},
    ]);

    const metrics = collector.getMetrics();
    expect(metrics).toMatchObject({
      totalRequests: 2,
      successfulRequests: 1,
      failedRequests: 1,
      averageDuration: 30,
      cacheHits: 1,
      cacheMisses: 1,
      queryComplexityAverage: 6,
    });
    expect(metrics.topOperations.get('GetData')).toMatchObject({ count: 2, avgDuration: 30 });
    expect(metrics.errorsByType.get('UPSTREAM_HTTP_ERROR')).toBe(1);
    expect(metrics.errorsByType.get('UNKNOWN')).toBe(1);
    expect(collector.getFormattedMetrics()).toContain('GetData: 2 requests');
    expect(onMetricsUpdate).toHaveBeenCalledTimes(2);

    collector.reset();
    expect(collector.getMetrics().totalRequests).toBe(0);
    collector.stopLogging();
  });

  it('logs on the configured interval and can stop the timer', () => {
    jest.useFakeTimers();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const collector = new MetricsCollector({ logInterval: 1000 });

    jest.advanceTimersByTime(1000);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('GraphQL Gateway Metrics'));

    collector.stopLogging();
    logSpy.mockRestore();
    jest.useRealTimers();
  });

  it('records operation names and response errors through the Apollo hook', async () => {
    const collector = new MetricsCollector();
    const listener = await startPlugin(metricsPlugin<BaseContext>(collector));

    await listener.didResolveOperation?.({ operationName: 'HookedQuery' } as never);
    await listener.willSendResponse?.({
      response: singleResponse({}, [{ message: 'failure' }]),
    } as never);

    expect(collector.getMetrics()).toMatchObject({
      totalRequests: 1,
      failedRequests: 1,
    });
    expect(collector.getMetrics().topOperations.has('HookedQuery')).toBe(true);
  });
});

describe('persisted query plugin', () => {
  it('supports the manual store API', () => {
    const store = new PersistedQueryStore();
    store.register('known', 'query { __typename }');

    expect(store.has('known')).toBe(true);
    expect(store.get('known')).toBe('query { __typename }');
    expect(store.getSize()).toBe(1);
  });

  it('registers source hashes and recognizes an APQ lookup without exposing query text', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const listener = await startPlugin(persistedQueriesPlugin<BaseContext>());
    const query = 'query Saved { __typename }';
    const sha256Hash = crypto.createHash('sha256').update(query).digest('hex');

    await listener.didResolveSource?.({ source: undefined } as never);
    await listener.didResolveSource?.({ source: query } as never);
    await expect(
      listener.responseForOperation?.({
        request: {
          query: undefined,
          extensions: { persistedQuery: { version: 1, sha256Hash } },
        },
      } as never)
    ).resolves.toBeNull();

    expect(logSpy).toHaveBeenCalledWith(`Persisted query hit: ${sha256Hash}`);
    logSpy.mockRestore();
  });

  it('ignores unsupported and incomplete APQ metadata', async () => {
    const listener = await startPlugin(persistedQueriesPlugin<BaseContext>());

    await expect(
      listener.responseForOperation?.({
        request: { extensions: { persistedQuery: { version: 2, sha256Hash: 'x' } } },
      } as never)
    ).resolves.toBeNull();
    await expect(
      listener.responseForOperation?.({
        request: { extensions: { persistedQuery: { version: 1 } } },
      } as never)
    ).resolves.toBeNull();
  });
});

describe('rate limit plugin', () => {
  it('limits by client IP and refunds successful requests when configured', async () => {
    const listener = await startPlugin(
      rateLimitPlugin<BaseContext>({ max: 1, windowMs: 60_000, skipSuccessfulRequests: true })
    );
    const request = {
      http: { headers: new Map([['x-forwarded-for', '203.0.113.10, 10.0.0.1']]) },
    };

    await listener.didResolveOperation?.({ request } as never);
    await expect(listener.didResolveOperation?.({ request } as never)).rejects.toMatchObject({
      extensions: { code: 'RATE_LIMIT_EXCEEDED', limit: 1 },
    });

    await listener.willSendResponse?.({
      request,
      response: singleResponse({ ok: true }),
    } as never);
    await expect(listener.didResolveOperation?.({ request } as never)).resolves.toBeUndefined();
  });

  it.each([
    ['cloudflare', new Map([['cf-connecting-ip', '198.51.100.1']])],
    ['real ip', new Map([['x-real-ip', '198.51.100.2']])],
    ['unknown', new Map<string, string>()],
  ])('accepts the %s client identity path', async (_label, headers) => {
    const listener = await startPlugin(rateLimitPlugin<BaseContext>({ max: 2 }));
    await expect(
      listener.didResolveOperation?.({ request: { http: { headers } } } as never)
    ).resolves.toBeUndefined();
  });

  it('exports an empty rate-limit store for isolated consumers', () => {
    expect(createRateLimitStore().size).toBe(0);
  });
});

describe('response cache plugin', () => {
  function operationContext(method: string, query: string, data = { value: query }) {
    return {
      request: {
        query,
        variables: {},
        operationName: 'CachedQuery',
        http: { method, headers: new HeaderMap() },
      },
      response: singleResponse(data),
    };
  }

  it('caches successful GET responses and serves the matching entry', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const plugin = responseCachePlugin<BaseContext>({ ttl: 300, maxSize: 2 });
    const firstContext = operationContext('GET', 'query { first }');
    const firstListener = await startPlugin(plugin);

    await expect(firstListener.responseForOperation?.(firstContext as never)).resolves.toBeNull();
    await firstListener.willSendResponse?.(firstContext as never);

    const secondListener = await startPlugin(plugin);
    const cached = await secondListener.responseForOperation?.(
      operationContext('GET', 'query { first }') as never
    );

    expect(cached).toMatchObject({
      body: { kind: 'single', singleResult: { data: { value: 'query { first }' } } },
    });
    expect(cached?.http?.headers.get('cache-control')).toBe('max-age=300');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Cache hit!'));
    logSpy.mockRestore();
  });

  it('does not cache POST requests or unsuccessful responses', async () => {
    const plugin = responseCachePlugin<BaseContext>();
    const postListener = await startPlugin(plugin);
    const postContext = operationContext('POST', 'query { post }');
    await expect(postListener.responseForOperation?.(postContext as never)).resolves.toBeNull();

    const failedListener = await startPlugin(plugin);
    const failedContext = operationContext('GET', 'query { failed }');
    failedContext.response.body.singleResult.errors = [{ message: 'failed' }];
    await failedListener.responseForOperation?.(failedContext as never);
    await failedListener.willSendResponse?.(failedContext as never);

    const retryListener = await startPlugin(plugin);
    await expect(
      retryListener.responseForOperation?.(operationContext('GET', 'query { failed }') as never)
    ).resolves.toBeNull();
  });

  it('expires stale entries and evicts the oldest entry over max size', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const plugin = responseCachePlugin<BaseContext>({ ttl: 1, maxSize: 1 });

    for (const query of ['query { one }', 'query { two }']) {
      const listener = await startPlugin(plugin);
      const context = operationContext('GET', query);
      await listener.responseForOperation?.(context as never);
      await listener.willSendResponse?.(context as never);
    }

    const evictedListener = await startPlugin(plugin);
    await expect(
      evictedListener.responseForOperation?.(operationContext('GET', 'query { one }') as never)
    ).resolves.toBeNull();

    nowSpy.mockReturnValue(3_000);
    const expiredListener = await startPlugin(plugin);
    await expect(
      expiredListener.responseForOperation?.(operationContext('GET', 'query { two }') as never)
    ).resolves.toBeNull();
    nowSpy.mockRestore();
  });
});
