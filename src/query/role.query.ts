import { Role } from "../models/Role.entity";
import { EntityManager, In } from "typeorm";
import { RolePermission } from "../models/RolePermission.entity";
import { Permission } from "../models/Permission.entity";
import dataSource from "../config/data-source";

export class RoleQuery {
  async getRoleByNameAndOrgId(
    manager: EntityManager,
    role_name: string,
    org_id: number | null
  ): Promise<Role | null> {
    return await manager.getRepository(Role).findOne({
      where: {
        role_name,
        ...(org_id !== null && { org_id }),
      },
    });
  }

  async saveRole(
    manager: EntityManager,
    roleData: Partial<Role>
  ): Promise<Role> {
    const newRole = manager.getRepository(Role).create({
      role_name: roleData.role_name,
      created_by: roleData.created_by,
      updated_by: roleData.updated_by,
      org_id: roleData.org_id,
    });
    return await manager.getRepository(Role).save(newRole);
  }
  async getRole(manager: EntityManager, org_id: number): Promise<Role[]> {
    return await manager.getRepository(Role).find({
      where: [{ role_name: "admin" }, { org_id }],
    });
  }

  async getPermissionsByRoleId(
    manager: EntityManager,
    role_id: number,
    org_id: number | null
  ): Promise<RolePermission[]> {
    return await manager
      .getRepository(RolePermission)
      .createQueryBuilder("rolePermission")
      .leftJoinAndSelect("rolePermission.permission", "permission")
      .where(
        "rolePermission.role_id = :role_id AND rolePermission.org_id = :org_id",
        { role_id, org_id }
      )
      .andWhere("rolePermission.is_active = :isActive", { isActive: true })
      .getMany();
  }

  async getRoleById(
    role_id: number | undefined,
    manager?: EntityManager
  ): Promise<Role | null> {
    if (role_id === null) {
      return null;
    }
    const repo = manager
      ? manager.getRepository(Role)
      : dataSource.getRepository(Role);
    return await repo.findOne({ where: { role_id } });
  }
  async getRoleByIdAndOrgId(
    role_id: number,
    org_id: number
  ): Promise<Role | null> {
    return await dataSource
      .getRepository(Role)
      .findOne({ where: { role_id, org_id } });
  }

  async getPermissionByName(
    manager: EntityManager,
    permission_name: string
  ): Promise<Permission | null> {
    return await manager
      .getRepository(Permission)
      .findOne({ where: { permission_name } });
  }

  async getPermissionsByIds(
    manager: EntityManager,
    permission_ids: number[]
  ): Promise<Permission[]> {
    return await manager
      .getRepository(Permission)
      .find({ where: { permission_id: In(permission_ids) } });
  }

  async savePermission(
    manager: EntityManager,
    permissionData: Partial<Permission>
  ): Promise<Permission> {
    const newPermission = manager.getRepository(Permission).create({
      permission_name: permissionData.permission_name,
      description: permissionData.description,
      created_by: permissionData.created_by,
      is_active: true,
    });
    return await manager.getRepository(Permission).save(newPermission);
  }

  async saveRolePermissions(
    manager: EntityManager,
    rolePermissions: Partial<RolePermission>[]
  ): Promise<RolePermission[]> {
    const newRolePermissions = rolePermissions.map((rp) =>
      manager.getRepository(RolePermission).create({
        role_id: rp.role_id,
        permission_id: rp.permission_id,
        created_by: rp.created_by,
        updated_by: rp.updated_by,
        is_active: rp.is_active,
        org_id: rp.org_id,
      })
    );
    return await manager.getRepository(RolePermission).save(newRolePermissions);
  }
}
