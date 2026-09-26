require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { scoreLead } = require("./leadScoring");

const app = express();
app.use(cors());
app.use(express.json());

const DATA_PATH = path.join(__dirname, "data.json");

function readData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}

function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// GET all leads, sorted with scored leads first (highest score first)
app.get("/api/leads", (req, res) => {
  const { leads } = readData();
  const sorted = [...leads].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  res.json(sorted);
});

// POST a new lead
app.post("/api/leads", (req, res) => {
  const { company, industry, dealSize, source, notes } = req.body;
  if (!company) return res.status(400).json({ error: "company is required" });

  const data = readData();
  const lead = {
    id: "l" + Date.now(),
    company,
    industry: industry || "",
    dealSize: dealSize || "",
    source: source || "",
    notes: notes || "",
    score: null,
    tier: null,
    reasoning: null,
    keyFactors: null,
    recommendedAction: null,
  };
  data.leads.unshift(lead);
  writeData(data);
  res.status(201).json(lead);
});

// POST score a specific lead
app.post("/api/leads/:id/score", async (req, res) => {
  const data = readData();
  const lead = data.leads.find((l) => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  try {
    const result = await scoreLead(lead);
    Object.assign(lead, result);
    writeData(data);
    res.json(lead);
  } catch (err) {
    console.error("Scoring failed:", err.message);
    res.status(500).json({ error: "Scoring failed", detail: err.message });
  }
});

// DELETE a lead
app.delete("/api/leads/:id", (req, res) => {
  const data = readData();
  data.leads = data.leads.filter((l) => l.id !== req.params.id);
  writeData(data);
  res.status(204).end();
});

const PORT = process.env.PORT || 4020;
app.listen(PORT, () => {
  console.log(`Lead scoring API running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("WARNING: ANTHROPIC_API_KEY is not set. Scoring requests will fail. Copy .env.example to .env and add your key.");
  }
});
