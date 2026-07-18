"use strict";

/**
 * Fixed-schema chat widget. No free-text intent parsing here — every
 * question the bot asks, and every input it accepts, is generated directly
 * from GET /schema-info (which mirrors models/schema/*.schema.json). This
 * keeps the chatbot resource-type-agnostic on the frontend too: adding a
 * new module + schema on the backend surfaces here automatically, no
 * changes to this file required.
 */

const chatLog = document.getElementById("chat-log");
const composer = document.getElementById("composer");
const apiBaseInput = document.getElementById("api-base");
const apiKeyInput = document.getElementById("api-key");
const connectBtn = document.getElementById("connect-btn");
const connectionStatus = document.getElementById("connection-status");

let apiBase = localStorage.getItem("chatbot.apiBase") || "http://localhost:3000";
let apiKey = localStorage.getItem("chatbot.apiKey") || "";
apiBaseInput.value = apiBase;
apiKeyInput.value = apiKey;

/** @type {{allowedEnvironments: string[], resourceTypes: Array<{resourceType:string, containerKey:string, schema:any}>} | null} */
let schemaInfo = null;

/** Conversation state for the request currently being built. */
let session = null;

function addMessage(text, cls) {
  const div = document.createElement("div");
  div.className = `msg ${cls}`;
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
  return div;
}

function addHtmlMessage(html, cls) {
  const div = document.createElement("div");
  div.className = `msg ${cls}`;
  div.innerHTML = html;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
  return div;
}

async function api(path, opts = {}) {
  const res = await fetch(apiBase.replace(/\/$/, "") + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...(opts.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return body;
}

connectBtn.addEventListener("click", connect);

async function connect() {
  apiBase = apiBaseInput.value.trim();
  apiKey = apiKeyInput.value.trim();
  localStorage.setItem("chatbot.apiBase", apiBase);
  localStorage.setItem("chatbot.apiKey", apiKey);

  connectionStatus.textContent = "connecting…";
  connectionStatus.className = "status";
  try {
    schemaInfo = await api("/schema-info");
    connectionStatus.textContent = `connected — ${schemaInfo.resourceTypes.length} resource type(s) available`;
    connectionStatus.className = "status ok";
    chatLog.innerHTML = "";
    addMessage(
      "Hi — I can open a pull request to add infrastructure defined in the platform's JSON schemas. " +
        "I'll only ask about fields the schema requires, so there's no free-form guessing.",
      "bot"
    );
    startNewRequest();
  } catch (err) {
    connectionStatus.textContent = `failed: ${err.message}`;
    connectionStatus.className = "status error";
  }
}

function startNewRequest() {
  session = { resourceType: null, environment: null, key: null, fields: {}, fieldSteps: [], stepIndex: 0 };
  askResourceType();
}

function renderComposer(node) {
  composer.innerHTML = "";
  composer.appendChild(node);
}

function fieldGroupWrapper() {
  const wrap = document.createElement("div");
  wrap.className = "field-group";
  return wrap;
}

// ---- Step 1: resource type ----
function askResourceType() {
  addMessage("What kind of resource is this request for?", "bot");
  const wrap = fieldGroupWrapper();
  const label = document.createElement("label");
  label.textContent = "Resource type";
  const select = document.createElement("select");
  schemaInfo.resourceTypes.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r.resourceType;
    opt.textContent = r.resourceType;
    select.appendChild(opt);
  });
  label.appendChild(select);
  wrap.appendChild(label);
  wrap.appendChild(submitRow(() => {
    session.resourceType = select.value;
    addMessage(select.value, "user");
    askEnvironment();
  }));
  renderComposer(wrap);
}

// ---- Step 2: environment ----
function askEnvironment() {
  addMessage("Which environment should this land in?", "bot");
  const wrap = fieldGroupWrapper();
  const label = document.createElement("label");
  label.textContent = "Environment";
  const select = document.createElement("select");
  schemaInfo.allowedEnvironments.forEach((e) => {
    const opt = document.createElement("option");
    opt.value = e;
    opt.textContent = e;
    select.appendChild(opt);
  });
  label.appendChild(select);
  wrap.appendChild(label);
  wrap.appendChild(submitRow(() => {
    session.environment = select.value;
    addMessage(select.value, "user");
    askKey();
  }));
  renderComposer(wrap);
}

// ---- Step 3: logical key ----
function askKey() {
  addMessage(
    "Give this a short logical id (internal key used in the JSON model, e.g. \"analytics_dev\"). Lowercase, letters/numbers/underscores.",
    "bot"
  );
  const wrap = fieldGroupWrapper();
  const label = document.createElement("label");
  label.textContent = "Key";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "analytics_dev";
  label.appendChild(input);
  wrap.appendChild(label);
  wrap.appendChild(submitRow(() => {
    const value = input.value.trim();
    if (!/^[a-z][a-z0-9_]*$/.test(value)) {
      addMessage('Key must start with a lowercase letter and contain only lowercase letters, numbers, underscores.', "error");
      return;
    }
    session.key = value;
    addMessage(value, "user");
    session.fieldSteps = buildFieldSteps(session.resourceType);
    session.stepIndex = 0;
    askNextField();
  }));
  renderComposer(wrap);
}

// ---- Step 4+: one question per required field in the schema ----
function buildFieldSteps(resourceType) {
  const def = schemaInfo.resourceTypes.find((r) => r.resourceType === resourceType);
  const entrySchema = def.schema.properties[def.containerKey].additionalProperties;
  const steps = [];
  for (const propName of entrySchema.required || []) {
    const propSchema = entrySchema.properties[propName];
    if (propSchema.type === "object" && propSchema.properties) {
      const nestedRequired = propSchema.required || Object.keys(propSchema.properties);
      for (const subName of nestedRequired) {
        steps.push({ path: [propName, subName], schema: propSchema.properties[subName] });
      }
    } else {
      steps.push({ path: [propName], schema: propSchema });
    }
  }
  return steps;
}

function humanLabel(path) {
  return path.join(" → ");
}

function askNextField() {
  if (session.stepIndex >= session.fieldSteps.length) {
    showPreview();
    return;
  }
  const step = session.fieldSteps[session.stepIndex];
  const schema = step.schema;
  addMessage(schema.description ? `${humanLabel(step.path)} — ${schema.description}` : `${humanLabel(step.path)}?`, "bot");

  const wrap = fieldGroupWrapper();
  const label = document.createElement("label");
  label.textContent = humanLabel(step.path);

  let input;
  if (Array.isArray(schema.enum)) {
    input = document.createElement("select");
    schema.enum.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      input.appendChild(opt);
    });
  } else {
    input = document.createElement("input");
    input.type = "text";
    if (schema.pattern) input.placeholder = `pattern: ${schema.pattern}`;
  }
  label.appendChild(input);
  wrap.appendChild(label);
  if (schema.pattern || schema.minLength) {
    const hint = document.createElement("span");
    hint.className = "hint";
    hint.textContent = [
      schema.pattern ? `must match ${schema.pattern}` : null,
      schema.minLength ? `min length ${schema.minLength}` : null,
    ].filter(Boolean).join(", ");
    label.appendChild(hint);
  }

  wrap.appendChild(submitRow(() => {
    const value = input.value.trim();
    if (schema.minLength && value.length < schema.minLength) {
      addMessage(`Must be at least ${schema.minLength} characters.`, "error");
      return;
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      addMessage(`Doesn't match required pattern: ${schema.pattern}`, "error");
      return;
    }
    setPath(session.fields, step.path, value);
    addMessage(value, "user");
    session.stepIndex += 1;
    askNextField();
  }));
  renderComposer(wrap);
}

function setPath(obj, path, value) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    cur[path[i]] = cur[path[i]] || {};
    cur = cur[path[i]];
  }
  cur[path[path.length - 1]] = value;
}

function submitRow(onSubmit) {
  const row = document.createElement("div");
  row.className = "composer-actions";
  const btn = document.createElement("button");
  btn.className = "btn-primary";
  btn.textContent = "Next";
  btn.addEventListener("click", onSubmit);
  row.appendChild(btn);
  return row;
}

// ---- Preview + confirm ----
async function showPreview() {
  composer.innerHTML = "";
  addMessage("Validating against the schema and previewing the change…", "bot");
  try {
    const outcome = await api("/preview-structured", {
      method: "POST",
      body: JSON.stringify({
        resourceType: session.resourceType,
        environment: session.environment,
        key: session.key,
        fields: session.fields,
      }),
    });
    if (outcome.status !== "valid_proposal") {
      addHtmlMessage(
        `Validation failed:<pre>${escapeHtml((outcome.errors || []).join("\n"))}</pre>`,
        "error"
      );
      renderRestart();
      return;
    }
    addHtmlMessage(
      `Looks good. This will be written to <code>${escapeHtml(outcome.wouldWriteTo)}</code>:` +
        `<pre>${escapeHtml(outcome.mergedFileContent)}</pre>`,
      "bot"
    );
    renderConfirm();
  } catch (err) {
    addMessage(`Error: ${err.message}`, "error");
    renderRestart();
  }
}

function renderConfirm() {
  const wrap = document.createElement("div");
  wrap.className = "composer-actions";
  const confirmBtn = document.createElement("button");
  confirmBtn.className = "btn-primary";
  confirmBtn.textContent = "Open pull request";
  confirmBtn.addEventListener("click", submitProposal);
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn-secondary";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    addMessage("Cancelled. Nothing was written or pushed.", "bot");
    renderRestart();
  });
  wrap.appendChild(confirmBtn);
  wrap.appendChild(cancelBtn);
  renderComposer(wrap);
}

async function submitProposal() {
  composer.innerHTML = "";
  addMessage("Creating a branch, committing, pushing, and opening a PR…", "bot");
  try {
    const outcome = await api("/propose-structured", {
      method: "POST",
      body: JSON.stringify({
        resourceType: session.resourceType,
        environment: session.environment,
        key: session.key,
        fields: session.fields,
      }),
    });
    if (outcome.status === "pr_opened") {
      addHtmlMessage(
        `Done — <a href="${escapeHtml(outcome.prUrl)}" target="_blank" rel="noopener">pull request opened</a>. ` +
          `A human still needs to review and merge it before anything applies to Azure.`,
        "success"
      );
    } else if (outcome.status === "pushed_no_pr") {
      addHtmlMessage(
        `Branch <code>${escapeHtml(outcome.branch)}</code> pushed, but the PR couldn't be opened automatically ` +
          (outcome.compareUrl
            ? `— <a href="${escapeHtml(outcome.compareUrl)}" target="_blank" rel="noopener">open one manually here</a>.`
            : "and no compare link is available. Open one manually on GitHub."),
        "success"
      );
    } else if (outcome.status === "environment_blocked") {
      addMessage(
        `Environment "${outcome.environment}" isn't allowed. Allowed: ${outcome.allowed.join(", ")}.`,
        "error"
      );
    } else {
      addHtmlMessage(
        `Couldn't complete the request:<pre>${escapeHtml((outcome.errors || [outcome.message || outcome.status]).join("\n"))}</pre>`,
        "error"
      );
    }
  } catch (err) {
    addMessage(`Error: ${err.message}`, "error");
  }
  renderRestart();
}

function renderRestart() {
  const wrap = document.createElement("div");
  wrap.className = "composer-actions";
  const btn = document.createElement("button");
  btn.className = "btn-secondary";
  btn.textContent = "Start another request";
  btn.addEventListener("click", startNewRequest);
  wrap.appendChild(btn);
  renderComposer(wrap);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
