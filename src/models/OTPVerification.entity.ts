import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User.entity";
import { OtpType } from "../enum/otpType";
import { OtpMedium } from "../enum/otpMedium";

@Entity("otp_verification")
@Index("idx_user_id", ["user_id"])
@Index("idx_otp", ["otp"])
export class OtpVerification {
  @PrimaryGeneratedColumn()
  otp_id: number;

  @Column({ type: "int" })
  user_id: number;
  @ManyToOne(() => User, (user) => user.user_id)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "varchar", length: 500 })
  otp: string;

  @Column({
    type: "enum",
    enum: OtpType,
    default:OtpType.NULL,
    enumName: "otp_verification_otp_type_enum",
  })
  otp_type: OtpType;
  @Column({
    type: "enum",
    enum: OtpMedium,
    enumName: "otp_verification_medium_enum",
    default: OtpMedium.EMAIL,
  })
  medium: OtpMedium;

  @Column({ type: "boolean", default: false })
  is_used: boolean;

  @Column({ type: "timestamp" })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
  @Column({ type: "char", length: 36, nullable: true })
  created_by: string;

  @Column({ type: "char", length: 36, nullable: true })
  updated_by: string;
}
