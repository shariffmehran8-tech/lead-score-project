const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Builds the scoring prompt for a given lead. Field names are isolated here
 * so they can be adjusted to match your real lead schema without touching
 * the rest of the module.
 */
function buildPrompt(lead) {
  return `You are a sales operations analyst scoring an inbound lead's likelihood to convert to a paying customer, for a small services/freelance business.

Lead:
- Company: ${lead.company}
- Industry: ${lead.industry}
- Estimated deal size: ${lead.dealSize}
- Source: ${lead.source}
- Notes: ${lead.notes}

Score this lead 0-100 on conversion likelihood, using signals like: engagement speed/depth, intent signals in the notes, source quality (referrals and warm inbound generally outperform cold outreach), budget/timeline signals, and company fit.

Respond with ONLY raw JSON, no markdown fences, no preamble, in this exact shape:
{"score": <integer 0-100>, "tier": "<hot|warm|cold>", "reasoning": "<2-3 sentence explanation an analyst would write>", "keyFactors": ["<factor 1>", "<factor 2>", "<factor 3>"], "recommendedAction": "<one concrete next step>"}`;
}

/**
 * Scores a lead using Claude's reasoning over its attributes.
 * This is intentionally an LLM-based approach rather than a trained
 * classifier: with no historical outcome data yet, there's nothing to
 * fit a model on. Once you've logged enough won/lost outcomes, you can
 * either keep this (it scales fine and stays explainable) or train a
 * real classifier and use this as a fallback/explainer layer.
 */
async function scoreLead(lead) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: buildPrompt(lead) }],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  const clean = text.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    throw new Error("Claude returned non-JSON output: " + text.slice(0, 200));
  }

  if (typeof parsed.score !== "number" || !parsed.tier) {
    throw new Error("Malformed scoring response: " + JSON.stringify(parsed));
  }

  return parsed;
}

module.exports = { scoreLead, buildPrompt };
