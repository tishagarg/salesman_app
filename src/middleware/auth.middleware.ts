import { Request, Response, NextFunction } from "express";
import { getDataSource } from "../config/data-source";
import { jwtVerify } from "../config/jwt";
import { UserTokenQuery } from "../query/usertoken.query";
import { UserToken } from "../models/UserToken.entity";
import { ApiResponse } from "../utils/api.response";
import { runDailyVisitPlanning } from "../service/nodeCron.service";

const userTokenQuery = new UserTokenQuery();

export const verifyToken = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (req.url?.includes("/api/cron/daily-visit")) {
    try {
      await runDailyVisitPlanning();
      //console.log("Daily visit planning ran successfully");
      return res.status(200).json({ message: "Success" });
    } catch (err) {
      //console.error("Cron job failed:", err);
      return ApiResponse.error(res, 500, "Internal Server Error");
    }
  }
  if (!token) {
    //console.log("Token is not present")
    return ApiResponse.error(res, 401, "Token not provided");
  }

  try {
    const decoded = await jwtVerify(token);
    // console.log("JWT decoded successfully:", { 
    //   user_id: decoded.user_id, 
    //   email: decoded.email,
    //   iat: new Date((decoded.iat || 0) * 1000).toISOString(),
    //   exp: new Date((decoded.exp || 0) * 1000).toISOString()
    // });

    // Check JWT timestamps for sanity
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      // console.log("JWT token expired based on exp claim");
      return ApiResponse.error(res, 401, "Token expired");
    }

    let userToken;
    try {
      const dataSource = await getDataSource();
      const userTokenRepository = dataSource.getRepository(UserToken);
      userToken = await userTokenRepository.findOne({
        where: {
          user_token_id: token,
          user_id: decoded.user_id,
          is_active: true,
        },
      });
    } catch (dbError) {
      console.error("Database connection error during token lookup:", dbError);
      return ApiResponse.error(res, 500, "Database connection error");
    }
    
    if (!userToken) {
      console.log("User token not found in database:", { 
        token: token.substring(0, 20) + "...", 
        user_id: decoded.user_id 
      });
      return ApiResponse.error(res, 401, "Token not authorized");
    }

    const currentTime = Date.now();
    const tokenExpiryTime = userToken.created_at.getTime() + userToken.ttl;
    
    // console.log("Database token expiry check:", {
    //   currentTime: new Date(currentTime).toISOString(),
    //   tokenCreatedAt: new Date(userToken.created_at).toISOString(),
    //   tokenExpiryTime: new Date(tokenExpiryTime).toISOString(),
    //   ttl: userToken.ttl,
    //   isExpired: currentTime > tokenExpiryTime
    // });

    if (currentTime > tokenExpiryTime) {
      //console.log("Token expired based on database TTL, deleting from database");
      await userTokenQuery.deleteTokenFromDatabase(token);
      return ApiResponse.error(res, 401, "Token expired");
    }
    
    req.user = { ...decoded, token };
    next();
  } catch (error) {
    //console.log("JWT verification failed:", error);
    if (error instanceof Error) {
      //console.log("Error details:", error.message);
    }
    return ApiResponse.error(res, 401, "Token not authorized");
  }
};
