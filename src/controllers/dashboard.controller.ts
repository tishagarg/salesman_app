import { Response } from "express";
import { DashboardService } from "../service/dashboard.service";
import { ApiResponse } from "../utils/api.response";

const dashboardService = new DashboardService();
export class DashboardController {
  async getDashboard(req: any, res: Response): Promise<void> {
    const { org_id, user_id, role } = req.user;
    const response = await dashboardService.getDashboard(
      org_id,
      user_id,
      role.role_name
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
}
