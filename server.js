const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory and db.json exist
function initDB() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      users: [
        {
          id: 'usr_' + Date.now(),
          name: 'Triveni',
          email: 'triveni@sbjain.edu.in',
          password: 'password123',
          createdAt: new Date().toISOString()
        }
      ],
      device: {
        lastSeen: null,
        ledStatus: 'OFF',
        lcdLine1: 'Simple IoT World',
        lcdLine2: 'Welcome Triveni',
        lastUpdate: new Date().toISOString()
      },
      records: [
        {
          id: 'rec_init_1',
          temperature: 31.5,
          humidity: 52,
          timestamp: new Date(Date.now() - 600000).toISOString(),
          time: formatISTTime(new Date(Date.now() - 600000)),
          date: formatISTDate(new Date(Date.now() - 600000))
        },
        {
          id: 'rec_init_2',
          temperature: 34.0,
          humidity: 50,
          timestamp: new Date().toISOString(),
          time: formatISTTime(new Date()),
          date: formatISTDate(new Date())
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
  }
}

function readDB() {
  initDB();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB, re-initializing...', err);
    initDB();
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing DB:', err);
    return false;
  }
}

// Timezone Helper: Asia/Kolkata (+5:30)
// Exact prompt specifications:
// Time format: HH:MM AM (or PM)
// Date format: DD-MM-YYYY
function formatISTTime(dateObj = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(dateObj);
}

function formatISTDate(dateObj = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dateObj);
  // Returns DD/MM/YYYY -> convert to DD-MM-YYYY
  return parts.replace(/\//g, '-');
}

// Helper: Check if ESP8266 is online (sent heartbeat within last 25 seconds)
function isDeviceOnline(lastSeen) {
  if (!lastSeen) return false;
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  return diffMs <= 25000; // 25 seconds window
}

/* ==========================================================
   AUTHENTICATION ROUTES
========================================================== */

// Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields (name, email, password) are required.' });
  }

  const db = readDB();
  const existing = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email is already registered. Please login.' });
  }

  const newUser = {
    id: 'usr_' + Date.now(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDB(db);

  return res.json({
    success: true,
    message: 'Registration successful! Welcome to Simple IoT World.',
    user: { id: newUser.id, name: newUser.name, email: newUser.email }
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const db = readDB();
  const user = db.users.find(
    u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password.trim()
  );

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  return res.json({
    success: true,
    message: 'Login successful!',
    user: { id: user.id, name: user.name, email: user.email }
  });
});

/* ==========================================================
   IOT HARDWARE ROUTES (For ESP8266 & Web App)
========================================================== */

// 1. ESP8266 posts Telemetry Data: POST /api/iot/data
// Body: { temperature: 34.5, humidity: 50.0 }
app.post('/api/iot/data', (req, res) => {
  let { temperature, humidity } = req.body;

  if (temperature === undefined || humidity === undefined) {
    return res.status(400).json({ success: false, message: 'Missing temperature or humidity data' });
  }

  const tempNum = parseFloat(temperature);
  const humNum = parseFloat(humidity);

  if (isNaN(tempNum) || isNaN(humNum)) {
    return res.status(400).json({ success: false, message: 'Invalid sensor values' });
  }

  const now = new Date();
  const db = readDB();

  const newRecord = {
    id: 'rec_' + Date.now(),
    temperature: Math.round(tempNum * 10) / 10,
    humidity: Math.round(humNum),
    timestamp: now.toISOString(),
    time: formatISTTime(now),
    date: formatISTDate(now)
  };

  db.records.push(newRecord);
  db.device.lastSeen = now.toISOString();
  db.device.lastUpdate = now.toISOString();

  // Keep records list tidy if exceeds 5000 items
  if (db.records.length > 5000) {
    db.records = db.records.slice(db.records.length - 5000);
  }

  writeDB(db);

  return res.json({
    success: true,
    message: 'Data saved successfully',
    record: newRecord,
    device: {
      isOnline: true,
      ledStatus: db.device.ledStatus,
      lcdLine1: db.device.lcdLine1,
      lcdLine2: db.device.lcdLine2
    }
  });
});

// 2. ESP8266 pulls Control Data: GET /api/iot/control
// Returns LCD Line 1, Line 2, and LED Status
app.get('/api/iot/control', (req, res) => {
  const db = readDB();
  const now = new Date();
  db.device.lastSeen = now.toISOString();
  writeDB(db);

  return res.json({
    success: true,
    lcdLine1: (db.device.lcdLine1 || '').substring(0, 16),
    lcdLine2: (db.device.lcdLine2 || '').substring(0, 16),
    ledStatus: db.device.ledStatus || 'OFF',
    isOnline: true,
    serverTime: formatISTTime(now)
  });
});

// 3. Web App fetches complete IoT status: GET /api/iot/status
app.get('/api/iot/status', (req, res) => {
  const db = readDB();
  const online = isDeviceOnline(db.device.lastSeen);
  const latestRecord = db.records.length > 0 ? db.records[db.records.length - 1] : null;

  let secondsAgo = null;
  if (db.device.lastSeen) {
    secondsAgo = Math.floor((Date.now() - new Date(db.device.lastSeen).getTime()) / 1000);
  }

  return res.json({
    success: true,
    isOnline: online,
    lastSeen: db.device.lastSeen,
    secondsAgo: secondsAgo,
    ledStatus: db.device.ledStatus || 'OFF',
    lcdLine1: db.device.lcdLine1 || '',
    lcdLine2: db.device.lcdLine2 || '',
    latestRecord: latestRecord
  });
});

/* ==========================================================
   WEB DASHBOARD CONTROL ROUTES
========================================================== */

// 4. Save LCD Display text: POST /api/control/lcd
// Max 16 characters for Field 1 and Field 2
app.post('/api/control/lcd', (req, res) => {
  const { line1 = '', line2 = '' } = req.body;
  const cleanLine1 = String(line1).substring(0, 16);
  const cleanLine2 = String(line2).substring(0, 16);

  const db = readDB();
  db.device.lcdLine1 = cleanLine1;
  db.device.lcdLine2 = cleanLine2;
  db.device.lastUpdate = new Date().toISOString();
  writeDB(db);

  return res.json({
    success: true,
    message: 'LCD display updated successfully!',
    lcdLine1: cleanLine1,
    lcdLine2: cleanLine2
  });
});

// 5. Toggle or Set LED Status: POST /api/control/led
app.post('/api/control/led', (req, res) => {
  const { status } = req.body;
  const db = readDB();

  let nextStatus;
  if (status && (status.toUpperCase() === 'ON' || status.toUpperCase() === 'OFF')) {
    nextStatus = status.toUpperCase();
  } else {
    nextStatus = db.device.ledStatus === 'ON' ? 'OFF' : 'ON';
  }

  db.device.ledStatus = nextStatus;
  db.device.lastUpdate = new Date().toISOString();
  writeDB(db);

  return res.json({
    success: true,
    message: `LED turned ${nextStatus}`,
    ledStatus: nextStatus
  });
});

/* ==========================================================
   RECORDS & TELEMETRY ROUTES (PAGINATION & GRAPHS)
========================================================== */

// 6. Get Paginated Records: GET /api/records
// Query: ?page=1&limit=10&order=desc
app.get('/api/records', (req, res) => {
  const db = readDB();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const order = req.query.order === 'asc' ? 'asc' : 'desc';

  // Clone records
  let allRecords = [...db.records];
  if (order === 'desc') {
    allRecords.reverse();
  }

  const totalRecords = allRecords.length;
  const totalPages = Math.ceil(totalRecords / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedItems = allRecords.slice(startIndex, startIndex + limit);

  // Return strictly matching required table fields
  return res.json({
    success: true,
    records: paginatedItems,
    pagination: {
      totalRecords,
      currentPage: page,
      totalPages,
      limit,
      startIndex: totalRecords > 0 ? startIndex + 1 : 0,
      endIndex: Math.min(startIndex + limit, totalRecords)
    }
  });
});

// 7. Get Recent History for Chart.js: GET /api/records/history
app.get('/api/records/history', (req, res) => {
  const db = readDB();
  const count = parseInt(req.query.count) || 20;
  // Return the latest 'count' records in chronological order
  const slice = db.records.slice(-count);
  return res.json({
    success: true,
    history: slice
  });
});

// 8. Delete a record: DELETE /api/records/:id
app.delete('/api/records/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const initialLength = db.records.length;
  db.records = db.records.filter(r => r.id !== id);

  if (db.records.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  writeDB(db);
  return res.json({ success: true, message: 'Record deleted successfully' });
});

// 9. Simulation Helper: POST /api/iot/simulate
// Allows manual testing without physical hardware
app.post('/api/iot/simulate', (req, res) => {
  const randomTemp = Math.round((28 + Math.random() * 8) * 10) / 10; // 28.0 - 36.0 'C
  const randomHum = Math.round(45 + Math.random() * 25); // 45% - 70%

  const now = new Date();
  const db = readDB();

  const newRecord = {
    id: 'rec_' + Date.now(),
    temperature: randomTemp,
    humidity: randomHum,
    timestamp: now.toISOString(),
    time: formatISTTime(now),
    date: formatISTDate(now)
  };

  db.records.push(newRecord);
  db.device.lastSeen = now.toISOString();
  db.device.lastUpdate = now.toISOString();
  writeDB(db);

  return res.json({
    success: true,
    message: 'Simulated ESP8266 reading added successfully!',
    record: newRecord
  });
});

// Health check endpoint for Render monitoring
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'Simple IoT World',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    istTime: formatISTTime(new Date()),
    istDate: formatISTDate(new Date())
  });
});

// Fallback route to serve index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Simple IoT World running on http://localhost:${PORT}`);
  console.log(`📡 Timezone configured for Asia/Kolkata (+5:30)`);
});
