import { getDataSource } from "../config/data-source"; // Updated import
import { Role } from "../models/Role.entity";
import { Leads } from "../models/Leads.entity";
import { Visit } from "../models/Visits.entity";
import httpStatusCodes from "http-status-codes";
import { In, IsNull, Not } from "typeorm";
import { isEmpty } from "class-validator";
import { getCurrentMonthData } from "../utils/workingDays";
import { LeadStatus } from "../enum/leadStatus";

export class DashboardService {
  async getDashboard(
    orgId: number,
    userId: number,
    role_id: number
  ): Promise<{ status: number; message: string; data: any }> {
    const dataSource = await getDataSource();
    const visitRepo = dataSource.getRepository(Visit);
    const leadsRepo = dataSource.getRepository(Leads);

    try {
      // Run queries in parallel
      const [
        unVisitedLeads,
        visitedLeads,
        totalLeads,
        signedLeads,
        unSignedLeads,
        calender,
      ] = await Promise.all([
        leadsRepo.count({
          where: {
            status: In([LeadStatus.Prospect, LeadStatus.Start_Signing]),
            assigned_rep_id: userId,
          },
        }),
        leadsRepo.count({
          where: {
            status: Not(In([LeadStatus.Prospect, LeadStatus.Start_Signing])),
            assigned_rep_id: userId,
          },
        }),
        leadsRepo.count({
          where: { assigned_rep_id: userId },
        }),
        leadsRepo.count({
          where: {
            status: LeadStatus.Signed,
            assigned_rep_id: userId,
          },
        }),
        leadsRepo.count({
          where: {
            status: Not(In([LeadStatus.Signed])),
            assigned_rep_id: userId,
          },
        }),
        getCurrentMonthData(),
      ]);

      return {
        status: httpStatusCodes.OK,
        message: "Dashboard data retrieved successfully",
        data: {
          unSignedLeads,
          signedLeads,
          totalLeads,
          unVisitedLeads,
          visitedLeads,
          calender,
        },
      };
    } catch (error: any) {
      return {
        status: httpStatusCodes.BAD_REQUEST,
        message: error.message,
        data: null,
      };
    }
  }
}
