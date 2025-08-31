import crypto from "crypto";
import { OtpQuery } from "../query/otp.query";
import {
  IgenerateSaveAndSendOtp,
  IOtpBody,
  IOtpResponse,
  ISaveOtp,
} from "../interfaces/user.interface";
import { UserQuery } from "../query/user.query";
import { getDataSource } from "../config/data-source"; // Updated import
import httpStatusCodes from "http-status-codes";
import { OtpType } from "../enum/otpType";
import { User } from "../models/User.entity";
import { OtpVerification } from "../models/OTPVerification.entity";
import { EntityManager } from "typeorm";
import { getFinnishTime } from "../utils/timezone";
import { sendEmail } from "./email.service";

const otpQuery = new OtpQuery();
const userQuery = new UserQuery();

export class OtpService {
  async generateOtp(): Promise<string> {
    return crypto.randomInt(100000, 999999).toString();
  }

  async generateSaveAndSendOtp(
    userId: number,
    params: IgenerateSaveAndSendOtp
  ): Promise<IOtpResponse> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const otp = await this.generateOtp();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const otpData: Partial<IOtpResponse> = {
        otp,
        user_id: userId,
        is_used: false,
        otp_type: params.otp_type,
        medium: params.medium,
        expires_at: expiresAt,
        created_at: getFinnishTime(),
        updated_at: getFinnishTime(),
      };
      const existingOtp = await otpQuery.findByUserIdAndType(
        userId,
        params.otp_type,
        queryRunner.manager
      );

      if (
        existingOtp &&
        existingOtp.medium === params.medium &&
        existingOtp.otp_type === params.otp_type &&
        !existingOtp.is_used &&
        existingOtp.expires_at > getFinnishTime()
      ) {
        otpData.otp_id = existingOtp.otp_id;
        otpData.is_used = existingOtp.is_used;
        otpData.expires_at = existingOtp.expires_at;
        otpData.created_at = existingOtp.created_at;
        otpData.updated_at = getFinnishTime();
      }

      const savedOtp = await otpQuery.saveOtp(otpData, queryRunner.manager);

      await this.SendEmailNotification(params.email, otp);

      await queryRunner.commitTransaction();
      return savedOtp;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error generating and saving OTP:", error);
      throw new Error("Failed to generate OTP");
    } finally {
      await queryRunner.release();
    }
  }

  async SendEmailNotification(email: string, otp: string) {
    await sendEmail({
      to: email,
      subject: "Email Verification",
      body: `Your OTP is ${otp} and it is valid for 5 minutes.`,
    });
  }

  async resendOtp(params: IOtpBody): Promise<{
    status: number;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const user = await userQuery.findByEmailAndId(
        params.email,
        params.id,
        queryRunner.manager
      );
      if (!user) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "User not found",
        };
      }
      if (user.is_email_verified) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "Email already verified",
        };
      }

      const otpData = await otpQuery.findById(
        user.user_id,
        queryRunner.manager
      );
      if (!otpData) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "No OTP found for this user",
        };
      }

      const newOtp = await this.generateOtp();
      otpData.otp = newOtp;
      otpData.expires_at = new Date(Date.now() + 5 * 60 * 1000);
      otpData.created_at = getFinnishTime();
      otpData.updated_at = getFinnishTime();
      await otpQuery.saveOtp(otpData, queryRunner.manager); // Pass manager

      await this.SendEmailNotification(params.email, newOtp);
      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        message: `OTP resent to ${params.email}`,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.BAD_REQUEST,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      await queryRunner.release();
    }
  }

  async verifyOtp(
    userId: number,
    otp: string,
    otp_type: OtpType
  ): Promise<boolean> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const otpData = await queryRunner.manager.findOne(OtpVerification, {
        where: { user_id: userId, otp_type: otp_type, otp },
      });

      if (!otpData) {
        await queryRunner.rollbackTransaction();
        return false;
      }
      const isOtpValid =
        otpData.otp === otp &&
        otpData.is_used === false &&
        otpData.expires_at > getFinnishTime();
      if (isOtpValid) {
        await queryRunner.manager.update(User, userId, {
          is_email_verified: 1,
          is_active: true,
        });
        await queryRunner.manager.delete(OtpVerification, otpData.otp_id);
        await queryRunner.commitTransaction();
      } else {
        await queryRunner.rollbackTransaction();
      }

      return isOtpValid;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return false;
    } finally {
      await queryRunner.release();
    }
  }

  async saveOtpOrLink(
    manager: EntityManager,
    params: ISaveOtp
  ): Promise<IOtpResponse> {
    try {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const otpData: Partial<IOtpResponse> = {
        otp: params.otp,
        user_id: params.user_id,
        is_used: false,
        otp_type: params.otp_type,
        medium: params.medium,
        expires_at: expiresAt,
        created_at: getFinnishTime(),
        updated_at: getFinnishTime(),
      };
      const existingOtp = await otpQuery.findByUserIdAndType(
        params.user_id,
        params.otp_type,
        manager
      );

      if (
        existingOtp &&
        existingOtp.medium === params.medium &&
        existingOtp.otp_type === params.otp_type &&
        !existingOtp.is_used &&
        existingOtp.expires_at > getFinnishTime()
      ) {
        otpData.otp_id = existingOtp.otp_id;
        otpData.is_used = existingOtp.is_used;
        otpData.expires_at = existingOtp.expires_at;
        otpData.created_at = existingOtp.created_at;
        otpData.updated_at = getFinnishTime();
      }

      const savedOtp = await otpQuery.saveOtp(otpData, manager);
      return savedOtp;
    } catch (error: any) {
      console.error("Error saving OTP:", error);
      throw new Error("Failed to save OTP");
    }
  }
}
