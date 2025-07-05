import { Response } from "express";
import { VisitService } from "../service/visit.service";
import { ApiResponse } from "../utils/api.response";
import { Leads } from "../models/Leads.entity";
import { Between, In, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { Visit } from "../models/Visits.entity";
import { Route } from "../models/Route.entity";
import { ManagerSalesRep } from "../models/ManagerSalesRep.entity";
import { getDataSource } from "../config/data-source";
import { Roles } from "../enum/roles";
import { Role } from "../models/Role.entity";
import { User } from "../models/User.entity";
import { LeadStatus } from "../enum/leadStatus";

const visitService = new VisitService();

export class VisitController {
  async planVisit(req: any, res: Response): Promise<void> {
    const user_id = req.user.user_id;
    const { latitude, longitude, lead_ids } = req.body;
    const response = await visitService.planVisit(
      user_id,
      latitude,
      longitude,
      lead_ids
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

  async submitVisitWithContract(req: any, res: Response): Promise<void> {
    const { visit_id, contract_template_id, metadata } = req.body;
    const signatureFile = req.file;
    let parsedMetaData;
    try {
      parsedMetaData =
        typeof metadata === "string" ? JSON.parse(metadata) : metadata;
    } catch (error) {
      console.error("Error parsing metadata:", error);
      return ApiResponse.error(res, 400, "Invalid metadata format");
    }
    const contract = await visitService.submitVisitWithContract({
      visit_id,
      signatureFile,
      contract_template_id,
      parsedMetaData,
    });
    if (contract.status >= 400) {
      return ApiResponse.error(res, contract.status, contract.message);
    }
    return ApiResponse.result(
      res,
      contract.data,
      contract.status,
      null,
      contract.message
    );
  }

  async logVisit(req: any, res: Response): Promise<void> {
    const { lead_id, latitude, longitude, notes, followUps, status } = req.body;
    const rep_id = req.user.user_id;
    const photos = req.files;
    if (!lead_id || !latitude || !longitude) {
      return ApiResponse.error(
        res,
        400,
        "Missing required fields: lead_id, latitude, or longitude"
      );
    }
    let parsedFollowUps: any[] | undefined = undefined;

    if (
      followUps &&
      typeof followUps === "string" &&
      followUps !== "undefined" &&
      followUps !== "null"
    ) {
      try {
        parsedFollowUps = JSON.parse(followUps);
      } catch (e) {
        return ApiResponse.error(res, 400, "Invalid followUps JSON");
      }
    }
    const data = {
      lead_id: parseInt(lead_id),
      rep_id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      notes: notes || undefined,
      photos: photos || undefined,
      parsedFollowUps,
      status,
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
  async getPastVisits(req: any, res: Response): Promise<void> {
    try {
      const dataSource = await getDataSource();
      const visitRepo = dataSource.getRepository(Visit);

      const {
        from,
        to,
        page = 1,
        limit = 10,
        order = "DESC",
        lead_id,
        status,
      } = req.query as {
        from?: string;
        to?: string;
        page?: number;
        limit?: number;
        order?: string;
        lead_id?: number;
        status?: LeadStatus;
      };

      const user_id = req.user.user_id;
      const safeOrder = order?.toUpperCase() === "ASC" ? "ASC" : "DESC";
      const statuses = ["Signed", "Not Available", "Not Interested"];
      const visitQuery = visitRepo
        .createQueryBuilder("visit")
        .leftJoinAndSelect("visit.lead", "l")
        .leftJoinAndSelect("l.address", "a")
        .leftJoinAndSelect("visit.contract", "c")
        .leftJoinAndSelect("visit.followUpVisits", "fv")
        .leftJoinAndSelect("fv.followUp", "f")
        .where("l.status IN (:...statuses)", { statuses })
        .andWhere(
          "(f.scheduled_date < :now OR visit.check_out_time IS NOT NULL)",
          { now: new Date() }
        )
        .andWhere("visit.rep_id = :repId", { repId: user_id });

      // Optional lead or status filters
      if (lead_id) {
        visitQuery.andWhere("visit.lead_id = :lead_id", { lead_id });
      }

      if (status) {
        visitQuery.andWhere("l.status = :status", { status });
      }

      // Handle time filtering on check-in or follow-up scheduled date
      if (from && to) {
        visitQuery.andWhere(
          `(visit.check_in_time BETWEEN :from AND :to OR f.scheduled_date BETWEEN :from AND :to)`,
          { from: new Date(from), to: new Date(to) }
        );
      } else if (from) {
        visitQuery.andWhere(
          `(visit.check_in_time >= :from OR f.scheduled_date >= :from)`,
          { from: new Date(from) }
        );
      } else if (to) {
        visitQuery.andWhere(
          `(visit.check_in_time <= :to OR f.scheduled_date <= :to)`,
          { to: new Date(to) }
        );
      }

      // Pagination + ordering
      visitQuery
        .orderBy("visit.check_in_time", safeOrder)
        .skip((+page - 1) * +limit)
        .take(+limit);

      const [visits, total] = await visitQuery.getManyAndCount();
      return ApiResponse.result(res, visits, 200, null, "Past Visits", {
        totalItems: total,
        currentPage: +page,
        totalPages: Math.ceil(total / +limit),
        previousPage: +page > 1 ? +page - 1 : null,
        nextPage: +page < Math.ceil(total / +limit) ? +page + 1 : null,
      });
    } catch (error) {
      console.error("Error in getPastVisits:", error);
      return ApiResponse.error(res, 500, "Failed to retrieve visits");
    }
  }
}
