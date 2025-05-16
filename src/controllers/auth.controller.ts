import { Request, Response } from "express";
import { OtpService } from "../service/otp.service";
import {
  ILoginUser,
  IOtpBody,
  IOtpVerifyBody,
  ISignupParams,
} from "../interfaces/user.interface";
import { ApiResponse } from "../utils/api.response";

import { AuthService } from "../service/auth.service";
import { OtpMedium } from "../enum/otpMedium";
import { OtpType } from "../enum/otpType";
import { ok } from "assert";
const authService = new AuthService();
const otpService = new OtpService();
export class AuthController {
  async login(req: Request, res: Response) {
    const { email, password }: ILoginUser = req.body;
    const response = await authService.login({ email, password });
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }
    return ApiResponse.result(
      res,
      response.data ?? null,
      response.status,
      null,
      response.message
    );
  }

  async google(req: Request, res: Response) {
    const { idToken } = req.body;

    const response = await authService.google(idToken);
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }
    return ApiResponse.result(
      res,
      response.data ?? null,
      response.status,
      null,
      response.message
    );
  }

  async signup(req: Request, res: Response) {
    const params: ISignupParams = {
      email: req.body.email,
      password: req.body.password,
      first_name:req.body.first_name,
      last_name:req.body.last_name,
      org_name:req.body.org_name,
      phone_no:req.body.phone_no,
    };
    const response = await authService.signup(params);
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }
    return ApiResponse.result(
      res,
      response.data ?? null,
      response.status,
      null,
      response.message
    );
  }

  async verifyOTP(req: any, res: Response) {
    let { user_id } = req.user;
    const { otp }: IOtpVerifyBody = req.body;
    const response = await authService.verifyOTP({
      id: user_id,
      otp,
      otp_type: OtpType.EMAIL_VERIFICATION,
      medium: OtpMedium.EMAIL,
    });
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }
    return ApiResponse.result(
      res,
      response.data ?? null,
      response.status,
      null,
      response.message
    );
  }

  async resendOTP(req: any, res: Response) {
    let { id, email } = req.user;
    const params: IOtpBody = {
      email: email,
      id,
      otp_type: OtpType.EMAIL_VERIFICATION,
      medium: OtpMedium.EMAIL,
    };

    const response = await otpService.resendOtp(params);
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }
    return ApiResponse.result(
      res,
      null,
      response.status,
      null,
      response.message
    );
  }

  async logout(req: any, res: Response) {
    let { token } = req.user;
    const response = await authService.logout(token);
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }
    return ApiResponse.result(
      res,
      response.data ?? null,
      response.status,
      null,
      response.message
    );
  }
  async forgotPassword(req: any, res: Response) {
    const { email } = req.body;
    const response = await authService.forgotPassword(email);
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }
    return ApiResponse.result(
      res,
      response.data ?? null,
      response.status,
      null,
      response.message
    );
  }

  async resetPassword(req: any, res: Response) {
    const { token, oldPassword, newPassword } = req.body;
    const { org_id } = req.user;
    const response = await authService.resetPassword({
      token,
      oldPassword,
      newPassword,
      org_id,
    });

    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }
    return ApiResponse.result(
      res,
      response.data ?? null,
      response.status,
      null,
      response.message
    );
  }
}
