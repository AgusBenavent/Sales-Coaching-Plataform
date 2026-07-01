const express = require('express');
const router = express.Router();
const supabase = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: calls, error } = await supabase
      .from('calls')
      .select('*, evaluations(status, overall_score, scores, created_at)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const completed = calls.filter(c => c.evaluations?.[0]?.status === 'completed');
    const scores = completed.map(c => c.evaluations[0].overall_score).filter(Boolean);

    const summary = {
      total_calls: calls.length,
      avg_score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      excellent_calls: scores.filter(s => s >= 80).length,
      critical_calls: scores.filter(s => s < 60).length,
    };

    // Group by salesperson (for managers who might track team)
    const repMap = {};
    for (const call of completed) {
      const name = call.salesperson_name;
      if (!repMap[name]) repMap[name] = { salesperson_name: name, total_calls: 0, scores: [] };
      repMap[name].total_calls++;
      if (call.evaluations?.[0]?.overall_score) repMap[name].scores.push(call.evaluations[0].overall_score);
    }
    const byRep = Object.values(repMap).map(r => ({
      salesperson_name: r.salesperson_name,
      total_calls: r.total_calls,
      avg_score: r.scores.length ? Math.round(r.scores.reduce((a, b) => a + b, 0) / r.scores.length) : 0,
    })).sort((a, b) => b.avg_score - a.avg_score);

    const recentCalls = calls.slice(0, 10).map(c => {
      const ev = c.evaluations?.[0];
      const sc = ev?.scores;
      return {
        id: c.id, salesperson_name: c.salesperson_name, contact_type: c.contact_type, contact_name: c.contact_name,
        institution_name: c.institution_name, stage: c.stage, created_at: c.created_at,
        overall_score: ev?.overall_score, status: ev?.status,
        grade: sc?.grade, label: sc?.label,
      };
    });

    res.json({ summary, byRep, recentCalls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
