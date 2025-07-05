import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User.entity";
import { Leads } from "./Leads.entity";
import { Contract } from "./Contracts.entity";
import { FollowUpVisit } from "./FollowUpVisit.entity";
import { LeadStatus } from "../enum/leadStatus";
@Entity("visit")
export class Visit {
  @PrimaryGeneratedColumn()
  visit_id: number;

  @Column({ type: "int" })
  lead_id: number;

  @Column({ type: "int" })
  rep_id: number;

  @Column({ type: "timestamp" })
  check_in_time: Date;

  @Column({ type: "timestamp", nullable: true })
  check_out_time: Date;

  @Column({ type: "float", nullable: true })
  latitude: number;

  @Column({ type: "float", nullable: true })
  longitude: number;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "jsonb", nullable: true })
  photo_urls: string[];
  @Column({ type: "timestamp", nullable: true })
  next_visit_date: Date;
  @Column({ type: "varchar", length: "500", nullable: true })
  action_required: string;

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

  @ManyToOne(() => Leads, { onDelete: "CASCADE" })
  @JoinColumn({ name: "lead_id" })
  lead: Leads;
  @OneToOne(() => Contract, (contract) => contract.visit, { cascade: true })
  contract: Contract;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "rep_id" })
  rep: User;
  @OneToMany(() => FollowUpVisit, (followUpVisit) => followUpVisit.visit)
  followUpVisits: FollowUpVisit[];
  @Column({ type: "varchar", nullable: true })
  status?: LeadStatus;
}
