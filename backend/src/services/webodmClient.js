// Thin client for the WebODM REST API (https://docs.webodm.org/api/task/).
// Uses Node's built-in fetch / FormData / Blob (Node 18+, Node 20+ recommended).
const fs = require("fs");
const fsp = require("fs/promises");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const cfg = require("../config/webodm");

// WebODM task status codes
const STATUS = { QUEUED: 10, RUNNING: 20, FAILED: 30, COMPLETED: 40, CANCELED: 50 };

class WebodmError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "WebodmError";
    this.status = status;
    this.body = body;
  }
}

let token = null;
let optionNamesCache = { at: 0, names: null };

async function login() {
  if (!cfg.USERNAME || !cfg.PASSWORD) {
    throw new WebodmError("WEBODM_USERNAME / WEBODM_PASSWORD are not set in backend/.env", 500);
  }
  let res;
  try {
    res = await fetch(`${cfg.URL}/api/token-auth/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: cfg.USERNAME, password: cfg.PASSWORD }),
    });
  } catch (e) {
    throw new WebodmError(
      `Cannot reach WebODM at ${cfg.URL} (${e.cause?.code || e.message}). Is WebODM running?`, 503,
    );
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.token) {
    throw new WebodmError("WebODM rejected the WEBODM_USERNAME / WEBODM_PASSWORD in backend/.env", 502, body);
  }
  token = body.token;
  return token;
}

// `raw: true` returns the fetch Response untouched (used for downloads).
async function request(method, path, { json, form, raw = false, retry = true } = {}) {
  if (!token) await login();
  const headers = { Authorization: `JWT ${token}` };
  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    body = form; // fetch sets the multipart boundary itself
  }

  let res;
  try {
    res = await fetch(`${cfg.URL}${path}`, { method, headers, body });
  } catch (e) {
    throw new WebodmError(`Cannot reach WebODM at ${cfg.URL} (${e.cause?.code || e.message})`, 503);
  }

  // Token expired: log in again once and repeat the call.
  if ((res.status === 401 || res.status === 403) && retry) {
    token = null;
    return request(method, path, { json, form, raw, retry: false });
  }
  if (raw) return res;

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const detail = typeof data === "string" ? data.slice(0, 200) : JSON.stringify(data).slice(0, 300);
    throw new WebodmError(`WebODM ${method} ${path} failed (${res.status}): ${detail}`, res.status, data);
  }
  return data;
}

// --- Health ------------------------------------------------------------------
async function health() {
  await login(); // fresh login proves the URL AND the credentials are right
  const nodes = await request("GET", "/api/processingnodes/");
  const list = Array.isArray(nodes) ? nodes : (nodes?.results || []);
  return {
    ok: true,
    url: cfg.URL,
    nodes: list.map((n) => ({
      id: n.id,
      host: `${n.hostname}:${n.port}`,
      online: n.online !== false, // older versions omit the flag
      queueCount: n.queue_count ?? null,
    })),
  };
}

// Names of the processing options the connected node understands. We only send
// options from this list so an option renamed in a newer engine cannot fail a task.
async function getNodeOptionNames() {
  if (optionNamesCache.names && Date.now() - optionNamesCache.at < 10 * 60 * 1000) {
    return optionNamesCache.names;
  }
  try {
    const opts = await request("GET", "/api/processingnodes/options/");
    const names = new Set((Array.isArray(opts) ? opts : []).map((o) => o.name));
    if (names.size) optionNamesCache = { at: Date.now(), names };
    return names.size ? names : null;
  } catch {
    return null; // caller falls back to sending everything
  }
}

// --- Projects & tasks -------------------------------------------------------
const createProject = (name, description = "") =>
  request("POST", "/api/projects/", { json: { name, description } });

const getProject = (projectId) => request("GET", `/api/projects/${projectId}/`);

// partial:true => WebODM waits for /commit/ before it starts processing.
const createPartialTask = (projectId, { name, options }) =>
  request("POST", `/api/projects/${projectId}/tasks/`, {
    json: { name, options, partial: true, auto_processing_node: true },
  });

// files: [{ path, name }]
async function uploadFiles(projectId, taskId, files) {
  const form = new FormData();
  for (const f of files) {
    const buf = await fsp.readFile(f.path);
    form.append("images", new Blob([buf], { type: "image/jpeg" }), f.name);
  }
  return request("POST", `/api/projects/${projectId}/tasks/${taskId}/upload/`, { form });
}

const commitTask = (projectId, taskId) =>
  request("POST", `/api/projects/${projectId}/tasks/${taskId}/commit/`);

const getTask = (projectId, taskId) =>
  request("GET", `/api/projects/${projectId}/tasks/${taskId}/`);

const cancelTask = (projectId, taskId) =>
  request("POST", `/api/projects/${projectId}/tasks/${taskId}/cancel/`);

const removeTask = (projectId, taskId) =>
  request("POST", `/api/projects/${projectId}/tasks/${taskId}/remove/`);

// Console output from `fromLine` onwards. Returns an array of lines.
async function getOutputLines(projectId, taskId, fromLine = 0) {
  const out = await request("GET", `/api/projects/${projectId}/tasks/${taskId}/output/?line=${fromLine}`);
  let text = out;
  if (Array.isArray(out)) text = out.join("\n");
  if (typeof text !== "string" || !text) return [];
  return text.split(/\r?\n/).filter((l) => l.length > 0);
}

async function downloadAsset(projectId, taskId, asset, destPath) {
  const res = await request("GET", `/api/projects/${projectId}/tasks/${taskId}/download/${asset}`, { raw: true });
  if (!res.ok || !res.body) {
    throw new WebodmError(`WebODM could not provide "${asset}" (HTTP ${res.status})`, res.status);
  }
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(destPath));
}

module.exports = {
  STATUS,
  WebodmError,
  health,
  getNodeOptionNames,
  createProject,
  getProject,
  createPartialTask,
  uploadFiles,
  commitTask,
  getTask,
  cancelTask,
  removeTask,
  getOutputLines,
  downloadAsset,
};