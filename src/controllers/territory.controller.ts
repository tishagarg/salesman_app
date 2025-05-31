import { Response } from "express";
import httpStatusCodes from "http-status-codes";
import { TerritoryService } from "../service/territory.service";
import { TerritoryDto } from "../interfaces/common.interface";
import { ApiResponse } from "../utils/api.response";
import { IJwtVerify } from "../interfaces/user.interface";

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
    const result = await territoryService.getAllTerritories(org_id);
    res.status(result.status).json(result);
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
    const { address_id, org_id } = req.body;
    if (!address_id || !org_id) {
      res
        .status(httpStatusCodes.BAD_REQUEST)
        .json({ message: "Missing required fields" });
    }

    const result = await territoryService.autoAssignTerritory(
      address_id,
      org_id
    );
    res.status(result.status).json(result);
  }
}
