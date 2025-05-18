import { Response } from "express";
import httpStatusCodes from "http-status-codes";
import { TerritoryService } from "../service/territory.service";
import { TerritoryDto } from "../interfaces/common.interface";

export class TerritoryController {
  private territoryService = new TerritoryService();

  async addTerritory(req: any, res: Response): Promise<void> {
    const data: TerritoryDto = req.body;
    const { user_id } = req.user;
    if (!user_id) {
       res
        .status(httpStatusCodes.UNAUTHORIZED)
        .json({ message: "User not authenticated" });
    }

    const result = await this.territoryService.addTerritory(
      data,
      parseInt(user_id)
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

    const result = await this.territoryService.updateTerritory(
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

    const result = await this.territoryService.deleteTerritory(
      territoryId,
      parseInt(userId)
    );
    res.status(result.status).json(result);
  }

  async getTerritoryById(req: any, res: Response): Promise<void> {
    const territoryId = parseInt(req.params.id);
    const result = await this.territoryService.getTerritoryById(territoryId);
    res.status(result.status).json(result);
  }

  async getAllTerritories(req: any, res: Response): Promise<void> {
    const result = await this.territoryService.getAllTerritories();
    res.status(result.status).json(result);
  }

  async drawPolygon(req: any, res: Response):Promise<void> {
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

    const result = await this.territoryService.drawPolygon({
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

    const result = await this.territoryService.assignByPostalCode(
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

    const result = await this.territoryService.assignBySubregion(
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

    const result = await this.territoryService.manualOverride(
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

    const result = await this.territoryService.autoAssignTerritory(
      address_id,
      org_id
    );
    res.status(result.status).json(result);
  }
}
