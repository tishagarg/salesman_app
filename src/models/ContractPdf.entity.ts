import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Contract } from "./Contracts.entity";

@Entity("contract_pdfs")
export class ContractPDF {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  contract_id: number;

  @ManyToOne(() => Contract, (contract) => contract.id)
  @JoinColumn({ name: "contract_id" })
  contract: Contract;

  @Column({ type: "bytea" }) 
  pdf_data: Buffer;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;
}