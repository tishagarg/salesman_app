"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const leads_controller_1 = require("../controllers/leads.controller");
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const leadController = new leads_controller_1.LeadsController();
const router = express_1.default.Router();
router.post("/import", auth_middleware_1.verifyToken, 
// permissionMiddleware("customer_import"),
leadController.importLeads);
router.post("/:id/assign", auth_middleware_1.verifyToken, 
// permissionMiddleware("customer_assign"),
leadController.assignLeads);
router.post("/", auth_middleware_1.verifyToken, 
// permissionMiddleware("customer_create"),
leadController.createLeads);
router.patch("/:id", auth_middleware_1.verifyToken, 
// permissionMiddleware("customer_update"),
leadController.updateLead);
router.post("/:id/status", auth_middleware_1.verifyToken, 
// permissionMiddleware("customer_status_update"),
leadController.updateStatus);
router.delete("/:id", auth_middleware_1.verifyToken, 
// permissionMiddleware("customer_delete"),
leadController.deleteLead);
router.post("/bulk-delete", auth_middleware_1.verifyToken, 
// permissionMiddleware("customer_delete"),
leadController.deleteBulkLead);
router.get("/:id", auth_middleware_1.verifyToken, 
// permissionMiddleware("customer_view"),
leadController.getLeadById);
router.get("/", auth_middleware_1.verifyToken, 
// permissionMiddleware("customer_view"),
leadController.getAllLeads);
router.post("/bulk-assign", auth_middleware_1.verifyToken, 
// permissionMiddleware("customer_bulk_assign"),
leadController.bulkAssignLeads);
exports.default = router;
