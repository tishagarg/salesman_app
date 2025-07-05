import { Response } from "express";
import { ContractTemplateService } from "../service/contract.service";
import { ApiResponse } from "../utils/api.response";
import { getDataSource } from "../config/data-source";
import { Contract } from "../models/Contracts.entity";
import { ContractPDF } from "../models/ContractPdf.entity";

export class ContractTemplateController {
  async create(req: any, res: Response): Promise<void> {
    const { title, content, assigned_manager_ids, status } = req.body;

    const newTemplate = await ContractTemplateService.createContractTemplate({
      title,
      content,
      status,
      assigned_manager_ids,
    });
    if (newTemplate.status >= 400) {
      ApiResponse.error(res, newTemplate.status, newTemplate.message);
    }
    ApiResponse.result(
      res,
      newTemplate.data,
      newTemplate.status,
      null,
      newTemplate.message
    );
  }
  async list(req: any, res: Response): Promise<void> {
    const newTemplate = await ContractTemplateService.listContractTemplates();
    if (newTemplate.status >= 400) {
      return ApiResponse.error(res, newTemplate.status, newTemplate.message);
    }
    return ApiResponse.result(
      res,
      newTemplate.data,
      newTemplate.status,
      null,
      newTemplate.message
    );
  }
  async getAllContracts(req: any, res: Response): Promise<void> {
    const managerId = req.query.managerId
      ? Number(req.query.managerId)
      : undefined;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const sortBy = req.query.sortBy as "signedCount" | "title" | "date";

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const result = await ContractTemplateService.getAllContracts({
      managerId,
      status,
      search,
      sortBy,
      skip,
      limit,
      page,
    });

    if (result.status >= 400) {
      return ApiResponse.error(res, result.status, result.message);
    }

    return ApiResponse.result(
      res,
      {
        contracts: result.data,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil((result.total || 0) / limit),
        },
      },
      result.status,
      null,
      result.message
    );
  }

  async getTemplatesForRep(req: any, res: Response) {
    const repId = req.user.user_id;
    const templates = await ContractTemplateService.getTemplatesForSalesRep(
      repId
    );
    if (templates.status >= 400) {
      ApiResponse.error(res, templates.status, templates.message);
    }
    ApiResponse.result(
      res,
      templates.data,
      templates.status,
      null,
      templates.message
    );
  }
  async getContractPDF(req: any, res: Response) {
    try {
      const { contractId } = req.params;
      const dataSource = await getDataSource();
      const contractRepo = dataSource.getRepository(Contract);
      const contractPDFRepo = dataSource.getRepository(ContractPDF);
      const contract = await contractRepo.findOne({
        where: { id: parseInt(contractId) },
      });
      if (!contract) {
        res.status(404).json({
          data: null,
          message: "Contract not found",
          status: 404,
        });
      }
      const contractPDF = await contractPDFRepo.findOne({
        where: { contract_id: parseInt(contractId) },
      });

      if (!contractPDF || !contractPDF.pdf_data) {
        res.status(404).json({
          data: null,
          message: "PDF not found for this contract",
          status: 404,
        });
        return;
      }
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="contract-${contractId}.pdf"`
      );
      res.setHeader("Content-Length", contractPDF.pdf_data.length);
      res.status(200).send(contractPDF.pdf_data);
    } catch (error) {
      console.error("Error retrieving PDF:", error);
      res.status(500).json({
        data: null,
        message: "Error retrieving the PDF",
        status: 500,
      });
    }
  }
}
