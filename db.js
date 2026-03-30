const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DB_FILE = path.join(__dirname, "school.db");
const USERS_JSON = path.join(__dirname, "users.json");
const SCHOOL_DATA_JSON = path.join(__dirname, "school-data.json");

const db = new DatabaseSync(DB_FILE);

function initDb() {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      profile_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      audience TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      event_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      student_email TEXT NOT NULL,
      student_name TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS grades (
      id TEXT PRIMARY KEY,
      student_email TEXT NOT NULL,
      student_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      score REAL NOT NULL,
      max_score REAL NOT NULL,
      score_percent REAL NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      student_email TEXT NOT NULL,
      student_name TEXT NOT NULL,
      status TEXT NOT NULL,
      date TEXT NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kiosk_highlights (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_insights (
      id TEXT PRIMARY KEY,
      student_email TEXT NOT NULL,
      student_name TEXT NOT NULL,
      source_record_type TEXT NOT NULL,
      source_record_id TEXT NOT NULL,
      diagnosis TEXT NOT NULL,
      actions_json TEXT NOT NULL,
      outlook TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  migrateJsonIfNeeded();
}

function tableCount(tableName) {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get();
  return row.count;
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function migrateJsonIfNeeded() {
  if (tableCount("users") === 0 && fs.existsSync(USERS_JSON)) {
    const users = parseJson(fs.readFileSync(USERS_JSON, "utf8"), []);
    const insert = db.prepare(`
      INSERT INTO users (id, full_name, email, role, password_hash, profile_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec("BEGIN");
    try {
      users.forEach((user) => {
        insert.run(
          user.id,
          user.fullName,
          user.email,
          user.role,
          user.passwordHash,
          JSON.stringify(user.profile || {}),
          user.createdAt
        );
      });
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  const shouldMigrateSchoolData =
    tableCount("announcements") === 0 &&
    tableCount("events") === 0 &&
    tableCount("achievements") === 0 &&
    tableCount("grades") === 0 &&
    tableCount("attendance") === 0 &&
    tableCount("kiosk_highlights") === 0 &&
    tableCount("ai_insights") === 0;

  if (shouldMigrateSchoolData && fs.existsSync(SCHOOL_DATA_JSON)) {
    const schoolData = parseJson(fs.readFileSync(SCHOOL_DATA_JSON, "utf8"), {
      announcements: [],
      events: [],
      achievements: [],
      grades: [],
      attendance: [],
      kioskHighlights: []
    });

    const insertAnnouncement = db.prepare(`
      INSERT INTO announcements (id, title, body, audience, created_at, created_by_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertEvent = db.prepare(`
      INSERT INTO events (id, title, body, event_date, created_at, created_by_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertAchievement = db.prepare(`
      INSERT INTO achievements (id, student_email, student_name, title, body, created_at, created_by_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertGrade = db.prepare(`
      INSERT INTO grades (id, student_email, student_name, subject, score, max_score, score_percent, comment, created_at, created_by_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertAttendance = db.prepare(`
      INSERT INTO attendance (id, student_email, student_name, status, date, comment, created_at, created_by_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertKiosk = db.prepare(`
      INSERT INTO kiosk_highlights (id, title, body, created_at, created_by_name)
      VALUES (?, ?, ?, ?, ?)
    `);

    db.exec("BEGIN");
    try {
      (schoolData.announcements || []).forEach((item) => {
        insertAnnouncement.run(item.id, item.title, item.body, item.audience, item.createdAt, item.createdByName);
      });
      (schoolData.events || []).forEach((item) => {
        insertEvent.run(item.id, item.title, item.body, item.eventDate, item.createdAt, item.createdByName);
      });
      (schoolData.achievements || []).forEach((item) => {
        insertAchievement.run(item.id, item.studentEmail, item.studentName, item.title, item.body, item.createdAt, item.createdByName);
      });
      (schoolData.grades || []).forEach((item) => {
        insertGrade.run(
          item.id,
          item.studentEmail,
          item.studentName,
          item.subject,
          item.score,
          item.maxScore,
          item.scorePercent,
          item.comment,
          item.createdAt,
          item.createdByName
        );
      });
      (schoolData.attendance || []).forEach((item) => {
        insertAttendance.run(
          item.id,
          item.studentEmail,
          item.studentName,
          item.status,
          item.date,
          item.comment,
          item.createdAt,
          item.createdByName
        );
      });
      (schoolData.kioskHighlights || []).forEach((item) => {
        insertKiosk.run(item.id, item.title, item.body, item.createdAt, item.createdByName);
      });
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash,
    profile: parseJson(row.profile_json, {}),
    createdAt: row.created_at
  };
}

function getUsers() {
  return db.prepare("SELECT * FROM users ORDER BY created_at DESC").all().map(mapUser);
}

function getUserByEmail(email) {
  return mapUser(db.prepare("SELECT * FROM users WHERE email = ?").get(email));
}

function createUser(user) {
  db.prepare(`
    INSERT INTO users (id, full_name, email, role, password_hash, profile_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    user.id,
    user.fullName,
    user.email,
    user.role,
    user.passwordHash,
    JSON.stringify(user.profile || {}),
    user.createdAt
  );
}

function getStudents() {
  return db.prepare("SELECT * FROM users WHERE role = 'student' ORDER BY full_name ASC").all().map(mapUser);
}

function getAnnouncements() {
  return db.prepare("SELECT * FROM announcements ORDER BY created_at DESC").all().map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    audience: row.audience,
    createdAt: row.created_at,
    createdByName: row.created_by_name
  }));
}

function getEvents() {
  return db.prepare("SELECT * FROM events ORDER BY created_at DESC").all().map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    eventDate: row.event_date,
    createdAt: row.created_at,
    createdByName: row.created_by_name
  }));
}

function getAchievements(studentEmail = null) {
  const stmt = studentEmail
    ? db.prepare("SELECT * FROM achievements WHERE student_email = ? ORDER BY created_at DESC")
    : db.prepare("SELECT * FROM achievements ORDER BY created_at DESC");
  return stmt.all(...(studentEmail ? [studentEmail] : [])).map((row) => ({
    id: row.id,
    studentEmail: row.student_email,
    studentName: row.student_name,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    createdByName: row.created_by_name
  }));
}

function getGrades(studentEmail = null) {
  const stmt = studentEmail
    ? db.prepare("SELECT * FROM grades WHERE student_email = ? ORDER BY created_at DESC")
    : db.prepare("SELECT * FROM grades ORDER BY created_at DESC");
  return stmt.all(...(studentEmail ? [studentEmail] : [])).map((row) => ({
    id: row.id,
    studentEmail: row.student_email,
    studentName: row.student_name,
    subject: row.subject,
    score: row.score,
    maxScore: row.max_score,
    scorePercent: row.score_percent,
    comment: row.comment,
    createdAt: row.created_at,
    createdByName: row.created_by_name
  }));
}

function getGradeById(id) {
  const row = db.prepare("SELECT * FROM grades WHERE id = ?").get(id);
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    studentEmail: row.student_email,
    studentName: row.student_name,
    subject: row.subject,
    score: row.score,
    maxScore: row.max_score,
    scorePercent: row.score_percent,
    comment: row.comment,
    createdAt: row.created_at,
    createdByName: row.created_by_name
  };
}

function getAttendance(studentEmail = null) {
  const stmt = studentEmail
    ? db.prepare("SELECT * FROM attendance WHERE student_email = ? ORDER BY created_at DESC")
    : db.prepare("SELECT * FROM attendance ORDER BY created_at DESC");
  return stmt.all(...(studentEmail ? [studentEmail] : [])).map((row) => ({
    id: row.id,
    studentEmail: row.student_email,
    studentName: row.student_name,
    status: row.status,
    date: row.date,
    comment: row.comment,
    createdAt: row.created_at,
    createdByName: row.created_by_name
  }));
}

function getKioskHighlights() {
  return db.prepare("SELECT * FROM kiosk_highlights ORDER BY created_at DESC").all().map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    createdByName: row.created_by_name
  }));
}

function getLatestAiInsight(studentEmail) {
  const row = db
    .prepare("SELECT * FROM ai_insights WHERE student_email = ? ORDER BY created_at DESC LIMIT 1")
    .get(studentEmail);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    studentEmail: row.student_email,
    studentName: row.student_name,
    sourceRecordType: row.source_record_type,
    sourceRecordId: row.source_record_id,
    diagnosis: row.diagnosis,
    actions: parseJson(row.actions_json, []),
    outlook: row.outlook,
    rawText: row.raw_text,
    createdAt: row.created_at
  };
}

function insertAnnouncement(item) {
  db.prepare(`
    INSERT INTO announcements (id, title, body, audience, created_at, created_by_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(item.id, item.title, item.body, item.audience, item.createdAt, item.createdByName);
}

function insertEvent(item) {
  db.prepare(`
    INSERT INTO events (id, title, body, event_date, created_at, created_by_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(item.id, item.title, item.body, item.eventDate, item.createdAt, item.createdByName);
}

function insertAchievement(item) {
  db.prepare(`
    INSERT INTO achievements (id, student_email, student_name, title, body, created_at, created_by_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(item.id, item.studentEmail, item.studentName, item.title, item.body, item.createdAt, item.createdByName);
}

function insertGrade(item) {
  db.prepare(`
    INSERT INTO grades (id, student_email, student_name, subject, score, max_score, score_percent, comment, created_at, created_by_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    item.id,
    item.studentEmail,
    item.studentName,
    item.subject,
    item.score,
    item.maxScore,
    item.scorePercent,
    item.comment,
    item.createdAt,
    item.createdByName
  );
}

function insertAttendance(item) {
  db.prepare(`
    INSERT INTO attendance (id, student_email, student_name, status, date, comment, created_at, created_by_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(item.id, item.studentEmail, item.studentName, item.status, item.date, item.comment, item.createdAt, item.createdByName);
}

function insertKioskHighlight(item) {
  db.prepare(`
    INSERT INTO kiosk_highlights (id, title, body, created_at, created_by_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(item.id, item.title, item.body, item.createdAt, item.createdByName);
}

function insertAiInsight(item) {
  db.prepare(`
    INSERT INTO ai_insights (
      id,
      student_email,
      student_name,
      source_record_type,
      source_record_id,
      diagnosis,
      actions_json,
      outlook,
      raw_text,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    item.id,
    item.studentEmail,
    item.studentName,
    item.sourceRecordType,
    item.sourceRecordId,
    item.diagnosis,
    JSON.stringify(item.actions || []),
    item.outlook,
    item.rawText,
    item.createdAt
  );
}

function deleteAnnouncement(id) {
  return db.prepare("DELETE FROM announcements WHERE id = ?").run(id);
}

function deleteGrade(id) {
  return db.prepare("DELETE FROM grades WHERE id = ?").run(id);
}

function deleteEvent(id) {
  return db.prepare("DELETE FROM events WHERE id = ?").run(id);
}

function deleteKioskHighlight(id) {
  return db.prepare("DELETE FROM kiosk_highlights WHERE id = ?").run(id);
}

module.exports = {
  db,
  DB_FILE,
  initDb,
  getUsers,
  getUserByEmail,
  createUser,
  getStudents,
  getAnnouncements,
  getEvents,
  getAchievements,
  getGrades,
  getGradeById,
  getAttendance,
  getKioskHighlights,
  getLatestAiInsight,
  insertAnnouncement,
  insertEvent,
  insertAchievement,
  insertGrade,
  insertAttendance,
  insertKioskHighlight,
  insertAiInsight,
  deleteAnnouncement,
  deleteGrade,
  deleteEvent,
  deleteKioskHighlight
};
