import { UserQuery } from "../query/user.query";
import dataSource from "../config/data-source";
import bcrypt from "bcrypt";
import httpStatusCodes from "http-status-codes";

const SALT_ROUNDS = 10;
import { generatePassword } from "../config/passwordGenerator";
import { RoleQuery } from "../query/role.query";
import { activeDeactiveI, ITeamMember } from "../interfaces/user.interface";
import { UserTokenQuery } from "../query/usertoken.query";
import { sendEmail } from "./email.service";
import { OrganizationQuery } from "../query/organization.query";
import { Roles } from "../enum/roles";
import { Address } from "../models/Address.entity";
import { AddressQuery } from "../query/address.query";
import { AddressDto } from "../interfaces/common.interface";
import { TerritoryService } from "./territory.service";

const userQuery = new UserQuery();
const roleQuery = new RoleQuery();
const userTokenQuery = new UserTokenQuery();
const organizationQuery = new OrganizationQuery();
const addressQuery = new AddressQuery();
const territoryService = new TerritoryService();

export class UserTeamService {
  async SendEmailNotification(email: string, password: string) {
    await sendEmail({
      to: email,
      subject: "Login Credentials",
      body: `Your password is ${password} and email is ${email}. Please reset your password after login.`,
    });
  }
  async getSalesRepresentative(
    org_id: number,
    pagination: { limit: number; skip: number; search: string }
  ): Promise<{
    status: number;
    data?: any;
    message: string;
    total: number;
  }> {
    const queryRunner = dataSource.createQueryRunner();
    queryRunner.startTransaction();
    try {
      const [salesRep, total] = await userQuery.getAllUsersWithRoleName(
        queryRunner.manager,
        org_id,
        Roles.SALES_REP,
        pagination.limit,
        pagination.skip,
        pagination.search
      );
      await queryRunner.commitTransaction();

      return {
        status: 200,
        data: salesRep.map((val) => {
          let { password_hash, ...safeUser } = val;
          return safeUser;
        }),
        total,
        message: "Users fetched successfully",
      };
    } catch (error) {
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: "An error occurred while fetching user data.",
        data: null,
        total: 0,
      };
    }
  }
  async getUserById(userId: number): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const queryRunner = dataSource.createQueryRunner();

    try {
      await queryRunner.startTransaction();
      // const user = await userQuery.findById(queryRunner.manager, userId);
      const getUserByIdWithOrganization =
        await organizationQuery.getUserByIdWithOrganization(
          queryRunner.manager,
          userId
        );

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
        full_name: params.full_name,
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
    pagination: { page: number; limit: number; skip: number; search: string }
  ): Promise<{
    status: number;
    data?: any;
    total?: number;
    message: string;
  }> {
    const queryRunner = dataSource.createQueryRunner();

    try {
      await queryRunner.startTransaction();
      const [users, total] = await userQuery.getAllUsersWithRoles(
        queryRunner.manager,
        org_id,
        pagination.limit,
        pagination.skip,
        pagination.search
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
    const queryRunner = dataSource.createQueryRunner();
    try {
      await queryRunner.startTransaction();

      // Check if user exists
      const existingUser = await userQuery.getUserById(
        queryRunner.manager,
        org_id,
        user_id
      );
      console;

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

      updateData.full_name = `${updateData.first_name} ${updateData.last_name}`;

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
          const newAddressData: AddressDto = {
            street_address: addressData.street_address || "",
            postal_code: addressData.postal_code || "",
            area_name: addressData.area_name || "",
            subregion: addressData.subregion || "",
            region: addressData.region || "",
            country: addressData.country || "",
            org_id: org_id,
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
              org_id
            );
          }
        }

        delete updateData.address;
      }
      if (updateData.first_name || updateData.last_name) {
        updateData.full_name = `${
          updateData.first_name || existingUser.first_name
        } ${updateData.last_name || existingUser.last_name}`.trim();
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
        message: `Error updating user profiler"
        }`,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
