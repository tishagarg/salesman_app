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
    const response = {
      status: 200,
      success: true,
      data: [
        {
          lead_id: 19,
          name: "John Doe w23",
          latitude: 61.18156080000001,
          visit_id: 223,
          longitude: 28.7483584,
          address: "Anninkuja 12, IMATRA,  55120",
          eta: "12:00 PM",
          distance: 257.33,
        },
        {
          lead_id: 36,
          visit_id: 218,
          latitude: 60.5715457,
          longitude: 27.145331,
          distance: 143.49,
          eta: "10:40 AM",
        },
        {
          lead_id: 25,
          visit_id: 219,
          latitude: 60.5711244,
          longitude: 27.1454998,
          distance: 0.28,
          eta: "10:41 AM",
        },
        {
          lead_id: 28,
          visit_id: 220,
          latitude: 60.5776285,
          longitude: 27.1430465,
          distance: 0.88,
          eta: "10:43 AM",
        },
      ],
      message: "Retrieved successfully",
    };
    // const response = await visitService.getDailyRoute(rep_id);
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
