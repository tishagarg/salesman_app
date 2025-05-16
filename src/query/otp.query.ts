import { OtpVerification } from "../models";
import dataSource from "../config/data-source";
import {
  IOtpResponse,
} from "../interfaces/user.interface";
import { OtpType } from "../enum/otpType";
export class OtpQuery {
  async deleteOtp(id: number, otp_type: OtpType): Promise<void> {
    await dataSource.getRepository(OtpVerification).delete({ otp_id:id, otp_type });
  }

  async findById(id: number): Promise<IOtpResponse | null> {
    const dbUser = await dataSource
      .getRepository(OtpVerification)
      .findOneBy({ user_id: id });
    return dbUser;
  }
  async saveOtp(param: Partial<IOtpResponse>): Promise<IOtpResponse> {
    const saved = await dataSource.getRepository(OtpVerification).save(param);
    return saved;
  }
  async findByUserIdAndType(
    user_id: number,
    otp_type: OtpType
  ): Promise<IOtpResponse | null> {
    const dbUser = await dataSource
      .getRepository(OtpVerification)
      .findOneBy({ user_id, otp_type });
    return dbUser;
  }
}
