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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitController = void 0;
const visit_service_1 = require("../service/visit.service");
const api_response_1 = require("../utils/api.response");
const typeorm_1 = require("typeorm");
const Visits_entity_1 = require("../models/Visits.entity");
const Route_entity_1 = require("../models/Route.entity");
const ManagerSalesRep_entity_1 = require("../models/ManagerSalesRep.entity");
const data_source_1 = require("../config/data-source");
const roles_1 = require("../enum/roles");
const Role_entity_1 = require("../models/Role.entity");
const leadStatus_1 = require("../enum/leadStatus");
const timezone_1 = require("../utils/timezone");
const visitService = new visit_service_1.VisitService();
class VisitController {
    constructor() {
        this.getToday = () => __awaiter(this, void 0, void 0, function* () {
            const today = (0, timezone_1.getFinnishTime)();
            today.setHours(0, 0, 0, 0);
            return today;
        });
    }
    planVisit(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user_id = req.user.user_id;
                const { latitude, longitude, lead_ids } = req.body;
                if (!latitude || !longitude) {
                    return api_response_1.ApiResponse.error(res, 400, "Latitude and longitude are required");
                }
                const response = yield visitService.planVisit(user_id, latitude, longitude, lead_ids);
                if (response.status >= 400) {
                    return api_response_1.ApiResponse.error(res, response.status, response.message);
                }
                return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
            }
            catch (error) {
                console.error("Error in planVisit controller:", error);
                return api_response_1.ApiResponse.error(res, 500, error.message || "An unexpected error occurred while planning visits");
            }
        });
    }
    submitVisitWithContract(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { lead_id, contract_template_id, metadata, dropdownValues } = req.body;
            const rep_id = req.user.user_id;
            const signatureFile = req.file;
            let parsedMetaData;
            let parsedDropdownValues;
            try {
                parsedMetaData =
                    typeof metadata === "string" ? JSON.parse(metadata) : metadata;
            }
            catch (error) {
                console.error("Error parsing metadata:", error);
                return api_response_1.ApiResponse.error(res, 400, "Invalid metadata format");
            }
            try {
                parsedDropdownValues =
                    typeof dropdownValues === "string"
                        ? JSON.parse(dropdownValues)
                        : dropdownValues;
            }
            catch (error) {
                console.error("Error parsing dropdown values:", error);
                return api_response_1.ApiResponse.error(res, 400, "Invalid dropdown values format");
            }
            const contract = yield visitService.submitVisitWithContract({
                lead_id,
                signatureFile,
                contract_template_id,
                parsedMetaData,
                dropdownValues: parsedDropdownValues,
                rep_id,
            });
            if (contract.status >= 400) {
                return api_response_1.ApiResponse.error(res, contract.status, contract.message);
            }
            return api_response_1.ApiResponse.result(res, contract.data, contract.status, null, contract.message);
        });
    }
    submitContractPdf(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { lead_id, contract_template_id, metadata, dropdownValues } = req.body;
            const rep_id = req.user.user_id;
            const contractPdfFile = req.file;
            let parsedMetaData;
            let parsedDropdownValues;
            try {
                parsedMetaData =
                    typeof metadata === "string" ? JSON.parse(metadata) : metadata;
            }
            catch (error) {
                console.error("Error parsing metadata:", error);
                return api_response_1.ApiResponse.error(res, 400, "Invalid metadata format");
            }
            try {
                parsedDropdownValues =
                    typeof dropdownValues === "string"
                        ? JSON.parse(dropdownValues)
                        : dropdownValues;
            }
            catch (error) {
                console.error("Error parsing dropdown values:", error);
                return api_response_1.ApiResponse.error(res, 400, "Invalid dropdown values format");
            }
            const contract = yield visitService.submitContractPdf({
                lead_id,
                contractPdfFile,
                contract_template_id,
                parsedMetaData,
                dropdownValues: parsedDropdownValues,
                rep_id,
            });
            if (contract.status >= 400) {
                return api_response_1.ApiResponse.error(res, contract.status, contract.message);
            }
            return api_response_1.ApiResponse.result(res, contract.data, contract.status, null, contract.message);
        });
    }
    logVisit(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { lead_id, latitude, longitude, notes, followUps, status, contract_id, visit_id, } = req.body;
            const rep_id = req.user.user_id;
            const photos = req.files;
            if (!latitude || !longitude) {
                return api_response_1.ApiResponse.error(res, 400, "Missing required fields: lead_id, latitude, or longitude");
            }
            let parsedFollowUps = undefined;
            if (followUps &&
                typeof followUps === "string" &&
                followUps !== "undefined" &&
                followUps !== "null") {
                try {
                    parsedFollowUps = JSON.parse(followUps);
                }
                catch (e) {
                    return api_response_1.ApiResponse.error(res, 400, "Invalid followUps JSON");
                }
            }
            const data = {
                visit_id: parseInt(visit_id) || undefined,
                lead_id: parseInt(lead_id),
                rep_id,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                notes: notes || undefined,
                photos: photos || undefined,
                parsedFollowUps,
                status,
                contract_id,
            };
            const response = yield visitService.logVisit(data);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    getDailyRoute(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const rep_id = req.user.user_id;
            const response = yield visitService.getDailyRoute(rep_id);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    refreshDailyRoute(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const rep_id = req.user.user_id;
            const { latitude, longitude } = req.query;
            const parsedLatitude = typeof latitude === "string" ? parseFloat(latitude) : Number(latitude);
            const parsedLongitude = typeof longitude === "string" ? parseFloat(longitude) : Number(longitude);
            const response = yield visitService.refreshDailyRoute(rep_id, parsedLatitude, parsedLongitude);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    getAllVisits(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dataSource = yield (0, data_source_1.getDataSource)();
                const visitRepo = dataSource.getRepository(Visits_entity_1.Visit);
                const managerSalesRepRepo = dataSource.getRepository(ManagerSalesRep_entity_1.ManagerSalesRep);
                const { salesRepId, managerId, visitDate, sortBy = "check_in_time", sortOrder = "DESC", page = 1, limit = 10, } = req.query;
                const where = {};
                if (salesRepId) {
                    where.rep = { user_id: +salesRepId };
                }
                if (managerId) {
                    const salesReps = yield managerSalesRepRepo.find({
                        where: { manager_id: +managerId },
                        select: ["sales_rep_id"],
                    });
                    const salesRepIds = salesReps.map((rep) => rep.sales_rep_id);
                    if (salesRepIds.length === 0) {
                        return api_response_1.ApiResponse.result(res, {
                            data: [],
                            total: 0,
                            page: +page,
                            limit: +limit,
                            totalPages: 0,
                        }, 200, null, "No visits found for manager");
                    }
                    where.rep = Object.assign(Object.assign({}, where.rep), { user_id: (0, typeorm_1.In)(salesRepIds) });
                }
                if (visitDate) {
                    const date = new Date(visitDate);
                    const nextDate = new Date(visitDate);
                    nextDate.setDate(nextDate.getDate() + 1);
                    where.check_in_time = (0, typeorm_1.Between)(date, nextDate);
                }
                const order = {};
                if (sortBy === "check_in_time" ||
                    sortBy === "lead_id" ||
                    sortBy === "sales_rep") {
                    order[sortBy === "sales_rep" ? "rep.user_id" : sortBy] =
                        sortOrder.toUpperCase();
                }
                else {
                    order.check_in_time = "DESC";
                }
                const [visits, total] = yield visitRepo.findAndCount({
                    where,
                    relations: {
                        lead: true,
                        rep: true,
                        contract: true,
                    },
                    order,
                    skip: (+page - 1) * +limit,
                    take: +limit,
                });
                return api_response_1.ApiResponse.result(res, {
                    data: visits,
                    total,
                    page: +page,
                    limit: +limit,
                    totalPages: Math.ceil(total / +limit),
                }, 200, null, "Visit history");
            }
            catch (error) {
                console.error(error);
                return api_response_1.ApiResponse.error(res, 500, "Failed to retrieve visits");
            }
        });
    }
    getDailyRouteAdmin(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const roleId = req.user.role_id;
            try {
                const dataSource = yield (0, data_source_1.getDataSource)();
                let reps = [];
                const today = (0, timezone_1.getFinnishTime)();
                today.setHours(0, 0, 0, 0);
                const role = yield dataSource
                    .getRepository(Role_entity_1.Role)
                    .findOne({ where: { role_id: roleId } });
                let data;
                if ((role === null || role === void 0 ? void 0 : role.role_name) == roles_1.Roles.ADMIN) {
                    const routes = yield dataSource
                        .getRepository(Route_entity_1.Route)
                        .find({ where: { route_date: today } });
                    const visits = yield dataSource
                        .getRepository(Visits_entity_1.Visit)
                        .find({ where: { created_at: (0, typeorm_1.MoreThanOrEqual)(today) } });
                    data = { routes: routes, visits: visits };
                }
                return api_response_1.ApiResponse.result(res, data !== null && data !== void 0 ? data : null, 200, null, "Daily routes and visits retrieved successfully");
            }
            catch (error) {
                return api_response_1.ApiResponse.error(res, 500, error.message || "Failed to retrieve daily routes and visits");
            }
        });
    }
    getPastVisits(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dataSource = yield (0, data_source_1.getDataSource)();
                const visitRepo = dataSource.getRepository(Visits_entity_1.Visit);
                const { from, to, page = 1, limit = 10, order = "DESC", lead_id, status, view = "history", } = req.query;
                const user_id = req.user.user_id;
                const safeOrder = (order === null || order === void 0 ? void 0 : order.toUpperCase()) === "ASC" ? "ASC" : "DESC";
                const statuses = [
                    leadStatus_1.LeadStatus.Signed,
                    leadStatus_1.LeadStatus.Not_Available,
                    leadStatus_1.LeadStatus.Not_Interested,
                ];
                const visitQuery = visitRepo
                    .createQueryBuilder("visit")
                    .leftJoinAndSelect("visit.lead", "l")
                    .leftJoinAndSelect("l.address", "a")
                    .leftJoinAndSelect("visit.contract", "c")
                    .leftJoinAndSelect("visit.followUpVisits", "fv")
                    .leftJoinAndSelect("fv.followUp", "f")
                    .andWhere("visit.rep_id = :repId", { repId: user_id });
                if (view === "past_visits") {
                    visitQuery
                        .where("visit.status IN (:...statuses)", { statuses })
                        .andWhere("(f.scheduled_date < :now OR visit.check_out_time IS NOT NULL)", { now: (0, timezone_1.getFinnishTime)() })
                        .andWhere("visit.rep_id = :repId", { repId: user_id });
                    if (status) {
                        visitQuery.andWhere("l.status = :status", { status });
                    }
                }
                else if (view === "history") {
                    if (!lead_id) {
                        return api_response_1.ApiResponse.error(res, 400, "lead_id is required for past_visits view");
                    }
                    visitQuery
                        .where("visit.lead_id = :lead_id", { lead_id })
                        .andWhere(status ? "visit.status = :status" : "1=1", { status });
                }
                else {
                    return api_response_1.ApiResponse.error(res, 400, "Invalid view parameter. Use 'history' or 'past_visits'");
                }
                if (lead_id && view === "history") {
                    visitQuery.andWhere("visit.lead_id = :lead_id", { lead_id });
                }
                if (from && to) {
                    visitQuery.andWhere(`(visit.check_in_time BETWEEN :from AND :to OR f.scheduled_date BETWEEN :from AND :to)`, { from: new Date(from), to: new Date(to) });
                }
                else if (from) {
                    visitQuery.andWhere(`(visit.check_in_time >= :from OR f.scheduled_date >= :from)`, { from: new Date(from) });
                }
                else if (to) {
                    visitQuery.andWhere(`(visit.check_in_time <= :to OR f.scheduled_date <= :to)`, { to: new Date(to) });
                }
                visitQuery
                    .orderBy("visit.check_in_time", safeOrder)
                    .skip((+page - 1) * +limit)
                    .take(+limit)
                    .orderBy("visit.visit_id", "DESC");
                const [visits, total] = yield visitQuery.getManyAndCount();
                const responseData = visits.map((visit) => (Object.assign(Object.assign({}, visit), { status: view === "history" ? visit.status : visit.lead.status })));
                return api_response_1.ApiResponse.result(res, responseData, 200, null, view === "history" ? "Visit History" : "Past Visits", {
                    totalItems: total,
                    currentPage: +page,
                    totalPages: Math.ceil(total / +limit),
                    previousPage: +page > 1 ? +page - 1 : null,
                    nextPage: +page < Math.ceil(total / +limit) ? +page + 1 : null,
                });
            }
            catch (error) {
                console.error("Error in getPastVisits:", error);
                return api_response_1.ApiResponse.error(res, 500, "Failed to retrieve visits");
            }
        });
    }
    updateRouteWithCurrentLocation(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const rep_id = req.user.user_id;
            const { latitude, longitude } = req.body;
            if (!latitude || !longitude) {
                return api_response_1.ApiResponse.error(res, 400, "Current latitude and longitude are required");
            }
            const parsedLatitude = parseFloat(latitude);
            const parsedLongitude = parseFloat(longitude);
            if (isNaN(parsedLatitude) || isNaN(parsedLongitude)) {
                return api_response_1.ApiResponse.error(res, 400, "Invalid latitude or longitude format");
            }
            const response = yield visitService.updateRouteWithCurrentLocation(rep_id, parsedLatitude, parsedLongitude);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    getPlannedVisits(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const rep_id = req.user.user_id;
            const { date } = req.query;
            const response = yield visitService.getPlannedVisits(rep_id, date);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
}
exports.VisitController = VisitController;
