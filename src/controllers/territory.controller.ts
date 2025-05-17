import { Response } from "express";
import { TerritoryService } from "../service/territory.service";
import { ApiResponse } from "../utils/api.response";
import { TerritoryDto } from "../interfaces/common.interface";

const territoryService = new TerritoryService();

export class TerritoryController {
  async addTerritory(req: any, res: Response): Promise<void> {
    const data: TerritoryDto = req.body;
    const adminId = req.user.user_id;
    console.log("addTerritory - Request:", { data, adminId });

    const response = await territoryService.addTerritory(data, adminId);
    console.log("addTerritory - Response:", response);

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

  async updateTerritory(req: any, res: Response): Promise<void> {
    const territoryId = parseInt(req.params.id, 10);
    const data: Partial<TerritoryDto> = req.body;
    const adminId = req.user.user_id;
    console.log("updateTerritory - Request:", { territoryId, data, adminId });

    const response = await territoryService.updateTerritory(
      territoryId,
      data,
      adminId
    );
    console.log("updateTerritory - Response:", response);

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

  async deleteTerritory(req: any, res: Response): Promise<void> {
    const territoryId = parseInt(req.params.id, 10);
    const adminId = req.user.user_id;
    console.log("deleteTerritory - Request:", { territoryId, adminId });

    const response = await territoryService.deleteTerritory(
      territoryId,
      adminId
    );
    console.log("deleteTerritory - Response:", response);

    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(res, {}, response.status, null, response.message);
  }

  async getTerritoryById(req: any, res: Response): Promise<void> {
    const territoryId = parseInt(req.params.id, 10);
    console.log("getTerritoryById - Request:", { territoryId });

    const response = await territoryService.getTerritoryById(territoryId);
    console.log("getTerritoryById - Response:", response);

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
    console.log("getAllTerritories - Request received");

    const response = await territoryService.getAllTerritories();
    console.log("getAllTerritories - Response:", response);

    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(
      res,
      response.data ? response.data : null,
      response.status,
      null,
      response.message
    );
  }
}
