const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let inquiries = [];

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/inquiries', (req, res) => {
  const inquiry = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  inquiries.push(inquiry);
  res.json({ success: true });
});

app.get('/api/inquiries', (req, res) => {
  res.json({ success: true, inquiries });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Server on port', PORT));
