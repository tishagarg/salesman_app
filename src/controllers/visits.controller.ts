import { Response } from "express";
import { VisitService } from "../service/visit.service";
import { ApiResponse } from "../utils/api.response";

const visitService = new VisitService();
export class VisitController {
  async planVisit(req: any, res: Response): Promise<void> {
    const data = req.body;
    const user_id = req.user.user_id;
    const response = await visitService.planVisit(data, user_id);
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

  async logVisit(req: any, res: Response): Promise<void> {
    const data = req.body;
    const response = await visitService.logVisit(data);
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

  async getDailyRoute(req: any, res: Response): Promise<void> {
    console.log(req.user);
    const rep_id = req.user.user_id;

    const response = await visitService.getDailyRoute(rep_id);
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

  async refreshDailyRoute(req: any, res: Response): Promise<void> {
    const rep_id = req.user.user_id;
    const response = await visitService.refreshDailyRoute(rep_id);
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
  async planDailyVisits(req: any, res: Response): Promise<void> {
    const { rep_id, date } = req.body;
    console.log(req.user)
    const manager_id = req.user.user_id;
    const user_role = req.user.role_id;
    const isManagerOrAdmin = [1, 2].includes(user_role);
    if (!isManagerOrAdmin) {
      return ApiResponse.error(
        res,
        403,
        "Only Managers or Admins can plan visits"
      );
    }
    if (!rep_id) {
      return ApiResponse.error(res, 400, "rep_id is required");
    }
    const visitDate = date ? new Date(date) : new Date();
    if (isNaN(visitDate.getTime())) {
      return ApiResponse.error(res, 400, "Invalid date format");
    }

    const response = await visitService.planDailyVisits(
      rep_id,
      manager_id,
      visitDate
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
