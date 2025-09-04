import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { User } from "./User.entity";

@Entity("contract_templates")
export class ContractTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "varchar", default: "active" })
  status: string;

  @Column({ type: "json", nullable: true })
  dropdown_fields: {
    [fieldName: string]: {
      label: string;
      options: Array<{
        label: string;
        value: string;
      }>;
      required?: boolean;
      placeholder?: string;
    };
  };

  @ManyToMany(() => User)
  @JoinTable({
    name: "contract_template_managers",
    joinColumn: { name: "contract_template_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "manager_id", referencedColumnName: "user_id" },
  })
  assigned_managers: User[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
