import dataSource from "../config/data-source";
import { jwtVerify } from "../config/jwt";
import httpStatusCodes from "http-status-codes";
import { User } from "../models";
import { RolePermission } from "../models/RolePermission.entity";

export const permissionMiddleware =
  (requiredPermission: string) => async (req: any, res: any, next: any) => {
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

      if (!user) {
        return res
          .status(httpStatusCodes.FORBIDDEN)
          .json({ message: "User not found" });
      }

      const hasPermission = await dataSource
        .createQueryRunner()
        .manager.findOne(RolePermission, {
          where: {
            role_id: user.role.role_id,
            permission: { permission_name: requiredPermission },
            is_active: true,
            org_id: user.role.org_id || 1, // Fallback to org_id=1 if null
          },
        });

      if (!hasPermission) {
        return res
          .status(httpStatusCodes.FORBIDDEN)
          .json({ message: `Permission ${requiredPermission} denied` });
      }
      req.user = { ...payload, token };
      next();
    } catch (error) {
      console.error(error);
      return res
        .status(httpStatusCodes.UNAUTHORIZED)
        .json({ message: "Invalid token", error });
    }
  };