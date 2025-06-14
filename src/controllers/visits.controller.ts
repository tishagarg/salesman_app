import { Response } from "express";
import { VisitService } from "../service/visit.service";
import { ApiResponse } from "../utils/api.response";
import { Leads } from "../models/Leads.entity";
import { In, MoreThanOrEqual } from "typeorm";
import { Visit } from "../models/Visits.entity";
import { Route } from "../models/Route.entity";
import { Role, User } from "../models";
import { ManagerSalesRep } from "../models/ManagerSalesRep.entity";
import { getDataSource } from "../config/data-source";
import { Roles } from "../enum/roles";

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
    const { lead_id, latitude, longitude, notes } = req.body;
    const rep_id = req.user.user_id;
    const files = req.files as Express.Multer.File[];
    if (!lead_id || !latitude || !longitude) {
      return ApiResponse.error(
        res,
        400,
        "Missing required fields: lead_id, latitude, or longitude"
      );
    }

    const data = {
      lead_id: parseInt(lead_id),
      rep_id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      notes: notes || undefined,
      photos: files || undefined, // Pass the uploaded files
    };

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
    const { latitude, longitude } = req.query;
    console.log("Query params:", { latitude, longitude });

    const parsedLatitude =
      typeof latitude === "string" ? parseFloat(latitude) : Number(latitude);
    const parsedLongitude =
      typeof longitude === "string" ? parseFloat(longitude) : Number(longitude);
    const response = await visitService.refreshDailyRoute(
      rep_id,
      parsedLatitude,
      parsedLongitude
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
  getToday = async (): Promise<Date> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log(today);
    return today;
  };

  async getDailyRouteAdmin(req: any, res: Response): Promise<void> {
    const roleId = req.user.role_id;
    try {
      const dataSource = await getDataSource();
      let reps: User[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const role = await dataSource
        .getRepository(Role)
        .findOne({ where: { role_id: roleId } });
      let data;
      if (role?.role_name == Roles.ADMIN) {
        const routes = await dataSource
          .getRepository(Route)
          .find({ where: { route_date: today } });
        const visits = await dataSource
          .getRepository(Visit)
          .find({ where: { created_at: MoreThanOrEqual(today) } });
        data = { routes: routes, visits: visits };
      }
      return ApiResponse.result(
        res,
        data ?? null,
        200,
        null,
        "Daily routes and visits retrieved successfully"
      );
    } catch (error: any) {
      return ApiResponse.error(
        res,
        500,
        error.message || "Failed to retrieve daily routes and visits"
      );
    }
  }
}
