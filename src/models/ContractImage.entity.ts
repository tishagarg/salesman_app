import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Contract } from "./Contracts.entity";

@Entity("contract_images")
export class ContractImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  contract_id: number;

  @ManyToOne(() => Contract, (contract) => contract.images, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "contract_id" })
  contract: Contract;

  @Column("jsonb", { nullable: true })
  metadata: Record<string, any>; // better typed and optional

  @Column("text")
  image_url: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  uploaded_at: Date;
}
