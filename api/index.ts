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

export default app;