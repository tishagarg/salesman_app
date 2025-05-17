import dataSource from "../config/data-source";
import { Customer } from "../models/Customer.entity";
import httpStatusCodes from "http-status-codes";

export class MapService {
  async getCustomerMap(
    repId: number
  ): Promise<{ status: number; message: string; data: any }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const customers = await queryRunner.manager.find(Customer, {
        where: { assigned_rep_id: repId, is_active: true },
        relations: ["address"],
      });
      const mapData = customers.map((c) => ({
        customer_id: c.customer_id,
        name: c.name,
        status: c.status,
        latitude: c.address.latitude,
        longitude: c.address.longitude,
      }));
      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: mapData,
        message: "Customer map retrieved successfully",
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
