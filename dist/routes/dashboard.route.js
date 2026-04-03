"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const permission_middleware_1 = require("../middleware/permission.middleware");
const dashboardController = new dashboard_controller_1.DashboardController();
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.get("/", (0, permission_middleware_1.permissionMiddleware)("customer_import"), dashboardController.getDashboard);
exports.default = router;
