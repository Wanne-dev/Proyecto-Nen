import { DataSource } from "typeorm";
import logger from "./logger";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || "5433"),
  username: process.env.DB_USER || "banca_nen",
  password: process.env.DB_PASSWORD || "banca_nen_secret",
  database: process.env.DB_NAME || "banca_nen",
  ssl: false,
  synchronize: true,
  logging: false,
  entities: [__dirname + "/../models/**/*.{js,ts}"],
  migrations: [__dirname + "/../migrations/**/*.{js,ts}"],
  subscribers: [],
});

export async function connectDatabase(): Promise<void> {
  try {
    await AppDataSource.initialize();
    logger.info("Base de datos PostgreSQL conectada");
  } catch (error) {
    logger.error("Error conectando a la base de datos:", error);
    throw error;
  }
}
