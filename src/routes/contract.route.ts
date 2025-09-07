import express from "express";
import { AuthController } from "../controllers/auth.controller";
import { verifyToken } from "../middleware/auth.middleware";
import { ContractTemplateController } from "../controllers/contract.controller";
import { VisitController } from "../controllers/visits.controller";
import { uploadContractImage, uploadContractPdf } from "../aws/aws.service";

const router = express.Router();

let authController = new ContractTemplateController();
let visitController = new VisitController();
router.get(
  "/templates/sale-rep",
  verifyToken,
  authController.getTemplatesForRep
);
router.post("/templates", verifyToken, authController.create);
router.get("/templates", verifyToken, authController.list);
router.get("/", verifyToken, authController.getAllContracts);
router.post(
  "/submit",
  verifyToken,
  uploadContractImage.single("signature"),
  visitController.submitVisitWithContract
);
router.post(
  "/submit-pdf",
  verifyToken,
  uploadContractPdf.single("contract_pdf"),
  visitController.submitContractPdf
);
router.get("/:contractId/pdf", authController.getContractHTML.bind(authController));

// Reassign contract template to other managers
router.put(
  "/templates/:templateId",
  verifyToken,
  authController.reassignContractTemplate
);

// Update/Edit contract template
router.patch(
  "/templates/:templateId",
  verifyToken,
  authController.updateContractTemplate
);

// Get contract template by ID (including dropdown fields)
router.get(
  "/templates/:templateId",
  verifyToken,
  authController.getTemplateById
);

// Delete contract
router.delete("/:contractId", verifyToken, authController.deleteContract);

export default router;
