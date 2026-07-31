import fetch from 'node-fetch';
import { requireSuccessfulResponse, UpstreamResponseError } from './upstreamResponse';

const BASE_URL = 'https://restcountries.com/v3.1';

interface CountryResponse {
  name: {
    common: string;
    official: string;
  };
  cca2: string;
  cca3: string;
  capital?: string[];
  region: string;
  subregion?: string;
  population: number;
  area?: number;
  flags: {
    png: string;
    svg: string;
    alt?: string;
  };
  currencies?: Record<string, { name: string; symbol?: string }>;
  languages?: Record<string, string>;
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

export class CountriesAPI {
  private transformCountry(data: CountryResponse): Country {
    const currencies = data.currencies
      ? Object.entries(data.currencies).map(([code, info]) => ({
          code,
          name: info.name,
          symbol: info.symbol,
        }))
      : [];

    const languages = data.languages ? Object.values(data.languages) : [];

    return {
      name: data.name,
      cca2: data.cca2,
      cca3: data.cca3,
      capital: data.capital || [],
      region: data.region,
      subregion: data.subregion,
      population: data.population,
      area: data.area,
      flags: data.flags,
      currencies,
      languages,
    };
  }

  async fetchAllCountries(limit?: number): Promise<Country[]> {
    // Remove fields parameter - API is strict about field validation
    const response = await fetch(`${BASE_URL}/all`);
    requireSuccessfulResponse(response, 'REST Countries');

    const data = (await response.json()) as CountryResponse[];
    if (!Array.isArray(data)) {
      throw new UpstreamResponseError('REST Countries', 'expected a country list');
    }

    const countries = data.map((country) => this.transformCountry(country));
    return limit ? countries.slice(0, limit) : countries;
  }

  async getCountryByCode(code: string): Promise<Country | null> {
    const response = await fetch(`${BASE_URL}/alpha/${code}`);
    if (response.status === 404) {
      return null;
    }
    requireSuccessfulResponse(response, 'REST Countries');

    const data = (await response.json()) as CountryResponse[];
    if (!Array.isArray(data)) {
      throw new UpstreamResponseError('REST Countries', 'expected a country lookup list');
    }
    return data.length > 0 ? this.transformCountry(data[0]) : null;
  }

  async getCountriesByRegion(region: string): Promise<Country[]> {
    // Remove fields parameter for consistency
    const response = await fetch(`${BASE_URL}/region/${region}`);
    requireSuccessfulResponse(response, 'REST Countries');

    const data = (await response.json()) as CountryResponse[];
    if (!Array.isArray(data)) {
      throw new UpstreamResponseError('REST Countries', 'expected a region result list');
    }

    return data.map((country) => this.transformCountry(country));
  }
}
