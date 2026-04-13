---
title: Rawls vs Nozick
emoji: ⚖️
colorFrom: green
colorTo: green
sdk: static
sdk_version: 1.0.0
app_file: index.html
pinned: false
---

# Rawls vs Nozick (static webpage)

This is a single-page static site that:

- shows **5 rotating prompts** on each refresh (randomly selected from a longer list)
- animates a debate between **Rawls (Rawlsian)** and **Nozick (Libertarian)**
- uses **pre-generated responses** stored in `conversations.txt`

## Run locally

Because the page loads `conversations.txt` via `fetch`, you should run a tiny static server (opening the file directly may be blocked by your browser).

### Option A: Python (if installed)

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/rawls-vs-nozick-web/`.

### Option B: Node (if installed)

```bash
npx serve .
```

Then open the printed URL and navigate to `/rawls-vs-nozick-web/`.

## Edit prompts / arguments

Open `conversations.txt` and add new blocks like:

```
@prompt: Your prompt here
R: Rawls line...
N: Nozick line...
R: Rawls line...
N: Nozick line...
```

## Host on Hugging Face (static Space)

- Create a **new Space** on Hugging Face.
- Choose **SDK: Static**.
- Upload the contents of `rawls-vs-nozick-web/` to the Space repository root (so `index.html` is at the root of the Space).

