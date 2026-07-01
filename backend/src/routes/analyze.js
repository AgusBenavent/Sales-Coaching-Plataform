const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const { parseFile } = require('../services/fileParser');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const ALLOWED_EXT = /\.(pdf|docx|doc|xlsx|xls|txt)$/i;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_, file, cb) =>
    ALLOWED_EXT.test(file.originalname) ? cb(null, true) : cb(new Error('Formato no soportado')),
});

const EXTRACT_PROMPT = `Sos un asistente que analiza transcripciones de llamadas de ventas de European Innovation Academy (EIA).
EIA es una institución educativa que:
- Hace llamadas B2C con ESTUDIANTES que aplicaron a sus programas (becas, verano, innovación)
- Hace llamadas B2U con CONTACTOS DE UNIVERSIDADES para establecer convenios y partnerships

A partir de la transcripción, extraé los siguientes campos en JSON:

{
  "salesperson_name": "nombre completo del representante de EIA",
  "contact_type": "student" o "university",
  "contact_name": "nombre completo del contacto (estudiante o representante universitario)",
  "institution_name": "nombre de la universidad o institución del contacto",
  "stage": una de estas opciones según el tipo:
    - Si es student (B2C): "Primer contacto" | "Información enviada" | "Postulación iniciada" | "Documentación" | "Inscripción confirmada" | "Inscripción perdida"
    - Si es university (B2U): "Primer contacto" | "Presentación del programa" | "Negociación de convenio" | "Convenio firmado" | "Convenio perdido",
  "opportunity_value": número estimado en USD si se menciona algún monto (null si no hay),
  "call_date": "fecha de la llamada si aparece en el texto o título (formato YYYY-MM-DD, null si no hay)",
  "confidence": número del 0 al 100 indicando qué tan seguros estás de la extracción
}

Respondé SOLO con el JSON, sin texto adicional.`;

router.post('/', auth, upload.single('transcript'), async (req, res) => {
  try {
    let transcript = '';

    if (req.file) {
      transcript = await parseFile(req.file.buffer, req.file.originalname);
    } else if (req.body.transcript_text) {
      transcript = req.body.transcript_text;
    } else {
      return res.status(400).json({ error: 'Se requiere un archivo o texto' });
    }

    if (!transcript || transcript.trim().length < 50) {
      return res.status(400).json({ error: 'El documento parece estar vacío o es muy corto' });
    }

    // Limitamos a los primeros 8000 chars para el análisis (suficiente para extraer metadata)
    const sample = transcript.slice(0, 8000);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: `${EXTRACT_PROMPT}\n\nTranscripción:\n${sample}` }],
    });

    const text = response.content[0].text;
    let fields = {};
    try {
      const match = text.match(/\{[\s\S]*\}/);
      fields = match ? JSON.parse(match[0]) : {};
    } catch {
      fields = {};
    }

    res.json({ fields, transcript });
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
