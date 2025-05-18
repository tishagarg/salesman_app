import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("region")
export class Region {
  @PrimaryGeneratedColumn()
  region_id: number;

  @Column({ unique: true })
  name: string;

  @Column({ default: true })
  is_active: boolean;

  @Column()
  created_by: string;

  @Column()
  updated_by: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updated_at: Date;
}