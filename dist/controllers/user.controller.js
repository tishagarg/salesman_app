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
exports.UserTeamController = void 0;
const api_response_1 = require("../utils/api.response");
const user_service_1 = require("../service/user.service");
const roles_1 = require("../enum/roles");
const leadStatus_1 = require("../enum/leadStatus");
const userTeamService = new user_service_1.UserTeamService();
class UserTeamController {
    getDashboard(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield userTeamService.getDashboard();
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    getLeadStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const leadStatusValues = Object.values(leadStatus_1.LeadStatus).map(status => ({
                    status,
                    color: leadStatus_1.leadStatusColors[status],
                }));
                res.status(200).json({
                    data: leadStatusValues,
                    status: 200,
                    message: "Lead status fetched successfully",
                });
            }
            catch (error) {
                res.status(500).json({
                    status: 500,
                    message: "Internal server error",
                });
            }
        });
    }
    getAllRoles(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { org_id } = req.user;
            const response = yield userTeamService.getAllRoles(org_id);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    getSalesRepManagaerList(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let { user_id } = req.user;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || "";
            const managerId = req.query.managerId
                ? parseInt(req.query.managerId)
                : undefined;
            const salesmanId = req.query.salesmanId
                ? parseInt(req.query.salesmanId)
                : undefined;
            const response = yield userTeamService.getSalesRepManagaerList(page, limit, search, managerId, salesmanId);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            const totalPages = Math.ceil((response === null || response === void 0 ? void 0 : response.total) / limit);
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message, {
                previousPage: page > 1 ? page - 1 : null,
                nextPage: page < totalPages ? page + 1 : null,
                currentPage: page,
                totalItems: response === null || response === void 0 ? void 0 : response.total,
                totalPages,
            });
        });
    }
    getUserById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let { user_id } = req.user;
            const response = yield userTeamService.getUserById(user_id);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    assignManagerToSalesRep(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let { user_id, org_id } = req.user;
            const { manager_id, sale_rep_ids } = req.body;
            const response = yield userTeamService.assignManagerToSalesRep({ user_id, org_id }, manager_id, sale_rep_ids);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    removeManagerFromSalesRep(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { user_id, org_id } = req.user;
            const salesRepId = parseInt(req.params.id);
            const response = yield userTeamService.removeManagerFromSalesRep({ user_id, org_id }, salesRepId);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    getManagerDashboard(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { user_id, org_id } = req.user;
            const response = yield userTeamService.getManagerDashboard({
                user_id,
                org_id,
            });
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    addTeamMember(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { org_id, user_id } = req.user;
            const params = req.body;
            const response = yield userTeamService.addTeamMember(org_id, user_id, Object.assign({}, params));
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    getAllTeamMember(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { org_id } = req.user;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const search = req.query.search;
            const role = req.query.role;
            const status = req.query.status;
            const response = yield userTeamService.getAllTeamMember(org_id, {
                page,
                limit,
                skip,
                search,
                role,
                status,
            });
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, {
                teamMembers: response.data,
                pagination: {
                    page,
                    limit,
                    total: (_a = response.total) !== null && _a !== void 0 ? _a : 0,
                    totalPages: Math.ceil(((_b = response.total) !== null && _b !== void 0 ? _b : 0) / limit),
                },
            }, response.status, null, response.message);
        });
    }
    getTeamMemberById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { org_id } = req.user;
            const user_id = req.params.id;
            const response = yield userTeamService.getTeamMemberById(org_id, user_id);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    editTeamMember(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { org_id } = req.user;
            const user_id = req.params.id;
            const updateData = req.body;
            const response = yield userTeamService.editTeamMember(org_id, user_id, updateData);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    activeDeactive(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { org_id, user_id } = req.user;
            const { status, id } = req.body;
            const response = yield userTeamService.activeDeactive(org_id, user_id, {
                status,
                id,
            });
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    getSalesRep(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { org_id, role_id } = req.user;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const search = req.query.search;
            const response = yield userTeamService.getUsersByRole(org_id, roles_1.Roles.SALES_REP, {
                limit,
                skip,
                search,
            });
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message, response.pagination);
        });
    }
    getUnassignedSalesRep(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { org_id, role_id } = req.user;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 1000;
            const skip = (page - 1) * limit;
            const search = req.query.search;
            const response = yield userTeamService.getUnassignedSalesRep(org_id, {
                limit,
                skip,
                search,
            });
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            const totalPages = Math.ceil(response.total / limit);
            const paginationMeta = {
                previousPage: page > 1 ? page - 1 : null,
                nextPage: page < totalPages ? page + 1 : null,
                currentPage: page,
                totalItems: response.total,
                totalPages,
            };
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message, paginationMeta);
        });
    }
    getAllManagers(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { org_id } = req.user;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const search = req.query.search;
            const response = yield userTeamService.getUsersByRole(org_id, roles_1.Roles.MANAGER, {
                limit,
                skip,
                search,
            });
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message, response.pagination);
        });
    }
    updateProfile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { org_id, user_id } = req.user;
            const updateData = req.body;
            const response = yield userTeamService.updateProfile(org_id, user_id, updateData);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
}
exports.UserTeamController = UserTeamController;
