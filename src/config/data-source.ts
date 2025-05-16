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

dotenv.config();

export const AppDataSource: DataSourceOptions = {
  type: "postgres",
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD, 
  database: process.env.POSTGRES_DB_DEVELOPMENT,
  ssl:true,
    // process.env.NODE_ENV === "production"
    //   ? { rejectUnauthorized: false }
    //   : false,
  synchronize: true,
  logging: ["error"],
  entities: [User, Organization, Role, OtpVerification, UserToken, Address],
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
