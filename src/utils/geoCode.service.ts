import { Client, GeocodeResponse } from "@googlemaps/google-maps-services-js";
import { Coordinates } from "../interfaces/common.interface";
import axios from "axios";
const client = new Client({});

export class GeocodingService {
  async getCoordinates(address: {
    street_address: string;
    postal_code: string;
    subregion: string;
    city: string;
    state: string;
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
  async getLocationDataFromCoordinates(coordinates: Coordinates[]): Promise<{
    postal_codes: string[];
    regions: string[];
    subregions: string[];
  }> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("Google API key is not configured");
    }

    const postalCodes = new Set<string>();
    const regions = new Set<string>();
    const subregions = new Set<string>();
    const sampleCoord = coordinates[0];
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${sampleCoord.lat},${sampleCoord.lng}&key=${apiKey}`
      );

      if (response.data.status !== "OK") {
        throw new Error(`Geocoding API error: ${response.data.status}`);
      }

      const results = response.data.results;
      for (const result of results) {
        for (const component of result.address_components) {
          if (component.types.includes("postal_code")) {
            postalCodes.add(component.long_name);
          }
          if (component.types.includes("administrative_area_level_1")) {
            regions.add(component.long_name);
          }
          if (
            component.types.includes("sublocality") ||
            component.types.includes("neighborhood")
          ) {
            subregions.add(component.long_name);
          }
        }
      }

      return {
        postal_codes: Array.from(postalCodes),
        regions: Array.from(regions),
        subregions: Array.from(subregions),
      };
    } catch (error: any) {
      console.error("Error fetching location data:", error.message);
      return { postal_codes: [], regions: [], subregions: [] };
    }
  }
}
