import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("organization")
export class Organization {
  @PrimaryGeneratedColumn()
  org_id: number;

  @Column({ type: "varchar", length: 255, nullable: false })
  org_name: string;

  @Column({ type: "int", nullable: true })
  owner_id: number;

  @Column({ type: "varchar", length: 255, nullable:true })
  logo_url: string;
  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @Column({ type: "char", length: 36, nullable: true })
  created_by: string;

  @Column({ type: "char", length: 36, nullable: true })
  updated_by: string;

  @CreateDateColumn() created_at: Date;

  @UpdateDateColumn() updated_at: Date;
}
