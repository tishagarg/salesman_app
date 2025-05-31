import { Request, Response, NextFunction } from "express";
import dataSource from "../config/data-source";
import { jwtVerify } from "../config/jwt";
import { UserTokenQuery } from "../query/usertoken.query";
import { UserToken } from "../models/index";
import { ApiResponse } from "../utils/api.response";
let userTokenQuery = new UserTokenQuery();

export const verifyToken = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return ApiResponse.error(res, 401, "not token");
  }

  try {
    const decoded = await jwtVerify(token);
    const userTokenRepository = dataSource.getRepository(UserToken);
    const userToken = await userTokenRepository.findOne({
      where: {
        user_token_id: token,
        user_id: decoded.user_id,
        is_active: true,
      },
    });
    console.log(userToken)
    if (!userToken) {
      return ApiResponse.error(res, 401, "not authorized");
    }

    const currentTime = Date.now() / 1000;
    const tokenExpiryTime =
      userToken.created_at.getTime() / 1000 + userToken.ttl;

    if (currentTime > tokenExpiryTime) {
      await userTokenQuery.deleteTokenFromDatabase(token);

      return ApiResponse.error(res, 401, "not authorized");
    }
    req.user = { ...decoded, token };
    next();
  } catch (error) {
    return ApiResponse.error(res, 401, "not authorized");
  }
};
