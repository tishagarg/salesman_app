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
exports.DashboardService = void 0;
const data_source_1 = require("../config/data-source"); // Updated import
const Leads_entity_1 = require("../models/Leads.entity");
const Visits_entity_1 = require("../models/Visits.entity");
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const typeorm_1 = require("typeorm");
const workingDays_1 = require("../utils/workingDays");
const leadStatus_1 = require("../enum/leadStatus");
class DashboardService {
    getDashboard(orgId, userId, role_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const visitRepo = dataSource.getRepository(Visits_entity_1.Visit);
            const leadsRepo = dataSource.getRepository(Leads_entity_1.Leads);
            try {
                // Run queries in parallel
                const [unVisitedLeads, visitedLeads, totalLeads, signedLeads, unSignedLeads, calender,] = yield Promise.all([
                    leadsRepo.count({
                        where: {
                            status: (0, typeorm_1.In)([leadStatus_1.LeadStatus.Prospect, leadStatus_1.LeadStatus.Start_Signing]),
                            assigned_rep_id: userId,
                        },
                    }),
                    leadsRepo.count({
                        where: {
                            status: (0, typeorm_1.Not)((0, typeorm_1.In)([leadStatus_1.LeadStatus.Prospect, leadStatus_1.LeadStatus.Start_Signing])),
                            assigned_rep_id: userId,
                        },
                    }),
                    leadsRepo.count({
                        where: { assigned_rep_id: userId },
                    }),
                    leadsRepo.count({
                        where: {
                            status: leadStatus_1.LeadStatus.Signed,
                            assigned_rep_id: userId,
                        },
                    }),
                    leadsRepo.count({
                        where: {
                            status: (0, typeorm_1.Not)((0, typeorm_1.In)([leadStatus_1.LeadStatus.Signed])),
                            assigned_rep_id: userId,
                        },
                    }),
                    (0, workingDays_1.getCurrentMonthData)(),
                ]);
                return {
                    status: http_status_codes_1.default.OK,
                    message: "Dashboard data retrieved successfully",
                    data: {
                        unSignedLeads,
                        signedLeads,
                        totalLeads,
                        unVisitedLeads,
                        visitedLeads,
                        calender,
                    },
                };
            }
            catch (error) {
                return {
                    status: http_status_codes_1.default.BAD_REQUEST,
                    message: error.message,
                    data: null,
                };
            }
        });
    }
}
exports.DashboardService = DashboardService;
