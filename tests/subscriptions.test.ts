import { Context } from '../src/resolvers';
import { subscriptionResolvers } from '../src/resolvers/subscriptions';

describe('weatherUpdates subscription', () => {
  it('emits the datasource result before waiting for the next interval', async () => {
    const weather = {
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
    };
    const context = {
      dataSources: {
        weather: { getWeather: jest.fn().mockResolvedValue(weather) },
      },
    } as unknown as Context;

    const iterator = subscriptionResolvers.Subscription.weatherUpdates.subscribe(
      undefined,
      { latitude: 33.6844, longitude: 73.0479, intervalSeconds: 60 },
      context
    );

    await expect(iterator.next()).resolves.toEqual({
      done: false,
      value: { weatherUpdates: weather },
    });
    await iterator.return(undefined as never);
    expect(context.dataSources.weather.getWeather).toHaveBeenCalledWith(33.6844, 73.0479);
  });
});
