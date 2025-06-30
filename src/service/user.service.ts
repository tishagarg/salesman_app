import { UserQuery } from "../query/user.query";
import { getDataSource } from "../config/data-source";
import bcrypt from "bcrypt";
import httpStatusCodes from "http-status-codes";

const SALT_ROUNDS = 10;
import { generatePassword } from "../config/passwordGenerator";
import { RoleQuery } from "../query/role.query";
import {
  activeDeactiveI,
  IJwtVerify,
  ITeamMember,
} from "../interfaces/user.interface";
import { UserTokenQuery } from "../query/usertoken.query";
import { sendEmail } from "./email.service";
import { OrganizationQuery } from "../query/organization.query";
import { Roles } from "../enum/roles";
import { Address } from "../models/Address.entity";
import { AddressQuery } from "../query/address.query";
import { AddressDto, IPagination } from "../interfaces/common.interface";
import { TerritoryService } from "./territory.service";
import { Territory } from "../models/Territory.entity";
import { In, IsNull, Not } from "typeorm";
import { ManagerSalesRep } from "../models/ManagerSalesRep.entity";
import { GeocodingService } from "../utils/geoCode.service";
import { User } from "../models/User.entity";
import { Role } from "../models/Role.entity";
import { Leads } from "../models/Leads.entity";
import { Visit } from "../models/Visits.entity";
import { Route } from "../models/Route.entity";
import { Contract } from "../models/Contracts.entity";
import { ContractTemplate } from "../models/ContractTemplate.entity";

const userQuery = new UserQuery();
const roleQuery = new RoleQuery();
const userTokenQuery = new UserTokenQuery();
const organizationQuery = new OrganizationQuery();
const addressQuery = new AddressQuery();
const territoryService = new TerritoryService();

const geocodingService = new GeocodingService();
export class UserTeamService {
  async SendEmailNotification(email: string, password: string) {
    await sendEmail({
      to: email,
      subject: "Login Credentials",
      body: `Your password is ${password} and email is ${email}. Please reset your password after login.`,
    });
  }
  async getAllRoles(
    org_id: number
  ): Promise<{ status: number; data?: any; message: string }> {
    const dataSource = await getDataSource();
    const queryRunner = await dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const roleData = await queryRunner.manager.getRepository(Role).find({
        where: [{ org_id: org_id }, { role_name: Roles.ADMIN }],
      });

      if (!roleData) {
        return {
          data: null,
          status: 404,
          message: "Roles not found",
        };
      }
      return {
        data: roleData,
        status: 200,
        message: "Roles fetched successfully",
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        data: null,
        status: 500,
        message: "Error fetcing roles",
      };
    } finally {
      await queryRunner.release();
    }
  }
  async getDashboard(): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = await dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const leadsCount = await queryRunner.manager.getRepository(Leads).count();
      const closedVisitsCount = await queryRunner.manager
        .getRepository(Visit)
        .countBy({ check_out_time: Not(IsNull()) });
      const pendingVisitsCount = await queryRunner.manager
        .getRepository(Visit)
        .countBy({ check_out_time: IsNull() });
      const assignedSalesRepsCount = await queryRunner.manager
        .getRepository(ManagerSalesRep)
        .count();
      const totalSignedContracts = await queryRunner.manager
        .getRepository(Contract)
        .count();
      const totalContractTemplates = await queryRunner.manager
        .getRepository(ContractTemplate)
        .count();
      const salesRepCount = await queryRunner.manager
        .getRepository(User)
        .countBy({ role: { role_name: Roles.SALES_REP } });
      const unassignedSalesRepsCount = salesRepCount - assignedSalesRepsCount;

      const managerCount = await queryRunner.manager
        .getRepository(User)
        .countBy({ role: { role_name: Roles.MANAGER } });
      const liveRoutesCount = await queryRunner.manager
        .getRepository(Route)
        .countBy({ is_active: true });
      const totalTerritoryCount = await queryRunner.manager
        .getRepository(Territory)
        .count();
      const totalAddressCount = await queryRunner.manager
        .getRepository(Address)
        .count();
      const totalUsersCount = await queryRunner.manager
        .getRepository(User)
        .count();
      const activeUsersCount = await queryRunner.manager
        .getRepository(User)
        .countBy({ is_active: true });
      const assignedManagerCount = await queryRunner.query(`
  SELECT COUNT(DISTINCT manager_id) as count 
  FROM contract_template_managers
`);
      return {
        data: {
          totalUsersCount,
          activeUsersCount,
          pendingVisitsCount,
          managerCount,
          salesRepCount,
          closedVisitsCount,
          leadsCount,
          totalTerritoryCount,
          totalAddressCount,
          liveRoutesCount,
          unassignedSalesRepsCount,
          totalSignedContracts,
          totalContractTemplates,
          assignedManagerCount: assignedManagerCount.count,
        },
        status: 200,
        message: "Analytics fetched successfully",
      };
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
      return {
        data: null,
        status: 500,
        message: "Error fetcing dashboard results",
      };
    } finally {
      await queryRunner.release();
    }
  }
  async assignManagerToSalesRep(
    userData: IJwtVerify,
    manager_id: number,
    sales_rep_ids: number[]
  ): Promise<{ status: number; data?: any; message: string }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const manager = await userQuery.getUserById(
        queryRunner.manager,
        userData.org_id,
        manager_id
      );

      if (!manager) {
        await queryRunner.rollbackTransaction();
        return { status: 404, message: "Manager not found", data: null };
      }
      if (manager?.role?.role_name !== Roles.MANAGER) {
        await queryRunner.rollbackTransaction();
        return { status: 404, message: "User is not a manager", data: null };
      }

      if (!Array.isArray(sales_rep_ids) || sales_rep_ids.length === 0) {
        await queryRunner.rollbackTransaction();
        return {
          status: 400,
          message: "Sales rep IDs must be a non-empty array.",
          data: null,
        };
      }

      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from("manager_sales_rep")
        .where("sales_rep_id IN (:...ids)", { ids: sales_rep_ids })
        .execute();

      const assignments = sales_rep_ids.map((rep_id) =>
        queryRunner.manager.create(ManagerSalesRep, {
          manager_id,
          sales_rep_id: rep_id,
        })
      );

      await queryRunner.manager.save(ManagerSalesRep, assignments);

      await queryRunner.commitTransaction();
      return {
        status: 200,
        message: "Manager assigned to sales reps successfully",
        data: assignments,
      };
    } catch (error) {
      console.error(error);
      await queryRunner.rollbackTransaction();
      return {
        status: 500,
        message: "An error occurred while assigning manager to sales reps.",
        data: null,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async getSalesRepManagaerList(
    page: number,
    limit: number,
    search: string,
    managerId?: number,
    salesmanId?: number
  ): Promise<{
    status: number;
    data?: any;
    message: string;
    total: number;
  }> {
    const skip = (page - 1) * limit;
    const dataSource = await getDataSource();

    try {
      const query = dataSource
        .getRepository(ManagerSalesRep)
        .createQueryBuilder("msr")
        .leftJoinAndSelect("msr.manager", "manager")
        .leftJoinAndSelect("msr.sales_rep", "sales_rep");

      if (search && search.trim() !== "") {
        const searchTerm = `%${search.trim().toLowerCase()}%`;
        query.andWhere(
          `(LOWER(COALESCE(manager.full_name, '')) LIKE :searchTerm
        OR LOWER(COALESCE(manager.email, '')) LIKE :searchTerm)`,
          { searchTerm }
        );
      }
      if (managerId) {
        query.andWhere("manager.user_id = :managerId", { managerId });
      }

      // Apply salesman ID filter
      if (salesmanId) {
        query.andWhere("sales_rep.user_id = :salesmanId", { salesmanId });
      }
      const [results, total] = await query
        .orderBy("manager.user_id", "ASC")
        .skip(skip)
        .take(limit)
        .getManyAndCount();
      console.log(total);
      // Group sales reps by manager
      const groupedData: Record<number, { manager: any; sales_reps: any[] }> =
        {};

      for (const entry of results) {
        const managerId = entry.manager.user_id;
        if (!groupedData[managerId]) {
          groupedData[managerId] = {
            manager: entry.manager,
            sales_reps: [],
          };
        }
        groupedData[managerId].sales_reps.push(entry.sales_rep);
      }

      return {
        data: Object.values(groupedData),
        total: Object.keys(groupedData).length,
        status: 200,
        message: "Sales reps grouped by manager with pagination",
      };
    } catch (error) {
      console.error(error);
      return {
        data: null,
        status: 500,
        total: 0,
        message: "Error fetching data",
      };
    }
  }

  async getUnassignedSalesRep(
    org_id: number,
    { limit, skip, search }: { limit: number; skip: number; search?: string }
  ): Promise<{
    status: number;
    data?: any;
    message: string;
    total: number;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const role = await queryRunner.manager.findOneByOrFail(Role, {
        role_name: Roles.SALES_REP,
      });

      const query = queryRunner.manager
        .getRepository(User)
        .createQueryBuilder("user")
        .leftJoin(ManagerSalesRep, "msr", "msr.sales_rep_id = user.user_id")
        .where("user.role_id = :roleId", { roleId: role.role_id })
        .andWhere("user.org_id = :orgId", { orgId: org_id })
        .andWhere("msr.sales_rep_id IS NULL")
        .andWhere("user.is_active = true");
      if (search && search.trim() !== "") {
        const searchTerm = `%${search.trim().toLowerCase()}%`;
        query.andWhere(
          `(LOWER(COALESCE(user.email, '')) LIKE :searchTerm
          OR LOWER(COALESCE(user.full_name, '')) LIKE :searchTerm
          OR LOWER(COALESCE(user.first_name, '')) LIKE :searchTerm
          OR LOWER(COALESCE(user.last_name, '')) LIKE :searchTerm)`,
          { searchTerm }
        );
      }

      const [users, total] = await query
        .orderBy("user.user_id", "ASC")
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      await queryRunner.commitTransaction();

      return {
        status: 200,
        data: users.map(({ password_hash, ...safeUser }) => safeUser),
        total,
        message: "Unassigned managers fetched successfully",
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(error);
      return {
        status: 500,
        data: null,
        total: 0,
        message: "Failed to fetch unassigned managers.",
      };
    } finally {
      await queryRunner.release();
    }
  }

  async getUsersByRole(
    org_id: number,
    role: Roles,
    pagination: { limit: number; skip: number; search: string }
  ): Promise<{
    status: number;
    data?: any;
    message: string;
    pagination?: IPagination;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const [salesRep, total] = await userQuery.getAllUsersWithRoleName(
        queryRunner.manager,
        org_id,
        role,
        pagination.limit,
        pagination.skip,
        pagination.search
      );
      await queryRunner.commitTransaction();

      const totalPages = Math.ceil(total / pagination.limit);
      const currentPage = Math.floor(pagination.skip / pagination.limit) + 1;
      const previousPage = currentPage > 1 ? currentPage - 1 : null;
      const nextPage = currentPage < totalPages ? currentPage + 1 : null;

      return {
        status: 200,
        data: salesRep.map((val) => {
          let { password_hash, ...safeUser } = val;
          return safeUser;
        }),
        pagination: {
          totalPages,
          previousPage,
          currentPage,
          nextPage,
          totalItems: total,
        },
        message: "Users fetched successfully",
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: "An error occurred while fetching user data.",
        data: null,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async getUserById(userId: number): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();

    try {
      await queryRunner.startTransaction();
      const getUserByIdWithOrganization =
        await organizationQuery.getUserByIdWithOrganization(
          queryRunner.manager,
          userId
        );

      if (!getUserByIdWithOrganization) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "User not found",
        };
      }

      const { password_hash, ...safeUser } = getUserByIdWithOrganization;
      await queryRunner.commitTransaction();

      return {
        status: httpStatusCodes.OK,
        data: safeUser,
        message: "",
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: "An error occurred while fetching user data.",
      };
    } finally {
      await queryRunner.release();
    }
  }

  async addTeamMember(
    org_id: number,
    user_id: number,
    params: ITeamMember
  ): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();
      const password = await generatePassword();
      const passwordhash = await bcrypt.hash(password, SALT_ROUNDS);
      let role_id: number | undefined;
      if (params.role_name) {
        const existingRole = await roleQuery.getRoleByNameAndOrgId(
          queryRunner.manager,
          params.role_name as Roles,
          org_id
        );
        if (existingRole) {
          role_id = existingRole.role_id;
        } else {
          const newRole = await roleQuery.saveRole(queryRunner.manager, {
            role_name: params.role_name,
            org_id,
          });
          role_id = newRole.role_id;
        }
      } else {
        role_id = params.role_id;
      }
      const findRole = await roleQuery.getRoleByIdAndOrgId(role_id, org_id);

      if (!findRole) {
        await queryRunner.rollbackTransaction();
        return {
          status: 500,
          message: "Role not found",
        };
      }
      const newUser = await userQuery.createUser(queryRunner.manager, {
        role_id: role_id,
        email: params.email,
        org_id,
        phone: params.phone,
        first_name: params.first_name,
        last_name: params.last_name,
        is_email_verified: 1,
        is_active: true,
        is_admin: findRole.role_name === Roles.ADMIN ? 1 : 0,
        password_hash: passwordhash,
        created_by: String(user_id).trim(),
      });
      await this.SendEmailNotification(params.email, password);

      const { password_hash, ...safeUser } = newUser;

      await queryRunner.commitTransaction();
      return {
        status: 200,
        data: safeUser,
        message: "User created successfully",
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        status: 500,
        message:
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Error creating user profile",
      };
    } finally {
      await queryRunner.release();
    }
  }

  async getAllTeamMember(
    org_id: number,
    pagination: {
      page: number;
      limit: number;
      skip: number;
      search: string;
      role?: string;
      status?: string;
    }
  ): Promise<{
    status: number;
    data?: any;
    total?: number;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();

    try {
      await queryRunner.startTransaction();
      const [users, total] = await userQuery.getAllUsersWithRoles(
        queryRunner.manager,
        org_id,
        pagination.limit,
        pagination.skip,
        pagination.search,
        pagination.role,
        pagination.status
      );
      await queryRunner.commitTransaction();

      return {
        status: 200,
        data: users.map((val) => {
          let { password_hash, ...safeUser } = val;
          return safeUser;
        }),
        total,
        message: "Users fetched successfully",
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        status: 500,
        message: "Error fetching users",
      };
    } finally {
      await queryRunner.release();
    }
  }

  async getTeamMemberById(
    org_id: number,
    user_id: number
  ): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();

    try {
      await queryRunner.startTransaction();
      const result = await userQuery.getUserById(
        queryRunner.manager,
        org_id,
        user_id
      );
      if (!result) {
        await queryRunner.rollbackTransaction();
        return {
          status: 404,
          message: "User not found",
        };
      }
      const { password_hash, ...safeUser } = result;
      await queryRunner.commitTransaction();
      return {
        status: 200,
        data: safeUser,
        message: "User fetched successfully",
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        status: 500,
        message: "Error fetching user",
      };
    } finally {
      await queryRunner.release();
    }
  }

  async editTeamMember(
    org_id: number,
    user_id: number,
    updateData: any
  ): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();

      // Check if user exists
      const existingUser = await userQuery.getUserById(
        queryRunner.manager,
        org_id,
        user_id
      );

      if (!existingUser) {
        await queryRunner.rollbackTransaction();
        return {
          status: 404,
          message: "User not found",
        };
      }

      // Handle role assignment
      let role_id = updateData?.role_id
        ? updateData?.role_id
        : existingUser.role_id;
      if (updateData.role_name) {
        const existingRole = await roleQuery.getRoleByNameAndOrgId(
          queryRunner.manager,
          updateData.role_name,
          org_id
        );
        if (existingRole) {
          role_id = existingRole.role_id;
        } else {
          const newRole = await roleQuery.saveRole(queryRunner.manager, {
            role_name: updateData.role_name,
            org_id,
          });
          role_id = newRole.role_id;
        }
      }

      // Remove non-user columns from updateData
      const { role_name, ...updatedFields } = updateData;

      updatedFields.role_id = role_id;

      const findRole = await roleQuery.getRoleById(
        updatedFields.role_id,
        queryRunner.manager
      );

      if (!findRole) {
        await queryRunner.rollbackTransaction();
        return {
          status: 500,
          message: "Role not found",
        };
      }

      // Update user in DB
      const updatedUser = await userQuery.updateUser(
        queryRunner.manager,
        org_id,
        user_id,
        {
          ...updatedFields,
          is_admin: findRole.role_name === Roles.ADMIN ? 1 : 0,
        }
      );

      if (!updatedUser) {
        await queryRunner.rollbackTransaction();
        return {
          status: 404,
          message: "User not found",
        };
      }
      const { password_hash, ...safeUser } = updatedUser;
      await queryRunner.commitTransaction();
      return {
        status: 200,
        data: safeUser,
        message: "User updated successfully",
      };
    } catch (error) {
      console.error(error);
      await queryRunner.rollbackTransaction();
      return {
        status: 500,
        message: "Error updating user profile",
      };
    } finally {
      await queryRunner.release();
    }
  }

  async activeDeactive(
    org_id: number,
    user_id: number,
    params: activeDeactiveI
  ): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();

      const existingUser = await userQuery.getUserByIdAllStatus(
        queryRunner.manager,
        org_id,
        params.id
      );
      if (!existingUser) {
        await queryRunner.rollbackTransaction();
        return {
          status: 404,
          message: "User not found",
        };
      }

      if (!params.status) {
        await userTokenQuery.deleteUserTokens(queryRunner.manager, params.id);
      }

      await userQuery.activeDeactiveUser(
        queryRunner.manager,
        org_id,
        params.id,
        params.status,
        user_id
      );

      await queryRunner.commitTransaction();

      return {
        status: 200,
        message: "User status successfully updated.",
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        status: 500,
        message:
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Error creating user profile",
      };
    } finally {
      await queryRunner.release();
    }
  }

  async updateProfile(
    org_id: number,
    user_id: number,
    updateData: any
  ): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    if (!org_id || !user_id) {
      return {
        status: 400,
        message: "Invalid organization or user ID",
      };
    }

    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();

    try {
      await queryRunner.startTransaction();
      const existingUser = await userQuery.getUserById(
        queryRunner.manager,
        org_id,
        user_id
      );

      if (!existingUser) {
        await queryRunner.rollbackTransaction();
        return {
          status: 404,
          message: "User not found",
        };
      }
      let updatedAddress;
      if (updateData.address) {
        const addressData = updateData.address;

        const hasAddressFields = Object.values(addressData).some(
          (value) => value !== undefined && value !== null
        );

        if (existingUser.address_id) {
          await addressQuery.updateAddress(
            queryRunner.manager,
            existingUser.address_id,
            addressData,
            org_id
          );
          updatedAddress = await addressQuery.getAddressById(
            queryRunner.manager,
            existingUser.address_id
          );
        } else if (hasAddressFields) {
          let coords = {
            latitude: addressData.latitude,
            longitude: addressData.longitude,
          };
          if (!addressData.latitude || !addressData.longitude) {
            coords = await geocodingService.getCoordinates({
              street_address: addressData.street_address,
              postal_code: addressData.postal_code,
              subregion: addressData.subregion,
              region: addressData.region,
              city: addressData.city,
              state: addressData.state,
              country: addressData.country || "Finland",
            });
          }
          const newAddressData: AddressDto = {
            street_address: addressData.street_address || "",
            postal_code: addressData.postal_code || "",
            area_name: addressData.area_name || "",
            subregion: addressData.subregion || "",
            region: addressData.region || "",
            country: addressData.country || "",
            org_id: org_id,
            city: addressData.city || "",
            latitude: coords.latitude,
            longitude: coords.longitude,
            state: addressData.state || "",
            comments: addressData.comments || "",
          };

          updatedAddress = await addressQuery.createAddress(
            queryRunner.manager,
            newAddressData,
            org_id
          );

          if (updatedAddress?.address_id) {
            updateData.address_id = updatedAddress.address_id;
            await territoryService.autoAssignTerritory(
              updatedAddress.address_id,
              org_id,queryRunner
            );
          }
        }

        delete updateData.address;
      }
      const { role_name, ...updatedFields } = updateData;
      const updatedUser = await userQuery.updateUser(
        queryRunner.manager,
        org_id,
        user_id,
        updatedFields
      );

      if (!updatedUser) {
        await queryRunner.rollbackTransaction();
        return {
          status: 404,
          message: "Failed to update user",
        };
      }
      const { password_hash, ...safeUser } = updatedUser;

      await queryRunner.commitTransaction();
      return {
        status: 200,
        data: safeUser,
        message: "User updated successfully",
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error updating user profile:", error);
      return {
        status: 500,
        message: "Error updating user profile",
      };
    } finally {
      await queryRunner.release();
    }
  }
}
