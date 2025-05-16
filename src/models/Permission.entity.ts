import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
@Entity("permission")
export class Permission {
  @PrimaryGeneratedColumn({ type: "int" })
  permission_id: number;

  @Column({ type: "varchar", length: 50, nullable: false })
  permission_name: string;

  @Column({ type: "text", nullable: true })
  description: string;
  @Column({ type: "boolean", default: true })
  is_active: boolean;
  @Column({ type: "char", length: 36, nullable: true })
  created_by: string;

  @Column({ type: "char", length: 36, nullable: true })
  updated_by: string;

  @CreateDateColumn({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({
    type: "datetime",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updated_at: Date;
}
