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
  "http://localhost:5173", // For your local Vite development server
  "https://front-meeting-opea-uvr3.vercel.app", // Your main production frontend URL
  "https://front-meeting-opea-uvr3-2nl3s2fmt-sonali-mishras-projects.vercel.app", // A previous preview URL
  "https://front-meeting-opea-uvr3-nrbf3dw69-sonali-mishras-projects.vercel.app", // <<<--- NEW PREVIEW URL FROM YOUR LAST ERROR
  // Add any other static preview URLs if you know them
];

// This allows you to add more origins via an environment variable on Render
if (
  process.env.FRONTEND_URL &&
  !allowedOrigins.includes(process.env.FRONTEND_URL)
) {
  allowedOrigins.push(process.env.FRONTEND_URL.trim()); // .trim() to remove any accidental whitespace
}
console.log("Allowed origins for HTTP and Socket.IO:", allowedOrigins);

// Explicit CORS options for Express to handle preflight requests properly
const expressCorsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests) OR if origin is in the list
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error(
        `Express CORS error: Origin ${origin} not allowed by expressCorsOptions. Allowed list:`,
        allowedOrigins
      );
      callback(new Error("Not allowed by CORS policy for Express"));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS", // Crucially, include OPTIONS
  allowedHeaders: "Content-Type,Authorization,X-Requested-With", // Common headers
  credentials: true, // If you use cookies/auth headers
  optionsSuccessStatus: 200, // Can be 204, but 200 is often more compatible
};

// Apply Express CORS middleware GENERICALLY FIRST for all requests
app.use(cors(expressCorsOptions));

// THEN, EXPLICITLY HANDLE ALL OPTIONS requests with these CORS options.
// This is a robust way to ensure preflights are handled.
console.log("Setting up global OPTIONS handler with CORS options.");
app.options("*", cors(expressCorsOptions));

// --- END UPDATED CORS CONFIGURATION ---

app.use(express.json()); // Body parser for JSON requests

// Your API routes
app.use("/api/meetings", meetingAPIRoutes);

app.get("/", (req, res) => res.send("IntelliMeet OPEA Backend is running!"));

// Socket.IO Configuration
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        const msg =
          "The CORS policy for Socket.IO does not allow access from the specified Origin.";
        console.error(
          msg,
          "Origin:",
          origin,
          "Allowed list for Socket.IO:",
          allowedOrigins
        );
        return callback(new Error(msg), false);
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

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
