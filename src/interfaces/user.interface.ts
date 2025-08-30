import { OtpMedium } from "../enum/otpMedium";
import { OtpType } from "../enum/otpType";
import { Roles } from "../enum/roles";
import { Organization } from "../models/Organisation.entity";
import { Address } from "../models/Address.entity";

export interface ILoginUser {
  email: string;
  password: string;
}

export interface IUpdateUser {
  id: number;
  email?: string;
  full_name?: string;
  company_name?: string;
  role_id?: number;
  industry_id?: number;
  is_email_verified?: number;
  is_active?: number;
  google_oauth_id?: string;
  password_hash?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface IGoogleAuthUser {
  googleId: string;
  email: string;
  full_name?: string | null;
}

export interface IgoogleLoginBody {
  idToken: string;
}

export interface IloginResponse {
  token: string;
  refreshToken?: string ;
  user: any;
  organization: Organization | null;
}

export interface ISignUpResponse {
  token: string;
  user: {
    email: string;
  };
}
export interface IgenerateSaveAndSendOtp {
  email: string;
  otp_type: OtpType;
  medium: OtpMedium;
}

export interface IOtpBody {
  email: string;
  id: number;
  otp_type: OtpType;
  medium: OtpMedium;
}

export interface IUser {
  user_id: number;
  email: string;
  google_oauth_id: string;
  is_email_verified: number;
  full_name: string;
  org_id: number;
  role_id: number;
  is_admin: number;
  is_active: boolean;
  created_by: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}
export interface IOtpVerifyBody {
  otp: string;
}

export interface IgoogleCallbackParams {
  email: string;
  id: number;
  is_email_verified: number;
  full_name: string;
}

export interface IverifyOTPParams {
  id: number;
  otp: string;
  otp_type: OtpType;
  medium: OtpMedium;
}

export interface publishEmailEventParams {
  to: string;
  subject: string;
  body: string;
}

export interface IsaveTokenParams {
  id: string;
  userId: number;
  ttl: number;
  scopes: string;
  status: number;
  active: number;
}

export interface ISignupParams {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_no: string;
  org_name: string;
}

export interface ISaveUserParams {
  email: string;
  google_oauth_id?: string;
  is_email_verified?: number;
  full_name?: string;
}

export interface IJwtVerify {
  user_id: number;
  org_id: number;
  email: string;
  role_id?: number;
  is_super_admin?: boolean;
  is_admin?: boolean;
  iat?: number; // Issued at (seconds since Unix epoch)
  exp?: number; // Expiration time (seconds since Unix epoch)
}
export interface ISaveOtp {
  otp: string;
  email: string;
  otp_type: OtpType;
  medium: OtpMedium;
  user_id: number;
}

export interface ILoginUser {
  email: string;
  password: string;
}

export interface IGoogleAuthUser {
  googleId: string;
  email: string;
  full_name?: string | null;
}

export interface IgoogleLoginBody {
  idToken: string;
}

export interface IloginResponse {
  // user: IUser | any;
  // organization: Organization;
}

export interface ISignUpResponse {
  token: string;
  user: {
    email: string;
  };
}
export interface IOtpBody {
  email: string;
  otp_type: OtpType;
  medium: OtpMedium;
}
export interface IOtpResponse {
  otp: string;
  expires_at: Date;
  is_used: boolean;
  medium: OtpMedium;
  created_at: Date;
  otp_type: OtpType;
  updated_at: Date;
  user_id: number;
  otp_id: number;
}
export interface IOtpVerifyBody {
  email: string;
  otp: string;
  otp_type: OtpType;
  expires_at: Date;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
  user_id: number;
  id: number;
}

export interface IgoogleCallbackParams {
  email: string;
  id: number;
  is_email_verified: number;
  full_name: string;
}

export interface publishEmailEventParams {
  to: string;
  subject: string;
  body: string;
}

export interface IProfileData {
  full_name?: string;
  company_name?: string;
  role_id?: number;
  industry_id?: number;
}


export interface IUserProfile {
  fullName: string;
  first_name: string;
  last_name: string;
  phone_no: string;
  org_id: number;
  user_id: number;
  email: string;
  address?: Address;
}

export interface IRegion {
  org_id: number;
  region_id: number;
  name: string;
  code: string;
  is_active: boolean;
  created_by: string;
  updated_by: string;
}

export interface ITeamMember {
  role_name: Roles;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role_id: number;
}

export interface ITeamMemberBody {
  role_name: Roles;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role_id: number;
}

export interface activeDeactiveI {
  status: boolean;
  id: number;
}
