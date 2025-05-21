// const express = require("express");
// const http = require("http");
// const { Server } = require("socket.io");
// const cors = require("cors");
// const meetingAPIRoutes = require("./routes/meetingRoutes").router;
// const meetingsDB = require("./routes/meetingRoutes").meetings;
// const { mockOpeaSTT } = require("./services/opeaMockServices");

// const app = express();
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:5173", // Vite's default port
//     methods: ["GET", "POST"],
//   },
// });

// app.use(cors());
// app.use(express.json());
// app.use("/api/meetings", meetingAPIRoutes);

// app.get("/", (req, res) =>
//   res.send("IntelliMeet OPEA Backend (Vite Edition) is running!")
// );

// io.on("connection", (socket) => {
//   console.log("User connected:", socket.id);
//   socket.on("joinMeeting", (meetingId) => {
//     socket.join(meetingId);
//     console.log(`User ${socket.id} joined meeting: ${meetingId}`);
//     if (meetingsDB[meetingId])
//       socket.emit("meetingState", meetingsDB[meetingId]);
//   });

//   socket.on("audioActivity", async ({ meetingId, audioDataReference }) => {
//     if (!meetingsDB[meetingId])
//       return socket.emit("opeaError", {
//         message: `Meeting ${meetingId} not found.`,
//       });
//     try {
//       const transcriptChunks = await mockOpeaSTT(audioDataReference);
//       meetingsDB[meetingId].transcript.push(...transcriptChunks);
//       io.to(meetingId).emit("transcriptUpdate", transcriptChunks);
//     } catch (error) {
//       socket.emit("opeaError", {
//         message: "STT Error",
//         details: error.message,
//       });
//     }
//   });
//   socket.on("disconnect", () => console.log("User disconnected:", socket.id));
// });

// const PORT = process.env.PORT || 3001;
// server.listen(PORT, () =>
//   console.log(`Backend server listening on port ${PORT}`)
// );
// backend/src/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors"); // For Express CORS
const meetingAPIRoutes = require("./routes/meetingRoutes").router;
const meetingsDB = require("./routes/meetingRoutes").meetings; // This will reference your in-memory store
const { mockOpeaSTT } = require("./services/opeaMockServices"); // Ensure this path is correct

const app = express();
const server = http.createServer(app);

// Socket.IO CORS Configuration
const allowedOrigins = [
  "http://localhost:5173", // For your local Vite development server
  "https://front-meeting-opea-uvr3.vercel.app", // Your deployed Vercel frontend URL
  // Add any other domains here if you have them
];

// You can also set an environment variable on Render
if (
  process.env.FRONTEND_URL &&
  !allowedOrigins.includes(process.env.FRONTEND_URL)
) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
console.log("Allowed origins for Socket.IO:", allowedOrigins);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        console.error(msg, "Origin:", origin);
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST"],
    // credentials: true, // Set to true if you are sending cookies or authorization headers
  },
});

// Express CORS (for HTTP requests)
// It's good to make this more specific too, but for now, this is okay if Socket.IO is configured correctly
app.use(cors({ origin: allowedOrigins })); // Use the same origins for Express

app.use(express.json());
app.use("/api/meetings", meetingAPIRoutes);

app.get("/", (req, res) => res.send("IntelliMeet OPEA Backend is running!"));

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinMeeting", (meetingId) => {
    socket.join(meetingId);
    console.log(`User ${socket.id} joined meeting: ${meetingId}`);
    if (meetingsDB[meetingId]) {
      // Use meetingsDB
      socket.emit("meetingState", meetingsDB[meetingId]);
    } else {
      console.warn(`Meeting ${meetingId} not found during joinMeeting.`);
    }
  });

  socket.on("audioActivity", async ({ meetingId, audioDataReference }) => {
    if (!meetingsDB[meetingId]) {
      // Use meetingsDB
      console.warn(`Meeting ${meetingId} not found for audio activity.`);
      return socket.emit("opeaError", {
        message: `Meeting ${meetingId} not found for audio activity.`,
      });
    }
    try {
      const transcriptChunks = await mockOpeaSTT(audioDataReference);
      if (meetingsDB[meetingId].transcript) {
        // Ensure the transcript array exists
        meetingsDB[meetingId].transcript.push(...transcriptChunks);
      } else {
        meetingsDB[meetingId].transcript = [...transcriptChunks]; // Initialize it if not
      }
      io.to(meetingId).emit("transcriptUpdate", transcriptChunks);
    } catch (error) {
      console.error("STT Error:", error);
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
