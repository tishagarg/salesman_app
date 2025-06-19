import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Visit } from "./Visits.entity";
import { ContractTemplate } from "./ContractTemplate.entity";

@Entity("contracts")
export class Contract {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  contract_template_id: number;

  @ManyToOne(() => ContractTemplate)
  @JoinColumn({ name: "contract_template_id" })
  template: ContractTemplate;

  @Column({ type: "int" })
  visit_id: number;

  @ManyToOne(() => Visit, (visit) => visit.contract)
  @JoinColumn({ name: "visit_id" })
  visit: Visit;

  @Column("text")
  rendered_html: string;

  @Column("jsonb", { nullable: true })
  metadata: Record<string, any>; // Raw data captured from the visit

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  signed_at: Date;
}
