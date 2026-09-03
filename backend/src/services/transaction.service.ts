/* ============================================================
   BANCA NEN — Servicio de Transacciones (historial y resumen)
   ============================================================ */
import { AppDataSource } from "../config/database";
import { Transaction, TransactionType } from "../models/Transaction";
import { AppError } from "../middleware/errorHandler.middleware";
import { parsePagination, paginate } from "../utils/pagination";

const repo = () => AppDataSource.getRepository(Transaction);

export async function listTransactions(
  userId: string,
  query: { page?: unknown; limit?: unknown; type?: string } = {}
) {
  const { page, limit, offset } = parsePagination(query);
  const qb = repo()
    .createQueryBuilder("t")
    .where("t.user_id = :userId", { userId })
    .orderBy("t.created_at", "DESC")
    .skip(offset)
    .take(limit);

  if (query.type && query.type !== "all") {
    qb.andWhere("t.type = :type", { type: query.type });
  }

  const [items, total] = await qb.getManyAndCount();
  return paginate(items, total, page, limit);
}

export async function getTransaction(userId: string, id: string) {
  const tx = await repo().findOne({ where: { id, userId } as any });
  if (!tx) throw new AppError("Transaccion no encontrada", 404);
  return tx;
}

export async function getSummary(userId: string, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await repo()
    .createQueryBuilder("t")
    .select("t.type", "type")
    .addSelect("COALESCE(SUM(t.amount_usd), 0)", "total")
    .addSelect("COUNT(*)", "count")
    .where("t.user_id = :userId AND t.created_at >= :since", { userId, since })
    .groupBy("t.type")
    .getRawMany();

  let deposits = 0;
  let withdrawals = 0;
  let volume = 0;
  let count = 0;

  for (const r of rows as Array<{ type: string; total: string; count: string }>) {
    const total = Number(r.total) || 0;
    count += Number(r.count) || 0;
    volume += total;
    if (r.type === TransactionType.DEPOSIT) deposits += total;
    if (r.type === TransactionType.WITHDRAWAL) withdrawals += total;
  }

  return { days, deposits, withdrawals, volume, count };
}
