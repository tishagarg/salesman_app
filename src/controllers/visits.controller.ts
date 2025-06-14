import { Response } from "express";
import { VisitService } from "../service/visit.service";
import { ApiResponse } from "../utils/api.response";
import { Leads } from "../models/Leads.entity";
import { In, MoreThanOrEqual } from "typeorm";
import { Visit } from "../models/Visits.entity";
import { Route } from "../models/Route.entity";
import { User } from "../models";
import { ManagerSalesRep } from "../models/ManagerSalesRep.entity";
import { getDataSource } from "../config/data-source";

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
  async getDailyRouteAdmin(req: any, res: Response): Promise<void> {
    const managerId = req.user.user_id;
    const roleId = req.user.role_id;
    const repId = req.query.rep_id ? parseInt(req.query.rep_id) : null;
    const date = req.query.date ? new Date(req.query.date) : new Date();
    date.setHours(0, 0, 0, 0);

    try {
      const dataSource = await getDataSource();
      let reps: User[] = [];

      if (roleId === 1) {
        // Admin (role_id: 1) can access all representatives
        if (repId) {
          const rep = await dataSource.getRepository(User).findOne({
            where: { user_id: repId, role_id: 9, is_active: true },
          });
          if (rep) reps.push(rep);
          else {
            return ApiResponse.error(res, 404, "Representative not found");
          }
        } else {
          reps = await dataSource.getRepository(User).find({
            where: { role_id: 9, is_active: true },
          });
        }
      } else {
        // Manager (other role_ids) follows existing logic
        if (repId) {
          const managerRep = await dataSource
            .getRepository(ManagerSalesRep)
            .findOne({
              where: { manager_id: managerId, sales_rep_id: repId },
            });
          if (!managerRep) {
            return ApiResponse.error(
              res,
              403,
              "Representative not under your management"
            );
          }
          const rep = await dataSource.getRepository(User).findOne({
            where: { user_id: repId, role_id: 9, is_active: true },
          });
          if (rep) reps.push(rep);
        } else {
          const managerReps = await dataSource
            .getRepository(ManagerSalesRep)
            .find({
              where: { manager_id: managerId },
            });
          const repIds = managerReps.map((mr) => mr.sales_rep_id);
          reps = await dataSource.getRepository(User).find({
            where: { user_id: In(repIds), role_id: 9, is_active: true },
          });
        }
      }

      if (!reps.length) {
        return ApiResponse.error(res, 404, "No active representatives found");
      }

      // Fetch routes and visits for each representative
      const result = await Promise.all(
        reps.map(async (rep) => {
          // Get daily route
          const route = await dataSource.manager.findOne(Route, {
            where: { rep_id: rep.user_id, route_date: date },
            relations: ["rep"],
          });

          // Get visits for the day
          const visits = await dataSource.manager.find(Visit, {
            where: {
              rep_id: rep.user_id,
              check_in_time: MoreThanOrEqual(date),
            },
            relations: ["lead", "lead.address"],
          });

          // Format route details
          let routeDetails: any[] = [];
          if (route && route.route_order) {
            routeDetails = await Promise.all(
              route.route_order.map(
                async (item: {
                  lead_id: number;
                  eta: string;
                  distance: number;
                }) => {
                  const customer = await dataSource.manager.findOne(Leads, {
                    where: { lead_id: item.lead_id },
                    relations: ["address"],
                  });
                  return {
                    lead_id: item.lead_id,
                    name: customer?.name || "Unknown",
                    address: customer?.address
                      ? `${customer.address.street_address}, ${customer.address.city}, ${customer.address.state} ${customer.address.postal_code}`
                      : undefined,
                    eta: item.eta,
                    distance: item.distance,
                  };
                }
              )
            );
          }

          // Format visit details
          const visitDetails = visits.map((visit) => ({
            visit_id: visit.visit_id,
            lead_id: visit.lead_id,
            customer_name: visit.lead?.name || "Unknown",
            address: visit.lead?.address
              ? `${visit.lead.address.street_address}, ${visit.lead.address.city}, ${visit.lead.address.state} ${visit.lead.address.postal_code}`
              : undefined,
            check_in_time: visit.check_in_time,
            latitude: visit.latitude,
            longitude: visit.longitude,
            notes: visit.notes,
            status: visit.is_active ? "Active" : "Completed",
          }));

          return {
            rep_id: rep.user_id,
            rep_name: rep.full_name || `Rep ${rep.user_id}`, // Changed from full_name to name to match User entity
            route: routeDetails.length ? routeDetails : null,
            visits: visitDetails,
          };
        })
      );

      return ApiResponse.result(
        res,
        result,
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
