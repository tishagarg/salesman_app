import { EntityManager } from "typeorm";
import { OtpVerification } from "../models/OTPVerification.entity";
import { getDataSource } from "../config/data-source";
import { IOtpResponse } from "../interfaces/user.interface";
import { OtpType } from "../enum/otpType";

export class OtpQuery {
  async deleteOtp(id: number, otp_type: OtpType, manager?: EntityManager): Promise<void> {
    const dataSource = manager ? null : await getDataSource();
    const repository = manager
      ? manager.getRepository(OtpVerification)
      : dataSource!.getRepository(OtpVerification);
    await repository.delete({ otp_id: id, otp_type });
  }

  async findById(id: number, manager?: EntityManager): Promise<IOtpResponse | null> {
    const dataSource = manager ? null : await getDataSource();
    const repository = manager
      ? manager.getRepository(OtpVerification)
      : dataSource!.getRepository(OtpVerification);
    const dbUser = await repository.findOneBy({ user_id: id });
    return dbUser;
  }

  async saveOtp(param: Partial<IOtpResponse>, manager?: EntityManager): Promise<IOtpResponse> {
    const dataSource = manager ? null : await getDataSource();
    const repository = manager
      ? manager.getRepository(OtpVerification)
      : dataSource!.getRepository(OtpVerification);
    const saved = await repository.save(param);
    return saved;
  }

  async findByUserIdAndType(
    user_id: number,
    otp_type: OtpType,
    manager?: EntityManager
  ): Promise<IOtpResponse | null> {
    const dataSource = manager ? null : await getDataSource();
    const repository = manager
      ? manager.getRepository(OtpVerification)
      : dataSource!.getRepository(OtpVerification);
    const dbUser = await repository.findOneBy({ user_id, otp_type });
    return dbUser;
  }
}