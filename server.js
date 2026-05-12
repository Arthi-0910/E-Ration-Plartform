import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// SQLite Database Setup
const dbPath = path.resolve(__dirname, 'database.sqlite');
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT,
    father_name TEXT,
    aadhaar TEXT,
    ration_card TEXT,
    mobile TEXT,
    district TEXT,
    member_count INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending',
    join_date TEXT,
    role TEXT
  )`);

  // Migration for existing databases
  db.run("ALTER TABLE profiles ADD COLUMN father_name TEXT", (err) => { 
    if (!err) console.log("Added father_name column to profiles"); 
  });

  db.run(`CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT UNIQUE NOT NULL,
    unit TEXT,
    total_stock FLOAT DEFAULT 0,
    allocated_stock FLOAT DEFAULT 0,
    price_per_unit FLOAT,
    icon TEXT,
    color TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES profiles(id),
    user_name TEXT,
    shop_id TEXT,
    shop_name TEXT,
    items TEXT, 
    date TEXT,
    month TEXT,
    status TEXT DEFAULT 'completed',
    receipt TEXT UNIQUE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES profiles(id),
    msg TEXT,
    type TEXT,
    date TEXT,
    is_read BOOLEAN DEFAULT 0
  )`);

  // Orders table
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES profiles(id),
    user_name TEXT,
    items TEXT, -- JSON
    total FLOAT,
    status TEXT DEFAULT 'Order Placed',
    payment_method TEXT,
    date TEXT
  )`);

  db.get("SELECT COUNT(*) as count FROM stock", (err, row) => {
    if (row && row.count === 0) {
      const stmt = db.prepare("INSERT INTO stock (item, unit, total_stock, allocated_stock, price_per_unit, icon, color) VALUES (?,?,?,?,?,?,?)");
      stmt.run('Rice', 'kg', 2500, 1800, 2, '🌾', '#22c55e');
      stmt.run('Wheat', 'kg', 1200, 900, 3, '🌾', '#f97316');
      stmt.run('Sugar', 'kg', 600, 450, 13, '🍬', '#a855f7');
      stmt.run('Oil', 'L', 400, 300, 20, '🫙', '#14b8a6');
      stmt.run('Dhal', 'kg', 350, 200, 40, '🫘', '#f97316');
      stmt.run('Kerosene', 'L', 800, 600, 15, '⛽', '#ef4444');
      stmt.finalize();
    }
  });
});

app.post('/api/send-otp', (req, res) => {
  const { mobile, userId } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('\n----------------------------------------');
  console.log(`🔑 OTP CODE: ${otp}`);
  console.log('----------------------------------------\n');
  res.json({ success: true, otp }); 
});

app.get('/api/data', (req, res) => {
  db.all("SELECT * FROM profiles", (err, users) => {
    db.all("SELECT * FROM stock", (err, stock) => {
      db.all("SELECT * FROM transactions", (err, transactions) => {
        db.all("SELECT * FROM notifications", (err, notifications) => {
          res.json({ users, stock, transactions, notifications });
        });
      });
    });
  });
});

app.post('/api/register', (req, res) => {
  const user = req.body;
  const id = user.id || `USR${Math.floor(1000 + Math.random() * 9000)}`;
  db.run(`INSERT INTO profiles (id, name, father_name, aadhaar, ration_card, mobile, district, status, role) VALUES (?,?,?,?,?,?,?,?,?)`, 
    [id, user.name, user.fatherName, user.aadhaar, user.rationCard, user.mobile, user.district, 'pending', 'user'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id });
    }
  );
});

app.post('/api/login', (req, res) => {
  const { id } = req.body;
  const safeId = (id || '').trim();
  db.get("SELECT * FROM profiles WHERE LOWER(id) = LOWER(?)", [safeId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ user });
  });
});

app.post('/api/stock', (req, res) => {
  const { item, updates } = req.body;
  db.run(`UPDATE stock SET total_stock = ?, allocated_stock = ? WHERE item = ?`, 
    [updates.total_stock, updates.allocated_stock, item],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Orders APIs
app.get('/api/orders', (req, res) => {
  db.all("SELECT * FROM orders ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ orders: rows });
  });
});

app.post('/api/orders', (req, res) => {
  const { userId, userName, items, total, paymentMethod } = req.body;
  const date = new Date().toLocaleString('en-IN');
  db.run(`INSERT INTO orders (user_id, user_name, items, total, payment_method, date) VALUES (?,?,?,?,?,?)`,
    [userId, userName, JSON.stringify(items), total, paymentMethod, date],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.post('/api/orders/status', (req, res) => {
  const { id, status } = req.body;
  db.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SQL BACKEND RUNNING ON http://localhost:${PORT}`);
});
