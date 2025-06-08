import { getDataSource } from "../config/data-source"; // Updated import
import { Role } from "../models";
import { Leads } from "../models/Leads.entity";
import { Visit } from "../models/Visits.entity";
import httpStatusCodes from "http-status-codes";

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
      const role = await dataSource
        .getRepository(Role)
        .findOne({ where: { role_id } });
      const visitWhere = role?.role_name !== "admin" ? { rep_id: userId } : {};
      const customerWhere =
        role?.role_name !== "admin" ? { assigned_rep_id: userId } : {};
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
          visited: leads.filter((c) => c.is_visited).length,
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
