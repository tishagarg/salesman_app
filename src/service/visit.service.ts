import dataSource from "../config/data-source";
import { Customer } from "../models/Customer.entity";
import { Visit } from "../models/Visits.entity";
import httpStatusCodes from "http-status-codes";
import { MoreThanOrEqual } from "typeorm";

export class VisitService {
  async planVisit(
    data: { customer_id: number; rep_id: number; date: Date },
    managerId: number
  ): Promise<{ status: number; data?: any; message: string }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const customer = await queryRunner.manager.findOne(Customer, {
        where: { customer_id: data.customer_id, assigned_rep_id: data.rep_id },
      });
      if (!customer) {
        throw new Error("Customer not assigned to rep");
      }
      const visit = await queryRunner.manager.save(Visit, {
        customer_id: data.customer_id,
        rep_id: data.rep_id,
        check_in_time: data.date,
        created_by: managerId.toString(),
      });
      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: visit,
        message: "Visit planned successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.BAD_REQUEST,
        message: error.message,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async logVisit(data: {
    customer_id: number;
    rep_id: number;
    latitude: number;
    longitude: number;
    notes?: string;
    photo_urls?: string[];
  }): Promise<{ status: number; data?: any; message: string }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const customer = await queryRunner.manager.findOne(Customer, {
        where: { customer_id: data.customer_id, assigned_rep_id: data.rep_id },
      });
      if (!customer) {
        throw new Error("Customer not assigned to rep");
      }
      const existingVisit = await queryRunner.manager.findOne(Visit, {
        where: {
          customer_id: data.customer_id,
          check_in_time: MoreThanOrEqual(
            new Date(new Date().setHours(0, 0, 0, 0))
          ),
        },
      });
      if (existingVisit) {
        throw new Error("Duplicate visit for today");
      }
      const visit = await queryRunner.manager.save(Visit, {
        customer_id: data.customer_id,
        rep_id: data.rep_id,
        check_in_time: new Date(),
        latitude: data.latitude,
        longitude: data.longitude,
        notes: data.notes,
        photo_urls: JSON.stringify(data.photo_urls || []),
        created_by: data.rep_id.toString(),
      });
      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: visit,
        message: "Visit logged successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.BAD_REQUEST,
        message: error.message,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
