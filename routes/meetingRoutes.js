const express = require("express");
const { v4: uuidv4 } = require("uuid");
const {
  mockOpeaSummarizer,
  mockOpeaActionItemExtractor,
  mockOpeaAgendaGenerator,
} = require("../services/opeaMockServices");

const router = express.Router();
let meetings = {}; // In-memory store

router.post("/", (req, res) => {
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
  console.log(`Meeting created: ${meetingId} - ${title}`);
  res.status(201).json(meetings[meetingId]);
});

router.get("/:meetingId", (req, res) => {
  const { meetingId } = req.params;
  if (meetings[meetingId]) {
    res.json(meetings[meetingId]);
  } else {
    res.status(404).json({ message: "Meeting not found" });
  }
});

router.post("/:meetingId/generate-agenda", async (req, res) => {
  const { meetingId } = req.params;
  const meeting = meetings[meetingId];
  if (!meeting) return res.status(404).json({ message: "Meeting not found" });
  try {
    const generatedAgenda = await mockOpeaAgendaGenerator(
      meeting.topic,
      meeting.participants
    );
    meeting.agenda = generatedAgenda;
    res.json({ meetingId, agenda: meeting.agenda });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate agenda" });
  }
});

router.post("/:meetingId/process-transcript", async (req, res) => {
  const { meetingId } = req.params;
  const meeting = meetings[meetingId];
  if (!meeting) return res.status(404).json({ message: "Meeting not found" });
  if (meeting.transcript.length === 0)
    return res.status(400).json({ message: "No transcript" });

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
    res.status(500).json({ message: "Failed to process transcript" });
  }
});

module.exports = { router, meetings };
