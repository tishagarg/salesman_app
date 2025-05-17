import httpStatusCodes from "http-status-codes";
import dataSource from "../config/data-source";
import { Territory } from "../models/Territory.entity";
import { Response } from "express";
import { TerritoryDto } from "../interfaces/common.interface";
import { validate } from "class-validator";

export class TerritoryService {
  async assignTerritory(data: {
    postal_code: string;
    city: string;
    lat: number;
    lng: number;
  }) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const territories = await queryRunner.manager.find(Territory, {});
      for (const territory of territories) {
        const postalCodes = JSON.parse(territory.postal_codes || "[]");
        const subregions = JSON.parse(territory.subregions || "[]");
        if (
          postalCodes.includes(data.postal_code) ||
          subregions.includes(data.city)
        ) {
          await queryRunner.commitTransaction();
          return territory;
        }
      }
      await queryRunner.commitTransaction();
      return null; // Unassigned
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return null;
    } finally {
      await queryRunner.release();
    }
  }
  async addTerritory(
    data: TerritoryDto,
    adminId: number
  ): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      // Validate input
      const territoryData = new TerritoryDto();
      Object.assign(territoryData, data);
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

      // Check for duplicate territory name
      const existing = await queryRunner.manager.findOne(Territory, {
        where: { name: data.name, is_active: true },
      });
      if (existing) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.CONFLICT,
          message: `Territory with name ${data.name} already exists`,
        };
      }

      // Create territory
      const territory = await queryRunner.manager.save(Territory, {
        name: data.name,
        postal_codes: JSON.stringify(data.postal_codes || []),
        subregions: JSON.stringify(data.subregions || []),
        is_active: true,
        created_by: adminId.toString(),
        created_at: new Date(),
        updated_by: adminId.toString(),
        updated_at: new Date(),
      });

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.CREATED,
        data: territory,
        message: "Territory created successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("addTerritory - Error:", error.message);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to create territory: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  // Update an existing territory
  async updateTerritory(
    territoryId: number,
    data: Partial<TerritoryDto>,
    adminId: number
  ): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      // Find the territory
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

      // Validate updated data
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

      // Check for duplicate name (if updated)
      if (data.name && data.name !== territory.name) {
        const existing = await queryRunner.manager.findOne(Territory, {
          where: { name: data.name, is_active: true },
        });
        if (existing && existing.territory_id !== territoryId) {
          await queryRunner.rollbackTransaction();
          return {
            status: httpStatusCodes.CONFLICT,
            message: `Territory with name ${data.name} already exists`,
          };
        }
      }

      // Update territory
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
      console.error("updateTerritory - Error:", error.message);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to update territory: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  // Soft-delete a territory
  async deleteTerritory(
    territoryId: number,
    adminId: number
  ): Promise<{
    status: number;
    message: string;
  }> {
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
      console.error("deleteTerritory - Error:", error.message);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to delete territory: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  // Get a territory by ID
  async getTerritoryById(territoryId: number): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    try {
      const territory = await dataSource.manager.findOne(Territory, {
        where: { territory_id: territoryId, is_active: true },
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
      console.error("getTerritoryById - Error:", error.message);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to retrieve territory: ${error.message}`,
      };
    }
  }

  // Get all active territories
  async getAllTerritories(): Promise<{
    status: number;
    data?: any[] | null;
    message: string;
  }> {
    try {
      const territories = await dataSource.manager.find(Territory, {
        where: { is_active: true },
      });

      return {
        status: httpStatusCodes.OK,
        data: territories,
        message: "Territories retrieved successfully",
      };
    } catch (error: any) {
      console.error("getAllTerritories - Error:", error.message);

      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to retrieve territories: ${error.message}`,
        data: null,
      };
    }
  }
}
