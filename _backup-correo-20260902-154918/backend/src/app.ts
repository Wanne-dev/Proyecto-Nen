import "dotenv/config";
import "reflect-metadata";
import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { connectDatabase, disconnectDatabase, describirConexion } from "./config/database";
import logger from "./config/logger";
import { verifyEmailConfig, EMAIL_PROVIDER } from "./config/email";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler.middleware";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
// 0.0.0.0 es obligatorio en Docker: con 127.0.0.1 el contenedor solo se
// escucharia a si mismo y el puerto publicado no responderia desde fuera.
const HOST = process.env.HOST || "0.0.0.0";

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

app.get("/", (_req, res) => {
  res.json({
    message: "Bienvenido a BANCA NEN API",
    version: "1.0.0",
    health: "/api/v1/health",
  });
});

app.use(errorHandler);

async function startServer() {
  try {
    await connectDatabase();

    const correoOk = await verifyEmailConfig();

    const server = app.listen(PORT, HOST, () => {
      logger.info("======================================================");
      logger.info(`BANCA NEN API escuchando en http://${HOST}:${PORT}`);
      logger.info(`Health check : http://localhost:${PORT}/api/v1/health`);
      logger.info(`Base de datos: ${describirConexion()}`);
      logger.info(`Correo       : ${EMAIL_PROVIDER}${correoOk ? " (operativo)" : " (NO envia correos reales)"}`);
      logger.info("======================================================");
    });

    // Cierre ordenado: sin esto "docker compose down" tarda 10s en matar el proceso
    const apagar = async (senal: string) => {
      logger.info(`${senal} recibido, cerrando...`);
      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on("SIGTERM", () => void apagar("SIGTERM"));
    process.on("SIGINT", () => void apagar("SIGINT"));
  } catch (error) {
    logger.error("No se pudo iniciar el servidor:", error);
    process.exit(1);
  }
}

startServer();

export default app;
