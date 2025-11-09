import { Context } from './index';

export const subscriptionResolvers = {
  Subscription: {
    weatherUpdates: {
      subscribe: async function* (
        _parent: unknown,
        args: { latitude: number; longitude: number; intervalSeconds: number },
        context: Context
      ) {
        const { latitude, longitude, intervalSeconds } = args;

        // Emit weather updates at specified interval
        while (true) {
          const weather = await context.dataSources.weather.getWeather(latitude, longitude);

          if (weather) {
            yield { weatherUpdates: weather };
          }

          // Wait for the specified interval
          await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
        }
      },
    },
  },
};
