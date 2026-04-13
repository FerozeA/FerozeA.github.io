const PROMPT_FILE = "conversations.txt";
const PROMPTS_PER_REFRESH = 5;

const SIDE = {
  RAWLS: "left",
  NOZICK: "right",
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromPageLoad() {
  const ms = Date.now() >>> 0;
  const perf = (typeof performance !== "undefined" ? Math.floor(performance.now()) : 0) >>> 0;
  return (ms ^ (perf << 1) ^ (ms >>> 11)) >>> 0;
}

function pickRandomUnique(arr, n, rng) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

function scrollChatToBottom(chatEl) {
  chatEl.scrollTop = chatEl.scrollHeight;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function estimateTypingMs(text, base = 650, perChar = 32, max = 5200) {
  const len = (text || "").length;
  return Math.min(max, base + len * perChar);
}

function estimateReadPauseMs(text, base = 600, perChar = 18, max = 6500) {
  const len = (text || "").length;
  return Math.min(max, base + len * perChar);
}

function parseConversations(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const items = [];

  let current = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("##")) continue;

    if (line.startsWith("@prompt:")) {
      if (current) items.push(current);
      current = { prompt: line.slice("@prompt:".length).trim(), turns: [] };
      continue;
    }

    if (!current) continue;

    if (line.startsWith("R:")) {
      current.turns.push({ speaker: "Rawls", side: SIDE.RAWLS, role: "Rawlsian", text: line.slice(2).trim() });
      continue;
    }

    if (line.startsWith("N:")) {
      current.turns.push({ speaker: "Nozick", side: SIDE.NOZICK, role: "Libertarian", text: line.slice(2).trim() });
      continue;
    }
  }
  if (current) items.push(current);

  return items.filter((x) => x.prompt && x.turns.length > 0);
}

function qs(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

function makeBubble({ speaker, side, role, text }) {
  const tpl = qs("bubbleTemplate");
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.dataset.side = side;
  node.querySelector(".name").textContent = speaker;
  node.querySelector(".role").textContent = role;
  node.querySelector(".text").textContent = text;
  return node;
}

function makeTyping({ speaker, side, role }) {
  const tpl = qs("typingTemplate");
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.dataset.side = side;
  node.querySelector(".name").textContent = speaker;
  node.querySelector(".role").textContent = role;
  return node;
}

async function runDebate(convo, chatEl) {
  chatEl.innerHTML = "";

  for (const turn of convo.turns) {
    const typingNode = makeTyping(turn);
    chatEl.appendChild(typingNode);
    scrollChatToBottom(chatEl);

    await sleep(estimateTypingMs(turn.text));

    typingNode.replaceWith(makeBubble(turn));
    scrollChatToBottom(chatEl);

    await sleep(estimateReadPauseMs(turn.text));
  }
}

async function loadData() {
  const candidates = [
    // Best default: resolve relative to the current page URL (works under subpaths).
    new URL(PROMPT_FILE, window.location.href).toString(),
    // Fallbacks for stricter hosts / routing.
    "./" + PROMPT_FILE,
    PROMPT_FILE,
    "/" + PROMPT_FILE,
  ];

  let lastErr = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastErr = new Error(`Failed to load ${url} (${res.status})`);
        continue;
      }
      const text = await res.text();
      const convos = parseConversations(text);
      if (convos.length < 5) throw new Error("Need at least 5 prompts in conversations.txt");
      return convos;
    } catch (e) {
      lastErr = e;
    }
  }

  if (typeof window !== "undefined" && typeof window.CONVERSATIONS_TEXT === "string") {
    const convos = parseConversations(window.CONVERSATIONS_TEXT);
    if (convos.length >= 5) return convos;
  }

  throw lastErr || new Error("Failed to fetch conversations.txt");
}

function hide(el) {
  el.classList.add("hidden");
}

function show(el) {
  el.classList.remove("hidden");
}

function escapeForText(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

async function main() {
  const subtitle = qs("subtitle");
  const promptPanel = qs("promptPanel");
  const promptGrid = qs("promptGrid");
  const arena = qs("arena");
  const selectedPrompt = qs("selectedPrompt");
  const chat = qs("chat");
  const restartBtn = qs("restartBtn");

  restartBtn.addEventListener("click", () => window.location.reload());

  let convos;
  try {
    convos = await loadData();
  } catch (err) {
    promptGrid.innerHTML = "";
    const btn = document.createElement("div");
    btn.className = "hint";
    btn.textContent = `Error: ${err?.message || String(err)}`;
    promptGrid.appendChild(btn);
    return;
  }

  const rng = mulberry32(seedFromPageLoad());
  const picks = pickRandomUnique(convos, PROMPTS_PER_REFRESH, rng);

  promptGrid.innerHTML = "";
  for (const convo of picks) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "promptBtn";
    b.setAttribute("role", "listitem");
    b.textContent = convo.prompt;
    b.addEventListener("click", async () => {
      // Collapse the selection UI.
      hide(subtitle);
      hide(promptPanel);
      show(arena);

      selectedPrompt.textContent = `Prompt: ${escapeForText(convo.prompt)}`;
      await sleep(150);
      await runDebate(convo, chat);
    });
    promptGrid.appendChild(b);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  main();
});

