import { Client, GeocodeResponse } from "@googlemaps/google-maps-services-js";

const client = new Client({});

export class GeocodingService {
  async getCoordinates(address: {
    street_address: string;
    postal_code: string;
    subregion: string;
    region: string;
    country: string;
  }): Promise<{ latitude: number; longitude: number }> {
    try {
      const response: GeocodeResponse = await client.geocode({
        params: {
          address: `${address.street_address}, ${address.postal_code} ${address.subregion}, ${address.region}, ${address.country}`,
          key: process.env.GOOGLE_MAPS_API_KEY!,
        },
      });

      if (response.data.results.length === 0) {
        throw new Error("Address not found");
      }

      const location = response.data.results[0].geometry.location;
      return { latitude: location.lat, longitude: location.lng };
    } catch (error) {
      throw new Error(`Geocoding failed`);
    }
  }
}
