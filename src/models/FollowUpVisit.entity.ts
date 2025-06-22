import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Visit } from "./Visits.entity";
import { FollowUp } from "./FollowUp.entity";

@Entity("follow_up_visit")
export class FollowUpVisit {
  @PrimaryGeneratedColumn()
  follow_up_visit_id: number;

  @Column({ type: "int" })
  follow_up_id: number;

  @Column({ type: "int" })
  visit_id: number;

  @ManyToOne(() => FollowUp, { onDelete: "CASCADE" })
  @JoinColumn({ name: "follow_up_id" })
  followUp: FollowUp;

  @ManyToOne(() => Visit, { onDelete: "CASCADE" })
  @JoinColumn({ name: "visit_id" })
  visit: Visit;

  @CreateDateColumn()
  created_at: Date;
}
