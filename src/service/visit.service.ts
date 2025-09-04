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
import { renderContract, renderContractWithDropdowns, validateDropdownValues } from "../utils/renderContracts";
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

      // Validate dropdown values if template has dropdown fields
      if (template.dropdown_fields && Object.keys(template.dropdown_fields).length > 0) {
        const dropdownValues = payload.dropdownValues || {};
        const validation = validateDropdownValues(template.dropdown_fields, dropdownValues);
        
        if (!validation.isValid) {
          await queryRunner.rollbackTransaction();
          return {
            data: null,
            message: `Validation failed: ${validation.errors.join(', ')}`,
            status: 400,
          };
        }
      }

      // Prepare metadata with signature image as base64 or proper HTML img tag
      let signatureImageHtml = "";
      if (payload.signatureFile?.location) {
        try {
          // Try to convert URL to base64 for better PDF embedding
          const base64Image = await this.convertImageUrlToBase64(payload.signatureFile.location);
          if (base64Image) {
            signatureImageHtml = `<img src="${base64Image}" class="signature-image" alt="Customer Signature" style="max-width: 200px; height: auto; border: 1px solid #ddd; padding: 5px; display: block; margin: 10px 0;" />`;
          } else {
            // Fallback to direct URL if base64 conversion fails
            signatureImageHtml = `<img src="${payload.signatureFile.location}" class="signature-image" alt="Customer Signature" style="max-width: 200px; height: auto; border: 1px solid #ddd; padding: 5px; display: block; margin: 10px 0;" />`;
          }
        } catch (error) {
          console.error("Error processing signature image:", error);
          // Fallback to text link if all image processing fails
          signatureImageHtml = `<div class="signature-fallback"><strong>Customer Signature:</strong> <a href="${payload.signatureFile.location}" target="_blank">View Signature Image</a></div>`;
        }
      }

      const updatedMetaData = {
        ...payload.parsedMetaData,
        signature_image_url: payload.signatureFile?.location || "",
        signature_image: signatureImageHtml,
        signature: signatureImageHtml, // Alternative tag name for templates
        customer_signature: signatureImageHtml, // Another alternative tag name
      };

      // Debug: Log the metadata to verify signature handling
      console.log('Contract metadata with signature:', {
        signature_image_url: updatedMetaData.signature_image_url,
        hasSignatureImage: !!signatureImageHtml,
        signatureImageHtml: signatureImageHtml.substring(0, 100) + '...'
      });

      // Render the contract HTML with dropdown values and metadata
      const renderedHtml = template.dropdown_fields && Object.keys(template.dropdown_fields).length > 0
        ? renderContractWithDropdowns(template.content, updatedMetaData, payload.dropdownValues || {})
        : renderContract(template.content, updatedMetaData);
      
      // Pass signature URL to PDF generation for fallback handling
      const pdfBuffer = await this.generatePdfFromHtml(renderedHtml, payload.signatureFile?.location);
      // Debug: Verify pdfBuffer type
      console.log(
        "pdfBuffer type:",
        typeof pdfBuffer,
        "is Buffer:",
        pdfBuffer instanceof Buffer
      );

      // Save the contract

      // const plainText = convert(renderedHtml, {
      //   wordwrap: 80,
      //   selectors: [
      //     { selector: "h1", format: "block", options: { uppercase: true } },
      //     { selector: "h2", format: "block", options: { uppercase: true } },
      //     { selector: "strong", format: "inline" },
      //     { selector: "br", format: "inline", options: { baseElement: "br" } },
      //     { selector: "img", format: "skip" },
      //   ],
      // });
      // const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      //   const buffers: Buffer[] = [];
      //   const doc = new pdfkit({ size: "A4", margin: 50 });
      //   doc.on("data", buffers.push.bind(buffers));
      //   doc.on("end", () => resolve(Buffer.concat(buffers)));
      //   doc.on("error", reject);
      //   doc.font("Helvetica").fontSize(12);
      //   doc.text(plainText, {
      //     align: "left",
      //     lineGap: 2,
      //   });
      //   if (payload.signatureFile?.location) {
      //     import("node-fetch")
      //       .then(({ default: fetch }) => {
      //         fetch(payload.signatureFile.location)
      //           .then((res) => res.buffer())
      //           .then((imageBuffer) => {
      //             doc.moveDown(1);
      //             doc.image(imageBuffer, {
      //               width: 150,
      //             });
      //             doc.end();
      //           })
      //           .catch((err) => {
      //             console.error("Error fetching signature image:", err);
      //             doc.end();
      //           });
      //       })
      //       .catch((err) => {
      //         console.error("Error importing node-fetch:", err);
      //         doc.end();
      //       });
      //   } else {
      //     doc.end();
      //   }
      // });

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

      // Save the contract PDF using create
      const contractPDF = dataSource.getRepository(ContractPDF).create({
        contract_id: savedContract.id,
        pdf_data: pdfBuffer,
        created_at: getFinnishTime(),
      } as DeepPartial<ContractPDF>);
      await dataSource.getRepository(ContractPDF).save(contractPDF);
      savedVisit.contract = savedContract;
      await visitRepo.save(savedVisit);
      
      // Update lead status to "Signed" after successful contract signing
      const leadRepo = dataSource.getRepository(Leads);
      const lead = await leadRepo.findOne({
        where: { lead_id: payload.lead_id }
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
        message: "Contract signed successfully",
        status: 200,
      };
    } catch (error) {
      console.error("Error signing the contract:", error);
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

  async generatePdfFromHtml(html: string, signatureUrl?: string): Promise<Buffer> {
    let browser = null;
    
    try {
      // First, ensure all images in HTML are converted to base64
      let processedHtml = html;
      
      // Find all img tags and convert external URLs to base64
      const imgRegex = /<img[^>]+src="([^"]*)"[^>]*>/gi;
      const imgMatches = [...html.matchAll(imgRegex)];
      
      for (const match of imgMatches) {
        const fullImgTag = match[0];
        const imgSrc = match[1];
        
        // Only process external URLs (not already base64)
        if (imgSrc && (imgSrc.startsWith('http') || imgSrc.startsWith('//')) && !imgSrc.startsWith('data:')) {
          console.log(`Converting image to base64: ${imgSrc}`);
          const base64Image = await this.convertImageUrlToBase64(imgSrc);
          if (base64Image) {
            // Replace the src in the img tag
            const newImgTag = fullImgTag.replace(imgSrc, base64Image);
            processedHtml = processedHtml.replace(fullImgTag, newImgTag);
            console.log(`Successfully converted image to base64`);
          }
        }
      }

      // Configure browser for different environments
      const isDev = process.env.NODE_ENV !== 'production';
      
      if (isDev) {
        // Development environment - use local Chrome
        browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ],
        });
      } else {
        // Production environment - use chrome-aws-lambda
        browser = await puppeteer.launch({
          args: [
            ...chrome.args,
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ],
          defaultViewport: chrome.defaultViewport,
          executablePath: await chrome.executablePath,
          headless: chrome.headless,
        });
      }

      const page = await browser.newPage();
      
      // Set up HTML content with proper styling for PDF generation
      const styledHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
            }
            img {
              max-width: 100% !important;
              height: auto !important;
              display: block !important;
              margin: 10px 0 !important;
              page-break-inside: avoid;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .signature-image {
              max-width: 200px !important;
              max-height: 100px !important;
              border: 1px solid #ddd !important;
              padding: 5px !important;
              display: block !important;
              margin: 15px 0 !important;
              page-break-inside: avoid;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .signature-fallback {
              margin: 15px 0;
              padding: 10px;
              border: 1px solid #ccc;
              background-color: #f9f9f9;
            }
            h1, h2, h3 {
              color: #2c3e50;
              margin-top: 20px;
              margin-bottom: 10px;
              page-break-after: avoid;
            }
            p {
              margin-bottom: 10px;
            }
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body { 
                margin: 0; 
              }
              img, .signature-image { 
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>
          ${processedHtml}
        </body>
        </html>
      `;

      // Don't use request interception as it might interfere with base64 images
      console.log('Setting page content with processed HTML...');
      await page.setContent(styledHtml, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Wait for any remaining resources and images to load
      await page.evaluate(() => {
        return new Promise((resolve) => {
          if (document.readyState === 'complete') {
            resolve(true);
          } else {
            window.addEventListener('load', () => resolve(true));
            // Fallback timeout
            setTimeout(() => resolve(true), 3000);
          }
        });
      });

      console.log('Generating PDF...');
      // Generate PDF with proper options
      const pdfBuffer = await page.pdf({
        format: 'a4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        printBackground: true,
        displayHeaderFooter: false,
        preferCSSPageSize: false,
      });

      console.log('PDF generated successfully');
      return pdfBuffer as Buffer;

    } catch (error) {
      console.error('Error generating PDF from HTML:', error);
      
      // Fallback to the PDFKit method if Puppeteer fails
      console.log('Falling back to PDFKit method...');
      return this.generatePdfFromHtmlFallback(html, signatureUrl);
      
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Fallback method using PDFKit (keeping the original as backup)
  private async generatePdfFromHtmlFallback(html: any, signatureUrl: any): Promise<Buffer> {
    console.log('Using PDFKit fallback method for PDF generation');
    
    // Extract signature images from HTML
    const signatureUrls: string[] = [];
    const imgRegex = /<img[^>]+src="([^"]*)"[^>]*>/gi;
    let match;
    
    while ((match = imgRegex.exec(html)) !== null) {
      const imgSrc = match[1];
      if (imgSrc && (imgSrc.startsWith('http') || imgSrc.startsWith('data:image'))) {
        signatureUrls.push(imgSrc);
      }
    }
    
    // If no images found in HTML but signatureUrl provided, use it
    if (signatureUrls.length === 0 && signatureUrl) {
      signatureUrls.push(signatureUrl);
    }

    const plainText = convert(html, {
      wordwrap: 80,
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
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);
      
      doc.font("Helvetica").fontSize(12);
      doc.text(plainText, { align: "left", lineGap: 2 });

      // Process all signature images
      if (signatureUrls.length > 0) {
        let processedImages = 0;
        
        const processNextImage = (index: number) => {
          if (index >= signatureUrls.length) {
            doc.end();
            return;
          }
          
          const imageUrl = signatureUrls[index];
          console.log(`Processing signature image ${index + 1}/${signatureUrls.length}: ${imageUrl}`);
          
          // Handle base64 images
          if (imageUrl.startsWith('data:image')) {
            try {
              const base64Data = imageUrl.split(',')[1];
              const imageBuffer = Buffer.from(base64Data, 'base64');
              
              doc.moveDown(1);
              doc.text('Customer Signature:', { align: 'left' });
              doc.moveDown(0.5);
              
              try {
                doc.image(imageBuffer, {
                  width: 200,
                  height: 100
                });
              } catch (imgError) {
                console.error('Error embedding base64 image:', imgError);
                doc.text('Signature image could not be displayed', { align: 'left' });
              }
              
              processedImages++;
              processNextImage(index + 1);
            } catch (error) {
              console.error('Error processing base64 image:', error);
              processedImages++;
              processNextImage(index + 1);
            }
          } else {
            // Handle URL images
            import("node-fetch")
              .then(({ default: fetch }) =>
                fetch(imageUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                  }
                })
                  .then((res) => {
                    if (!res.ok) {
                      throw new Error(`Failed to fetch signature: ${res.status} ${res.statusText}`);
                    }
                    return res.buffer();
                  })
                  .then((imageBuffer) => {
                    try {
                      doc.moveDown(1);
                      doc.text('Customer Signature:', { align: 'left' });
                      doc.moveDown(0.5);
                      doc.image(imageBuffer, {
                        width: 200,
                        height: 100
                      });
                    } catch (imgError) {
                      console.error('Error embedding fetched image:', imgError);
                      doc.text('Signature image could not be displayed', { align: 'left' });
                    }
                    
                    processedImages++;
                    processNextImage(index + 1);
                  })
                  .catch((err) => {
                    console.error(`Error fetching signature image ${index + 1}:`, err);
                    doc.moveDown(1);
                    doc.text(`Signature: ${imageUrl}`, { align: 'left' });
                    
                    processedImages++;
                    processNextImage(index + 1);
                  })
              )
              .catch((err) => {
                console.error("Error importing node-fetch:", err);
                processedImages++;
                processNextImage(index + 1);
              });
          }
        };
        
        processNextImage(0);
      } else {
        console.log('No signature images to process, ending PDF');
        doc.end();
      }
    });
  }

  // Helper method to convert image URL to base64 for better PDF embedding
  private async convertImageUrlToBase64(imageUrl: string): Promise<string | null> {
    try {
      console.log(`Attempting to convert image to base64: ${imageUrl}`);
      
      const fetch = (await import("node-fetch")).default;
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        return null;
      }

      const buffer = await response.buffer();
      
      if (!buffer || buffer.length === 0) {
        console.error('Empty buffer received from image URL');
        return null;
      }
      
      const contentType = response.headers.get('content-type') || 'image/png';
      console.log(`Image content type: ${contentType}, size: ${buffer.length} bytes`);
      
      // Validate that it's actually an image by checking content type and buffer signature
      if (!contentType.startsWith('image/')) {
        // Try to detect image type from buffer
        if (buffer.length >= 8) {
          const header = buffer.toString('hex', 0, 8).toLowerCase();
          if (header.startsWith('89504e47')) {
            // PNG signature
            console.log('Detected PNG from buffer signature');
          } else if (header.startsWith('ffd8ff')) {
            // JPEG signature
            console.log('Detected JPEG from buffer signature');
          } else if (header.startsWith('47494638')) {
            // GIF signature
            console.log('Detected GIF from buffer signature');
          } else {
            console.error(`Invalid content type and unrecognized image signature: ${contentType}, header: ${header}`);
            return null;
          }
        } else {
          console.error(`Invalid content type and buffer too small: ${contentType}`);
          return null;
        }
      }
      
      const base64 = buffer.toString('base64');
      
      // Verify base64 conversion was successful
      if (!base64 || base64.length === 0) {
        console.error('Base64 conversion resulted in empty string');
        return null;
      }
      
      // Final validation - try to create a data URL and ensure it's reasonable size
      const dataUrl = `data:${contentType};base64,${base64}`;
      
      if (dataUrl.length > 50 * 1024 * 1024) { // 50MB limit
        console.error(`Image too large after base64 conversion: ${dataUrl.length} chars`);
        return null;
      }
      
      console.log(`Successfully converted image to base64: ${contentType}, original: ${buffer.length} bytes, base64: ${base64.length} chars`);
      return dataUrl;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return null;
    }
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
          currentTime = new Date(getFinnishTime().getTime() + cumulativeDuration * 60000);
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

          const eta = new Date(currentTime.getTime() + cumulativeDuration * 60000);
          
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
      return this.handleError(error, "Failed to update route with current location");
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
          is_active: true
        },
        relations: ["lead", "lead.address"],
        order: {
          check_in_time: "ASC"
        }
      });

      const visitsData = plannedVisits.map(visit => ({
        visit_id: visit.visit_id,
        lead_id: visit.lead_id,
        name: visit.lead?.name || "Anonymous",
        contact_name: visit.lead?.contact_name,
        phone: visit.lead?.contact_phone,
        email: visit.lead?.contact_email,
        address: visit.lead?.address ? {
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
          }`.trim()
        } : null,
        scheduled_time: visit.check_in_time,
        status: visit.status || "Pending",
        notes: visit.notes,
        lead_status: visit.lead?.status,
        is_completed: !!(visit.check_out_time),
        contract: visit.contract,
        photos: visit.photo_urls || []
      }));

      return {
        status: httpStatusCodes.OK,
        data: visitsData,
        message: visitsData.length > 0 
          ? "Planned visits retrieved successfully" 
          : "No planned visits found for the specified date"
      };

    } catch (error: any) {
      return this.handleError(error, "Failed to retrieve planned visits");
    }
  }
}
