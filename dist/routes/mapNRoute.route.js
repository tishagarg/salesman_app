"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mapNRoute_controller_1 = require("../controllers/mapNRoute.controller");
const permission_middleware_1 = require("../middleware/permission.middleware");
const mapRouteController = new mapNRoute_controller_1.MapAndRouteController();
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.post("/customers", (0, permission_middleware_1.permissionMiddleware)(""), mapRouteController.getCustomerMap);
exports.default = router;
