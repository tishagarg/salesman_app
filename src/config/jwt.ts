import jwt from "jsonwebtoken";
import { IJwtVerify } from "../interfaces/user.interface";

const SECRET_KEY = process.env.JWT_SECRET || "";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "";

export const jwtSign = (
  user_id: number,
  org_id: number,
  email: string,
  role_id: number | undefined,
  is_super_admin: number,
  is_admin: number
) => {
  return jwt.sign(
    { user_id, org_id, email, role_id, is_super_admin, is_admin },
    SECRET_KEY,
    {
      expiresIn: "2d",
    }
  );
};

export const jwtVerify = (token: string): IJwtVerify => {
  try {
    if (!SECRET_KEY) {
      throw new Error("JWT_SECRET is not configured");
    }
    const decoded = jwt.verify(token, SECRET_KEY) as IJwtVerify;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("JWT token has expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error(`JWT verification failed: ${error.message}`);
    } else {
      throw error;
    }
  }
};

export const generateRefreshToken = (user_id: number) => {
  return jwt.sign({ user_id }, REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

export const verifyRefreshToken = (token: string) => {
  const decoded = jwt.verify(token, REFRESH_SECRET) as IJwtVerify;
  return decoded;
};
