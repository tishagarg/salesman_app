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
exports.UserQuery = void 0;
const data_source_1 = require("../config/data-source");
const usertoken_query_1 = require("./usertoken.query");
const User_entity_1 = require("../models/User.entity");
const UserToken_entity_1 = require("../models/UserToken.entity");
const timezone_1 = require("../utils/timezone");
const userTokenQuery = new usertoken_query_1.UserTokenQuery();
class UserQuery {
    findUserByEmail(manager, email) {
        return __awaiter(this, void 0, void 0, function* () {
            const userRepo = manager.getRepository(User_entity_1.User);
            return yield userRepo.findOne({
                where: { email },
                relations: { address: true },
            });
        });
    }
    findByEmailAndId(email, id, manager) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = manager ? null : yield (0, data_source_1.getDataSource)();
            const repository = manager
                ? manager.getRepository(User_entity_1.User)
                : dataSource.getRepository(User_entity_1.User);
            return yield repository.findOne({
                where: { email, user_id: id },
                relations: { address: true },
            });
        });
    }
    findById(id, manager) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = manager ? null : yield (0, data_source_1.getDataSource)();
            const repository = manager
                ? manager.getRepository(User_entity_1.User)
                : dataSource.getRepository(User_entity_1.User);
            return yield repository.findOne({
                where: { user_id: id },
                relations: { address: true },
            });
        });
    }
    addUser(manager, userData) {
        return __awaiter(this, void 0, void 0, function* () {
            const userRepo = manager.getRepository(User_entity_1.User);
            const newUser = userRepo.create(Object.assign(Object.assign({}, userData), { created_at: (0, timezone_1.getFinnishTime)(), updated_at: (0, timezone_1.getFinnishTime)() }));
            yield userRepo.save(newUser);
            return newUser;
        });
    }
    findUserByGoogleId(manager, googleId) {
        return __awaiter(this, void 0, void 0, function* () {
            const userRepo = manager.getRepository(User_entity_1.User);
            return yield userRepo.findOne({
                where: { google_oauth_id: googleId },
                relations: { address: true },
            });
        });
    }
    saveToken(manager, params) {
        return __awaiter(this, void 0, void 0, function* () {
            let userToken;
            userToken = new UserToken_entity_1.UserToken();
            userToken.user_token_id = params.id;
            userToken.user_id = params.userId;
            userToken.ttl = params.ttl;
            userToken.scopes = params.scopes;
            userToken.status = params.status;
            userToken.is_active = true;
            userToken.created_at = (0, timezone_1.getFinnishTime)();
            userToken.updated_at = (0, timezone_1.getFinnishTime)();
            const savedToken = yield manager.save(userToken);
            // console.log("Token saved to database:", {
            //   user_id: userToken.user_id,
            //   token: userToken.user_token_id.substring(0, 20) + "...",
            //   created_at: userToken.created_at,
            //   ttl: userToken.ttl
            // });
            return savedToken;
        });
    }
    findByEmail(email, manager) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = manager ? null : yield (0, data_source_1.getDataSource)();
            const repository = manager
                ? manager.getRepository(User_entity_1.User)
                : dataSource.getRepository(User_entity_1.User);
            return yield repository.findOne({
                where: { email },
                relations: { address: true },
            });
        });
    }
    createUser(manager, userData) {
        return __awaiter(this, void 0, void 0, function* () {
            const userRepo = manager.getRepository(User_entity_1.User);
            const newUser = userRepo.create(Object.assign({}, userData));
            yield userRepo.save(newUser);
            return newUser;
        });
    }
    findByIdAndUpdate(manager, user_id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            const userRepo = manager.getRepository(User_entity_1.User);
            yield userRepo.update(user_id, Object.assign(Object.assign({}, updateData), { updated_at: (0, timezone_1.getFinnishTime)() }));
            const updatedUser = yield userRepo.findOne({
                where: { user_id },
            });
            return updatedUser;
        });
    }
    getAllUsersWithRoleName(manager, org_id, role_name, limit, skip, search) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = manager
                .createQueryBuilder(User_entity_1.User, "user")
                .innerJoin("user.role", "role")
                .select([
                "user.user_id",
                "user.email",
                "user.phone",
                "user.google_oauth_id",
                "user.is_email_verified",
                "user.full_name",
                "user.org_id",
                "user.role_id",
                "user.is_admin",
                "user.is_active",
                "user.created_by",
                "user.updated_by",
                "user.created_at",
                "user.is_super_admin",
                "user.updated_at",
                "role.role_name",
            ])
                .where("user.org_id = :org_id", { org_id })
                .andWhere("user.is_active = :is_active", { is_active: true })
                .andWhere("role.role_name = :role_name", { role_name });
            if (search && search.trim() !== "") {
                const searchTerm = `%${search.trim().toLowerCase()}%`;
                query = query.andWhere(`(LOWER(COALESCE(user.email, '')) LIKE :searchTerm
         OR LOWER(COALESCE(user.full_name, '')) LIKE :searchTerm
         OR LOWER(COALESCE(user.first_name, '')) LIKE :searchTerm
         OR LOWER(COALESCE(user.last_name, '')) LIKE :searchTerm)`, { searchTerm });
            }
            const [users, total] = yield query
                .orderBy("user.user_id", "ASC")
                .take(limit)
                .skip(skip)
                .getManyAndCount();
            return [users, total];
        });
    }
    getAllUsersWithRoles(manager, org_id, limit, skip, search, role, status) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = yield manager
                .createQueryBuilder(User_entity_1.User, "user")
                .leftJoin("user.role", "role")
                .select([
                "user.user_id",
                "user.email",
                "user.phone",
                "user.google_oauth_id",
                "user.is_email_verified",
                "user.full_name",
                "user.org_id",
                "user.role_id",
                "user.is_admin",
                "user.is_active",
                "user.created_by",
                "user.updated_by",
                "user.created_at",
                "user.is_super_admin",
                "user.updated_at",
                "role.role_name",
            ])
                .where("user.org_id = :org_id", { org_id });
            if (search && search.trim() !== "") {
                const searchTerm = `%${search.trim().toLowerCase()}%`;
                query = query.andWhere(`(LOWER(COALESCE(user.email, '')) LIKE :searchTerm
         OR LOWER(COALESCE(user.full_name, '')) LIKE :searchTerm
         OR LOWER(COALESCE(user.first_name, '')) LIKE :searchTerm
         OR LOWER(COALESCE(user.last_name, '')) LIKE :searchTerm)`, { searchTerm });
            }
            if (role && role.trim() !== "") {
                query = query.andWhere("LOWER(role.role_name) = :role", {
                    role: role.toLowerCase(),
                });
            }
            if (status && (status === "active" || status === "inactive")) {
                const isActive = status === "active";
                query = query.andWhere("user.is_active = :isActive", { isActive });
            }
            const [users, total] = yield query
                .orderBy("user.user_id", "ASC")
                .take(limit)
                .skip(skip)
                .getManyAndCount();
            return [users, total];
        });
    }
    getUserById(manager, org_id, user_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield manager.getRepository(User_entity_1.User).findOne({
                where: { is_active: true, user_id, org_id },
                relations: { role: true },
            });
        });
    }
    getUserByIdAllStatus(manager, org_id, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield manager
                .getRepository(User_entity_1.User)
                .findOne({ where: { user_id: id, org_id } });
        });
    }
    updateUser(manager, org_id, user_id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            const userRepo = manager.getRepository(User_entity_1.User);
            yield userRepo.update({ user_id, org_id }, Object.assign(Object.assign({}, updateData), { updated_at: (0, timezone_1.getFinnishTime)(), updated_by: String(user_id).trim() }));
            const updatedUser = yield userRepo.findOne({
                where: { user_id, org_id },
                relations: { address: true },
            });
            return updatedUser;
        });
    }
    activeDeactiveUser(manager, org_id, id, status, user_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const userRepo = manager.getRepository(User_entity_1.User);
            yield userRepo.update({ user_id: id, org_id }, {
                is_active: status,
                updated_at: (0, timezone_1.getFinnishTime)(),
                updated_by: String(user_id).trim(),
            });
        });
    }
}
exports.UserQuery = UserQuery;
