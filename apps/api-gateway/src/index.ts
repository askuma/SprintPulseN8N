import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pino from "pino";
import pinoHttp from "pino-http";

import { authRouter } from "./routes/auth";
import { reportsRouter } from "./routes/reports";
import { integrationsRouter } from "./routes/integrations";
import { webhooksRouter } from "./routes/webhooks";
import { internalSyncRouter } from "./routes/internal/sync";
import { internalWorkspacesRouter } from "./routes/internal/workspaces";
import { errorHandler } from "./middleware/error-handler";
import { requestIdMiddleware } from "./middleware/request-id";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "api-gateway" },
});

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(",") ?? ["http://localhost:3000"],
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));
app.use(requestIdMiddleware);
app.use(pinoHttp({ logger }));

// Public rate limit: 100 req/min per IP
const publicRateLimit = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests, please retry after the window." } },
});

app.use("/v1", publicRateLimit);

// --- Public Routes ---
app.use("/v1/auth", authRouter);

// --- Authenticated Routes ---
app.use("/v1/reports", reportsRouter);
app.use("/v1/integrations", integrationsRouter);

// --- Webhook Routes (HMAC-verified, no JWT) ---
app.use("/webhooks", webhooksRouter);

// --- Internal Routes (API-key protected, n8n calls these) ---
app.use("/internal/sync", internalSyncRouter);
app.use("/internal/workspaces", internalWorkspacesRouter);

// --- Health Check ---
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "api-gateway", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  logger.info({ port: PORT }, "API Gateway listening");
});

export default app;
