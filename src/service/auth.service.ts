import {
  IloginResponse,
  ILoginUser,
  ISaveOtp,
  ISignupParams,
  IverifyOTPParams,
} from "../interfaces/user.interface";
import httpStatusCodes from "http-status-codes";
import { UserQuery } from "../query/user.query";
import { passwordCompare, passwordHash } from "../config/bcrypt";
import {
  generateRefreshToken,
  jwtSign,
  jwtVerify,
  verifyRefreshToken,
} from "../config/jwt";
import { OtpService } from "./otp.service";
import { UserTokenQuery } from "../query/usertoken.query";
import { OAuth2Client } from "google-auth-library";
import { getDataSource } from "../config/data-source"; // Updated import
import { OrganizationQuery } from "../query/organization.query";
import { OtpMedium } from "../enum/otpMedium";
import { OtpType } from "../enum/otpType";
import { User } from "../models/index";
import { RoleQuery } from "../query/role.query";
import { sendEmail } from "./email.service";
import { Roles } from "../enum/roles";
import { RefreshToken } from "../models/RefreshToken.entity";

const userQuery = new UserQuery();
const otpService = new OtpService();
const userTokenQuery = new UserTokenQuery();
const organizationQuery = new OrganizationQuery();
const roleQuery = new RoleQuery();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  ttl: number;
  constructor() {
    this.ttl = 2 * 24 * 60 * 60; // 2 days in seconds
  }

  private readonly refreshTokenTTL = 7 * 24 * 60 * 60; // 7 days in seconds

  // Helper method to save refresh token
  private async saveRefreshToken(
    manager: any,
    userId: number,
    refreshToken: string
  ) {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.refreshTokenTTL);

    const refreshTokenEntity = manager.getRepository(RefreshToken).create({
      user_id: userId,
      token: refreshToken,
      expires_at: expiresAt,
      created_at: new Date(),
    });

    return await manager.getRepository(RefreshToken).save(refreshTokenEntity);
  }

  async sendPasswordResetNotification(email: string, resetLink: string) {
    await sendEmail({
      to: email,
      subject: "Password Reset Request",
      body: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link will expire in 1 hour.</p>`,
    });
  }

  async login({ email, password }: ILoginUser): Promise<{
    status: number;
    data?: IloginResponse;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      if (!email || !password) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "Email and password are required",
        };
      }

      const user = await userQuery.findUserByEmail(queryRunner.manager, email);
      if (!user) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "User not found",
        };
      }

      if (!user.is_active) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.UNAUTHORIZED,
          message: "User inactive",
        };
      }

      const isPasswordValid = await passwordCompare(
        password,
        user.password_hash
      );
      if (!isPasswordValid) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.UNAUTHORIZED,
          message: "Invalid credentials",
        };
      }

      const token = jwtSign(
        user.user_id,
        user?.org_id,
        user.email,
        user.role_id,
        user.is_super_admin,
        user.is_admin
      );
      const existingToken = await userTokenQuery.findTokenById(
        queryRunner.manager,
        user.user_id
      );
      if (existingToken) {
        await userTokenQuery.deleteUserTokens(
          queryRunner.manager,
          user.user_id
        );
      }
      await userQuery.saveToken(queryRunner.manager, {
        id: token,
        userId: user.user_id,
        ttl: this.ttl,
        scopes: "user",
        status: 1,
        active: 1,
      });

      const existingRefreshToken = await dataSource
        .getRepository(RefreshToken)
        .findOne({ where: { user_id: user.user_id } });
      let refreshToken;
      if (!existingRefreshToken) {
        const newRefreshToken = await generateRefreshToken(user.user_id);
        const newTokenData = await this.saveRefreshToken(
          queryRunner.manager,
          user.user_id,
          newRefreshToken
        );
        refreshToken = newTokenData.token;
      } else {
        refreshToken = existingRefreshToken.token;
      }
      const getUserByIdWithOrganization =
        await organizationQuery.getUserByIdWithOrganization(
          queryRunner.manager,
          user.user_id
        );
      const { password_hash, ...safeUser } = getUserByIdWithOrganization;

      if (user.is_active && !user.is_email_verified) {
        await queryRunner.commitTransaction();
        await otpService.generateSaveAndSendOtp(user.user_id, {
          email: user.email,
          medium: OtpMedium.EMAIL,
          otp_type: OtpType.EMAIL_VERIFICATION,
        });

        return {
          status: httpStatusCodes.OK,
          data: {
            token,
            refreshToken,
            user: safeUser,
            organization: getUserByIdWithOrganization.organization,
          },
          message: "Email not verified",
        };
      }

      await queryRunner.commitTransaction();

      return {
        status: httpStatusCodes.OK,
        data: {
          token,
          refreshToken,
          user: safeUser,
          organization: getUserByIdWithOrganization.organization,
        },
        message: "Login successful",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: error?.message ? error?.message : "Internal server error",
      };
    } finally {
      await queryRunner.release();
    }
  }

  async google(idToken: string): Promise<{
    status: number;
    data?: IloginResponse;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (!payload) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "Invalid token payload",
        };
      }

      const {
        email,
        name,
        sub: googleId,
        picture: avatar,
        email_verified,
      } = payload;

      let user = await userQuery.findUserByGoogleId(
        queryRunner.manager,
        googleId
      );

      if (!user) {
        const existingUserByEmail = await userQuery.findUserByEmail(
          queryRunner.manager,
          email ? email : ""
        );

        if (existingUserByEmail) {
          await queryRunner.rollbackTransaction();
          return {
            status: httpStatusCodes.BAD_REQUEST,
            message: "Email is already registered",
          };
        }

        const newOrganization = await organizationQuery.saveOrganization(
          queryRunner.manager,
          null
        );

        user = queryRunner.manager.getRepository(User).create({
          google_oauth_id: googleId,
          email,
          full_name: name,
          is_email_verified: email_verified ? 1 : 0,
          org_id: newOrganization.org_id,
          is_admin: 1,
        });
        await queryRunner.manager.save(user);

        await organizationQuery.updateOrganization(
          queryRunner.manager,
          newOrganization.org_id,
          { owner_id: user.user_id }
        );

        if (!email_verified) {
          await otpService.generateSaveAndSendOtp(user.user_id, {
            email: user.email,
            medium: OtpMedium.EMAIL,
            otp_type: OtpType.EMAIL_VERIFICATION,
          });
        }
      }

      const token = jwtSign(
        user.user_id,
        user.org_id,
        user.email,
        undefined,
        user.is_super_admin,
        user.is_admin
      );
      const refreshToken = await generateRefreshToken(user.user_id);

      await this.saveRefreshToken(
        queryRunner.manager,
        user.user_id,
        refreshToken
      );

      await userQuery.saveToken(queryRunner.manager, {
        id: token,
        userId: user.user_id,
        ttl: this.ttl,
        scopes: "user",
        status: 1,
        active: 1,
      });

      const getUserByIdWithOrganization =
        await organizationQuery.getUserByIdWithOrganization(
          queryRunner.manager,
          user.user_id
        );

      const { password_hash, ...safeUser } = getUserByIdWithOrganization;

      await queryRunner.commitTransaction();

      return {
        status: httpStatusCodes.OK,
        data: {
          token,
          refreshToken,
          user: safeUser,
          organization: getUserByIdWithOrganization.organization,
        },
        message: "Login successful",
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.BAD_REQUEST,
        message: "Google authentication failed",
      };
    } finally {
      await queryRunner.release();
    }
  }

  async signup(param: ISignupParams): Promise<{
    status: number;
    data?: IloginResponse;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      if (
        !param.email ||
        !param.password ||
        !param.first_name ||
        !param.last_name ||
        !param.phone_no ||
        !param.org_name
      ) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "Missing required fields",
        };
      }

      const existingUser = await userQuery.findUserByEmail(
        queryRunner.manager,
        param.email
      );
      if (existingUser) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "Email is already registered",
        };
      }

      const passwordhash: string = await passwordHash(param.password);

      const newOrganization = await organizationQuery.saveOrganization(
        queryRunner.manager,
        param.org_name
      );
      let role_id;
      const role = await roleQuery.getRoleByNameAndOrgId(
        queryRunner.manager,
        Roles.ADMIN,
        null
      );
      if (role) {
        role_id = role.role_id;
      } else {
        const newRole = await roleQuery.saveRole(queryRunner.manager, {
          role_name: Roles.ADMIN,
          created_by: "system",
          org_id: undefined,
        });
        role_id = newRole.role_id;
      }

      const newUser = await userQuery.addUser(queryRunner.manager, {
        ...param,
        password_hash: passwordhash,
        org_id: newOrganization.org_id,
        is_admin: 1,
        phone: param.phone_no,
        full_name: "",
        role_id: role_id,
      });

      await organizationQuery.updateOrganization(
        queryRunner.manager,
        newOrganization.org_id,
        { owner_id: newUser.user_id }
      );

      await otpService.generateSaveAndSendOtp(newUser.user_id, {
        email: newUser.email,
        medium: OtpMedium.EMAIL,
        otp_type: OtpType.EMAIL_VERIFICATION,
      });

      const token = jwtSign(
        newUser.user_id,
        newOrganization.org_id,
        newUser.email,
        role_id,
        newUser.is_super_admin,
        newUser.is_admin
      );

      await userQuery.saveToken(queryRunner.manager, {
        id: token,
        userId: newUser.user_id,
        ttl: this.ttl,
        scopes: "user",
        status: 1,
        active: 1,
      });

      const getUserByIdWithOrganization =
        await organizationQuery.getUserByIdWithOrganization(
          queryRunner.manager,
          newUser.user_id
        );

      const { password_hash, ...safeUser } = getUserByIdWithOrganization;
      const refreshToken = await generateRefreshToken(newUser.user_id);
      await this.saveRefreshToken(
        queryRunner.manager,
        newUser.user_id,
        refreshToken
      );

      await queryRunner.commitTransaction();

      return {
        status: httpStatusCodes.CREATED,
        data: {
          token,
          refreshToken,
          user: safeUser,
          organization: getUserByIdWithOrganization.organization,
        },
        message: "User created, OTP sent successfully!!",
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
      };
    } finally {
      await queryRunner.release();
    }
  }

  async verifyOTP(params: IverifyOTPParams) {
    const dataSource = await getDataSource();
    try {
      const isVerified = await otpService.verifyOtp(
        params.id,
        params.otp,
        params.otp_type
      );
      if (!isVerified) {
        return {
          status: httpStatusCodes.INTERNAL_SERVER_ERROR,
          message: "Invalid or expired OTP",
        };
      }

      return {
        status: httpStatusCodes.OK,
        data: null,
        message: "Verify successful",
      };
    } catch (error) {
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
      };
    }
  }

  async logout(token: string) {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const payload = await jwtVerify(token);

      await userTokenQuery.deleteTokenFromDatabase(token);

      await queryRunner.manager.getRepository(RefreshToken).delete({
        user_id: payload.user_id,
      });

      await queryRunner.commitTransaction();

      return {
        status: 200,
        message: "Logout successful",
        data: null,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error during logout:", error);
      return {
        status: 500,
        message: "Internal server error during logout",
        data: null,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async forgotPassword(email: string): Promise<{
    status: number;
    data?: ISaveOtp | null;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();

    try {
      await queryRunner.startTransaction();
      const user = await userQuery.findByEmail(email);
      if (!user) {
        await queryRunner.rollbackTransaction();
        return { status: 404, message: "User not found", data: null };
      }
      if (!user.is_email_verified) {
        await queryRunner.rollbackTransaction();
        return { status: 404, message: "Email not verified", data: null };
      }
      const token = await jwtSign(
        user.user_id,
        user.org_id,
        email,
        user.role_id,
        user.is_super_admin,
        user.is_admin
      );
      const params = {
        otp: token,
        email: email,
        otp_type: OtpType.PASSWORD_RESET,
        medium: OtpMedium.EMAIL,
        user_id: user.user_id,
      };
      const userTokenData = await otpService.saveOtpOrLink(
        queryRunner.manager,
        params
      );
      if (!userTokenData) {
        await queryRunner.rollbackTransaction();
        return { status: 404, message: "User token not found", data: null };
      }
      const resetLink = `${
        process.env.FORNTEND_URL || "http://localhost:5700/"
      }?token=${token}`;
      await this.sendPasswordResetNotification(email, resetLink);
      await queryRunner.commitTransaction();
      return { status: 200, message: "Reset link sent to email", data: null };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return { status: 500, message: "Internal server error", data: null };
    } finally {
      await queryRunner.release();
    }
  }

  async resetPassword(
    {
      token,
      oldPassword,
      newPassword,
      org_id,
      user_id,
    }: {
      token?: string;
      oldPassword?: string;
      newPassword: string;
      org_id: number;
      user_id: number;
    },
    userFromSession?: any
  ) {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    let orgId;

    try {
      await queryRunner.startTransaction();

      let user;

      // Case 1: Reset via token link
      if (token) {
        try {
          const payload = await jwtVerify(token);
          const tokenData = await otpService.verifyOtp(
            payload.user_id,
            token,
            OtpType.PASSWORD_RESET
          );
          orgId = payload.org_id;
          if (!tokenData) {
            throw new Error("Invalid token or user not found");
          }

          user = await userQuery.findById(payload.user_id);
          if (!user) {
            await queryRunner.rollbackTransaction();
            return { status: 404, message: "User not found", data: null };
          }
          if (!user.is_email_verified) {
            await queryRunner.rollbackTransaction();
            return { status: 404, message: "Email not verified", data: null };
          }
        } catch (err) {
          await queryRunner.rollbackTransaction();
          return {
            status: 400,
            message: "Invalid or expired token",
            data: null,
          };
        }
      } else {
        // Case 2: Change password from profile using old password
        user = await userQuery.findById(user_id);
        orgId = org_id;
        if (!user) {
          await queryRunner.rollbackTransaction();
          return { status: 401, message: "Unauthorized", data: null };
        }

        const isMatch = await passwordCompare(oldPassword!, user.password_hash);
        if (!isMatch) {
          await queryRunner.rollbackTransaction();
          return { status: 400, message: "Incorrect old password", data: null };
        }
      }

      const hashedPassword = await passwordHash(newPassword);
      const updatedUser = await userQuery.updateUser(
        queryRunner.manager,
        orgId,
        user.user_id,
        {
          password_hash: hashedPassword,
        }
      );

      if (!updatedUser) {
        await queryRunner.rollbackTransaction();
        return { status: 400, message: "User update failed", data: null };
      }

      await queryRunner.commitTransaction();
      return {
        status: 200,
        message: "Password updated successfully",
        data: null,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        status: 500,
        message: "Internal server error",
        data: null,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async refreshToken(refreshToken: string): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const decoded = await verifyRefreshToken(refreshToken);

      const tokenRecord = await dataSource.manager
        .getRepository(RefreshToken)
        .findOneByOrFail({
          user_id: decoded.user_id,
          token: refreshToken,
        });
      if (!(tokenRecord && tokenRecord.expires_at > new Date())) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.INTERNAL_SERVER_ERROR,
          message: "Token not found or expired",
        };
      }
      const user = await queryRunner.manager.getRepository(User).findOne({
        where: { user_id: decoded.user_id },
      });

      if (!user) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "User not found",
        };
      }

      // Generate new access token
      const newAccessToken = jwtSign(
        user.user_id,
        user.org_id,
        user.email,
        user.role_id,
        user.is_super_admin,
        user.is_admin
      );

      const newRefreshToken = await generateRefreshToken(user.user_id);

      await this.saveRefreshToken(
        queryRunner.manager,
        user.user_id,
        newRefreshToken
      );

      await queryRunner.manager.getRepository(RefreshToken).delete({
        user_id: user.user_id,
        token: refreshToken,
      });

      await queryRunner.commitTransaction();

      return {
        status: httpStatusCodes.OK,
        data: {
          token: newAccessToken,
          refreshToken: newRefreshToken,
        },
        message: "Token refreshed successfully",
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
      };
    } finally {
      await queryRunner.release();
    }
  }
}