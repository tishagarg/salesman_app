import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
@Entity("refresh_token")

export class RefreshToken {
  @PrimaryGeneratedColumn()
  refresh_token_id: number;

  @Column({ type: "int" })
  user_id: number;
  @Column({ type: "varchar", length: 255 })
  token: string;
  @Column({ type: "varchar", length: 255 })
  scopes: string;
  

  @Column({ type: "timestamp" })
  expires_at: Date;

  @Column({ type: "char", length: 36, nullable: true })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: "char", length: 36, nullable: true })
  updated_by: string;

  @UpdateDateColumn()
  updated_at: Date;
}
