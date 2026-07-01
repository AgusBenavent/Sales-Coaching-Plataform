const supabase = require('../db');
const { evaluateCall } = require('../agents');

async function runEvaluationPipeline(callId) {
  await supabase.from('evaluations').update({ status: 'running' }).eq('call_id', callId);

  try {
    const { data: call, error } = await supabase.from('calls').select('*').eq('id', callId).single();
    if (error || !call) throw new Error('Call not found');

    const context = {
      salesperson: call.salesperson_name,
      contact: call.contact_name,
      contact_type: call.contact_type,
      institution: call.institution_name,
      stage: call.stage,
    };

    const result = await evaluateCall(call.transcript, context);

    const overall_score = result.overall_score ?? 0;
    const grade =
      overall_score >= 90 ? 'A' :
      overall_score >= 80 ? 'B' :
      overall_score >= 70 ? 'C' :
      overall_score >= 60 ? 'D' : 'F';
    const label =
      overall_score >= 80 ? 'Excellent' :
      overall_score >= 65 ? 'Good' :
      overall_score >= 50 ? 'Needs Improvement' : 'Critical';

    await supabase.from('evaluations').update({
      status: 'completed',
      overall_score,
      scores: { ...result, grade, label },
      agents_output: result.categories || [],
      coaching: {
        strengths: [],
        weaknesses: [],
        top3Improvements: (result.next_best_actions || []).slice(0, 3).map(a => ({ improvement: a })),
        rolePlaySuggestion: result.coach_summary || '',
        coach_summary: result.coach_summary || '',
        next_best_actions: result.next_best_actions || [],
        missed_opportunities: result.missed_opportunities || [],
      },
      completed_at: new Date().toISOString(),
    }).eq('call_id', callId);

    return { success: true };
  } catch (err) {
    await supabase.from('evaluations').update({ status: 'error' }).eq('call_id', callId);
    console.error('Pipeline error:', err);
    throw err;
  }
}

module.exports = { runEvaluationPipeline };
