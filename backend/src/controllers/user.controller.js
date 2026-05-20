import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs"

import crypto from "crypto"
import { Meeting } from "../models/meeting.model.js";
import { ScheduledMeeting } from "../models/scheduledMeeting.model.js";

const verifyGoogleIdToken = async (credential) => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
        throw new Error("GOOGLE_CLIENT_ID is not configured on the backend");
    }

    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!response.ok) {
        throw new Error("Invalid Google sign-in token");
    }

    const payload = await response.json();
    if (payload.aud !== googleClientId) {
        throw new Error("Google token audience does not match this app");
    }

    if (payload.email_verified !== "true" && payload.email_verified !== true) {
        throw new Error("Google email is not verified");
    }

    return payload;
}

const verifyGoogleAccessToken = async (accessToken) => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
        throw new Error("GOOGLE_CLIENT_ID is not configured on the backend");
    }

    const tokenResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
    if (!tokenResponse.ok) {
        throw new Error("Invalid Google access token");
    }

    const tokenPayload = await tokenResponse.json();
    if (tokenPayload.aud !== googleClientId) {
        throw new Error("Google token audience does not match this app");
    }

    const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!userResponse.ok) {
        throw new Error("Unable to read Google profile");
    }

    const profile = await userResponse.json();
    if (profile.email_verified !== "true" && profile.email_verified !== true) {
        throw new Error("Google email is not verified");
    }

    return profile;
}

const login = async (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Please Provide" })
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User Not Found" })
        }


        let isPasswordCorrect = await bcrypt.compare(password, user.password)

        if (isPasswordCorrect) {
            let token = crypto.randomBytes(20).toString("hex");

            user.token = token;
            await user.save();
            return res.status(httpStatus.OK).json({ token: token })
        } else {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid Username or password" })
        }

    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` })
    }
}

const googleLogin = async (req, res) => {
    const { credential, accessToken } = req.body;

    if (!credential && !accessToken) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Google credential is required" });
    }

    try {
        const googleUser = credential
            ? await verifyGoogleIdToken(credential)
            : await verifyGoogleAccessToken(accessToken);
        const username = googleUser.email.toLowerCase();

        let user = await User.findOne({ username });
        const token = crypto.randomBytes(20).toString("hex");

        if (!user) {
            const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
            user = new User({
                name: googleUser.name || username.split("@")[0],
                username,
                password: randomPassword,
                profilePhoto: googleUser.picture || "",
                token
            });
        } else {
            user.token = token;
            if (!user.profilePhoto && googleUser.picture) user.profilePhoto = googleUser.picture;
            if (!user.name && googleUser.name) user.name = googleUser.name;
        }

        await user.save();

        return res.status(httpStatus.OK).json({ token });
    } catch (e) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: e.message || "Google login failed" });
    }
}


const register = async (req, res) => {
    const { name, username, password } = req.body;


    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(httpStatus.FOUND).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name,
            username: username,
            password: hashedPassword
        });

        await newUser.save();

        res.status(httpStatus.CREATED).json({ message: "User Registered" })

    } catch (e) {
        res.json({ message: `Something went wrong ${e}` })
    }

}


const getUserHistory = async (req, res) => {
    const { token } = req.query;

    try {
        const user = await User.findOne({ token: token });
        const meetings = await Meeting.find({ user_id: user.username })
        res.json(meetings)
    } catch (e) {
        res.json({ message: `Something went wrong ${e}` })
    }
}

const addToHistory = async (req, res) => {
    const { token, meeting_code, summary } = req.body;

    try {
        const user = await User.findOne({ token: token });

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code,
            summary: summary
        })

        await newMeeting.save();

        res.status(httpStatus.CREATED).json({ message: "Added code to history" })
    } catch (e) {
        res.json({ message: `Something went wrong ${e}` })
    }
}

const getUserProfile = async (req, res) => {
    const { token } = req.query;

    try {
        const user = await User.findOne({ token });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" })
        }

        return res.status(httpStatus.OK).json({
            name: user.name,
            username: user.username,
            about: user.about,
            profilePhoto: user.profilePhoto
        })
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` })
    }
}

const updateUserProfile = async (req, res) => {
    const { token, name, about, profilePhoto } = req.body;

    try {
        const user = await User.findOne({ token });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" })
        }

        if (name !== undefined) user.name = name;
        if (about !== undefined) user.about = about;
        if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;

        await user.save();

        return res.status(httpStatus.OK).json({
            message: "Profile updated",
            profile: {
                name: user.name,
                username: user.username,
                about: user.about,
                profilePhoto: user.profilePhoto
            }
        })
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` })
    }
}

const scheduleMeeting = async (req, res) => {
    const { token, meetingCode, topic, guestEmail, guestPhone, scheduledAt } = req.body;

    if (!meetingCode || !scheduledAt) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Meeting code and scheduled time are required" });
    }

    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid scheduled time" });
    }

    try {
        const user = token ? await User.findOne({ token }) : null;

        const scheduledMeeting = await ScheduledMeeting.findOneAndUpdate(
            { meetingCode },
            {
                meetingCode,
                topic: topic || "MeetSpace meeting",
                guestEmail: guestEmail || "",
                guestPhone: guestPhone || "",
                scheduledAt: scheduledDate,
                createdBy: user?.username || ""
            },
            { new: true, upsert: true, runValidators: true }
        );

        return res.status(httpStatus.OK).json({
            message: "Meeting scheduled",
            meeting: scheduledMeeting
        });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` });
    }
}

const checkMeetingAccess = async (req, res) => {
    const { meetingCode } = req.params;

    try {
        const scheduledMeeting = await ScheduledMeeting.findOne({ meetingCode });
        if (!scheduledMeeting) {
            return res.status(httpStatus.OK).json({ allowed: true, scheduled: false });
        }

        const now = new Date();
        const allowed = now >= scheduledMeeting.scheduledAt;

        return res.status(httpStatus.OK).json({
            allowed,
            scheduled: true,
            topic: scheduledMeeting.topic,
            scheduledAt: scheduledMeeting.scheduledAt,
            createdBy: scheduledMeeting.createdBy,
            message: allowed
                ? "Meeting is open"
                : "This meeting is not open yet"
        });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong ${e}` });
    }
}

export { login, googleLogin, register, getUserHistory, addToHistory, getUserProfile, updateUserProfile, scheduleMeeting, checkMeetingAccess }
