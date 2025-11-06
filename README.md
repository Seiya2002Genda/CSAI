# CSAI
# 🧠 CS Scholar — AI Search & Summarization Platform

A lightweight web app that lets you search **computer science papers** (via arXiv), generate **AI-based summaries**, and export **APA-style Word reports** — all inside your browser.

---

## 🚀 Features

| Category                     | Description                                                       |
| ---------------------------- | ----------------------------------------------------------------- |
| 🔍 **arXiv Search**          | Search papers (2010–2025) by keyword, author, or topic.           |
| 🈳 **IME-Friendly Input**    | Type ASCII/English text even when Japanese IME is active.         |
| 📅 **Year Filter**           | Quickly filter results by publication year.                       |
| 🧠 **AI Summarization**      | Generate short summaries (120 chars JP) per paper via OpenAI API. |
| 🗂️ **Multi-select + Popup** | Select multiple papers → export all as one combined Word summary. |
| 🧾 **APA-style Word Export** | Exports Times New Roman APA-formatted `.docx` file.               |
| 💾 **CSV/Word Export**       | Export full dataset (titles, authors, abstracts) to CSV or DOC.   |
| 🎨 **Dark/Light Mode Ready** | Full modern UI with responsive layout.                            |

---

## 🏗️ Project Structure

```
cs-scholar/
├── index.html      # Entry point (includes docx UMD + app.js)
├── style.css       # UI styling (dark theme, 2-column layout)
└── app.js          # Main logic (search, summarize, export)
```

---

## ⚙️ Setup & Run

### 1️⃣ Launch a Local Server

> **Do NOT open directly as `file://`** — use a local HTTP server.

**Option A (VSCode users):**

* Right-click → “Open with Live Server”

**Option B (Node.js users):**

```bash
npm install -g live-server
live-server
```

---

### 2️⃣ Ensure the Correct Script Order in `index.html`

```html
<!-- Must load docx UMD first, then app.js -->
<script src="https://cdn.jsdelivr.net/npm/docx@7.7.0/build/index.umd.js"></script>
<script defer src="app.js"></script>
```

✅ `@7.7.0` is the most stable UMD version.
Newer `@8.x` may cause `window.docx` to not load properly.

---

### 3️⃣ Set Your OpenAI API Key

* Click **“API Key”** in the top-right nav bar.
* Enter your key (`sk-...`) → Saved locally in `localStorage`.

---

## 🧩 How It Works

1. **Search papers** via arXiv API (XML → JSON parsing).
2. Display results grouped by **year**, 2-column responsive grid.
3. Click “**Generate Summary**” per card → calls `gpt-4o-mini`.
4. Select multiple papers via **checkboxes** → popup appears.
5. Click “**Wordファイルで要約を出力**” → APA-style `.docx` exported.

---

## 📄 Word Export (APA Style)

### Structure Example

```
Combined Summary of Selected Papers
Generated on: 2025/11/06

Summary
─────────────────────
Concise academic summary (250 words)

References
─────────────────────
Author, A., & Author, B. (2025). Paper Title. *arXiv*.
```

**Font:** Times New Roman
**Style:** APA, 12pt, double-spaced

---

## 🧠 Common Issues & Fixes

| Error                           | Cause                          | Solution                                          |
| ------------------------------- | ------------------------------ | ------------------------------------------------- |
| ❌ `Failed to export Word file.` | `window.docx` not loaded       | Use jsDelivr + `docx@7.7.0`, clear cache, refresh |
| ❌ “No papers selected”          | Nothing checked                | Check boxes beside titles                         |
| ❌ “Set OpenAI API key”          | API key missing                | Click “API Key” in navbar                         |
| ⚠️ Search returns 0 results     | Arxiv request limit or timeout | Try again after 30 seconds                        |

---

## 🧰 Tech Stack

* **Frontend:** Vanilla JS (ES6), CSS Grid, DOM API
* **Data Source:** [arXiv API](https://arxiv.org/help/api/user-manual)
* **AI Summaries:** OpenAI GPT-4o-mini (optional)
* **Word Export:** [docx.js (7.7.0)](https://www.npmjs.com/package/docx)

---

## 🧑‍💻 Author

**Seiya Genda**
University of Nebraska at Kearney
*(Computer Science × Marketing — Data Analytics focus)*

---

## 🪪 License

MIT License © 2025 Seiya Genda
