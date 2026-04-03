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
exports.destroyDataSource = exports.getDataSource = exports.dataSourceOptions = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const dotenv_1 = __importDefault(require("dotenv"));
const Address_entity_1 = require("../models/Address.entity");
const Leads_entity_1 = require("../models/Leads.entity");
const Visits_entity_1 = require("../models/Visits.entity");
const Territory_entity_1 = require("../models/Territory.entity");
const Message_entity_1 = require("../models/Message.entity");
const AuditLog_entity_1 = require("../models/AuditLog.entity");
const Permission_entity_1 = require("../models/Permission.entity");
const RolePermission_entity_1 = require("../models/RolePermission.entity");
const Polygon_entity_1 = require("../models/Polygon.entity");
const Region_entity_1 = require("../models/Region.entity");
const Subregion_entity_1 = require("../models/Subregion.entity");
const RefreshToken_entity_1 = require("../models/RefreshToken.entity");
const Route_entity_1 = require("../models/Route.entity");
const TerritorySalesMan_entity_1 = require("../models/TerritorySalesMan.entity");
const ManagerSalesRep_entity_1 = require("../models/ManagerSalesRep.entity");
const Idempotency_1 = require("../models/Idempotency");
const Contracts_entity_1 = require("../models/Contracts.entity");
const ContractTemplate_entity_1 = require("../models/ContractTemplate.entity");
const User_entity_1 = require("../models/User.entity");
const Organisation_entity_1 = require("../models/Organisation.entity");
const Role_entity_1 = require("../models/Role.entity");
const OTPVerification_entity_1 = require("../models/OTPVerification.entity");
const UserToken_entity_1 = require("../models/UserToken.entity");
const FollowUp_entity_1 = require("../models/FollowUp.entity");
const FollowUpVisit_entity_1 = require("../models/FollowUpVisit.entity");
const ContractImage_entity_1 = require("../models/ContractImage.entity");
const ContractPdf_entity_1 = require("../models/ContractPdf.entity");
dotenv_1.default.config();
// Validate environment variables
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in environment variables");
}
exports.dataSourceOptions = {
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
    synchronize: false,
    logging: process.env.NODE_ENV === "production" ? ["error"] : ["error"],
    entities: [
        User_entity_1.User,
        Organisation_entity_1.Organization,
        Role_entity_1.Role,
        TerritorySalesMan_entity_1.TerritorySalesman,
        FollowUp_entity_1.FollowUp,
        FollowUpVisit_entity_1.FollowUpVisit,
        OTPVerification_entity_1.OtpVerification,
        Contracts_entity_1.Contract,
        ContractTemplate_entity_1.ContractTemplate,
        ManagerSalesRep_entity_1.ManagerSalesRep,
        UserToken_entity_1.UserToken,
        Address_entity_1.Address,
        ContractPdf_entity_1.ContractPDF,
        Leads_entity_1.Leads,
        ContractImage_entity_1.ContractImage,
        Visits_entity_1.Visit,
        Territory_entity_1.Territory,
        Message_entity_1.Message,
        AuditLog_entity_1.AuditLog,
        Permission_entity_1.Permission,
        Polygon_entity_1.Polygon,
        Idempotency_1.Idempotency,
        RolePermission_entity_1.RolePermission,
        Region_entity_1.Region,
        Subregion_entity_1.Subregion,
        Route_entity_1.Route,
        RefreshToken_entity_1.RefreshToken,
    ],
    migrations: [],
    subscribers: [],
    poolSize: 20, // Increased connection pool for better handling
    extra: {
        connectionTimeoutMillis: 30000, // 30s timeout (increased from 10s)
        idleTimeoutMillis: 60000, // 60s idle timeout (increased from 30s)
        max: 20, // Max connections (increased)
        min: 5, // Min connections (increased)
        acquireTimeoutMillis: 60000, // Time to wait for connection from pool
        createTimeoutMillis: 30000, // Time to wait for new connection creation
        destroyTimeoutMillis: 5000, // Time to wait for connection destruction
        reapIntervalMillis: 1000, // Frequency to check for idle connections
    },
};
// Singleton pattern for serverless compatibility
let dataSource = null;
const getDataSource = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!dataSource || !dataSource.isInitialized) {
            console.log("Initializing DataSource...");
            dataSource = new typeorm_1.DataSource(exports.dataSourceOptions);
            yield dataSource.initialize();
            console.log("DataSource initialized successfully");
        }
        return dataSource;
    }
    catch (error) {
        console.error("Failed to initialize DataSource:", error);
        throw new Error(`DataSource initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
});
exports.getDataSource = getDataSource;
// Cleanup for serverless environments
const destroyDataSource = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (dataSource && dataSource.isInitialized) {
            yield dataSource.destroy();
            console.log("DataSource destroyed");
            dataSource = null;
        }
    }
    catch (error) {
        console.error("Failed to destroy DataSource:", error);
        throw new Error(`DataSource destruction failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
});
exports.destroyDataSource = destroyDataSource;
