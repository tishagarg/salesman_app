"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.generateRefreshToken = exports.jwtVerify = exports.jwtSign = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SECRET_KEY = process.env.JWT_SECRET || "";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "";
const jwtSign = (user_id, org_id, email, role_id, is_super_admin, is_admin) => {
    return jsonwebtoken_1.default.sign({ user_id, org_id, email, role_id, is_super_admin, is_admin }, SECRET_KEY, {
        expiresIn: "2d",
    });
};
exports.jwtSign = jwtSign;
const jwtVerify = (token) => {
    try {
        if (!SECRET_KEY) {
            throw new Error("JWT_SECRET is not configured");
        }
        const decoded = jsonwebtoken_1.default.verify(token, SECRET_KEY);
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new Error("JWT token has expired");
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new Error(`JWT verification failed: ${error.message}`);
        }
        else {
            throw error;
        }
    }
};
exports.jwtVerify = jwtVerify;
const generateRefreshToken = (user_id) => {
    return jsonwebtoken_1.default.sign({ user_id }, REFRESH_SECRET, {
        expiresIn: "7d",
    });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyRefreshToken = (token) => {
    const decoded = jsonwebtoken_1.default.verify(token, REFRESH_SECRET);
    return decoded;
};
exports.verifyRefreshToken = verifyRefreshToken;
