import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import dotenv from "dotenv";
import {
  Organization,
  OtpVerification,
  Role,
  User,
  UserToken,
} from "../models/index";
import { Address } from "../models/Address.entity";
import { Leads } from "../models/Leads.entity";
import { Visit } from "../models/Visits.entity";
import { Territory } from "../models/Territory.entity";
import { Message } from "../models/Message.entity";
import { AuditLog } from "../models/AuditLog.entity";
import { Permission } from "../models/Permission.entity";
import { RolePermission } from "../models/RolePermission.entity";
import { Polygon } from "../models/Polygon.entity";
import { Region } from "../models/Region.entity";
import { Subregion } from "../models/Subregion.entity";
import { RefreshToken } from "../models/RefreshToken.entity";
import { Route } from "../models/Route.entity";
import { TerritorySalesman } from "../models/TerritorySalesMan.entity";
import { ManagerSalesRep } from "../models/ManagerSalesRep.entity";
import { Idempotency } from "../models/Idempotency";

dotenv.config();

// Validate environment variables
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

export const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  synchronize: false,
  logging: process.env.NODE_ENV === "production" ? ["error"] : ["error"],
  entities: [
    User,
    Organization,
    Role,
    TerritorySalesman,
    OtpVerification,
    ManagerSalesRep,
    UserToken,
    Address,
    Leads,
    Visit,
    Territory,
    Message,
    AuditLog,
    Permission,
    Polygon,
    Idempotency,
    RolePermission,
    Region,
    Subregion,
    Route,
    RefreshToken,
  ],
  migrations: [],
  subscribers: [],
  poolSize: 10, // Connection pooling for Neon
  extra: {
    connectionTimeoutMillis: 10000, // 10s timeout
    idleTimeoutMillis: 30000, // 30s idle timeout
    max: 10, // Max connections
    min: 2, // Min connections
  },
};

// Singleton pattern for serverless compatibility
let dataSource: DataSource | null = null;

export const getDataSource = async (): Promise<DataSource> => {
  try {
    if (!dataSource || !dataSource.isInitialized) {
      console.log("Initializing DataSource...");
      dataSource = new DataSource(dataSourceOptions);
      await dataSource.initialize();
      console.log("DataSource initialized successfully");
    }
    return dataSource;
  } catch (error) {
    console.error("Failed to initialize DataSource:", error);
    throw new Error(
      `DataSource initialization failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

// Cleanup for serverless environments
export const destroyDataSource = async (): Promise<void> => {
  try {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      console.log("DataSource destroyed");
      dataSource = null;
    }
  } catch (error) {
    console.error("Failed to destroy DataSource:", error);
    throw new Error(
      `DataSource destruction failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};
