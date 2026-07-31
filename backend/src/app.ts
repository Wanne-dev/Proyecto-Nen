import "dotenv/config";
import "reflect-metadata";
import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { connectDatabase } from "./config/database";
import logger from "./config/logger";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler.middleware";


const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

app.get("/", (_req, res) => {
  res.json({
    message: "?? Bienvenido a BANCA NEN API",
    version: "1.0.0",
    docs: "/api/v1/health",
  });
});

app.use(errorHandler);

async function startServer() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      logger.info(`?? BANCA NEN API corriendo en http://localhost:${PORT}`);
      logger.info(`?? Health check: http://localhost:${PORT}/api/v1/health`);
      logger.info(`?? Auth: http://localhost:${PORT}/api/v1/auth/register`);
    });
  } catch (error) {
    logger.error("? No se pudo iniciar el servidor:", error);
    process.exit(1);
  }
}

startServer();

export default app;
