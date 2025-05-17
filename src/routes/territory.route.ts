import { Router } from "express";
import { TerritoryController } from "../controllers/territory.controller";
import { roleMiddleware } from "../middleware/role.middleware";

const router = Router();
const territoryController = new TerritoryController();

// Middleware to authenticate and ensure Admin role

// Routes
router.post("/", roleMiddleware(["admin"]), territoryController.addTerritory); // POST /territories
router.put(
  "/:id",
  roleMiddleware(["manager", "admin"]),
  territoryController.updateTerritory
); // PUT /territories/:id
router.delete(
  "/:id",
  roleMiddleware(["admin"]),
  territoryController.deleteTerritory
); // DELETE /territories/:id
router.get(
  "/:id",
  roleMiddleware(["admin"]),
  territoryController.getTerritoryById
); // GET /territories/:id
router.get(
  "/",
  roleMiddleware(["admin"]),
  territoryController.getAllTerritories
); // GET /territories

export default router;
