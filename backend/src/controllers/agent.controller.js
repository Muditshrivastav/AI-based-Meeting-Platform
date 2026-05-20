import { ChatOllama } from "@langchain/ollama";
import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { BaseCheckpointSaver, copyCheckpoint, getCheckpointId } from "@langchain/langgraph-checkpoint";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { DynamicStructuredTool } from "@langchain/community/tools/dynamic";
import { z } from "zod";
import { ScheduledMeeting } from "../models/scheduledMeeting.model.js";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";
import { AgentCheckpoint } from "../models/agentCheckpoint.model.js";
import crypto from "crypto";

// ============================================================
// 1. MONGODB PERSISTENCE (Custom Checkpoint Saver)
// ============================================================

async function loadSerialized(serde, value, fallback) {
    if (value === undefined || value === null) return fallback;
    if (typeof value !== "string") return value;
    return serde.loadsTyped("json", value);
}

class MongoDBSaver extends BaseCheckpointSaver {
    constructor(serde) {
        super(serde);
    }

    async getTuple(config) {
        const threadId = config.configurable?.thread_id;
        const checkpointNs = config.configurable?.checkpoint_ns ?? "";
        const checkpointId = getCheckpointId(config);
        if (!threadId) return undefined;

        try {
            const query = {
                thread_id: threadId,
                $or: [{ checkpoint_ns: checkpointNs }, { checkpoint_ns: { $exists: false } }],
                checkpoint_id: { $ne: "latest" }
            };
            if (checkpointId) query.checkpoint_id = checkpointId;

            const doc = await AgentCheckpoint.findOne(query)
                .sort({ checkpoint_id: -1 })
                .lean();

            if (!doc) return undefined;

            const checkpoint = await loadSerialized(this.serde, doc.checkpoint);
            const metadata = await loadSerialized(this.serde, doc.metadata, {});
            if (!checkpoint?.v || !checkpoint?.channel_values) return undefined;

            return {
                config: {
                    configurable: {
                        thread_id: threadId,
                        checkpoint_ns: checkpointNs,
                        checkpoint_id: doc.checkpoint_id
                    }
                },
                checkpoint,
                metadata,
                pendingWrites: [],
                parentConfig: doc.parent_id
                    ? {
                        configurable: {
                            thread_id: threadId,
                            checkpoint_ns: checkpointNs,
                            checkpoint_id: doc.parent_id
                        }
                    }
                    : undefined
            };
        } catch (e) {
            console.error("[MongoDBSaver] getTuple error:", e.message);
            return undefined;
        }
    }

    async put(config, checkpoint, metadata) {
        const threadId = config.configurable?.thread_id;
        const checkpointNs = config.configurable?.checkpoint_ns ?? "";
        if (!threadId) {
            throw new Error("MongoDBSaver requires configurable.thread_id");
        }

        const preparedCheckpoint = copyCheckpoint(checkpoint);
        const checkpointId = preparedCheckpoint.id;
        const parentId = config.configurable?.checkpoint_id || null;
        const [[, serializedCheckpoint], [, serializedMetadata]] = await Promise.all([
            this.serde.dumpsTyped(preparedCheckpoint),
            this.serde.dumpsTyped(metadata || {})
        ]);

        try {
            await AgentCheckpoint.findOneAndUpdate(
                { thread_id: threadId, checkpoint_ns: checkpointNs, checkpoint_id: checkpointId },
                {
                    thread_id: threadId,
                    checkpoint_ns: checkpointNs,
                    checkpoint_id: checkpointId,
                    parent_id: parentId,
                    checkpoint: serializedCheckpoint,
                    metadata: serializedMetadata
                },
                { upsert: true, new: true }
            );
        } catch (e) {
            console.error("[MongoDBSaver] put error:", e.message);
        }

        return {
            configurable: {
                thread_id: threadId,
                checkpoint_ns: checkpointNs,
                checkpoint_id: checkpointId
            }
        };
    }

    async putWrites(config, writes, taskId) {
        // Checkpoint writes are only needed for advanced resume/interrupt flows.
        // The app uses straightforward request/response invocations, so the
        // durable checkpoint from put() is enough and avoids partial-write docs.
        return;
    }

    async *list(config, options) {
        const threadId = config.configurable?.thread_id;
        const checkpointNs = config.configurable?.checkpoint_ns;

        try {
            const query = { checkpoint_id: { $ne: "latest" } };
            if (threadId) query.thread_id = threadId;
            if (checkpointNs !== undefined) {
                query.$or = [{ checkpoint_ns: checkpointNs }, { checkpoint_ns: { $exists: false } }];
            }

            const docs = await AgentCheckpoint.find(query)
                .sort({ checkpoint_id: -1 })
                .limit(options?.limit || 10)
                .lean();

            for (const doc of docs) {
                const checkpoint = await loadSerialized(this.serde, doc.checkpoint);
                if (!checkpoint?.v || !checkpoint?.channel_values) continue;

                yield {
                    config: {
                        configurable: {
                            thread_id: doc.thread_id,
                            checkpoint_ns: doc.checkpoint_ns || "",
                            checkpoint_id: doc.checkpoint_id
                        }
                    },
                    checkpoint,
                    metadata: await loadSerialized(this.serde, doc.metadata, {}),
                    pendingWrites: [],
                    parentConfig: doc.parent_id
                        ? {
                            configurable: {
                                thread_id: doc.thread_id,
                                checkpoint_ns: doc.checkpoint_ns || "",
                                checkpoint_id: doc.parent_id
                            }
                        }
                        : undefined
                };
            }
        } catch (e) {
            console.error("[MongoDBSaver] list error:", e.message);
        }
    }

    async delete(threadId) {
        try {
            await AgentCheckpoint.deleteMany({ thread_id: threadId });
            console.log(`[MongoDBSaver] Deleted all checkpoints for thread: ${threadId}`);
        } catch (e) {
            console.error("[MongoDBSaver] delete error:", e.message);
        }
    }
}

const checkpointer = new MongoDBSaver();

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000";

function createMeetingCode() {
    return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function formatMeetingContext(meeting) {
    if (!meeting) return "No meeting has been created or referenced yet in this conversation.";

    const title = meeting.topic ? `"${meeting.topic}"` : "Untitled meeting";
    const kind = meeting.scheduledAt ? "scheduled meeting" : "instant meeting";
    const when = meeting.scheduledAt
        ? `Scheduled at: ${new Date(meeting.scheduledAt).toLocaleString()}`
        : `Created at: ${new Date(meeting.date || meeting.createdAt || Date.now()).toLocaleString()}`;

    return [
        `Most recent ${kind}: ${title}`,
        `Meeting code: ${meeting.meetingCode}`,
        `Meeting link: ${FRONTEND_URL}/meeting/${meeting.meetingCode}`,
        when,
        `Guest email: ${meeting.guestEmail || "none"}`,
        `Guest phone: ${meeting.guestPhone || "none"}`
    ].join("\n");
}

async function getRecentMeetingForUser(username) {
    if (!username || username === "Guest") return null;

    const [instantMeeting, scheduledMeeting] = await Promise.all([
        Meeting.findOne({ user_id: username }).sort({ date: -1 }).lean(),
        ScheduledMeeting.findOne({ createdBy: username }).sort({ createdAt: -1 }).lean()
    ]);

    if (!instantMeeting) return scheduledMeeting;
    if (!scheduledMeeting) return instantMeeting;

    const instantDate = new Date(instantMeeting.date || 0).getTime();
    const scheduledCreated = new Date(scheduledMeeting.createdAt || 0).getTime();
    return scheduledCreated > instantDate ? scheduledMeeting : instantMeeting;
}

function extractContent(message) {
    if (!message) return "";
    if (typeof message.content === "string") return message.content;
    if (Array.isArray(message.content)) {
        return message.content
            .map((part) => typeof part === "string" ? part : part?.text || JSON.stringify(part))
            .join("\n");
    }
    return message.content ? JSON.stringify(message.content) : "";
}

function parseEmailAddress(text) {
    return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
}

function isInstantMeetingRequest(text) {
    return /\b(create|start|new|open|begin)\b/i.test(text)
        && /\b(meeting|meet|room|call)\b/i.test(text)
        && !/\b(schedule|tomorrow|today at|at \d|on \d|next)\b/i.test(text);
}

async function createInstantMeetingForUser(username, topic) {
    const meetingCode = createMeetingCode();
    const title = topic || "Quick Meet";
    await Promise.all([
        new Meeting({ user_id: username, meetingCode, summary: "" }).save(),
        new ScheduledMeeting({
            meetingCode,
            topic: title,
            scheduledAt: new Date(),
            createdBy: username
        }).save()
    ]);

    return {
        meetingCode,
        reply: `Instant meeting "${title}" created with code ${meetingCode}. Redirecting you to the meeting room.`,
        action: "NAVIGATE",
        payload: `/meeting/${meetingCode}`
    };
}

async function composeLatestNotesEmail(username, emailAddress, meetingCode) {
    if (!username || username === "Guest") {
        return { reply: "Please log in to send meeting notes by email.", action: null, payload: null };
    }

    const query = { user_id: username, summary: { $exists: true, $ne: "" } };
    if (meetingCode) query.meetingCode = meetingCode;

    const meeting = await Meeting.findOne(query).sort({ date: -1 });
    if (!meeting) {
        return {
            reply: meetingCode
                ? `No notes found for meeting ${meetingCode}.`
                : "No meeting notes are available yet. End a meeting with chat or transcript content first so notes can be generated.",
            action: null,
            payload: null
        };
    }

    const subject = `Meeting Notes - ${meeting.meetingCode} | ${new Date(meeting.date).toLocaleDateString()}`;
    const body = [
        "Meeting Notes",
        "==============",
        `Meeting Code: ${meeting.meetingCode}`,
        `Date: ${new Date(meeting.date).toLocaleString()}`,
        "",
        "AI Summary:",
        meeting.summary,
        "",
        "Shared from MeetSpace"
    ].join("\n");

    return {
        reply: `Email composed for ${emailAddress} with notes from meeting ${meeting.meetingCode}.`,
        action: "EMAIL",
        payload: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailAddress)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    };
}

// ============================================================
// 2. TOOL DEFINITIONS (6 Tools)
// ============================================================

// --- Tool 1: Schedule a future meeting ---
const scheduleMeetingTool = new DynamicStructuredTool({
    name: "schedule_meeting",
    description: "Schedules a FUTURE meeting. REQUIRES: topic, date (YYYY-MM-DD), time (HH:MM in 24h format). Optional: guestEmail, guestPhone (with country code like 919876543210).",
    schema: z.object({
        topic: z.string().describe("The meeting topic/title"),
        date: z.string().describe("Meeting date in YYYY-MM-DD format"),
        time: z.string().describe("Meeting time in HH:MM 24-hour format"),
        guestEmail: z.string().optional().describe("Guest email address"),
        guestPhone: z.string().optional().describe("Guest WhatsApp number with country code")
    }),
    func: async ({ topic, date, time, guestEmail, guestPhone }, runManager) => {
        try {
            const scheduledAt = new Date(`${date}T${time}`);
            if (isNaN(scheduledAt.getTime())) return "FAIL: Invalid date or time format. Use YYYY-MM-DD and HH:MM.";
            const meetingCode = createMeetingCode();
            const username = runManager?.metadata?.username || "AI_Agent";
            const newMeeting = new ScheduledMeeting({
                meetingCode,
                topic,
                guestEmail: guestEmail || "",
                guestPhone: guestPhone || "",
                scheduledAt,
                createdBy: username
            });
            await newMeeting.save();
            const formattedDate = scheduledAt.toLocaleString();
            return `SUCCESS: Meeting "${topic}" scheduled for ${formattedDate}. Code: ${meetingCode}. Link: ${FRONTEND_URL}/meeting/${meetingCode}. Guest Email: ${guestEmail || "none"}. Guest Phone: ${guestPhone || "none"}. Saved to database.`;
        } catch (e) {
            return `ERROR: Database failure - ${e.message}`;
        }
    }
});

// --- Tool 2: Start an instant meeting ---
const startInstantMeetingTool = new DynamicStructuredTool({
    name: "start_instant_meeting",
    description: "Starts a meeting IMMEDIATELY right now. Use when user says 'start meeting', 'create meeting', 'start now', 'new meeting', 'let's meet'.",
    schema: z.object({
        topic: z.string().optional().describe("Optional meeting topic")
    }),
    func: async ({ topic }, runManager) => {
        try {
            const meetingCode = createMeetingCode();
            const username = runManager?.metadata?.username || "AI_Agent";
            const title = topic || "Quick Meet";
            await Promise.all([
                new Meeting({ user_id: username, meetingCode, summary: "" }).save(),
                new ScheduledMeeting({
                    meetingCode,
                    topic: title,
                    scheduledAt: new Date(),
                    createdBy: username
                }).save()
            ]);
            return `ACTION_NAVIGATE: /meeting/${meetingCode} | SUCCESS: Instant meeting "${title}" created with code ${meetingCode}. Link: ${FRONTEND_URL}/meeting/${meetingCode}. User is being redirected to the meeting room.`;
        } catch (e) {
            return `ERROR: Failed to start meeting - ${e.message}`;
        }
    }
});

// --- Tool 3: Get upcoming meetings ---
const getMeetingsTool = new DynamicStructuredTool({
    name: "get_meetings",
    description: "Lists all upcoming scheduled meetings for the current user. Use when user asks 'what meetings do I have', 'my schedule', 'upcoming meetings'.",
    schema: z.object({}),
    func: async (_, runManager) => {
        try {
            const username = runManager?.metadata?.username;
            if (!username || username === "Guest") return "Please log in to see your meetings.";
            const meetings = await ScheduledMeeting.find({ createdBy: username }).sort({ scheduledAt: 1 }).limit(10);
            if (meetings.length === 0) return "You have no upcoming meetings scheduled.";
            return "Here are your scheduled meetings:\n" + meetings.map((m) =>
                `- "${m.topic}" on ${m.scheduledAt.toLocaleString()} | Code: ${m.meetingCode} | Email: ${m.guestEmail || "none"} | Phone: ${m.guestPhone || "none"}`
            ).join("\n");
        } catch (e) {
            return `ERROR: Failed to fetch meetings - ${e.message}`;
        }
    }
});

// --- Tool 4: Get meeting notes/summaries ---
const getMeetingNotesTool = new DynamicStructuredTool({
    name: "get_meeting_notes",
    description: "Fetches AI-generated meeting notes/summaries from past meetings. Use when user asks about 'notes', 'summaries', 'what was discussed'. Optional: meetingCode to get notes for a specific meeting.",
    schema: z.object({
        meetingCode: z.string().optional().describe("Specific meeting code to get notes for. Leave empty to get all recent notes.")
    }),
    func: async ({ meetingCode }, runManager) => {
        try {
            const username = runManager?.metadata?.username;
            if (!username || username === "Guest") return "Please log in to access your meeting notes.";

            let query = { user_id: username, summary: { $exists: true, $ne: "" } };
            if (meetingCode) query.meetingCode = meetingCode;

            const meetings = await Meeting.find(query).sort({ date: -1 }).limit(5);
            if (meetings.length === 0) return meetingCode
                ? `No notes found for meeting code ${meetingCode}.`
                : "You have no meeting notes yet. Complete a meeting with transcription enabled to generate AI notes.";

            return "Here are your meeting notes:\n\n" + meetings.map((m) =>
                `📝 Meeting: ${m.meetingCode} | Date: ${new Date(m.date).toLocaleString()}\nSummary: ${m.summary}\n---`
            ).join("\n\n");
        } catch (e) {
            return `ERROR: Failed to fetch notes - ${e.message}`;
        }
    }
});

// --- Tool 5: Send meeting notes via WhatsApp ---
const sendNotesWhatsAppTool = new DynamicStructuredTool({
    name: "send_notes_whatsapp",
    description: "Sends meeting notes to a participant via WhatsApp. Requires the phone number (with country code like 919876543210). Optionally specify meetingCode; if not given, sends notes from the most recent meeting.",
    schema: z.object({
        phoneNumber: z.string().describe("WhatsApp phone number with country code (e.g., 919876543210)"),
        meetingCode: z.string().optional().describe("Specific meeting code. If empty, uses the most recent meeting with notes.")
    }),
    func: async ({ phoneNumber, meetingCode }, runManager) => {
        try {
            const username = runManager?.metadata?.username;
            if (!username || username === "Guest") return "Please log in to send meeting notes.";

            let query = { user_id: username, summary: { $exists: true, $ne: "" } };
            if (meetingCode) query.meetingCode = meetingCode;

            const meeting = await Meeting.findOne(query).sort({ date: -1 });
            if (!meeting) return meetingCode
                ? `No notes found for meeting ${meetingCode}.`
                : "No meeting notes available to share yet. End a meeting with chat or transcript content first so notes can be generated.";

            const cleanPhone = phoneNumber.replace(/\D/g, "");
            const text = [
                `📋 *Meeting Notes*`,
                `====================`,
                `*Meeting Code:* ${meeting.meetingCode}`,
                `*Date:* ${new Date(meeting.date).toLocaleString()}`,
                ``,
                `*AI Summary:*`,
                `${meeting.summary}`,
                ``,
                `_Shared from MeetSpace_`
            ].join("\n");

            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
            return `ACTION_WHATSAPP: ${whatsappUrl} | SUCCESS: WhatsApp message prepared for ${cleanPhone} with notes from meeting ${meeting.meetingCode}. Opening WhatsApp...`;
        } catch (e) {
            return `ERROR: Failed to prepare WhatsApp message - ${e.message}`;
        }
    }
});

// --- Tool 6: Send meeting notes via Email ---
const sendNotesEmailTool = new DynamicStructuredTool({
    name: "send_notes_email",
    description: "Sends meeting notes to a participant via Email (Gmail). Requires email address. Optionally specify meetingCode; if not given, sends notes from the most recent meeting.",
    schema: z.object({
        emailAddress: z.string().describe("Recipient email address"),
        meetingCode: z.string().optional().describe("Specific meeting code. If empty, uses the most recent meeting with notes.")
    }),
    func: async ({ emailAddress, meetingCode }, runManager) => {
        try {
            const username = runManager?.metadata?.username;
            if (!username || username === "Guest") return "Please log in to send meeting notes.";

            let query = { user_id: username, summary: { $exists: true, $ne: "" } };
            if (meetingCode) query.meetingCode = meetingCode;

            const meeting = await Meeting.findOne(query).sort({ date: -1 });
            if (!meeting) return meetingCode
                ? `No notes found for meeting ${meetingCode}.`
                : "No meeting notes available to share. Complete a meeting with transcription first.";

            const subject = `Meeting Notes - ${meeting.meetingCode} | ${new Date(meeting.date).toLocaleDateString()}`;
            const body = [
                `Meeting Notes`,
                `==============`,
                `Meeting Code: ${meeting.meetingCode}`,
                `Date: ${new Date(meeting.date).toLocaleString()}`,
                ``,
                `AI Summary:`,
                `${meeting.summary}`,
                ``,
                `Shared from MeetSpace`
            ].join("\n");

            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailAddress)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            const mailtoUrl = `mailto:${encodeURIComponent(emailAddress)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            return `ACTION_EMAIL: ${gmailUrl} | MAILTO: ${mailtoUrl} | SUCCESS: Email composed for ${emailAddress} with notes from meeting ${meeting.meetingCode}. Opening Gmail...`;
        } catch (e) {
            return `ERROR: Failed to prepare email - ${e.message}`;
        }
    }
});

// ============================================================
// 3. LLM + DEEP AGENT GRAPH
// ============================================================

const tools = [
    scheduleMeetingTool,
    startInstantMeetingTool,
    getMeetingsTool,
    getMeetingNotesTool,
    sendNotesWhatsAppTool,
    sendNotesEmailTool
];

const toolNode = new ToolNode(tools);

const llm = new ChatOllama({
    baseUrl: process.env.OLLAMA_URL?.replace("/api/generate", "") || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "gemma4:31b-cloud",
    temperature: 0,
}).bindTools(tools);

// System prompt with deep instructions for the agent
const SYSTEM_PROMPT = `You are the MeetSpace AI AGENT — a powerful autonomous assistant for the MeetSpace video meeting platform. You PERFORM ACTIONS, not just chat.

TODAY'S DATE: ${new Date().toLocaleDateString("en-CA")} (use this as reference for scheduling)
CURRENT TIME: ${new Date().toLocaleTimeString("en-US", { hour12: false })}

CRITICAL RULES:
1. ALWAYS use tools to perform actions. NEVER pretend to have done something without calling a tool.
2. If a user asks to schedule, create, start, or join a meeting → call the appropriate tool.
3. If a user asks about their meetings, schedule, or upcoming events → call get_meetings.
4. If a user asks about meeting notes, summaries, or what was discussed → call get_meeting_notes.
5. If a user asks to send/share notes via WhatsApp → call send_notes_whatsapp.
6. If a user asks to send/share notes via Email → call send_notes_email.
7. When a tool returns ACTION_NAVIGATE, ACTION_WHATSAPP, or ACTION_EMAIL, include that EXACT string in your response.
8. You have MEMORY — you remember previous messages in this conversation. Use context from earlier messages.
9. If the user gives incomplete info (e.g., wants to schedule but didn't say when), ASK for the missing details.
10. Be concise, helpful, and action-oriented. Don't write long paragraphs when a short confirmation will do.

AVAILABLE TOOLS:
- schedule_meeting: Schedule a future meeting (needs topic, date, time)
- start_instant_meeting: Start a meeting right now
- get_meetings: List upcoming scheduled meetings
- get_meeting_notes: Fetch AI-generated notes from past meetings
- send_notes_whatsapp: Send meeting notes via WhatsApp (needs phone number)
- send_notes_email: Send meeting notes via Email (needs email address)

RESPONSE FORMAT EXAMPLES:
User: "Schedule a meeting for tomorrow at 3 PM about AI review"
→ Call schedule_meeting with appropriate args

User: "Send my last meeting notes to 919876543210 on WhatsApp"
→ Call send_notes_whatsapp with phoneNumber=919876543210

User: "What did we discuss in the last meeting?"
→ Call get_meeting_notes`;

// Agent node: calls the LLM with system prompt + conversation history
async function agentNode(state) {
    const { messages } = state;

    // Inject system prompt as the first message if not present
    const hasSystemPrompt = messages.length > 0 && messages[0]?.role === "system";
    const fullMessages = hasSystemPrompt
        ? messages
        : [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

    try {
        const response = await llm.invoke(fullMessages);
        return { messages: [response] };
    } catch (e) {
        console.error("[Agent] LLM Invoke Error:", e.message);
        return {
            messages: [{
                role: "assistant",
                content: `I'm having trouble connecting to the AI engine. Please ensure Ollama is running. Error: ${e.message}`
            }]
        };
    }
}

// Router: decide whether to continue to tools or end
function shouldContinue(state) {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage.tool_calls?.length > 0) {
        return "tools";
    }
    return END;
}

// Build the LangGraph StateGraph (deep agent pattern)
const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent"); // After tools execute, go back to agent for reasoning

// Compile with MongoDB persistence
const agentApp = workflow.compile({ checkpointer });

// ============================================================
// 4. CONTROLLER ENDPOINTS
// ============================================================

export const chatWithAgent = async (req, res) => {
    const { message, token, threadId: clientThreadId } = req.body;
    if (!message) return res.status(400).json({ message: "Message is required" });

    try {
        // Resolve user
        let username = "Guest";
        let isAuthenticated = false;
        if (token) {
            const user = await User.findOne({ token });
            if (user) {
                username = user.username;
                isAuthenticated = true;
            }
        }

        // Thread ID = unique per user for conversation persistence
        const threadId = isAuthenticated
            ? `user_${username}`
            : (clientThreadId || `guest_${Date.now()}`);
        const recentMeetingContext = formatMeetingContext(await getRecentMeetingForUser(username));
        const contextMessage = {
            role: "system",
            content: [
                "CURRENT USER CONTEXT:",
                `Logged in user: ${username}`,
                isAuthenticated ? "Authentication: logged in" : "Authentication: guest or invalid token",
                "RECENT MEETING CONTEXT:",
                recentMeetingContext,
                "When the user says this meeting, that meeting, the meeting I created, latest meeting, or last meeting, use the recent meeting context or conversation history before asking for a code."
            ].join("\n")
        };

        console.log(`[Agent] Request from ${username} (thread: ${threadId}): "${message}"`);

        if (isInstantMeetingRequest(message)) {
            const meeting = await createInstantMeetingForUser(username, "Quick Meet");
            return res.json({
                reply: meeting.reply,
                action: meeting.action,
                payload: meeting.payload,
                threadId,
                memoryActive: true
            });
        }

        const emailAddress = parseEmailAddress(message);
        if (emailAddress && /\b(email|mail|send|share)\b/i.test(message) && /\b(note|notes|summary|summaries)\b/i.test(message)) {
            const codeMatch = message.match(/\b(?:meeting\s*(?:code)?|code)\s*[:#-]?\s*([A-Z0-9]{3,}(?:-[A-Z0-9]{3,})?)\b/i);
            const emailResult = await composeLatestNotesEmail(username, emailAddress, codeMatch?.[1]?.toUpperCase());
            return res.json({
                ...emailResult,
                threadId,
                memoryActive: true
            });
        }

        // Invoke the agent graph with persistence config
        const result = await agentApp.invoke(
            { messages: [contextMessage, { role: "user", content: message }] },
            {
                configurable: { thread_id: threadId },
                metadata: { username }
            }
        );

        // Extract the final assistant message
        const allMessages = result.messages;
        const lastMessage = allMessages[allMessages.length - 1];
        const content = extractContent(lastMessage);
        const actionSource = allMessages.map(extractContent).join("\n");

        // Parse all possible actions from the response
        let action = null;
        let payload = null;

        const navMatch = actionSource.match(/ACTION_NAVIGATE:\s*([^\s|]+)/);
        const waMatch = actionSource.match(/ACTION_WHATSAPP:\s*([^\s|]+\S+)/);
        const emailMatch = actionSource.match(/ACTION_EMAIL:\s*(https:\/\/mail\.google\.com[^\s|]+)/);

        if (navMatch) {
            action = "NAVIGATE";
            payload = navMatch[1];
        } else if (waMatch) {
            action = "WHATSAPP";
            payload = waMatch[1];
        } else if (emailMatch) {
            action = "EMAIL";
            payload = emailMatch[1];
        }

        // Clean action strings from the visible reply
        const cleanReply = content
            .replace(/ACTION_NAVIGATE:\s*[^\s|]+\s*\|\s*/g, "")
            .replace(/ACTION_WHATSAPP:\s*\S+\s*\|\s*/g, "")
            .replace(/ACTION_EMAIL:\s*https:\/\/mail\.google\.com\S+\s*\|\s*/g, "")
            .replace(/ACTION_NAVIGATE:\s*[^\s]+/g, "")
            .replace(/ACTION_WHATSAPP:\s*\S+/g, "")
            .replace(/ACTION_EMAIL:\s*\S+/g, "")
            .trim();

        console.log(`[Agent] Response (${action || "text"}): ${cleanReply.substring(0, 120)}...`);

        res.json({
            reply: cleanReply,
            action,
            payload,
            threadId,
            memoryActive: true
        });

    } catch (error) {
        console.error("AGENT_CONTROLLER_ERROR:", error);
        res.status(500).json({
            message: "The AI Agent encountered an internal error. Check if Ollama is running.",
            error: error.message
        });
    }
};

// Reset conversation memory for a user
export const resetConversation = async (req, res) => {
    const { token, threadId: clientThreadId } = req.body;

    try {
        let threadId = clientThreadId || "default";
        if (token) {
            const user = await User.findOne({ token });
            threadId = user ? `user_${user.username}` : threadId;
        }

        // Clear MongoDB checkpoints
        await checkpointer.delete(threadId);

        console.log(`[Agent] Conversation reset for thread: ${threadId}`);
        res.json({ message: "Conversation memory cleared. Starting fresh." });
    } catch (error) {
        console.error("RESET_ERROR:", error);
        res.status(500).json({ message: "Failed to reset conversation", error: error.message });
    }
};
