import { Response } from "express";
import { VisitService } from "../service/visit.service";
import { ApiResponse } from "../utils/api.response";
import { Leads } from "../models/Leads.entity";
import { Between, In, MoreThanOrEqual } from "typeorm";
import { Visit } from "../models/Visits.entity";
import { Route } from "../models/Route.entity";
import { ManagerSalesRep } from "../models/ManagerSalesRep.entity";
import { getDataSource } from "../config/data-source";
import { Roles } from "../enum/roles";
import { Role } from "../models/Role.entity";
import { User } from "../models/User.entity";

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

  async submitVisitWithContract(req: any, res: Response): Promise<void> {
    const { visit_id, contract_template_id, metadata } = req.body;

    const contract = await visitService.submitVisitWithContract({
      visit_id,
      contract_template_id,
      metadata,
    });
    if (contract.status >= 400) {
      ApiResponse.error(res, contract.status, contract.message);
    }
    ApiResponse.result(res, contract, contract.status, null, contract.message);
  }

  async logVisit(req: any, res: Response): Promise<void> {
    const { lead_id, latitude, longitude, notes, followUps } = req.body;
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
      photos: files || undefined,
      followUps: followUps || [],
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

  async getAllVisits(req: any, res: Response): Promise<void> {
    try {
      const dataSource = await getDataSource();
      const visitRepo = dataSource.getRepository(Visit);
      const managerSalesRepRepo = dataSource.getRepository(ManagerSalesRep);
      const {
        salesRepId,
        managerId,
        visitDate,
        sortBy = "check_in_time",
        sortOrder = "DESC",
        page = 1,
        limit = 10,
      } = req.query;

      const where: any = {};
      if (salesRepId) {
        where.rep = { user_id: +salesRepId };
      }
      if (managerId) {
        const salesReps = await managerSalesRepRepo.find({
          where: { manager_id: +managerId },
          select: ["sales_rep_id"],
        });
        const salesRepIds = salesReps.map((rep) => rep.sales_rep_id);

        if (salesRepIds.length === 0) {
          return ApiResponse.result(
            res,
            {
              data: [],
              total: 0,
              page: +page,
              limit: +limit,
              totalPages: 0,
            },
            200,
            null,
            "No visits found for manager"
          );
        }
        where.rep = {
          ...where.rep,
          user_id: In(salesRepIds),
        };
      }
      if (visitDate) {
        const date = new Date(visitDate);
        const nextDate = new Date(visitDate);
        nextDate.setDate(nextDate.getDate() + 1);
        where.check_in_time = Between(date, nextDate);
      }
      const order: any = {};
      if (
        sortBy === "check_in_time" ||
        sortBy === "lead_id" ||
        sortBy === "sales_rep"
      ) {
        order[sortBy === "sales_rep" ? "rep.user_id" : sortBy] =
          sortOrder.toUpperCase();
      } else {
        order.check_in_time = "DESC";
      }
      const [visits, total] = await visitRepo.findAndCount({
        where,
        relations: {
          lead: true,
          rep: true,
          contract: true,
        },
        order,
        skip: (+page - 1) * +limit,
        take: +limit,
      });

      return ApiResponse.result(
        res,
        {
          data: visits,
          total,
          page: +page,
          limit: +limit,
          totalPages: Math.ceil(total / +limit),
        },
        200,
        null,
        "Visit history"
      );
    } catch (error) {
      console.error(error);
      return ApiResponse.error(res, 500, "Failed to retrieve visits");
    }
  }

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
