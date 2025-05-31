import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Territory } from "./Territory.entity";
import { Organization } from "./Organisation.entity";

@Entity("polygon")
export class Polygon {
  @PrimaryGeneratedColumn()
  polygon_id: number;

  @Column({ type: "jsonb" })
  geometry: { type: string; coordinates: number[][][] };

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "int", nullable: true })
  org_id: number;

  @Column({ type: "char", length: 36, nullable: true })
  created_by: string;

  @Column({ type: "char", length: 36, nullable: true })
  updated_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "org_id" })
  organization: Organization;
}
