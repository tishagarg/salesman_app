import { MapAndRouteController } from "../controllers/mapNRoute.controller";
import { roleMiddleware } from "../middleware/role.middleware";
const mapRouteController = new MapAndRouteController();
import express from "express";
const router = express.Router();
router.post(
  "/customers",
  roleMiddleware(["sales rep", "manager", "admin"]),
  mapRouteController.getCustomerMap
);

export default router;
