import httpStatusCodes from "http-status-codes";
import { getDataSource } from "../config/data-source"; // Updated import
import { Territory } from "../models/Territory.entity";
import { Response } from "express";
import { Coordinates, TerritoryDto } from "../interfaces/common.interface";
import { validate } from "class-validator";
import { Address } from "../models/Address.entity";
import { Polygon } from "../models/Polygon.entity";
import { booleanPointInPolygon, point, polygon } from "@turf/turf";
import { TerritorySalesman } from "../models/TerritorySalesMan.entity";
import { In } from "typeorm";
import { GeocodingService } from "../utils/geoCode.service";
import { UserQuery } from "../query/user.query";
import { IJwtVerify } from "../interfaces/user.interface";

const geocodingService = new GeocodingService();
const userQuery = new UserQuery();

export class TerritoryService {
  async drawPolygon(data: {
    name: string;
    geometry: { type: string; coordinates: number[][][] };
    org_id: number;
    territory_id?: number;
    created_by: string;
  }): Promise<{
    status: number;
    data?: Polygon;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const existingPolygon = await queryRunner.manager.findOne(Polygon, {
        where: { name: data.name, org_id: data.org_id },
      });
      if (existingPolygon) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.CONFLICT,
          message: `Polygon with name ${data.name} already exists`,
        };
      }

      if (data.territory_id) {
        const territory = await queryRunner.manager.findOne(Territory, {
          where: {
            territory_id: data.territory_id,
            org_id: data.org_id,
            is_active: true,
          },
        });
        if (!territory) {
          await queryRunner.rollbackTransaction();
          return {
            status: httpStatusCodes.NOT_FOUND,
            message: "Territory not found",
          };
        }
      }

      const polygonEntity = new Polygon();
      polygonEntity.name = data.name;
      polygonEntity.geometry = data.geometry;
      polygonEntity.org_id = data.org_id;
      polygonEntity.created_by = data.created_by;
      polygonEntity.updated_by = data.created_by;

      const savedPolygon = await queryRunner.manager.save(
        Polygon,
        polygonEntity
      );

      if (data.territory_id) {
        await queryRunner.manager.update(
          Territory,
          { territory_id: data.territory_id },
          { polygon_id: savedPolygon.polygon_id }
        );
      }

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.CREATED,
        data: savedPolygon,
        message: "Polygon created successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to create polygon: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async assignTerritory(data: {
    postal_code?: string;
    subregion?: string;
    lat?: number;
    lng?: number;
    org_id: number;
  }): Promise<Territory | null> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const territories = await queryRunner.manager.find(Territory, {
        where: { org_id: data.org_id, is_active: true },
        relations: ["polygon"],
      });

      for (const territory of territories) {
        const postalCodes = JSON.parse(territory.postal_codes || "[]");
        const subregions = JSON.parse(territory.subregions || "[]");

        if (
          (data.postal_code && postalCodes.includes(data.postal_code)) ||
          (data.subregion && subregions.includes(data.subregion)) ||
          (data.lat &&
            data.lng &&
            territory.polygon?.geometry &&
            booleanPointInPolygon(
              point([data.lng, data.lat]),
              polygon(territory.polygon.geometry.coordinates)
            ))
        ) {
          await queryRunner.commitTransaction();
          return territory;
        }
      }

      await queryRunner.commitTransaction();
      return null;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return null;
    } finally {
      await queryRunner.release();
    }
  }

  async autoAssignTerritory(
    address_id: number,
    org_id: number
  ): Promise<{
    status: number;
    data?: Address;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const address = await queryRunner.manager.findOne(Address, {
        where: { address_id, org_id, is_active: true },
      });

      if (!address) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: `Address not found: ${address_id}`,
        };
      }

      const territory = await this.assignTerritory({
        postal_code: address.postal_code,
        subregion: address.subregion,
        lat: address.latitude,
        lng: address.longitude,
        org_id,
      });

      if (territory) {
        address.territory_id = territory.territory_id;
        address.polygon_id = territory.polygon_id;
        const updatedAddress = await queryRunner.manager.save(Address, address);
        await queryRunner.commitTransaction();
        return {
          status: httpStatusCodes.OK,
          data: updatedAddress,
          message: "Territory auto-assigned",
        };
      }

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: address,
        message: "No matching territory found",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("autoAssignTerritory - Error:", error.message, error.stack);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to auto-assign territory: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async assignByPostalCode(
    postal_code: string,
    territory_id: number,
    org_id: number
  ): Promise<{
    status: number;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const territory = await queryRunner.manager.findOne(Territory, {
        where: { territory_id, org_id, is_active: true },
      });
      if (!territory) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "Territory not found",
        };
      }

      await queryRunner.manager.update(
        Address,
        { postal_code, org_id },
        { territory_id, polygon_id: territory.polygon_id }
      );

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        message: "Territory assigned to addresses",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to assign territory: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async assignManagerToTerritory(
    userData: IJwtVerify,
    manager_id: number,
    territory_ids: number[]
  ): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      // Verify the manager exists and belongs to the organization
      const manager = await userQuery.getUserById(
        queryRunner.manager,
        userData.org_id,
        manager_id
      );
      if (!manager) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "Manager not found",
          data: null,
        };
      }

      // Validate territory_ids
      if (!territory_ids || territory_ids.length === 0) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "No territory IDs provided",
          data: null,
        };
      }

      // Fetch territories to ensure they exist and belong to the organization
      const territories = await queryRunner.manager.find(Territory, {
        where: {
          territory_id: In(territory_ids),
          org_id: userData.org_id,
          is_active: true,
        },
      });

      // Check if all provided territory_ids exist
      const foundTerritoryIds = territories.map((t) => t.territory_id);
      const missingIds = territory_ids.filter(
        (id) => !foundTerritoryIds.includes(id)
      );
      if (missingIds.length > 0) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: `Territories with IDs ${missingIds.join(
            ", "
          )} not found or do not belong to the organization`,
          data: null,
        };
      }

      // Update manager_id for each territory
      await queryRunner.manager.update(
        Territory,
        { territory_id: In(territory_ids) },
        {
          manager_id,
          updated_by: userData.user_id.toString(),
          updated_at: new Date(),
        }
      );

      // Fetch updated territories for response
      const updatedTerritories = await queryRunner.manager.find(Territory, {
        where: { territory_id: In(territory_ids) },
        relations: ["manager"],
      });

      await queryRunner.commitTransaction();

      return {
        status: httpStatusCodes.OK,
        data: updatedTerritories,
        message: "Manager assigned to territories successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to assign manager to territories: ${error.message}`,
        data: null,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async assignBySubregion(
    subregion: string,
    territory_id: number,
    org_id: number
  ): Promise<{
    status: number;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const territory = await queryRunner.manager.findOne(Territory, {
        where: { territory_id, org_id, is_active: true },
      });
      if (!territory) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "Territory not found",
        };
      }

      await queryRunner.manager.update(
        Address,
        { subregion, org_id },
        { territory_id, polygon_id: territory.polygon_id }
      );

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        message: "Territory assigned to addresses",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to assign territory: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async manualOverride(
    address_id: number,
    territory_id: number,
    org_id: number
  ): Promise<{
    status: number;
    data?: Address;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const address = await queryRunner.manager.findOneOrFail(Address, {
        where: { address_id, org_id },
      });

      const territory = await queryRunner.manager.findOne(Territory, {
        where: { territory_id, org_id, is_active: true },
      });
      if (!territory) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "Territory not found",
        };
      }

      address.territory_id = territory_id;
      address.polygon_id = territory.polygon_id;
      const updatedAddress = await queryRunner.manager.save(Address, address);
      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: updatedAddress,
        message: "Territory manually assigned",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to override territory: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async addTerritory(
    data: TerritoryDto,
    adminId: number,
    org_id: number
  ): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      // Check for existing territory
      const existing = await queryRunner.manager.findOne(Territory, {
        where: { name: data.name, org_id, is_active: true },
        select: ["territory_id"],
      });

      if (existing && data.salesmanIds?.length) {
        // Fetch all existing relationships in one query
        const salesmanIds = data.salesmanIds.map((id) => parseInt(id, 10));
        const existingRelations = await queryRunner.manager
          .createQueryBuilder(TerritorySalesman, "ts")
          .where(
            "ts.territory_id = :territoryId AND ts.salesman_id IN (:...salesmanIds)",
            {
              territoryId: existing.territory_id,
              salesmanIds,
            }
          )
          .getMany();

        // Identify new salesman IDs
        const existingSalesmanIds = new Set(
          existingRelations.map((rel) => rel.salesman_id)
        );
        const newTerritorySalesmen = salesmanIds
          .filter((id) => !existingSalesmanIds.has(id))
          .map((salesmanId) =>
            queryRunner.manager.create(TerritorySalesman, {
              territory_id: existing.territory_id,
              salesman_id: salesmanId,
            })
          );

        if (newTerritorySalesmen.length > 0) {
          await queryRunner.manager.save(
            TerritorySalesman,
            newTerritorySalesmen
          );
          await queryRunner.commitTransaction();
          return {
            status: httpStatusCodes.CREATED,
            message: `New salesman relationships added for territory ${data.name}`,
          };
        }

        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.CONFLICT,
          message: `All provided salesman IDs are already associated with territory ${data.name}`,
        };
      }

      if (existing) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.CONFLICT,
          message: `Territory with name ${data.name} already exists`,
        };
      }

      // Parse geometry early if provided
      let geometry: Coordinates[] | undefined;
      if (data.geometry) {
        geometry =
          typeof data.geometry === "string"
            ? JSON.parse(data.geometry)
            : data.geometry;
        if (!Array.isArray(geometry) || geometry.length === 0) {
          throw new Error("Invalid geometry format");
        }
      }

      // Fetch location data for geometry if provided
      let fetchedLocationData = {
        postal_codes: data.postal_codes || [],
        regions: data.regions || [],
        subregions: data.subregions || [],
      };
      let polygonId: number | undefined;

      if (geometry) {
        fetchedLocationData =
          await geocodingService.getLocationDataFromCoordinates(geometry);
        const polygon = queryRunner.manager.create(Polygon, {
          name: data.name,
          org_id,
          created_by: adminId.toString(),
          updated_by: adminId.toString(),
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                ...geometry.map((coord) => [coord.lng, coord.lat]),
                [geometry[0].lng, geometry[0].lat],
              ],
            ],
          },
        });
        const savedPolygon = await queryRunner.manager.save(Polygon, polygon);
        polygonId = savedPolygon.polygon_id;
      }

      // Create territory
      const territory = queryRunner.manager.create(Territory, {
        name: data.name,
        postal_codes: JSON.stringify(
          fetchedLocationData.postal_codes.length > 0
            ? fetchedLocationData.postal_codes
            : data.postal_codes || []
        ),
        subregions: JSON.stringify(
          fetchedLocationData.subregions.length > 0
            ? fetchedLocationData.subregions
            : data.subregions || []
        ),
        regions: JSON.stringify(
          fetchedLocationData.regions.length > 0
            ? fetchedLocationData.regions
            : data.regions || []
        ),
        org_id,
        manager_id: data.manager_id ?? undefined,
        polygon_id: polygonId,
        is_active: true,
        created_by: adminId.toString(),
        updated_by: adminId.toString(),
      });

      const savedTerritory = await queryRunner.manager.save(
        Territory,
        territory
      );

      // Handle salesmanIds
      if (data.salesmanIds?.length) {
        const territorySalesmen = data.salesmanIds.map((salesmanId) =>
          queryRunner.manager.create(TerritorySalesman, {
            territory_id: savedTerritory.territory_id,
            salesman_id: parseInt(salesmanId, 10),
          })
        );
        await queryRunner.manager.save(TerritorySalesman, territorySalesmen);
      }

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.CREATED,
        data: savedTerritory,
        message: "Territory created successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to create territory: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async updateTerritory(
    territoryId: number,
    data: Partial<TerritoryDto>,
    adminId: number
  ): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const territory = await queryRunner.manager.findOne(Territory, {
        where: {
          territory_id: territoryId,
          org_id: data.org_id,
          is_active: true,
        },
      });
      if (!territory) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "Territory not found",
        };
      }

      const territoryData = new TerritoryDto();
      Object.assign(territoryData, { ...territory, ...data });
      const validationErrors = await validate(territoryData);
      if (validationErrors.length) {
        const errorMsg = validationErrors
          .map((e) => Object.values(e.constraints || {}).join(", "))
          .join("; ");
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: `Validation failed: ${errorMsg}`,
        };
      }

      if (data.name && data.name !== territory.name) {
        const existing = await queryRunner.manager.findOne(Territory, {
          where: { name: data.name, org_id: data.org_id, is_active: true },
        });
        if (existing && existing.territory_id !== territoryId) {
          await queryRunner.rollbackTransaction();
          return {
            status: httpStatusCodes.CONFLICT,
            message: `Territory with name ${data.name} already exists`,
          };
        }
      }

      await queryRunner.manager.update(
        Territory,
        { territory_id: territoryId },
        {
          name: data.name || territory.name,
          postal_codes: data.postal_codes
            ? JSON.stringify(data.postal_codes)
            : territory.postal_codes,
          subregions: data.subregions
            ? JSON.stringify(data.subregions)
            : territory.subregions,
          polygon_id:
            (data.polygon_id ?? territory.polygon_id) !== undefined
              ? data.polygon_id ?? territory.polygon_id
              : undefined,
          manager_id: data.manager_id ?? territory.manager_id,
          updated_by: adminId.toString(),
          updated_at: new Date(),
        }
      );

      const updatedTerritory = await queryRunner.manager.findOne(Territory, {
        where: { territory_id: territoryId },
      });

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: updatedTerritory,
        message: "Territory updated successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to update territory: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async deleteTerritory(
    territoryId: number,
    adminId: number
  ): Promise<{
    status: number;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const territory = await queryRunner.manager.findOne(Territory, {
        where: { territory_id: territoryId, is_active: true },
      });
      if (!territory) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "Territory not found",
        };
      }

      await queryRunner.manager.update(
        Territory,
        { territory_id: territoryId },
        {
          is_active: false,
          updated_by: adminId.toString(),
          updated_at: new Date(),
        }
      );

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        message: "Territory deleted successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to delete territory: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async getTerritoryById(territoryId: number): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const dataSource = await getDataSource();
    try {
      const territory = await dataSource.manager.findOne(Territory, {
        where: { territory_id: territoryId, is_active: true },
        relations: ["polygon"],
      });
      if (!territory) {
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "Territory not found",
        };
      }

      return {
        status: httpStatusCodes.OK,
        data: territory,
        message: "Territory retrieved successfully",
      };
    } catch (error: any) {
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to retrieve territory: ${error.message}`,
      };
    }
  }

  async getAllTerritories(org_id: number): Promise<{
    status: number;
    data?: any[] | null;
    message: string;
  }> {
    const dataSource = await getDataSource();
    try {
      const territories = await dataSource.manager.find(Territory, {
        where: { is_active: true, org_id },
        relations: ["polygon"],
      });
      if (!territories.length) {
        return {
          status: httpStatusCodes.OK,
          data: [],
          message: "No territories found",
        };
      }
      const territoryIds = territories.map((t) => t.territory_id);
      const territorySalesmen = await dataSource.manager.find(
        TerritorySalesman,
        {
          where: { territory_id: In(territoryIds) },
          relations: ["salesman"],
        }
      );
      const territoriesWithSalesmen = territories.map((territory) => {
        const salesmen = territorySalesmen
          .filter((ts) => ts.territory_id === territory.territory_id)
          .map((ts) => ts.salesman);
        return {
          ...territory,
          salesmen: salesmen.length ? salesmen : [],
        };
      });

      return {
        status: httpStatusCodes.OK,
        data: territoriesWithSalesmen,
        message: "Territories retrieved successfully",
      };
    } catch (error: any) {
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to retrieve territories: ${error.message}`,
        data: null,
      };
    }
  }
}