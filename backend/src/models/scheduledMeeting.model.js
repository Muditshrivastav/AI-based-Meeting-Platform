import mongoose, { Schema } from "mongoose";

const scheduledMeetingSchema = new Schema(
    {
        meetingCode: { type: String, required: true, unique: true },
        topic: { type: String, default: "MeetSpace meeting" },
        guestEmail: { type: String, default: "" },
        scheduledAt: { type: Date, required: true },
        createdBy: { type: String, default: "" }
    },
    { timestamps: true }
);

const ScheduledMeeting = mongoose.model("ScheduledMeeting", scheduledMeetingSchema);

export { ScheduledMeeting };
