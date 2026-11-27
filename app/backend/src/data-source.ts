// DataSource compartida por Express y el CLI de TypeORM (TS local / JS en Docker).
import "dotenv/config";
import "reflect-metadata";
import { AppDataSource } from "./config/database";

export default AppDataSource;
