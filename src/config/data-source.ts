import { DataSource, DataSourceOptions } from "typeorm";
import {
  Organization,
  OtpVerification,
  Role,
  User,
  UserToken,
} from "../models/index";
import dotenv from "dotenv";
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
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB_DEVELOPMENT,
  ssl: {
    rejectUnauthorized: false,
  },
  // process.env.NODE_ENV === "production"
  //   ? { rejectUnauthorized: false }
  //   : false,
  synchronize: false,
  logging: ["error"],
  entities: [
    User,
    Organization,
    Role,
    TerritorySalesman,
    OtpVerification,ManagerSalesRep,
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

const dataSource = new DataSource(AppDataSource);
dataSource
  .initialize()
  .then(() => {
    console.log("Data Source has been initialized!");
  })
  .catch((err) => {
    console.error("Error during Data Source initialization:", err);
  });

export default dataSource;
