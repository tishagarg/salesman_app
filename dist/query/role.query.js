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
exports.RoleQuery = void 0;
const Role_entity_1 = require("../models/Role.entity");
const typeorm_1 = require("typeorm");
const RolePermission_entity_1 = require("../models/RolePermission.entity");
const Permission_entity_1 = require("../models/Permission.entity");
const data_source_1 = require("../config/data-source");
const roles_1 = require("../enum/roles");
class RoleQuery {
    getRoleByNameAndOrgId(manager, role_name, org_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield manager.getRepository(Role_entity_1.Role).findOne({
                where: Object.assign({ role_name }, (org_id !== null && { org_id })),
            });
        });
    }
    saveRole(manager, roleData) {
        return __awaiter(this, void 0, void 0, function* () {
            const newRole = manager.getRepository(Role_entity_1.Role).create({
                role_name: roleData.role_name,
                created_by: roleData.created_by,
                updated_by: roleData.updated_by,
                org_id: roleData.org_id,
            });
            return yield manager.getRepository(Role_entity_1.Role).save(newRole);
        });
    }
    getRole(manager, org_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield manager.getRepository(Role_entity_1.Role).find({
                where: [{ role_name: roles_1.Roles.ADMIN }, { org_id }],
            });
        });
    }
    getPermissionsByRoleId(manager, role_id, org_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield manager
                .getRepository(RolePermission_entity_1.RolePermission)
                .createQueryBuilder("rolePermission")
                .leftJoinAndSelect("rolePermission.permission", "permission")
                .where("rolePermission.role_id = :role_id AND rolePermission.org_id = :org_id", { role_id, org_id })
                .andWhere("rolePermission.is_active = :isActive", { isActive: true })
                .getMany();
        });
    }
    getRoleById(role_id, manager) {
        return __awaiter(this, void 0, void 0, function* () {
            if (role_id === null || role_id === undefined) {
                return null;
            }
            const repo = manager
                ? manager.getRepository(Role_entity_1.Role)
                : (yield (0, data_source_1.getDataSource)()).getRepository(Role_entity_1.Role);
            return yield repo.findOne({ where: { role_id } });
        });
    }
    getRoleByIdAndOrgId(role_id, org_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            return yield dataSource
                .getRepository(Role_entity_1.Role)
                .findOne({
                where: [
                    { role_id, org_id },
                    { role_id, org_id: undefined }
                ]
            });
        });
    }
    getPermissionByName(manager, permission_name) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield manager
                .getRepository(Permission_entity_1.Permission)
                .findOne({ where: { permission_name } });
        });
    }
    getPermissionsByIds(manager, permission_ids) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield manager
                .getRepository(Permission_entity_1.Permission)
                .find({ where: { permission_id: (0, typeorm_1.In)(permission_ids) } });
        });
    }
    savePermission(manager, permissionData) {
        return __awaiter(this, void 0, void 0, function* () {
            const newPermission = manager.getRepository(Permission_entity_1.Permission).create({
                permission_name: permissionData.permission_name,
                description: permissionData.description,
                created_by: permissionData.created_by,
                is_active: true,
            });
            return yield manager.getRepository(Permission_entity_1.Permission).save(newPermission);
        });
    }
    saveRolePermissions(manager, rolePermissions) {
        return __awaiter(this, void 0, void 0, function* () {
            const newRolePermissions = rolePermissions.map((rp) => manager.getRepository(RolePermission_entity_1.RolePermission).create({
                role_id: rp.role_id,
                permission_id: rp.permission_id,
                created_by: rp.created_by,
                updated_by: rp.updated_by,
                is_active: rp.is_active,
                org_id: rp.org_id,
            }));
            return yield manager.getRepository(RolePermission_entity_1.RolePermission).save(newRolePermissions);
        });
    }
}
exports.RoleQuery = RoleQuery;
