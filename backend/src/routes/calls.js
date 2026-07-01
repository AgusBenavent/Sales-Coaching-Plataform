const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../db');
const auth = require('../middleware/auth');
const { runEvaluationPipeline } = require('../services/evaluationPipeline');
const { parseFile } = require('../services/fileParser');

const ALLOWED_EXT = /\.(pdf|docx|doc|xlsx|xls|txt)$/i;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (ALLOWED_EXT.test(file.originalname)) cb(null, true);
    else cb(new Error('Formato no soportado. Usá PDF, Word, Excel o TXT.'));
  },
});

router.post('/', auth, upload.single('transcript'), async (req, res) => {
  try {
    const { contact_type, contact_name, institution_name, stage, opportunity_value } = req.body;

    let transcript = '';
    if (req.file) {
      transcript = await parseFile(req.file.buffer, req.file.originalname);
    } else if (req.body.transcript_text) {
      transcript = req.body.transcript_text;
    } else {
      return res.status(400).json({ error: 'Se requiere transcripción, archivo o URL de Google Docs' });
    }

    const salesperson_name =
      req.user.user_metadata?.full_name ||
      req.user.user_metadata?.name ||
      req.user.email.split('@')[0];

    const { data: call, error: callErr } = await supabase
      .from('calls')
      .insert({ user_id: req.user.id, salesperson_name, contact_type: contact_type || 'university', contact_name, institution_name, stage, opportunity_value: opportunity_value || null, transcript })
      .select()
      .single();

    if (callErr) throw callErr;

    const { data: evaluation, error: evalErr } = await supabase
      .from('evaluations')
      .insert({ call_id: call.id, status: 'pending' })
      .select()
      .single();

    if (evalErr) throw evalErr;

    runEvaluationPipeline(call.id).catch(console.error);

    res.status(202).json({ callId: call.id, message: 'Evaluation started' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('calls')
      .select('*, evaluations(status, overall_score, scores)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const { data: call, error: callErr } = await supabase
      .from('calls')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (callErr || !call) return res.status(404).json({ error: 'Not found' });

    const { data: evaluation, error: evalErr } = await supabase
      .from('evaluations')
      .select('*')
      .eq('call_id', req.params.id)
      .single();

    res.json({ call, evaluation: evalErr ? null : evaluation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Re-evaluate a call (resets and re-runs pipeline)
router.post('/:id/reevaluate', auth, async (req, res) => {
  try {
    const { data: call, error: callErr } = await supabase
      .from('calls')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (callErr || !call) return res.status(404).json({ error: 'Not found' });

    await supabase.from('evaluations').update({
      status: 'pending',
      overall_score: null,
      scores: null,
      agents_output: null,
      coaching: null,
      completed_at: null,
    }).eq('call_id', req.params.id);

    runEvaluationPipeline(req.params.id).catch(console.error);
    res.json({ message: 'Re-evaluation started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
