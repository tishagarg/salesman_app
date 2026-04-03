"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitService = void 0;
const data_source_1 = require("../config/data-source");
const Leads_entity_1 = require("../models/Leads.entity");
const Visits_entity_1 = require("../models/Visits.entity");
const Route_entity_1 = require("../models/Route.entity");
const ManagerSalesRep_entity_1 = require("../models/ManagerSalesRep.entity");
const Idempotency_1 = require("../models/Idempotency");
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const typeorm_1 = require("typeorm");
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const Contracts_entity_1 = require("../models/Contracts.entity");
const ContractTemplate_entity_1 = require("../models/ContractTemplate.entity");
const renderContracts_1 = require("../utils/renderContracts");
const User_entity_1 = require("../models/User.entity");
const FollowUp_entity_1 = require("../models/FollowUp.entity");
const FollowUpVisit_entity_1 = require("../models/FollowUpVisit.entity");
const ContractImage_entity_1 = require("../models/ContractImage.entity");
const leadStatus_1 = require("../enum/leadStatus");
const ContractPdf_entity_1 = require("../models/ContractPdf.entity");
const timezone_1 = require("../utils/timezone");
require("dotenv").config();
class VisitService {
    withTransaction(operation) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction("SERIALIZABLE");
            try {
                const result = yield operation(queryRunner);
                yield queryRunner.commitTransaction();
                return result;
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                throw error;
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    handleError(error, defaultMessage) {
        if (error.code === "40001") {
            return {
                status: http_status_codes_1.default.CONFLICT,
                message: "Concurrent transaction conflict, please retry",
            };
        }
        if (error.code === "23505") {
            return { status: http_status_codes_1.default.BAD_REQUEST, message: error.message };
        }
        return {
            status: http_status_codes_1.default.BAD_REQUEST,
            message: error.message || defaultMessage,
        };
    }
    getStartOfDay(date = (0, timezone_1.getFinnishTime)()) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        return startOfDay;
    }
    logQuery(queryBuilder) {
        return __awaiter(this, void 0, void 0, function* () {
            const sql = yield queryBuilder.getSql();
        });
    }
    processSignatureImage(signatureFile) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(signatureFile === null || signatureFile === void 0 ? void 0 : signatureFile.location)) {
                console.log("No signature file provided");
                return {
                    html: `<div class="signature-placeholder">
        <p><strong>Customer Signature:</strong> <em>Not provided</em></p>
      </div>`,
                    imageUrl: null,
                    success: false,
                };
            }
            console.log("Processing signature:", signatureFile.location);
            const signatureHtml = `<div class="signature-container">
    <div class="signature-header">
      <h3>Digital Signature</h3>
    </div>
    <div class="signature-content">
      <p class="signature-label"><strong>Customer Signature:</strong></p>
      <div class="signature-image-wrapper">
        <img src="${signatureFile.location}" alt="Customer Signature" class="signature-image" >
      </div>
      <div class="signature-details">
        <p class="signature-date"><strong>Signed Date:</strong> ${new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            })}</p>
        <p class="signature-time"><strong>Signed Time:</strong> ${new Date().toLocaleTimeString("en-US")}</p>
        <p class="signature-source"><strong>Source:</strong> Digital Signature</p>
      </div>
    </div>
  </div>`;
            return {
                html: signatureHtml,
                imageUrl: signatureFile.location,
                success: true,
            };
        });
    }
    submitVisitWithContract(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const visitRepo = dataSource.getRepository(Visits_entity_1.Visit);
                const contractRepo = dataSource.getRepository(Contracts_entity_1.Contract);
                const templateRepo = dataSource.getRepository(ContractTemplate_entity_1.ContractTemplate);
                const visitData = {
                    lead_id: payload.lead_id,
                    rep_id: payload.rep_id,
                    latitude: 0,
                    longitude: 0,
                    check_in_time: (0, timezone_1.getFinnishTime)(),
                    photos: [],
                    parsedFollowUps: [],
                    notes: "",
                };
                const visits = yield visitRepo.create(visitData);
                const savedVisit = yield visitRepo.save(visits);
                const template = yield templateRepo.findOneBy({
                    id: payload.contract_template_id,
                });
                if (!template) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        data: null,
                        message: "Contract template not found",
                        status: 404,
                    };
                }
                if (template.dropdown_fields &&
                    Object.keys(template.dropdown_fields).length > 0) {
                    const dropdownValues = payload.dropdownValues || {};
                    const validation = (0, renderContracts_1.validateDropdownValues)(template.dropdown_fields, dropdownValues);
                    if (!validation.isValid) {
                        yield queryRunner.rollbackTransaction();
                        return {
                            data: null,
                            message: `Validation failed: ${validation.errors.join(", ")}`,
                            status: 400,
                        };
                    }
                }
                // Process signature (returns HTML block)
                const signatureResult = yield this.processSignatureImage(payload.signatureFile);
                // Prepare metadata
                const updatedMetaData = Object.assign(Object.assign({}, payload.parsedMetaData), { date_signed: new Date().toLocaleDateString("en-US"), signed_date: new Date().toLocaleDateString("en-US"), signed_time: new Date().toLocaleTimeString("en-US"), contract_date: new Date().toLocaleDateString("en-US"), current_date: new Date().toLocaleDateString("en-US"), timestamp: new Date().toISOString(), signature_image: (_a = signatureResult.html) !== null && _a !== void 0 ? _a : "", signature_status: signatureResult.success ? "completed" : "error", has_signature: signatureResult.success ? "yes" : "no" });
                // Render Contract HTML only
                let renderedHtml;
                if (template.dropdown_fields &&
                    Object.keys(template.dropdown_fields).length > 0) {
                    renderedHtml = (0, renderContracts_1.renderContractWithDropdowns)(template.content, updatedMetaData, payload.dropdownValues || {});
                }
                else {
                    renderedHtml = (0, renderContracts_1.renderContract)(template.content, updatedMetaData);
                }
                // Save Contract (HTML only, no PDF)
                const contract = contractRepo.create({
                    contract_template_id: template.id,
                    visit_id: savedVisit.visit_id,
                    rendered_html: renderedHtml,
                    metadata: updatedMetaData,
                    signed_at: (0, timezone_1.getFinnishTime)(),
                });
                const savedContract = yield contractRepo.save(contract);
                // Save contract image (optional)
                if ((_b = payload.signatureFile) === null || _b === void 0 ? void 0 : _b.location) {
                    yield dataSource.getRepository(ContractImage_entity_1.ContractImage).save({
                        contract_id: savedContract.id,
                        image_url: payload.signatureFile.location,
                        metadata: payload.signatureFile,
                    });
                }
                savedVisit.contract = savedContract;
                yield visitRepo.save(savedVisit);
                // Update lead status to "Signed"
                const leadRepo = dataSource.getRepository(Leads_entity_1.Leads);
                const lead = yield leadRepo.findOne({
                    where: { lead_id: payload.lead_id },
                });
                if (lead) {
                    lead.status = leadStatus_1.LeadStatus.Signed;
                    lead.updated_at = (0, timezone_1.getFinnishTime)();
                    lead.updated_by = "system";
                    yield leadRepo.save(lead);
                }
                const newContract = yield contractRepo.findOne({
                    where: { id: savedContract.id },
                    relations: { images: true },
                });
                yield queryRunner.commitTransaction();
                return {
                    data: newContract,
                    message: `Contract signed successfully`,
                    status: 200,
                };
            }
            catch (error) {
                console.error("Error signing the contract:", error);
                yield queryRunner.rollbackTransaction();
                return { data: null, message: "Error signing the contract", status: 500 };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    submitContractPdf(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const visitRepo = dataSource.getRepository(Visits_entity_1.Visit);
                const contractRepo = dataSource.getRepository(Contracts_entity_1.Contract);
                const templateRepo = dataSource.getRepository(ContractTemplate_entity_1.ContractTemplate);
                if (!payload.contractPdfFile) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        data: null,
                        message: "Contract PDF file is required",
                        status: 400,
                    };
                }
                const visitData = {
                    lead_id: payload.lead_id,
                    rep_id: payload.rep_id,
                    latitude: 0,
                    longitude: 0,
                    check_in_time: (0, timezone_1.getFinnishTime)(),
                    photos: [],
                    parsedFollowUps: [],
                    notes: "",
                };
                const visits = yield visitRepo.create(visitData);
                const savedVisit = yield visitRepo.save(visits);
                const template = yield templateRepo.findOneBy({
                    id: payload.contract_template_id,
                });
                if (!template) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        data: null,
                        message: "Contract template not found",
                        status: 404,
                    };
                }
                if (template.dropdown_fields &&
                    Object.keys(template.dropdown_fields).length > 0) {
                    const dropdownValues = payload.dropdownValues || {};
                    const validation = (0, renderContracts_1.validateDropdownValues)(template.dropdown_fields, dropdownValues);
                    if (!validation.isValid) {
                        yield queryRunner.rollbackTransaction();
                        return {
                            data: null,
                            message: `Validation failed: ${validation.errors.join(", ")}`,
                            status: 400,
                        };
                    }
                }
                // Prepare metadata without signature processing
                const updatedMetaData = Object.assign(Object.assign({}, payload.parsedMetaData), { date_signed: new Date().toLocaleDateString("en-US"), signed_date: new Date().toLocaleDateString("en-US"), signed_time: new Date().toLocaleTimeString("en-US"), contract_date: new Date().toLocaleDateString("en-US"), current_date: new Date().toLocaleDateString("en-US"), timestamp: new Date().toISOString() });
                // Render contract HTML (for reference, but we'll use the provided PDF)
                let renderedHtml;
                if (template.dropdown_fields &&
                    Object.keys(template.dropdown_fields).length > 0) {
                    renderedHtml = (0, renderContracts_1.renderContractWithDropdowns)(template.content, updatedMetaData, payload.dropdownValues || {});
                }
                else {
                    renderedHtml = (0, renderContracts_1.renderContract)(template.content, updatedMetaData);
                }
                const contract = contractRepo.create({
                    contract_template_id: template.id,
                    visit_id: savedVisit.visit_id,
                    rendered_html: renderedHtml,
                    metadata: updatedMetaData,
                    signed_at: (0, timezone_1.getFinnishTime)(),
                });
                const savedContract = yield contractRepo.save(contract);
                // Save the contract PDF directly from uploaded file
                const contractPDF = dataSource.getRepository(ContractPdf_entity_1.ContractPDF).create({
                    contract_id: savedContract.id,
                    pdf_data: payload.contractPdfFile.buffer || Buffer.from(""),
                    pdf_url: payload.contractPdfFile.location,
                    created_at: (0, timezone_1.getFinnishTime)(),
                });
                yield dataSource.getRepository(ContractPdf_entity_1.ContractPDF).save(contractPDF);
                savedVisit.contract = savedContract;
                yield visitRepo.save(savedVisit);
                // Update lead status to "Signed"
                const leadRepo = dataSource.getRepository(Leads_entity_1.Leads);
                const lead = yield leadRepo.findOne({
                    where: { lead_id: payload.lead_id },
                });
                if (lead) {
                    lead.status = leadStatus_1.LeadStatus.Signed;
                    lead.updated_at = (0, timezone_1.getFinnishTime)();
                    lead.updated_by = "system";
                    yield leadRepo.save(lead);
                }
                const newContract = yield dataSource.getRepository(Contracts_entity_1.Contract).findOne({
                    where: { id: savedContract.id },
                    relations: { pdf: true },
                });
                yield queryRunner.commitTransaction();
                return {
                    data: newContract,
                    message: "Contract PDF submitted successfully",
                    status: 200,
                };
            }
            catch (error) {
                console.error("❌ Error submitting contract PDF:", error);
                yield queryRunner.rollbackTransaction();
                return {
                    data: null,
                    message: "Error submitting contract PDF",
                    status: 500,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    getOptimizedRoute(origin, waypoints) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get("https://maps.googleapis.com/maps/api/directions/json", {
                params: {
                    origin,
                    destination: waypoints[waypoints.length - 1],
                    waypoints: `optimize:true|${waypoints.join("|")}`,
                    key: process.env.GOOGLE_MAPS_API_KEY,
                    departure_time: "now",
                    timestamp: Date.now(),
                },
            });
            const data = response.data;
            if (data.status !== "OK") {
                throw new Error(data.status === "ZERO_RESULTS"
                    ? "No valid route found. Check waypoint distances or coordinates."
                    : `Google Maps Directions API error: ${data.status}`);
            }
            return {
                route: data.routes[0],
                waypointOrder: data.routes[0].waypoint_order,
            };
        });
    }
    handleVisit(queryRunner, visitData, uncompletedVisit) {
        return __awaiter(this, void 0, void 0, function* () {
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
                if (visitData.notes)
                    uncompletedVisit.notes = visitData.notes;
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
                const visit = yield queryRunner.manager.save(Visits_entity_1.Visit, uncompletedVisit);
                return visit;
            }
            const visit = yield queryRunner.manager.save(Visits_entity_1.Visit, Object.assign(Object.assign({}, visitData), { is_active: true }));
            return visit;
        });
    }
    planDailyVisits(repId_1) {
        return __awaiter(this, arguments, void 0, function* (repId, date = (0, timezone_1.getFinnishTime)(), idempotencyKey = (0, uuid_1.v4)()) {
            return yield this.withTransaction((queryRunner) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                try {
                    const startOfDay = this.getStartOfDay(date);
                    const endOfDay = new Date(startOfDay);
                    endOfDay.setHours(23, 59, 59, 999);
                    // Check idempotency
                    const existingIdempotency = yield queryRunner.manager.findOne(Idempotency_1.Idempotency, {
                        where: { key: idempotencyKey },
                    });
                    if (existingIdempotency) {
                        return {
                            status: http_status_codes_1.default.OK,
                            data: existingIdempotency.result,
                            message: "Request already processed",
                        };
                    }
                    // Get existing visits and route
                    const existingVisits = yield queryRunner.manager.find(Visits_entity_1.Visit, {
                        where: {
                            rep_id: (0, typeorm_1.Equal)(repId),
                            check_in_time: (0, typeorm_1.MoreThanOrEqual)(startOfDay),
                            is_active: true,
                        },
                    });
                    const repAddress = yield queryRunner.manager
                        .getRepository(User_entity_1.User)
                        .findOne({ where: { user_id: repId }, relations: { address: true } });
                    const existingRoute = yield queryRunner.manager.findOne(Route_entity_1.Route, {
                        where: { rep_id: (0, typeorm_1.Equal)(repId), route_date: (0, typeorm_1.Equal)(startOfDay) },
                        lock: { mode: "pessimistic_write" },
                    });
                    // Fetch uncompleted visits
                    const uncompletedVisits = yield queryRunner.manager.find(Visits_entity_1.Visit, {
                        where: {
                            rep_id: (0, typeorm_1.Equal)(repId),
                            check_in_time: (0, typeorm_1.LessThan)(startOfDay),
                            check_out_time: (0, typeorm_1.IsNull)(),
                            is_active: true,
                        },
                        relations: ["lead", "lead.address"],
                    });
                    const updatedUncompletedLeads = uncompletedVisits
                        .map((visit) => {
                        var _a, _b;
                        if (visit.lead &&
                            visit.lead.is_active &&
                            !visit.lead.pending_assignment &&
                            ((_a = visit.lead.address) === null || _a === void 0 ? void 0 : _a.latitude) &&
                            ((_b = visit.lead.address) === null || _b === void 0 ? void 0 : _b.longitude)) {
                            return Object.assign(Object.assign({}, visit.lead), { updatedVisit: Object.assign(Object.assign({}, visit), { check_in_time: (0, timezone_1.getFinnishTime)() }) });
                        }
                        return null;
                    })
                        .filter((lead) => lead !== null);
                    // Get all valid customers
                    const allCustomers = yield queryRunner.manager.find(Leads_entity_1.Leads, {
                        where: {
                            assigned_rep_id: (0, typeorm_1.Equal)(repId),
                            is_active: true,
                            pending_assignment: false,
                        },
                        relations: ["address"],
                        order: { created_at: "ASC" },
                    });
                    const validCustomers = allCustomers.filter((c) => { var _a, _b; return ((_a = c.address) === null || _a === void 0 ? void 0 : _a.latitude) && ((_b = c.address) === null || _b === void 0 ? void 0 : _b.longitude); });
                    // Fetch today's follow-up leads
                    const followUpLeadsRaw = yield queryRunner.manager
                        .createQueryBuilder(FollowUp_entity_1.FollowUp, "fu")
                        .leftJoin(FollowUpVisit_entity_1.FollowUpVisit, "fuv", "fu.follow_up_id = fuv.follow_up_id")
                        .leftJoin(Visits_entity_1.Visit, "v", "fuv.visit_id = v.visit_id")
                        .select("v.lead_id", "lead_id")
                        .where("fu.scheduled_date BETWEEN :start AND :end", {
                        start: startOfDay,
                        end: endOfDay,
                    })
                        .andWhere("fu.is_completed = false")
                        .getRawMany();
                    const followUpLeadIds = followUpLeadsRaw.map((f) => f.lead_id);
                    const followUpLeads = validCustomers.filter((c) => followUpLeadIds.includes(c.lead_id));
                    // Combine all leads with priority: uncompleted > follow-ups > others
                    const leadsMap = new Map();
                    updatedUncompletedLeads.forEach((lead) => leadsMap.set(lead.lead_id, lead));
                    followUpLeads.forEach((lead) => {
                        if (!leadsMap.has(lead.lead_id))
                            leadsMap.set(lead.lead_id, lead);
                    });
                    validCustomers.forEach((lead) => {
                        if (!leadsMap.has(lead.lead_id))
                            leadsMap.set(lead.lead_id, lead);
                    });
                    const leadsToPlan = Array.from(leadsMap.values()).slice(0, 10);
                    if (!leadsToPlan.length) {
                        return {
                            status: http_status_codes_1.default.OK,
                            data: null,
                            message: "No valid leads available for visit planning",
                        };
                    }
                    const leadIds = leadsToPlan.map((lead) => lead.lead_id);
                    if (new Set(leadIds).size !== leadIds.length) {
                        return {
                            status: http_status_codes_1.default.BAD_REQUEST,
                            data: null,
                            message: "Duplicate leads detected in visit planning",
                        };
                    }
                    const waypoints = leadsToPlan
                        .filter((lead) => { var _a, _b; return ((_a = lead.address) === null || _a === void 0 ? void 0 : _a.latitude) && ((_b = lead.address) === null || _b === void 0 ? void 0 : _b.longitude); }) // Filter out invalid addresses
                        .map((lead) => `${lead.address.latitude},${lead.address.longitude}`);
                    const origin = ((_a = repAddress === null || repAddress === void 0 ? void 0 : repAddress.address) === null || _a === void 0 ? void 0 : _a.latitude) && ((_b = repAddress === null || repAddress === void 0 ? void 0 : repAddress.address) === null || _b === void 0 ? void 0 : _b.longitude)
                        ? `${repAddress.address.latitude},${repAddress.address.longitude}`
                        : null;
                    if (!origin) {
                        console.log(`Skipping rep ${repId} due to missing or incomplete address`);
                        return {
                            status: http_status_codes_1.default.OK,
                            data: null,
                            message: `Rep ${repId} skipped due to missing address.`,
                        };
                    }
                    const { route, waypointOrder } = yield this.getOptimizedRoute(origin, waypoints);
                    let currentTime = new Date(date);
                    currentTime.setHours(9, 0, 0, 0);
                    const previousVisitMap = new Map([...uncompletedVisits, ...existingVisits].map((visit) => [
                        visit.lead_id,
                        visit,
                    ]));
                    const routeOrder = [];
                    const visits = [];
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
                        const visitData = {
                            lead_id: lead.lead_id,
                            rep_id: repId,
                            check_in_time: currentTime,
                            latitude: lead.address.latitude,
                            longitude: lead.address.longitude,
                            created_by: "system",
                        };
                        const visit = yield this.handleVisit(queryRunner, visitData, (_c = previousVisitMap.get(lead.lead_id)) !== null && _c !== void 0 ? _c : undefined);
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
                        existingRoute.updated_at = (0, timezone_1.getFinnishTime)();
                        routeEntity = yield queryRunner.manager.save(existingRoute);
                    }
                    else {
                        routeEntity = yield queryRunner.manager.save(Route_entity_1.Route, {
                            rep_id: repId,
                            route_date: startOfDay,
                            route_order: routeOrder,
                            created_by: "system",
                        });
                    }
                    // Save idempotency
                    yield queryRunner.manager.save(Idempotency_1.Idempotency, {
                        key: idempotencyKey,
                        result: { visits, route: routeEntity },
                    });
                    return {
                        status: http_status_codes_1.default.OK,
                        data: { visits, route: routeEntity },
                        message: "Daily visits planned successfully",
                    };
                }
                catch (error) {
                    console.log(error);
                    throw this.handleError(error, "Failed to plan daily visits");
                }
            }));
        });
    }
    planVisit(rep_id_1, repLatitude_1, repLongitude_1, lead_ids_1) {
        return __awaiter(this, arguments, void 0, function* (rep_id, repLatitude, repLongitude, lead_ids, idempotencyKey = (0, uuid_1.v4)()) {
            return yield this.withTransaction((queryRunner) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                try {
                    if (!lead_ids || lead_ids.length === 0) {
                        return {
                            status: http_status_codes_1.default.BAD_REQUEST,
                            data: null,
                            message: "No lead IDs provided. Cannot plan visits.",
                        };
                    }
                    const latitude = parseFloat(String(repLatitude));
                    const longitude = parseFloat(String(repLongitude));
                    if (!this.isValidCoordinate(latitude, "latitude") ||
                        !this.isValidCoordinate(longitude, "longitude")) {
                        return {
                            status: http_status_codes_1.default.BAD_REQUEST,
                            data: null,
                            message: "Invalid coordinates provided. Latitude must be between -90 and 90, longitude must be between -180 and 180.",
                        };
                    }
                    if (!this.isWithinFinland(latitude, longitude)) {
                        return {
                            status: http_status_codes_1.default.BAD_REQUEST,
                            data: null,
                            message: "Coordinates are outside Finland boundaries. Please ensure your location is within Finland (latitude: 59.5-70.1, longitude: 19.0-31.6).",
                        };
                    }
                    const startOfDay = this.getStartOfDay((0, timezone_1.getFinnishTime)());
                    const endOfDay = new Date(startOfDay);
                    endOfDay.setHours(23, 59, 59, 999);
                    const existingIdempotency = yield queryRunner.manager.findOne(Idempotency_1.Idempotency, {
                        where: { key: idempotencyKey },
                    });
                    if (existingIdempotency) {
                        return {
                            status: http_status_codes_1.default.OK,
                            data: existingIdempotency.result,
                            message: "Request already processed",
                        };
                    }
                    const existingVisits = yield queryRunner.manager.find(Visits_entity_1.Visit, {
                        where: {
                            rep_id: (0, typeorm_1.Equal)(rep_id),
                            is_active: true,
                        },
                    });
                    const repAddress = yield queryRunner.manager
                        .getRepository(User_entity_1.User)
                        .findOne({
                        where: { user_id: rep_id },
                        relations: { address: true },
                    });
                    const existingRoute = yield queryRunner.manager.findOne(Route_entity_1.Route, {
                        where: { rep_id: (0, typeorm_1.Equal)(rep_id) },
                        lock: { mode: "pessimistic_write" },
                    });
                    const uncompletedVisits = yield queryRunner.manager.find(Visits_entity_1.Visit, {
                        where: {
                            rep_id: (0, typeorm_1.Equal)(rep_id),
                            check_out_time: (0, typeorm_1.IsNull)(),
                            is_active: true,
                        },
                        relations: ["lead", "lead.address"],
                    });
                    const updatedUncompletedLeads = uncompletedVisits
                        .map((visit) => {
                        var _a, _b;
                        if (visit.lead &&
                            visit.lead.is_active &&
                            !visit.lead.pending_assignment &&
                            ((_a = visit.lead.address) === null || _a === void 0 ? void 0 : _a.latitude) &&
                            ((_b = visit.lead.address) === null || _b === void 0 ? void 0 : _b.longitude)) {
                            return Object.assign(Object.assign({}, visit.lead), { updatedVisit: Object.assign(Object.assign({}, visit), { check_in_time: (0, timezone_1.getFinnishTime)() }) });
                        }
                        return null;
                    })
                        .filter((lead) => lead !== null);
                    const providedLeads = yield queryRunner.manager.find(Leads_entity_1.Leads, {
                        where: { lead_id: (0, typeorm_1.In)(lead_ids) },
                        relations: ["address"],
                        order: { created_at: "ASC" },
                    });
                    const validLeads = providedLeads.filter((c) => { var _a, _b; return ((_a = c.address) === null || _a === void 0 ? void 0 : _a.latitude) && ((_b = c.address) === null || _b === void 0 ? void 0 : _b.longitude); });
                    const leadsMap = new Map();
                    updatedUncompletedLeads.forEach((lead) => leadsMap.set(lead.lead_id, lead));
                    validLeads.forEach((lead) => {
                        if (!leadsMap.has(lead.lead_id))
                            leadsMap.set(lead.lead_id, lead);
                    });
                    const leadsToPlan = Array.from(leadsMap.values());
                    if (!leadsToPlan.length) {
                        return {
                            status: http_status_codes_1.default.OK,
                            data: null,
                            message: "No valid leads available for visit planning",
                        };
                    }
                    const leadIds = leadsToPlan.map((lead) => lead.lead_id);
                    if (new Set(leadIds).size !== leadIds.length) {
                        return {
                            status: http_status_codes_1.default.BAD_REQUEST,
                            data: null,
                            message: "Duplicate leads detected in visit planning",
                        };
                    }
                    // Validate all lead coordinates are within Finland before saving
                    const invalidLeads = leadsToPlan.filter((lead) => {
                        var _a, _b;
                        return !((_a = lead.address) === null || _a === void 0 ? void 0 : _a.latitude) ||
                            !((_b = lead.address) === null || _b === void 0 ? void 0 : _b.longitude) ||
                            !this.isWithinFinland(lead.address.latitude, lead.address.longitude);
                    });
                    if (invalidLeads.length > 0) {
                        return {
                            status: http_status_codes_1.default.BAD_REQUEST,
                            data: null,
                            message: `Some leads have coordinates outside Finland boundaries. Please ensure all lead addresses are within Finland.`,
                        };
                    }
                    leadsToPlan.forEach((lead) => {
                        lead.status = leadStatus_1.LeadStatus.Start_Signing;
                        lead.updated_at = (0, timezone_1.getFinnishTime)();
                        lead.updated_by = "system";
                    });
                    // Save updated leads
                    yield queryRunner.manager.save(Leads_entity_1.Leads, leadsToPlan).catch((e) => {
                        throw new Error(`Failed to update lead statuses: ${e.message}`);
                    });
                    const waypoints = leadsToPlan.map((lead) => `${lead.address.latitude},${lead.address.longitude}`);
                    const origin = `${latitude},${longitude}`;
                    let route, waypointOrder;
                    try {
                        const routeResult = yield this.getOptimizedRoute(origin, waypoints);
                        route = routeResult.route;
                        waypointOrder = routeResult.waypointOrder;
                    }
                    catch (error) {
                        return {
                            status: http_status_codes_1.default.BAD_REQUEST,
                            data: null,
                            message: error.message ||
                                "Unable to calculate route. Please check that all coordinates are valid and within Finland.",
                        };
                    }
                    let currentTime = new Date((0, timezone_1.getFinnishTime)());
                    currentTime.setHours(9, 0, 0, 0);
                    const previousVisitMap = new Map([...uncompletedVisits, ...existingVisits].map((visit) => [
                        visit.lead_id,
                        visit,
                    ]));
                    const routeOrder = [];
                    const visits = [];
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
                        const visitData = {
                            lead_id: lead.lead_id,
                            rep_id: rep_id,
                            check_in_time: currentTime,
                            latitude: lead.address.latitude,
                            longitude: lead.address.longitude,
                            created_by: "system",
                        };
                        const visit = yield this.handleVisit(queryRunner, visitData, (_a = previousVisitMap.get(lead.lead_id)) !== null && _a !== void 0 ? _a : undefined);
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
                        existingRoute.updated_at = (0, timezone_1.getFinnishTime)();
                        routeEntity = yield queryRunner.manager.save(existingRoute);
                    }
                    else {
                        routeEntity = yield queryRunner.manager.save(Route_entity_1.Route, {
                            rep_id: rep_id,
                            route_date: startOfDay,
                            route_order: routeOrder,
                            created_by: "system",
                        });
                    }
                    yield queryRunner.manager.save(Idempotency_1.Idempotency, {
                        key: idempotencyKey,
                        result: { visits, route: routeEntity },
                    });
                    return {
                        status: http_status_codes_1.default.OK,
                        data: { visits, route: routeEntity },
                        message: "Visits planned successfully",
                    };
                }
                catch (error) {
                    console.log("Error in planVisit:", error);
                    const errorResponse = this.handleError(error, "Failed to plan visits");
                    return {
                        status: errorResponse.status,
                        data: null,
                        message: errorResponse.message,
                    };
                }
            }));
        });
    }
    logVisit(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.withTransaction((queryRunner) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                try {
                    let followUps = [];
                    if (typeof data.parsedFollowUps === "string") {
                        try {
                            followUps = JSON.parse(data.parsedFollowUps);
                        }
                        catch (e) {
                            console.error("Invalid followUps JSON");
                            followUps = [];
                        }
                    }
                    else if (Array.isArray(data.parsedFollowUps)) {
                        followUps = data.parsedFollowUps;
                    }
                    const customer = yield queryRunner.manager.findOne(Leads_entity_1.Leads, {
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
                        existingVisit = yield queryRunner.manager.findOne(Visits_entity_1.Visit, {
                            where: {
                                visit_id: data.visit_id,
                            },
                        });
                    }
                    else {
                        existingVisit = yield queryRunner.manager.findOne(Visits_entity_1.Visit, {
                            where: {
                                lead_id: (0, typeorm_1.Equal)(data.lead_id),
                                check_in_time: (0, typeorm_1.MoreThanOrEqual)(this.getStartOfDay()),
                                check_out_time: (0, typeorm_1.IsNull)(),
                            },
                        });
                    }
                    const photo_url = (_a = data.photos) === null || _a === void 0 ? void 0 : _a.map((p) => {
                        return p.location;
                    });
                    const visitData = {
                        lead_id: data.lead_id,
                        rep_id: data.rep_id,
                        check_in_time: (0, timezone_1.getFinnishTime)(), // Always create new
                        check_out_time: (0, timezone_1.getFinnishTime)(),
                        latitude: data.latitude,
                        longitude: data.longitude,
                        contract_id: data.contract_id, // Contract always gets attached here
                        notes: data.notes,
                        created_by: data.rep_id.toString(),
                        photo_urls: photo_url,
                        status: data.status,
                    };
                    const visit = yield this.handleVisit(queryRunner, visitData, existingVisit !== null && existingVisit !== void 0 ? existingVisit : undefined);
                    yield queryRunner.manager
                        .getRepository(Leads_entity_1.Leads)
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
                            const followUpData = {
                                subject: followUp.subject,
                                notes: (_b = followUp.notes) !== null && _b !== void 0 ? _b : "",
                                scheduled_date: parsedDate instanceof Date && !isNaN(parsedDate.getTime())
                                    ? parsedDate
                                    : undefined,
                                is_completed: false,
                                created_by: data.rep_id,
                            };
                            const newFollowUp = queryRunner.manager.create(FollowUp_entity_1.FollowUp, followUpData);
                            const savedFollowUp = yield queryRunner.manager.save(FollowUp_entity_1.FollowUp, newFollowUp);
                            yield queryRunner.manager.save(FollowUpVisit_entity_1.FollowUpVisit, {
                                follow_up_id: savedFollowUp.follow_up_id,
                                visit_id: visit.visit_id,
                            });
                        }
                    }
                    return {
                        status: http_status_codes_1.default.OK,
                        data: visit,
                        message: "Visit and follow-up(s) logged successfully",
                    };
                }
                catch (error) {
                    console.log(error);
                    throw this.handleError(error, "Failed to log visit");
                }
            }));
        });
    }
    isValidCoordinate(value, type) {
        if (typeof value !== "number" || isNaN(value)) {
            return false;
        }
        const absValue = Math.abs(value);
        return type === "latitude" ? absValue <= 90 : absValue <= 180;
    }
    isWithinFinland(latitude, longitude) {
        return (latitude >= 59.5 &&
            latitude <= 70.1 &&
            longitude >= 19.0 &&
            longitude <= 31.6);
    }
    getToday() {
        const today = (0, timezone_1.getFinnishTime)();
        today.setHours(0, 0, 0, 0);
        return today;
    }
    getManagerAssignment(repId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            return dataSource.manager.findOne(ManagerSalesRep_entity_1.ManagerSalesRep, {
                where: { sales_rep_id: repId },
                select: ["manager_id"],
            });
        });
    }
    getVisitsForToday(repId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const visits = yield queryRunner.manager.find(Visits_entity_1.Visit, {
                    where: {
                        rep_id: (0, typeorm_1.Equal)(repId),
                        is_active: true,
                    },
                    relations: ["lead", "lead.address"],
                });
                const visitsToKeep = [];
                const visitsToDelete = [];
                for (const visit of visits) {
                    if (!visit.lead) {
                        console.warn(`Visit ${visit.visit_id} has no associated lead`);
                        visitsToDelete.push(visit);
                        continue;
                    }
                    if (visit.lead.status.includes(leadStatus_1.LeadStatus.Signed ||
                        leadStatus_1.LeadStatus.Not_Available ||
                        leadStatus_1.LeadStatus.Not_Interested)) {
                        visitsToDelete.push(visit);
                        continue;
                    }
                    if (visit.rep_id === visit.lead.assigned_rep_id) {
                        visitsToKeep.push(visit);
                    }
                    else {
                        console.log(`Visit ${visit.visit_id} rep_id ${visit.rep_id} does not match lead.assigned_rep_id ${visit.lead.assigned_rep_id}`);
                        visitsToDelete.push(visit);
                    }
                }
                yield queryRunner.commitTransaction();
                return visitsToKeep;
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                console.error("getVisitsForToday - Error:", error.message, error.stack);
                throw new Error(`Failed to fetch visits: ${error.message}`);
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    saveRoute(repId, today, routeOrder, createdBy) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const routeRepository = dataSource.getRepository(Route_entity_1.Route);
            const existingRoute = yield routeRepository.findOne({
                where: { rep_id: (0, typeorm_1.Equal)(repId) },
            });
            if (existingRoute) {
                return yield routeRepository.update({ route_id: existingRoute.route_id }, {
                    route_order: routeOrder,
                    updated_at: (0, timezone_1.getFinnishTime)(),
                    created_by: createdBy,
                    is_active: true,
                });
            }
            else {
                return yield routeRepository.save({
                    rep_id: repId,
                    route_date: today,
                    route_order: routeOrder,
                    created_by: createdBy,
                    created_at: (0, timezone_1.getFinnishTime)(),
                    is_active: true,
                });
            }
        });
    }
    getRouteForToday(repId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            return yield dataSource.getRepository(Route_entity_1.Route).find({
                where: { rep_id: (0, typeorm_1.Equal)(repId), is_active: true },
            });
        });
    }
    updateRoute(repId, date, routeOrder) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            return yield dataSource.getRepository(Route_entity_1.Route).update({ rep_id: (0, typeorm_1.Equal)(repId), route_date: (0, typeorm_1.Equal)(date) }, {
                route_order: routeOrder,
                updated_at: (0, timezone_1.getFinnishTime)(),
                is_active: true,
            });
        });
    }
    generateDailyRoute(repId, repLatitude, repLongitude) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const latitude = parseFloat(String(repLatitude));
                const longitude = parseFloat(String(repLongitude));
                const today = this.getToday();
                const visits = yield this.getVisitsForToday(repId);
                if (!visits.length) {
                    return {
                        status: http_status_codes_1.default.OK,
                        message: "No visits assigned to optimize",
                        data: [],
                    };
                }
                const validVisits = visits.filter((visit) => { var _a, _b, _c, _d; return ((_b = (_a = visit.lead) === null || _a === void 0 ? void 0 : _a.address) === null || _b === void 0 ? void 0 : _b.latitude) && ((_d = (_c = visit.lead) === null || _c === void 0 ? void 0 : _c.address) === null || _d === void 0 ? void 0 : _d.longitude); });
                if (!validVisits.length) {
                    throw new Error("No valid visit addresses for route optimization");
                }
                const origin = `${latitude},${longitude}`;
                const waypoints = validVisits.map((visit) => `${visit.lead.address.latitude},${visit.lead.address.longitude}`);
                const { route, waypointOrder } = yield this.getOptimizedRoute(origin, waypoints);
                let currentTime = (0, timezone_1.getFinnishTime)();
                let cumulativeDistance = 0; // Track total distance from origin
                let cumulativeDuration = 0; // Track total time from origin
                const routeOrder = [];
                for (let i = 0; i < waypointOrder.length; i++) {
                    const index = waypointOrder[i];
                    const visit = validVisits[index];
                    const leg = route.legs[i];
                    let segmentDistance = 0;
                    let segmentDuration = 0;
                    if (((_a = leg === null || leg === void 0 ? void 0 : leg.distance) === null || _a === void 0 ? void 0 : _a.value) && ((_b = leg === null || leg === void 0 ? void 0 : leg.duration) === null || _b === void 0 ? void 0 : _b.value)) {
                        segmentDistance = leg.distance.value / 1000; // Convert to km
                        segmentDuration = leg.duration.value / 60; // Convert to minutes
                        // Add to cumulative totals
                        cumulativeDistance += segmentDistance;
                        cumulativeDuration += segmentDuration;
                        // Calculate ETA based on cumulative time from current location
                        currentTime = new Date((0, timezone_1.getFinnishTime)().getTime() + cumulativeDuration * 60000);
                    }
                    else {
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
                    const existingIndex = routeOrder.findIndex((item) => item.lead_id === visit.lead_id);
                    if (existingIndex !== -1) {
                        // Update existing entry
                        routeOrder[existingIndex] = routeItem;
                    }
                    else {
                        // Add new entry
                        routeOrder.push(routeItem);
                    }
                }
                yield this.saveRoute(repId, today, routeOrder, "system");
                const routes = yield this.getRouteForToday(repId);
                return {
                    status: http_status_codes_1.default.OK,
                    data: routes,
                    message: "Daily route optimized successfully",
                };
            }
            catch (error) {
                return this.handleError(error, "Failed to optimize daily route");
            }
        });
    }
    refreshDailyRoute(repId, latitude, longitude) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.isValidCoordinate(latitude, "latitude")) {
                    throw new Error(`Invalid latitude: ${latitude}`);
                }
                if (!this.isValidCoordinate(longitude, "longitude")) {
                    throw new Error(`Invalid longitude: ${longitude}`);
                }
                return yield this.generateDailyRoute(repId, latitude, longitude);
            }
            catch (error) {
                return this.handleError(error, "Failed to refresh daily route");
            }
        });
    }
    updateRouteWithCurrentLocation(repId, currentLat, currentLng) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dataSource = yield (0, data_source_1.getDataSource)();
                const route = yield dataSource.manager.findOne(Route_entity_1.Route, {
                    where: { rep_id: repId },
                });
                if (!route || !route.route_order || !Array.isArray(route.route_order)) {
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "No route found for today",
                    };
                }
                const currentOrigin = `${currentLat},${currentLng}`;
                const remainingStops = route.route_order.filter((item) => item.latitude && item.longitude);
                if (remainingStops.length === 0) {
                    return {
                        status: http_status_codes_1.default.OK,
                        data: [],
                        message: "No remaining stops in route",
                    };
                }
                // Get updated route with current location
                const waypoints = remainingStops.map((item) => `${item.latitude},${item.longitude}`);
                const { route: updatedRoute } = yield this.getOptimizedRoute(currentOrigin, waypoints);
                // Update the route order with new calculations
                let cumulativeDistance = 0;
                let cumulativeDuration = 0;
                const currentTime = (0, timezone_1.getFinnishTime)();
                const updatedRouteOrder = remainingStops.map((item, index) => {
                    var _a, _b;
                    const leg = updatedRoute.legs[index];
                    if (((_a = leg === null || leg === void 0 ? void 0 : leg.distance) === null || _a === void 0 ? void 0 : _a.value) && ((_b = leg === null || leg === void 0 ? void 0 : leg.duration) === null || _b === void 0 ? void 0 : _b.value)) {
                        const segmentDistance = leg.distance.value / 1000;
                        const segmentDuration = leg.duration.value / 60;
                        cumulativeDistance += segmentDistance;
                        cumulativeDuration += segmentDuration;
                        const eta = new Date(currentTime.getTime() + cumulativeDuration * 60000);
                        return Object.assign(Object.assign({}, item), { distance: Number(cumulativeDistance.toFixed(2)), segmentDistance: Number(segmentDistance.toFixed(2)), cumulativeTime: Math.round(cumulativeDuration), eta: eta.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            }) });
                    }
                    return item; // Return original if no leg data
                });
                // Update the stored route
                route.route_order = updatedRouteOrder;
                yield dataSource.manager.save(route);
                return {
                    status: http_status_codes_1.default.OK,
                    data: updatedRouteOrder,
                    message: "Route updated with current location",
                };
            }
            catch (error) {
                return this.handleError(error, "Failed to update route with current location");
            }
        });
    }
    getDailyRoute(repId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            try {
                const route = yield dataSource.manager.findOne(Route_entity_1.Route, {
                    where: { rep_id: repId },
                    relations: { rep: true },
                });
                if (!route) {
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "No route found for today",
                    };
                }
                if (!route.route_order ||
                    !Array.isArray(route.route_order) ||
                    route.route_order.length === 0) {
                    return {
                        status: http_status_codes_1.default.OK,
                        data: [],
                        message: "No leads assigned to this route",
                    };
                }
                const routeDetails = (yield Promise.all(route.route_order.map((item) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    if (!item.lead_id) {
                        return null;
                    }
                    const customer = yield dataSource.manager.findOne(Leads_entity_1.Leads, {
                        where: {
                            lead_id: (0, typeorm_1.Equal)(item.lead_id),
                            status: (0, typeorm_1.In)([
                                leadStatus_1.LeadStatus.Prospect,
                                leadStatus_1.LeadStatus.Get_Back,
                                leadStatus_1.LeadStatus.Meeting,
                                leadStatus_1.LeadStatus.Hot_Lead,
                                leadStatus_1.LeadStatus.Start_Signing,
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
                        latitude: (_a = customer.address) === null || _a === void 0 ? void 0 : _a.latitude,
                        visit_id: item.visit_id,
                        lead_status: customer.status, // Use fresh status from database
                        longitude: (_b = customer.address) === null || _b === void 0 ? void 0 : _b.longitude,
                        address: customer.address
                            ? `${customer.address.street_address || ""}, ${customer.address.city || ""}, ${customer.address.state || ""} ${customer.address.postal_code || ""}`.trim()
                            : null,
                        eta: item.eta,
                        distance: item.distance, // Total distance from salesman's current location
                        segmentDistance: item.segmentDistance, // Distance from previous stop
                        cumulativeTime: item.cumulativeTime, // Total travel time in minutes
                    };
                })))).filter((item) => item !== null); // Filter out null entries
                return {
                    status: http_status_codes_1.default.OK,
                    data: routeDetails,
                    message: routeDetails.length > 0
                        ? "Retrieved successfully"
                        : "No valid leads found for this route",
                };
            }
            catch (error) {
                return this.handleError(error, "Failed to retrieve daily route");
            }
        });
    }
    getPlannedVisits(repId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            try {
                const targetDate = date ? new Date(date) : (0, timezone_1.getFinnishTime)();
                targetDate.setHours(0, 0, 0, 0);
                const nextDay = new Date(targetDate);
                nextDay.setDate(nextDay.getDate() + 1);
                const plannedVisits = yield dataSource.manager.find(Visits_entity_1.Visit, {
                    where: {
                        rep_id: repId,
                        created_at: (0, typeorm_1.Between)(targetDate, nextDay),
                        is_active: true,
                    },
                    relations: ["lead", "lead.address"],
                    order: {
                        check_in_time: "ASC",
                    },
                });
                const visitsData = plannedVisits.map((visit) => {
                    var _a, _b, _c, _d, _e, _f;
                    return ({
                        visit_id: visit.visit_id,
                        lead_id: visit.lead_id,
                        name: ((_a = visit.lead) === null || _a === void 0 ? void 0 : _a.name) || "Anonymous",
                        contact_name: (_b = visit.lead) === null || _b === void 0 ? void 0 : _b.contact_name,
                        phone: (_c = visit.lead) === null || _c === void 0 ? void 0 : _c.contact_phone,
                        email: (_d = visit.lead) === null || _d === void 0 ? void 0 : _d.contact_email,
                        address: ((_e = visit.lead) === null || _e === void 0 ? void 0 : _e.address)
                            ? {
                                street_address: visit.lead.address.street_address,
                                city: visit.lead.address.city,
                                state: visit.lead.address.state,
                                postal_code: visit.lead.address.postal_code,
                                latitude: visit.lead.address.latitude,
                                longitude: visit.lead.address.longitude,
                                formatted_address: `${visit.lead.address.street_address || ""}, ${visit.lead.address.city || ""}, ${visit.lead.address.state || ""} ${visit.lead.address.postal_code || ""}`.trim(),
                            }
                            : null,
                        scheduled_time: visit.check_in_time,
                        status: visit.status || "Pending",
                        notes: visit.notes,
                        lead_status: (_f = visit.lead) === null || _f === void 0 ? void 0 : _f.status,
                        is_completed: !!visit.check_out_time,
                        contract: visit.contract,
                        photos: visit.photo_urls || [],
                    });
                });
                return {
                    status: http_status_codes_1.default.OK,
                    data: visitsData,
                    message: visitsData.length > 0
                        ? "Planned visits retrieved successfully"
                        : "No planned visits found for the specified date",
                };
            }
            catch (error) {
                return this.handleError(error, "Failed to retrieve planned visits");
            }
        });
    }
}
exports.VisitService = VisitService;
