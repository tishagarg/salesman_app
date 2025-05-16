import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Role } from "./Role.entity";
import { Permission } from "./Permission.entity";
import { Organization } from "./Organisation.entity";
@Entity("role_permission")
export class RolePermission {
  @PrimaryGeneratedColumn({ type: "int" })
  role_permission_id: number;

  @Column({ type: "int" })
  role_id: number;

  @Column({ type: "int" })
  permission_id: number;
  @Column({ type: "int" })
  org_id: number;
  @Column({ type: "boolean", default: true })
  is_active: boolean;
  @Column({ type: "char", length: 36, nullable: true })
  created_by: string;

  @Column({ type: "char", length: 36, nullable: true })
  updated_by: string;

 @CreateDateColumn() created_at: Date;

  @UpdateDateColumn() updated_at: Date;

  @ManyToOne(() => Role, { onDelete: "SET NULL" })
  @JoinColumn({ name: "role_id" })
  role: Role;

  @ManyToOne(() => Permission, { onDelete: "SET NULL" })
  @JoinColumn({ name: "permission_id" })
  permission: Permission;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "org_id" })
  organization: Organization;
}
