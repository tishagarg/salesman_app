import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User.entity";

@Entity("audit_log")
export class AuditLog {
  @PrimaryGeneratedColumn()
  audit_id: number;

  @Column({ type: "int" })
  user_id: number;

  @Column({ type: "varchar", length: 255 })
  action: string;

  @Column({ type: "text", nullable: true })
  details: string;

  @Column({ type: "char", length: 36, nullable: true })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user: User;
}