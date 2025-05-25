import { upload } from "../config/multer";
import { CustomerController } from "../controllers/customer.controller";
import { permissionMiddleware } from "../middleware/permission.middleware";
import express from "express";

const customerController = new CustomerController();
const router = express.Router();

router.post(
  "/import",
  permissionMiddleware("customer_import"),
  upload.single("file"),
  customerController.importCustomers
);

router.post(
  "/:id/assign",
  permissionMiddleware("customer_assign"),
  customerController.assignCustomer
);

router.post(
  "/",
  permissionMiddleware("customer_create"),
  customerController.createCustomer
);

router.patch(
  "/:id",
  permissionMiddleware("customer_update"),
  customerController.updateCustomer
);
router.post(
  "/:id/status",
  permissionMiddleware("customer_status_update"),
  customerController.updateStatus
);

router.delete(
  "/:id",
  permissionMiddleware("customer_delete"),
  customerController.deleteCustomer
);

router.get(
  "/:id",
  permissionMiddleware("customer_view"),
  customerController.getCustomerById
);

router.get(
  "/",
  permissionMiddleware("customer_view"),
  customerController.getAllCustomers
);

router.post(
  "/bulk-assign",
  permissionMiddleware("customer_bulk_assign"),
  customerController.bulkAssignCustomers
);

export default router;