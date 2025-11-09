import fetch from 'node-fetch';

const BASE_URL = 'https://api.open-meteo.com/v1';

interface WeatherResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current_weather: {
    temperature: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    time: string;
  };
}

interface Weather {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    temperature: number;
    windSpeed: number;
    windDirection: number;
    weatherCode: number;
    time: string;
  };
}

export class WeatherAPI {
  async getWeather(latitude: number, longitude: number): Promise<Weather | null> {
    try {
      const url = `${BASE_URL}/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as WeatherResponse;

      return {
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        current: {
          temperature: data.current_weather.temperature,
          windSpeed: data.current_weather.windspeed,
          windDirection: data.current_weather.winddirection,
          weatherCode: data.current_weather.weathercode,
          time: data.current_weather.time,
        },
      };
    } catch (error) {
      console.error('Error fetching weather:', error);
      return null;
    }
  }
}
