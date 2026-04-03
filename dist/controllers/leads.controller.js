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
exports.LeadsController = void 0;
const customer_service_1 = require("../service/customer.service");
const api_response_1 = require("../utils/api.response");
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const fs_1 = require("fs");
const common_interface_1 = require("../interfaces/common.interface");
const customerService = new customer_service_1.CustomerService();
class LeadsController {
    createLeads(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const data = req.body;
            const userId = parseInt(req.user.user_id);
            const org_id = parseInt(req.user.org_id); // Validate input
            const validation = new common_interface_1.LeadImportDto();
            Object.assign(validation, data);
            const response = yield customerService.createCustomer(data, userId, org_id);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, (_a = response.data) !== null && _a !== void 0 ? _a : null, response.status, null, response.message);
        });
    }
    updateLead(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const customerId = parseInt(req.params.id);
            const data = req.body;
            const userId = parseInt(req.user.user_id);
            const org_id = parseInt(req.user.org_id);
            console.log("req.user", req.user);
            const role_id = req.user.role_id;
            const response = yield customerService.updateCustomer(customerId, data, userId, org_id, role_id);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, (_a = response.data) !== null && _a !== void 0 ? _a : null, response.status, null, response.message);
        });
    }
    updateStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const customerId = parseInt(req.params.id);
            const data = req.body;
            const userId = parseInt(req.user.user_id);
            const org_id = parseInt(req.user.org_id);
            const role = req.user.role;
            const response = yield customerService.updateCustomer(customerId, data, userId, org_id, role);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message, null);
            }
            return api_response_1.ApiResponse.result(res, (_a = response.data) !== null && _a !== void 0 ? _a : null, response.status, null, response.message);
        });
    }
    deleteLead(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const customerId = parseInt(req.params.id);
            const userId = parseInt(req.user.user_id);
            const response = yield customerService.deleteCustomer(customerId, userId);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, {}, response.status, null, response.message);
        });
    }
    deleteBulkLead(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = parseInt(req.user.user_id);
            const { lead_ids } = req.body;
            const response = yield customerService.deleteBulkCustomer(lead_ids, userId);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, {}, response.status, null, response.message);
        });
    }
    getLeadById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const customerId = parseInt(req.params.id);
            const userId = parseInt(req.user.user_id);
            const role = req.user.role;
            const response = yield customerService.getCustomerById(customerId, userId, role);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message, null);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    getAllLeads(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const source = req.query.source;
            const search = req.query.search;
            const managerId = req.query.managerId
                ? parseInt(req.query.managerId)
                : undefined;
            const salesmanId = req.query.salesmanId
                ? parseInt(req.query.salesmanId)
                : undefined;
            const filters = {
                page,
                limit,
                skip,
                search,
                source,
                managerId,
                salesmanId,
            };
            const userId = parseInt(req.user.user_id);
            const response = yield customerService.getAllCustomers(filters, userId);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, {
                leads: response.data,
                pagination: {
                    page,
                    limit,
                    total: (_a = response.total) !== null && _a !== void 0 ? _a : 0,
                    totalPages: Math.ceil(((_b = response.total) !== null && _b !== void 0 ? _b : 0) / limit),
                },
            }, response.status, null, response.message);
        });
    }
    bulkAssignLeads(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { lead_ids, rep_id } = req.body;
            const userId = parseInt(req.user.user_id);
            const response = yield customerService.bulkAssignCustomers(lead_ids, rep_id, userId);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, (_a = response.data) !== null && _a !== void 0 ? _a : null, response.status, null, response.message);
        });
    }
    assignLeads(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const customerId = parseInt(req.params.id);
            const repId = parseInt(req.body.rep_id);
            const userId = parseInt(req.user.user_id);
            const response = yield customerService.assignCustomer(customerId, repId, userId);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    importLeads(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                let data = req.body.leads;
                const { user_id, org_id } = req.user;
                const response = yield customerService.importCustomers(data, user_id, org_id);
                if (response.status >= 400) {
                    return api_response_1.ApiResponse.error(res, response.status, response.message, response.errors);
                }
                return api_response_1.ApiResponse.result(res, (_a = response.data) !== null && _a !== void 0 ? _a : null, response.status, null, response.message);
            }
            catch (error) {
                return api_response_1.ApiResponse.error(res, http_status_codes_1.default.INTERNAL_SERVER_ERROR, `Failed to import customers: ${error.message}`);
            }
            finally {
                if ((_b = req.file) === null || _b === void 0 ? void 0 : _b.path) {
                    try {
                        (0, fs_1.unlinkSync)(req.file.path);
                    }
                    catch (err) {
                        console.error("Failed to delete uploaded file:", err);
                    }
                }
            }
        });
    }
}
exports.LeadsController = LeadsController;
