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
const meetingsDB = require("./routes/meetingRoutes").meetings;
const { mockOpeaSTT } = require("./services/opeaMockServices");

const app = express();
const server = http.createServer(app);

// --- BEGIN UPDATED CORS CONFIGURATION ---

const allowedOrigins = [
  "http://localhost:5173",
  "https://front-meeting-opea-uvr3.vercel.app", // Your main production frontend
  "https://front-meeting-opea-uvr3-2nl3s2fmt-sonali-mishras-projects.vercel.app", // The specific preview URL from the error
  // Add any other static preview URLs if you know them
];

if (
  process.env.FRONTEND_URL &&
  !allowedOrigins.includes(process.env.FRONTEND_URL)
) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
console.log("Allowed origins for HTTP and Socket.IO:", allowedOrigins);

// Explicit CORS options for Express to handle preflight requests properly
const expressCorsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      // Allow if origin is in the list or if no origin (e.g. server-to-server, curl)
      callback(null, true);
    } else {
      console.error(`Express CORS error: Origin ${origin} not allowed.`);
      callback(new Error("Not allowed by CORS policy for Express"));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS", // Crucially, include OPTIONS
  allowedHeaders: "Content-Type,Authorization,X-Requested-With", // Add common headers. Adjust if your frontend sends others.
  credentials: true, // If you use cookies/auth headers
  optionsSuccessStatus: 200, // Or 204. 200 is sometimes more compatible.
};

// Apply Express CORS middleware
app.use(cors(expressCorsOptions));
// Express needs to be able to handle OPTIONS requests explicitly for preflights on all routes if cors doesn't handle it perfectly
// app.options('*', cors(expressCorsOptions)); // This line can sometimes help if the above isn't enough for all preflights

// Socket.IO CORS Configuration
const io = new Server(server, {
  cors: {
    // Socket.IO uses its own cors config, but we use the same allowedOrigins list
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        const msg =
          "The CORS policy for Socket.IO does not allow access from the specified Origin.";
        console.error(msg, "Origin:", origin);
        return callback(new Error(msg), false);
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// --- END UPDATED CORS CONFIGURATION ---

app.use(express.json());
app.use("/api/meetings", meetingAPIRoutes);

app.get("/", (req, res) => res.send("IntelliMeet OPEA Backend is running!"));

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinMeeting", (meetingId) => {
    socket.join(meetingId);
    console.log(`User ${socket.id} joined meeting: ${meetingId}`);
    if (meetingsDB[meetingId]) {
      socket.emit("meetingState", meetingsDB[meetingId]);
    } else {
      console.warn(`Meeting ${meetingId} not found during joinMeeting.`);
    }
  });

  socket.on("audioActivity", async ({ meetingId, audioDataReference }) => {
    if (!meetingsDB[meetingId]) {
      console.warn(`Meeting ${meetingId} not found for audio activity.`);
      return socket.emit("opeaError", {
        message: `Meeting ${meetingId} not found for audio activity.`,
      });
    }
    try {
      const transcriptChunks = await mockOpeaSTT(audioDataReference);
      if (meetingsDB[meetingId].transcript) {
        meetingsDB[meetingId].transcript.push(...transcriptChunks);
      } else {
        meetingsDB[meetingId].transcript = [...transcriptChunks];
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
