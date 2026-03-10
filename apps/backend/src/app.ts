import express from "express";
import cors from "cors";
import morgan from "morgan";
import { authRouter } from "./routes/auth.js";
import { patientRouter } from "./routes/patient.js";
import { iamRouter } from "./routes/iam.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.get("/healthz", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/patient", patientRouter);
  app.use("/api/iam", iamRouter);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = typeof err?.message === "string" ? err.message : "Internal error";
    res.status(500).json({ success: false, message, data: null });
  });

  return app;
}

