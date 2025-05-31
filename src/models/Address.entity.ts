import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Territory } from "./Territory.entity";
import { Organization } from "./Organisation.entity";
import { Polygon } from "./Polygon.entity";

@Entity("address")
@Index("unique_address", ["postal_code", "street_address", "subregion"], {
  unique: true,
})
export class Address {
  @PrimaryGeneratedColumn()
  address_id: number;

  @Column({ type: "varchar", length: 255 })
  street_address: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  building_unit: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  landmark: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  city: string;
  @Column({ type: "varchar", length: 100, nullable: true })
  state: string;

  @Column({ type: "varchar", length: 6 })
  postal_code: string;

  @Column({ type: "varchar", length: 100 })
  area_name: string;

  @Column({ type: "varchar", length: 100 })
  subregion: string;

  @Column({ type: "varchar", length: 100 })
  region: string;

  @Column({ type: "varchar", length: 100, default: "Finland" })
  country: string;

  @Column({ type: "float" })
  latitude: number;

  @Column({ type: "float" })
  longitude: number;
  @Column({ type: "text", nullable: true })
  comments: string;
  @Column({ type: "int", nullable: true })
  territory_id: number;

  @Column({ type: "int", nullable: true })
  polygon_id: number | undefined;

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

  @ManyToOne(() => Territory, { onDelete: "SET NULL" })
  @JoinColumn({ name: "territory_id" })
  territory: Territory;

  @ManyToOne(() => Polygon, { onDelete: "SET NULL" })
  @JoinColumn({ name: "polygon_id" })
  polygon: Polygon;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "org_id" })
  organization: Organization;
}
