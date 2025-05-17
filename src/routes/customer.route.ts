import { upload } from "../config/multer";
import { CustomerController } from "../controllers/customer.controller";
import { roleMiddleware } from "../middleware/role.middleware";
const customerController = new CustomerController();
import express from "express";
const router = express.Router();

router.post(
  "/import",
  roleMiddleware(["admin"]),
  upload.single("file"),
  customerController.importCustomers
);
router.post(
  "/:id/assign",
  roleMiddleware(["admin"]),
  customerController.assignCustomer
);
router.put(
  "/:id",
  roleMiddleware(["sales rep","manager", "admin"]),
  customerController.updateCustomer
);

// Routes
router.post(
  "/",
  roleMiddleware(["manager", "admin"]),
  customerController.createCustomer
); // POST /customers
router.put(
  "/:id",
  roleMiddleware(["sales rep", "admin"]),
  customerController.updateCustomer
); // PUT /customers/:id
router.delete(
  "/:id",
  roleMiddleware(["admin"]),
  customerController.deleteCustomer
); // DELETE /customers/:id
router.get(
  "/:id",
  roleMiddleware(["sales rep", "admin"]),
  customerController.getCustomerById
); // GET /customers/:id
router.get(
  "/",
  roleMiddleware(["sales rep", "admin"]),
  customerController.getAllCustomers
); // GET /customers
router.post(
  "/bulk-assign",
  roleMiddleware(["admin"]),
  customerController.bulkAssignCustomers
); // POST /customers/bulk-assign

export default router;
