import { getDataSource } from "../config/data-source"; // Updated import
import { Leads } from "../models/Leads.entity";
import httpStatusCodes from "http-status-codes";

export class MapService {
  async getCustomerMap(
    repId: number
  ): Promise<{ status: number; message: string; data: any }> {
    const dataSource = await getDataSource();
    try {
      const customers = await dataSource.manager.find(Leads, {
        where: { assigned_rep_id: repId, is_active: true },
        relations: ["address"],
      });
      const mapData = customers.map((c) => ({
        lead_id: c.lead_id,
        name: c.name,
        status: c.status,
        latitude: c.address.latitude,
        longitude: c.address.longitude,
      }));
      return {
        status: httpStatusCodes.OK,
        data: mapData,
        message: "Customer map retrieved successfully",
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