// src/models/Route.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User.entity";

@Entity("route")
export class Route {
  @PrimaryGeneratedColumn()
  route_id: number;

  @Column({ type: "int" })
  rep_id: number;

  @Column({ type: "date" })
  route_date: Date;

  @Column({ type: "json" }) // Store ordered list of customer IDs with metadata
  route_order: { customer_id: number; eta: string; distance: number }[];

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @Column({ type: "char", length: 36, nullable: true })
  created_by: string;

  @Column({ type: "char", length: 36, nullable: true })
  updated_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "rep_id" })
  rep: User;
}