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
}
