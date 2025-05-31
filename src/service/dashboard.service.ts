import dataSource from "../config/data-source";
import { Customer } from "../models/Leads.entity";
import { Visit } from "../models/Visits.entity";
import httpStatusCodes from "http-status-codes";

export class DashboardService {
  async getDashboard(
    orgId: number,
    role: string,
    userId: number
  ): Promise<{ status: number; message: string; data: any }> {
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
      const customers = await queryRunner.manager.find(Customer, {
        where: customerWhere,
      });
      const data = {
        visits: {
          total: visits.length,
          completed: visits.filter((v) => v.check_out_time).length,
          missed: visits.filter((v) => !v.check_out_time).length,
        },
        customers: {
          total: customers.length,
          visited: customers.filter((c) =>
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
