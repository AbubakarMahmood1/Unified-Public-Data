import { Response } from 'node-fetch';

export class UpstreamHttpError extends Error {
  readonly source: string;
  readonly status: number;
  readonly extensions: {
    code: 'UPSTREAM_HTTP_ERROR';
    source: string;
    status: number;
  };

  constructor(source: string, response: Response) {
    const status = response.statusText
      ? `${response.status} ${response.statusText}`
      : String(response.status);
    super(`${source} request failed: ${status}`);
    this.name = 'UpstreamHttpError';
    this.source = source;
    this.status = response.status;
    this.extensions = {
      code: 'UPSTREAM_HTTP_ERROR',
      source,
      status: response.status,
    };
  }
}

export class UpstreamResponseError extends Error {
  readonly source: string;
  readonly extensions: {
    code: 'UPSTREAM_INVALID_RESPONSE';
    source: string;
  };

  constructor(source: string, message: string) {
    super(`${source} returned an invalid response: ${message}`);
    this.name = 'UpstreamResponseError';
    this.source = source;
    this.extensions = {
      code: 'UPSTREAM_INVALID_RESPONSE',
      source,
    };
  }
}

export function requireSuccessfulResponse(response: Response, source: string): void {
  if (!response.ok) {
    throw new UpstreamHttpError(source, response);
  }
}
