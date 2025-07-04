import { LeadsController } from "../controllers/leads.controller";
import { permissionMiddleware } from "../middleware/permission.middleware";
import express from "express";
import { verifyToken } from "../middleware/auth.middleware";

const leadController = new LeadsController();
const router = express.Router();

router.post(
  "/import",
  verifyToken,
  // permissionMiddleware("customer_import"),
  leadController.importLeads
);

router.post(
  "/:id/assign",
  verifyToken,
  // permissionMiddleware("customer_assign"),
  leadController.assignLeads
);

router.post(
  "/",
  verifyToken,
  // permissionMiddleware("customer_create"),
  leadController.createLeads
);

router.patch(
  "/:id",
  verifyToken,
  // permissionMiddleware("customer_update"),
  leadController.updateLead
);
router.post(
  "/:id/status",
  verifyToken,
  // permissionMiddleware("customer_status_update"),
  leadController.updateStatus
);

router.delete(
  "/:id",
  verifyToken,
  // permissionMiddleware("customer_delete"),
  leadController.deleteLead
);
router.post(
  "/bulk-delete",
  verifyToken,
  // permissionMiddleware("customer_delete"),
  leadController.deleteBulkLead
);

router.get(
  "/:id",
  verifyToken,
  // permissionMiddleware("customer_view"),
  leadController.getLeadById
);

router.get(
  "/",
  verifyToken,
  // permissionMiddleware("customer_view"),
  leadController.getAllLeads
);

router.post(
  "/bulk-assign",
  verifyToken,
  // permissionMiddleware("customer_bulk_assign"),
  leadController.bulkAssignLeads
);

export default router;
