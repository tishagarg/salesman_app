import { Request, Response } from "express";
import { CustomerService } from "../service/customer.service";
import { ApiResponse } from "../utils/api.response";
import { parse } from "csv-parse";
import httpStatusCodes from "http-status-codes";
import * as XLSX from "xlsx";
import { readFileSync, unlinkSync, createReadStream } from "fs";
import { CustomerImportDto } from "../interfaces/common.interface";
import { validate } from "class-validator";

const customerService = new CustomerService();

export class CustomerController {
  async createCustomer(req: any, res: Response): Promise<void> {
    const data: CustomerImportDto = req.body;
    const userId = parseInt(req.user.user_id);

    // Validate input
    const validation = new CustomerImportDto();
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

    const response = await customerService.createCustomer(data, userId);
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

  async updateCustomer(req: any, res: Response): Promise<void> {
    const customerId = parseInt(req.params.id);
    const data: Partial<CustomerImportDto> = req.body;
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

  async deleteCustomer(req: any, res: Response): Promise<void> {
    const customerId = parseInt(req.params.id);
    const userId = parseInt(req.user.user_id);

    const response = await customerService.deleteCustomer(customerId, userId);
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(res, {}, response.status, null, response.message);
  }

  async getCustomerById(req: any, res: Response): Promise<void> {
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

  async getAllCustomers(req: any, res: Response): Promise<void> {
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

  async bulkAssignCustomers(req: any, res: Response): Promise<void> {
    const { customer_ids, rep_id } = req.body;
    const userId = parseInt(req.user.user_id);

    const response = await customerService.bulkAssignCustomers(
      customer_ids,
      rep_id,
      userId
    );
    if (response.status >= 400) {
      return ApiResponse.error(
        res,
        response.status,
        response.message
      );
    }

    return ApiResponse.result(
      res,
      response.data??null,
      response.status,
      null,
      response.message
    );
  }

  async assignCustomer(req: any, res: Response): Promise<void> {
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

  async importCustomers(req: any, res: Response): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        return ApiResponse.error(
          res,
          httpStatusCodes.BAD_REQUEST,
          "No file uploaded"
        );
      }

      let data: CustomerImportDto[] = [];

      // Parse CSV with streaming
      if (file.mimetype === "text/csv") {
        data = await new Promise((resolve, reject) => {
          const records: CustomerImportDto[] = [];
          createReadStream(file.path)
            .pipe(parse({ columns: true, trim: true }))
            .on("data", (row) => {
              records.push({
                name: row.name,
                contact_name: row.contact_name || undefined,
                contact_email: row.contact_email || undefined,
                contact_phone: row.contact_phone || undefined,
                street_address: row.street_address,
                postal_code: row.postal_code,
                area_name: row.area_name || undefined,
                subregion: row.subregion,
                region: row.region,
                country: row.country || "Finland",
                org_id: parseInt(row.org_id) || 1, // Default org_id if not provided
              });
            })
            .on("end", () => resolve(records))
            .on("error", reject);
        });
      }
      // Parse Excel
      else if (
        file.mimetype ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.mimetype === "application/vnd.ms-excel"
      ) {
        const workbook = XLSX.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);
        data = rows.map((row: any) => ({
          name: row.name,
          contact_name: row.contact_name || undefined,
          contact_email: row.contact_email || undefined,
          contact_phone: row.contact_phone || undefined,
          street_address: row.street_address,
          postal_code: row.postal_code,
          area_name: row.area_name || undefined,
          subregion: row.subregion,
          region: row.region,
          country: row.country || "Finland",
          org_id: row.org_id ? parseInt(row.org_id) : 1, // Default org_id if not provided
        }));
      } else {
        return ApiResponse.error(
          res,
          httpStatusCodes.BAD_REQUEST,
          "Unsupported file type. Use CSV or Excel"
        );
      }

      // Validate parsed data
      const errors: string[] = [];
      for (const row of data) {
        const validation = new CustomerImportDto();
        Object.assign(validation, row);
        const validationErrors = await validate(validation);
        if (validationErrors.length) {
          errors.push(
            `Invalid data for ${row.name}: ${validationErrors
              .map((e) => Object.values(e.constraints || {}).join(", "))
              .join(", ")}`
          );
        }
      }
      if (errors.length) {
      console.log(errors)

        return ApiResponse.error(
          res,
          httpStatusCodes.BAD_REQUEST,
          "Validation errors in uploaded file"
        );
      }

      const userId = parseInt(req.user.user_id);
      const response = await customerService.importCustomers(data, userId);
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
      console.log(error)
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
