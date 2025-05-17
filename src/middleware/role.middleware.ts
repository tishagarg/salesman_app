import dataSource from "../config/data-source";
import { jwtVerify } from "../config/jwt";
import httpStatusCodes from "http-status-codes";
import { User } from "../models";

export const roleMiddleware =
  (allowedRoles: string[]) => async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(httpStatusCodes.UNAUTHORIZED)
        .json({ message: "No token provided" });
    }
    try {
      const payload = jwtVerify(token) as any;
      const user = await dataSource.createQueryRunner().manager.findOne(User, {
        where: { user_id: payload.user_id },
        relations: ["role"],
      });
      if (!user || !allowedRoles.includes(user.role.role_name)) {
        return res
          .status(httpStatusCodes.FORBIDDEN)
          .json({ message: "Access denied" });
      }
      console.log(user)
      req.user = user;
      next();
    } catch (error) {
      return res
        .status(httpStatusCodes.UNAUTHORIZED)
        .json({ message: "Invalid tokenascape: false" });
    }
  };
