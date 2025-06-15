import express from "express";
import "reflect-metadata";
import { getDataSource } from "./config/data-source";
import expressSession from "express-session";
import router from "./routes/index.route";
import cors from "cors";
import { verifyToken } from "./middleware/auth.middleware";
import { UserTeamController } from "./controllers/user.controller";
import { schedule } from "node-cron";
import { runDailyVisitPlanning } from "./service/nodeCron.service";

const PORT = process.env.PORT || 3002;

(async () => {
  const app = express();
  const dataSource = await getDataSource();
  const userController = new UserTeamController();

  app.use(cors());
  let isCronInitialized = false;

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

  const MAX_RETRIES = 5;
  const INITIAL_RETRY_DELAY = 5000;

  const connect = async (retries = 0) => {
    try {
      if (!dataSource.isInitialized) {
        await dataSource.initialize();
        console.log("Data Source has been initialized!");
        console.log("Running daily visit planning...");

       initializeCronJobs();
      } else {
        console.log(
          "Data Source already initialized. Skipping initialization."
        );
      }

      const server = app.listen(PORT, () => {
        console.log(
          `Server is running on http://localhost:${
            (server.address() as any).port
          }`
        );
      });
              // await runDailyVisitPlanning();

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

  function initializeCronJobs() {
    if (isCronInitialized) {
      console.log("Cron job already initialized. Skipping.");
      return;
    }

    schedule(
      "0 7 * * *",
      async () => {
        await runDailyVisitPlanning();
        console.log("Running daily visit planning...");
      },
      {
        timezone: "Asia/Kolkata",
      }
    );

    isCronInitialized = true;
  }

  await connect();
})();
