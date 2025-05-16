import jwt from "jsonwebtoken";
import { IJwtVerify } from "../interfaces/user.interface";

const SECRET_KEY = process.env.JWT_SECRET || "";

export const jwtSign = (user_id: number, org_id: number, email: string, role_id:number| undefined,is_super_admin:number, is_admin:number) => {
  return jwt.sign({ user_id, org_id, email,  role_id , is_super_admin, is_admin}, SECRET_KEY, {
    expiresIn: "2d",
  });
};

export const jwtVerify = (token: string) => {
  const decoded = jwt.verify(token, SECRET_KEY) as IJwtVerify;
  return decoded;
};
