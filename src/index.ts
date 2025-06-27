import express, { Response } from "express";
import "reflect-metadata";
import { getDataSource } from "./config/data-source";
import expressSession from "express-session";
import router from "./routes/index.route";
import cors from "cors";
import { verifyToken } from "./middleware/auth.middleware";
import { UserTeamController } from "./controllers/user.controller";
import { runDailyVisitPlanning } from "./service/nodeCron.service";
import { regionsData } from "./data/regions";

const PORT = process.env.PORT || 3002;

(async () => {
  const app = express();
  const dataSource = await getDataSource();
  const userController = new UserTeamController();

  app.use(cors());
  app.use(
    expressSession({
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
    })
  );

  app.use(express.json());

  app.use("/api", router);
  app.use(verifyToken);
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

  const MAX_RETRIES = 5;
  const INITIAL_RETRY_DELAY = 5000;

  const connect = async (retries = 0) => {
    try {
      if (!dataSource.isInitialized) {
        await dataSource.initialize();
        console.log("Data Source has been initialized!");
      } else {
        console.log(
          "Data Source already initialized. Skipping initialization."
        );
        // await runDailyVisitPlanning();
      }

      const server = app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
      });
    } catch (error) {
      console.error(
        `Database connection failed (Attempt ${retries + 1}):`,
        error
      );

      if (retries < MAX_RETRIES) {
        const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retries); // exponential backoff
        console.log(`🔁 Retrying in ${retryDelay / 1000} seconds...`);
        setTimeout(() => connect(retries + 1), retryDelay);
      } else {
        console.error(
          `The connection to database failed after ${MAX_RETRIES} attempts.`
        );
        process.exit(1);
      }
    }
  };
  await connect();
})();
