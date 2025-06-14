import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('idempotency')
export class Idempotency {
  @PrimaryColumn()
  key: string;

  @Column('jsonb')
  result: any;

  @Column()
  created_at: Date;
}