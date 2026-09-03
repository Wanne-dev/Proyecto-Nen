import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export enum WebhookStatus {
  RECEIVED = "received",
  PROCESSED = "processed",
  FAILED = "failed",
  IGNORED = "ignored",
}

/** Registro de eventos entrantes de webhooks (Wompi, etc.) para trazabilidad. */
@Entity("webhook_logs")
@Index(["provider", "event"])
export class WebhookLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", default: "wompi", length: 20 })
  provider: string;

  @Column({ type: "varchar", length: 100 })
  event: string;

  @Column({ name: "signature", type: "varchar", nullable: true, length: 255 })
  signature: string | null;

  @Column({ type: "jsonb", nullable: true })
  payload: object | null;

  @Column({ type: "enum", enum: WebhookStatus, default: WebhookStatus.RECEIVED })
  status: WebhookStatus;

  @Column({ type: "text", nullable: true })
  error: string | null;

  @Column({ name: "processed_at", type: "timestamptz", nullable: true })
  processedAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
