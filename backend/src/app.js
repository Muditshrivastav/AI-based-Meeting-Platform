import express from "express";
import "dotenv/config";
import { createServer } from "node:http";
import ollama from "ollama";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";
import agentRoutes from "./routes/agent.routes.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

const allowedOrigins = (
    process.env.CORS_ORIGIN ||
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
)
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

const isAllowedDevOrigin = (origin) =>
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

app.set("port", Number(process.env.PORT) || 8000);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin) || isAllowedDevOrigin(origin)) {
                return callback(null, true);
            }
            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/agent", agentRoutes);

app.post("/api/v1/summarize", async (req, res) => {
    const { meetingText } = req.body;
    if (!meetingText) {
        return res.status(400).json({ message: "meetingText is required" });
    }

    try {
        if (process.env.USE_OLLAMA === "true") {
            const response = await ollama.generate({
                model: process.env.OLLAMA_MODEL || "gemma4:31b-cloud",
                prompt: `Summarize the following meeting transcript into professional notes, highlighting key decisions and action items:\n\n${meetingText}`,
                stream: false,
            });
            return res.json({ summary: response.response });
        }

        const response = await fetch(
            process.env.SUMMARY_SERVICE_URL || "http://localhost:5000/summarize",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: meetingText }),
            }
        );
        const data = await response.json();
        return res.json(data);
    } catch (e) {
        console.error("Summarization error:", e);
        return res.json({
            summary:
                "AI Summary (Fallback): The meeting discussed several topics including real-time transcription and LLM integration. (Services were unavailable to generate a full summary).",
        });
    }
});

const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/videomeet";

const start = async () => {
    try {
        console.log("Connecting to MongoDB...");
        const connectionDb = await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        const port = app.get("port");
        console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`);

        server.on("error", (error) => {
            if (error.code === "EADDRINUSE") {
                console.error(
                    `Port ${port} is already in use. Stop the other backend process or start this one with PORT=8001.`
                );
            } else {
                console.error("Server error:", error.message);
            }
            process.exit(1);
        });

        server.listen(port, () => {
            console.log(`LISTENING ON PORT ${port}`);
        });
    } catch (e) {
        console.error("Failed to connect to MongoDB:", e.message);
        process.exit(1);
    }
};

start();
