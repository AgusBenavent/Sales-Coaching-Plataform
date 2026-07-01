const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';

async function ask(system, user, maxTokens = 2500) {
  const r = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  const text = r.content[0].text;
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  } catch {
    return {};
  }
}

/* ── BATCH 1: Categories 1-7 + Missed Opportunities ── */
const PROMPT_CATEGORIES_A = `You are an expert Sales Coach evaluating a university admissions call.
Evaluate categories 1-7 (score 0-10 each). Also list missed opportunities.
Respond ONLY with valid JSON:
{
  "categories": [
    { "name": "<name>", "score": <0-10>, "reason": "<string>", "evidence": ["<quote>"], "improvements": ["<string>"] }
  ],
  "missed_opportunities": ["<string>"]
}
Categories to evaluate (in order):
1. Opening (rapport, intro, agenda, time confirmation, expectations)
2. Discovery Quality (situation, pain points, goals, motivations, timeline, urgency, open/follow-up questions)
3. Active Listening (allowed to speak, avoided interruptions, acknowledged, adapted, listened more than talked)
4. Qualification (need, budget, authority, timeline, eligibility, program fit, motivation, likelihood to enroll)
5. Product Presentation (personalized, connected to needs, benefits/outcomes explained, examples, success stories)
6. Communication Skills (confidence, clarity, professionalism, empathy, tone, pacing, vocabulary)
7. Objection Handling (identified, acknowledged, answered, resolved each objection)`;

/* ── BATCH 2: Categories 8-14 + Talk Ratio + Sentiment ── */
const PROMPT_CATEGORIES_B = `You are an expert Sales Coach evaluating a university admissions call.
Evaluate categories 8-14 (score 0-10 each). Also analyze talk ratio and sentiment.
Respond ONLY with valid JSON:
{
  "categories": [
    { "name": "<name>", "score": <0-10>, "reason": "<string>", "evidence": ["<quote>"], "improvements": ["<string>"] }
  ],
  "talk_ratio": { "interviewer": <number 0-100>, "student": <number 0-100>, "ideal_interviewer": 40, "assessment": "<string>" },
  "sentiment": { "beginning": "<Positive|Neutral|Negative>", "middle": "<Positive|Neutral|Negative>", "end": "<Positive|Neutral|Negative>", "trend": "<Improving|Stable|Declining>", "summary": "<string>" }
}
Categories to evaluate (in order):
8. Conversation Flow (logical sequence, transitions, smoothness, control, dead moments)
9. Emotional Intelligence (empathy, curiosity, patience, adaptability, trust building)
10. Student Engagement (who talked more, interest level, questions by student, excitement, buying signals)
11. Call Outcome (next step scheduled, commitment asked, action items confirmed, closed effectively)
12. Missed Opportunities (already in batch A, skip — score based on count of missed items)
13. Buying Signals (score based on quantity and quality of buying signals detected)
14. Risk Signals (score based on severity of risk signals detected)`;

/* ── BATCH 3: Signals + Overall + Coaching ── */
const PROMPT_SIGNALS = `You are an expert Sales Coach evaluating a university admissions call.
Extract buying signals, risk signals, objections. Give overall score and coaching.
Respond ONLY with valid JSON:
{
  "overall_score": <number 0-100>,
  "call_quality": "<Excellent|Good|Average|Poor|Critical>",
  "advance_stage": <true|false>,
  "advance_reason": "<string>",
  "buying_signals": [{ "quote": "<exact quote>", "strength": "<High|Medium|Low>", "meaning": "<string>" }],
  "risk_signals": [{ "signal": "<string>", "severity": "<High|Medium|Low>", "recommendation": "<string>" }],
  "objections": [{ "objection": "<string>", "identified": <bool>, "acknowledged": <bool>, "answered": <bool>, "resolved": <bool>, "ideal_response": "<string>" }],
  "next_best_actions": ["<top 10 actions>"],
  "coach_summary": "<comprehensive 3-4 sentence coaching paragraph>"
}`;

async function evaluateCall(transcript, context) {
  const ctxLine = `Salesperson: ${context.salesperson || 'Unknown'} | Contact: ${context.contact || 'Unknown'} | Type: ${context.contact_type === 'student' ? 'B2C Student' : 'B2U University'} | Institution: ${context.institution || 'Unknown'} | Stage: ${context.stage || 'Unknown'}`;
  const body = `${ctxLine}\n\nTranscript:\n${transcript}`;

  const [batchA, batchB, batchC] = await Promise.all([
    ask(PROMPT_CATEGORIES_A, body, 2500),
    ask(PROMPT_CATEGORIES_B, body, 2500),
    ask(PROMPT_SIGNALS, body, 2500),
  ]);

  const categories = [
    ...(batchA.categories || []),
    ...(batchB.categories || []),
  ];

  return {
    overall_score: batchC.overall_score ?? 0,
    call_quality: batchC.call_quality ?? 'Average',
    advance_stage: batchC.advance_stage ?? false,
    advance_reason: batchC.advance_reason ?? '',
    categories,
    buying_signals: batchC.buying_signals ?? [],
    risk_signals: batchC.risk_signals ?? [],
    objections: batchC.objections ?? [],
    missed_opportunities: batchA.missed_opportunities ?? [],
    talk_ratio: batchB.talk_ratio ?? { interviewer: 50, student: 50, ideal_interviewer: 40, assessment: '' },
    sentiment: batchB.sentiment ?? {},
    next_best_actions: batchC.next_best_actions ?? [],
    coach_summary: batchC.coach_summary ?? '',
  };
}

module.exports = { evaluateCall };
