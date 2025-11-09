import {
  ApolloServerPlugin,
  GraphQLRequestListener,
  BaseContext,
} from '@apollo/server';

interface Metrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  averageDuration: number;
  cacheHits: number;
  cacheMisses: number;
  queryComplexityAverage: number;
  topOperations: Map<string, { count: number; avgDuration: number; totalDuration: number }>;
  errorsByType: Map<string, number>;
  startTime: number;
}

interface MetricsPluginOptions {
  logInterval?: number; // Log interval in milliseconds (0 to disable)
  onMetricsUpdate?: (metrics: Metrics) => void;
}

export class MetricsCollector {
  private metrics: Metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalDuration: 0,
    averageDuration: 0,
    cacheHits: 0,
    cacheMisses: 0,
    queryComplexityAverage: 0,
    topOperations: new Map(),
    errorsByType: new Map(),
    startTime: Date.now(),
  };

  private complexitySum = 0;
  private complexityCount = 0;
  private logIntervalId?: NodeJS.Timeout;

  constructor(private options: MetricsPluginOptions = {}) {
    if (options.logInterval && options.logInterval > 0) {
      this.startLogging(options.logInterval);
    }
  }

  recordRequest(
    operationName: string | null | undefined,
    duration: number,
    success: boolean,
    errors?: readonly unknown[]
  ): void {
    this.metrics.totalRequests++;
    this.metrics.totalDuration += duration;
    this.metrics.averageDuration = this.metrics.totalDuration / this.metrics.totalRequests;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    if (operationName) {
      const operation = this.metrics.topOperations.get(operationName) || {
        count: 0,
        avgDuration: 0,
        totalDuration: 0,
      };

      operation.count++;
      operation.totalDuration += duration;
      operation.avgDuration = operation.totalDuration / operation.count;

      this.metrics.topOperations.set(operationName, operation);
    }

    if (errors) {
      for (const error of errors) {
        const errorCode = (error as { extensions?: { code?: string } }).extensions?.code || 'UNKNOWN';
        this.metrics.errorsByType.set(
          errorCode,
          (this.metrics.errorsByType.get(errorCode) || 0) + 1
        );
      }
    }

    if (this.options.onMetricsUpdate) {
      this.options.onMetricsUpdate(this.getMetrics());
    }
  }

  recordCacheHit(hit: boolean): void {
    if (hit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }

  recordQueryComplexity(complexity: number): void {
    this.complexitySum += complexity;
    this.complexityCount++;
    this.metrics.queryComplexityAverage = this.complexitySum / this.complexityCount;
  }

  getMetrics(): Metrics {
    return {
      ...this.metrics,
      topOperations: new Map(this.metrics.topOperations),
      errorsByType: new Map(this.metrics.errorsByType),
    };
  }

  getFormattedMetrics(): string {
    const uptime = Date.now() - this.metrics.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    const cacheHitRate =
      this.metrics.cacheHits + this.metrics.cacheMisses > 0
        ? ((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100).toFixed(2)
        : '0.00';

    const topOps = Array.from(this.metrics.topOperations.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, stats]) => `    ${name}: ${stats.count} requests (avg ${stats.avgDuration.toFixed(2)}ms)`)
      .join('\n');

    return `
📊 GraphQL Gateway Metrics
━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱  Uptime: ${uptimeSeconds}s
📈 Total Requests: ${this.metrics.totalRequests}
✅ Successful: ${this.metrics.successfulRequests}
❌ Failed: ${this.metrics.failedRequests}
⚡ Avg Duration: ${this.metrics.averageDuration.toFixed(2)}ms
💾 Cache Hit Rate: ${cacheHitRate}%
🔢 Avg Query Complexity: ${this.metrics.queryComplexityAverage.toFixed(2)}

Top Operations:
${topOps || '    (none)'}

Errors by Type:
${Array.from(this.metrics.errorsByType.entries())
  .map(([code, count]) => `    ${code}: ${count}`)
  .join('\n') || '    (none)'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  private startLogging(interval: number): void {
    this.logIntervalId = setInterval(() => {
      console.log(this.getFormattedMetrics());
    }, interval);
  }

  stopLogging(): void {
    if (this.logIntervalId) {
      clearInterval(this.logIntervalId);
    }
  }

  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalDuration: 0,
      averageDuration: 0,
      cacheHits: 0,
      cacheMisses: 0,
      queryComplexityAverage: 0,
      topOperations: new Map(),
      errorsByType: new Map(),
      startTime: Date.now(),
    };
    this.complexitySum = 0;
    this.complexityCount = 0;
  }
}

export const metricsPlugin = <TContext extends BaseContext>(
  collector: MetricsCollector
): ApolloServerPlugin<TContext> => {
  return {
    async requestDidStart(): Promise<GraphQLRequestListener<TContext>> {
      const startTime = Date.now();
      let operationName: string | null | undefined;

      return {
        async didResolveOperation(requestContext) {
          operationName = requestContext.operationName;
        },

        async willSendResponse(requestContext) {
          const duration = Date.now() - startTime;
          const hasErrors =
            requestContext.response.body &&
            requestContext.response.body.kind === 'single' &&
            requestContext.response.body.singleResult.errors &&
            requestContext.response.body.singleResult.errors.length > 0;

          collector.recordRequest(
            operationName,
            duration,
            !hasErrors,
            hasErrors && requestContext.response.body && requestContext.response.body.kind === 'single'
              ? requestContext.response.body.singleResult.errors
              : undefined
          );
        },
      };
    },
  };
};
