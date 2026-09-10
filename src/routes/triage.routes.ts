import { Router } from "express";
import { triageController } from "../controllers/triage.controller.js";

const router = Router();

router.post("/triage", triageController);

export default router;
