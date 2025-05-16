import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("address")
export class Address {
@PrimaryGeneratedColumn()
address_id: number;

@Column({ type: "varchar", length: 255 })
street_address: string;

@Column({ type: "varchar", length: 255, nullable: true })
building_unit?: string;

@Column({ type: "varchar", length: 255, nullable: true })
landmark?: string;

@Column({ type: "varchar", length: 20 })
postal_code: string;

@Column({ type: "varchar", length: 255, nullable: true })
area_region?: string;

@Column({ type: "varchar", length: 100 })
city: string;

@Column({ type: "varchar", length: 100 })
state: string;

@Column({ type: "varchar", length: 100 })
country: string;

@Column({ type: "float", nullable: true })
latitude?: number;

@Column({ type: "float", nullable: true })
longitude?: number;

@Column({ type: "int", nullable: true })
territory_id?: number;

@Column({ type: "int", nullable: true })
polygon_id?: number;

@Column({ type: "boolean", default: true })
is_active: boolean;

@Column({ type: "char", length: 36, nullable: true })
created_by: string;

@Column({ type: "char", length: 36, nullable: true })
updated_by: string;

@CreateDateColumn() created_at: Date;

  @UpdateDateColumn() updated_at: Date;
}
