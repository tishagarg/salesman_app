import { Organization } from "./Organisation.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Role } from "./Role.entity";
import { Address } from "./Address.entity";

@Entity("user")
@Index("idx_users_organization_id", ["org_id"])
export class User {
  @PrimaryGeneratedColumn()
  user_id: number;

  @Column({ type: "varchar", length: 255, nullable: false, unique: true })
  email: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  password_hash: string;

  @Column({ type: "varchar", length: 15, nullable: true })
  phone: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  google_oauth_id: string;

  @Column({ type: "boolean", width: 1, default: false })
  is_email_verified: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  full_name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  first_name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  last_name: string;

  @Column({ type: "number", nullable: true })
  org_id: number;

  @Column({ type: "number", nullable: true })
  role_id: number;
  @Column({ type: "number", nullable: true })
  address_id: number;

  @Column({ type: "boolean", default: false })
  is_admin: number;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @Column({ type: "char", length: 36, nullable: true })
  created_by: string;

  @Column({ type: "char", length: 36, nullable: true })
  updated_by: string;

  @Column({ type: "boolean", default: false })
  is_super_admin: number;

  @CreateDateColumn() created_at: Date;

  @UpdateDateColumn() updated_at: Date;
  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  @JoinColumn({ name: "org_id" })
  organization: any;

  @ManyToOne(() => Address, { onDelete: "CASCADE" })
  @JoinColumn({ name: "address_id" })
  address: any;
  @ManyToOne(() => Role, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "role_id" })
  role: Role;
}
