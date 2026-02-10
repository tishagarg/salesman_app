import { Response } from "express";
import httpStatusCodes from "http-status-codes";
import { TerritoryService } from "../service/territory.service";
import { TerritoryDto } from "../interfaces/common.interface";
import { ApiResponse } from "../utils/api.response";
import { IJwtVerify } from "../interfaces/user.interface";
import { Territory } from "../models/Territory.entity";
import { TerritorySalesman } from "../models/TerritorySalesMan.entity";
import { getDataSource } from "../config/data-source";

const territoryService = new TerritoryService();
export class TerritoryController {
  async addTerritory(req: any, res: Response): Promise<void> {
    const data: TerritoryDto = req.body;
    const { user_id, org_id } = req.user;
    const result = await territoryService.addTerritory(
      data,
      parseInt(user_id),
      org_id
    );
    res.status(result.status).json(result);
  }

  async unAssignSalesManFromTerritory(req: any, res: Response): Promise<void> {
    const dataSource = await getDataSource();
    const { territory_id, salesRepIds } = req.body;
    if (
      !territory_id ||
      !Array.isArray(salesRepIds) ||
      salesRepIds.length === 0
    ) {
      res.status(400).json({
        message:
          "Invalid request. Please provide territory_id and salesRepIds.",
      });
      return;
    }

    // Enforce one-to-one: only process the first salesman ID
    if (salesRepIds.length > 1) {
      res.status(400).json({
        message:
          "Only one salesman can be assigned to a territory. Please provide a single salesman ID.",
      });
      return;
    }

    const territorySalesmanRepo = dataSource.getRepository(TerritorySalesman);
    const territoryRepo = dataSource.getRepository(Territory);

    try {
      const salesman_id = salesRepIds[0];
      
      // Delete the one-to-one relationship
      const deleteResult = await territorySalesmanRepo.delete({ 
        territory_id, 
        salesman_id 
      });

      if (deleteResult.affected === 0) {
        res.status(404).json({
          message: `No assignment found for salesman ${salesman_id} in territory ${territory_id}.`,
        });
        return;
      }

      // With one-to-one constraint, after unassigning, the territory will have no salesman
      // Optionally delete the territory if no salesman is assigned
      const remainingSalesmen = await territorySalesmanRepo.find({
        where: { territory_id },
      });

      if (remainingSalesmen.length === 0) {
        // Optionally delete territory if no salesman is assigned
        // Uncomment the following lines if you want to auto-delete territories without salesmen
        // await territoryRepo.update(
        //   { territory_id },
        //   { is_active: false }
        // );
        res.status(200).json({
          message: `Salesman unassigned from territory (ID: ${territory_id}). Territory now has no assigned salesman.`,
        });
      } else {
        res.status(200).json({
          message: `Salesman unassigned from territory (ID: ${territory_id}).`,
        });
      }
    } catch (error) {
      console.error("Error in unAssignSalesManFromTerritory:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  }

  async updateTerritory(req: any, res: Response): Promise<void> {
    const territoryId = parseInt(req.params.id);
    const data: Partial<TerritoryDto> = req.body;
    const userId = req.user?.user_id;
    if (!userId) {
      res
        .status(httpStatusCodes.UNAUTHORIZED)
        .json({ message: "User not authenticated" });
    }

    const result = await territoryService.updateTerritory(
      territoryId,
      data,
      parseInt(userId)
    );
    res.status(result.status).json(result);
  }

  async deleteTerritory(req: any, res: Response): Promise<void> {
    const territoryId = parseInt(req.params.id);
    const userId = req.user?.user_id;
    if (!userId) {
      res
        .status(httpStatusCodes.UNAUTHORIZED)
        .json({ message: "User not authenticated" });
    }

    const result = await territoryService.deleteTerritory(
      territoryId,
      parseInt(userId)
    );
    res.status(result.status).json(result);
  }

  async getTerritoryById(req: any, res: Response): Promise<void> {
    const territoryId = parseInt(req.params.id);
    const result = await territoryService.getTerritoryById(territoryId);
    res.status(result.status).json(result);
  }
  async assignManagerToTerritory(req: any, res: Response): Promise<void> {
    let { user_id, org_id } = req.user;
    const { manager_id, territory_ids } = req.body;
    const response = await territoryService.assignManagerToTerritory(
      { user_id, org_id } as IJwtVerify,
      manager_id,
      territory_ids
    );
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }
    return ApiResponse.result(
      res,
      response.data,
      response.status,
      null,
      response.message
    );
  }
  async getAllTerritories(req: any, res: Response): Promise<void> {
    const { org_id } = req.user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const salesmanId = req.query.salesmanId
      ? parseInt(req.query.salesmanId)
      : undefined;

    const result = await territoryService.getAllTerritories({
      org_id,
      skip,
      limit,
      page,
      salesmanId,
    });
    if (result.status >= 400) {
      return ApiResponse.error(res, result.status, result.message);
    }
    return ApiResponse.result(
      res,
      result.data ?? null,
      result.status,
      null,
      result.message,
      {
        currentPage: page,
        totalItems: result.total,
        totalPages: Math.ceil((result.total || 0) / limit),
        previousPage: page > 1 ? page - 1 : null,
        nextPage: result.total && page * limit < result.total ? page + 1 : null,
      }
    );
  }

  async drawPolygon(req: any, res: Response): Promise<void> {
    const { name, geometry, org_id, territory_id } = req.body;
    const userId = req.user?.user_id;
    if (!userId) {
      res
        .status(httpStatusCodes.UNAUTHORIZED)
        .json({ message: "User not authenticated" });
    }

    if (!name || !geometry || !org_id) {
      res
        .status(httpStatusCodes.BAD_REQUEST)
        .json({ message: "Missing required fields" });
    }

    const result = await territoryService.drawPolygon({
      name,
      geometry,
      org_id,
      territory_id,
      created_by: userId,
    });
    res.status(result.status).json(result);
  }

  async assignByPostalCode(req: any, res: Response): Promise<void> {
    const { postal_code, territory_id, org_id } = req.body;
    if (!postal_code || !territory_id || !org_id) {
      res
        .status(httpStatusCodes.BAD_REQUEST)
        .json({ message: "Missing required fields" });
    }

    const result = await territoryService.assignByPostalCode(
      postal_code,
      territory_id,
      org_id
    );
    res.status(result.status).json(result);
  }

  async assignBySubregion(req: any, res: Response): Promise<void> {
    const { subregion, territory_id, org_id } = req.body;
    if (!subregion || !territory_id || !org_id) {
      res
        .status(httpStatusCodes.BAD_REQUEST)
        .json({ message: "Missing required fields" });
    }

    const result = await territoryService.assignBySubregion(
      subregion,
      territory_id,
      org_id
    );
    res.status(result.status).json(result);
  }

  async manualOverride(req: any, res: Response): Promise<void> {
    const { address_id, territory_id, org_id } = req.body;
    if (!address_id || !territory_id || !org_id) {
      res
        .status(httpStatusCodes.BAD_REQUEST)
        .json({ message: "Missing required fields" });
    }

    const result = await territoryService.manualOverride(
      address_id,
      territory_id,
      org_id
    );
    res.status(result.status).json(result);
  }

  async autoAssignTerritory(req: any, res: Response): Promise<void> {
    const dataSource = await getDataSource();
    const queryRunner = await dataSource.createQueryRunner();
    try {
      const { address_id, org_id } = req.body;
      if (!address_id || !org_id) {
        res
          .status(httpStatusCodes.BAD_REQUEST)
          .json({ message: "Missing required fields" });
        return;
      }

      const result = await territoryService.autoAssignTerritory(
        address_id,
        org_id,
        queryRunner
      );
      res.status(result.status).json(result);
    } finally {
      await queryRunner.release();
    }
  }
}
