import { Client, GeocodeResponse, PlaceAutocompleteResponse, PlaceAutocompleteType, PlaceDetailsResponse } from "@googlemaps/google-maps-services-js";
import { Coordinates } from "../interfaces/common.interface";
import axios from "axios";
const client = new Client({});

export class GeocodingService {
  async getPlaceId(address: {
    street_address: string;
    postal_code: string;
    subregion: string;
    city: string;
    state: string;
    region: string;
    country: string;
  }): Promise<string | null> {
    try {
      const query = `${address.street_address}, ${address.postal_code} ${address.subregion || address.city}, ${address.region || address.state}, ${address.country}`;
      const response: PlaceAutocompleteResponse = await client.placeAutocomplete({
        params: {
          input: query,
          key: process.env.GOOGLE_MAPS_API_KEY!,
          types: "address" as PlaceAutocompleteType,
          components: address.country ? [`country:${address.country.toLowerCase()}`] : undefined,
        },
      });

      if (response.data.predictions.length === 0) {
        return null;
      }

      return response.data.predictions[0].place_id;
    } catch (error: any) {
      console.warn(`Places Autocomplete failed for ${address.street_address}: ${error.message}`);
      return null;
    }
  }

  async getCoordinatesFromPlaceId(placeId: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const response: PlaceDetailsResponse = await client.placeDetails({
        params: {
          place_id: placeId,
          fields: ["geometry"],
          key: process.env.GOOGLE_MAPS_API_KEY!,
        },
      });

      if (!response.data.result.geometry?.location) {
        return null;
      }

      const { lat, lng } = response.data.result.geometry.location;
      return { latitude: lat, longitude: lng };
    } catch (error: any) {
      console.warn(`Place Details failed for place_id ${placeId}: ${error.message}`);
      return null;
    }
  }

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
      const placeId = await this.getPlaceId(address);
      if (placeId) {
        const coords = await this.getCoordinatesFromPlaceId(placeId);
        if (coords) {
          return coords;
        }
      }

      const response: GeocodeResponse = await client.geocode({
        params: {
          address: `${address.street_address}, ${address.postal_code} ${address.subregion || address.city}, ${address.region || address.state}, ${address.country}`,
          key: process.env.GOOGLE_MAPS_API_KEY!,
        },
      });

      if (response.data.results.length === 0) {
        throw new Error("Address not found");
      }

      const location = response.data.results[0].geometry.location;
      return { latitude: location.lat, longitude: location.lng };
    } catch (error: any) {
      throw new Error(`Geocoding failed for ${address.street_address}, ${address.postal_code}, ${address.subregion}: ${error.message}`);
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
    if (coordinates.length < 3) {
      throw new Error("Minimum 3 coordinates are required to form a polygon");
    }

    const postalCodes = new Set<string>();
    const regions = new Set<string>();
    const subregions = new Set<string>();

  // Calculate the bounding box
    const lats = coordinates.map((coord) => coord.lat);
    const lngs = coordinates.map((coord) => coord.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

  // Define a grid (e.g., 5x5 points) to sample within the bounding box
  const gridSize = 5; // Adjustable for granularity (e.g., 7x7 for more points)
    const latStep = (maxLat - minLat) / (gridSize - 1);
    const lngStep = (maxLng - minLng) / (gridSize - 1);

    const cache = new Map<string, any>();

    try {
    // Iterate over the grid
      const geocodePromises: Promise<void>[] = [];
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const lat = minLat + i * latStep;
          const lng = minLng + j * lngStep;
          const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
          if (cache.has(cacheKey)) {
            const results = cache.get(cacheKey);
            results.forEach((result: any) => {
              for (const component of result.address_components) {
                if (component.types.includes("postal_code")) {
                  postalCodes.add(component.long_name);
                }
                if (component.types.includes("administrative_area_level_1")) {
                  regions.add(component.long_name);
                }
                if (
                  component.types.includes("sublocality") ||
                  component.types.includes("neighborhood") ||
                  component.types.includes("administrative_area_level_2") ||
                  component.types.includes("administrative_area_level_3")
                ) {
                  subregions.add(component.long_name);
                }
              }
            });
            continue;
          }

          geocodePromises.push(
            (async () => {
              try {
                const response = await axios.get(
                  `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
                );

                if (response.data.status !== "OK") {
                  console.warn(
                    `Geocoding API error at (${lat}, ${lng}): ${response.data.status}`
                  );
                  return;
                }

                cache.set(cacheKey, response.data.results);
                response.data.results.forEach((result: any) => {
                  for (const component of result.address_components) {
                    if (component.types.includes("postal_code")) {
                      postalCodes.add(component.long_name);
                    }
                    if (component.types.includes("administrative_area_level_1")) {
                      regions.add(component.long_name);
                    }
                    if (
                      component.types.includes("sublocality") ||
                      component.types.includes("neighborhood") ||
                      component.types.includes("administrative_area_level_2") ||
                      component.types.includes("administrative_area_level_3")
                    ) {
                      subregions.add(component.long_name);
                    }
                  }
                });
              } catch (error: any) {
                console.warn(`Geocoding failed at (${lat}, ${lng}): ${error.message}`);
              }
            })()
          );
        }
      }

    // Execute geocoding requests in parallel with rate limiting
    const batchSize = 10; // Adjust based on API rate limits (e.g., 50 QPS)
      for (let k = 0; k < geocodePromises.length; k += batchSize) {
        await Promise.all(geocodePromises.slice(k, k + batchSize));
        if (k + batchSize < geocodePromises.length) {
          await new Promise<void>((resolve) => setTimeout(resolve, 200));
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
