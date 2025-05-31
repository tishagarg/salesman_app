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
import { Polygon } from "./Polygon.entity";
import { Organization } from "./Organisation.entity";

@Entity("territory")
export class Territory {
  @PrimaryGeneratedColumn()
  territory_id: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  postal_codes: string; // JSON string of postal codes

  @Column({ type: "text", nullable: true })
  subregions: string; // JSON string of subregions
  
  @Column({ type: "text", nullable: true })
  regions: string; 
  @Column({ type: "int", nullable: true })
  polygon_id: number | undefined;
  @Column({ type: "int", nullable: true })
  manager_id: number |undefined;

  @Column({ type: "int", nullable: true })
  org_id: number;

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
  @JoinColumn({ name: "manager_id" })
  manager: User;
  @ManyToOne(() => Polygon, { onDelete: "SET NULL" })
  @JoinColumn({ name: "polygon_id" })
  polygon: Polygon;
  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "org_id" })
  organization: Organization;
}
