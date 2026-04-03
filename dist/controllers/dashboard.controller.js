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
exports.DashboardController = void 0;
const dashboard_service_1 = require("../service/dashboard.service");
const api_response_1 = require("../utils/api.response");
const dashboardService = new dashboard_service_1.DashboardService();
class DashboardController {
    getDashboard(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { org_id, user_id, role_id } = req.user;
            const response = yield dashboardService.getDashboard(org_id, user_id, role_id);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
}
exports.DashboardController = DashboardController;
