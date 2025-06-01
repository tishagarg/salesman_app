import { getDataSource } from "../config/data-source"; // Updated import
import { Leads } from "../models/Leads.entity";
import { Visit } from "../models/Visits.entity";
import httpStatusCodes from "http-status-codes";

export class DashboardService {
  async getDashboard(
    orgId: number,
    role: string,
    userId: number
  ): Promise<{ status: number; message: string; data: any }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const visitWhere =
        role === "admin" ? { org_id: orgId } : { rep_id: userId };
      const customerWhere =
        role === "admin" ? { org_id: orgId } : { assigned_rep_id: userId };
      const visits = await queryRunner.manager.find(Visit, {
        where: visitWhere,
      });
      const leads = await queryRunner.manager.find(Leads, {
        where: customerWhere,
      });
      const data = {
        visits: {
          total: visits.length,
          completed: visits.filter((v) => v.check_out_time).length,
          missed: visits.filter((v) => !v.check_out_time).length,
        },
        leads: {
          total: leads.length,
          visited: leads.filter((c) =>
            visits.some((v) => v.lead_id === c.lead_id)
          ).length,
        },
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