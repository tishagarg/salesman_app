import { DashboardController } from "../controllers/dashboard.controller";
import { regionsData } from "../data/regions";
import { permissionMiddleware } from "../middleware/permission.middleware";
const dashboardController = new DashboardController();
import express, { Response } from "express";
const router = express.Router();
  interface Subregion {
    id: number;
    name: string;
  }

  interface Region {
    id: number;
    name: string;
    subregions: Subregion[];
  }
  router.get("/", (req: any, res: Response) => {
    try {
      const regions = regionsData.map((region) => ({
        id: region.id,
        name: region.name,
      }));
      res.json(regions);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
  router.get("/:id", (req: any, res: Response) => {
    try {
      const id = req.params.id;
      const region = regionsData.find(
        (r) =>
          r.id === parseInt(id) || r.name.toLowerCase() === id.toLowerCase()
      );
      if (!region) {
        res.status(404).json({ error: "Region not found" });
        return;
      }
      res.json(region);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
export default router;
