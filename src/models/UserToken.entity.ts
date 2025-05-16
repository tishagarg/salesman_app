import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User.entity";
@Entity("user_token")
export class UserToken {
  @PrimaryColumn({ type: "varchar", length: 500 })
  user_token_id: string;

  @Column({ type: "int", nullable: true })
  user_id: number;

  @Column({ type: "int", nullable: true })
  ttl: number;

  @Column({ type: "varchar", length: 50, nullable: true })
  scopes: string;

  @Column({ type: "varchar", nullable: true })
  status: number;
  @Column({ type: "char", length: 36, nullable: true })
  created_by: string;

  @Column({ type: "char", length: 36, nullable: true })
  updated_by: string;
  @CreateDateColumn() created_at: Date;

  @UpdateDateColumn() updated_at: Date;

  @ManyToOne(() => User, { cascade: true })
  @JoinColumn({ name: "user_id" })
  organization: User;

  @Column({ type: "boolean", default: true })
  is_active: boolean;
}
