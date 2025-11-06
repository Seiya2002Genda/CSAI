console.log("✅ CSAI app.js loaded");

// ----------------- 要素定義 -----------------
const el = {
  q: document.getElementById("q"),
  searchBtn: document.getElementById("search-btn"),
  results: document.getElementById("results"),
  stats: document.getElementById("stats"),
  apiKeyBtn: document.getElementById("set-key"),
};

let resultsCache = [];
let selectedPapers = new Set();
let yearSelectEl = null;
let composing = false;
let popup = null;

// ----------------- API Key 管理 -----------------
initApiKeyButton();

function initApiKeyButton() {
  updateApiKeyBtnStyle();

  if (!el.apiKeyBtn) return;

  el.apiKeyBtn.addEventListener("click", () => {
    const currentKey = localStorage.getItem("openai_api_key");

    // 登録済みなら削除・再設定を選ばせる
    if (currentKey) {
      const replace = confirm("API Key is already saved.\nDo you want to replace or remove it?");
      if (!replace) return;
    }

    const newKey = prompt("Enter your OpenAI API Key (starts with 'sk-'):");
    if (newKey === null) return; // キャンセル
    if (newKey.trim() === "") {
      localStorage.removeItem("openai_api_key");
      alert("🗑️ API Key removed.");
    } else if (newKey.startsWith("sk-")) {
      localStorage.setItem("openai_api_key", newKey.trim());
      alert("✅ API Key saved successfully!");
    } else {
      alert("⚠️ Invalid key format. It must start with 'sk-'.");
    }
    updateApiKeyBtnStyle();
  });
}

function updateApiKeyBtnStyle() {
  const hasKey = !!localStorage.getItem("openai_api_key");
  el.apiKeyBtn.textContent = hasKey ? "API Key ✅" : "API Key";
  el.apiKeyBtn.style.background = hasKey ? "#28a745" : "transparent";
  el.apiKeyBtn.style.color = hasKey ? "#fff" : "#58a6ff";
  el.apiKeyBtn.style.border = hasKey ? "none" : "1px solid #58a6ff";
}

function getApiKey() {
  const key = localStorage.getItem("openai_api_key");
  if (!key) {
    alert("⚠️ Please set your API Key first.");
    return null;
  }
  return key;
}

// ----------------- 検索関連 -----------------
if (el.searchBtn) el.searchBtn.addEventListener("click", search);
if (el.q) {
  el.q.addEventListener("compositionstart", () => (composing = true));
  el.q.addEventListener("compositionend", () => (composing = false));
  el.q.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !composing) {
      e.preventDefault();
      search();
    }
  });
}

async function search() {
  const q = el.q.value.trim();
  if (!q) return;
  el.stats.textContent = "Searching (may take a few seconds)...";
  el.results.innerHTML = "";
  resultsCache = [];

  try {
    const maxPerPage = 2000;
    const maxPages = 5;
    let start = 0;

    for (let i = 0; i < maxPages; i++) {
      const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
        q
      )}&start=${start}&max_results=${maxPerPage}`;
      const res = await fetch(url);
      const xml = await res.text();
      const doc = new DOMParser().parseFromString(xml, "text/xml");
      const entries = Array.from(doc.getElementsByTagName("entry"));
      if (!entries.length) break;

      entries.forEach((e) => {
        const title = e.querySelector("title")?.textContent?.trim() ?? "";
        const summary = e.querySelector("summary")?.textContent?.trim() ?? "";
        const published = e.querySelector("published")?.textContent ?? "";
        const year = parseInt(published.slice(0, 4));
        const url = e.querySelector("id")?.textContent ?? "";
        const authors = Array.from(e.querySelectorAll("author name")).map(
          (a) => a.textContent
        );
        if (year >= 2010 && year <= 2026) {
          resultsCache.push({ title, summary, year, authors, url });
        }
      });

      start += maxPerPage;
      await new Promise((r) => setTimeout(r, 200));
    }

    afterSearchRender();
  } catch (err) {
    console.error(err);
    el.stats.textContent = "Failed to fetch results.";
  }
}

// ----------------- 検索結果描画 -----------------
function afterSearchRender() {
  const years = [...new Set(resultsCache.map((r) => r.year).filter(Boolean))]
    .filter((y) => y >= 2010 && y <= 2026)
    .sort((a, b) => b - a);

  buildYearSelectFromData(years);
  rerender();
  const mostRecent = years.length ? years[0] : "";
  el.stats.textContent = `${resultsCache.length} results found (2010–2026)${
    mostRecent ? ` [latest: ${mostRecent}]` : ""
  }`;
}

function buildYearSelectFromData(yearsDesc) {
  if (!yearSelectEl) {
    const wrap = document.createElement("div");
    wrap.className = "year-filter";
    wrap.innerHTML = `
      <label for="year-select" style="color:#bfc6d1">Filter by year:</label>
      <select id="year-select" style="margin-left:8px;"></select>`;
    const hero = document.querySelector(".hero");
    hero && hero.insertBefore(wrap, el.stats);
    yearSelectEl = wrap.querySelector("#year-select");
    yearSelectEl.addEventListener("change", () => rerender(yearSelectEl.value));
  }

  yearSelectEl.innerHTML = [
    '<option value="">All</option>',
    ...yearsDesc.map((y) => `<option value="${y}">${y}</option>`),
  ].join("");
}

function rerender(filterYear = "") {
  el.results.innerHTML = "";
  const filtered = filterYear
    ? resultsCache.filter((r) => r.year === parseInt(filterYear))
    : resultsCache;

  filtered.forEach((r) => {
    const div = document.createElement("div");
    div.className = "card";
    const checked = selectedPapers.has(r.title) ? "checked" : "";
    div.innerHTML = `
      <h3 style="display:flex;align-items:center;justify-content:space-between;">
        <span>${r.title}</span>
        <input type="checkbox" class="paper-check" ${checked}>
      </h3>
      <div class="meta">${r.authors.join(", ")} ・ ${r.year}</div>
      <p>${r.summary}</p>
      <a href="${r.url}" target="_blank" class="primary">Open</a>`;
    div.querySelector(".paper-check").addEventListener("change", (e) => {
      if (e.target.checked) selectedPapers.add(r.title);
      else selectedPapers.delete(r.title);
      updatePopupVisibility();
    });
    el.results.appendChild(div);
  });
}

// ----------------- Popup -----------------
function updatePopupVisibility() {
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "export-popup";
    popup.innerHTML = `
      <div class="popup-inner" style="background:#0d1117;padding:10px 20px;border-radius:8px;display:flex;align-items:center;gap:12px;">
        <label style="color:#bfc6d1;"><input type="checkbox" checked disabled> Generate AI summaries for selected papers</label>
        <button id="popup-export" class="primary">Generate AI Summary</button>
      </div>`;
    document.body.appendChild(popup);
    document.getElementById("popup-export").addEventListener("click", exportWord);
  }
  popup.style.display = selectedPapers.size > 0 ? "flex" : "none";
}

// ----------------- AI要約生成 -----------------
async function exportWord() {
  const selected = resultsCache.filter((r) => selectedPapers.has(r.title));
  if (selected.length === 0) {
    alert("Please select at least one paper.");
    return;
  }

  const key = getApiKey();
  if (!key) return;

  let modal = document.createElement("div");
  modal.style.cssText = `
    position:fixed; top:0; left:0; width:100%; height:100%;
    background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:9999;
  `;
  modal.innerHTML = `
    <div style="background:#1a1a1a;padding:30px;border-radius:12px;max-width:900px;max-height:80vh;overflow-y:auto;color:#fff;">
      <h2 style="text-align:center;">🧠 AI Summaries (via OpenAI API)</h2>
      <div id="ai-summaries" style="margin-top:20px;"></div>
      <button id="closeModal" style="margin-top:20px;padding:10px 20px;background:#444;color:#fff;border:none;border-radius:8px;cursor:pointer;">Close</button>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector("#closeModal").addEventListener("click", () => modal.remove());
  const outputDiv = modal.querySelector("#ai-summaries");

  for (const paper of selected) {
    const itemDiv = document.createElement("div");
    itemDiv.style.cssText = "margin-bottom:25px; border-bottom:1px solid #333; padding-bottom:15px;";
    itemDiv.innerHTML = `
      <h3>${paper.title}</h3>
      <p style="color:#bfc6d1;">${paper.authors.join(", ")} ・ ${paper.year}</p>
      <p style="color:#888;">Generating AI summary...</p>`;
    outputDiv.appendChild(itemDiv);

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are an academic assistant. Summarize the given abstract clearly in 4–5 sentences." },
            { role: "user", content: paper.summary },
          ],
        }),
      });

      const data = await res.json();
      const summary = data.choices?.[0]?.message?.content?.trim() || "(No summary generated)";
      itemDiv.querySelector("p[color='#888'], p").outerHTML = `
        <p>${summary}</p>
        <a href="${paper.url}" target="_blank" style="color:#58a6ff;">Open in arXiv</a>`;
    } catch (err) {
      console.error(err);
      itemDiv.querySelector("p[color='#888'], p").outerHTML = `<p style="color:#f77;">❌ Failed to generate summary.</p>`;
    }
  }
}
