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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionMiddleware = void 0;
const data_source_1 = require("../config/data-source");
const jwt_1 = require("../config/jwt");
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const User_entity_1 = require("../models/User.entity");
const RolePermission_entity_1 = require("../models/RolePermission.entity");
const permissionMiddleware = (requiredPermission) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if (!token) {
        return res
            .status(http_status_codes_1.default.UNAUTHORIZED)
            .json({ message: "No token provided" });
    }
    try {
        const payload = yield (0, jwt_1.jwtVerify)(token);
        const dataSource = yield (0, data_source_1.getDataSource)();
        const user = yield dataSource.getRepository(User_entity_1.User).findOne({
            where: { user_id: payload.user_id },
            relations: ["role"],
        });
        if (!user) {
            return res
                .status(http_status_codes_1.default.FORBIDDEN)
                .json({ message: "User not found" });
        }
        const rolePermission = yield dataSource.getRepository(RolePermission_entity_1.RolePermission).findOne({
            where: {
                role_id: user.role.role_id,
                permission: { permission_name: requiredPermission },
                is_active: true,
                org_id: user.role.org_id || 1,
            },
            relations: ["permission"],
        });
        if (!rolePermission) {
            return res
                .status(http_status_codes_1.default.FORBIDDEN)
                .json({ message: `Permission '${requiredPermission}' denied` });
        }
        req.user = Object.assign(Object.assign({}, payload), { token });
        next();
    }
    catch (error) {
        console.error(error);
        return res
            .status(http_status_codes_1.default.UNAUTHORIZED)
            .json({ message: "Invalid token", error });
    }
});
exports.permissionMiddleware = permissionMiddleware;
