import { CountriesAPI } from '../src/datasources/CountriesAPI';
import { JSONPlaceholderAPI } from '../src/datasources/JSONPlaceholderAPI';
import { WeatherAPI } from '../src/datasources/WeatherAPI';

const originalFetch = globalThis.fetch;
const mockedFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

beforeAll(() => {
  globalThis.fetch = mockedFetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

function response(status: number, statusText: string, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function countryRecord(alpha2 = 'PK', alpha3 = 'PAK'): Record<string, unknown> {
  return {
    names: {
      common: alpha2 === 'PK' ? 'Pakistan' : 'Canada',
      official: alpha2 === 'PK' ? 'Islamic Republic of Pakistan' : 'Canada',
    },
    codes: { alpha_2: alpha2, alpha_3: alpha3 },
    capitals: [{ name: alpha2 === 'PK' ? 'Islamabad' : 'Ottawa' }],
    region: alpha2 === 'PK' ? 'Asia' : 'Americas',
    subregion: alpha2 === 'PK' ? 'Southern Asia' : 'Northern America',
    population: alpha2 === 'PK' ? 241499431 : 36991981,
    area: { kilometers: alpha2 === 'PK' ? 881912 : 9984670 },
    flag: {
      url_png: `https://flags.example/${alpha2.toLowerCase()}.png`,
      url_svg: `https://flags.example/${alpha2.toLowerCase()}.svg`,
      description: `Flag of ${alpha2}`,
    },
    currencies:
      alpha2 === 'PK'
        ? [{ code: 'PKR', name: 'Pakistani rupee', symbol: 'Rs' }]
        : [{ code: 'CAD', name: 'Canadian dollar', symbol: '$' }],
    languages:
      alpha2 === 'PK'
        ? [{ name: 'English' }, { name: 'Urdu' }]
        : [{ name: 'English' }, { name: 'French' }],
  };
}

function countryPage(
  objects: Record<string, unknown>[],
  options: { offset?: number; more?: boolean; count?: number } = {}
): Record<string, unknown> {
  return {
    data: {
      objects,
      meta: {
        total: objects.length,
        count: options.count ?? objects.length,
        limit: Math.max(objects.length, 1),
        offset: options.offset ?? 0,
        more: options.more ?? false,
      },
    },
  };
}

describe('upstream HTTP failure semantics', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it.each([
    ['JSONPlaceholder', () => new JSONPlaceholderAPI().fetchPosts()],
    ['Open-Meteo', () => new WeatherAPI().getWeather(33.6844, 73.0479)],
    ['REST Countries', () => new CountriesAPI('test-key').fetchAllCountries()],
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
    mockedFetch.mockResolvedValue(response(404, 'Not Found', { errors: [] }));

    await expect(new CountriesAPI('test-key').getCountryByCode('ZZ')).resolves.toBeNull();
  });

  it('rejects a success-status REST Countries error envelope as contract drift', async () => {
    mockedFetch.mockResolvedValue(
      response(200, 'OK', {
        success: false,
        data: null,
        errors: [{ message: 'This API version has been deprecated.' }],
      })
    );

    await expect(new CountriesAPI('test-key').getCountryByCode('PK')).rejects.toMatchObject({
      name: 'UpstreamResponseError',
      source: 'REST Countries',
      message: expect.stringContaining('expected data.objects to be a country list'),
      extensions: {
        code: 'UPSTREAM_INVALID_RESPONSE',
        source: 'REST Countries',
      },
    });
  });
});

describe('REST Countries v5 adapter', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('fails closed without a server-side API key', async () => {
    await expect(new CountriesAPI('').fetchAllCountries(1)).rejects.toMatchObject({
      name: 'UpstreamConfigurationError',
      source: 'REST Countries',
      message: expect.stringContaining('REST_COUNTRIES_API_KEY'),
      extensions: {
        code: 'UPSTREAM_CONFIGURATION_ERROR',
        source: 'REST Countries',
      },
    });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('uses bearer authentication outside the URL and maps the v5 schema', async () => {
    mockedFetch.mockResolvedValue(response(200, 'OK', countryPage([countryRecord()])));

    const result = await new CountriesAPI(' local-secret ').getCountryByCode('pk');

    expect(result).toEqual({
      name: {
        common: 'Pakistan',
        official: 'Islamic Republic of Pakistan',
      },
      cca2: 'PK',
      cca3: 'PAK',
      capital: ['Islamabad'],
      region: 'Asia',
      subregion: 'Southern Asia',
      population: 241499431,
      area: 881912,
      flags: {
        png: 'https://flags.example/pk.png',
        svg: 'https://flags.example/pk.svg',
        alt: 'Flag of PK',
      },
      currencies: [{ code: 'PKR', name: 'Pakistani rupee', symbol: 'Rs' }],
      languages: ['English', 'Urdu'],
    });

    const [requestUrl, requestInit] = mockedFetch.mock.calls[0];
    expect(String(requestUrl)).toContain('/countries/v5/codes.alpha_2/pk');
    expect(String(requestUrl)).toContain('response_fields=');
    expect(String(requestUrl)).not.toContain('local-secret');
    expect(requestInit).toEqual({
      headers: { Authorization: 'Bearer local-secret' },
    });
  });

  it('selects the exact alpha-3 endpoint for a three-letter code', async () => {
    mockedFetch.mockResolvedValue(response(200, 'OK', countryPage([countryRecord()])));

    await new CountriesAPI('test-key').getCountryByCode('PAK');

    expect(String(mockedFetch.mock.calls[0][0])).toContain('/codes.alpha_3/PAK');
  });

  it('returns null without a request for a code that cannot be alpha-2 or alpha-3', async () => {
    await expect(new CountriesAPI('test-key').getCountryByCode('PAKISTAN')).resolves.toBeNull();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('follows v5 pagination when the caller requests all countries', async () => {
    mockedFetch
      .mockResolvedValueOnce(
        response(200, 'OK', countryPage([countryRecord()], { more: true, count: 1 }))
      )
      .mockResolvedValueOnce(
        response(200, 'OK', countryPage([countryRecord('CA', 'CAN')], { offset: 1 }))
      );

    const result = await new CountriesAPI('test-key').fetchAllCountries();

    expect(result.map((country) => country.cca2)).toEqual(['PK', 'CA']);
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(String(mockedFetch.mock.calls[0][0])).toContain('limit=100');
    expect(String(mockedFetch.mock.calls[1][0])).toContain('offset=1');
  });

  it('passes a requested limit to v5 instead of downloading the full dataset', async () => {
    mockedFetch.mockResolvedValue(response(200, 'OK', countryPage([countryRecord()])));

    await expect(new CountriesAPI('test-key').fetchAllCountries(1)).resolves.toHaveLength(1);

    expect(String(mockedFetch.mock.calls[0][0])).toContain('limit=1');
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('accepts the terminal total-only metadata used by exact and demo responses', async () => {
    mockedFetch.mockResolvedValue(
      response(200, 'OK', {
        data: {
          objects: [countryRecord()],
          meta: { total: 1, request_id: 'example-request' },
        },
      })
    );

    await expect(new CountriesAPI('test-key').getCountryByCode('PK')).resolves.toMatchObject({
      cca2: 'PK',
    });
  });

  it('encodes a region lookup and validates each country record', async () => {
    mockedFetch.mockResolvedValue(response(200, 'OK', countryPage([{ unexpected: true }])));

    await expect(
      new CountriesAPI('test-key').getCountriesByRegion('Northern Europe')
    ).rejects.toMatchObject({
      name: 'UpstreamResponseError',
      message: expect.stringContaining('names, codes, and flag objects'),
    });
    expect(String(mockedFetch.mock.calls[0][0])).toContain('/region/Northern%20Europe');
  });

  it('rejects pagination metadata that claims progress without advancing', async () => {
    mockedFetch
      .mockResolvedValueOnce(
        response(200, 'OK', countryPage([countryRecord()], { more: true, count: 0 }))
      )
      .mockResolvedValueOnce(response(200, 'OK', countryPage([countryRecord()])));

    await expect(new CountriesAPI('test-key').fetchAllCountries()).rejects.toMatchObject({
      name: 'UpstreamResponseError',
      message: expect.stringContaining('pagination did not advance'),
    });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
});

describe('JSONPlaceholder datasource success paths', () => {
  const posts = [
    { id: 1, userId: 1, title: 'First', body: 'Body one' },
    { id: 2, userId: 1, title: 'Second', body: 'Body two' },
  ];
  const users = [
    {
      id: 1,
      name: 'Example User',
      username: 'example',
      email: 'user@example.com',
      phone: '123',
      website: 'example.com',
    },
  ];
  const comments = [
    { id: 1, postId: 1, name: 'Comment', email: 'commenter@example.com', body: 'Hello' },
  ];

  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('applies post and user limits', async () => {
    mockedFetch
      .mockResolvedValueOnce(response(200, 'OK', posts))
      .mockResolvedValueOnce(response(200, 'OK', users));
    const api = new JSONPlaceholderAPI();

    await expect(api.fetchPosts(1)).resolves.toEqual([posts[0]]);
    await expect(api.fetchUsers(1)).resolves.toEqual(users);
  });

  it('builds comment and user-post query URLs', async () => {
    mockedFetch
      .mockResolvedValueOnce(response(200, 'OK', comments))
      .mockResolvedValueOnce(response(200, 'OK', posts));
    const api = new JSONPlaceholderAPI();

    await expect(api.fetchComments(1)).resolves.toEqual(comments);
    await expect(api.getPostsByUserId(1)).resolves.toEqual(posts);
    expect(String(mockedFetch.mock.calls[0][0])).toContain('/comments?postId=1');
    expect(String(mockedFetch.mock.calls[1][0])).toContain('/posts?userId=1');
  });

  it('batches post, user, and comment lookups through their loaders', async () => {
    mockedFetch
      .mockResolvedValueOnce(response(200, 'OK', posts))
      .mockResolvedValueOnce(response(200, 'OK', users))
      .mockResolvedValueOnce(response(200, 'OK', comments));
    const api = new JSONPlaceholderAPI();

    await expect(Promise.all([api.getPost(1), api.getPost(99)])).resolves.toEqual([posts[0], null]);
    await expect(api.getUser(1)).resolves.toEqual(users[0]);
    await expect(api.getComment(1)).resolves.toEqual(comments[0]);
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });
});

describe('Open-Meteo datasource success path', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('maps the provider current-weather shape', async () => {
    mockedFetch.mockResolvedValue(
      response(200, 'OK', {
        latitude: 33.6844,
        longitude: 73.0479,
        timezone: 'GMT',
        current_weather: {
          temperature: 27.5,
          windspeed: 8.2,
          winddirection: 190,
          weathercode: 1,
          time: '2026-08-04T00:00',
        },
      })
    );

    await expect(new WeatherAPI().getWeather(33.6844, 73.0479)).resolves.toEqual({
      latitude: 33.6844,
      longitude: 73.0479,
      timezone: 'GMT',
      current: {
        temperature: 27.5,
        windSpeed: 8.2,
        windDirection: 190,
        weatherCode: 1,
        time: '2026-08-04T00:00',
      },
    });
  });
});
