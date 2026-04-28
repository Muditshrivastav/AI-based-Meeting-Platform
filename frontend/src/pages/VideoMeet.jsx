import React, { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import io from "socket.io-client";
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import server from '../environment';
import { AuthContext } from '../contexts/AuthContext';

const server_url = server;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}

export default function VideoMeetComponent() {

    var socketRef = useRef();
    let socketIdRef = useRef();
    const setupRunRef = useRef(0);
    const { userData, getUserProfile } = useContext(AuthContext);
    const profilePhotoRef = useRef(localStorage.getItem('profilePhoto:current') || "");
    const usernameRef = useRef("Guest");
    const { url: meetingCode } = useParams();

    let localVideoref = useRef();
    const navigate = useNavigate();
    const [meetingAccess, setMeetingAccess] = useState({ status: 'checking' });

    let [videoAvailable, setVideoAvailable] = useState(true);

    let [audioAvailable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState(false);

    let [audio, setAudio] = useState(false);

    let [screen, setScreen] = useState(false);
    const screenStreamRef = useRef(null);

    let [showModal, setModal] = useState(true);

    let [screenAvailable, setScreenAvailable] = useState();

    let [messages, setMessages] = useState([])

    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState(0);

    let [username, setUsername] = useState("Guest");

    const videoRef = useRef([])

    let [videos, setVideos] = useState([])

    // TODO
    // if(isChrome() === false) {


    // }

    useEffect(() => {
        const setupRun = setupRunRef.current + 1;
        setupRunRef.current = setupRun;

        const prepareMeeting = async () => {
            const access = await checkScheduledMeetingAccess();
            if (setupRunRef.current !== setupRun) return;

            setMeetingAccess(access);
            if (!access.allowed) return;

            try {
                const profile = await getUserProfile?.();
                const displayName = profile?.name || profile?.username || "Guest";
                const savedPhoto = profile?.profilePhoto || localStorage.getItem(`profilePhoto:${profile?.username}`) || localStorage.getItem('profilePhoto:current') || "";

                setUsername(displayName);
                usernameRef.current = displayName;
                profilePhotoRef.current = savedPhoto;
            } catch (e) {
                profilePhotoRef.current = localStorage.getItem('profilePhoto:current') || "";
            }

            if (setupRunRef.current === setupRun) {
                getPermissions(setupRun);
            }
        }

        prepareMeeting();

        return () => {
            setupRunRef.current += 1;
            if (socketRef.current) {
                socketRef.current.off('signal', gotMessageFromServer);
                socketRef.current.off('chat-message', addMessage);
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            Object.values(connections).forEach((connection) => {
                try {
                    connection.close();
                } catch (e) { }
            });
            connections = {};
            videoRef.current = [];
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const checkScheduledMeetingAccess = async () => {
        const localSchedule = getLocalScheduledMeeting();

        try {
            const response = await fetch(`${server_url}/api/v1/users/meeting_access/${meetingCode}`);
            if (response.ok) {
                const data = await response.json();
                return {
                    status: 'ready',
                    allowed: data.allowed,
                    scheduled: data.scheduled,
                    topic: data.topic,
                    scheduledAt: data.scheduledAt
                };
            }
        } catch (e) {
            console.log("meeting access check failed", e);
        }

        if (localSchedule?.scheduledAt) {
            const allowed = new Date() >= new Date(localSchedule.scheduledAt);
            return {
                status: 'ready',
                allowed,
                scheduled: true,
                topic: localSchedule.topic,
                scheduledAt: localSchedule.scheduledAt
            };
        }

        return { status: 'ready', allowed: true, scheduled: false };
    }

    const getLocalScheduledMeeting = () => {
        try {
            return JSON.parse(localStorage.getItem(`scheduledMeeting:${meetingCode}`) || 'null');
        } catch (e) {
            return null;
        }
    }

    const stopStreamTracks = (stream) => {
        if (!stream) return;
        try {
            stream.getTracks().forEach((track) => track.stop());
        } catch (e) {
            console.log("stopStreamTracks error", e);
        }
    }

    const replaceStreamOnConnections = (stream) => {
        for (let id in connections) {
            if (id === socketIdRef.current) continue;
            const pc = connections[id];
            if (!pc) continue;
            try {
                const senders = pc.getSenders ? pc.getSenders() : [];
                stream.getTracks().forEach((track) => {
                    const sender = senders.find(
                        (s) => s.track && s.track.kind === track.kind
                    );
                    if (sender && sender.replaceTrack) {
                        sender.replaceTrack(track).catch(() => {
                            pc.addTrack(track, stream);
                        });
                    } else {
                        pc.addTrack(track, stream);
                    }
                });
            } catch (error) {
                console.log("replaceStreamOnConnections error", error);
            }
        }
    }

    let getDisplayMedia = async () => {
        if (!navigator.mediaDevices.getDisplayMedia) return;
        try {
            let displayStream;
            try {
                displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            } catch (error) {
                displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            }
            getDisplayMediaSuccess(displayStream);
            setScreen(true);
        } catch (e) {
            console.log(e);
            setScreen(false);
        }
    }

    const getPermissions = async (setupRun) => {
        try {
            let videoOk = false;
            let audioOk = false;

            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoOk = true;
                videoStream.getTracks().forEach((track) => track.stop());
            } catch (error) {
                videoOk = false;
            }

            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioOk = true;
                audioStream.getTracks().forEach((track) => track.stop());
            } catch (error) {
                audioOk = false;
            }

            setVideoAvailable(videoOk);
            setAudioAvailable(audioOk);
            setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

            await getMedia(videoOk, audioOk);
            if (setupRunRef.current !== setupRun) return;
            connectToSocketServer();
        } catch (error) {
            console.log(error);
        }
    };

    let getMedia = async (videoOn = videoAvailable, audioOn = audioAvailable) => {
        setVideo(videoOn);
        setAudio(audioOn);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: videoOn, audio: audioOn });
            getUserMediaSuccess(stream);
        } catch (e) {
            console.log('getMedia error', e);
        }
    }




    let getUserMediaSuccess = (stream) => {
        const oldStream = window.localStream;
        for (let id in connections) {
            if (id === socketIdRef.current) continue;
            try {
                if (oldStream && connections[id].removeStream) {
                    connections[id].removeStream(oldStream);
                }
            } catch (e) {
                console.log("removeStream error", e);
            }
        }

        try {
            if (oldStream) {
                oldStream.getTracks().forEach(track => track.stop())
            }
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                console.log(description)
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream

            for (let id in connections) {
                connections[id].addStream(window.localStream)

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
            }
        })
    }

    let getUserMedia = () => {
        if (!video) {
            return createAvatarStream(audio)
                .then(getUserMediaSuccess)
                .catch((e) => console.log(e));
        }

        if ((video && videoAvailable) || (audio && audioAvailable)) {
            return navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .then((stream) => { })
                .catch((e) => console.log(e))
        } else {
            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { }
            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream
            replaceStreamOnConnections(window.localStream);
            return Promise.resolve();
        }
    }





    let getDisplayMediaSuccess = (stream) => {
        try {
            stopStreamTracks(window.localStream);
        } catch (e) { console.log(e) }

        window.localStream = stream;
        screenStreamRef.current = stream;
        localVideoref.current.srcObject = stream;
        localVideoref.current.play().catch((e) => console.log("screen preview play error", e));
        replaceStreamOnConnections(stream);

        stream.getVideoTracks().forEach(track => {
            track.onended = async () => {
                setScreen(false);
                screenStreamRef.current = null;
                stopStreamTracks(stream);
                await getUserMedia();
            }
        });
    }

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }

    let connectToSocketServer = () => {
        if (socketRef.current) {
            socketRef.current.off('signal', gotMessageFromServer);
            socketRef.current.off('chat-message', addMessage);
            socketRef.current.disconnect();
        }

        socketRef.current = io.connect(server_url, {
            secure: window.location.protocol === "https:"
        })

        socketRef.current.on('signal', gotMessageFromServer)

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href)
            socketIdRef.current = socketRef.current.id
            setVideos((videos) => {
                const filteredVideos = videos.filter((video) => video.socketId !== socketIdRef.current);
                videoRef.current = filteredVideos;
                return filteredVideos;
            });

            socketRef.current.on('chat-message', addMessage)

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => {
                    const filteredVideos = videos.filter((video) => video.socketId !== id);
                    videoRef.current = filteredVideos;
                    return filteredVideos;
                })
            })

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {
                    if (socketListId === socketIdRef.current) {
                        return;
                    }

                    if (connections[socketListId]) {
                        return;
                    }
                    
                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections)
                    // Wait for their ice candidate       
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                        }
                    }

                    // Wait for their video stream
                    connections[socketListId].onaddstream = (event) => {
                        console.log("BEFORE:", videoRef.current);
                        console.log("FINDING ID: ", socketListId);

                        let videoExists = videoRef.current.find(video => video.socketId === socketListId);

                        if (videoExists) {
                            console.log("FOUND EXISTING");

                            // Update the stream of the existing video
                            setVideos(videos => {
                                const updatedVideos = videos.map(video =>
                                    video.socketId === socketListId ? { ...video, stream: event.stream } : video
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            // Create a new video
                            console.log("CREATING NEW");
                            let newVideo = {
                                socketId: socketListId,
                                stream: event.stream,
                                autoplay: true,
                                playsinline: true
                            };

                            setVideos(videos => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        }
                    };


                    // Add the local video stream
                    if (window.localStream !== undefined && window.localStream !== null) {
                        connections[socketListId].addStream(window.localStream)
                    } else {
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()])
                        window.localStream = blackSilence()
                        connections[socketListId].addStream(window.localStream)
                    }
                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue

                        try {
                            connections[id2].addStream(window.localStream)
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                                })
                                .catch(e => console.log(e))
                        })
                    }
                }
            })
        })
    }

    let silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }

    const getInitials = () => {
        return (userData?.name || usernameRef.current || username || "Guest")
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }

    const getProfilePhoto = () => {
        return profilePhotoRef.current || userData?.profilePhoto || localStorage.getItem(`profilePhoto:${userData?.username}`) || localStorage.getItem('profilePhoto:current') || "";
    }

    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        const context = canvas.getContext('2d');

        const drawFallback = () => {
            const gradient = context.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, "#1a73e8");
            gradient.addColorStop(1, "#0f172a");
            context.fillStyle = gradient;
            context.fillRect(0, 0, width, height);
            context.beginPath();
            context.arc(width / 2, height / 2, Math.min(width, height) * 0.18, 0, Math.PI * 2);
            context.fillStyle = "rgba(255,255,255,0.16)";
            context.fill();
            context.fillStyle = "#ffffff";
            context.font = `700 ${Math.floor(width * 0.11)}px Arial`;
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(getInitials(), width / 2, height / 2);
        }

        drawFallback();

        const profilePhoto = getProfilePhoto();
        if (profilePhoto) {
            const image = new Image();
            image.onload = () => {
                drawFallback();
                const avatarSize = Math.min(width, height) * 0.46;
                const x = (width - avatarSize) / 2;
                const y = (height - avatarSize) / 2;
                context.save();
                context.beginPath();
                context.arc(width / 2, height / 2, avatarSize / 2, 0, Math.PI * 2);
                context.clip();
                context.drawImage(image, x, y, avatarSize, avatarSize);
                context.restore();
            };
            image.src = profilePhoto;
        }

        let stream = canvas.captureStream(10)
        return stream.getVideoTracks()[0]
    }

    const createAvatarStream = async (includeAudio = audio) => {
        const tracks = [black()];

        if (includeAudio && audioAvailable) {
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                tracks.push(...audioStream.getAudioTracks());
            } catch (e) {
                tracks.push(silence());
            }
        } else {
            tracks.push(silence());
        }

        return new MediaStream(tracks);
    }

    let handleVideo = async () => {
        const newVideo = !video;
        setVideo(newVideo);

        try {
            if (newVideo) {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio });
                getUserMediaSuccess(stream);
            } else {
                if (window.localStream) {
                    window.localStream.getVideoTracks().forEach((track) => track.stop());
                }
                const stream = await createAvatarStream(audio);
                getUserMediaSuccess(stream);
            }
        } catch (e) {
            console.log("handleVideo error", e);
        }
    }

    let handleAudio = async () => {
        const newAudio = !audio;
        setAudio(newAudio);

        try {
            if (newAudio) {
                const stream = video
                    ? await navigator.mediaDevices.getUserMedia({ video, audio: true })
                    : await createAvatarStream(true);
                getUserMediaSuccess(stream);
            } else {
                if (window.localStream) {
                    window.localStream.getAudioTracks().forEach((track) => track.stop());
                }
                if (video) {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                    getUserMediaSuccess(stream);
                }
            }
        } catch (e) {
            console.log("handleAudio error", e);
        }
    }

    let handleScreen = async () => {
        if (!screen) {
            await getDisplayMedia();
        } else {
            setScreen(false);
            if (screenStreamRef.current) {
                stopStreamTracks(screenStreamRef.current);
                screenStreamRef.current = null;
            }
            await getUserMedia();
        }
    }

    let handleEndCall = async () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { }

        const meetingText = messages.map((item) => `${item.sender}: ${item.data}`).join("\n");
        if (meetingText) {
            try {
                const response = await fetch(`${server_url}/api/v1/summarize`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ meetingText })
                });
                const data = await response.json();
                alert(`Meeting summary:\n\n${data.summary || "No summary returned."}`);
            } catch (err) {
                console.error(err);
                alert("Failed to summarize the meeting. Please try again later.");
            }
        }

        navigate("/lobby");
    }


    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };



    let sendMessage = () => {
        console.log(socketRef.current);
        if (!message.trim()) return;
        socketRef.current.emit('chat-message', message, username)
        setMessage("");

        // this.setState({ message: "", sender: username })
    }

    
    const toggleChat = () => {
        setModal(!showModal);
        if (!showModal) {
            setNewMessages(0);
        }
    }

    if (meetingAccess.status === 'checking') {
        return (
            <div className={styles.accessGate}>
                <div className={styles.accessCard}>
                    <p className={styles.roomLabel}>Checking meeting</p>
                    <h1>Please wait...</h1>
                    <p>We are verifying whether this scheduled meeting is open.</p>
                </div>
            </div>
        );
    }

    if (meetingAccess.allowed === false) {
        const scheduledText = meetingAccess.scheduledAt
            ? new Date(meetingAccess.scheduledAt).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })
            : 'the scheduled time';

        return (
            <div className={styles.accessGate}>
                <div className={styles.accessCard}>
                    <p className={styles.roomLabel}>Meeting not open yet</p>
                    <h1>{meetingAccess.topic || 'Scheduled meeting'}</h1>
                    <p>This meeting link will open on <strong>{scheduledText}</strong>.</p>
                    <button type="button" onClick={() => navigate('/home')}>
                        Back to home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className={styles.meetVideoContainer}>

                    {showModal ? <div className={styles.chatRoom}>

                        <div className={styles.chatContainer}>
                            <div className={styles.chatHeader}>
                                <div>
                                    <h1>Meeting chat</h1>
                                    <p>Messages sent here are visible to everyone.</p>
                                </div>
                                <button type="button" onClick={toggleChat} className={styles.closeChatButton}>
                                    ×
                                </button>
                            </div>

                            <div className={styles.chattingDisplay}>

                                {messages.length !== 0 ? messages.map((item, index) => {

                                    console.log(messages)
                                    return (
                                        <div className={styles.chatMessage} key={index}>
                                            <p className={styles.chatSender}>{item.sender}</p>
                                            <p>{item.data}</p>
                                        </div>
                                    )
                                }) : <div className={styles.emptyChat}>
                                    <ChatIcon />
                                    <p>No messages yet</p>
                                    <span>Start the conversation with your participants.</span>
                                </div>}


                            </div>

                            <div className={styles.chattingArea}>
                                <TextField
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            sendMessage();
                                        }
                                    }}
                                    size="small"
                                    fullWidth
                                    label="Send a message"
                                    variant="outlined"
                                />
                                <Button variant='contained' onClick={sendMessage} sx={{ borderRadius: 3, px: 2.5, textTransform: 'none', fontWeight: 700 }}>Send</Button>
                            </div>


                        </div>
                    </div> : <></>}


                    <div className={styles.roomHeader}>
                        <div>
                            <p className={styles.roomLabel}>Live meeting</p>
                            <h2>MeetSpace room</h2>
                        </div>
                        <div className={styles.roomStatus}>
                            <span></span>
                            Connected
                        </div>
                    </div>


                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} className={styles.controlButton}>
                            {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={handleEndCall} className={`${styles.controlButton} ${styles.endCallButton}`}>
                            <CallEndIcon  />
                        </IconButton>
                        <IconButton onClick={handleAudio} className={styles.controlButton}>
                            {audio === true ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        {screenAvailable === true ?
                            <IconButton onClick={handleScreen} className={styles.controlButton}>
                                {screen === true ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton> : <></>}

                        <Badge badgeContent={newMessages} max={999} color='primary'>
                            <IconButton onClick={toggleChat} className={`${styles.controlButton} ${showModal ? styles.activeControlButton : ''}`}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>

                    </div>


                    <video
                        className={videos.length === 0 ? (showModal ? styles.meetUserVideoFullWithChat : styles.meetUserVideoFull) : styles.meetUserVideo}
                        ref={localVideoref}
                        autoPlay
                        muted
                        playsInline
                        style={{ display: 'block' }}
                    ></video>

                    <div className={styles.conferenceView}>
                        {videos.map((video) => (
                            <div className={styles.remoteVideoTile} key={video.socketId}>
                                <video

                                    data-socket={video.socketId}
                                    ref={ref => {
                                        if (ref && video.stream) {
                                            ref.srcObject = video.stream;
                                        }
                                    }}
                                    autoPlay
                                    playsInline
                                >
                                </video>
                                <span>Participant</span>
                            </div>

                        ))}

                    </div>

                </div>

            

        </div>
    )
}
