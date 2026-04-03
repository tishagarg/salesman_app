"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const contract_controller_1 = require("../controllers/contract.controller");
const visits_controller_1 = require("../controllers/visits.controller");
const aws_service_1 = require("../aws/aws.service");
const router = express_1.default.Router();
let authController = new contract_controller_1.ContractTemplateController();
let visitController = new visits_controller_1.VisitController();
router.get("/templates/sale-rep", auth_middleware_1.verifyToken, authController.getTemplatesForRep);
router.post("/templates", auth_middleware_1.verifyToken, authController.create);
router.get("/templates", auth_middleware_1.verifyToken, authController.list);
router.get("/", auth_middleware_1.verifyToken, authController.getAllContracts);
router.post("/submit", auth_middleware_1.verifyToken, aws_service_1.uploadContractImage.single("signature"), visitController.submitVisitWithContract);
router.post("/submit-pdf", auth_middleware_1.verifyToken, aws_service_1.uploadContractPdf.single("contract_pdf"), visitController.submitContractPdf);
router.get("/:contractId/pdf", (req, res) => authController.getContractHTML(req, res));
// Reassign contract template to other managers
router.put("/templates/:templateId", auth_middleware_1.verifyToken, authController.reassignContractTemplate);
// Update/Edit contract template
router.patch("/templates/:templateId", auth_middleware_1.verifyToken, authController.updateContractTemplate);
// Get contract template by ID (including dropdown fields)
router.get("/templates/:templateId", auth_middleware_1.verifyToken, authController.getTemplateById);
// Delete contract
router.delete("/:contractId", auth_middleware_1.verifyToken, authController.deleteContract);
exports.default = router;
