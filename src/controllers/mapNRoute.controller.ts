import { Response } from "express";
import { MapService } from "../service/map.service";
import { ApiResponse } from "../utils/api.response";

const mapRouteService = new MapService();
export class MapAndRouteController {
  async getCustomerMap(req: any, res: Response): Promise<void> {
    const user_id = req.user.user_id;
    const response = await mapRouteService.getCustomerMap(user_id);
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
}
