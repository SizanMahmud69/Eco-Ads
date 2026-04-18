import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('earnpoint.db');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT UNIQUE,
    points INTEGER DEFAULT 0,
    is_premium BOOLEAN DEFAULT 0,
    last_spin_at DATETIME,
    last_scratch_at DATETIME,
    last_daily_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount_points INTEGER,
    amount_bdt REAL,
    method TEXT,
    account_number TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    points_reward INTEGER,
    type TEXT
  );

  CREATE TABLE IF NOT EXISTS user_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    task_id INTEGER,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(task_id) REFERENCES tasks(id)
  );
`);

// Seed initial tasks if empty
const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
if (taskCount.count === 0) {
  const insertTask = db.prepare('INSERT INTO tasks (title, description, points_reward, type) VALUES (?, ?, ?, ?)');
  insertTask.run('Daily Check-in', 'Get your daily reward', 50, 'daily');
  insertTask.run('Watch Video', 'Watch a short ad', 20, 'one-time');
  insertTask.run('Follow on FB', 'Follow our official page', 100, 'one-time');
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- API Routes ---

  // Auth (Simple for demo)
  app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    // Special Admin Check
    if (email === 'admin@ecoads.com' && password === 'Eco-Ads#@#') {
      // Check if admin exists in DB, if not create a virtual one or seed it
      let admin = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      if (!admin) {
        try {
          db.prepare('INSERT INTO users (username, email, password, is_premium) VALUES (?, ?, ?, ?)').run('Admin', email, password, 1);
        } catch (e: any) {
          // If username 'Admin' is taken, try a unique one
          if (e.message.includes('UNIQUE constraint failed: users.username')) {
            db.prepare('INSERT INTO users (username, email, password, is_premium) VALUES (?, ?, ?, ?)').run('Admin_' + Date.now(), email, password, 1);
          } else {
            throw e;
          }
        }
        admin = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      }
      return res.json(admin);
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    try {
      const info = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').run(username, email, password);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
      res.json(user);
    } catch (e: any) {
      if (e.message.includes('UNIQUE constraint failed: users.username')) {
        res.status(400).json({ error: 'Username is already taken' });
      } else if (e.message.includes('UNIQUE constraint failed: users.email')) {
        res.status(400).json({ error: 'Email is already registered' });
      } else {
        res.status(400).json({ error: 'Registration failed' });
      }
    }
  });

  // Points
  app.post('/api/users/:id/add-points', (req, res) => {
    const { id } = req.params;
    const { points, type } = req.body;
    
    const now = new Date().toISOString();
    let updateQuery = 'UPDATE users SET points = points + ?';
    if (type === 'spin') updateQuery += ', last_spin_at = ?';
    if (type === 'scratch') updateQuery += ', last_scratch_at = ?';
    if (type === 'daily') updateQuery += ', last_daily_at = ?';
    updateQuery += ' WHERE id = ?';

    const params = type ? [points, now, id] : [points, id];
    db.prepare(updateQuery).run(...params);
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json(user);
  });

  // Withdrawals
  app.get('/api/users/:id/withdrawals', (req, res) => {
    const withdrawals = db.prepare('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json(withdrawals);
  });

  app.post('/api/withdrawals', (req, res) => {
    const { userId, amountPoints, amountBDT, method, accountNumber } = req.body;
    const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number };
    
    if (user.points < amountPoints) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    db.transaction(() => {
      db.prepare('INSERT INTO withdrawals (user_id, amount_points, amount_bdt, method, account_number) VALUES (?, ?, ?, ?, ?)').run(userId, amountPoints, amountBDT, method, accountNumber);
      db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(amountPoints, userId);
    })();

    res.json({ success: true });
  });

  // Tasks
  app.get('/api/tasks', (req, res) => {
    const tasks = db.prepare('SELECT * FROM tasks').all();
    res.json(tasks);
  });

  // Admin Routes
  app.get('/api/admin/users', (req, res) => {
    const users = db.prepare('SELECT * FROM users').all();
    res.json(users);
  });

  app.get('/api/admin/withdrawals', (req, res) => {
    const withdrawals = db.prepare(`
      SELECT w.*, u.username, u.email 
      FROM withdrawals w 
      JOIN users u ON w.user_id = u.id 
      ORDER BY w.created_at DESC
    `).all();
    res.json(withdrawals);
  });

  app.post('/api/admin/withdrawals/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare('UPDATE withdrawals SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
