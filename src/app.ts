import express from "express";
import triageRoutes from "./routes/triage.routes.js";

const app = express();

app.use(express.json());

app.use("/api/v1", triageRoutes);

export default app;
