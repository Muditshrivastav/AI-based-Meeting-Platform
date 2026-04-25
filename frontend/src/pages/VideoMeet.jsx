import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom';
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

    let localVideoref = useRef();
    const navigate = useNavigate();

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

    let [newMessages, setNewMessages] = useState(3);

    let [username] = useState("Guest");

    const videoRef = useRef([])

    let [videos, setVideos] = useState([])

    // TODO
    // if(isChrome() === false) {


    // }

    useEffect(() => {
        getPermissions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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

    let getDislayMedia = async () => {
        if (!screen || !navigator.mediaDevices.getDisplayMedia) return;
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            getDislayMediaSuccess(displayStream);
        } catch (e) {
            console.log(e);
            setScreen(false);
        }
    }

    const getPermissions = async () => {
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
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .then((stream) => { })
                .catch((e) => console.log(e))
        } else {
            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { }
        }
    }





    let getDislayMediaSuccess = (stream) => {
        try {
            stopStreamTracks(window.localStream);
        } catch (e) { console.log(e) }

        window.localStream = stream;
        screenStreamRef.current = stream;
        localVideoref.current.srcObject = stream;
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
        socketRef.current = io.connect(server_url, { secure: false })

        socketRef.current.on('signal', gotMessageFromServer)

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href)
            socketIdRef.current = socketRef.current.id

            socketRef.current.on('chat-message', addMessage)

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
            })

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {

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
    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
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
                if (audio) {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                    getUserMediaSuccess(stream);
                }
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
                const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
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
            setScreen(true);
            await getDislayMedia();
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
        socketRef.current.emit('chat-message', message, username)
        setMessage("");

        // this.setState({ message: "", sender: username })
    }

    
    return (
        <div>
            <div className={styles.meetVideoContainer}>

                    {showModal ? <div className={styles.chatRoom}>

                        <div className={styles.chatContainer}>
                            <h1>Chat</h1>

                            <div className={styles.chattingDisplay}>

                                {messages.length !== 0 ? messages.map((item, index) => {

                                    console.log(messages)
                                    return (
                                        <div style={{ marginBottom: "20px" }} key={index}>
                                            <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                                            <p>{item.data}</p>
                                        </div>
                                    )
                                }) : <p>No Messages Yet</p>}


                            </div>

                            <div className={styles.chattingArea}>
                                <TextField value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" label="Enter Your chat" variant="outlined" />
                                <Button variant='contained' onClick={sendMessage}>Send</Button>
                            </div>


                        </div>
                    </div> : <></>}


                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} style={{ color: "white" }}>
                            {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={handleEndCall} style={{ color: "red" }}>
                            <CallEndIcon  />
                        </IconButton>
                        <IconButton onClick={handleAudio} style={{ color: "white" }}>
                            {audio === true ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        {screenAvailable === true ?
                            <IconButton onClick={handleScreen} style={{ color: "white" }}>
                                {screen === true ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton> : <></>}

                        <Badge badgeContent={newMessages} max={999} color='orange'>
                            <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
                                <ChatIcon />                        </IconButton>
                        </Badge>

                    </div>


                    <video
                        className={videos.length === 0 ? (showModal ? styles.meetUserVideoFullWithChat : styles.meetUserVideoFull) : styles.meetUserVideo}
                        ref={localVideoref}
                        autoPlay
                        muted
                        style={{ display: video ? 'block' : 'none' }}
                    ></video>

                    <div className={styles.conferenceView}>
                        {videos.map((video) => (
                            <div key={video.socketId}>
                                <video

                                    data-socket={video.socketId}
                                    ref={ref => {
                                        if (ref && video.stream) {
                                            ref.srcObject = video.stream;
                                        }
                                    }}
                                    autoPlay
                                >
                                </video>
                            </div>

                        ))}

                    </div>

                </div>

            

        </div>
    )
}
