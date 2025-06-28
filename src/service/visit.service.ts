import { getDataSource } from "../config/data-source";
import { Leads } from "../models/Leads.entity";
import { Visit } from "../models/Visits.entity";
import { Route } from "../models/Route.entity";
import { ManagerSalesRep } from "../models/ManagerSalesRep.entity";
import { Idempotency } from "../models/Idempotency";
import httpStatusCodes from "http-status-codes";
import {
  Between,
  DeepPartial,
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
import { FollowUp } from "../models/FollowUp.entity";
import { FollowUpVisit } from "../models/FollowUpVisit.entity";
import { ContractImage } from "../models/ContractImage.entity";
import { LeadStatus } from "../enum/leadStatus";

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
  check_out_time?: Date;
  latitude?: number;
  longitude?: number;
  created_by: string;
  is_active?: boolean;
  notes?: string;
  contract_id?: number;
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
    signatureFile: any;
    contract_template_id: number;
    parsedMetaData: Record<string, string>;
  }): Promise<{ data: any; status: number; message: string }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const dataSource = await getDataSource();
      const visitRepo = dataSource.getRepository(Visit);
      const contractRepo = dataSource.getRepository(Contract);
      const templateRepo = dataSource.getRepository(ContractTemplate);
      const visit = await visitRepo.findOne({
        where: { visit_id: payload.visit_id },
        relations: { contract: true },
      });
      if (!visit) {
        await queryRunner.rollbackTransaction();
        return {
          data: null,
          message: "Visit not found",
          status: 404,
        };
      }
      if (visit.contract !== null) {
        await queryRunner.rollbackTransaction();
        return {
          data: null,
          message: "Contract already signed",
          status: 400,
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
      const renderedHtml = renderContract(
        template.content,
        payload.parsedMetaData
      );
      const contract = contractRepo.create({
        contract_template_id: template.id,
        visit_id: visit.visit_id,
        rendered_html: renderedHtml,
        metadata: payload.parsedMetaData,
      });

      const savedContract = await contractRepo.save(contract);
      await dataSource.getRepository(ContractImage).save({
        contract_id: savedContract.id,
        image_url: payload.signatureFile?.location,
        metadata: payload.signatureFile,
      });
      visit.contract = contract;
      await visitRepo.save(visit);
      const newContract = await dataSource
        .getRepository(Contract)
        .findOne({ where: { id: contract.id }, relations: { images: true } });
      await queryRunner.commitTransaction();
      return {
        data: newContract,
        message: "Contract signed successfully",
        status: 200,
      };
    } catch (error) {
      console.log(error)
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
          timestamp: Date.now(),
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

  // async getPastVisits():Promise<{data:any, status:number, message:string}>{}
  private async handleVisit(
    queryRunner: QueryRunner,
    visitData: VisitData,
    uncompletedVisit?: Visit
  ): Promise<Visit> {
    if (uncompletedVisit) {
      uncompletedVisit.check_in_time = visitData.check_in_time;
      if (visitData.check_out_time !== undefined) {
        uncompletedVisit.check_out_time = visitData.check_out_time;
      }

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
        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(23, 59, 59, 999);

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

        const updatedUncompletedLeads = uncompletedVisits
          .map((visit) => {
            if (
              visit.lead &&
              visit.lead.is_active &&
              !visit.lead.pending_assignment &&
              visit.lead.address?.latitude &&
              visit.lead.address?.longitude
            ) {
              return {
                ...visit.lead,
                updatedVisit: {
                  ...visit,
                  check_in_time: new Date(), // will be overwritten later
                },
              };
            }
            return null;
          })
          .filter((lead): lead is NonNullable<typeof lead> => lead !== null);

        // Get all valid customers
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
          (c) => c.address?.latitude && c.address?.longitude
        );

        // Fetch today's follow-up leads
        const followUpLeadsRaw = await queryRunner.manager
          .createQueryBuilder(FollowUp, "fu")
          .leftJoin(FollowUpVisit, "fuv", "fu.follow_up_id = fuv.follow_up_id")
          .leftJoin(Visit, "v", "fuv.visit_id = v.visit_id")
          .select("v.lead_id", "lead_id")
          .where("fu.scheduled_date BETWEEN :start AND :end", {
            start: startOfDay,
            end: endOfDay,
          })
          .andWhere("fu.is_completed = false")
          .getRawMany();

        const followUpLeadIds = followUpLeadsRaw.map((f) => f.lead_id);
        const followUpLeads = validCustomers.filter((c) =>
          followUpLeadIds.includes(c.lead_id)
        );

        // Combine all leads with priority: uncompleted > follow-ups > others
        const leadsMap = new Map<number, Leads>();

        updatedUncompletedLeads.forEach((lead) =>
          leadsMap.set(lead.lead_id, lead)
        );
        followUpLeads.forEach((lead) => {
          if (!leadsMap.has(lead.lead_id)) leadsMap.set(lead.lead_id, lead);
        });
        validCustomers.forEach((lead) => {
          if (!leadsMap.has(lead.lead_id)) leadsMap.set(lead.lead_id, lead);
        });

        const leadsToPlan = Array.from(leadsMap.values()).slice(0, 10);

        if (!leadsToPlan.length) {
          return {
            status: httpStatusCodes.OK,
            data: null,
            message: "No valid leads available for visit planning",
          };
        }

        const leadIds = leadsToPlan.map((lead) => lead.lead_id);
        if (new Set(leadIds).size !== leadIds.length) {
          return {
            status: httpStatusCodes.BAD_REQUEST,
            data: null,
            message: "Duplicate leads detected in visit planning",
          };
        }

        const waypoints = leadsToPlan.map(
          (lead) => `${lead.address.latitude},${lead.address.longitude}`
        );

        const origin = `${repAddress?.address.latitude},${repAddress?.address.longitude}`;
        const { route, waypointOrder } = await this.getOptimizedRoute(
          origin,
          waypoints
        );

        let currentTime = new Date(date);
        currentTime.setHours(9, 0, 0, 0);

        const previousVisitMap = new Map(
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
            previousVisitMap.get(lead.lead_id) ?? undefined
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

        // Update or create route
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

        // Save idempotency
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
        console.log(error);
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
    contract_id?: number;
    notes?: string;
    photos?: any;
    followUps?:
      | string
      | { subject: string; notes?: string; scheduled_date?: string }[];
    status: LeadStatus;
  }): Promise<{ status: number; data?: any; message: string }> {
    return await this.withTransaction(async (queryRunner) => {
      try {
        let followUps: {
          subject: string;
          notes?: string;
          scheduled_date?: string;
        }[] = [];

        if (typeof data.followUps === "string") {
          try {
            followUps = JSON.parse(data.followUps);
          } catch (e) {
            console.error("Invalid followUps JSON");
            followUps = [];
          }
        } else if (Array.isArray(data.followUps)) {
          followUps = data.followUps;
        }

        const customer = await queryRunner.manager.findOne(Leads, {
          where: {
            lead_id: data.lead_id,
            assigned_rep_id: data.rep_id,
          },
        });

        if (!customer) {
          return {
            data: null,
            status: 404,
            message: "Customer not assigned to rep",
          };
        }

        const existingVisit = await queryRunner.manager.findOne(Visit, {
          where: {
            lead_id: Equal(data.lead_id),
            check_in_time: MoreThanOrEqual(this.getStartOfDay()),
            check_out_time: IsNull(),
          },
        });
        const photo_url = data.photos?.map((p: any) => {
          return p.location;
        });
        const visitData: VisitData = {
          lead_id: data.lead_id,
          rep_id: data.rep_id,
          check_in_time: existingVisit?.check_in_time ?? new Date(),
          check_out_time: new Date(),
          latitude: data.latitude,
          longitude: data.longitude,
          contract_id: data.contract_id,
          notes: data.notes,
          created_by: data.rep_id.toString(),
          photo_urls: photo_url || [],
        };

        const visit = await this.handleVisit(
          queryRunner,
          visitData,
          existingVisit ?? undefined
        );

        await queryRunner.manager
          .getRepository(Leads)
          .update(customer.lead_id, {
            lead_id: customer.lead_id,
            is_visited: true,
            status: data.status,
          });

        for (const followUp of followUps) {
          const parsedDate = followUp.scheduled_date
            ? new Date(followUp.scheduled_date)
            : null;

          const followUpData: DeepPartial<FollowUp> = {
            subject: followUp.subject,
            notes: followUp.notes ?? "",
            scheduled_date:
              parsedDate instanceof Date && !isNaN(parsedDate.getTime())
                ? parsedDate
                : undefined,
            is_completed: false,
            created_by: data.rep_id,
          };

          const newFollowUp = queryRunner.manager.create(
            FollowUp,
            followUpData
          );
          const savedFollowUp = await queryRunner.manager.save(
            FollowUp,
            newFollowUp
          );

          await queryRunner.manager.save(FollowUpVisit, {
            follow_up_id: savedFollowUp.follow_up_id,
            visit_id: visit.visit_id,
          });
        }
        return {
          status: httpStatusCodes.OK,
          data: visit,
          message: "Visit and follow-up(s) logged successfully",
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
    today.setHours(0, 0, 0, 0);
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
    const routeRepository = dataSource.getRepository(Route);
    const existingRoute = await routeRepository.findOne({
      where: { rep_id: Equal(repId), route_date: Equal(today) },
    });

    if (existingRoute) {
      return await routeRepository.update(
        { route_id: existingRoute.route_id },
        {
          route_order: routeOrder,
          updated_at: new Date(),
          created_by: createdBy,
          is_active: true,
        }
      );
    } else {
      // Create new route
      return await routeRepository.save({
        rep_id: repId,
        route_date: today,
        route_order: routeOrder,
        created_by: createdBy,
        created_at: new Date(),
        is_active: true,
      });
    }
  }

  async getRouteForToday(repId: number, date: Date): Promise<Route[]> {
    const dataSource = await getDataSource();
    return await dataSource.getRepository(Route).find({
      where: { rep_id: Equal(repId), route_date: Equal(date), is_active: true },
    });
  }

  async updateRoute(repId: number, date: Date, routeOrder: RouteOrderItem[]) {
    const dataSource = await getDataSource();
    return await dataSource.getRepository(Route).update(
      { rep_id: Equal(repId), route_date: Equal(date) },
      {
        route_order: routeOrder,
        updated_at: new Date(),
        is_active: true,
      }
    );
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
      let currentTime = new Date();
      const skippedLeads: any[] = [];
      const routeOrder: RouteOrderItem[] = [];
      for (let i = 0; i < waypointOrder.length; i++) {
        const index = waypointOrder[i];
        const visit = validVisits[index];
        const leg = route.legs[i];
        if (!leg?.distance?.value || !leg?.duration?.value) {
          console.warn(`Skipping invalid route leg at index ${i}`);
          continue;
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
      await this.saveRoute(repId, today, routeOrder, String(managerId));
      const routes = await this.getRouteForToday(repId, today);

      return {
        status: httpStatusCodes.OK,
        data: routes,
        message: skippedLeads.length
          ? "Daily route optimized with some leads skipped due to invalid route data"
          : "Daily route optimized successfully",
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
        where: { rep_id: repId, route_date: today },
        relations: { rep: true },
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
