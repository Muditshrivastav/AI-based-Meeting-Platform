import axios from "axios";
import httpStatus from "http-status";
import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";


export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${server}/api/v1/users`
})

const getProfilePhotoKey = (username) => `profilePhoto:${username}`;
const CURRENT_PROFILE_PHOTO_KEY = "profilePhoto:current";

const mergeLocalProfilePhoto = (profile) => {
    if (!profile?.username) return profile;

    const localPhoto = localStorage.getItem(getProfilePhotoKey(profile.username)) || localStorage.getItem(CURRENT_PROFILE_PHOTO_KEY);
    if (!profile.profilePhoto && localPhoto) {
        return { ...profile, profilePhoto: localPhoto };
    }

    return profile;
}

export const AuthProvider = ({ children }) => {

    const [userData, setUserData] = useState(null);

    const router = useNavigate();

    const handleRegister = async (name, username, password) => {
        try {
            let request = await client.post("/register", {
                name: name,
                username: username,
                password: password
            })

            if (request.status === httpStatus.CREATED) {
                return request.data.message;
            }
        } catch (err) {
            throw err;
        }
    }

    const getUserProfile = async () => {
        try {
            const request = await client.get("/profile", {
                params: {
                    token: localStorage.getItem("token")
                }
            });
            const profile = mergeLocalProfilePhoto(request.data);
            setUserData(profile);
            return profile;
        } catch (err) {
            throw err;
        }
    }

    const updateUserProfile = async (profileData) => {
        try {
            const request = await client.post("/update_profile", {
                token: localStorage.getItem("token"),
                ...profileData
            });
            if (request.status === httpStatus.OK) {
                if (profileData.profilePhoto !== undefined && request.data.profile?.username) {
                    if (profileData.profilePhoto) {
                        localStorage.setItem(getProfilePhotoKey(request.data.profile.username), profileData.profilePhoto);
                        localStorage.setItem(CURRENT_PROFILE_PHOTO_KEY, profileData.profilePhoto);
                    } else {
                        localStorage.removeItem(getProfilePhotoKey(request.data.profile.username));
                        localStorage.removeItem(CURRENT_PROFILE_PHOTO_KEY);
                    }
                }
                setUserData(mergeLocalProfilePhoto({
                    ...request.data.profile,
                    profilePhoto: request.data.profile?.profilePhoto || profileData.profilePhoto || ""
                }));
            }
            return request.data;
        } catch (err) {
            throw err;
        }
    }

    const handleLogin = async (username, password) => {
        try {
            let request = await client.post("/login", {
                username: username,
                password: password
            });

            if (request.status === httpStatus.OK) {
                localStorage.setItem("token", request.data.token);
                await getUserProfile();
                router("/home")
            }
        } catch (err) {
            throw err;
        }
    }

    const getHistoryOfUser = async () => {
        try {
            let request = await client.get("/get_all_activity", {
                params: {
                    token: localStorage.getItem("token")
                }
            });
            return request.data
        } catch (err) {
            throw err;
        }
    }

    const addToUserHistory = async (meetingCode) => {
        try {
            let request = await client.post("/add_to_activity", {
                token: localStorage.getItem("token"),
                meeting_code: meetingCode
            });
            return request
        } catch (e) {
            throw e;
        }
    }

    useEffect(() => {
        if (localStorage.getItem("token")) {
            getUserProfile().catch(() => {
                localStorage.removeItem("token");
            });
        }
    }, []);

    const data = {
        userData,
        setUserData,
        addToUserHistory,
        getHistoryOfUser,
        handleRegister,
        handleLogin,
        getUserProfile,
        updateUserProfile
    }

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    )

}
