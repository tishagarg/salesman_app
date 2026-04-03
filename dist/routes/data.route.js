"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const regions_1 = require("../data/regions");
const dashboardController = new dashboard_controller_1.DashboardController();
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.get("/", (req, res) => {
    try {
        const regions = regions_1.regionsData.map((region) => ({
            id: region.id,
            name: region.name,
        }));
        res.json(regions);
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/:id", (req, res) => {
    try {
        const id = req.params.id;
        const region = regions_1.regionsData.find((r) => r.id === parseInt(id) || r.name.toLowerCase() === id.toLowerCase());
        if (!region) {
            res.status(404).json({ error: "Region not found" });
            return;
        }
        res.json(region);
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
