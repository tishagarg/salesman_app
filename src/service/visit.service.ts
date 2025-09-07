import { getDataSource } from "../config/data-source";
import { Leads } from "../models/Leads.entity";
import { Visit } from "../models/Visits.entity";
import PDFDocument from "pdfkit";
import { Route } from "../models/Route.entity";
import { ManagerSalesRep } from "../models/ManagerSalesRep.entity";
import { Idempotency } from "../models/Idempotency";
import httpStatusCodes from "http-status-codes";
import { convert } from "html-to-text";
import puppeteer from "puppeteer";
import chrome from "chrome-aws-lambda";
import {
  Between,
  DeepPartial,
  Equal,
  In,
  IsNull,
  LessThan,
  MoreThanOrEqual,
  QueryRunner,
} from "typeorm";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { Contract } from "../models/Contracts.entity";
import { ContractTemplate } from "../models/ContractTemplate.entity";
import {
  renderContract,
  renderContractWithDropdowns,
  validateDropdownValues,
} from "../utils/renderContracts";
import { Address } from "../models/Address.entity";
import { User } from "../models/User.entity";
import { FollowUp } from "../models/FollowUp.entity";
import { FollowUpVisit } from "../models/FollowUpVisit.entity";
import { ContractImage } from "../models/ContractImage.entity";
import { LeadStatus } from "../enum/leadStatus";
import { ContractPDF } from "../models/ContractPdf.entity";
import { getFinnishTime } from "../utils/timezone";

require("dotenv").config();

interface RouteOrderItem {
  lead_id: number;
  latitude?: number;
  longitude?: number;
  distance: number; // Total cumulative distance from origin
  eta: string;
  visit_id: number;
  lead_status: LeadStatus;
  segmentDistance?: number; // Distance from previous stop
  cumulativeTime?: number; // Total travel time in minutes
}

interface VisitData {
  lead_id: number;
  rep_id: number;
  check_in_time: Date;
  check_out_time?: Date;
  latitude?: number;
  longitude?: number;
  created_by: string;
  is_active?: boolean;
  notes?: string;
  status?: LeadStatus;
  contract_id?: number;
  photo_urls?: string[];
}

interface DirectionsResult {
  route: any;
  waypointOrder: number[];
}

export class VisitService {
  private async withTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>
  ): Promise<T> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction("SERIALIZABLE");
    try {
      const result = await operation(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private handleError(
    error: any,
    defaultMessage: string
  ): { status: number; message: string } {
    if (error.code === "40001") {
      return {
        status: httpStatusCodes.CONFLICT,
        message: "Concurrent transaction conflict, please retry",
      };
    }
    if (error.code === "23505") {
      return { status: httpStatusCodes.BAD_REQUEST, message: error.message };
    }
    return {
      status: httpStatusCodes.BAD_REQUEST,
      message: error.message || defaultMessage,
    };
  }

  private getStartOfDay(date: Date = getFinnishTime()): Date {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
  }

  private async logQuery(queryBuilder: any): Promise<void> {
    const sql = await queryBuilder.getSql();
  }
  async convertImageUrlToBase64(imageUrl: string): Promise<string | null> {
    try {
      console.log("🔄 Converting image to base64:", imageUrl);
      if (!imageUrl.startsWith("http")) {
        console.error("❌ Invalid URL format:", imageUrl);
        return null;
      }
      console.log("🔄 Attempting to import node-fetch...");
      const fetch = (await import("node-fetch")).default;
      console.log("✅ node-fetch imported successfully");
      const response = await fetch(imageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
        },
      });
      console.log(
        `📡 Response status: ${response.status} ${response.statusText}`
      );
      console.log(`📡 Content-Type: ${response.headers.get("content-type")}`);
      console.log(
        `📡 Content-Length: ${response.headers.get("content-length")}`
      );
      if (!response.ok) {
        console.error(
          `❌ HTTP Error: ${response.status} ${response.statusText}`
        );
        return null;
      }
      const contentType = response.headers.get("content-type");
      const buffer = await response.buffer();
      console.log(`📥 Downloaded buffer: ${buffer.length} bytes`);
      if (buffer.length === 0) {
        console.error("❌ Empty image buffer");
        return null;
      }
      const magicBytesResult = this.validateAndDetectImageFormat(buffer);
      if (!magicBytesResult.isValid) {
        console.error("❌ Invalid image format - magic bytes check failed");
        console.error(`❌ Magic bytes: ${buffer.slice(0, 8).toString("hex")}`);
        return null;
      }

      console.log(`✅ Image format detected: ${magicBytesResult.format}`);
      const finalContentType =
        magicBytesResult.mimeType || contentType || "image/png";

      const base64 = buffer.toString("base64");
      const dataUri = `data:${finalContentType};base64,${base64}`;
      console.log(`✅ Base64 conversion successful:`);
      console.log(`   - Format: ${magicBytesResult.format}`);
      console.log(`   - MIME Type: ${finalContentType}`);
      console.log(`   - Base64 length: ${base64.length} characters`);
      console.log(`   - Data URI preview: ${dataUri.substring(0, 60)}...`);

      return dataUri;
    } catch (error) {
      console.error("❌ Error in convertImageUrlToBase64:", error);
      if (error instanceof Error) {
        console.error("❌ Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack?.split("\n")[0],
        });
      }
      return null;
    }
  }
  private validateAndDetectImageFormat(buffer: Buffer): {
    isValid: boolean;
    format: string;
    mimeType: string | null;
  } {
    if (buffer.length < 4) {
      return { isValid: false, format: "unknown", mimeType: null };
    }

    const magicBytes = buffer.slice(0, 12).toString("hex").toUpperCase();
    console.log(`🔍 Checking magic bytes: ${magicBytes}`);
    if (magicBytes.startsWith("FFD8FF")) {
      console.log("✅ JPEG format detected");
      return { isValid: true, format: "JPEG", mimeType: "image/jpeg" };
    }
    if (magicBytes.startsWith("89504E470D0A1A0A")) {
      console.log("✅ PNG format detected");
      return { isValid: true, format: "PNG", mimeType: "image/png" };
    }
    if (
      magicBytes.startsWith("474946383761") ||
      magicBytes.startsWith("474946383961")
    ) {
      console.log("✅ GIF format detected");
      return { isValid: true, format: "GIF", mimeType: "image/gif" };
    }
    if (magicBytes.startsWith("424D")) {
      console.log("✅ BMP format detected");
      return { isValid: true, format: "BMP", mimeType: "image/bmp" };
    }
    if (magicBytes.startsWith("52494646") && magicBytes.includes("57454250")) {
      console.log("✅ WebP format detected");
      return { isValid: true, format: "WebP", mimeType: "image/webp" };
    }
    if (magicBytes.startsWith("89504E47")) {
      console.log("✅ PNG format detected (partial header)");
      return { isValid: true, format: "PNG", mimeType: "image/png" };
    }
    console.warn(
      `⚠️ Unknown format, but attempting anyway. Magic bytes: ${magicBytes}`
    );
    if (buffer.length > 100 && buffer.length < 10000000) {
      console.log("🤔 Unknown format but reasonable file size - assuming PNG");
      return {
        isValid: true,
        format: "Unknown (assumed PNG)",
        mimeType: "image/png",
      };
    }
    return { isValid: false, format: "unknown", mimeType: null };
  }
  async processSignatureImage(signatureFile: any): Promise<{
    html: string;
    base64: string | null;
    success: boolean;
  }> {
    if (!signatureFile?.location) {
      console.log("No signature file provided");
      return {
        html: `<div class="signature-placeholder">
        <p><strong>Customer Signature:</strong> <em>Not provided</em></p>
      </div>`,
        base64: null,
        success: false,
      };
    }
    console.log("Processing signature:", signatureFile.location);
    try {
      const signatureBase64 = await this.convertImageUrlToBase64(
        signatureFile.location
      );

      if (signatureBase64) {
        console.log("✅ Signature converted to base64 successfully");
        const signatureHtml = `<div class="signature-container">
<div class="signature-header">
<h3>Digital Signature</h3>
</div>
<div class="signature-content">
<p class="signature-label"><strong>Customer Signature:</strong></p>
<div class="signature-image-wrapper">
<img src="${signatureBase64}" alt="Customer Signature" class="signature-image">
</div>
<div class="signature-details">
<p class="signature-date"><strong>Signed Date:</strong> ${new Date().toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        )}</p>
<p class="signature-time"><strong>Signed Time:</strong> ${new Date().toLocaleTimeString(
          "en-US"
        )}</p>
</div>
</div>
</div>`;

        return {
          html: signatureHtml,
          base64: signatureBase64,
          success: true,
        };
      } else {
        console.warn("❌ Base64 conversion failed, trying direct URL");
        const fallbackHtml = `<div class="signature-container">
<div class="signature-header">
<h3>Digital Signature</h3>
</div>
<div class="signature-content">
<p class="signature-label"><strong>Customer Signature:</strong></p>
<div class="signature-image-wrapper">
<img src="${
          signatureFile.location
        }" alt="Customer Signature" class="signature-image" crossorigin="anonymous">
</div>
<div class="signature-details">
<p class="signature-date"><strong>Signed Date:</strong> ${new Date().toLocaleDateString(
          "en-US"
        )}</p>
<p class="signature-time"><strong>Signed Time:</strong> ${new Date().toLocaleTimeString(
          "en-US"
        )}</p>
<p class="signature-url"><strong>Source:</strong> S3 Image</p>
</div>
</div>
</div>`;

        return {
          html: fallbackHtml,
          base64: null,
          success: false,
        };
      }
    } catch (error) {
      console.error("❌ Error processing signature:", error);
      const errorHtml = `<div class="signature-container signature-error">
<div class="signature-header">
<h3>Digital Signature</h3>
</div>
<div class="signature-content">
<p class="signature-label"><strong>Customer Signature:</strong></p>
<div class="signature-fallback">
<p>⚠️ Signature image processing failed</p>
<p><strong>Error:</strong> ${
        error instanceof Error ? error.message : "Unknown error"
      }</p>
<p><strong>URL:</strong> ${signatureFile.location}</p>
<p><a href="${signatureFile.location}" target="_blank">📎 View Original</a></p>
</div>
<div class="signature-details">
<p class="signature-date"><strong>Attempt Date:</strong> ${new Date().toLocaleDateString(
        "en-US"
      )}</p>
</div>
</div>
</div>`;

      return {
        html: errorHtml,
        base64: null,
        success: false,
      };
    }
  }
  async testS3Image(imageUrl: string): Promise<void> {
    console.log("🧪 Testing S3 image directly...");

    try {
      const fetch = (await import("node-fetch")).default;
      const response = await fetch(imageUrl);
      const buffer = await response.buffer();

      console.log("📊 S3 Image Test Results:");
      console.log("  Status:", response.status);
      console.log("  Content-Type:", response.headers.get("content-type"));
      console.log("  Size:", buffer.length, "bytes");
      console.log("  Magic bytes:", buffer.slice(0, 8).toString("hex"));

      const detection = this.validateAndDetectImageFormat(buffer);
      console.log("  Format detection:", detection);

      if (detection.isValid) {
        const base64 = buffer.toString("base64");
        const dataUri = `data:${detection.mimeType};base64,${base64}`;
        console.log("  ✅ Successfully converted to base64");
        console.log("  Data URI length:", dataUri.length);
        console.log("  Preview:", dataUri.substring(0, 100) + "...");
        const testHtml = `<img src="${dataUri}" alt="Test Signature" style="max-width: 200px; border: 2px solid green;">`;
        console.log("  Test HTML:", testHtml);
      } else {
        console.log("  ❌ Format detection failed");
      }
    } catch (error) {
      console.error("❌ S3 test failed:", error);
    }
  }
  private validateImageMagicBytes(
    buffer: Buffer,
    contentType: string | null
  ): boolean {
    const magicBytes = buffer.toString("hex").toUpperCase();
    const validMagicBytes = {
      FFD8FF: "image/jpeg", // JPEG
      "89504E47": "image/png", // PNG
      "47494638": "image/gif", // GIF
      "424D": "image/bmp", // BMP
      "52494646": "image/webp", // WebP (starts with RIFF)
    };

    for (const [magic, expectedType] of Object.entries(validMagicBytes)) {
      if (magicBytes.startsWith(magic)) {
        console.log(`✅ Valid image format detected: ${expectedType}`);
        return true;
      }
    }

    console.warn(
      `⚠️ Unknown image format. Magic bytes: ${magicBytes.substring(0, 16)}...`
    );
    console.warn(`⚠️ Content-Type: ${contentType}`);

    // Still allow if content-type suggests it's an image
    return contentType?.startsWith("image/") || false;
  }

  async submitVisitWithContract(payload: {
    lead_id: number;
    signatureFile: any;
    contract_template_id: number;
    parsedMetaData: Record<string, string>;
    dropdownValues?: Record<string, string>;
    rep_id: number;
  }): Promise<{ data: any; status: number; message: string }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const visitRepo = dataSource.getRepository(Visit);
      const contractRepo = dataSource.getRepository(Contract);
      const templateRepo = dataSource.getRepository(ContractTemplate);

      const visitData = {
        lead_id: payload.lead_id,
        rep_id: payload.rep_id,
        latitude: 0,
        longitude: 0,
        check_in_time: getFinnishTime(),
        photos: [],
        parsedFollowUps: [],
        notes: "",
      };

      const visits = await visitRepo.create(visitData);
      const savedVisit = await visitRepo.save(visits);

      const template = await templateRepo.findOneBy({
        id: payload.contract_template_id,
      });

      if (!template) {
        await queryRunner.rollbackTransaction();
        return {
          data: null,
          message: "Contract template not found",
          status: 404,
        };
      }

      if (
        template.dropdown_fields &&
        Object.keys(template.dropdown_fields).length > 0
      ) {
        const dropdownValues = payload.dropdownValues || {};
        const validation = validateDropdownValues(
          template.dropdown_fields,
          dropdownValues
        );

        if (!validation.isValid) {
          await queryRunner.rollbackTransaction();
          return {
            data: null,
            message: `Validation failed: ${validation.errors.join(", ")}`,
            status: 400,
          };
        }
      }

      // Process signature with enhanced method
      console.log("🔄 Processing signature image...");
      const signatureResult = await this.processSignatureImage(
        payload.signatureFile
      );

      console.log("✅ Signature processing result:", {
        success: signatureResult.success,
        hasBase64: !!signatureResult.base64,
        base64Preview: signatureResult.base64?.substring(0, 50) + "...",
      });

      // CORE FIX: Prepare metadata with the correct signature_image_url value
      const baseMetadata = {
        ...payload.parsedMetaData,
        date_signed: new Date().toLocaleDateString("en-US"),
        signed_date: new Date().toLocaleDateString("en-US"),
        signed_time: new Date().toLocaleTimeString("en-US"),
        contract_date: new Date().toLocaleDateString("en-US"),
        current_date: new Date().toLocaleDateString("en-US"),
        timestamp: new Date().toISOString(),
        signature_image_url: "",
      };

      // CRITICAL: Set signature_image_url to ONLY the base64 data URI for your template
      if (signatureResult.success && signatureResult.base64) {
        baseMetadata.signature_image_url = signatureResult.base64;
        console.log("✅ Set signature_image_url to base64 data URI");
        console.log("📏 Data URI length:", signatureResult.base64.length);
      } else {
        // Fallback to S3 URL if base64 failed
        baseMetadata.signature_image_url =
          payload.signatureFile?.location || "";
        console.log("⚠️ Using S3 URL fallback for signature_image_url");
      }

      // Add other signature fields for different template formats
      const updatedMetaData = {
        ...baseMetadata,
        signature: signatureResult.html,
        signature_html: signatureResult.html,
        customer_signature: signatureResult.html,
        digital_signature: signatureResult.html,
        buyer_signature: signatureResult.html,
        client_signature: signatureResult.html,
        signature_base64: signatureResult.base64 || "",
        signature_status: signatureResult.success ? "completed" : "error",
        has_signature: signatureResult.success ? "yes" : "no",
      };

      console.log("🔧 Final metadata check:");
      console.log(
        "- signature_image_url starts with 'data:image/':",
        updatedMetaData.signature_image_url?.startsWith("data:image/")
      );
      console.log(
        "- signature_image_url length:",
        updatedMetaData.signature_image_url?.length || 0
      );

      // Render contract HTML
      let renderedHtml: string;
      if (
        template.dropdown_fields &&
        Object.keys(template.dropdown_fields).length > 0
      ) {
        renderedHtml = renderContractWithDropdowns(
          template.content,
          updatedMetaData,
          payload.dropdownValues || {}
        );
      } else {
        renderedHtml = renderContract(template.content, updatedMetaData);
      }

      // VERIFICATION: Check if signature was properly rendered
      const hasSignatureImg =
        renderedHtml.includes("<img") && renderedHtml.includes("signature");
      const hasDataUri = renderedHtml.includes("data:image/");
      const hasBrokenImg = renderedHtml.includes('<img src="<img');

      console.log("🔍 Rendered HTML verification:");
      console.log("- Contains signature img tag:", hasSignatureImg);
      console.log("- Contains data URI:", hasDataUri);
      console.log("- Has broken nested img:", hasBrokenImg);

      if (hasBrokenImg) {
        console.error("❌ DETECTED BROKEN NESTED IMG TAG!");
        // Try to fix broken nested img tags
        renderedHtml = renderedHtml.replace(
          /<img src="<img src="([^"]+)"[^>]*>/gi,
          '<img src="$1"'
        );
        console.log("🔧 Attempted to fix broken img tags");
      }

      // Final check: If still no signature image in HTML, inject it manually
      if (!hasDataUri && signatureResult.base64) {
        console.log("🚨 Manually injecting signature image");
        const manualSignature = `
        <div style="margin-top: 20px; text-align: center;">
          <p><strong>Customer Signature:</strong></p>
          <img src="${signatureResult.base64}" alt="Customer Signature" style="max-width: 200px; height: auto; border: 1px solid #ccc; padding: 5px;">
        </div>
      `;
        renderedHtml = renderedHtml.replace(
          /<\/body>/i,
          manualSignature + "</body>"
        );
      }

      // Generate PDF
      const pdfBuffer = await this.generatePdfFromHtml(
        renderedHtml,
        signatureResult.base64 ?? ""
      );
      const finalPdfBuffer = Buffer.isBuffer(pdfBuffer)
        ? pdfBuffer
        : Buffer.from(pdfBuffer);

      console.log("📄 PDF Generation Result:", {
        bufferSize: finalPdfBuffer.length,
        isValidPDF: finalPdfBuffer.slice(0, 4).toString() === "%PDF",
        signatureIncluded: signatureResult.success,
      });

      const contract = contractRepo.create({
        contract_template_id: template.id,
        visit_id: savedVisit.visit_id,
        rendered_html: renderedHtml,
        metadata: updatedMetaData,
        signed_at: getFinnishTime(),
      });

      const savedContract = await contractRepo.save(contract);

      // Save the contract image
      await dataSource.getRepository(ContractImage).save({
        contract_id: savedContract.id,
        image_url: payload.signatureFile?.location,
        metadata: payload.signatureFile,
      });

      // Save the contract PDF
      const contractPDF = dataSource.getRepository(ContractPDF).create({
        contract_id: savedContract.id,
        pdf_data: pdfBuffer,
        created_at: getFinnishTime(),
      } as DeepPartial<ContractPDF>);

      await dataSource.getRepository(ContractPDF).save(contractPDF);

      savedVisit.contract = savedContract;
      await visitRepo.save(savedVisit);

      // Update lead status to "Signed"
      const leadRepo = dataSource.getRepository(Leads);
      const lead = await leadRepo.findOne({
        where: { lead_id: payload.lead_id },
      });

      if (lead) {
        lead.status = LeadStatus.Signed;
        lead.updated_at = getFinnishTime();
        lead.updated_by = "system";
        await leadRepo.save(lead);
      }

      const newContract = await dataSource.getRepository(Contract).findOne({
        where: { id: savedContract.id },
        relations: { images: true, pdf: true },
      });

      await queryRunner.commitTransaction();

      return {
        data: newContract,
        message: `Contract signed successfully${
          signatureResult.success
            ? " with signature"
            : " (signature processing failed)"
        }`,
        status: 200,
      };
    } catch (error) {
      console.error("❌ Error signing the contract:", error);
      await queryRunner.rollbackTransaction();
      return {
        data: null,
        message: "Error signing the contract",
        status: 500,
      };
    } finally {
      await queryRunner.release();
    }
  }

  // Enhanced PDF generation with better buffer handling
  async generatePdfFromHtml(
    html: string,
    signatureBase64?: string
  ): Promise<Buffer> {
    let browser: import("puppeteer").Browser | null = null;

    try {
      console.log("Starting PDF generation...");
      const isDev = process.env.NODE_ENV !== "production";

      const browserOptions = {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-web-security",
          "--allow-running-insecure-content",
          "--disable-features=VizDisplayCompositor",
          "--disable-extensions",
          "--disable-plugins",
          "--disable-gpu",
          "--no-first-run",
          "--disable-default-apps",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
        ],
      };

      if (isDev) {
        browser = await puppeteer.launch(browserOptions);
      } else {
        try {
          const chrome = require("chrome-aws-lambda");
          browser = await puppeteer.launch({
            args: [...chrome.args, ...browserOptions.args],
            defaultViewport: chrome.defaultViewport,
            executablePath: await chrome.executablePath,
            headless: chrome.headless,
          });
        } catch (e) {
          console.warn(
            "chrome-aws-lambda not available, using regular puppeteer"
          );
          browser = await puppeteer.launch(browserOptions);
        }
      }

      const page = await browser.newPage();

      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1024,
        height: 768,
        deviceScaleFactor: 2,
      });

      // Company logo (replace with your actual logo)
      const companyLogo = `data:image/svg+xml;base64,${Buffer.from(
        `
      <svg width="150" height="60" viewBox="0 0 150 60" xmlns="http://www.w3.org/2000/svg">
        <rect width="150" height="60" fill="#2c3e50" rx="5"/>
        <text x="75" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">
TRACK        </text>
    
      </svg>
    `
      ).toString("base64")}`;

      // Create comprehensive styled HTML
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
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #333;
            background: #fff;
            padding: 0;
          }
          .document-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            min-height: 297mm;
            position: relative;
          }
          
          .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 25px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            min-height: 80px;
          }
          
          .logo {
            max-height: 60px;
            width: auto;
          }
          
          .header-info {
            text-align: right;
            flex: 1;
            margin-left: 20px;
          }
          
          .header-info h1 {
            margin: 0 0 5px 0;
            font-size: 28px;
            font-weight: 300;
            letter-spacing: 1px;
            color:#ffffff;
          }
          
          .header-info p {
            margin: 0;
            opacity: 0.9;
            font-size: 12px;
          }
          
          .content {
            padding: 0 25px;
            min-height: calc(100% - 200px);
          }
          
          .contract-body {
            margin-bottom: 40px;
          }
          
          .signature-container {
            margin: 40px 0;
            padding: 25px;
            border: 3px solid #e74c3c;
            border-radius: 10px;
            background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
            page-break-inside: avoid;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          .signature-header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e74c3c;
          }
          
          .signature-header h3 {
            color: #e74c3c;
            font-size: 18px;
            font-weight: 600;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .signature-content {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          
          .signature-label {
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 15px !important;
            font-size: 14px;
            text-align: center;
          }
          
          .signature-image-wrapper {
            background: white;
            padding: 15px;
            border: 3px solid #34495e;
            border-radius: 8px;
            margin: 15px 0;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
            min-height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .signature-image {
            max-width: 300px !important;
            max-height: 150px !important;
            border: none !important;
            padding: 0 !important;
            background: transparent !important;
            display: block !important;
            margin: 0 !important;
            object-fit: contain;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .signature-details {
            margin-top: 20px;
            text-align: center;
            padding: 15px;
            background: #ecf0f1;
            border-radius: 6px;
            width: 100%;
          }
          
          .signature-details p {
            margin: 5px 0;
            font-size: 12px;
            color: #2c3e50;
          }
          
          .signature-fallback {
            background: #fff3cd;
            border: 2px dashed #856404;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 15px 0;
          }
          
          .signature-error {
            border-color: #dc3545;
            background: linear-gradient(135deg, #fff5f5 0%, #fee);
          }
          
          .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
            color: white;
            padding: 20px 25px;
            text-align: center;
            font-size: 10px;
            p{
            color:#ffffff;}
          }
          
          h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin: 25px 0 15px 0;
            page-break-after: avoid;
          }
          
          h1 { 
            font-size: 24px; 
            border-bottom: 3px solid #3498db; 
            padding-bottom: 8px;
            margin-bottom: 20px;
          }
          h2 { 
            font-size: 18px; 
            color: #34495e;
            margin-top: 30px;
          }
          h3 { 
            font-size: 16px;
            margin-top: 25px;
          }
          
          p {
            margin-bottom: 12px;
            text-align: justify;
            line-height: 1.8;
          }
          
          strong {
            color: #2c3e50;
            font-weight: 600;
          }
          
          @media print {
            body { margin: 0; }
            .signature-image { 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .header, .footer {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .signature-container {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
          
          @page {
            margin: 0;
            size: A4;
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
              <p>Time: ${new Date().toLocaleTimeString("en-US")}</p>
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
          </div>
        </div>
      </body>
      </html>
    `;

      console.log("Setting page content...");

      // Set content and wait for everything to load
      await page.setContent(styledHtml, {
        waitUntil: ["networkidle0", "domcontentloaded"],
        timeout: 60000,
      });

      console.log("Waiting for images to load...");

      // Enhanced image loading wait
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          const images = Array.from(document.images);
          let loadedCount = 0;

          const checkComplete = () => {
            if (loadedCount >= images.length) {
              console.log("All images loaded");
              resolve();
            }
          };

          if (images.length === 0) {
            console.log("No images found");
            resolve();
            return;
          }

          images.forEach((img, index) => {
            if (img.complete && img.naturalWidth > 0) {
              loadedCount++;
              console.log(`Image ${index} already loaded`);
            } else {
              img.onload = () => {
                loadedCount++;
                console.log(`Image ${index} loaded successfully`);
                checkComplete();
              };
              img.onerror = (e) => {
                loadedCount++;
                console.log(`Image ${index} failed to load:`, e);
                checkComplete();
              };
            }
          });

          checkComplete();

          // Fallback timeout
          setTimeout(() => {
            console.log(
              `Timeout: ${loadedCount}/${images.length} images loaded`
            );
            resolve();
          }, 15000);
        });
      });

      // Additional wait for rendering
      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log("Generating PDF...");

      // Generate PDF with proper settings
      const pdfBuffer = await page.pdf({
        format: "a4",
        margin: {
          top: "0mm",
          right: "0mm",
          bottom: "0mm",
          left: "0mm",
        },
        printBackground: true,
        displayHeaderFooter: false,
        preferCSSPageSize: true,
      });

      console.log("PDF generated successfully, size:", pdfBuffer.length);

      // Ensure we return a proper Buffer
      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF from HTML:", error);

      // Enhanced fallback
      console.log("Attempting fallback PDF generation...");
      return this.generatePdfFromHtmlFallback(html, signatureBase64);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Enhanced fallback method with better formatting
  private async generatePdfFromHtmlFallback(
    html: any,
    signatureBase64: any
  ): Promise<Buffer> {
    const plainText = convert(html, {
      wordwrap: 85,
      selectors: [
        { selector: "h1", format: "block", options: { uppercase: true } },
        { selector: "h2", format: "block", options: { uppercase: true } },
        { selector: "strong", format: "inline" },
        { selector: "br", format: "inline", options: { baseElement: "br" } },
        { selector: "img", format: "skip" },
      ],
    });

    return new Promise((resolve, reject) => {
      const buffers: Buffer[] = [];
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: "Contract Agreement",
          Author: "Your Company",
          Subject: "Signed Contract",
          CreationDate: new Date(),
        },
      });

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Add header
      doc
        .fontSize(18)
        .fillColor("#2c3e50")
        .text("CONTRACT AGREEMENT", 50, 50, { align: "center" });

      doc
        .fontSize(10)
        .fillColor("#666")
        .text(
          `Generated on ${new Date().toLocaleDateString("fi-FI")}`,
          50,
          80,
          { align: "center" }
        );

      // Add content
      doc.fontSize(11).fillColor("#333").text(plainText, 50, 120, {
        align: "left",
        lineGap: 3,
        width: 500,
      });

      // Add signature if available
      if (signatureBase64) {
        try {
          // Extract base64 data
          const base64Data = signatureBase64.replace(
            /^data:image\/[a-z]+;base64,/,
            ""
          );
          const signatureBuffer = Buffer.from(base64Data, "base64");

          doc.moveDown(2);
          doc
            .fontSize(12)
            .fillColor("#2c3e50")
            .text("Customer Signature:", { continued: false });

          doc.image(signatureBuffer, {
            width: 200,
            height: 100,
            align: "center",
          });

          doc
            .fontSize(9)
            .fillColor("#666")
            .text(`Signed on: ${new Date().toLocaleDateString("fi-FI")}`, {
              align: "left",
            });
        } catch (error) {
          console.error("Error adding signature to PDF:", error);
          doc.moveDown(2);
          doc
            .fontSize(12)
            .text(
              "Customer Signature: [Signature image could not be embedded]"
            );
        }
      }

      doc.end();
    });
  }

  private async getOptimizedRoute(
    origin: string,
    waypoints: string[]
  ): Promise<DirectionsResult> {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin,
          destination: waypoints[waypoints.length - 1],
          waypoints: `optimize:true|${waypoints.join("|")}`,
          key: process.env.GOOGLE_MAPS_API_KEY,
          departure_time: "now",
          timestamp: Date.now(),
        },
      }
    );
    const data = response.data;
    if (data.status !== "OK") {
      throw new Error(
        data.status === "ZERO_RESULTS"
          ? "No valid route found. Check waypoint distances or coordinates."
          : `Google Maps Directions API error: ${data.status}`
      );
    }
    return {
      route: data.routes[0],
      waypointOrder: data.routes[0].waypoint_order,
    };
  }
  private async handleVisit(
    queryRunner: QueryRunner,
    visitData: VisitData,
    uncompletedVisit?: Visit
  ): Promise<Visit> {
    if (uncompletedVisit) {
      uncompletedVisit.check_in_time = visitData.check_in_time;
      if (visitData.check_out_time !== undefined) {
        uncompletedVisit.check_out_time = visitData.check_out_time;
      }

      if (visitData.latitude !== undefined) {
        uncompletedVisit.latitude = visitData.latitude;
      }
      if (visitData.longitude !== undefined) {
        uncompletedVisit.longitude = visitData.longitude;
      }
      if (visitData.status !== undefined) {
        uncompletedVisit.status = visitData.status;
      }
      uncompletedVisit.created_by = visitData.created_by;
      if (visitData.notes) uncompletedVisit.notes = visitData.notes;
      if (visitData.photo_urls) {
        uncompletedVisit.photo_urls = [
          ...(Array.isArray(uncompletedVisit.photo_urls)
            ? uncompletedVisit.photo_urls
            : uncompletedVisit.photo_urls
            ? JSON.parse(uncompletedVisit.photo_urls)
            : []),
          ...visitData.photo_urls,
        ];
      }
      const visit = await queryRunner.manager.save(Visit, uncompletedVisit);
      return visit;
    }
    const visit = await queryRunner.manager.save(Visit, {
      ...visitData,
      is_active: true,
    });
    return visit;
  }

  async planDailyVisits(
    repId: number,
    date: Date = getFinnishTime(),
    idempotencyKey: string = uuidv4()
  ): Promise<{ status: number; data?: any; message: string }> {
    return await this.withTransaction(async (queryRunner) => {
      try {
        const startOfDay = this.getStartOfDay(date);
        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(23, 59, 59, 999);

        // Check idempotency
        const existingIdempotency = await queryRunner.manager.findOne(
          Idempotency,
          {
            where: { key: idempotencyKey },
          }
        );

        if (existingIdempotency) {
          return {
            status: httpStatusCodes.OK,
            data: existingIdempotency.result,
            message: "Request already processed",
          };
        }

        // Get existing visits and route
        const existingVisits = await queryRunner.manager.find(Visit, {
          where: {
            rep_id: Equal(repId),
            check_in_time: MoreThanOrEqual(startOfDay),
            is_active: true,
          },
        });
        const repAddress = await queryRunner.manager
          .getRepository(User)
          .findOne({ where: { user_id: repId }, relations: { address: true } });

        const existingRoute = await queryRunner.manager.findOne(Route, {
          where: { rep_id: Equal(repId), route_date: Equal(startOfDay) },
          lock: { mode: "pessimistic_write" },
        });

        // Fetch uncompleted visits
        const uncompletedVisits = await queryRunner.manager.find(Visit, {
          where: {
            rep_id: Equal(repId),
            check_in_time: LessThan(startOfDay),
            check_out_time: IsNull(),
            is_active: true,
          },
          relations: ["lead", "lead.address"],
        });

        const updatedUncompletedLeads = uncompletedVisits
          .map((visit) => {
            if (
              visit.lead &&
              visit.lead.is_active &&
              !visit.lead.pending_assignment &&
              visit.lead.address?.latitude &&
              visit.lead.address?.longitude
            ) {
              return {
                ...visit.lead,
                updatedVisit: {
                  ...visit,
                  check_in_time: getFinnishTime(), // will be overwritten later
                },
              };
            }
            return null;
          })
          .filter((lead): lead is NonNullable<typeof lead> => lead !== null);

        // Get all valid customers
        const allCustomers = await queryRunner.manager.find(Leads, {
          where: {
            assigned_rep_id: Equal(repId),
            is_active: true,
            pending_assignment: false,
          },
          relations: ["address"],
          order: { created_at: "ASC" },
        });

        const validCustomers = allCustomers.filter(
          (c) => c.address?.latitude && c.address?.longitude
        );

        // Fetch today's follow-up leads
        const followUpLeadsRaw = await queryRunner.manager
          .createQueryBuilder(FollowUp, "fu")
          .leftJoin(FollowUpVisit, "fuv", "fu.follow_up_id = fuv.follow_up_id")
          .leftJoin(Visit, "v", "fuv.visit_id = v.visit_id")
          .select("v.lead_id", "lead_id")
          .where("fu.scheduled_date BETWEEN :start AND :end", {
            start: startOfDay,
            end: endOfDay,
          })
          .andWhere("fu.is_completed = false")
          .getRawMany();

        const followUpLeadIds = followUpLeadsRaw.map((f) => f.lead_id);
        const followUpLeads = validCustomers.filter((c) =>
          followUpLeadIds.includes(c.lead_id)
        );

        // Combine all leads with priority: uncompleted > follow-ups > others
        const leadsMap = new Map<number, Leads>();

        updatedUncompletedLeads.forEach((lead) =>
          leadsMap.set(lead.lead_id, lead)
        );
        followUpLeads.forEach((lead) => {
          if (!leadsMap.has(lead.lead_id)) leadsMap.set(lead.lead_id, lead);
        });
        validCustomers.forEach((lead) => {
          if (!leadsMap.has(lead.lead_id)) leadsMap.set(lead.lead_id, lead);
        });

        const leadsToPlan = Array.from(leadsMap.values()).slice(0, 10);

        if (!leadsToPlan.length) {
          return {
            status: httpStatusCodes.OK,
            data: null,
            message: "No valid leads available for visit planning",
          };
        }

        const leadIds = leadsToPlan.map((lead) => lead.lead_id);
        if (new Set(leadIds).size !== leadIds.length) {
          return {
            status: httpStatusCodes.BAD_REQUEST,
            data: null,
            message: "Duplicate leads detected in visit planning",
          };
        }

        const waypoints = leadsToPlan
          .filter((lead) => lead.address?.latitude && lead.address?.longitude) // Filter out invalid addresses
          .map((lead) => `${lead.address.latitude},${lead.address.longitude}`);

        const origin =
          repAddress?.address?.latitude && repAddress?.address?.longitude
            ? `${repAddress.address.latitude},${repAddress.address.longitude}`
            : null;
        if (!origin) {
          console.log(
            `Skipping rep ${repId} due to missing or incomplete address`
          );
          return {
            status: httpStatusCodes.OK,
            data: null,
            message: `Rep ${repId} skipped due to missing address.`,
          };
        }
        const { route, waypointOrder } = await this.getOptimizedRoute(
          origin,
          waypoints
        );

        let currentTime = new Date(date);
        currentTime.setHours(9, 0, 0, 0);

        const previousVisitMap = new Map(
          [...uncompletedVisits, ...existingVisits].map((visit) => [
            visit.lead_id,
            visit,
          ])
        );

        const routeOrder: RouteOrderItem[] = [];
        const visits: Visit[] = [];

        for (let i = 0; i < waypointOrder.length; i++) {
          const index = waypointOrder[i];
          const lead = leadsToPlan[index];
          const leg = route.legs[i];
          const duration = leg.duration.value / 60;

          currentTime = new Date(currentTime.getTime() + duration * 60000);
          const eta = currentTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          const visitData: VisitData = {
            lead_id: lead.lead_id,
            rep_id: repId,
            check_in_time: currentTime,
            latitude: lead.address.latitude,
            longitude: lead.address.longitude,
            created_by: "system",
          };

          const visit = await this.handleVisit(
            queryRunner,
            visitData,
            previousVisitMap.get(lead.lead_id) ?? undefined
          );

          visits.push(visit);
          routeOrder.push({
            lead_id: lead.lead_id,
            visit_id: visit.visit_id,
            latitude: lead.address.latitude,
            longitude: lead.address.longitude,
            lead_status: lead.status,
            distance: Number((leg.distance.value / 1000).toFixed(2)),
            eta,
          });
        }

        // Update or create route
        let routeEntity;
        if (existingRoute) {
          existingRoute.route_order = routeOrder;
          existingRoute.updated_by = "system";
          existingRoute.updated_at = getFinnishTime();
          routeEntity = await queryRunner.manager.save(existingRoute);
        } else {
          routeEntity = await queryRunner.manager.save(Route, {
            rep_id: repId,
            route_date: startOfDay,
            route_order: routeOrder,
            created_by: "system",
          });
        }

        // Save idempotency
        await queryRunner.manager.save(Idempotency, {
          key: idempotencyKey,
          result: { visits, route: routeEntity },
        });

        return {
          status: httpStatusCodes.OK,
          data: { visits, route: routeEntity },
          message: "Daily visits planned successfully",
        };
      } catch (error: any) {
        console.log(error);
        throw this.handleError(error, "Failed to plan daily visits");
      }
    });
  }

  async planVisit(
    rep_id: number,
    repLatitude: number,
    repLongitude: number,
    lead_ids: number[],
    idempotencyKey: string = uuidv4()
  ): Promise<{ status: number; data?: any; message: string }> {
    return await this.withTransaction(async (queryRunner) => {
      try {
        if (!lead_ids || lead_ids.length === 0) {
          return {
            status: httpStatusCodes.BAD_REQUEST,
            data: null,
            message: "No lead IDs provided. Cannot plan visits.",
          };
        }

        const latitude = parseFloat(String(repLatitude));
        const longitude = parseFloat(String(repLongitude));
        const startOfDay = this.getStartOfDay(getFinnishTime());
        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(23, 59, 59, 999);
        const existingIdempotency = await queryRunner.manager.findOne(
          Idempotency,
          {
            where: { key: idempotencyKey },
          }
        );

        if (existingIdempotency) {
          return {
            status: httpStatusCodes.OK,
            data: existingIdempotency.result,
            message: "Request already processed",
          };
        }

        const existingVisits = await queryRunner.manager.find(Visit, {
          where: {
            rep_id: Equal(rep_id),
            is_active: true,
          },
        });

        const repAddress = await queryRunner.manager
          .getRepository(User)
          .findOne({
            where: { user_id: rep_id },
            relations: { address: true },
          });

        const existingRoute = await queryRunner.manager.findOne(Route, {
          where: { rep_id: Equal(rep_id) },
          lock: { mode: "pessimistic_write" },
        });

        const uncompletedVisits = await queryRunner.manager.find(Visit, {
          where: {
            rep_id: Equal(rep_id),
            check_out_time: IsNull(),
            is_active: true,
          },
          relations: ["lead", "lead.address"],
        });

        const updatedUncompletedLeads = uncompletedVisits
          .map((visit) => {
            if (
              visit.lead &&
              visit.lead.is_active &&
              !visit.lead.pending_assignment &&
              visit.lead.address?.latitude &&
              visit.lead.address?.longitude
            ) {
              return {
                ...visit.lead,
                updatedVisit: {
                  ...visit,
                  check_in_time: getFinnishTime(),
                },
              };
            }
            return null;
          })
          .filter((lead): lead is NonNullable<typeof lead> => lead !== null);

        const providedLeads = await queryRunner.manager.find(Leads, {
          where: { lead_id: In(lead_ids) },
          relations: ["address"],
          order: { created_at: "ASC" },
        });

        const validLeads = providedLeads.filter(
          (c) => c.address?.latitude && c.address?.longitude
        );
        const leadsMap = new Map<number, Leads>();
        updatedUncompletedLeads.forEach((lead) =>
          leadsMap.set(lead.lead_id, lead)
        );
        validLeads.forEach((lead) => {
          if (!leadsMap.has(lead.lead_id)) leadsMap.set(lead.lead_id, lead);
        });

        const leadsToPlan = Array.from(leadsMap.values());

        if (!leadsToPlan.length) {
          return {
            status: httpStatusCodes.OK,
            data: null,
            message: "No valid leads available for visit planning",
          };
        }

        const leadIds = leadsToPlan.map((lead) => lead.lead_id);
        if (new Set(leadIds).size !== leadIds.length) {
          return {
            status: httpStatusCodes.BAD_REQUEST,
            data: null,
            message: "Duplicate leads detected in visit planning",
          };
        }
        leadsToPlan.forEach((lead) => {
          lead.status = LeadStatus.Start_Signing;
          lead.updated_at = getFinnishTime();
          lead.updated_by = "system";
        });

        // Save updated leads
        await queryRunner.manager.save(Leads, leadsToPlan).catch((e) => {
          throw new Error(`Failed to update lead statuses: ${e.message}`);
        });
        const waypoints = leadsToPlan.map(
          (lead) => `${lead.address.latitude},${lead.address.longitude}`
        );

        const origin = `${latitude},${longitude}`;
        const { route, waypointOrder } = await this.getOptimizedRoute(
          origin,
          waypoints
        );

        let currentTime = new Date(getFinnishTime());
        currentTime.setHours(9, 0, 0, 0);

        const previousVisitMap = new Map(
          [...uncompletedVisits, ...existingVisits].map((visit) => [
            visit.lead_id,
            visit,
          ])
        );

        const routeOrder: RouteOrderItem[] = [];
        const visits: Visit[] = [];

        for (let i = 0; i < waypointOrder.length; i++) {
          const index = waypointOrder[i];
          const lead = leadsToPlan[index];
          const leg = route.legs[i];
          const duration = leg.duration.value / 60;

          currentTime = new Date(currentTime.getTime() + duration * 60000);
          const eta = currentTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          const visitData: VisitData = {
            lead_id: lead.lead_id,
            rep_id: rep_id,
            check_in_time: currentTime,
            latitude: lead.address.latitude,
            longitude: lead.address.longitude,
            created_by: "system",
          };

          const visit = await this.handleVisit(
            queryRunner,
            visitData,
            previousVisitMap.get(lead.lead_id) ?? undefined
          );

          visits.push(visit);
          routeOrder.push({
            lead_id: lead.lead_id,
            visit_id: visit.visit_id,
            latitude: lead.address.latitude,
            longitude: lead.address.longitude,
            lead_status: lead.status,
            distance: Number((leg.distance.value / 1000).toFixed(2)),
            eta,
          });
        }

        let routeEntity;
        if (existingRoute) {
          existingRoute.route_order = routeOrder;
          existingRoute.updated_by = "system";
          existingRoute.updated_at = getFinnishTime();
          routeEntity = await queryRunner.manager.save(existingRoute);
        } else {
          routeEntity = await queryRunner.manager.save(Route, {
            rep_id: rep_id,
            route_date: startOfDay,
            route_order: routeOrder,
            created_by: "system",
          });
        }

        await queryRunner.manager.save(Idempotency, {
          key: idempotencyKey,
          result: { visits, route: routeEntity },
        });

        return {
          status: httpStatusCodes.OK,
          data: { visits, route: routeEntity },
          message: "Visits planned successfully",
        };
      } catch (error: any) {
        console.log(error);
        throw this.handleError(error, "Failed to plan visits");
      }
    });
  }

  async logVisit(data: {
    visit_id: number | undefined;
    lead_id: number;
    rep_id: number;
    latitude: number;
    longitude: number;
    contract_id?: number;
    notes?: string;
    photos?: any;
    parsedFollowUps?: any;
    status: LeadStatus;
  }): Promise<{ status: number; data?: any; message: string }> {
    return await this.withTransaction(async (queryRunner) => {
      try {
        let followUps = [];
        if (typeof data.parsedFollowUps === "string") {
          try {
            followUps = JSON.parse(data.parsedFollowUps);
          } catch (e) {
            console.error("Invalid followUps JSON");
            followUps = [];
          }
        } else if (Array.isArray(data.parsedFollowUps)) {
          followUps = data.parsedFollowUps;
        }

        const customer = await queryRunner.manager.findOne(Leads, {
          where: {
            lead_id: data.lead_id,
            assigned_rep_id: data.rep_id,
          },
        });

        if (!customer) {
          return {
            data: null,
            status: 404,
            message: "Customer not assigned to rep",
          };
        }

        let existingVisit;
        if (data.contract_id) {
          existingVisit = await queryRunner.manager.findOne(Visit, {
            where: {
              visit_id: data.visit_id,
            },
          });
        } else {
          existingVisit = await queryRunner.manager.findOne(Visit, {
            where: {
              lead_id: Equal(data.lead_id),
              check_in_time: MoreThanOrEqual(this.getStartOfDay()),
              check_out_time: IsNull(),
            },
          });
        }
        const photo_url = data.photos?.map((p: any) => {
          return p.location;
        });
        const visitData: VisitData = {
          lead_id: data.lead_id,
          rep_id: data.rep_id,
          check_in_time: getFinnishTime(), // Always create new
          check_out_time: getFinnishTime(),
          latitude: data.latitude,
          longitude: data.longitude,
          contract_id: data.contract_id, // Contract always gets attached here
          notes: data.notes,
          created_by: data.rep_id.toString(),
          photo_urls: photo_url,
          status: data.status,
        };
        const visit = await this.handleVisit(
          queryRunner,
          visitData,
          existingVisit ?? undefined
        );
        await queryRunner.manager
          .getRepository(Leads)
          .update(customer.lead_id, {
            lead_id: customer.lead_id,
            is_visited: true,
            status: data.status,
          });

        if (followUps.length > 0 && followUps != undefined) {
          for (const followUp of followUps) {
            const parsedDate = followUp.scheduled_date
              ? new Date(followUp.scheduled_date)
              : null;

            const followUpData: DeepPartial<FollowUp> = {
              subject: followUp.subject,
              notes: followUp.notes ?? "",
              scheduled_date:
                parsedDate instanceof Date && !isNaN(parsedDate.getTime())
                  ? parsedDate
                  : undefined,
              is_completed: false,
              created_by: data.rep_id,
            };

            const newFollowUp = queryRunner.manager.create(
              FollowUp,
              followUpData
            );
            const savedFollowUp = await queryRunner.manager.save(
              FollowUp,
              newFollowUp
            );

            await queryRunner.manager.save(FollowUpVisit, {
              follow_up_id: savedFollowUp.follow_up_id,
              visit_id: visit.visit_id,
            });
          }
        }
        return {
          status: httpStatusCodes.OK,
          data: visit,
          message: "Visit and follow-up(s) logged successfully",
        };
      } catch (error: any) {
        console.log(error);
        throw this.handleError(error, "Failed to log visit");
      }
    });
  }

  private isValidCoordinate(value: any, type: string): boolean {
    if (typeof value !== "number" || isNaN(value)) {
      return false;
    }
    const absValue = Math.abs(value);
    return type === "latitude" ? absValue <= 90 : absValue <= 180;
  }
  private getToday(): Date {
    const today = getFinnishTime();
    today.setHours(0, 0, 0, 0);
    return today;
  }
  private async getManagerAssignment(
    repId: number
  ): Promise<ManagerSalesRep | null> {
    const dataSource = await getDataSource();
    return dataSource.manager.findOne(ManagerSalesRep, {
      where: { sales_rep_id: repId },
      select: ["manager_id"],
    });
  }
  private async getVisitsForToday(repId: number): Promise<Visit[]> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const visits = await queryRunner.manager.find(Visit, {
        where: {
          rep_id: Equal(repId),
          is_active: true,
        },
        relations: ["lead", "lead.address"],
      });

      const visitsToKeep: Visit[] = [];
      const visitsToDelete: Visit[] = [];

      for (const visit of visits) {
        if (!visit.lead) {
          console.warn(`Visit ${visit.visit_id} has no associated lead`);
          visitsToDelete.push(visit);
          continue;
        }
        if (
          visit.lead.status.includes(
            LeadStatus.Signed ||
              LeadStatus.Not_Available ||
              LeadStatus.Not_Interested
          )
        ) {
          visitsToDelete.push(visit);
          continue;
        }

        if (visit.rep_id === visit.lead.assigned_rep_id) {
          visitsToKeep.push(visit);
        } else {
          console.log(
            `Visit ${visit.visit_id} rep_id ${visit.rep_id} does not match lead.assigned_rep_id ${visit.lead.assigned_rep_id}`
          );
          visitsToDelete.push(visit);
        }
      }
      await queryRunner.commitTransaction();
      return visitsToKeep;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("getVisitsForToday - Error:", error.message, error.stack);
      throw new Error(`Failed to fetch visits: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }
  private async saveRoute(
    repId: number,
    today: Date,
    routeOrder: RouteOrderItem[],
    createdBy: string
  ): Promise<any> {
    const dataSource = await getDataSource();
    const routeRepository = dataSource.getRepository(Route);
    const existingRoute = await routeRepository.findOne({
      where: { rep_id: Equal(repId) },
    });

    if (existingRoute) {
      return await routeRepository.update(
        { route_id: existingRoute.route_id },
        {
          route_order: routeOrder,
          updated_at: getFinnishTime(),
          created_by: createdBy,
          is_active: true,
        }
      );
    } else {
      return await routeRepository.save({
        rep_id: repId,
        route_date: today,
        route_order: routeOrder,
        created_by: createdBy,
        created_at: getFinnishTime(),
        is_active: true,
      });
    }
  }

  async getRouteForToday(repId: number): Promise<Route[]> {
    const dataSource = await getDataSource();
    return await dataSource.getRepository(Route).find({
      where: { rep_id: Equal(repId), is_active: true },
    });
  }

  async updateRoute(repId: number, date: Date, routeOrder: RouteOrderItem[]) {
    const dataSource = await getDataSource();
    return await dataSource.getRepository(Route).update(
      { rep_id: Equal(repId), route_date: Equal(date) },
      {
        route_order: routeOrder,
        updated_at: getFinnishTime(),
        is_active: true,
      }
    );
  }

  async generateDailyRoute(
    repId: number,
    repLatitude: number,
    repLongitude: number
  ): Promise<{ status: number; data?: any; message: string }> {
    try {
      const latitude = parseFloat(String(repLatitude));
      const longitude = parseFloat(String(repLongitude));
      const today = this.getToday();
      const visits = await this.getVisitsForToday(repId);
      if (!visits.length) {
        return {
          status: httpStatusCodes.OK,
          message: "No visits assigned to optimize",
          data: [],
        };
      }
      const validVisits = visits.filter(
        (visit) =>
          visit.lead?.address?.latitude && visit.lead?.address?.longitude
      );
      if (!validVisits.length) {
        throw new Error("No valid visit addresses for route optimization");
      }
      const origin = `${latitude},${longitude}`;
      const waypoints = validVisits.map(
        (visit) =>
          `${visit.lead.address.latitude},${visit.lead.address.longitude}`
      );
      const { route, waypointOrder } = await this.getOptimizedRoute(
        origin,
        waypoints
      );
      let currentTime = getFinnishTime();
      let cumulativeDistance = 0; // Track total distance from origin
      let cumulativeDuration = 0; // Track total time from origin
      const routeOrder: RouteOrderItem[] = [];

      for (let i = 0; i < waypointOrder.length; i++) {
        const index = waypointOrder[i];
        const visit = validVisits[index];
        const leg = route.legs[i];

        let segmentDistance = 0;
        let segmentDuration = 0;

        if (leg?.distance?.value && leg?.duration?.value) {
          segmentDistance = leg.distance.value / 1000; // Convert to km
          segmentDuration = leg.duration.value / 60; // Convert to minutes

          // Add to cumulative totals
          cumulativeDistance += segmentDistance;
          cumulativeDuration += segmentDuration;

          // Calculate ETA based on cumulative time from current location
          currentTime = new Date(
            getFinnishTime().getTime() + cumulativeDuration * 60000
          );
        } else {
          console.warn(`Invalid route leg at index ${i}, using defaults`);
        }

        const routeItem = {
          lead_id: visit.lead_id,
          latitude: visit.lead.address.latitude,
          longitude: visit.lead.address.longitude,
          visit_id: visit.visit_id,
          lead_status: visit.lead.status,
          distance: Number(cumulativeDistance.toFixed(2)), // Total distance from origin
          eta: currentTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          segmentDistance: Number(segmentDistance.toFixed(2)), // Distance from previous stop
          cumulativeTime: Math.round(cumulativeDuration), // Total travel time in minutes
        };

        // Check if lead_id already exists in routeOrder
        const existingIndex = routeOrder.findIndex(
          (item) => item.lead_id === visit.lead_id
        );
        if (existingIndex !== -1) {
          // Update existing entry
          routeOrder[existingIndex] = routeItem;
        } else {
          // Add new entry
          routeOrder.push(routeItem);
        }
      }
      await this.saveRoute(repId, today, routeOrder, "system");
      const routes = await this.getRouteForToday(repId);

      return {
        status: httpStatusCodes.OK,
        data: routes,
        message: "Daily route optimized successfully",
      };
    } catch (error: any) {
      return this.handleError(error, "Failed to optimize daily route");
    }
  }

  async refreshDailyRoute(
    repId: number,
    latitude: number,
    longitude: number
  ): Promise<{ status: number; data?: any; message: string }> {
    try {
      if (!this.isValidCoordinate(latitude, "latitude")) {
        throw new Error(`Invalid latitude: ${latitude}`);
      }
      if (!this.isValidCoordinate(longitude, "longitude")) {
        throw new Error(`Invalid longitude: ${longitude}`);
      }
      return await this.generateDailyRoute(repId, latitude, longitude);
    } catch (error: any) {
      return this.handleError(error, "Failed to refresh daily route");
    }
  }
  async updateRouteWithCurrentLocation(
    repId: number,
    currentLat: number,
    currentLng: number
  ): Promise<{ status: number; data?: any; message: string }> {
    try {
      const dataSource = await getDataSource();
      const route = await dataSource.manager.findOne(Route, {
        where: { rep_id: repId },
      });

      if (!route || !route.route_order || !Array.isArray(route.route_order)) {
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "No route found for today",
        };
      }

      const currentOrigin = `${currentLat},${currentLng}`;
      const remainingStops = (route.route_order as RouteOrderItem[]).filter(
        (item) => item.latitude && item.longitude
      );

      if (remainingStops.length === 0) {
        return {
          status: httpStatusCodes.OK,
          data: [],
          message: "No remaining stops in route",
        };
      }

      // Get updated route with current location
      const waypoints = remainingStops.map(
        (item) => `${item.latitude},${item.longitude}`
      );

      const { route: updatedRoute } = await this.getOptimizedRoute(
        currentOrigin,
        waypoints
      );

      // Update the route order with new calculations
      let cumulativeDistance = 0;
      let cumulativeDuration = 0;
      const currentTime = getFinnishTime();

      const updatedRouteOrder = remainingStops.map((item, index) => {
        const leg = updatedRoute.legs[index];

        if (leg?.distance?.value && leg?.duration?.value) {
          const segmentDistance = leg.distance.value / 1000;
          const segmentDuration = leg.duration.value / 60;

          cumulativeDistance += segmentDistance;
          cumulativeDuration += segmentDuration;

          const eta = new Date(
            currentTime.getTime() + cumulativeDuration * 60000
          );

          return {
            ...item,
            distance: Number(cumulativeDistance.toFixed(2)),
            segmentDistance: Number(segmentDistance.toFixed(2)),
            cumulativeTime: Math.round(cumulativeDuration),
            eta: eta.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        }

        return item; // Return original if no leg data
      });

      // Update the stored route
      route.route_order = updatedRouteOrder;
      await dataSource.manager.save(route);

      return {
        status: httpStatusCodes.OK,
        data: updatedRouteOrder,
        message: "Route updated with current location",
      };
    } catch (error: any) {
      return this.handleError(
        error,
        "Failed to update route with current location"
      );
    }
  }

  async getDailyRoute(
    repId: number
  ): Promise<{ status: number; data?: any; message: string }> {
    const dataSource = await getDataSource();
    try {
      const route = await dataSource.manager.findOne(Route, {
        where: { rep_id: repId },
        relations: { rep: true },
      });
      if (!route) {
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "No route found for today",
        };
      }
      if (
        !route.route_order ||
        !Array.isArray(route.route_order) ||
        route.route_order.length === 0
      ) {
        return {
          status: httpStatusCodes.OK,
          data: [],
          message: "No leads assigned to this route",
        };
      }
      const routeDetails = (
        await Promise.all(
          (route.route_order as RouteOrderItem[]).map(async (item) => {
            if (!item.lead_id) {
              return null;
            }
            const customer = await dataSource.manager.findOne(Leads, {
              where: {
                lead_id: Equal(item.lead_id),
                status: In([
                  LeadStatus.Prospect,
                  LeadStatus.Get_Back,
                  LeadStatus.Meeting,
                  LeadStatus.Hot_Lead,
                  LeadStatus.Start_Signing,
                ]),
              },
              relations: ["address"],
            });
            if (!customer) {
              return null;
            }
            return {
              lead_id: item.lead_id,
              name: customer.name || "anonymous",
              latitude: customer.address?.latitude,
              visit_id: item.visit_id,
              lead_status: item.lead_status,
              longitude: customer.address?.longitude,
              address: customer.address
                ? `${customer.address.street_address || ""}, ${
                    customer.address.city || ""
                  }, ${customer.address.state || ""} ${
                    customer.address.postal_code || ""
                  }`.trim()
                : null,
              eta: item.eta,
              distance: item.distance, // Total distance from salesman's current location
              segmentDistance: item.segmentDistance, // Distance from previous stop
              cumulativeTime: item.cumulativeTime, // Total travel time in minutes
            };
          })
        )
      ).filter((item): item is NonNullable<typeof item> => item !== null); // Filter out null entries

      return {
        status: httpStatusCodes.OK,
        data: routeDetails,
        message:
          routeDetails.length > 0
            ? "Retrieved successfully"
            : "No valid leads found for this route",
      };
    } catch (error: any) {
      return this.handleError(error, "Failed to retrieve daily route");
    }
  }

  async getPlannedVisits(
    repId: number,
    date?: string
  ): Promise<{ status: number; data?: any; message: string }> {
    const dataSource = await getDataSource();
    try {
      const targetDate = date ? new Date(date) : getFinnishTime();
      targetDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const plannedVisits = await dataSource.manager.find(Visit, {
        where: {
          rep_id: repId,
          created_at: Between(targetDate, nextDay),
          is_active: true,
        },
        relations: ["lead", "lead.address"],
        order: {
          check_in_time: "ASC",
        },
      });

      const visitsData = plannedVisits.map((visit) => ({
        visit_id: visit.visit_id,
        lead_id: visit.lead_id,
        name: visit.lead?.name || "Anonymous",
        contact_name: visit.lead?.contact_name,
        phone: visit.lead?.contact_phone,
        email: visit.lead?.contact_email,
        address: visit.lead?.address
          ? {
              street_address: visit.lead.address.street_address,
              city: visit.lead.address.city,
              state: visit.lead.address.state,
              postal_code: visit.lead.address.postal_code,
              latitude: visit.lead.address.latitude,
              longitude: visit.lead.address.longitude,
              formatted_address: `${visit.lead.address.street_address || ""}, ${
                visit.lead.address.city || ""
              }, ${visit.lead.address.state || ""} ${
                visit.lead.address.postal_code || ""
              }`.trim(),
            }
          : null,
        scheduled_time: visit.check_in_time,
        status: visit.status || "Pending",
        notes: visit.notes,
        lead_status: visit.lead?.status,
        is_completed: !!visit.check_out_time,
        contract: visit.contract,
        photos: visit.photo_urls || [],
      }));

      return {
        status: httpStatusCodes.OK,
        data: visitsData,
        message:
          visitsData.length > 0
            ? "Planned visits retrieved successfully"
            : "No planned visits found for the specified date",
      };
    } catch (error: any) {
      return this.handleError(error, "Failed to retrieve planned visits");
    }
  }
}
