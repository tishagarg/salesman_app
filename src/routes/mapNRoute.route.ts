import { MapAndRouteController } from "../controllers/mapNRoute.controller";
import { permissionMiddleware } from "../middleware/permission.middleware";
const mapRouteController = new MapAndRouteController();
import express from "express";
const router = express.Router();
router.post(
  "/customers",
  permissionMiddleware(""),
  mapRouteController.getCustomerMap
);

export default router;
