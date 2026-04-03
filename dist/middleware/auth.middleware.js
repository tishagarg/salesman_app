"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const data_source_1 = require("../config/data-source");
const jwt_1 = require("../config/jwt");
const usertoken_query_1 = require("../query/usertoken.query");
const UserToken_entity_1 = require("../models/UserToken.entity");
const api_response_1 = require("../utils/api.response");
const nodeCron_service_1 = require("../service/nodeCron.service");
const userTokenQuery = new usertoken_query_1.UserTokenQuery();
const verifyToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const token = (_a = req.headers["authorization"]) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if ((_b = req.url) === null || _b === void 0 ? void 0 : _b.includes("/api/cron/daily-visit")) {
        try {
            yield (0, nodeCron_service_1.runDailyVisitPlanning)();
            //console.log("Daily visit planning ran successfully");
            return res.status(200).json({ message: "Success" });
        }
        catch (err) {
            //console.error("Cron job failed:", err);
            return api_response_1.ApiResponse.error(res, 500, "Internal Server Error");
        }
    }
    if (!token) {
        //console.log("Token is not present")
        return api_response_1.ApiResponse.error(res, 401, "Token not provided");
    }
    try {
        const decoded = yield (0, jwt_1.jwtVerify)(token);
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
            return api_response_1.ApiResponse.error(res, 401, "Token expired");
        }
        let userToken;
        try {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const userTokenRepository = dataSource.getRepository(UserToken_entity_1.UserToken);
            userToken = yield userTokenRepository.findOne({
                where: {
                    user_token_id: token,
                    user_id: decoded.user_id,
                    is_active: true,
                },
            });
        }
        catch (dbError) {
            console.error("Database connection error during token lookup:", dbError);
            return api_response_1.ApiResponse.error(res, 500, "Database connection error");
        }
        if (!userToken) {
            console.log("User token not found in database:", {
                token: token.substring(0, 20) + "...",
                user_id: decoded.user_id
            });
            return api_response_1.ApiResponse.error(res, 401, "Token not authorized");
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
            yield userTokenQuery.deleteTokenFromDatabase(token);
            return api_response_1.ApiResponse.error(res, 401, "Token expired");
        }
        req.user = Object.assign(Object.assign({}, decoded), { token });
        next();
    }
    catch (error) {
        //console.log("JWT verification failed:", error);
        if (error instanceof Error) {
            //console.log("Error details:", error.message);
        }
        return api_response_1.ApiResponse.error(res, 401, "Token not authorized");
    }
});
exports.verifyToken = verifyToken;
