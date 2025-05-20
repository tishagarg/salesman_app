import crypto from "crypto";
import { OtpQuery } from "../query/otp.query";
import {
  IgenerateSaveAndSendOtp,
  IOtpBody,
  IOtpResponse,
  ISaveOtp,
} from "../interfaces/user.interface";
import { UserQuery } from "../query/user.query";
import dataSource from "../config/data-source";
import httpStatusCodes from "http-status-codes";
import { OtpType } from "../enum/otpType";
import { OtpVerification, User } from "../models/index";
import { EntityManager } from "typeorm";
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
        created_at: new Date(),
        updated_at: new Date(),
      };
      const existingOtp = await otpQuery.findByUserIdAndType(
        userId,
        params.otp_type
      );

      if (
        existingOtp &&
        existingOtp.medium === params.medium &&
        existingOtp.otp_type === params.otp_type &&
        !existingOtp.is_used &&
        existingOtp.expires_at > new Date()
      ) {
        otpData.otp_id = existingOtp.otp_id;
        otpData.is_used = existingOtp.is_used;
        otpData.expires_at = existingOtp.expires_at;
        otpData.created_at = existingOtp.created_at;
        otpData.updated_at = new Date();
      }

      const savedOtp = await otpQuery.saveOtp(otpData);

      this.SendEmailNotification(params.email, otp);

      return savedOtp;
    } catch (error) {
      console.error("Error generating and saving OTP:", error);
      throw new Error("Failed to generate OTP");
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
    try {
      const user = await userQuery.findByEmailAndId(params.email, params.id);
      if (!user) {
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "User not found",
        };
      }
      if (user.is_email_verified) {
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "Email already verified",
        };
      }

      const otpData = await otpQuery.findById(user.user_id);
      if (!otpData) {
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "No OTP found for this user",
        };
      }
      const { otp, expires_at } = otpData;
      const currentTime = new Date();
      let OTP = otp;

      const newOtp = await this.generateOtp();
      otpData.otp = newOtp;
      otpData.expires_at = new Date(Date.now() + 5 * 60 * 1000);
      otpData.created_at = new Date();
      otpData.updated_at = new Date();
      otpQuery.saveOtp(otpData);
      OTP = newOtp;
      this.SendEmailNotification(params.email, OTP);
      return {
        status: httpStatusCodes.OK,
        message: `OTP resent to ${params.email}`,
      };
    } catch (error) {
      return {
        status: httpStatusCodes.BAD_REQUEST,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async verifyOtp(
    userId: number,
    otp: string,
    otp_type: OtpType
  ): Promise<boolean> {
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
        otpData.expires_at > new Date();
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
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const otpData: Partial<IOtpResponse> = {
      otp: params.otp,
      user_id: params.user_id,
      is_used: false,
      otp_type: params.otp_type,
      medium: params.medium,
      expires_at: expiresAt,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const existingOtp = await otpQuery.findByUserIdAndType(
      params.user_id,
      params.otp_type
    );

    if (
      existingOtp &&
      existingOtp.medium === params.medium &&
      existingOtp.otp_type === params.otp_type &&
      !existingOtp.is_used &&
      existingOtp.expires_at > new Date()
    ) {
      otpData.otp_id = existingOtp.otp_id;
      otpData.is_used = existingOtp.is_used;
      otpData.expires_at = existingOtp.expires_at;
      otpData.created_at = existingOtp.created_at;
      otpData.updated_at = new Date();
    }

    const savedOtp = await otpQuery.saveOtp(otpData);
    return savedOtp;
  }
  catch(error: any) {
    console.error("Error saving OTP:", error);
    throw new Error("Failed to save OTP");
  }
}
