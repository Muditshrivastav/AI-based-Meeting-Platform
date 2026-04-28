import express from "express";
import { createServer } from "node:http";

import { Server } from "socket.io";

import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";

import cors from "cors";
import userRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);


app.set("port", (process.env.PORT || 8000))
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

app.use("/api/v1/users", userRoutes);

app.post("/api/v1/summarize", async (req, res) => {
    const { meetingText } = req.body;
    if (!meetingText) {
        return res.status(400).json({ message: "meetingText is required" });
    }

    try {
        const response = await fetch(process.env.SUMMARY_SERVICE_URL || "http://localhost:5000/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: meetingText }),
        });
        const data = await response.json();
        return res.json(data);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Summarization service error" });
    }
});

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/videomeet";

const start = async () => {
    try {
        const connectionDb = await mongoose.connect(MONGODB_URI);
        console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`)
        server.listen(app.get("port"), () => {
            console.log("LISTENING ON PORT 8000")
        });
    } catch (e) {
        console.error("Failed to connect to MongoDB:", e.message);
        process.exit(1);
    }
}



start();
