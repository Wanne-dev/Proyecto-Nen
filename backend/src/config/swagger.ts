/* ============================================================
   BANCA NEN — Documentación OpenAPI (Swagger)
   UI disponible en:  /api/v1/docs
   Especificación:    /api/v1/docs-json
   ============================================================ */
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "BANCA NEN API",
      version: "1.0.0",
      description:
        "Plataforma de inversión inteligente con billetera digital y trading asistido por IA.",
    },
    servers: [
      { url: "/api", description: "Servidor actual (relativo)" },
      { url: "http://localhost:3000/api", description: "Desarrollo local" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    // Anotaciones JSDoc @swagger en rutas
    "./src/routes/*.ts",
    "./dist/routes/*.js",
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
