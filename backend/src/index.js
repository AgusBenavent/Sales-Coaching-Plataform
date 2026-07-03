require('dotenv').config();
const express = require('express');
const cors = require('cors');

const callsRouter = require('./routes/calls');
const feedbackRouter = require('./routes/feedback');
const dashboardRouter = require('./routes/dashboard');
const analyzeRouter = require('./routes/analyze');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/calls', callsRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/analyze', analyzeRouter);
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`App running on http://localhost:${PORT}`));
