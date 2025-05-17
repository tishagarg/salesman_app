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
import { Customer } from "../models/Customer.entity";
import { Visit } from "../models/Visits.entity";
import { Territory } from "../models/Territory.entity";
import { Message } from "../models/Message.entity";
import { AuditLog } from "../models/AuditLog.entity";
import { Permission } from "../models/Permission.entity";
import { RolePermission } from "../models/RolePermission.entity";

dotenv.config();

export const AppDataSource: DataSourceOptions = {
  type: "postgres",
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB_DEVELOPMENT,
  ssl: true,
  // process.env.NODE_ENV === "production"
  //   ? { rejectUnauthorized: false }
  //   : false,
  synchronize: true,
  logging: ["error"],
  entities: [
    User,
    Organization,
    Role,
    OtpVerification,
    UserToken,
    Address,
    Customer,
    Visit,
    Territory,
    Message,
    AuditLog,
    Permission,
    RolePermission,
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
