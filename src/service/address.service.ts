import httpStatusCodes from "http-status-codes";
import dataSource from "../config/data-source";
import { Address } from "../models/Address.entity";
import { GeocodingService } from "../utils/geoCode.service";
import { TerritoryService } from "./territory.service";
import { validate } from "class-validator";
import { AddressDto } from "../interfaces/common.interface";
import { Region } from "../models/Region.entity";
import { Subregion } from "../models/Subregion.entity";
import { Territory } from "../models/Territory.entity";

export class AddressService {
  private geocodingService = new GeocodingService();
  private territoryService = new TerritoryService();
  async getFinnishRegions(): Promise<string[]> {
    const regions = await dataSource.manager.find(Region, {
      where: { is_active: true },
      select: ["name"],
    });
    return regions.map((region) => region.name);
  }
  async getFinnishSubregions(region: string): Promise<string[]> {
    const subregions = await dataSource.manager.find(Subregion, {
      where: { region_name: region, is_active: true },
      select: ["name"],
    });
    return subregions.map((subregion) => subregion.name);
  }
  async createAddress(
    data: AddressDto,
    userId: number,
    org_id: number
  ): Promise<{
    status: number;
    data?: Address;
    message: string;
  }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const addressData = new AddressDto();
      Object.assign(addressData, data);
      const territories = await dataSource.manager.find(Territory, {
        where: { org_id, is_active: true },
        select: ["territory_id", "regions", "subregions", "postal_codes"],
      });

      const territoryLookup = new Map<string, number>();
      territories.forEach((territory) => {
        const territoryId = territory.territory_id;
        try {
          if (territory.postal_codes) {
            (JSON.parse(territory.postal_codes) as string[]).forEach((code) =>
              territoryLookup.set(`postal:${code}`, territoryId)
            );
          }
          if (territory.regions) {
            (JSON.parse(territory.regions) as string[]).forEach((region) =>
              territoryLookup.set(`region:${region}`, territoryId)
            );
          }
          if (territory.subregions) {
            (JSON.parse(territory.subregions) as string[]).forEach(
              (subregion) =>
                territoryLookup.set(`subregion:${subregion}`, territoryId)
            );
          }
        } catch (e) {
          console.warn(`Malformed JSON in territory ${territoryId}: ${e}`);
        }
      });
      const territoryId =
        territoryLookup.get(`postal:${addressData.postal_code}`) ||
        territoryLookup.get(`region:${addressData.region}`) ||
        territoryLookup.get(`subregion:${addressData.subregion}`) ||
        null;
      if (!/^\d{5}$/.test(data.postal_code)) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "Postal code must be 5 numeric characters",
        };
      }

      if (data.latitude && (data.latitude < 59.5 || data.latitude > 70.1)) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "Latitude must be between 59.5 and 70.1",
        };
      }

      if (data.longitude && (data.longitude < 19.0 || data.longitude > 31.6)) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "Longitude must be between 19.0 and 31.6",
        };
      }
      const existing = await queryRunner.manager.findOne(Address, {
        where: {
          postal_code: data.postal_code,
          street_address: data.street_address,
          subregion: data.subregion,
          org_id: data.org_id,
          territory_id: territoryId || undefined,
        },
      });
      if (existing) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.CONFLICT,
          message: "Address already exists",
        };
      }

      let coords = { latitude: data.latitude, longitude: data.longitude };
      if (!data.latitude || !data.longitude) {
        coords = await this.geocodingService.getCoordinates({
          street_address: data.street_address,
          postal_code: data.postal_code,
          subregion: data.subregion,
          region: data.region,
          city: data.city,
          state: data.state,
          country: data.country || "Finland",
        });
      }
      const address = new Address();
      address.street_address = data.street_address;
      address.building_unit = data.building_unit ?? "";
      address.landmark = data.landmark ?? "";
      address.postal_code = data.postal_code;
      address.area_name = data.area_name;
      address.subregion = data.subregion;
      address.region = data.region;
      address.country = data.country || "Finland";
      address.latitude = coords.latitude !== undefined ? coords.latitude : 0;
      address.longitude = coords.longitude !== undefined ? coords.longitude : 0;
      address.org_id = data.org_id;
      address.created_by = String(userId);
      address.updated_by = String(userId);
      address.city = data.subregion;
      address.state = data.region;
      console.log("addresss inside create ", address);
      const savedAddress = await queryRunner.manager.save(Address, address);
      console.log("saved address inside create ", savedAddress);

      if (!savedAddress.address_id) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.INTERNAL_SERVER_ERROR,
          message: "Failed to generate address_id",
        };
      }

      // Commit address creation
      await queryRunner.commitTransaction();

      // Start a new transaction for territory assignment
      await queryRunner.startTransaction();
      const autoAssignResult = await this.territoryService.autoAssignTerritory(
        savedAddress.address_id,
        data.org_id
      );
      // Commit territory assignment
      await queryRunner.commitTransaction();

      return {
        status: httpStatusCodes.CREATED,
        data: autoAssignResult.data || savedAddress,
        message: "Address created successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("createAddress - Error:", error.message, error.stack);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to create address`,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
