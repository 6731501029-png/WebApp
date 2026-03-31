import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import mysql from "mysql2/promise";
import { parse as parseCookie, serialize as serializeCookie } from "cookie";

const ROOT_DIR = path.resolve(process.cwd());
const STORAGE_DIR = path.join(ROOT_DIR, "storage");
const PUBLIC_DIR = path.join(ROOT_DIR, "Public");
const DEFAULT_CANDIDATE_IMAGE = "/Public/img/default-candidate.png";

const pool = mysql.createPool({
  host: process.env.MFU_DB_HOST || "127.0.0.1",
  port: Number(process.env.MFU_DB_PORT || 3306),
  database: process.env.MFU_DB_NAME || "mfu_voting_app",
  user: process.env.MFU_DB_USER || "root",
  password: process.env.MFU_DB_PASS || "",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

const sessions = new Map();

export function db() {
  return pool;
}

export function rootPath(...parts) {
  return path.join(ROOT_DIR, ...parts);
}

export async function ensureStorageDir() {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

export async function readStorageJson(name, fallback = {}) {
  await ensureStorageDir();
  const filePath = path.join(STORAGE_DIR, name);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

export async function writeStorageJson(name, data) {
  await ensureStorageDir();
  const filePath = path.join(STORAGE_DIR, name);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function appStatus() {
  return readStorageJson("app_status.json", { voting: "enable" });
}

export async function saveAppStatus(status) {
  await writeStorageJson("app_status.json", status);
}

export async function candidateMediaMap() {
  return readStorageJson("candidate_media.json", {});
}

export async function saveCandidateMediaMap(map) {
  await writeStorageJson("candidate_media.json", map);
}

export async function candidateImageUrl(candidateId) {
  const media = await candidateMediaMap();
  const value = media[candidateId];

  if (!value || typeof value !== "string") {
    return DEFAULT_CANDIDATE_IMAGE;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return "/" + value.replace(/^\/+/, "").replace(/\\/g, "/");
}

export async function updateCandidateImageReference(candidateId, imageValue) {
  if (typeof imageValue !== "string" || imageValue.trim() === "") {
    return;
  }

  const media = await candidateMediaMap();
  media[candidateId] = imageValue.trim();
  await saveCandidateMediaMap(media);
}

export async function candidateProfileRow(row) {
  const candidateId = String(row.candidate_id);

  return {
    image: await candidateImageUrl(candidateId),
    number: candidateId,
    candidate_id: candidateId,
    name: row.name || "",
    policy: row.policies || "",
    is_enabled: Boolean(row.is_enabled),
  };
}

export async function fetchCandidateProfiles(enabledOnly = true) {
  const sql = `
    SELECT candidate_id, name, policies, is_enabled
    FROM candidates
    ${enabledOnly ? "WHERE is_enabled = 1" : ""}
    ORDER BY candidate_id ASC
  `;

  const [rows] = await pool.query(sql);
  return Promise.all(rows.map((row) => candidateProfileRow(row)));
}

export async function fetchRankedResults(search = null, enabledOnly = false) {
  const where = [];
  const params = {};

  if (enabledOnly) {
    where.push("c.is_enabled = 1");
  }

  if (search && search.trim() !== "") {
    where.push("c.name LIKE :search");
    params.search = `%${search.trim()}%`;
  }

  const sql = `
    SELECT
      c.candidate_id,
      c.name,
      c.policies,
      c.is_enabled,
      COUNT(v.id) AS score
    FROM candidates c
    LEFT JOIN votes v ON v.candidate_id = c.candidate_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    GROUP BY c.candidate_id, c.name, c.policies, c.is_enabled
    ORDER BY score DESC, c.candidate_id ASC
  `;

  const [rows] = await pool.execute(sql, params);
  const results = [];

  for (const [index, row] of rows.entries()) {
    results.push({
      rank: index + 1,
      No: `No.${row.candidate_id}`,
      candidate_id: row.candidate_id,
      name: row.name || "",
      score: Number(row.score || 0),
      image: await candidateImageUrl(String(row.candidate_id)),
      policy: row.policies || "",
      is_enabled: Boolean(row.is_enabled),
    });
  }

  return results;
}

export async function dashboardSummary() {
  const [[voterCountRow]] = await pool.query("SELECT COUNT(*) AS total FROM voters");
  const [[candidateCountRow]] = await pool.query(
    "SELECT COUNT(*) AS total FROM candidates WHERE is_enabled = 1"
  );
  const [[voteCountRow]] = await pool.query("SELECT COUNT(*) AS total FROM votes");

  const totalVoters = Number(voterCountRow.total || 0);
  const totalCandidates = Number(candidateCountRow.total || 0);
  const totalVotes = Number(voteCountRow.total || 0);
  const percentageVoting = totalVoters > 0 ? Number(((totalVotes / totalVoters) * 100).toFixed(1)) : 0;

  return {
    percentage_of_voting: percentageVoting,
    number_of_voters: totalVoters,
    number_of_candidates: totalCandidates,
    number_of_voting: totalVotes,
  };
}

export function jsonResponse(res, status, payload) {
  res.status(status).json(payload);
}

export function textResponse(res, status, message) {
  res.status(status).type("text/plain").send(message);
}

export function setSession(res, role, id, extra = {}) {
  const sid = crypto.randomUUID();
  sessions.set(sid, { role, id, ...extra });

  res.setHeader(
    "Set-Cookie",
    serializeCookie("mfu_sid", sid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    })
  );
}

export function getSession(req) {
  const parsed = parseCookie(req.headers.cookie || "");
  return sessions.get(parsed.mfu_sid || "") || null;
}

export function requireSessionRole(req, res, role) {
  const session = getSession(req);

  if (!session || session.role !== role) {
    textResponse(res, 401, "Unauthorized");
    return null;
  }

  return session;
}

export function clearSession(req, res) {
  const parsed = parseCookie(req.headers.cookie || "");
  if (parsed.mfu_sid) {
    sessions.delete(parsed.mfu_sid);
  }

  res.setHeader(
    "Set-Cookie",
    serializeCookie("mfu_sid", "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    })
  );
}

export function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

export function publicPathExists(relativePath) {
  return path.join(PUBLIC_DIR, relativePath);
}
