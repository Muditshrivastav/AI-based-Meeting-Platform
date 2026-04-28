import { Router } from "express";
import { addToHistory, checkMeetingAccess, getUserHistory, login, register, getUserProfile, scheduleMeeting, updateUserProfile } from "../controllers/user.controller.js";


const router = Router();

router.route("/login").post(login)
router.route("/register").post(register)
router.route("/add_to_activity").post(addToHistory)
router.route("/get_all_activity").get(getUserHistory)
router.route("/profile").get(getUserProfile)
router.route("/update_profile").post(updateUserProfile)
router.route("/schedule_meeting").post(scheduleMeeting)
router.route("/meeting_access/:meetingCode").get(checkMeetingAccess)

export default router;
