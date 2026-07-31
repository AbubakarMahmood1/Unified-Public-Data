import fetch, { Response } from 'node-fetch';
import { CountriesAPI } from '../src/datasources/CountriesAPI';
import { JSONPlaceholderAPI } from '../src/datasources/JSONPlaceholderAPI';
import { WeatherAPI } from '../src/datasources/WeatherAPI';

jest.mock('node-fetch');

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

function response(status: number, statusText: string, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('upstream HTTP failure semantics', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it.each([
    ['JSONPlaceholder', () => new JSONPlaceholderAPI().fetchPosts()],
    ['Open-Meteo', () => new WeatherAPI().getWeather(33.6844, 73.0479)],
    ['REST Countries', () => new CountriesAPI().fetchAllCountries()],
  ])('%s surfaces a 503 instead of returning valid-looking empty data', async (source, request) => {
    mockedFetch.mockResolvedValue(response(503, 'Service Unavailable', []));

    await expect(request()).rejects.toMatchObject({
      name: 'UpstreamHttpError',
      source,
      status: 503,
      message: expect.stringContaining('503 Service Unavailable'),
      extensions: {
        code: 'UPSTREAM_HTTP_ERROR',
        source,
        status: 503,
      },
    });
  });

  it('keeps a REST Countries 404 as a legitimate missing country', async () => {
    mockedFetch.mockResolvedValue(response(404, 'Not Found', { status: 404 }));

    await expect(new CountriesAPI().getCountryByCode('ZZ')).resolves.toBeNull();
  });

  it('rejects a success-status REST Countries error envelope as contract drift', async () => {
    mockedFetch.mockResolvedValue(
      response(200, 'OK', {
        success: false,
        data: null,
        errors: [{ message: 'This API version has been deprecated.' }],
      })
    );

    await expect(new CountriesAPI().getCountryByCode('PK')).rejects.toMatchObject({
      name: 'UpstreamResponseError',
      source: 'REST Countries',
      message: expect.stringContaining('expected a country lookup list'),
      extensions: {
        code: 'UPSTREAM_INVALID_RESPONSE',
        source: 'REST Countries',
      },
    });
  });
});
