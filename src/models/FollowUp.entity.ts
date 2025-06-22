import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User.entity";

@Entity("follow_up")
export class FollowUp {
  @PrimaryGeneratedColumn()
  follow_up_id: number;

  @Column({ type: "varchar", length: 500 })
  subject: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "timestamp", nullable: true })
  scheduled_date: Date;

  @Column({ type: "boolean", default: false })
  is_completed: boolean;

  @Column({ type: "int", nullable: true })
  created_by: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "created_by" })
  createdBy: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
