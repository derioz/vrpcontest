import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("contest.db");

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS contests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contest_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (contest_id) REFERENCES contests(id)
  );

  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    discord_name TEXT NOT NULL,
    image_data TEXT NOT NULL,
    caption TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id INTEGER NOT NULL,
    voter_name TEXT NOT NULL,
    UNIQUE(photo_id, voter_name),
    FOREIGN KEY (photo_id) REFERENCES photos(id)
  );

  CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    importance TEXT DEFAULT 'Normal',
    display_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('voting_open', 'false');
`);

// Migrations
try {
  // 1. Add discord_name to photos
  const photoCols = db.prepare("PRAGMA table_info(photos)").all() as any[];
  if (!photoCols.some(col => col.name === 'discord_name')) {
    db.prepare("ALTER TABLE photos ADD COLUMN discord_name TEXT NOT NULL DEFAULT 'unknown'").run();
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_discord_name ON photos(discord_name)").run();
  }

  // 2. Ensure default contest exists
  const contestCount = db.prepare("SELECT COUNT(*) as count FROM contests").get() as any;
  if (contestCount.count === 0) {
    db.prepare("INSERT INTO contests (name, is_active) VALUES ('Monthly Contest', 1)").run();
  }
  
  // 3. Add contest_id to categories and link to default contest
  const catCols = db.prepare("PRAGMA table_info(categories)").all() as any[];
  if (!catCols.some(col => col.name === 'contest_id')) {
    db.prepare("ALTER TABLE categories ADD COLUMN contest_id INTEGER").run();
    const defaultContest = db.prepare("SELECT id FROM contests WHERE is_active = 1").get() as any;
    if (defaultContest) {
      db.prepare("UPDATE categories SET contest_id = ?").run(defaultContest.id);
    }
  }

  // 4. Seed default categories if empty
  const catCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as any;
  if (catCount.count === 0) {
    const defaultContest = db.prepare("SELECT id FROM contests WHERE is_active = 1").get() as any;
    if (defaultContest) {
        db.prepare("INSERT INTO categories (contest_id, name, description) VALUES (?, 'Best Vehicle', 'Show off your favorite ride')").run(defaultContest.id);
        db.prepare("INSERT INTO categories (contest_id, name, description) VALUES (?, 'Scenic Los Santos', 'Beautiful landscapes and city views')").run(defaultContest.id);
        db.prepare("INSERT INTO categories (contest_id, name, description) VALUES (?, 'Action Shot', 'Intense moments captured')").run(defaultContest.id);
    }
  }

} catch (e) {
  console.error("Migration failed:", e);
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"; // In production, use environment variable

// Auth Middleware
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  
  const token = authHeader.split(' ')[1];
  const session = db.prepare("SELECT * FROM sessions WHERE token = ?").get(token);
  
  if (!session) return res.status(401).json({ error: "Invalid token" });
  next();
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Auth Routes
  app.post("/api/auth/login", (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      const token = crypto.randomUUID();
      db.prepare("INSERT INTO sessions (token) VALUES (?)").run(token);
      res.json({ token });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    }
    res.json({ success: true });
  });

  // Contest Routes
  app.get("/api/contests", (req, res) => {
    const contests = db.prepare("SELECT * FROM contests ORDER BY created_at DESC").all();
    res.json(contests);
  });

  app.get("/api/contest/active", (req, res) => {
    const contest = db.prepare("SELECT * FROM contests WHERE is_active = 1").get();
    res.json(contest);
  });

  app.post("/api/admin/contest/archive", requireAuth, (req, res) => {
    const { nextContestName } = req.body;
    
    db.transaction(() => {
      // Archive current
      db.prepare("UPDATE contests SET is_active = 0 WHERE is_active = 1").run();
      // Create new
      const info = db.prepare("INSERT INTO contests (name, is_active) VALUES (?, 1)").run(nextContestName || `Contest ${new Date().toLocaleDateString()}`);
      // Create default categories for new contest
      const newContestId = info.lastInsertRowid;
       db.prepare("INSERT INTO categories (contest_id, name, description) VALUES (?, 'Best Vehicle', 'Show off your favorite ride')").run(newContestId);
       db.prepare("INSERT INTO categories (contest_id, name, description) VALUES (?, 'Scenic Los Santos', 'Beautiful landscapes and city views')").run(newContestId);
       db.prepare("INSERT INTO categories (contest_id, name, description) VALUES (?, 'Action Shot', 'Intense moments captured')").run(newContestId);
    })();
    
    res.json({ success: true });
  });

  // API Routes
  app.get("/api/theme", (req, res) => {
    const theme = db.prepare("SELECT value FROM settings WHERE key = 'current_theme'").get();
    res.json({ theme: theme ? JSON.parse(theme.value) : null });
  });

  app.post("/api/admin/generate-theme", requireAuth, async (req, res) => {
    const { description } = req.body;

    try {
      const prompt = `Generate a JSON object for a website theme based on the description: "${description}".
      The theme should include colors for background, text, primary accent, secondary accent, and card background.
      The output must be a valid JSON object with the following structure:
      {
        "colors": {
          "background": "#hex",
          "text": "#hex",
          "primary": "#hex",
          "secondary": "#hex",
          "card": "#hex",
          "accent": "#hex"
        },
        "font": "sans-serif" // or "serif", "monospace"
      }
      Do not include any markdown formatting or code blocks. Just the raw JSON string.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              colors: {
                type: Type.OBJECT,
                properties: {
                  background: { type: Type.STRING },
                  text: { type: Type.STRING },
                  primary: { type: Type.STRING },
                  secondary: { type: Type.STRING },
                  card: { type: Type.STRING },
                  accent: { type: Type.STRING }
                }
              },
              font: { type: Type.STRING }
            }
          }
        }
      });

      const theme = JSON.parse(response.text);
      res.json(theme);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to generate theme" });
    }
  });

  app.post("/api/admin/save-theme", requireAuth, (req, res) => {
    const { theme } = req.body;

    try {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('current_theme', ?)").run(JSON.stringify(theme));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to save theme" });
    }
  });

  app.get("/api/categories", (req, res) => {
    const { contestId } = req.query;
    let query = "SELECT * FROM categories";
    const params = [];

    if (contestId) {
      query += " WHERE contest_id = ?";
      params.push(contestId);
    } else {
      // Default to active contest
      const activeContest = db.prepare("SELECT id FROM contests WHERE is_active = 1").get() as any;
      if (activeContest) {
        query += " WHERE contest_id = ?";
        params.push(activeContest.id);
      }
    }

    const categories = db.prepare(query).all(...params);
    res.json(categories);
  });

  app.post("/api/categories", requireAuth, (req, res) => {
    const { name, description } = req.body;
    
    try {
      const activeContest = db.prepare("SELECT id FROM contests WHERE is_active = 1").get() as any;
      if (!activeContest) return res.status(400).json({ error: "No active contest" });

      const info = db.prepare("INSERT INTO categories (contest_id, name, description) VALUES (?, ?, ?)").run(activeContest.id, name, description);
      res.json({ id: info.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Category already exists" });
    }
  });

  app.get("/api/photos/:categoryId", (req, res) => {
    const photos = db.prepare(`
      SELECT p.*, COUNT(v.id) as vote_count 
      FROM photos p 
      LEFT JOIN votes v ON p.id = v.photo_id 
      WHERE p.category_id = ? 
      GROUP BY p.id
      ORDER BY created_at DESC
    `).all(req.params.categoryId);
    res.json(photos);
  });

  app.post("/api/photos", (req, res) => {
    const { categoryId, playerName, discordName, imageData, caption } = req.body;
    if (!categoryId || !playerName || !discordName || !imageData) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if discord name already submitted
    const existing = db.prepare("SELECT id FROM photos WHERE discord_name = ?").get(discordName);
    if (existing) {
      return res.status(400).json({ error: "You have already submitted a photo. Limit is 1 per player." });
    }

    try {
      const info = db.prepare("INSERT INTO photos (category_id, player_name, discord_name, image_data, caption) VALUES (?, ?, ?, ?, ?)")
        .run(categoryId, playerName, discordName, imageData, caption);
      res.json({ id: info.lastInsertRowid });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to save photo" });
    }
  });

  app.get("/api/status", (req, res) => {
    const status = db.prepare("SELECT value FROM settings WHERE key = 'voting_open'").get();
    res.json({ votingOpen: status.value === 'true' });
  });

  app.post("/api/admin/toggle-voting", requireAuth, (req, res) => {
    const { open } = req.body;
    db.prepare("UPDATE settings SET value = ? WHERE key = 'voting_open'").run(open ? 'true' : 'false');
    res.json({ success: true, votingOpen: open });
  });

  app.post("/api/votes", (req, res) => {
    const { photoId, voterName } = req.body;
    const status = db.prepare("SELECT value FROM settings WHERE key = 'voting_open'").get();
    if (status.value !== 'true') return res.status(400).json({ error: "Voting is closed" });

    try {
      db.prepare("INSERT INTO votes (photo_id, voter_name) VALUES (?, ?)").run(photoId, voterName);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "You have already voted for this photo" });
    }
  });

  app.get("/api/rules", (req, res) => {
    const rules = db.prepare("SELECT * FROM rules ORDER BY display_order ASC, id ASC").all();
    res.json(rules);
  });

  app.post("/api/admin/rules", requireAuth, (req, res) => {
    const { title, content, category, importance } = req.body;
    const info = db.prepare("INSERT INTO rules (title, content, category, importance) VALUES (?, ?, ?, ?)")
      .run(title, content, category, importance);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/admin/rules/:id", requireAuth, (req, res) => {
    const { title, content, category, importance } = req.body;
    db.prepare("UPDATE rules SET title = ?, content = ?, category = ?, importance = ? WHERE id = ?")
      .run(title, content, category, importance, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/admin/rules/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM rules WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
