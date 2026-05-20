import mongoose, { Schema } from "mongoose";

const agentCheckpointSchema = new Schema(
    {
        thread_id: { type: String, required: true, index: true },
        checkpoint_ns: { type: String, default: "", index: true },
        checkpoint_id: { type: String, required: true },
        parent_id: { type: String, default: null },
        checkpoint: { type: Schema.Types.Mixed, required: true },
        metadata: { type: Schema.Types.Mixed, default: {} }
    },
    { timestamps: true }
);

// Compound index for fast lookups
agentCheckpointSchema.index({ thread_id: 1, checkpoint_ns: 1, checkpoint_id: 1 }, { unique: true });

const AgentCheckpoint = mongoose.model("AgentCheckpoint", agentCheckpointSchema);

export { AgentCheckpoint };
