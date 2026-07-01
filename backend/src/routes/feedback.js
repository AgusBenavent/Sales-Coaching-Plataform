const express = require('express');
const router = express.Router();
const supabase = require('../db');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { evaluation_id, approved, corrections, comments } = req.body;
    if (!evaluation_id) return res.status(400).json({ error: 'evaluation_id required' });

    const manager_name =
      req.user.user_metadata?.full_name ||
      req.user.user_metadata?.name ||
      req.user.email;

    const { data, error } = await supabase
      .from('manager_feedback')
      .insert({ evaluation_id, manager_name, approved, corrections: corrections || {}, comments })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:evaluationId', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('manager_feedback')
      .select('*')
      .eq('evaluation_id', req.params.evaluationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
