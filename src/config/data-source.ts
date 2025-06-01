import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import dotenv from "dotenv";
dotenv.config();

import {
  Organization,
  OtpVerification,
  Role,
  User,
  UserToken,
  Address,
  Leads,
  Visit,
  Territory,
  Message,
  AuditLog,
  Permission,
  RolePermission,
  Polygon,
  Region,
  Subregion,
  RefreshToken,
  Route,
  TerritorySalesman,
  ManagerSalesRep,
} from "../models";

const AppDataSourceOptions: DataSourceOptions = {
  type: "postgres",
  url: process.env.DATABASE_URL, // Use full Neon connection URL
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
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
    dataSource = new DataSource(AppDataSourceOptions);
    await dataSource.initialize();
  }
  return dataSource;
};
