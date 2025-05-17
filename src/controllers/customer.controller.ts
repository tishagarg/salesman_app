import { Response } from "express";
import { CustomerService } from "../service/customer.service";
import { ApiResponse } from "../utils/api.response";
import { parse } from "csv-parse";
import httpStatusCodes from "http-status-codes";
import * as XLSX from "xlsx";
import { readFileSync, unlinkSync } from "fs";
import { CustomerImportDto } from "../interfaces/common.interface";
import { validate } from "class-validator";
const customerService = new CustomerService();

export class CustomerController {
  async updateCustomer(req: any, res: Response): Promise<void> {
    const { id } = req.params;
    const data = req.body;
    const user_id = req.user.user_id;
    const response = await customerService.updateCustomer(id, data, user_id);
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
      console.log("importCustomers - Request received:", {
        user: req.user,
        file: req.file,
      });

      const file = req.file;
      if (!file) {
        return ApiResponse.error(
          res,
          httpStatusCodes.BAD_REQUEST,
          "No file uploaded"
        );
      }

      let data: CustomerImportDto[] = [];

      // Parse CSV
      if (file.mimetype === "text/csv") {
        const csvData = readFileSync(file.path, "utf-8");
        data = await new Promise((resolve, reject) => {
          const records: CustomerImportDto[] = [];
          parse(csvData, { columns: true, trim: true })
            .on("data", (row) => {
              records.push({
                name: row.name,
                contact_name: row.contact_name || undefined,
                contact_email: row.contact_email || undefined,
                contact_phone: row.contact_phone || undefined,
                street_address: row.street_address,
                postal_code: row.postal_code,
                city: row.city,
                state: row.state,
                country: row.country,
              });
            })
            .on("end", () => resolve(records))
            .on("error", reject);
        });
      }
      // Parse Excel
      else {
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
          city: row.city,
          state: row.state,
          country: row.country,
        }));
      }

      // Validate parsed data
      const errors: string[] = [];
      for (const row of data) {
        const validation = new CustomerImportDto();
        Object.assign(validation, row);
        const validationErrors = await validate(validation);
        if (validationErrors.length) {
          errors.push(
            `Invalid data for ${row.name}: ${validationErrors.join(", ")}`
          );
        }
      }
      if (errors.length) {
        return ApiResponse.error(
          res,
          httpStatusCodes.BAD_REQUEST,
          errors.join("; ")
        );
      }

      const user_id = req.user.user_id;
      const response = await customerService.importCustomers(data, user_id);
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
    } catch (error: any) {
      return ApiResponse.error(res, httpStatusCodes.BAD_REQUEST, error.message);
    } finally {
      if (req.file) {
        try {
          unlinkSync(req.file.path);
        } catch (err) {
          console.error("Failed to delete uploaded file:", err);
        }
      }
    }
  }

  async assignCustomer(req: any, res: Response): Promise<void> {
    const { id } = req.params;
    const rep_id = req.body.rep_id;
    const user_id = req.user.user_id;
    const response = await customerService.assignCustomer(id, rep_id, user_id);
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
   async createCustomer(req: any, res: Response): Promise<void> {
    const data: CustomerImportDto = req.body;
    const user_id = req.user.user_id;
    console.log("createCustomer - Request:", { data, user_id });

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

    const response = await customerService.createCustomer(data, user_id);
    console.log("createCustomer - Response:", response);

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

  // // Update an existing customer
  // async updateCustomer(req: any, res: Response): Promise<void> {
  //   const { id } = req.params;
  //   const data = req.body;
  //   const user_id = req.user.user_id;
  //   console.log("updateCustomer - Request:", { id, data, user_id });

  //   const response = await customerService.updateCustomer(id, data, user_id);
  //   console.log("updateCustomer - Response:", response);

  //   if (response.status >= 400) {
  //     return ApiResponse.error(res, response.status, response.message);
  //   }

  //   return ApiResponse.result(
  //     res,
  //     response.data,
  //     response.status,
  //     null,
  //     response.message
  //   );
  // }

  // Soft-delete a customer
  async deleteCustomer(req: any, res: Response): Promise<void> {
    const { id } = req.params;
    const user_id = req.user.user_id;
    console.log("deleteCustomer - Request:", { id, user_id });

    const response = await customerService.deleteCustomer(id, user_id);
    console.log("deleteCustomer - Response:", response);

    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(res, {}, response.status, null, response.message);
  }

  // Bulk assign customers to a sales rep
  async bulkAssignCustomers(req: any, res: Response): Promise<void> {
    const { customer_ids, rep_id } = req.body;
    const user_id = req.user.user_id;
    console.log("bulkAssignCustomers - Request:", {
      customer_ids,
      rep_id,
      user_id,
    });

    const response = await customerService.bulkAssignCustomers(
      customer_ids,
      rep_id,
      user_id
    );
    console.log("bulkAssignCustomers - Response:", response);

    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(
      res,
      response.data? response.data:null,
      response.status,
      null,
      response.message
    );
  }
  // Get a customer by ID
  async getCustomerById(req: any, res: Response): Promise<void> {
    const { id } = req.params;
    const user_id = req.user.user_id;
    const role = req.user.role;
    console.log("getCustomerById - Request:", { id, user_id, role });

    const response = await customerService.getCustomerById(id, user_id, role);
    console.log("getCustomerById - Response:", response);

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

  // Get all customers with optional filters
  async getAllCustomers(req: any, res: Response): Promise<void> {
    const filters: {
      territory_id?: number;
      rep_id?: number;
      status?: string;
      pending_assignment?: boolean;
    } = req.query;
    const user_id = req.user.user_id;
    const role = req.user.role;
    console.log("getAllCustomers - Request:", { filters, user_id, role });

    const response = await customerService.getAllCustomers(
      filters,
      user_id,
      role
    );
    console.log("getAllCustomers - Response:", response);

    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(
      res,
      response.data? response.data: null,
      response.status,
      null,
      response.message
    );
  }
}
