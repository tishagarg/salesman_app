import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Territory } from "./Territory.entity";
import { User } from "./User.entity";

@Entity("territory_salesman")
export class TerritorySalesman {
  @PrimaryGeneratedColumn()
  territory_salesman_id: number;

  @Column({ type: "int" })
  territory_id: number;

  @Column({ type: "int" })
  salesman_id: number;

  @ManyToOne(() => Territory, { onDelete: "CASCADE" })
  @JoinColumn({ name: "territory_id" })
  territory: Territory;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "salesman_id" })
  salesman: User;
}