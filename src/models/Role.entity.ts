import { Roles } from "../enum/roles";
import { Organization } from "./Organisation.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
@Entity("role")
export class Role {
  @PrimaryGeneratedColumn({ type: "int" })
  role_id: number;

  @Column({ type: "number", nullable: true })
  org_id: number;
  @Column({ type: "enum", default: Roles.CUSTOMER , enumName: 'role_name_enum',})
  role_name: Roles;

  @Column({ type: "char", length: 36, nullable: true })
  created_by: string;

  @Column({ type: "char", length: 36, nullable: true })
  updated_by: string;

  @CreateDateColumn() created_at: Date;

  @UpdateDateColumn() updated_at: Date;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "org_id" })
  organization: Organization;
}
