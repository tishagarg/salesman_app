import { getDataSource } from "../config/data-source"; // Updated import
import { Role } from "../models/Role.entity";
import { Leads } from "../models/Leads.entity";
import { Visit } from "../models/Visits.entity";
import httpStatusCodes from "http-status-codes";
import { IsNull, Not } from "typeorm";
import { isEmpty } from "class-validator";

export class DashboardService {
  async getDashboard(
    orgId: number,
    userId: number,
    role_id: number
  ): Promise<{ status: number; message: string; data: any }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const visitRepo = dataSource.getRepository(Visit);

      const unVisitedLeads = await visitRepo.count({
        where: { check_out_time: IsNull(), rep_id: userId },
      });

      const visitedLeads = await visitRepo.count({
        where: { check_out_time: Not(IsNull()), rep_id: userId },
      });

      const totalLeads = unVisitedLeads + visitedLeads;

      const signedLeads = await visitRepo
        .createQueryBuilder("visit")
        .innerJoin("visit.contract", "contract")
        .where("visit.rep_id = :rep_id", { rep_id: userId })
        .getCount();

      const unSignedLeads = await visitRepo
        .createQueryBuilder("visit")
        .leftJoin("visit.contract", "contract")
        .where("contract.id IS NULL")
        .andWhere("visit.rep_id = :rep_id", { rep_id: userId })
        .getCount();

      const data = {
        unSignedLeads,
        signedLeads,
        totalLeads,
        unVisitedLeads,
        visitedLeads,
      };

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data,
        message: "Dashboard data retrieved successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.BAD_REQUEST,
        message: error.message,
        data: null,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
