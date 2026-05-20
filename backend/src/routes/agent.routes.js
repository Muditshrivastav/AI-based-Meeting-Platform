import { Router } from "express";
import { chatWithAgent, resetConversation } from "../controllers/agent.controller.js";

const router = Router();

router.route("/chat").post(chatWithAgent);
router.route("/reset").delete(resetConversation);

export default router;
