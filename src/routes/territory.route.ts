import { Router } from "express";
import { TerritoryController } from "../controllers/territory.controller";
import { permissionMiddleware } from "../middleware/permission.middleware";

const router = Router();
const territoryController = new TerritoryController();

// Middleware to authenticate and ensure Admin role

// Routes
router.post(
  "/",
  permissionMiddleware("customer_import"), // GET /territories/:id
  territoryController.addTerritory
); // POST /territories
router.put(
  "/:id",
  permissionMiddleware("customer_import"), // GET /territories/:id
  territoryController.updateTerritory
); // PUT /territories/:id
router.delete(
  "/:id",
  permissionMiddleware("customer_import"), // GET /territories/:id
  territoryController.deleteTerritory
); // DELETE /territories/:id
router.get(
  "/:id",
  permissionMiddleware("customer_import"), // GET /territories/:id
  territoryController.getTerritoryById
); // GET /territories/:id
router.get(
  "/",
  permissionMiddleware("customer_import"),
  territoryController.getAllTerritories
); // GET /territories

router.put(
  "/override",
  permissionMiddleware("territory_manual_override"),
//   territoryController.manualOverride
);
router.post(
  "/auto-assign",
  permissionMiddleware("territory_auto_assign"),
//   territoryController.autoAssignTerritory
);
router.post(
  "/draw",
  permissionMiddleware("territory_draw"),
//   territoryController.drawPolygon
);

router.post(
  "/assign",
  permissionMiddleware("territory_assign"),
//   territoryController.assignTerritory
);
export default router;
