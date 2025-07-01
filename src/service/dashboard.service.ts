import { getDataSource } from "../config/data-source"; // Updated import
import { Role } from "../models/Role.entity";
import { Leads } from "../models/Leads.entity";
import { Visit } from "../models/Visits.entity";
import httpStatusCodes from "http-status-codes";
import { IsNull, Not } from "typeorm";
import { isEmpty } from "class-validator";
import { getCurrentMonthData } from "../utils/workingDays";

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
      visitRepo.count({
        where: { check_out_time: IsNull(), rep_id: userId },
      }),
      visitRepo.count({
        where: { check_out_time: Not(IsNull()), rep_id: userId },
      }),
      leadsRepo.count({
        where: { assigned_rep_id: userId },
      }),
      visitRepo
        .createQueryBuilder("visit")
        .innerJoin("visit.contract", "contract")
        .where("visit.rep_id = :rep_id", { rep_id: userId })
        .getCount(),
      visitRepo
        .createQueryBuilder("visit")
        .leftJoin("visit.contract", "contract")
        .where("contract.id IS NULL")
        .andWhere("visit.rep_id = :rep_id", { rep_id: userId })
        .getCount(),
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
