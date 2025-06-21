import { getDataSource } from "../config/data-source";
import { Leads } from "../models/Leads.entity";
import { Visit } from "../models/Visits.entity";
import { Route } from "../models/Route.entity";
import { ManagerSalesRep } from "../models/ManagerSalesRep.entity";
import { Idempotency } from "../models/Idempotency";
import httpStatusCodes from "http-status-codes";
import {
  Between,
  Double,
  Equal,
  IsNull,
  LessThan,
  MoreThanOrEqual,
  QueryRunner,
} from "typeorm";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { Contract } from "../models/Contracts.entity";
import { ContractTemplate } from "../models/ContractTemplate.entity";
import { renderContract } from "../utils/renderContracts";
import { Address } from "../models/Address.entity";
import { User } from "../models/User.entity";

require("dotenv").config();

interface RouteOrderItem {
  lead_id: number;
  latitude?: number;
  longitude?: number;
  distance: number;
  eta: string;
  visit_id: number;
}

interface VisitData {
  lead_id: number;
  rep_id: number;
  check_in_time: Date;
  latitude?: number;
  longitude?: number;
  created_by: string;
  is_active?: boolean;
  notes?: string;
  photo_urls?: string[];
}

interface DirectionsResult {
  route: any;
  waypointOrder: number[];
}

export class VisitService {
  private async withTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>
  ): Promise<T> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction("SERIALIZABLE");
    try {
      const result = await operation(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private handleError(
    error: any,
    defaultMessage: string
  ): { status: number; message: string } {
    if (error.code === "40001") {
      return {
        status: httpStatusCodes.CONFLICT,
        message: "Concurrent transaction conflict, please retry",
      };
    }
    if (error.code === "23505") {
      return { status: httpStatusCodes.BAD_REQUEST, message: error.message };
    }
    return {
      status: httpStatusCodes.BAD_REQUEST,
      message: error.message || defaultMessage,
    };
  }

  private getStartOfDay(date: Date = new Date()): Date {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
  }

  private async logQuery(queryBuilder: any): Promise<void> {
    const sql = await queryBuilder.getSql();
  }
  async submitVisitWithContract(payload: {
    visit_id: number;
    contract_template_id: number;
    metadata: Record<string, string>;
  }): Promise<{ data: any; status: number; message: string }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const dataSource = await getDataSource();
      const visitRepo = dataSource.getRepository(Visit);
      const contractRepo = dataSource.getRepository(Contract);
      const templateRepo = dataSource.getRepository(ContractTemplate);
      const visit = await visitRepo.findOneBy({ visit_id: payload.visit_id });
      if (!visit) {
        await queryRunner.rollbackTransaction();
        return {
          data: null,
          message: "Visit not found",
          status: 404,
        };
      }
      if (visit.contract !== null) {
        return {
          data: null,
          message: "Contract already signed",
          status: 200,
        };
      }
      const template = await templateRepo.findOneBy({
        id: payload.contract_template_id,
      });
      if (!template) {
        await queryRunner.rollbackTransaction();

        return {
          data: null,
          message: "Contract template not found",
          status: 404,
        };
      }
      const renderedHtml = renderContract(template.content, payload.metadata);
      const contract = contractRepo.create({
        contract_template_id: template.id,
        visit_id: visit.visit_id,
        rendered_html: renderedHtml,
        metadata: payload.metadata,
      });
      await contractRepo.save(contract);
      visit.contract = contract;
      await visitRepo.save(visit);
      await queryRunner.commitTransaction();

      return {
        data: contract,
        message: "Contract signed successfully",
        status: 200,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        data: null,
        message: "Error signing the contract",
        status: 500,
      };
    } finally {
      await queryRunner.release();
    }
  }
  private async getOptimizedRoute(
    origin: string,
    waypoints: string[]
  ): Promise<DirectionsResult> {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin,
          destination: waypoints[waypoints.length - 1],
          waypoints: `optimize:true|${waypoints.join("|")}`,
          key: process.env.GOOGLE_MAPS_API_KEY,
          departure_time: "now",
        },
      }
    );
    const data = response.data;
    if (data.status !== "OK") {
      throw new Error(
        data.status === "ZERO_RESULTS"
          ? "No valid route found. Check waypoint distances or coordinates."
          : `Google Maps Directions API error: ${data.status}`
      );
    }
    return {
      route: data.routes[0],
      waypointOrder: data.routes[0].waypoint_order,
    };
  }

  private async handleVisit(
    queryRunner: QueryRunner,
    visitData: VisitData,
    uncompletedVisit?: Visit
  ): Promise<Visit> {
    if (uncompletedVisit) {
      uncompletedVisit.check_in_time = visitData.check_in_time;
      if (visitData.latitude !== undefined) {
        uncompletedVisit.latitude = visitData.latitude;
      }
      if (visitData.longitude !== undefined) {
        uncompletedVisit.longitude = visitData.longitude;
      }
      uncompletedVisit.created_by = visitData.created_by;
      if (visitData.notes) uncompletedVisit.notes = visitData.notes;
      if (visitData.photo_urls) {
        uncompletedVisit.photo_urls = [
          ...(Array.isArray(uncompletedVisit.photo_urls)
            ? uncompletedVisit.photo_urls
            : uncompletedVisit.photo_urls
            ? JSON.parse(uncompletedVisit.photo_urls)
            : []),
          ...visitData.photo_urls,
        ];
      }
      const visit = await queryRunner.manager.save(Visit, uncompletedVisit);
      return visit;
    }
    const visit = await queryRunner.manager.save(Visit, {
      ...visitData,
      is_active: true,
    });
    return visit;
  }

  async planDailyVisits(
    repId: number,
    managerId: number,
    date: Date = new Date(),
    idempotencyKey: string = uuidv4()
  ): Promise<{ status: number; data?: any; message: string }> {
    return await this.withTransaction(async (queryRunner) => {
      try {
        const startOfDay = this.getStartOfDay(date);

        // Check idempotency
        const existingIdempotency = await queryRunner.manager.findOne(
          Idempotency,
          {
            where: { key: idempotencyKey },
          }
        );

        if (existingIdempotency) {
          return {
            status: httpStatusCodes.OK,
            data: existingIdempotency.result,
            message: "Request already processed",
          };
        }

        // Get existing visits and route
        const existingVisits = await queryRunner.manager.find(Visit, {
          where: {
            rep_id: Equal(repId),
            check_in_time: MoreThanOrEqual(startOfDay),
            is_active: true,
          },
        });
        const repAddress = await queryRunner.manager
          .getRepository(User)
          .findOne({ where: { user_id: repId }, relations: { address: true } });

        const existingRoute = await queryRunner.manager.findOne(Route, {
          where: { rep_id: Equal(repId), route_date: Equal(startOfDay) },
          lock: { mode: "pessimistic_write" },
        });

        // Fetch uncompleted visits
        const uncompletedVisits = await queryRunner.manager.find(Visit, {
          where: {
            rep_id: Equal(repId),
            check_in_time: LessThan(startOfDay),
            check_out_time: IsNull(),
            is_active: true,
          },
          relations: ["lead", "lead.address"],
        });

        const uncompletedLeads = uncompletedVisits
          .map((visit) => visit.lead)
          .filter(
            (lead) =>
              lead &&
              lead.is_active &&
              !lead.pending_assignment &&
              lead.address?.latitude &&
              lead.address?.longitude
          );

        // Fetch all assigned leads
        const allCustomers = await queryRunner.manager.find(Leads, {
          where: {
            assigned_rep_id: Equal(repId),
            is_active: true,
            pending_assignment: false,
          },
          relations: ["address"],
          order: { created_at: "ASC" },
        });
        const validCustomers = allCustomers.filter(
          (customer) =>
            customer.address?.latitude && customer.address?.longitude
        );

        if (!validCustomers.length && !uncompletedLeads.length) {
          return {
            status: httpStatusCodes.OK,
            data: null,
            message: "No valid customer addresses for visit planning",
          };
        }

        const leadIdsToExclude = uncompletedLeads.map((lead) => lead.lead_id);
        const newLeads = validCustomers.filter(
          (customer) => !leadIdsToExclude.includes(customer.lead_id)
        );
        const maxLeadsPerDay = 10;
        const leadsToPlan = [
          ...uncompletedLeads,
          ...newLeads.slice(0, maxLeadsPerDay - uncompletedLeads.length),
        ].slice(0, maxLeadsPerDay);

        if (!leadsToPlan.length) {
          return {
            status: httpStatusCodes.OK,
            data: null,
            message: "No leads available for visit planning",
          };
        }

        const leadIds = leadsToPlan.map((lead) => lead.lead_id);
        if (new Set(leadIds).size !== leadIds.length) {
          return {
            status: httpStatusCodes.OK,
            data: null,
            message: "Duplicate leads detected in visit planning",
          };
        }

        // Generate optimized route
        const waypoints = leadsToPlan.map(
          (lead) => `${lead.address.latitude},${lead.address.longitude}`
        );
        const repLocation = {
          latitude: repAddress?.address.latitude,
          longitude: repAddress?.address.longitude,
        };
        const origin = `${repLocation.latitude},${repLocation.longitude}`;
        const { route, waypointOrder } = await this.getOptimizedRoute(
          origin,
          waypoints
        );

        // Plan visits
        let currentTime = new Date(date);
        currentTime.setHours(9, 0, 0, 0);

        const uncompletedVisitsMap = new Map(
          [...uncompletedVisits, ...existingVisits].map((visit) => [
            visit.lead_id,
            visit,
          ])
        );

        const routeOrder: RouteOrderItem[] = [];
        const visits: Visit[] = [];

        for (let i = 0; i < waypointOrder.length; i++) {
          const index = waypointOrder[i];
          const lead = leadsToPlan[index];
          const leg = route.legs[i];
          const duration = leg.duration.value / 60;
          currentTime = new Date(currentTime.getTime() + duration * 60000);
          const eta = currentTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          const visitData: VisitData = {
            lead_id: lead.lead_id,
            rep_id: repId,
            check_in_time: currentTime,
            latitude: lead.address.latitude,
            longitude: lead.address.longitude,
            created_by: managerId.toString(),
          };

          const visit = await this.handleVisit(
            queryRunner,
            visitData,
            uncompletedVisitsMap.get(lead.lead_id) ?? undefined
          );
          visits.push(visit);

          routeOrder.push({
            lead_id: lead.lead_id,
            visit_id: visit.visit_id,
            latitude: lead.address.latitude,
            longitude: lead.address.longitude,
            distance: Number((leg.distance.value / 1000).toFixed(2)),
            eta,
          });
        }

        // Upsert route
        let routeEntity;
        if (existingRoute) {
          existingRoute.route_order = routeOrder;
          existingRoute.updated_by = managerId.toString();
          existingRoute.updated_at = new Date();
          routeEntity = await queryRunner.manager.save(existingRoute);
        } else {
          routeEntity = await queryRunner.manager.save(Route, {
            rep_id: repId,
            route_date: startOfDay,
            route_order: routeOrder,
            created_by: managerId.toString(),
          });
        }

        // Save idempotency record
        await queryRunner.manager.save(Idempotency, {
          key: idempotencyKey,
          result: { visits, route: routeEntity },
        });

        return {
          status: httpStatusCodes.OK,
          data: { visits, route: routeEntity },
          message: "Daily visits planned successfully",
        };
      } catch (error: any) {
        throw this.handleError(error, "Failed to plan daily visits");
      }
    });
  }

  async planVisit(
    data: { lead_id: number; rep_id: number; date: Date },
    managerId: number
  ): Promise<{ status: number; data?: any; message: string }> {
    return await this.withTransaction(async (queryRunner) => {
      try {
        const customer = await queryRunner.manager.findOne(Leads, {
          where: {
            lead_id: Equal(data.lead_id),
            assigned_rep_id: Equal(data.rep_id),
          },
          relations: ["address"],
        });
        if (!customer) {
          throw new Error("Customer not assigned to rep");
        }
        await this.logQuery(
          queryRunner.manager
            .createQueryBuilder(Visit, "visit")
            .leftJoinAndSelect("visit.lead", "lead")
            .where("visit.lead_id = :leadId", { leadId: data.lead_id })
            .andWhere("visit.rep_id = :repId", { repId: data.rep_id })
            .andWhere("visit.check_out_time IS NULL")
            .andWhere("visit.is_active = :isActive", { isActive: true })
        );
        const uncompletedVisit = await queryRunner.manager.findOne(Visit, {
          where: {
            lead_id: Equal(data.lead_id),
            rep_id: Equal(data.rep_id),
            check_out_time: IsNull(),
            is_active: true,
          },
          relations: ["lead", "lead.address"],
        });

        const visitData: VisitData = {
          lead_id: data.lead_id,
          rep_id: data.rep_id,
          check_in_time: data.date,
          latitude: customer.address?.latitude,
          longitude: customer.address?.longitude,
          created_by: managerId.toString(),
        };
        const visit = await this.handleVisit(
          queryRunner,
          visitData,
          uncompletedVisit ?? undefined
        );

        return {
          status: httpStatusCodes.OK,
          data: visit,
          message: "Visit planned successfully",
        };
      } catch (error: any) {
        throw this.handleError(error, "Failed to plan visit");
      }
    });
  }

  async logVisit(data: {
    lead_id: number;
    rep_id: number;
    latitude: number;
    longitude: number;
    notes?: string;
    photos?: Express.Multer.File[];
  }): Promise<{ status: number; data?: any; message: string }> {
    return await this.withTransaction(async (queryRunner) => {
      try {
        const customer = await queryRunner.manager.findOne(Leads, {
          where: {
            lead_id: Equal(data.lead_id),
            assigned_rep_id: Equal(data.rep_id),
          },
        });
        if (!customer) {
          return {
            data: null,
            status: 404,
            message: "Customer not assigned to rep",
          };
        }

        // Check existing visit
        const existingVisit = await queryRunner.manager.findOne(Visit, {
          where: {
            lead_id: Equal(data.lead_id),
            check_in_time: MoreThanOrEqual(this.getStartOfDay()),
            check_out_time: IsNull(),
          },
        });

        const visitData: VisitData = {
          lead_id: data.lead_id,
          rep_id: data.rep_id,
          check_in_time: new Date(),
          latitude: data.latitude,
          longitude: data.longitude,
          notes: data.notes,
          created_by: data.rep_id.toString(),
          photo_urls: [],
        };
        const visit = await this.handleVisit(
          queryRunner,
          visitData,
          existingVisit ?? undefined
        );
        await queryRunner.manager.update(
          Leads,
          { lead_id: customer.lead_id },
          { is_visited: true }
        );

        return {
          status: httpStatusCodes.OK,
          data: visit,
          message: "Visit logged successfully",
        };
      } catch (error: any) {
        console.log(error);
        throw this.handleError(error, "Failed to log visit");
      }
    });
  }
  private isValidCoordinate(value: any, type: string): boolean {
    if (typeof value !== "number" || isNaN(value)) {
      return false;
    }
    const absValue = Math.abs(value);
    return type === "latitude" ? absValue <= 90 : absValue <= 180;
  }
  private getToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Midnight IST
    return today;
  }
  private async getManagerAssignment(
    repId: number
  ): Promise<ManagerSalesRep | null> {
    const dataSource = await getDataSource();
    return dataSource.manager.findOne(ManagerSalesRep, {
      where: { sales_rep_id: repId },
      select: ["manager_id"],
    });
  }

  private async deleteRoute(repId: number, today: Date): Promise<void> {
    const dataSource = await getDataSource();
    await dataSource.manager.delete(Route, {
      rep_id: repId,
      route_date: today,
    });
  }
  private async getVisitsForToday(
    repId: number,
    today: Date
  ): Promise<Visit[]> {
    const dataSource = await getDataSource();
    return dataSource.manager.find(Visit, {
      where: {
        rep_id: Equal(repId),
        check_in_time: Between(
          today,
          new Date(today.getTime() + 24 * 60 * 60 * 1000)
        ),
        is_active: true,
      },
      relations: ["lead", "lead.address"],
    });
  }
  private async saveRoute(
    repId: number,
    today: Date,
    routeOrder: RouteOrderItem[],
    createdBy: string
  ): Promise<any> {
    const dataSource = await getDataSource();
    const existingRoute = await dataSource.manager.findOne(Route, {
      where: { rep_id: Equal(repId), route_date: Equal(today) },
    });
    return dataSource.manager.save(Route, {
      ...existingRoute,
      rep_id: repId,
      route_date: today,
      route_order: routeOrder,
      created_by: createdBy,
      updated_at: existingRoute ? new Date() : undefined,
    });
  }

  async generateDailyRoute(
    repId: number,
    repLatitude: number,
    repLongitude: number,
    managerId: number
  ): Promise<{ status: number; data?: any; message: string }> {
    try {
      // Parse and validate inputs
      const latitude = parseFloat(String(repLatitude));
      const longitude = parseFloat(String(repLongitude));
      const today = this.getToday();
      const visits = await this.getVisitsForToday(repId, today);
      if (!visits.length) {
        return {
          status: httpStatusCodes.OK,
          message: "No visits assigned for today to optimize",
          data: [],
        };
      }
      const validVisits = visits.filter(
        (visit) =>
          visit.lead?.address?.latitude && visit.lead?.address?.longitude
      );
      if (!validVisits.length) {
        throw new Error("No valid visit addresses for route optimization");
      }
      const origin = `${latitude},${longitude}`;
      const waypoints = validVisits.map(
        (visit) =>
          `${visit.lead.address.latitude},${visit.lead.address.longitude}`
      );
      const { route, waypointOrder } = await this.getOptimizedRoute(
        origin,
        waypoints
      );
      let currentTime = new Date(today);
      const routeOrder: RouteOrderItem[] = [];
      for (let i = 0; i < waypointOrder.length; i++) {
        ("inside the waypoints for loop");
        const index = waypointOrder[i];
        const visit = validVisits[index];
        const leg = route.legs[i];
        if (!leg?.distance?.value || !leg?.duration?.value) {
          throw new Error(`Invalid route leg at index ${i}`);
        }
        const distance = leg.distance.value / 1000;
        const duration = leg.duration.value / 60;
        currentTime = new Date(currentTime.getTime() + duration * 60000);
        const eta = currentTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        routeOrder.push({
          lead_id: visit.lead_id,
          latitude: visit.latitude,
          longitude: visit.longitude,
          visit_id: visit.visit_id,
          distance: Number(distance.toFixed(2)),
          eta,
        });
      }
      const routes = await this.saveRoute(
        repId,
        today,
        routeOrder,
        String(managerId)
      );
      return {
        status: httpStatusCodes.OK,
        data: routes,
        message: "Daily route optimized successfully",
      };
    } catch (error: any) {
      return this.handleError(error, "Failed to optimize daily route");
    }
  }

  async refreshDailyRoute(
    repId: number,
    latitude: number,
    longitude: number
  ): Promise<{ status: number; data?: any; message: string }> {
    try {
      if (!this.isValidCoordinate(latitude, "latitude")) {
        throw new Error(`Invalid latitude: ${latitude}`);
      }
      if (!this.isValidCoordinate(longitude, "longitude")) {
        throw new Error(`Invalid longitude: ${longitude}`);
      }

      const today = this.getToday();
      const managerAssignment = await this.getManagerAssignment(repId);
      if (
        !managerAssignment ||
        !Number.isInteger(managerAssignment.manager_id)
      ) {
        throw new Error(`No valid manager assigned for repId: ${repId}`);
      }
      const managerId = managerAssignment.manager_id;
      await this.deleteRoute(repId, today);
      return await this.generateDailyRoute(
        repId,
        latitude,
        longitude,
        managerId
      );
    } catch (error: any) {
      return this.handleError(error, "Failed to refresh daily route");
    }
  }
  async getDailyRoute(
    repId: number
  ): Promise<{ status: number; data?: any; message: string }> {
    const dataSource = await getDataSource();
    try {
      const today = this.getStartOfDay();
      const route = await dataSource.manager.findOne(Route, {
        where: { rep_id: Equal(repId), route_date: Equal(today) },
        relations: ["rep"],
      });
      if (!route) {
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "No route found for today",
        };
      }

      const routeDetails = await Promise.all(
        (route.route_order as RouteOrderItem[]).map(async (item) => {
          const customer = await dataSource.manager.findOne(Leads, {
            where: { lead_id: Equal(item.lead_id) },
            relations: ["address"],
          });
          return {
            lead_id: item.lead_id,
            name: customer?.name || "anonymous",
            latitude: customer?.address?.latitude,
            visit_id: item.visit_id,
            longitude: customer?.address?.longitude,
            address: customer?.address
              ? `${customer.address.street_address || ""}, ${
                  customer.address.city || ""
                }, ${customer.address.state || ""} ${
                  customer.address.postal_code || ""
                }`
              : null,
            eta: item.eta,
            distance: item.distance,
          };
        })
      );

      return {
        status: httpStatusCodes.OK,
        data: routeDetails,
        message: "Retrieved successfully",
      };
    } catch (error: any) {
      return this.handleError(error, "Failed to retrieve daily route");
    }
  }
}
