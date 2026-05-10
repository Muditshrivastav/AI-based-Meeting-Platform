import { Server } from "socket.io"


let connections = {}
let messages = {}
let timeOnline = {}
let meta = {} // Store { name, isHost } for each socket.id

export const connectToSocket = (server) => {
    const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });


    io.on("connection", (socket) => {

        console.log("SOMETHING CONNECTED")

        socket.on("join-call", (path, name, isHost) => {

            if (connections[path] === undefined) {
                connections[path] = []
            }
            if (!connections[path].includes(socket.id)) {
                connections[path].push(socket.id)
            }

            timeOnline[socket.id] = new Date();
            meta[socket.id] = { name: name || "Guest", isHost: !!isHost };

            for (let a = 0; a < connections[path].length; a++) {
                const targetId = connections[path][a];
                
                // For everyone in the room:
                // Send the metadata of all participants in the room
                const participantsMeta = connections[path].map(id => ({
                    socketId: id,
                    name: meta[id]?.name || "Guest",
                    isHost: meta[id]?.isHost || false
                }));

                io.to(targetId).emit("user-joined", socket.id, connections[path], participantsMeta);
            }

            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'],
                        messages[path][a]['sender'], messages[path][a]['socket-id-sender'])
                }
            }

        })

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        socket.on("chat-message", (data, sender) => {

            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {


                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }

                    return [room, isFound];

                }, ['', false]);

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = []
                }

                messages[matchingRoom].push({ 'sender': sender, "data": data, "socket-id-sender": socket.id })
                console.log("message", matchingRoom, ":", sender, data)

                new Set(connections[matchingRoom]).forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id)
                })
            }

        })

        socket.on("transcription-chunk", (data, sender) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found === true) {
                new Set(connections[matchingRoom]).forEach((elem) => {
                    if (elem !== socket.id) { // Don't send back to self
                        io.to(elem).emit("transcription-chunk", data, sender, socket.id)
                    }
                })
            }
        })

        socket.on("disconnect", () => {

            var diffTime = Math.abs(timeOnline[socket.id] - new Date())

            var key

            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {

                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        key = k

                        for (let a = 0; a < connections[key].length; ++a) {
                            io.to(connections[key][a]).emit('user-left', socket.id)
                        }

                        var index = connections[key].indexOf(socket.id)

                        connections[key].splice(index, 1)
                        delete meta[socket.id];


                        if (connections[key].length === 0) {
                            delete connections[key]
                        }
                    }
                }

            }


        })


    })


    return io;
}
