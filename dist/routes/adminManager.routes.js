"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
const visits_controller_1 = require("../controllers/visits.controller");
const user_controller_1 = require("../controllers/user.controller");
const visitController = new visits_controller_1.VisitController();
const userController = new user_controller_1.UserTeamController();
router.use(auth_middleware_1.verifyToken);
router.get("/roles", userController.getAllRoles);
router.get("/daily-routes", visitController.getDailyRouteAdmin);
router.get("/visit/history", visitController.getAllVisits);
router.get("/rep-manager", userController.getSalesRepManagaerList);
router.get("/dashboard", userController.getDashboard);
exports.default = router;
