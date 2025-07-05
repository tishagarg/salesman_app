import express from "express";
import { AuthController } from "../controllers/auth.controller";
import { verifyToken } from "../middleware/auth.middleware";
import { ContractTemplateController } from "../controllers/contract.controller";
import { VisitController } from "../controllers/visits.controller";
import {  uploadContractImage } from "../aws/aws.service";

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
router.get('/:contractId/pdf', authController.getContractPDF);
export default router;
