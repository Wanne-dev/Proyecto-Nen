import "dotenv/config";
import "reflect-metadata";
import "express-async-errors";
import express from "express";
import helmet from "helmet";
import { connectDatabase, disconnectDatabase, describirConexion } from "./config/database";
import logger from "./config/logger";
import { verifyEmailConfig, EMAIL_PROVIDER } from "./config/email";
import { requestId } from "./middleware/requestId.middleware";
import { securityHeaders } from "./middleware/securityHeaders.middleware";
import { corsMiddleware } from "./middleware/cors.middleware";
import { compressionMiddleware } from "./middleware/compression.middleware";
import { loggerMiddleware } from "./middleware/logger.middleware";
import { rateLimiter } from "./middleware/rateLimiter.middleware";
import { swaggerSpec } from "./config/swagger";
import swaggerUi from "swagger-ui-express";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler.middleware";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
// 0.0.0.0 es obligatorio en Docker: con 127.0.0.1 el contenedor solo se
// escucharia a si mismo y el puerto publicado no responderia desde fuera.
const HOST = process.env.HOST || "0.0.0.0";

app.use(requestId);
app.use(securityHeaders);
app.use(helmet());
app.use(corsMiddleware);
app.use(compressionMiddleware);
app.use(loggerMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

app.use("/api", routes);

// Documentación interactiva de la API (OpenAPI 3)
app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/v1/docs-json", (_req, res) => res.json(swaggerSpec));

app.get("/", (_req, res) => {
  res.json({
    message: "Bienvenido a BANCA NEN API",
    version: "1.0.0",
    health: "/api/v1/health",
  });
});

app.use(errorHandler);

/**
 * Arranca el servidor HTTP.
 * Se mantiene separado de la creacion de `app` para poder importar la
 * aplicacion en los tests (supertest) sin conectarse a la base de datos.
 */
export async function startServer() {
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
    return server;
  } catch (error) {
    logger.error("No se pudo iniciar el servidor:", error);
    process.exit(1);
  }
}

// Solo arranca el servidor cuando se ejecuta directamente (node dist/app.js o
// ts-node-dev). Al importarlo desde los tests, este bloque no se ejecuta.
if (require.main === module) {
  void startServer();
}

export default app;
