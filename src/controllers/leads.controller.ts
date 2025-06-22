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
    const org_id = parseInt(req.user.org_id);

    const role = req.user.role;

    const response = await customerService.updateCustomer(
      customerId,
      data,
      userId,
      org_id,
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
  async updateStatus(req: any, res: Response): Promise<void> {
    const customerId = parseInt(req.params.id);
    const data: Partial<UpdateLeadDto> = req.body;
    const userId = parseInt(req.user.user_id);
    const org_id = parseInt(req.user.org_id);

    const role = req.user.role;

    const response = await customerService.updateCustomer(
      customerId,
      data,
      userId,
      org_id,
      role
    );
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message,null);
    }

    return ApiResponse.result(
      res,
      response.data ?? null,
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
      return ApiResponse.error(res, response.status, response.message,null);
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const source = req.query.source as string;

    const search = req.query.search as string;
    const filters = { page, limit, skip, search, source };
    const userId = parseInt(req.user.user_id);
    const response = await customerService.getAllCustomers(
      filters,
      userId,
    );
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(
      res,
      {
        leads: response.data,
        pagination: {
          page,
          limit,
          total: response.total ?? 0,
          totalPages: Math.ceil((response.total ?? 0) / limit),
        },
      },
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
        return ApiResponse.error(res, response.status, response.message, response.errors);
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
