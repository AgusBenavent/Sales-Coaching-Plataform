const WEIGHTS = {
  conversationQuality: 0.10,
  salesMethodology:   0.15,
  discoveryQuality:   0.20,
  objectionHandling:  0.20,
  productKnowledge:   0.15,
  customerSentiment:  0.05,
  communicationSkills:0.10,
  missedOpportunities:0.03,
  compliance:         0.02,
};

function calculateFinalScore(agentResults) {
  let weightedSum = 0;
  let totalWeight = 0;
  const scores = {};

  for (const [agent, weight] of Object.entries(WEIGHTS)) {
    const result = agentResults[agent];
    if (result && typeof result.score === 'number') {
      scores[agent] = result.score;
      weightedSum += result.score * weight;
      totalWeight += weight;
    }
  }

  const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return {
    overall,
    scores,
    grade: overall >= 90 ? 'A' : overall >= 80 ? 'B' : overall >= 70 ? 'C' : overall >= 60 ? 'D' : 'F',
    label: overall >= 80 ? 'Excellent' : overall >= 65 ? 'Good' : overall >= 50 ? 'Needs Improvement' : 'Critical',
  };
}

module.exports = { calculateFinalScore };
