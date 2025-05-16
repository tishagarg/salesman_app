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
  @Column({ type: "varchar", length: 50, nullable: false })
  role_name: string;

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
