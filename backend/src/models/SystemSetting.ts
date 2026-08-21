/* ============================================================
   BANCA NEN — Entidad de configuración del sistema (KV)
   ============================================================ */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("system_settings")
export class SystemSetting {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, length: 100 })
  key: string;

  @Column({ type: "jsonb", nullable: true })
  value: any;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
