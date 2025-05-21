// const express = require("express");
// const { v4: uuidv4 } = require("uuid");
// const {
//   mockOpeaSummarizer,
//   mockOpeaActionItemExtractor,
//   mockOpeaAgendaGenerator,
// } = require("../services/opeaMockServices");

// const router = express.Router();
// let meetings = {}; // In-memory store

// router.post("/", (req, res) => {
//   const { title = "New Meeting", topic, participants = [] } = req.body;
//   const meetingId = uuidv4();
//   meetings[meetingId] = {
//     id: meetingId,
//     title,
//     topic: topic || title,
//     participants,
//     transcript: [],
//     summary: "",
//     actionItems: [],
//     agenda: "",
//     createdAt: new Date(),
//   };
//   console.log(`Meeting created: ${meetingId} - ${title}`);
//   res.status(201).json(meetings[meetingId]);
// });

// router.get("/:meetingId", (req, res) => {
//   const { meetingId } = req.params;
//   if (meetings[meetingId]) {
//     res.json(meetings[meetingId]);
//   } else {
//     res.status(404).json({ message: "Meeting not found" });
//   }
// });

// router.post("/:meetingId/generate-agenda", async (req, res) => {
//   const { meetingId } = req.params;
//   const meeting = meetings[meetingId];
//   if (!meeting) return res.status(404).json({ message: "Meeting not found" });
//   try {
//     const generatedAgenda = await mockOpeaAgendaGenerator(
//       meeting.topic,
//       meeting.participants
//     );
//     meeting.agenda = generatedAgenda;
//     res.json({ meetingId, agenda: meeting.agenda });
//   } catch (error) {
//     res.status(500).json({ message: "Failed to generate agenda" });
//   }
// });

// router.post("/:meetingId/process-transcript", async (req, res) => {
//   const { meetingId } = req.params;
//   const meeting = meetings[meetingId];
//   if (!meeting) return res.status(404).json({ message: "Meeting not found" });
//   if (meeting.transcript.length === 0)
//     return res.status(400).json({ message: "No transcript" });

//   const fullTranscriptText = meeting.transcript
//     .map((t) => `${t.speaker}: ${t.text}`)
//     .join("\n");
//   try {
//     const summary = await mockOpeaSummarizer(fullTranscriptText);
//     const actionItems = await mockOpeaActionItemExtractor(fullTranscriptText);
//     meeting.summary = summary;
//     meeting.actionItems = actionItems;
//     res.json({
//       meetingId,
//       summary: meeting.summary,
//       actionItems: meeting.actionItems,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Failed to process transcript" });
//   }
// });

// module.exports = { router, meetings };

// backend/src/routes/meetingRoutes.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const {
  mockOpeaSummarizer,
  mockOpeaActionItemExtractor,
  mockOpeaAgendaGenerator,
} = require("../services/opeaMockServices"); // सुनिश्चित करें कि यह पाथ सही है

const router = express.Router();
let meetings = {}; // इन-मेमोरी स्टोर (अस्थायी)

console.log("[meetingRoutes.js] यह फ़ाइल लोड हो रही है।"); // डीबगिंग के लिए

// नया रूट: GET /api/meetings (सभी मीटिंग्स लिस्ट करने के लिए)
router.get("/", (req, res) => {
  console.log("[meetingRoutes.js] GET / (सभी मीटिंग्स) हैंडलर पर पहुंचा।");
  // `meetings` ऑब्जेक्ट की वैल्यूज को ऐरे के रूप में भेजें
  res.json(Object.values(meetings));
});

router.post("/", (req, res) => {
  console.log("[meetingRoutes.js] POST / (नई मीटिंग) हैंडलर पर पहुंचा।");
  const { title = "New Meeting", topic, participants = [] } = req.body;
  const meetingId = uuidv4();
  meetings[meetingId] = {
    id: meetingId,
    title,
    topic: topic || title,
    participants,
    transcript: [],
    summary: "",
    actionItems: [],
    agenda: "",
    createdAt: new Date(),
  };
  console.log(`मीटिंग बनाई गई: ${meetingId} - ${title}`);
  res.status(201).json(meetings[meetingId]);
});

router.get("/:meetingId", (req, res) => {
  const { meetingId } = req.params;
  console.log(`[meetingRoutes.js] GET /${meetingId} हैंडलर पर पहुंचा।`);
  if (meetings[meetingId]) {
    res.json(meetings[meetingId]);
  } else {
    console.log(`[meetingRoutes.js] मीटिंग ${meetingId} नहीं मिली।`);
    res.status(404).json({ message: "Meeting not found" });
  }
});

router.post("/:meetingId/generate-agenda", async (req, res) => {
  const { meetingId } = req.params;
  const meeting = meetings[meetingId];
  console.log(
    `[meetingRoutes.js] POST /${meetingId}/generate-agenda हैंडलर पर पहुंचा।`
  );
  if (!meeting) {
    console.log(
      `[meetingRoutes.js] एजेंडा जनरेट करने के लिए मीटिंग ${meetingId} नहीं मिली।`
    );
    return res.status(404).json({ message: "Meeting not found" });
  }
  try {
    const generatedAgenda = await mockOpeaAgendaGenerator(
      meeting.topic,
      meeting.participants
    );
    meeting.agenda = generatedAgenda;
    res.json({ meetingId, agenda: meeting.agenda });
  } catch (error) {
    console.error(`[meetingRoutes.js] एजेंडा जनरेट करने में त्रुटि:`, error);
    res.status(500).json({ message: "Failed to generate agenda" });
  }
});

router.post("/:meetingId/process-transcript", async (req, res) => {
  const { meetingId } = req.params;
  const meeting = meetings[meetingId];
  console.log(
    `[meetingRoutes.js] POST /${meetingId}/process-transcript हैंडलर पर पहुंचा।`
  );
  if (!meeting) {
    console.log(
      `[meetingRoutes.js] ट्रांसक्रिप्ट प्रोसेस करने के लिए मीटिंग ${meetingId} नहीं मिली।`
    );
    return res.status(404).json({ message: "Meeting not found" });
  }
  if (meeting.transcript.length === 0) {
    console.log(
      `[meetingRoutes.js] मीटिंग ${meetingId} के लिए कोई ट्रांसक्रिप्ट नहीं है।`
    );
    return res.status(400).json({ message: "No transcript to process" });
  }

  const fullTranscriptText = meeting.transcript
    .map((t) => `${t.speaker}: ${t.text}`)
    .join("\n");
  try {
    const summary = await mockOpeaSummarizer(fullTranscriptText);
    const actionItems = await mockOpeaActionItemExtractor(fullTranscriptText);
    meeting.summary = summary;
    meeting.actionItems = actionItems;
    res.json({
      meetingId,
      summary: meeting.summary,
      actionItems: meeting.actionItems,
    });
  } catch (error) {
    console.error(
      `[meetingRoutes.js] ट्रांसक्रिप्ट प्रोसेस करने में त्रुटि:`,
      error
    );
    res.status(500).json({ message: "Failed to process transcript" });
  }
});

module.exports = { router, meetings };
