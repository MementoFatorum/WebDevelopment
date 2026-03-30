const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
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
} = require("./db");

loadEnvFile(path.join(__dirname, ".env"));

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || "gpt-5-mini";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ROOT = __dirname;

initDb();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) {
    return false;
  }

  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
}

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    profile: user.profile
  };
}

function validateRegistration(payload) {
  const role = String(payload.role || "").trim();
  const fullName = String(payload.fullName || "").trim();
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  const profile = payload.profile || {};

  if (!fullName || !email || !password || !role) {
    return "��������� ������������ ����.";
  }

  if (password.length < 6) {
    return "������ ������ ��������� ������� 6 ��������.";
  }

  if (!["student", "teacher", "parent"].includes(role)) {
    return "������������ ����.";
  }

  if (role === "student" && (!profile.className || !profile.studentId)) {
    return "��� ������� ����� ����� � ID �������.";
  }

  if (role === "teacher" && (!profile.subject || !profile.staffId)) {
    return "��� ������� ����� ������� � ��������� �����.";
  }

  if (role === "parent" && !profile.childEmail) {
    return "��� �������� ����� email ������.";
  }

  return null;
}

function serveStatic(req, res) {
  const requestPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const targetPath = path.join(ROOT, decodeURIComponent(requestPath));

  if (!targetPath.startsWith(ROOT)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(targetPath, (error, data) => {
    if (error) {
      const notFoundPath = path.join(ROOT, "404.html");
      fs.readFile(notFoundPath, (notFoundError, notFoundHtml) => {
        if (notFoundError) {
          sendJson(res, 404, { error: "Not found" });
          return;
        }
        sendHtml(res, 404, notFoundHtml);
      });
      return;
    }

    const extension = path.extname(targetPath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[extension] || "application/octet-stream" });
    res.end(data);
  });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseAiSections(text) {
  const normalized = String(text || "").replace(/\r/g, "");
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const sections = { diagnosis: "", actions: [], outlook: "" };
  let current = "diagnosis";

  lines.forEach((line) => {
    const clean = line.replace(/^\d+[\.\)]\s*/, "").replace(/^[-�]\s*/, "");
    const lower = clean.toLowerCase();

    if (lower.includes("�������")) {
      current = "diagnosis";
      return;
    }

    if (lower.includes("������") || lower.includes("���")) {
      current = "actions";
      return;
    }

    if (lower.includes("�����������") || lower.includes("�������")) {
      current = "outlook";
      return;
    }

    if (current === "actions") {
      sections.actions.push(clean);
      return;
    }

    if (current === "outlook") {
      sections.outlook += `${sections.outlook ? " " : ""}${clean}`;
      return;
    }

    sections.diagnosis += `${sections.diagnosis ? " " : ""}${clean}`;
  });

  if (!sections.actions.length) {
    sections.actions = lines.slice(0, 3).map((line) => line.replace(/^[-�]\s*/, ""));
  }

  if (!sections.diagnosis) {
    sections.diagnosis = normalized || "���� ������������ ������ ��� �������.";
  }

  if (!sections.outlook) {
    sections.outlook = "����������� ��������� �������� ������ � �������������� ���� ������ ������.";
  }

  return sections;
}

function buildFallbackAdvice(payload) {
  const grades = payload.grades || [];
  const weakest = [...grades].sort((a, b) => a.scorePercent - b.scorePercent)[0];
  const strongest = [...grades].sort((a, b) => b.scorePercent - a.scorePercent)[0];
  const role = payload.role || "student";
  const manualContext = String(payload.manualContext || "").trim();

  const byRole = {
    student: `�������� �� ������� ������� ${strongest?.subject || "��� ������ ������"} � �������� ${weakest?.subject || "���� ��� �������"} ����� �������� ���������� ��������.`,
    teacher: `����������������� �� �������� � ������ ��������� � �������� ������ ������� �������, ����� AI ����� �������� ������� ������.`,
    parent: `������� ��������� ������ ������ ������� � �������� ��������� ���� ������� � ���������� ������� �����������.`,
    admin: `������� ����� ���������� ���������� ������� � ����������, ����� �������������� ������� ����� ���� ������.`
  };

    return {
      source: "fallback",
      text: manualContext
        ? `${byRole[role]} AI ����� ���� ���� ������ ������� ������: ${manualContext.slice(0, 220)}${manualContext.length > 220 ? "..." : ""}`
        : byRole[role],
      sections: {
        diagnosis: `������� ����: ${strongest?.subject || "��� �� ����������"}. ���� ��������: ${weakest?.subject || "��� ��� ������"}.`,
        actions: [
        "�������� ������ �������� ������� � ������.",
        "������������ �������� ����� 7 ����.",
        "�������� ������������, ������������ � ���������� ����������."
      ],
      outlook: byRole[role]
    }
  };
}

function ensureActorCanMutate(actor, allowedRoles) {
  if (!actor || !allowedRoles.includes(actor.role)) {
    return "������������ ���� ��� ����� ��������.";
  }
  return null;
}

function computeStudentMetrics(studentEmail, schoolData) {
  const grades = schoolData.grades.filter((item) => item.studentEmail === studentEmail);
  const attendance = schoolData.attendance.filter((item) => item.studentEmail === studentEmail);
  const achievements = schoolData.achievements.filter((item) => item.studentEmail === studentEmail);
  const average = grades.length
    ? grades.reduce((sum, item) => sum + item.scorePercent, 0) / grades.length
    : null;
  const absences = attendance.filter((item) => item.status === "absent").length;

  return {
    grades,
    attendance,
    achievements,
    average,
    absences
  };
}

function buildRiskList(users, schoolData) {
  return users
    .filter((user) => user.role === "student")
    .map((student) => {
      const metrics = computeStudentMetrics(student.email, schoolData);
      const risks = [];

      if (metrics.average !== null && metrics.average < 65) {
        risks.push(`������� ��������� ${metrics.average.toFixed(1)}%`);
      }

      if (metrics.absences > 2) {
        risks.push(`���������: ${metrics.absences}`);
      }

      return {
        studentEmail: student.email,
        studentName: student.fullName,
        className: student.profile?.className || "�� ������",
        riskLevel: risks.length === 0 ? "low" : risks.length > 1 ? "high" : "medium",
        note: risks.length ? risks.join(", ") : "����������� �������� ���"
      };
    })
    .filter((item) => item.riskLevel !== "low");
}

function buildDashboardData(user) {
  const users = getUsers();
  const schoolData = {
    announcements: getAnnouncements(),
    events: getEvents(),
    achievements: getAchievements(),
    grades: getGrades(),
    attendance: getAttendance(),
    kioskHighlights: getKioskHighlights()
  };
  const students = users
    .filter((item) => item.role === "student")
    .map((item) => ({
      fullName: item.fullName,
      email: item.email,
      className: item.profile?.className || ""
    }));

  const announcements = schoolData.announcements.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const events = schoolData.events.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const kioskHighlights = schoolData.kioskHighlights.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const riskList = buildRiskList(users, schoolData);

  if (!user) {
    return {
      role: "guest",
      summary: [],
      records: {},
      announcements,
      events,
      kioskHighlights,
      students: []
    };
  }

  if (user.role === "student") {
    const metrics = computeStudentMetrics(user.email, schoolData);
    const latestInsight = getLatestAiInsight(user.email);

    return {
      role: "student",
      summary: [
        { label: "������", value: String(metrics.grades.length) },
        { label: "������� ���������", value: metrics.average === null ? "��� ������" : `${metrics.average.toFixed(1)}%` },
        { label: "���������", value: String(metrics.absences) },
        { label: "����������", value: String(metrics.achievements.length) }
      ],
      records: {
        grades: metrics.grades,
        attendance: metrics.attendance,
        achievements: metrics.achievements,
        riskList: [],
        announcements,
        events,
        latestInsight
      },
      announcements,
      events,
      kioskHighlights
    };
  }

  if (user.role === "parent") {
    const childEmail = normalizeEmail(user.profile?.childEmail);
    const linkedStudent = users.find((item) => item.email === childEmail && item.role === "student");
    const metrics = computeStudentMetrics(childEmail, schoolData);
    const latestInsight = linkedStudent ? getLatestAiInsight(childEmail) : null;

    return {
      role: "parent",
      summary: [
        { label: "������", value: linkedStudent?.fullName || user.profile?.childName || "�� ������" },
        { label: "������", value: String(metrics.grades.length) },
        { label: "������� ���������", value: metrics.average === null ? "��� ������" : `${metrics.average.toFixed(1)}%` },
        { label: "���������", value: String(metrics.absences) }
      ],
      records: {
        child: linkedStudent ? { fullName: linkedStudent.fullName, className: linkedStudent.profile?.className || "" } : null,
          grades: metrics.grades,
          attendance: metrics.attendance,
          achievements: metrics.achievements,
          announcements,
          events,
          latestInsight
        },
      announcements,
      events,
      kioskHighlights
    };
  }

  if (user.role === "teacher") {
    return {
      role: "teacher",
      summary: [
        { label: "��������", value: String(students.length) },
        { label: "������ �������", value: String(schoolData.grades.length) },
        { label: "������� ������������", value: String(schoolData.attendance.length) },
        { label: "����-��������", value: String(riskList.length) }
      ],
      records: {
        grades: schoolData.grades.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
        attendance: schoolData.attendance.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
        achievements: schoolData.achievements.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
        riskList,
        announcements,
        events
      },
      announcements,
      events,
      kioskHighlights,
      students
    };
  }

  return {
    role: "admin",
    summary: [
      { label: "�������������", value: String(users.length) },
      { label: "��������", value: String(announcements.length) },
      { label: "�������", value: String(events.length) },
      { label: "Kiosk ��������", value: String(kioskHighlights.length) }
    ],
    records: {
      grades: schoolData.grades.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
      achievements: schoolData.achievements.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
      riskList,
      announcements,
      events
    },
    announcements,
    events,
    kioskHighlights,
    students
  };
}

function handleRegister(payload, res) {
  const error = validateRegistration(payload);
  if (error) {
    sendJson(res, 400, { error });
    return;
  }

  const users = getUsers();
  const email = normalizeEmail(payload.email);
  if (users.some((user) => user.email === email)) {
    sendJson(res, 409, { error: "������������ � ����� email ��� ����������." });
    return;
  }

  const profile = { ...(payload.profile || {}) };
  if (profile.childEmail) {
    profile.childEmail = normalizeEmail(profile.childEmail);
  }
  delete profile.accessCode;

  const user = {
    id: crypto.randomUUID(),
    fullName: String(payload.fullName).trim(),
    email,
    role: payload.role,
    passwordHash: hashPassword(String(payload.password)),
    profile,
    createdAt: new Date().toISOString()
  };

  createUser(user);

  sendJson(res, 201, {
    message: "������� ������. ������ ����� ����� � ������.",
    user: sanitizeUser(user)
  });
}

function handleLogin(payload, res) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  const user = getUserByEmail(email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    sendJson(res, 401, { error: "�������� email ��� ������." });
    return;
  }

  sendJson(res, 200, {
    message: "���� �������� �������.",
    user: sanitizeUser(user)
  });
}

function handleDashboardData(payload, res) {
  const user = payload.user || null;
  sendJson(res, 200, buildDashboardData(user));
}

async function createRecord(payload, res) {
  const actor = payload.actor;
  const type = String(payload.type || "");
  const data = payload.data || {};
  const users = getUsers();

  const now = new Date().toISOString();
  const baseRecord = {
    id: crypto.randomUUID(),
    createdAt: now,
    createdByName: actor?.fullName || "Unknown"
  };

  if (type === "grade") {
    const permissionError = ensureActorCanMutate(actor, ["teacher", "admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }

    const student = users.find((item) => item.email === normalizeEmail(data.studentEmail) && item.role === "student");
    if (!student || !data.subject || data.score === undefined || data.maxScore === undefined) {
      sendJson(res, 400, { error: "����� ������, �������, ���� � �������� ������." });
      return;
    }

    const score = Number(data.score);
    const maxScore = Number(data.maxScore);
    const scorePercent = maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(1)) : 0;

      const recordId = baseRecord.id;
      insertGrade({
        ...baseRecord,
        studentEmail: student.email,
        studentName: student.fullName,
      subject: String(data.subject).trim(),
      score,
      maxScore,
        scorePercent,
        comment: String(data.comment || "").trim()
      });
      await generateAndStoreStudentInsight(student, "grade", recordId);
    } else if (type === "attendance") {
    const permissionError = ensureActorCanMutate(actor, ["teacher", "admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }

    const student = users.find((item) => item.email === normalizeEmail(data.studentEmail) && item.role === "student");
    if (!student || !data.status || !data.date) {
      sendJson(res, 400, { error: "����� ������, ������ � ����." });
      return;
    }

      const recordId = baseRecord.id;
      insertAttendance({
        ...baseRecord,
        studentEmail: student.email,
        studentName: student.fullName,
        status: String(data.status).trim(),
        date: String(data.date).trim(),
        comment: String(data.comment || "").trim()
      });
      await generateAndStoreStudentInsight(student, "attendance", recordId);
    } else if (type === "achievement") {
    const permissionError = ensureActorCanMutate(actor, ["teacher", "admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }

    const student = users.find((item) => item.email === normalizeEmail(data.studentEmail) && item.role === "student");
    if (!student || !data.title) {
      sendJson(res, 400, { error: "����� ������ � �������� ����������." });
      return;
    }

      const recordId = baseRecord.id;
      insertAchievement({
        ...baseRecord,
        studentEmail: student.email,
        studentName: student.fullName,
        title: String(data.title).trim(),
        body: String(data.body || "").trim()
      });
      await generateAndStoreStudentInsight(student, "achievement", recordId);
  } else if (type === "announcement") {
    const permissionError = ensureActorCanMutate(actor, ["admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }

    if (!data.title || !data.body) {
      sendJson(res, 400, { error: "����� ��������� � ����� ����������." });
      return;
    }

    insertAnnouncement({
      ...baseRecord,
      title: String(data.title).trim(),
      body: String(data.body).trim(),
      audience: String(data.audience || "school").trim()
    });
  } else if (type === "event") {
    const permissionError = ensureActorCanMutate(actor, ["admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }

    if (!data.title || !data.eventDate) {
      sendJson(res, 400, { error: "����� �������� ������� � ����." });
      return;
    }

    insertEvent({
      ...baseRecord,
      title: String(data.title).trim(),
      body: String(data.body || "").trim(),
      eventDate: String(data.eventDate).trim()
    });
  } else if (type === "kiosk") {
    const permissionError = ensureActorCanMutate(actor, ["admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }

    if (!data.title) {
      sendJson(res, 400, { error: "����� ��������� ��� ����������." });
      return;
    }

    insertKioskHighlight({
      ...baseRecord,
      title: String(data.title).trim(),
      body: String(data.body || "").trim()
    });
  } else {
    sendJson(res, 400, { error: "����������� ��� ������." });
    return;
  }
  sendJson(res, 201, { message: "������ ������� ���������." });
}

async function deleteRecord(payload, res) {
  const actor = payload.actor;
  const type = String(payload.type || "");
  const id = String(payload.id || "");

  if (!id) {
    sendJson(res, 400, { error: "�� ������ ������������� ������." });
    return;
  }

  let result;
  if (type === "grade") {
    const permissionError = ensureActorCanMutate(actor, ["teacher", "admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }

    const grade = getGradeById(id);
    if (!grade) {
      sendJson(res, 404, { error: "Запись не найдена." });
      return;
    }

    result = deleteGrade(id);

    if (result.changes) {
      const student = getUserByEmail(grade.studentEmail);
      if (student && student.role === "student") {
        await generateAndStoreStudentInsight(student, "grade_deleted", id);
      }
    }
  } else if (type === "announcement") {
    const permissionError = ensureActorCanMutate(actor, ["admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }
    result = deleteAnnouncement(id);
  } else if (type === "event") {
    const permissionError = ensureActorCanMutate(actor, ["admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }
    result = deleteEvent(id);
  } else if (type === "kiosk") {
    const permissionError = ensureActorCanMutate(actor, ["admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }
    result = deleteKioskHighlight(id);
  } else {
    sendJson(res, 400, { error: "�������� ��� ����� ���� �� ��������������." });
    return;
  }

  if (!result.changes) {
    sendJson(res, 404, { error: "������ �� �������." });
    return;
  }

  sendJson(res, 200, { message: "������ �������." });
}

async function handleAiAdvice(payload, res) {
  try {
    const result = await generateAiSections(payload);
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 500, {
      error: "Server error while calling AI",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

async function generateAiSections(payload) {
  if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
    return buildFallbackAdvice(payload);
  }

  const prompt = [
    "�� AI-��������� ��������� ������� Aqbobek Lyceum.",
    `���� ������������: ${payload.role || "guest"}.`,
    `���������������� ������: ${payload.prompt || "������������� ������� ��������."}`,
    `������ ������� ������ ������������: ${payload.manualContext || "�� �������������"}.`,
    `������: ${JSON.stringify(payload.grades || [])}.`,
    `������������: ${JSON.stringify(payload.attendance || [])}.`,
    `����������: ${JSON.stringify(payload.achievements || [])}.`,
    `�������: ${JSON.stringify(payload.events || [])}.`,
    "��� ����� �� ������� �����.",
    "���� ������������ ��� ������ �������, ��������� �� ��� ������������ �������� �������.",
    "������ 3 ����� � ������ �����������: �������, �������� �� ������, ��������������.",
    "� ����� �������� �� ������ ��� 3 �������� ������."
  ].join("\n");

  if (GEMINI_API_KEY) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${await response.text()}`);
    }

    const result = await response.json();
    const text = (result.candidates || [])
      .flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text || "")
      .join("\n")
      .trim();

    return {
      source: "gemini",
      model: GEMINI_MODEL,
      text: text || "Gemini �� ������ ��������� �����.",
      sections: parseAiSections(text)
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: AI_MODEL,
      input: prompt
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${await response.text()}`);
  }

  const result = await response.json();
  const text = result.output_text || "AI �� ������ ��������� �����.";
  return {
    source: "openai",
    model: AI_MODEL,
    text,
    sections: parseAiSections(text)
  };
}

async function generateAndStoreStudentInsight(student, sourceRecordType, sourceRecordId) {
  const aiResult = await generateAiSections({
    role: "student",
    prompt: `������������� ������������� ����� ������ ������� ${student.fullName} � ��� �������� �����.`,
    grades: getGrades(student.email).map((item) => ({
      subject: item.subject,
      scorePercent: item.scorePercent
    })),
    attendance: getAttendance(student.email),
    achievements: getAchievements(student.email),
    events: getEvents().slice(0, 5)
  });

  insertAiInsight({
    id: crypto.randomUUID(),
    studentEmail: student.email,
    studentName: student.fullName,
    sourceRecordType,
    sourceRecordId,
    diagnosis: aiResult.sections?.diagnosis || aiResult.text,
    actions: aiResult.sections?.actions || [],
    outlook: aiResult.sections?.outlook || "����������� ��������� ��������� ������ �������.",
    rawText: aiResult.text || "",
    createdAt: new Date().toISOString()
  });
}

async function handlePostJson(req, res, handler) {
  try {
    const payload = JSON.parse(await readBody(req));
    await handler(payload, res);
  } catch (error) {
    if (!res.headersSent) {
      const message = error instanceof SyntaxError
        ? "Invalid JSON body"
        : error instanceof Error
          ? error.message
          : "Server error";
      sendJson(res, error instanceof SyntaxError ? 400 : 500, { error: message });
    }
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/auth/register") {
    handlePostJson(req, res, handleRegister);
    return;
  }

  if (req.method === "POST" && req.url === "/api/auth/login") {
    handlePostJson(req, res, handleLogin);
    return;
  }

  if (req.method === "POST" && req.url === "/api/dashboard-data") {
    handlePostJson(req, res, handleDashboardData);
    return;
  }

  if (req.method === "POST" && req.url === "/api/data/create") {
    handlePostJson(req, res, createRecord);
    return;
  }

  if (req.method === "POST" && req.url === "/api/data/delete") {
    handlePostJson(req, res, deleteRecord);
    return;
  }

  if (req.method === "POST" && req.url === "/api/ai-advice") {
    handlePostJson(req, res, (payload, response) => {
      handleAiAdvice(payload, response);
    });
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
});

server.listen(PORT, () => {
  console.log(`Aqbobek portal started on http://localhost:${PORT} using SQLite at ${DB_FILE}`);
});

function validateRegistration(payload) {
  const role = String(payload.role || "").trim();
  const fullName = String(payload.fullName || "").trim();
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  const profile = payload.profile || {};

  if (!fullName || !email || !password || !role) {
    return "Fill in all required fields.";
  }

  if (password.length < 6) {
    return "Password must contain at least 6 characters.";
  }

  if (!["student", "teacher", "parent"].includes(role)) {
    return "Invalid role.";
  }

  if (role === "student" && (!profile.className || !profile.studentId)) {
    return "Student registration requires class and student ID.";
  }

  if (role === "teacher" && (!profile.subject || !profile.staffId)) {
    return "Teacher registration requires subject and staff ID.";
  }

  if (role === "parent" && !profile.childEmail) {
    return "Parent registration requires the child's email.";
  }

  return null;
}

function parseAiSections(text) {
  const normalized = String(text || "").replace(/\r/g, "");
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const sections = { diagnosis: "", actions: [], outlook: "" };
  let current = "diagnosis";

  lines.forEach((line) => {
    const clean = line.replace(/^\d+[\.\)]\s*/, "").replace(/^[-•]\s*/, "");
    const lower = clean.toLowerCase();

    if (lower.includes("diagnosis") || lower.includes("diagnoz")) {
      current = "diagnosis";
      return;
    }

    if (lower.includes("actions") || lower.includes("week") || lower.includes("steps")) {
      current = "actions";
      return;
    }

    if (lower.includes("outlook") || lower.includes("career") || lower.includes("motivation")) {
      current = "outlook";
      return;
    }

    if (current === "actions") {
      sections.actions.push(clean);
      return;
    }

    if (current === "outlook") {
      sections.outlook += `${sections.outlook ? " " : ""}${clean}`;
      return;
    }

    sections.diagnosis += `${sections.diagnosis ? " " : ""}${clean}`;
  });

  if (!sections.actions.length) {
    sections.actions = lines.slice(0, 3).map((line) => line.replace(/^[-•]\s*/, ""));
  }

  if (!sections.diagnosis) {
    sections.diagnosis = normalized || "Not enough data for analysis yet.";
  }

  if (!sections.outlook) {
    sections.outlook = "Keep adding real records and review the plan regularly.";
  }

  return sections;
}

function buildFallbackAdvice(payload) {
  const grades = payload.grades || [];
  const weakest = [...grades].sort((a, b) => a.scorePercent - b.scorePercent)[0];
  const strongest = [...grades].sort((a, b) => b.scorePercent - a.scorePercent)[0];
  const role = payload.role || "student";
  const manualContext = String(payload.manualContext || "").trim();

  const byRole = {
    student: `Use your strongest subject ${strongest?.subject || "as a base"} and spend extra time on ${weakest?.subject || "the area that still has no records"}.`,
    teacher: "Focus on students with weaker trends and keep adding high-quality records so the portal can see the full picture.",
    parent: "Start by checking the newest teacher records and calmly support the weakest subject at home.",
    admin: "Keep publishing events and achievements so the school-wide picture stays complete."
  };

  return {
    source: "fallback",
    text: manualContext
      ? `${byRole[role]} The AI also used your extra context: ${manualContext.slice(0, 220)}${manualContext.length > 220 ? "..." : ""}`
      : byRole[role],
    sections: {
      diagnosis: `Strong area: ${strongest?.subject || "not defined yet"}. Attention area: ${weakest?.subject || "not enough data yet"}.`,
      actions: [
        "Add more real records to the portal.",
        "Review the dynamics again in 7 days.",
        "Compare grades, attendance, and achievements together."
      ],
      outlook: byRole[role]
    }
  };
}

function ensureActorCanMutate(actor, allowedRoles) {
  if (!actor || !allowedRoles.includes(actor.role)) {
    return "You do not have permission for this action.";
  }
  return null;
}

function handleRegister(payload, res) {
  const error = validateRegistration(payload);
  if (error) {
    sendJson(res, 400, { error });
    return;
  }

  const users = getUsers();
  const email = normalizeEmail(payload.email);
  if (users.some((user) => user.email === email)) {
    sendJson(res, 409, { error: "A user with this email already exists." });
    return;
  }

  const profile = { ...(payload.profile || {}) };
  if (profile.childEmail) {
    profile.childEmail = normalizeEmail(profile.childEmail);
  }
  delete profile.accessCode;

  const user = {
    id: crypto.randomUUID(),
    fullName: String(payload.fullName).trim(),
    email,
    role: payload.role,
    passwordHash: hashPassword(String(payload.password)),
    profile,
    createdAt: new Date().toISOString()
  };

  createUser(user);

  sendJson(res, 201, {
    message: "Registration completed successfully. You can now sign in.",
    user: sanitizeUser(user)
  });
}

function handleLogin(payload, res) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  const user = getUserByEmail(email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    sendJson(res, 401, { error: "Invalid email or password." });
    return;
  }

  sendJson(res, 200, {
    message: "Login successful.",
    user: sanitizeUser(user)
  });
}

async function createRecord(payload, res) {
  const actor = payload.actor;
  const type = String(payload.type || "");
  const data = payload.data || {};
  const users = getUsers();

  const now = new Date().toISOString();
  const baseRecord = {
    id: crypto.randomUUID(),
    createdAt: now,
    createdByName: actor?.fullName || "Unknown"
  };

  if (type === "grade") {
    const permissionError = ensureActorCanMutate(actor, ["teacher", "admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }

    const student = users.find((item) => item.email === normalizeEmail(data.studentEmail) && item.role === "student");
    if (!student || !data.subject || data.score === undefined || data.maxScore === undefined) {
      sendJson(res, 400, { error: "Grade creation requires student, subject, score, and max score." });
      return;
    }

    const score = Number(data.score);
    const maxScore = Number(data.maxScore);
    const scorePercent = maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(1)) : 0;

    const recordId = baseRecord.id;
    insertGrade({
      ...baseRecord,
      studentEmail: student.email,
      studentName: student.fullName,
      subject: String(data.subject).trim(),
      score,
      maxScore,
      scorePercent,
      comment: String(data.comment || "").trim()
    });
    await generateAndStoreStudentInsight(student, "grade", recordId);
  } else if (type === "attendance") {
    const permissionError = ensureActorCanMutate(actor, ["teacher", "admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }

    const student = users.find((item) => item.email === normalizeEmail(data.studentEmail) && item.role === "student");
    if (!student || !data.status || !data.date) {
      sendJson(res, 400, { error: "Attendance creation requires student, status, and date." });
      return;
    }

    const recordId = baseRecord.id;
    insertAttendance({
      ...baseRecord,
      studentEmail: student.email,
      studentName: student.fullName,
      status: String(data.status).trim(),
      date: String(data.date).trim(),
      comment: String(data.comment || "").trim()
    });
    await generateAndStoreStudentInsight(student, "attendance", recordId);
  } else if (type === "achievement") {
    const permissionError = ensureActorCanMutate(actor, ["teacher", "admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }

    const student = users.find((item) => item.email === normalizeEmail(data.studentEmail) && item.role === "student");
    if (!student || !data.title) {
      sendJson(res, 400, { error: "Achievement creation requires student and title." });
      return;
    }

    const recordId = baseRecord.id;
    insertAchievement({
      ...baseRecord,
      studentEmail: student.email,
      studentName: student.fullName,
      title: String(data.title).trim(),
      body: String(data.body || "").trim()
    });
    await generateAndStoreStudentInsight(student, "achievement", recordId);
  } else if (type === "announcement") {
    const permissionError = ensureActorCanMutate(actor, ["admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }

    if (!data.title || !data.body) {
      sendJson(res, 400, { error: "Announcement creation requires title and body." });
      return;
    }

    insertAnnouncement({
      ...baseRecord,
      title: String(data.title).trim(),
      body: String(data.body).trim(),
      audience: String(data.audience || "school").trim()
    });
  } else if (type === "event") {
    const permissionError = ensureActorCanMutate(actor, ["admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }

    if (!data.title || !data.eventDate) {
      sendJson(res, 400, { error: "Event creation requires title and date." });
      return;
    }

    insertEvent({
      ...baseRecord,
      title: String(data.title).trim(),
      body: String(data.body || "").trim(),
      eventDate: String(data.eventDate).trim()
    });
  } else if (type === "kiosk") {
    const permissionError = ensureActorCanMutate(actor, ["admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }

    if (!data.title) {
      sendJson(res, 400, { error: "Kiosk card creation requires a title." });
      return;
    }

    insertKioskHighlight({
      ...baseRecord,
      title: String(data.title).trim(),
      body: String(data.body || "").trim()
    });
  } else {
    sendJson(res, 400, { error: "Unknown record type." });
    return;
  }

  sendJson(res, 201, { message: "Record saved successfully." });
}

async function deleteRecord(payload, res) {
  const actor = payload.actor;
  const type = String(payload.type || "");
  const id = String(payload.id || "");

  if (!id) {
    sendJson(res, 400, { error: "Record id is required." });
    return;
  }

  let result;
  if (type === "grade") {
    const permissionError = ensureActorCanMutate(actor, ["teacher", "admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }

    const grade = getGradeById(id);
    if (!grade) {
      sendJson(res, 404, { error: "Record not found." });
      return;
    }

    result = deleteGrade(id);

    if (result.changes) {
      const student = getUserByEmail(grade.studentEmail);
      if (student && student.role === "student") {
        await generateAndStoreStudentInsight(student, "grade_deleted", id);
      }
    }
  } else if (type === "announcement") {
    const permissionError = ensureActorCanMutate(actor, ["admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }
    result = deleteAnnouncement(id);
  } else if (type === "event") {
    const permissionError = ensureActorCanMutate(actor, ["admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }
    result = deleteEvent(id);
  } else if (type === "kiosk") {
    const permissionError = ensureActorCanMutate(actor, ["admin"]);
    if (permissionError) {
      sendJson(res, 403, { error: permissionError });
      return;
    }
    result = deleteKioskHighlight(id);
  } else {
    sendJson(res, 400, { error: "Deletion is not supported for this record type." });
    return;
  }

  if (!result.changes) {
    sendJson(res, 404, { error: "Record not found." });
    return;
  }

  sendJson(res, 200, { message: "Record deleted successfully." });
}

async function generateAiSections(payload) {
  if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
    return buildFallbackAdvice(payload);
  }

  const prompt = [
    "You are the AI mentor for the Aqbobek Lyceum school portal.",
    `User role: ${payload.role || "guest"}.`,
    `User request: ${payload.prompt || "Analyze the current situation."}`,
    `Manual input data: ${payload.manualContext || "not provided"}.`,
    `Grades: ${JSON.stringify(payload.grades || [])}.`,
    `Attendance: ${JSON.stringify(payload.attendance || [])}.`,
    `Achievements: ${JSON.stringify(payload.achievements || [])}.`,
    `Events: ${JSON.stringify(payload.events || [])}.`,
    "Respond in clear English.",
    "If manual input is provided, treat it as priority context.",
    "Use exactly three sections with explicit headings: Diagnosis, Actions for the week, Outlook.",
    "In the actions section give 3 short bullet points."
  ].join("\n");

  if (GEMINI_API_KEY) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${await response.text()}`);
    }

    const result = await response.json();
    const text = (result.candidates || [])
      .flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text || "")
      .join("\n")
      .trim();

    return {
      source: "gemini",
      model: GEMINI_MODEL,
      text: text || "Gemini did not return text.",
      sections: parseAiSections(text)
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: AI_MODEL,
      input: prompt
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${await response.text()}`);
  }

  const result = await response.json();
  const text = result.output_text || "AI did not return text.";
  return {
    source: "openai",
    model: AI_MODEL,
    text,
    sections: parseAiSections(text)
  };
}

async function generateAndStoreStudentInsight(student, sourceRecordType, sourceRecordId) {
  const aiResult = await generateAiSections({
    role: "student",
    prompt: `Analyze the newest student data for ${student.fullName} and produce a short actionable recommendation.`,
    grades: getGrades(student.email).map((item) => ({
      subject: item.subject,
      scorePercent: item.scorePercent
    })),
    attendance: getAttendance(student.email),
    achievements: getAchievements(student.email),
    events: getEvents().slice(0, 5)
  });

  insertAiInsight({
    id: crypto.randomUUID(),
    studentEmail: student.email,
    studentName: student.fullName,
    sourceRecordType,
    sourceRecordId,
    diagnosis: aiResult.sections?.diagnosis || aiResult.text,
    actions: aiResult.sections?.actions || [],
    outlook: aiResult.sections?.outlook || "Keep updating the student data regularly.",
    rawText: aiResult.text || "",
    createdAt: new Date().toISOString()
  });
}
