import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User.entity";

@Entity("manager_sales_rep")
export class ManagerSalesRep {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  manager_id: number;

  @Column({ type: "int" })
  sales_rep_id: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "manager_id" })
  manager: User;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sales_rep_id" })
  sales_rep: User;
}
