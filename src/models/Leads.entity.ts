import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { LeadStatus } from "../enum/leadStatus";
import { User } from "./User.entity";
import { Address } from "./Address.entity";
import { Organization } from "./Organisation.entity";

// Entities
@Entity("leads")
export class Leads {
  @PrimaryGeneratedColumn()
  lead_id: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "int", nullable: true })
  address_id: number;

  @Column({ type: "int", nullable: true })
  assigned_rep_id: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  contact_name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  contact_email: string;

  @Column({ type: "varchar", length: 15, nullable: true })
  contact_phone: string;

  @Column({
    type: "enum",
    enum: LeadStatus,
    enumName: "lead_status_enum",
    default: LeadStatus.Prospect,
  })
  status: LeadStatus;

  @Column({ type: "int", nullable: true })
  territory_id: number | null;

  @Column({ type: "int", nullable: true })
  org_id: number;

  @Column({ type: "boolean", default: true })
  is_active: boolean;
  @Column({ type: "boolean", default: false })
  pending_assignment: boolean;

  @Column({ type: "char", length: 36, nullable: true })
  created_by: string;

  @Column({ type: "char", length: 36, nullable: true })
  updated_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "assigned_rep_id" })
  assigned_rep: User;

  @ManyToOne(() => Address, { onDelete: "SET NULL" })
  @JoinColumn({ name: "address_id" })
  address: Address;
  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "org_id" })
  organization: Organization;
}
