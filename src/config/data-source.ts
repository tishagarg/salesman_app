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

dotenv.config();

export const AppDataSource: DataSourceOptions = {
  type: "postgres",
  url: process.env.DATABASE_URL, // full Neon connection URL
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: ["error"],
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
    RolePermission,
    Region,
    Subregion,
    Route,
    RefreshToken,
  ],
  migrations: [],
  subscribers: [],
};

// Singleton pattern for serverless compatibility
let dataSource: DataSource | null = null;

export const getDataSource = async (): Promise<DataSource> => {
  if (!dataSource || !dataSource.isInitialized) {
    dataSource = new DataSource(AppDataSource);
    await dataSource.initialize();
  }
  return dataSource;
};