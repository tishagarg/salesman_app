import express from "express";
import "reflect-metadata";
import dataSource from "./config/data-source";
import expressSession from "express-session";
import router from "./routes/index.route";
import cors from "cors";
import { verifyToken } from "./middleware/auth.middleware";
import { UserTeamController } from "./controllers/user.controller";
const userController = new UserTeamController();

const PORT = process.env.PORT || 3002;

const app = express();
app.use("/", (req, res) => {
  res.send("Welcome to track");
});
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

app.get("/api/user/me", userController.getUserById);

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 5000;

const connect = async (retries = 0) => {
  try {
    await dataSource.initialize();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    if (retries < MAX_RETRIES) {
      const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retries);

      setTimeout(() => connect(retries + 1), retryDelay);
    } else {
      console.log(
        `The connection to database failed after ${MAX_RETRIES} attempts: ${error}`
      );
    }
  }
};

connect();
