/**
 * db.js
 * SQLite database management for applications and warnings.
 */

const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "applications.db");
let db;

function initDB() {
  return new Promise((resolve, reject) => {
    try {
      db = new Database(DB_PATH);

      db.exec(`
        CREATE TABLE IF NOT EXISTS applications (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id     TEXT    NOT NULL,
          username    TEXT    NOT NULL,
          score       INTEGER NOT NULL,
          total       INTEGER NOT NULL,
          percentage  REAL    NOT NULL,
          accepted    INTEGER NOT NULL,
          applied_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_user_id ON applications(user_id);

        CREATE TABLE IF NOT EXISTS warnings (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id      TEXT    NOT NULL,
          username     TEXT    NOT NULL,
          moderator_id TEXT    NOT NULL,
          mod_username TEXT    NOT NULL,
          reason       TEXT    NOT NULL,
          warned_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_warn_user ON warnings(user_id);

        CREATE TABLE IF NOT EXISTS shifts (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          time        TEXT    NOT NULL,
          start_time  TEXT    NOT NULL,
          created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS trainings (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          title         TEXT    NOT NULL,
          start_time    TEXT    NOT NULL,
          entry_time    TEXT    NOT NULL,
          min_participants INTEGER NOT NULL,
          creator       TEXT    NOT NULL,
          created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS moderators (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          type        TEXT    NOT NULL,
          target_id   TEXT    NOT NULL,
          added_by    TEXT    NOT NULL,
          added_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        );
      `);

      console.log("✅ Database initialised at", DB_PATH);
      resolve();
    } catch (err) {
      console.error("❌ Database init error:", err);
      reject(err);
    }
  });
}

// ─── Applications ─────────────────────────────────────────────────────────────
function saveApplication({ userId, username, score, total, accepted }) {
  return new Promise((resolve, reject) => {
    try {
      const percentage = parseFloat(((score / total) * 100).toFixed(2));
      const stmt = db.prepare(
        "INSERT INTO applications (user_id, username, score, total, percentage, accepted) VALUES (?, ?, ?, ?, ?, ?)",
      );
      const info = stmt.run(
        userId,
        username,
        score,
        total,
        percentage,
        accepted ? 1 : 0,
      );
      resolve(info.lastInsertRowid);
    } catch (err) {
      console.error("DB save error:", err);
      reject(err);
    }
  });
}

function getLastApplication(userId) {
  return new Promise((resolve, reject) => {
    try {
      const row = db
        .prepare(
          "SELECT * FROM applications WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        )
        .get(userId);
      resolve(row || null);
    } catch (err) {
      reject(err);
    }
  });
}

function getAllApplications(limit = 100) {
  return new Promise((resolve, reject) => {
    try {
      const rows = db
        .prepare("SELECT * FROM applications ORDER BY id DESC LIMIT ?")
        .all(limit);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

function getStats() {
  return new Promise((resolve, reject) => {
    try {
      const row = db
        .prepare(
          `
        SELECT COUNT(*) AS total, SUM(accepted) AS accepted,
               COUNT(*) - SUM(accepted) AS rejected, ROUND(AVG(percentage), 1) AS avg_pct
        FROM applications
      `,
        )
        .get();
      resolve(row);
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Warnings ─────────────────────────────────────────────────────────────────
function addWarning({ userId, username, moderatorId, modUsername, reason }) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(
        "INSERT INTO warnings (user_id, username, moderator_id, mod_username, reason) VALUES (?, ?, ?, ?, ?)",
      );
      const info = stmt.run(userId, username, moderatorId, modUsername, reason);
      const count = db
        .prepare("SELECT COUNT(*) AS c FROM warnings WHERE user_id = ?")
        .get(userId).c;
      resolve({ id: info.lastInsertRowid, totalWarnings: count });
    } catch (err) {
      reject(err);
    }
  });
}

function getWarnings(userId) {
  return new Promise((resolve, reject) => {
    try {
      const rows = db
        .prepare("SELECT * FROM warnings WHERE user_id = ? ORDER BY id ASC")
        .all(userId);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

function removeWarning(warnId) {
  return new Promise((resolve, reject) => {
    try {
      const warn = db
        .prepare("SELECT * FROM warnings WHERE id = ?")
        .get(warnId);
      if (!warn) return resolve(null);
      db.prepare("DELETE FROM warnings WHERE id = ?").run(warnId);
      resolve(warn);
    } catch (err) {
      reject(err);
    }
  });
}

function clearWarnings(userId) {
  return new Promise((resolve, reject) => {
    try {
      const info = db
        .prepare("DELETE FROM warnings WHERE user_id = ?")
        .run(userId);
      resolve(info.changes);
    } catch (err) {
      reject(err);
    }
  });
}

function getAllWarnings(limit = 200) {
  return new Promise((resolve, reject) => {
    try {
      const rows = db
        .prepare("SELECT * FROM warnings ORDER BY id DESC LIMIT ?")
        .all(limit);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Shifts ───────────────────────────────────────────────────────────────────
function addShift({ time, startTime }) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(
        "INSERT INTO shifts (time, start_time) VALUES (?, ?)",
      );
      const info = stmt.run(time, startTime);
      resolve(info.lastInsertRowid);
    } catch (err) {
      reject(err);
    }
  });
}

function getShifts() {
  return new Promise((resolve, reject) => {
    try {
      const rows = db.prepare("SELECT * FROM shifts ORDER BY id ASC").all();
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

function removeShift(shiftId) {
  return new Promise((resolve, reject) => {
    try {
      const info = db.prepare("DELETE FROM shifts WHERE id = ?").run(shiftId);
      resolve(info.changes > 0);
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Trainings ───────────────────────────────────────────────────────────────
function addTraining({
  title,
  startTime,
  entryTime,
  minParticipants,
  creator,
}) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(
        "INSERT INTO trainings (title, start_time, entry_time, min_participants, creator) VALUES (?, ?, ?, ?, ?)",
      );
      const info = stmt.run(
        title,
        startTime,
        entryTime,
        minParticipants,
        creator,
      );
      resolve(info.lastInsertRowid);
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Moderators ─────────────────────────────────────────────────────────────
function addModeratorUser(userId, addedBy) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(
        "INSERT INTO moderators (type, target_id, added_by) VALUES ('user', ?, ?)",
      );
      const info = stmt.run(userId, addedBy);
      resolve(info.lastInsertRowid);
    } catch (err) {
      reject(err);
    }
  });
}

function removeModeratorUser(userId) {
  return new Promise((resolve, reject) => {
    try {
      const info = db
        .prepare("DELETE FROM moderators WHERE type = 'user' AND target_id = ?")
        .run(userId);
      resolve(info.changes > 0);
    } catch (err) {
      reject(err);
    }
  });
}

function addModeratorRole(roleId, addedBy) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(
        "INSERT INTO moderators (type, target_id, added_by) VALUES ('role', ?, ?)",
      );
      const info = stmt.run(roleId, addedBy);
      resolve(info.lastInsertRowid);
    } catch (err) {
      reject(err);
    }
  });
}

function removeModeratorRole(roleId) {
  return new Promise((resolve, reject) => {
    try {
      const info = db
        .prepare("DELETE FROM moderators WHERE type = 'role' AND target_id = ?")
        .run(roleId);
      resolve(info.changes > 0);
    } catch (err) {
      reject(err);
    }
  });
}

function isUserModerator(userId) {
  return new Promise((resolve, reject) => {
    try {
      const row = db
        .prepare(
          "SELECT COUNT(*) AS c FROM moderators WHERE type = 'user' AND target_id = ?",
        )
        .get(userId);
      resolve(row.c > 0);
    } catch (err) {
      reject(err);
    }
  });
}

function getModeratorRoles() {
  return new Promise((resolve, reject) => {
    try {
      const rows = db
        .prepare("SELECT target_id FROM moderators WHERE type = 'role'")
        .all();
      resolve(rows.map((r) => r.target_id));
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  initDB,
  saveApplication,
  getLastApplication,
  getAllApplications,
  getStats,
  addWarning,
  getWarnings,
  removeWarning,
  clearWarnings,
  getAllWarnings,
  addShift,
  getShifts,
  removeShift,
  addTraining,
  addModeratorUser,
  removeModeratorUser,
  addModeratorRole,
  removeModeratorRole,
  isUserModerator,
  getModeratorRoles,
};
