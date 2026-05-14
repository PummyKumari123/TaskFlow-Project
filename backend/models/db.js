/**
 * db.js — SQLite via sql.js (pure JavaScript, no native compilation)
 */
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'taskflow.db');
let _db = null;

function saveDb() {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function toSqlJs(v) {
  if (v === undefined) return null;
  return v;
}

// Public API mirroring better-sqlite3
const db = {
  prepare(sql) {
    return {
      get(...params) {
        const stmt = _db.prepare(sql);
        stmt.bind(params.map(toSqlJs));
        let row = undefined;
        if (stmt.step()) row = stmt.getAsObject();
        stmt.free();
        return row;
      },
      all(...params) {
        const stmt = _db.prepare(sql);
        stmt.bind(params.map(toSqlJs));
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },
      run(...params) {
        const stmt = _db.prepare(sql);
        stmt.run(params.map(toSqlJs));
        stmt.free();
        const lastInsertRowid = _db.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? 0;
        const changes = _db.exec('SELECT changes()')[0]?.values[0][0] ?? 0;
        saveDb();
        return { lastInsertRowid, changes };
      },
    };
  },
  exec(sql) {
    _db.run(sql);
    saveDb();
  },
  pragma() {},
};

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    _db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _db = new SQL.Database();
  }

  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      avatar TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      owner_id INTEGER NOT NULL,
      due_date DATE,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at DATETIME DEFAULT (datetime('now')),
      UNIQUE(project_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      project_id INTEGER NOT NULL,
      assignee_id INTEGER,
      creator_id INTEGER NOT NULL,
      due_date DATE,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT (datetime('now'))
    );
  `);
  saveDb();
  console.log('✅ Database ready');
  return db;
}

module.exports = { db, initDb };
