import fetch from 'node-fetch';

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
    try {
      const response = await fetch(`${BASE_URL}/all?fields=name,cca2,cca3,capital,region,subregion,population,area,flags,currencies,languages`);

      if (!response.ok) {
        console.error(`Countries API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = (await response.json()) as CountryResponse[];

      // Check if data is actually an array
      if (!Array.isArray(data)) {
        console.error('Countries API returned non-array:', data);
        return [];
      }

      const countries = data.map((country) => this.transformCountry(country));
      return limit ? countries.slice(0, limit) : countries;
    } catch (error) {
      console.error('Error fetching countries:', error);
      return [];
    }
  }

  async getCountryByCode(code: string): Promise<Country | null> {
    try {
      const response = await fetch(`${BASE_URL}/alpha/${code}`);
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as CountryResponse[];
      return data.length > 0 ? this.transformCountry(data[0]) : null;
    } catch (error) {
      console.error('Error fetching country:', error);
      return null;
    }
  }

  async getCountriesByRegion(region: string): Promise<Country[]> {
    try {
      const response = await fetch(`${BASE_URL}/region/${region}?fields=name,cca2,cca3,capital,region,subregion,population,area,flags,currencies,languages`);
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as CountryResponse[];
      return data.map((country) => this.transformCountry(country));
    } catch (error) {
      console.error('Error fetching countries by region:', error);
      return [];
    }
  }
}
