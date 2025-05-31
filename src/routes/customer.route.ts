import { LeadsController } from "../controllers/leads.controller";
import { permissionMiddleware } from "../middleware/permission.middleware";
import express from "express";

const leadController = new LeadsController();
const router = express.Router();

router.post(
  "/import",
  permissionMiddleware("customer_import"),
  leadController.importLeads
);

router.post(
  "/:id/assign",
  permissionMiddleware("customer_assign"),
  leadController.assignLeads
);

router.post(
  "/",
  permissionMiddleware("customer_create"),
  leadController.createLeads
);

router.patch(
  "/:id",
  permissionMiddleware("customer_update"),
  leadController.updateLead
);
router.post(
  "/:id/status",
  permissionMiddleware("customer_status_update"),
  leadController.updateStatus
);

router.delete(
  "/:id",
  permissionMiddleware("customer_delete"),
  leadController.deleteLead
);

router.get(
  "/:id",
  permissionMiddleware("customer_view"),
  leadController.getLeadById
);

router.get(
  "/",
  permissionMiddleware("customer_view"),
  leadController.getAllLeads
);

router.post(
  "/bulk-assign",
  permissionMiddleware("customer_bulk_assign"),
  leadController.bulkAssignLeads
);

export default router;
