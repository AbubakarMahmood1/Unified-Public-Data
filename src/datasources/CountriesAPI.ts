import {
  requireSuccessfulResponse,
  UpstreamConfigurationError,
  UpstreamResponseError,
} from './upstreamResponse';

const SOURCE = 'REST Countries';
const BASE_URL = 'https://api.restcountries.com/countries/v5';
const MAX_PAGE_SIZE = 100;
const RESPONSE_FIELDS = [
  'names.common',
  'names.official',
  'codes.alpha_2',
  'codes.alpha_3',
  'capitals',
  'region',
  'subregion',
  'population',
  'area.kilometers',
  'flag.url_png',
  'flag.url_svg',
  'flag.description',
  'currencies',
  'languages',
].join(',');

interface CountryPage {
  countries: Country[];
  meta: {
    count: number;
    offset: number;
    more: boolean;
  };
}

export interface Country {
  name: {
    common: string;
    official: string;
  };
  cca2: string;
  cca3: string;
  capital: string[];
  region: string;
  subregion?: string;
  population: number;
  area?: number;
  flags: {
    png: string;
    svg: string;
    alt?: string;
  };
  currencies: Array<{ code: string; name: string; symbol?: string }>;
  languages: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new UpstreamResponseError(SOURCE, `expected ${field} to be a string`);
  }
  return value;
}

function requiredString(value: unknown, field: string): string {
  const result = optionalString(value, field);
  if (result === undefined) {
    throw new UpstreamResponseError(SOURCE, `expected ${field} to be present`);
  }
  return result;
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new UpstreamResponseError(SOURCE, `expected ${field} to be a finite number`);
  }
  return value;
}

function transformCountry(value: unknown): Country {
  if (!isRecord(value)) {
    throw new UpstreamResponseError(SOURCE, 'expected each country to be an object');
  }

  const names = value.names;
  const codes = value.codes;
  const flag = value.flag;
  if (!isRecord(names) || !isRecord(codes) || !isRecord(flag)) {
    throw new UpstreamResponseError(SOURCE, 'expected names, codes, and flag objects');
  }

  let capital: string[] = [];
  if (value.capitals !== undefined && value.capitals !== null) {
    if (!Array.isArray(value.capitals)) {
      throw new UpstreamResponseError(SOURCE, 'expected capitals to be an array');
    }
    capital = value.capitals.map((entry, index) => {
      if (!isRecord(entry)) {
        throw new UpstreamResponseError(SOURCE, `expected capitals[${index}] to be an object`);
      }
      return requiredString(entry.name, `capitals[${index}].name`);
    });
  }

  let currencies: Country['currencies'] = [];
  if (value.currencies !== undefined && value.currencies !== null) {
    if (!Array.isArray(value.currencies)) {
      throw new UpstreamResponseError(SOURCE, 'expected currencies to be an array');
    }
    currencies = value.currencies.map((entry, index) => {
      if (!isRecord(entry)) {
        throw new UpstreamResponseError(SOURCE, `expected currencies[${index}] to be an object`);
      }
      return {
        code: requiredString(entry.code, `currencies[${index}].code`),
        name: requiredString(entry.name, `currencies[${index}].name`),
        symbol: optionalString(entry.symbol, `currencies[${index}].symbol`),
      };
    });
  }

  let languages: string[] = [];
  if (value.languages !== undefined && value.languages !== null) {
    if (!Array.isArray(value.languages)) {
      throw new UpstreamResponseError(SOURCE, 'expected languages to be an array');
    }
    languages = value.languages.map((entry, index) => {
      if (!isRecord(entry)) {
        throw new UpstreamResponseError(SOURCE, `expected languages[${index}] to be an object`);
      }
      return requiredString(entry.name, `languages[${index}].name`);
    });
  }

  let area: number | undefined;
  if (value.area !== undefined && value.area !== null) {
    if (!isRecord(value.area)) {
      throw new UpstreamResponseError(SOURCE, 'expected area to be an object');
    }
    if (value.area.kilometers !== undefined && value.area.kilometers !== null) {
      area = requiredNumber(value.area.kilometers, 'area.kilometers');
    }
  }

  return {
    name: {
      common: requiredString(names.common, 'names.common'),
      official: requiredString(names.official, 'names.official'),
    },
    cca2: requiredString(codes.alpha_2, 'codes.alpha_2'),
    cca3: requiredString(codes.alpha_3, 'codes.alpha_3'),
    capital,
    region: requiredString(value.region, 'region'),
    subregion: optionalString(value.subregion, 'subregion'),
    population: requiredNumber(value.population, 'population'),
    area,
    flags: {
      png: requiredString(flag.url_png, 'flag.url_png'),
      svg: requiredString(flag.url_svg, 'flag.url_svg'),
      alt: optionalString(flag.description, 'flag.description'),
    },
    currencies,
    languages,
  };
}

function parsePage(body: unknown, requestedOffset: number): CountryPage {
  if (!isRecord(body) || !isRecord(body.data) || !Array.isArray(body.data.objects)) {
    throw new UpstreamResponseError(SOURCE, 'expected data.objects to be a country list');
  }
  if (!isRecord(body.data.meta)) {
    throw new UpstreamResponseError(SOURCE, 'expected data.meta to describe pagination');
  }

  const countries = body.data.objects.map(transformCountry);
  const hasPaginationFields =
    body.data.meta.count !== undefined ||
    body.data.meta.offset !== undefined ||
    body.data.meta.more !== undefined;

  let count: number;
  let offset: number;
  let more: boolean;
  if (hasPaginationFields) {
    count = requiredNumber(body.data.meta.count, 'data.meta.count');
    offset = requiredNumber(body.data.meta.offset, 'data.meta.offset');
    if (typeof body.data.meta.more !== 'boolean') {
      throw new UpstreamResponseError(SOURCE, 'expected data.meta.more to be a boolean');
    }
    more = body.data.meta.more;
    if (!Number.isInteger(count) || count < 0 || !Number.isInteger(offset) || offset < 0) {
      throw new UpstreamResponseError(SOURCE, 'expected non-negative integer pagination metadata');
    }
  } else {
    const total = requiredNumber(body.data.meta.total, 'data.meta.total');
    if (!Number.isInteger(total) || total < 0 || total > requestedOffset + countries.length) {
      throw new UpstreamResponseError(SOURCE, 'expected pagination metadata for a partial result');
    }
    count = countries.length;
    offset = requestedOffset;
    more = false;
  }

  return {
    countries,
    meta: {
      count,
      offset,
      more,
    },
  };
}

export class CountriesAPI {
  constructor(private readonly apiKey = process.env.REST_COUNTRIES_API_KEY) {}

  private requireApiKey(): string {
    const apiKey = this.apiKey?.trim();
    if (!apiKey) {
      throw new UpstreamConfigurationError(
        SOURCE,
        'set REST_COUNTRIES_API_KEY in the server environment'
      );
    }
    return apiKey;
  }

  private async requestPage(
    path: string,
    limit: number,
    offset: number,
    allowNotFound = false
  ): Promise<CountryPage | null> {
    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('response_fields', RESPONSE_FIELDS);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.requireApiKey()}`,
      },
    });
    if (allowNotFound && response.status === 404) {
      return null;
    }
    requireSuccessfulResponse(response, SOURCE);
    return parsePage(await response.json(), offset);
  }

  private async fetchCountries(path: string, limit?: number): Promise<Country[]> {
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 0)) {
      throw new RangeError('Country limit must be a non-negative integer');
    }
    if (limit === 0) {
      return [];
    }

    const countries: Country[] = [];
    let offset = 0;

    while (limit === undefined || countries.length < limit) {
      const remaining = limit === undefined ? MAX_PAGE_SIZE : limit - countries.length;
      const pageLimit = Math.min(MAX_PAGE_SIZE, remaining);
      const page = await this.requestPage(path, pageLimit, offset);
      if (page === null) {
        throw new UpstreamResponseError(SOURCE, 'unexpected missing page');
      }

      countries.push(...page.countries);
      if (!page.meta.more || page.countries.length === 0) {
        break;
      }

      const nextOffset = page.meta.offset + page.meta.count;
      if (nextOffset <= offset) {
        throw new UpstreamResponseError(SOURCE, 'pagination did not advance');
      }
      offset = nextOffset;
    }

    return limit === undefined ? countries : countries.slice(0, limit);
  }

  async fetchAllCountries(limit?: number): Promise<Country[]> {
    return this.fetchCountries('', limit);
  }

  async getCountryByCode(code: string): Promise<Country | null> {
    const normalizedCode = code.trim();
    const property =
      normalizedCode.length === 2
        ? 'codes.alpha_2'
        : normalizedCode.length === 3
          ? 'codes.alpha_3'
          : null;
    if (property === null) {
      return null;
    }

    const page = await this.requestPage(
      `/${property}/${encodeURIComponent(normalizedCode)}`,
      1,
      0,
      true
    );
    return page?.countries[0] ?? null;
  }

  async getCountriesByRegion(region: string): Promise<Country[]> {
    return this.fetchCountries(`/region/${encodeURIComponent(region.trim())}`);
  }
}
