import { Request, Response } from "express";
import { CustomerService } from "../service/customer.service";
import { ApiResponse } from "../utils/api.response";
import { parse } from "csv-parse";
import httpStatusCodes from "http-status-codes";
import * as XLSX from "xlsx";
import { readFileSync, unlinkSync, createReadStream } from "fs";
import { LeadImportDto, UpdateLeadDto } from "../interfaces/common.interface";
import { validate } from "class-validator";

const customerService = new CustomerService();

export class LeadsController {
  async createLeads(req: any, res: Response): Promise<void> {
    const data: LeadImportDto = req.body;
    const userId = parseInt(req.user.user_id);
    const org_id = parseInt(req.user.org_id); // Validate input
    const validation = new LeadImportDto();
    Object.assign(validation, data);
    const validationErrors = await validate(validation);
    if (validationErrors.length) {
      const errorMsg = validationErrors
        .map((e) => Object.values(e.constraints || {}).join(", "))
        .join("; ");
      return ApiResponse.error(
        res,
        httpStatusCodes.BAD_REQUEST,
        `Validation failed: ${errorMsg}`
      );
    }

    const response = await customerService.createCustomer(data, userId, org_id);
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(
      res,
      response.data ?? null,
      response.status,
      null,
      response.message
    );
  }

  async updateLead(req: any, res: Response): Promise<void> {
    const customerId = parseInt(req.params.id);
    const data: Partial<UpdateLeadDto> = req.body;
    const userId = parseInt(req.user.user_id);
    const role = req.user.role;

    const response = await customerService.updateCustomer(
      customerId,
      data,
      userId,
      role
    );
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(
      res,
      response.data,
      response.status,
      null,
      response.message
    );
  }
  async updateStatus(req: any, res: Response): Promise<void> {
    const customerId = parseInt(req.params.id);
    const data: Partial<UpdateLeadDto> = req.body;
    const userId = parseInt(req.user.user_id);
    const role = req.user.role;

    const response = await customerService.updateCustomer(
      customerId,
      data,
      userId,
      role
    );
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(
      res,
      response.data,
      response.status,
      null,
      response.message
    );
  }

  async deleteLead(req: any, res: Response): Promise<void> {
    const customerId = parseInt(req.params.id);
    const userId = parseInt(req.user.user_id);

    const response = await customerService.deleteCustomer(customerId, userId);
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(res, {}, response.status, null, response.message);
  }

  async getLeadById(req: any, res: Response): Promise<void> {
    const customerId = parseInt(req.params.id);
    const userId = parseInt(req.user.user_id);
    const role = req.user.role;

    const response = await customerService.getCustomerById(
      customerId,
      userId,
      role
    );
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(
      res,
      response.data,
      response.status,
      null,
      response.message
    );
  }

  async getAllLeads(req: any, res: Response): Promise<void> {
    const filters: {
      territory_id?: number;
      rep_id?: number;
      status?: string;
      pending_assignment?: boolean;
      org_id?: number;
    } = {
      territory_id: req.query.territory_id
        ? parseInt(req.query.territory_id as string)
        : undefined,
      rep_id: req.query.rep_id
        ? parseInt(req.query.rep_id as string)
        : undefined,
      status: req.query.status as string,
      pending_assignment: req.query.pending_assignment
        ? req.query.pending_assignment === "true"
        : undefined,
      org_id: req.query.org_id
        ? parseInt(req.query.org_id as string)
        : undefined,
    };
    const userId = parseInt(req.user.user_id);
    const role = req.user.role;

    const response = await customerService.getAllCustomers(
      filters,
      userId,
      role
    );
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(
      res,
      response.data ?? null,
      response.status,
      null,
      response.message
    );
  }

  async bulkAssignLeads(req: any, res: Response): Promise<void> {
    const { lead_ids, rep_id } = req.body;
    const userId = parseInt(req.user.user_id);

    const response = await customerService.bulkAssignCustomers(
      lead_ids,
      rep_id,
      userId
    );
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(
      res,
      response.data ?? null,
      response.status,
      null,
      response.message
    );
  }

  async assignLeads(req: any, res: Response): Promise<void> {
    const customerId = parseInt(req.params.id);
    const repId = parseInt(req.body.rep_id);
    const userId = parseInt(req.user.user_id);

    const response = await customerService.assignCustomer(
      customerId,
      repId,
      userId
    );
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(
      res,
      response.data,
      response.status,
      null,
      response.message
    );
  }

  async importLeads(req: any, res: Response): Promise<void> {
    try {
      let data: LeadImportDto[] = req.body.leads;
      const { user_id, org_id } = req.user;
      const response = await customerService.importCustomers(
        data,
        user_id,
        org_id
      );
      if (response.status >= 400) {
        return ApiResponse.error(res, response.status, response.message);
      }

      return ApiResponse.result(
        res,
        response.data ?? null,
        response.status,
        null,
        response.message
      );
    } catch (error: any) {
      return ApiResponse.error(
        res,
        httpStatusCodes.INTERNAL_SERVER_ERROR,
        `Failed to import customers: ${error.message}`
      );
    } finally {
      if (req.file?.path) {
        try {
          unlinkSync(req.file.path);
        } catch (err) {
          console.error("Failed to delete uploaded file:", err);
        }
      }
    }
  }
}
