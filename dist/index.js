"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("reflect-metadata");
const data_source_1 = require("./config/data-source");
const express_session_1 = __importDefault(require("express-session"));
const index_route_1 = __importDefault(require("./routes/index.route"));
const cors_1 = __importDefault(require("cors"));
const auth_middleware_1 = require("./middleware/auth.middleware");
const user_controller_1 = require("./controllers/user.controller");
const PORT = process.env.PORT || 3002;
(() => __awaiter(void 0, void 0, void 0, function* () {
    const app = (0, express_1.default)();
    const dataSource = yield (0, data_source_1.getDataSource)();
    const userController = new user_controller_1.UserTeamController();
    app.use((0, cors_1.default)());
    app.use((0, express_session_1.default)({
        secret: process.env.SESSION_SECRET || "your-secret-key",
        resave: false,
        saveUninitialized: false,
    }));
    app.use(express_1.default.json());
    app.use("/api", index_route_1.default);
    app.use(auth_middleware_1.verifyToken);
    app.get("/api/user/me", userController.getUserById);
    const MAX_RETRIES = 5;
    const INITIAL_RETRY_DELAY = 5000;
    const connect = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (retries = 0) {
        try {
            if (!dataSource.isInitialized) {
                yield dataSource.initialize();
                console.log("Data Source has been initialized!");
            }
            else {
                console.log("Data Source already initialized. Skipping initialization.");
                // await runDailyVisitPlanning();
            }
            const server = app.listen(PORT, () => {
                console.log(`Server is running on http://localhost:${PORT}`);
            });
        }
        catch (error) {
            console.error(`Database connection failed (Attempt ${retries + 1}):`, error);
            if (retries < MAX_RETRIES) {
                const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retries); // exponential backoff
                console.log(`🔁 Retrying in ${retryDelay / 1000} seconds...`);
                setTimeout(() => connect(retries + 1), retryDelay);
            }
            else {
                console.error(`The connection to database failed after ${MAX_RETRIES} attempts.`);
                process.exit(1);
            }
        }
    });
    yield connect();
}))();
