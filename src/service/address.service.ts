import dataSource from "../config/data-source";
import httpStatusCodes from "http-status-codes";
import { TerritoryService } from "./territory.service";
import { Address } from "../models/Address.entity";
import { validate } from "class-validator";
import {
  Client as GoogleMapsClient,
  GeocodeRequest,
} from "@googlemaps/google-maps-services-js";
import { AddressValidation } from "../constants/AddressValidation";

const territoryService = new TerritoryService();
const googleMapsClient = new GoogleMapsClient();

export class AddressService {
  async createAddress(data: {
    street_address: string;
    postal_code: string;
    city: string;
    state: string;
    country: string;
    created_by: string;
  }): Promise<{ data: Address | null; message: string; status: number }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      // Validate input data
      const validation = new AddressValidation();
      Object.assign(validation, data);
      const errors = await validate(validation);
      if (errors.length) {
        throw new Error("Invalid address data");
      }
      const fullAddress = `${data.street_address}, ${data.city}, ${data.state}, ${data.postal_code}, ${data.country}`;
      const geocodeRequest: GeocodeRequest = {
        params: {
          address: fullAddress,
          key: process.env.GOOGLE_MAPS_API_KEY!,
        },
      };
      const geolocation = await googleMapsClient.geocode(geocodeRequest);
      console.log(geolocation);
      if (!geolocation.data.results.length) {
        throw new Error(
          "Geocoding failed: No results found for the provided address"
        );
      }

      const { lat, lng } = geolocation.data.results[0].geometry.location;
      const territory = await territoryService.assignTerritory({
        postal_code: data.postal_code,
        city: data.city,
        lat,
        lng,
      });
      const address = await queryRunner.manager.save(Address, {
        ...data,
        latitude: lat,
        longitude: lng,
        territory_id: territory?.territory_id,
        is_active: true,
      });

      await queryRunner.commitTransaction();
      return {
        data: address,
        status: 200,
        message: "Address created successfully",
      };
    } catch (error: any) {
      console.log(error);
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.BAD_REQUEST,
        message: error.message,
        data: null,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
