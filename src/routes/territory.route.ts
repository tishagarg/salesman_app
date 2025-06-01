import { Router } from "express";
import { TerritoryController } from "../controllers/territory.controller";
import { permissionMiddleware } from "../middleware/permission.middleware";
import { verifyToken } from "../middleware/auth.middleware";

const router = Router();
const territoryController = new TerritoryController();
router.post(
  "/assign-manager",
  verifyToken,
  territoryController.assignManagerToTerritory
);
router.post(
  "/",
  // permissionMiddleware("territory_assign"),
  territoryController.addTerritory
);
router.put(
  "/:id",
  // permissionMiddleware("customer_import"),
  territoryController.updateTerritory
);
router.delete(
  "/:id",
  // permissionMiddleware("customer_import"),
  territoryController.deleteTerritory
);
router.get(
  "/:id",
  // permissionMiddleware("customer_import"),
  territoryController.getTerritoryById
);

router.get(
  "/",
  // permissionMiddleware("customer_import"),
  territoryController.getAllTerritories
);
// router.put("/override", 
//   permissionMiddleware("territory_manual_override")
// );
// router.post("/auto-assign", 
//   permissionMiddleware("territory_auto_assign")
// );
// router.post("/assign", 
//   permissionMiddleware("territory_assign")
// );
export default router;
