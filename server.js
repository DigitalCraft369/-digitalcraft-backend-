const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = 'Gdolfwck22$$';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, 'inquiries.json');
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ inquiries: [] }));

// Read/write helpers
function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { inquiries: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ============ PUBLIC ROUTES ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Submit inquiry (public)
app.post('/api/inquiries', (req, res) => {
  const { name, email, phone, companyName, service, budget, timeline, message } = req.body;
  
  if (!name || !email || !service || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const db = readDB();
  const inquiry = {
    id: Date.now().toString(),
    name,
    email,
    phone: phone || null,
    companyName: companyName || null,
    service,
    budget: budget || 'Not specified',
    timeline: timeline || 'Not specified',
    message,
    status: 'new',
    notes: [],
    createdAt: new Date().toISOString()
  };
  
  db.inquiries.unshift(inquiry);
  writeDB(db);
  
  res.json({ success: true, inquiryId: inquiry.id });
});

// ============ PROTECTED ADMIN ROUTES ============

// Check password function
function checkPassword(req) {
  const auth = req.headers.authorization;
  if (!auth) return false;
  const pass = auth.replace('Bearer ', '').trim();
  return pass === ADMIN_PASSWORD;
}

// Get all inquiries (protected)
app.get('/api/admin/inquiries', (req, res) => {
  if (!checkPassword(req)) return res.status(401).json({ error: 'Unauthorized' });
  
  const db = readDB();
  res.json({ success: true, inquiries: db.inquiries });
});

// Get single inquiry (protected)
app.get('/api/admin/inquiries/:id', (req, res) => {
  if (!checkPassword(req)) return res.status(401).json({ error: 'Unauthorized' });
  
  const db = readDB();
  const inquiry = db.inquiries.find(i => i.id === req.params.id);
  if (!inquiry) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, inquiry });
});

// Update inquiry status (protected)
app.patch('/api/admin/inquiries/:id', (req, res) => {
  if (!checkPassword(req)) return res.status(401).json({ error: 'Unauthorized' });
  
  const db = readDB();
  const index = db.inquiries.findIndex(i => i.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  
  const { status, note } = req.body;
  if (status) db.inquiries[index].status = status;
  if (note) {
    if (!db.inquiries[index].notes) db.inquiries[index].notes = [];
    db.inquiries[index].notes.push({ text: note, date: new Date().toISOString() });
  }
  
  writeDB(db);
  res.json({ success: true, inquiry: db.inquiries[index] });
});

// Delete inquiry (protected)
app.delete('/api/admin/inquiries/:id', (req, res) => {
  if (!checkPassword(req)) return res.status(401).json({ error: 'Unauthorized' });
  
  const db = readDB();
  const index = db.inquiries.findIndex(i => i.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  
  db.inquiries.splice(index, 1);
  writeDB(db);
  res.json({ success: true });
});

// Get stats (protected)
app.get('/api/admin/stats', (req, res) => {
  if (!checkPassword(req)) return res.status(401).json({ error: 'Unauthorized' });
  
  const db = readDB();
  const stats = {
    total: db.inquiries.length,
    new: db.inquiries.filter(i => i.status === 'new').length,
    reviewing: db.inquiries.filter(i => i.status === 'reviewing').length,
    quoted: db.inquiries.filter(i => i.status === 'quoted').length,
    inProgress: db.inquiries.filter(i => i.status === 'in-progress').length,
    completed: db.inquiries.filter(i => i.status === 'completed').length
  };
  res.json({ success: true, stats });
});

// ============ ADMIN DASHBOARD PAGES ============

// Serve admin login page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

// Serve admin dashboard
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// Serve static admin files
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
});

module.exports = app;
         
