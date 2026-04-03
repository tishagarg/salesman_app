"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const territory_controller_1 = require("../controllers/territory.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const territoryController = new territory_controller_1.TerritoryController();
router.post("/assign-manager", auth_middleware_1.verifyToken, territoryController.assignManagerToTerritory);
router.post("/unassign-salesman", auth_middleware_1.verifyToken, territoryController.unAssignSalesManFromTerritory);
router.post("/", auth_middleware_1.verifyToken, 
// permissionMiddleware("territory_assign"),
territoryController.addTerritory);
router.put("/:id", auth_middleware_1.verifyToken, 
// permissionMiddleware("customer_import"),
territoryController.updateTerritory);
router.delete("/:id", auth_middleware_1.verifyToken, 
// permissionMiddleware("customer_import"),
territoryController.deleteTerritory);
router.get("/:id", auth_middleware_1.verifyToken, 
// permissionMiddleware("customer_import"),
territoryController.getTerritoryById);
router.get("/", auth_middleware_1.verifyToken, 
// permissionMiddleware("customer_import"),
territoryController.getAllTerritories);
// router.put("/override", 
//   permissionMiddleware("territory_manual_override")
// );
// router.post("/auto-assign", 
//   permissionMiddleware("territory_auto_assign")
// );
// router.post("/assign", 
//   permissionMiddleware("territory_assign")
// );
exports.default = router;
