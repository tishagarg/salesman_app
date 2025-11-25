import { Response } from "express";
import { ContractTemplateService } from "../service/contract.service";
import { ApiResponse } from "../utils/api.response";
import { getDataSource } from "../config/data-source";
import { Contract } from "../models/Contracts.entity";
import { ContractPDF } from "../models/ContractPdf.entity";
import { getBrowser } from "../utils/chromium";

export class ContractTemplateController {
  constructor() {
    this.getContractHTML = this.getContractHTML.bind(this);
  }
  async create(req: any, res: Response): Promise<void> {
    const { title, content, assigned_manager_ids, status, dropdown_fields } =
      req.body;

    const newTemplate = await ContractTemplateService.createContractTemplate({
      title,
      content,
      status,
      assigned_manager_ids,
      dropdown_fields,
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
  async getContractHTML(req: any, res: Response): Promise<void> {
    try {
      const { contractId } = req.params;
      const { download } = req.query;
      const shouldDownload = download === "true";
      const dataSource = await getDataSource();
      const contractRepo = dataSource.getRepository(Contract);

      // Find the contract with its rendered HTML and images
      const contract = await contractRepo.findOne({
        where: { id: parseInt(contractId) },
        relations: { images: true, pdf: true },
      });

      if (!contract) {
        res.status(404).json({
          data: null,
          message: "Contract not found",
          status: 404,
        });
        return;
      }

      if (!contract?.rendered_html) {
        res.status(404).json({
          data: null,
          message: "HTML content not found for this contract",
          status: 404,
        });
        return;
      }

      // Generate styled HTML
      const signatureUrl = contract?.images?.[0]?.image_url || null;
      const styledHtml = await this.generateStyledContractHTML(
        contract?.rendered_html || "",
        signatureUrl || ""
      );

      // If download is requested, generate and return PDF
      if (shouldDownload) {
        try {
          // Check if PDF already exists in database
          if (contract.pdf && contract.pdf.pdf_data) {
            const fileName = `contract_${contractId}_${Date.now()}.pdf`;
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
              "Content-Disposition",
              `attachment; filename="${fileName}"`
            );
            res.setHeader(
              "Content-Length",
              contract.pdf.pdf_data.length.toString()
            );
            res.send(contract.pdf.pdf_data);
            return;
          }

          // Generate PDF from HTML
          const pdfBuffer = await this.generatePdfFromHtml(styledHtml);
          const fileName = `contract_${contractId}_${Date.now()}.pdf`;

          // Set headers for PDF download
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${fileName}"`
          );
          res.setHeader("Content-Length", pdfBuffer.length.toString());

          res.send(pdfBuffer);
          return;
        } catch (pdfError) {
          console.error("Error generating PDF:", pdfError);
          res.status(500).json({
            data: null,
            message: "Error generating PDF",
            status: 500,
          });
          return;
        }
      }

      // Set headers for HTML response
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      // Return the styled HTML
      res.status(200).send(styledHtml);
    } catch (error) {
      console.error("Error retrieving contract:", error);
      res.status(500).json({
        data: null,
        message: "Error retrieving the contract",
        status: 500,
      });
      return;
    }
  }
  generateStyledContractHTML = async (html: string, signatureUrl?: string) => {
    // Company logo as SVG
    const companyLogo = `data:image/svg+xml;base64,${Buffer.from(
      `
    <svg width="150" height="60" viewBox="0 0 150 60" xmlns="http://www.w3.org/2000/svg">
      <rect width="150" height="60" fill="#2c3e50" rx="5"/>
      <text x="75" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">
        TRACK
      </text>
    </svg>
  `
    ).toString("base64")}`;

    const styledHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Contract Agreement</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', 'Arial', 'Helvetica', sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #333;
          background: #f8f9fa;
          padding: 20px;
        }
        
        .document-container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        
        .header {
          background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
          color: white;
          padding: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-height: 120px;
        }
        
        .logo {
          max-height: 60px;
          width: auto;
        }
        
        .header-info {
          text-align: right;
          flex: 1;
          margin-left: 30px;
        }
        
        .header-info h1 {
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: 300;
          letter-spacing: 2px;
          color: #ffffff;
        }
        
        .header-info p {
          margin: 2px 0;
          opacity: 0.9;
          font-size: 14px;
        }
        
        .content {
          padding: 40px;
        }
        
        .contract-body {
          margin-bottom: 50px;
          line-height: 1.8;
        }
        
        .signature-container {
          margin: 50px 0;
          padding: 30px;
          border: 3px solid #e74c3c;
          border-radius: 15px;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          box-shadow: 0 8px 25px rgba(231, 76, 60, 0.15);
        }
        
        .signature-placeholder {
          text-align: center;
          padding: 30px;
          background: #fff3cd;
          border: 2px dashed #856404;
          border-radius: 10px;
          color: #856404;
        }
        
        .signature-header {
          text-align: center;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e74c3c;
        }
        
        .signature-header h3 {
          color: #e74c3c;
          font-size: 20px;
          font-weight: 600;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .signature-content {
          text-align: center;
        }
        
        .signature-label {
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 20px;
          font-size: 16px;
        }
        
        .signature-image-wrapper {
          background: white;
          padding: 20px;
          border: 3px solid #34495e;
          border-radius: 12px;
          margin: 20px auto;
          box-shadow: inset 0 3px 8px rgba(0,0,0,0.1);
          max-width: 400px;
          min-height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .signature-image {
          max-width: 100%;
          max-height: 200px;
          border: none;
          border-radius: 8px;
          object-fit: contain;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.1));
        }
        
        .signature-details {
          margin-top: 25px;
          padding: 20px;
          background: #ecf0f1;
          border-radius: 10px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }
        
        .signature-details p {
          margin: 5px 0;
          font-size: 13px;
          color: #2c3e50;
          font-weight: 500;
        }
        
        .footer {
          background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
          color: white;
          padding: 30px;
          text-align: center;
          font-size: 12px;
        }
        
        .footer p {
          margin: 8px 0;
          color: #ffffff;
        }
        
        h1, h2, h3, h4, h5, h6 {
          color: #2c3e50;
          margin: 30px 0 20px 0;
          font-weight: 600;
        }
        
        h1 { 
          font-size: 28px; 
          border-bottom: 3px solid #3498db; 
          padding-bottom: 10px;
          margin-bottom: 25px;
        }
        
        h2 { 
          font-size: 22px; 
          color: #34495e;
          margin-top: 35px;
        }
        
        h3 { 
          font-size: 18px;
          margin-top: 30px;
        }
        
        p {
          margin-bottom: 15px;
          text-align: justify;
          line-height: 1.8;
        }
        
        strong {
          color: #2c3e50;
          font-weight: 700;
        }
        
        ul, ol {
          margin: 15px 0 15px 30px;
        }
        
        li {
          margin-bottom: 8px;
          line-height: 1.6;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        th, td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        
        th {
          background: #34495e;
          color: white;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 0.5px;
        }
        
        tr:hover {
          background: #f8f9fa;
        }
        
        .highlight {
          background: #fff3cd;
          padding: 15px;
          border-left: 4px solid #ffc107;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }
        
        .contract-meta {
          background: #e8f4fd;
          padding: 20px;
          border-radius: 10px;
          margin: 30px 0;
          border-left: 4px solid #3498db;
        }
        
        .contract-meta h4 {
          color: #3498db;
          margin: 0 0 15px 0;
          font-size: 16px;
        }
        
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
        }
        
        .meta-item {
          background: white;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #ddd;
        }
        
        .meta-label {
          font-weight: 600;
          color: #2c3e50;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .meta-value {
          color: #34495e;
          font-size: 14px;
          margin-top: 4px;
        }
        
        @media print {
          body { 
            background: white;
            padding: 0;
          }
          .document-container {
            box-shadow: none;
            border-radius: 0;
          }
          .signature-image {
            max-height: 150px;
          }
        }
        
        @media (max-width: 768px) {
          body {
            padding: 10px;
          }
          .header {
            flex-direction: column;
            text-align: center;
            padding: 20px;
          }
          .header-info {
            margin-left: 0;
            margin-top: 15px;
          }
          .content {
            padding: 20px;
          }
          .signature-details {
            grid-template-columns: 1fr;
          }
          .meta-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="document-container">
        <div class="header">
          <img src="${companyLogo}" alt="Company Logo" class="logo">
          <div class="header-info">
            <h1>Sales Agreement</h1>
            <p>Document Generated: ${new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
            <p>Time: ${new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
            })}</p>
          </div>
        </div>
        
        <div class="content">
          <div class="contract-body">
            ${html}
          </div>
        </div>
        
        <div class="footer">
          <p><strong>This document was electronically generated and digitally signed.</strong></p>
          <p>All signatures and agreements contained herein are legally binding and enforceable.</p>
          <p>For questions or support regarding this contract, please contact our customer service team.</p>
          <p>Generated on ${new Date().toISOString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;

    return styledHtml;
  };
  async reassignContractTemplate(req: any, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { assigned_manager_ids } = req.body;

      if (
        !templateId ||
        !assigned_manager_ids ||
        !Array.isArray(assigned_manager_ids)
      ) {
        return ApiResponse.error(
          res,
          400,
          "Template ID and assigned_manager_ids array are required"
        );
      }

      if (assigned_manager_ids.length === 0) {
        return ApiResponse.error(
          res,
          400,
          "At least one manager ID must be provided"
        );
      }

      const result = await ContractTemplateService.reassignContractTemplate(
        parseInt(templateId),
        assigned_manager_ids
      );

      if (result.status >= 400) {
        return ApiResponse.error(res, result.status, result.message);
      }

      return ApiResponse.result(
        res,
        result.data,
        result.status,
        null,
        result.message
      );
    } catch (error) {
      console.error("Error reassigning contract template:", error);
      return ApiResponse.error(res, 500, "Internal server error");
    }
  }

  async updateContractTemplate(req: any, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const updates = req.body;

      if (!templateId) {
        return ApiResponse.error(res, 400, "Template ID is required");
      }

      const result = await ContractTemplateService.updateContractTemplate(
        parseInt(templateId),
        updates
      );

      if (result.status >= 400) {
        return ApiResponse.error(res, result.status, result.message);
      }

      return ApiResponse.result(
        res,
        result.data,
        result.status,
        null,
        result.message
      );
    } catch (error) {
      console.error("Error updating contract template:", error);
      return ApiResponse.error(res, 500, "Internal server error");
    }
  }

  async getTemplateById(req: any, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;

      if (!templateId) {
        return ApiResponse.error(res, 400, "Template ID is required");
      }

      const result = await ContractTemplateService.getContractTemplateById(
        parseInt(templateId)
      );

      if (result.status >= 400) {
        return ApiResponse.error(res, result.status, result.message);
      }

      return ApiResponse.result(
        res,
        result.data,
        result.status,
        null,
        result.message
      );
    } catch (error) {
      console.error("Error fetching contract template:", error);
      return ApiResponse.error(res, 500, "Internal server error");
    }
  }

  async deleteContract(req: any, res: Response): Promise<void> {
    try {
      const { contractId } = req.params;

      if (!contractId) {
        return ApiResponse.error(res, 400, "Contract ID is required");
      }

      const contractIdNum = parseInt(contractId);
      if (isNaN(contractIdNum)) {
        return ApiResponse.error(res, 400, "Invalid contract ID format");
      }

      const result = await ContractTemplateService.deleteContract(
        contractIdNum
      );

      if (result.status >= 400) {
        return ApiResponse.error(res, result.status, result.message);
      }

      return ApiResponse.result(
        res,
        result.data,
        result.status,
        null,
        result.message
      );
    } catch (error) {
      console.error("Error deleting contract:", error);
      return ApiResponse.error(res, 500, "Internal server error");
    }
  }

  private async generatePdfFromHtml(html: string): Promise<Buffer> {
    let browser = null;

    try {
      browser = await getBrowser();
      const page = await browser.newPage();

      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1024,
        height: 768,
        deviceScaleFactor: 2,
      });

      // Set content and wait for load
      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      // Wait for images to load
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.images)
            .filter((img) => !img.complete)
            .map(
              (img) =>
                new Promise((resolve) => {
                  img.onload = img.onerror = resolve;
                })
            )
        );
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: "a4",
        margin: {
          top: "20mm",
          right: "15mm",
          bottom: "20mm",
          left: "15mm",
        },
        printBackground: true,
        preferCSSPageSize: false,
      });

      await page.close();
      return pdfBuffer;
    } catch (error) {
      console.error("Error generating PDF:", error);
      throw new Error("Failed to generate PDF");
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
