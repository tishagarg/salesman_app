"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeocodingService = void 0;
const google_maps_services_js_1 = require("@googlemaps/google-maps-services-js");
const axios_1 = __importDefault(require("axios"));
const client = new google_maps_services_js_1.Client({});
class GeocodingService {
    // async getPlaceId(address: {
    //   street_address: string;
    //   postal_code: string;
    //   subregion: string;
    //   city: string;
    //   state: string;
    //   region: string;
    //   country: string;
    // }): Promise<string | null> {
    //   try {
    //     const query = `${address.street_address}, ${address.postal_code} ${
    //       address.subregion || address.city
    //     }, ${address.region || address.state}, ${address.country}`;
    //     const response: PlaceAutocompleteResponse =
    //       await client.placeAutocomplete({
    //         params: {
    //           input: query,
    //           key: process.env.GOOGLE_MAPS_API_KEY!,
    //           types: "address" as PlaceAutocompleteType,
    //           components: address.country
    //             ? [
    //                 `country:${address.country.toLowerCase()}|locality:${
    //                   address.subregion
    //                 }`,
    //               ]
    //             : undefined,
    //           strictbounds: false,
    //         },
    //       });
    //     if (response.data.predictions.length === 0) {
    //       return null;
    //     }
    //     return response.data.predictions[0].place_id;
    //   } catch (error: any) {
    //     console.warn(
    //       `Places Autocomplete failed for ${address.street_address}: ${error.message}`
    //     );
    //     return null;
    //   }
    // }
    getCoordinatesFromPlaceId(placeId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const response = yield client.placeDetails({
                    params: {
                        place_id: placeId,
                        fields: ["geometry"],
                        key: process.env.GOOGLE_MAPS_API_KEY,
                    },
                });
                if (!((_a = response.data.result.geometry) === null || _a === void 0 ? void 0 : _a.location)) {
                    return null;
                }
                const { lat, lng } = response.data.result.geometry.location;
                return { latitude: lat, longitude: lng };
            }
            catch (error) {
                console.warn(`Place Details failed for place_id ${placeId}: ${error.message}`);
                return null;
            }
        });
    }
    isPreciseLocation(locationType) {
        return locationType === "ROOFTOP" || locationType === "RANGE_INTERPOLATED";
    }
    getPlaceId(address) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Build formatted query
                const queryParts = [
                    address.street_address,
                    address.postal_code,
                    address.subregion || address.city,
                    address.region || address.state,
                    address.country,
                ].filter(Boolean);
                const query = queryParts.join(", ");
                // Map country name to ISO 3166-1 alpha-2 code
                const countryCodeMap = {
                    finland: "FI",
                    // Add other country mappings as needed
                };
                const countryCode = countryCodeMap[address.country.toLowerCase()] ||
                    address.country.toUpperCase();
                // Build components array with only country restriction
                const components = countryCode ? [`country:${countryCode}`] : [];
                const response = yield client.placeAutocomplete({
                    params: {
                        input: query,
                        key: process.env.GOOGLE_MAPS_API_KEY,
                        types: "address",
                        components: components.length ? components : undefined,
                        // locationbias: "ipbias", // ✅ Works without needing lat/lng or bounds
                    },
                });
                if (response.data.predictions.length === 0) {
                    console.warn(`No predictions found for address: ${query}`);
                    return null;
                }
                return response.data.predictions[0].place_id;
            }
            catch (error) {
                console.warn(`Places Autocomplete failed for ${address.street_address}: ${error.message}`, (_a = error.response) === null || _a === void 0 ? void 0 : _a.data);
                return null;
            }
        });
    }
    getCoordinates(address) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 1. First try: Place ID method
                const placeId = yield this.getPlaceId(address);
                if (placeId) {
                    const coords = yield this.getCoordinatesFromPlaceId(placeId);
                    if (coords)
                        return coords;
                }
                // 2. Second try: Geocode with FULL address
                const fullAddress = [
                    address.street_address,
                    `${address.postal_code} ${address.subregion || address.city}`,
                    address.region || address.state,
                    address.country,
                ]
                    .filter(Boolean)
                    .join(", ");
                let response = yield client.geocode({
                    params: {
                        address: fullAddress,
                        key: process.env.GOOGLE_MAPS_API_KEY,
                    },
                });
                // Find most precise result
                const preciseResult = response.data.results.find((r) => this.isPreciseLocation(r.geometry.location_type));
                if (preciseResult) {
                    const { lat, lng } = preciseResult.geometry.location;
                    return { latitude: lat, longitude: lng };
                }
                // 3. Third try: Without apartment identifiers if needed
                const simplifiedAddress = [
                    address.street_address
                        .replace(/\b(?:as|apartment|apt|unit)\s*\d+\b/gi, "")
                        .replace(/\s{2,}/g, " ")
                        .trim(),
                    `${address.postal_code} ${address.subregion || address.city}`,
                    address.country,
                ]
                    .filter(Boolean)
                    .join(", ");
                response = yield client.geocode({
                    params: {
                        address: simplifiedAddress,
                        key: process.env.GOOGLE_MAPS_API_KEY,
                    },
                });
                const bestResult = response.data.results.sort((a, b) => {
                    var _a, _b, _c, _d;
                    const precision = {
                        ROOFTOP: 1,
                        RANGE_INTERPOLATED: 2,
                        GEOMETRIC_CENTER: 3,
                        APPROXIMATE: 4,
                    };
                    return (((_b = precision[(_a = a.geometry.location_type) !== null && _a !== void 0 ? _a : "APPROXIMATE"]) !== null && _b !== void 0 ? _b : 4) -
                        ((_d = precision[(_c = b.geometry.location_type) !== null && _c !== void 0 ? _c : "APPROXIMATE"]) !== null && _d !== void 0 ? _d : 4));
                })[0];
                if (!bestResult)
                    throw new Error("No geocode results found");
                const { lat, lng } = bestResult.geometry.location;
                return { latitude: lat, longitude: lng };
            }
            catch (error) {
                throw new Error(`Geocoding failed for ${address.street_address}, ${address.postal_code}, ${address.subregion}: ${error.message}`);
            }
        });
    }
    getLocationDataFromCoordinates(coordinates) {
        return __awaiter(this, void 0, void 0, function* () {
            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
                throw new Error("Google API key is not configured");
            }
            if (coordinates.length < 3) {
                throw new Error("Minimum 3 coordinates are required to form a polygon");
            }
            const postalCodes = new Set();
            const regions = new Set();
            const subregions = new Set();
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
            const cache = new Map();
            try {
                // Iterate over the grid
                const geocodePromises = [];
                for (let i = 0; i < gridSize; i++) {
                    for (let j = 0; j < gridSize; j++) {
                        const lat = minLat + i * latStep;
                        const lng = minLng + j * lngStep;
                        const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
                        if (cache.has(cacheKey)) {
                            const results = cache.get(cacheKey);
                            results.forEach((result) => {
                                for (const component of result.address_components) {
                                    if (component.types.includes("postal_code")) {
                                        postalCodes.add(component.long_name);
                                    }
                                    if (component.types.includes("administrative_area_level_1")) {
                                        regions.add(component.long_name);
                                    }
                                    if (component.types.includes("sublocality") ||
                                        component.types.includes("neighborhood") ||
                                        component.types.includes("administrative_area_level_2") ||
                                        component.types.includes("administrative_area_level_3")) {
                                        subregions.add(component.long_name);
                                    }
                                }
                            });
                            continue;
                        }
                        geocodePromises.push((() => __awaiter(this, void 0, void 0, function* () {
                            try {
                                const response = yield axios_1.default.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
                                if (response.data.status !== "OK") {
                                    console.warn(`Geocoding API error at (${lat}, ${lng}): ${response.data.status}`);
                                    return;
                                }
                                cache.set(cacheKey, response.data.results);
                                response.data.results.forEach((result) => {
                                    for (const component of result.address_components) {
                                        if (component.types.includes("postal_code")) {
                                            postalCodes.add(component.long_name);
                                        }
                                        if (component.types.includes("administrative_area_level_1")) {
                                            regions.add(component.long_name);
                                        }
                                        if (component.types.includes("sublocality") ||
                                            component.types.includes("neighborhood") ||
                                            component.types.includes("administrative_area_level_2") ||
                                            component.types.includes("administrative_area_level_3")) {
                                            subregions.add(component.long_name);
                                        }
                                    }
                                });
                            }
                            catch (error) {
                                console.warn(`Geocoding failed at (${lat}, ${lng}): ${error.message}`);
                            }
                        }))());
                    }
                }
                // Execute geocoding requests in parallel with rate limiting
                const batchSize = 10; // Adjust based on API rate limits (e.g., 50 QPS)
                for (let k = 0; k < geocodePromises.length; k += batchSize) {
                    yield Promise.all(geocodePromises.slice(k, k + batchSize));
                    if (k + batchSize < geocodePromises.length) {
                        yield new Promise((resolve) => setTimeout(resolve, 200));
                    }
                }
                return {
                    postal_codes: Array.from(postalCodes),
                    regions: Array.from(regions),
                    subregions: Array.from(subregions),
                };
            }
            catch (error) {
                console.error("Error fetching location data:", error.message);
                return { postal_codes: [], regions: [], subregions: [] };
            }
        });
    }
}
exports.GeocodingService = GeocodingService;
