const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const meetingAPIRoutes = require("./routes/meetingRoutes").router;
const meetingsDB = require("./routes/meetingRoutes").meetings;
const { mockOpeaSTT } = require("./services/opeaMockServices");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite's default port
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
app.use("/api/meetings", meetingAPIRoutes);

app.get("/", (req, res) =>
  res.send("IntelliMeet OPEA Backend (Vite Edition) is running!")
);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.on("joinMeeting", (meetingId) => {
    socket.join(meetingId);
    console.log(`User ${socket.id} joined meeting: ${meetingId}`);
    if (meetingsDB[meetingId])
      socket.emit("meetingState", meetingsDB[meetingId]);
  });

  socket.on("audioActivity", async ({ meetingId, audioDataReference }) => {
    if (!meetingsDB[meetingId])
      return socket.emit("opeaError", {
        message: `Meeting ${meetingId} not found.`,
      });
    try {
      const transcriptChunks = await mockOpeaSTT(audioDataReference);
      meetingsDB[meetingId].transcript.push(...transcriptChunks);
      io.to(meetingId).emit("transcriptUpdate", transcriptChunks);
    } catch (error) {
      socket.emit("opeaError", {
        message: "STT Error",
        details: error.message,
      });
    }
  });
  socket.on("disconnect", () => console.log("User disconnected:", socket.id));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () =>
  console.log(`Backend server listening on port ${PORT}`)
);
