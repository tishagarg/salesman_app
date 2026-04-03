"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const visits_controller_1 = require("../controllers/visits.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const visitController = new visits_controller_1.VisitController();
const express_1 = __importDefault(require("express"));
const aws_service_1 = require("../aws/aws.service");
const router = express_1.default.Router();
router.post("/plan", auth_middleware_1.verifyToken, 
// permissionMiddleware("customer_import"),
visitController.planVisit);
router.post("/log", auth_middleware_1.verifyToken, aws_service_1.upload.array("photos"), 
// permissionMiddleware("customer_import"),
visitController.logVisit);
router.get("/past-vists", auth_middleware_1.verifyToken, visitController.getPastVisits);
router.get("/planned", auth_middleware_1.verifyToken, visitController.getPlannedVisits);
router.get("/route/daily", auth_middleware_1.verifyToken, visitController.getDailyRoute);
router.get("/route/refresh", auth_middleware_1.verifyToken, visitController.refreshDailyRoute);
router.post("/route/update-location", auth_middleware_1.verifyToken, visitController.updateRouteWithCurrentLocation);
exports.default = router;
