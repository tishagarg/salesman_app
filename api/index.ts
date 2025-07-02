// api/index.ts
import express, { Response } from "express";
import "reflect-metadata";
import expressSession from "express-session";
import router from "../src/routes/index.route";
import cors from "cors";
import { verifyToken } from "../src/middleware/auth.middleware";
import { UserTeamController } from "../src/controllers/user.controller";
import { regionsData } from "../src/data/regions";

const userController = new UserTeamController();
const app = express();

app.use(cors());
app.use(
  expressSession({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(express.json());
app.use("/api", router);
app.use(verifyToken);
app.use("/", (req, res) => {
  res.send("Welcome to track");
});
app.get("/api/user/me", userController.getUserById);
  interface Subregion {
    id: number;
    name: string;
  }

  interface Region {
    id: number;
    name: string;
    subregions: Subregion[];
  }
  app.get("/api/regions", (req: any, res: Response) => {
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
  app.get("/api/regions/:id", (req: any, res: Response) => {
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
export default app;