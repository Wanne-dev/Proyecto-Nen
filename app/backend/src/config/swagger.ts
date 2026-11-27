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
        "API de BANCA NEN: billetera virtual y órdenes de mercado simuladas, sin dinero real.",
    },
    servers: [
      { url: "/api", description: "Servidor actual (relativo)" },
      { url: "http://localhost:3000/api", description: "Desarrollo local" },
    ],
    components: {
      securitySchemes: {
        sessionCookie: { type: "apiKey", in: "cookie", name: "nen_access" },
      },
    },
    security: [{ sessionCookie: [] }],
  },
  apis: [
    // Anotaciones JSDoc @swagger en rutas
    "./src/routes/*.ts",
    "./dist/routes/*.js",
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
