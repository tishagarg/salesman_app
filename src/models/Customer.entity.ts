import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { CustomerStatus } from "../enum/customerStatus";
import { User } from "./User.entity";
import { Address } from "./Address.entity";

// Entities
@Entity("customer")
export class Customer {
  @PrimaryGeneratedColumn()
  customer_id: number;

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
    enum: CustomerStatus,
    default: CustomerStatus.Prospect,
  })
  status: CustomerStatus;

  @Column({ type: "int", nullable: true })
  territory_id: number;

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
}
