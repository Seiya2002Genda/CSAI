const el = {
  q: document.getElementById("q"),
  searchBtn: document.getElementById("search-btn"),
  results: document.getElementById("results"),
  stats: document.getElementById("stats")
};

let resultsCache = [];
let selectedPapers = new Set();
let yearSelectEl = null;
let composing = false;

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

// ----------------- 検索 -----------------
async function search() {
  const q = el.q.value.trim();
  if (!q) return;
  el.stats.textContent = "Searching (may take a few seconds)...";
  el.results.innerHTML = "";
  resultsCache = [];

  try {
    const maxPerPage = 2000;
    const maxPages = 5; // 合計最大10000件
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

        // ✅ 年範囲 2010〜2026
        if (year >= 2010 && year <= 2026) {
          resultsCache.push({ title, summary, year, authors, url });
        }
      });

      start += maxPerPage;
      await new Promise((r) => setTimeout(r, 200)); // polite delay
    }

    afterSearchRender();
  } catch (err) {
    console.error(err);
    el.stats.textContent = "Failed to fetch results.";
  }
}

// ----------------- 結果描画 -----------------
function afterSearchRender() {
  const years = [
    ...new Set(resultsCache.map((r) => r.year).filter(Boolean)),
  ]
    .filter((y) => y >= 2010 && y <= 2026)
    .sort((a, b) => b - a);

  buildYearSelectFromData(years);
  rerender();
  const mostRecent = years.length ? years[0] : "";
  el.stats.textContent = `${resultsCache.length} results found (2010–2026)${
    mostRecent ? ` [latest: ${mostRecent}]` : ""
  }`;
}

// ----------------- 年セレクタ -----------------
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
    yearSelectEl.addEventListener("change", () =>
      rerender(yearSelectEl.value)
    );
  }

  yearSelectEl.innerHTML = [
    '<option value="">All</option>',
    ...yearsDesc.map((y) => `<option value="${y}">${y}</option>`),
  ].join("");
}

// ----------------- 表示 -----------------
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
let popup = null;
function updatePopupVisibility() {
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "export-popup";
    popup.innerHTML = `
      <div class="popup-inner">
   <!-- <p>✅ 選択された論文を Wordファイルで要約出力しますか？</p>-->
        <p>✅ Do you want to output summary, which is selected paper</p>
   <!-- <button id="popup-export" class="primary">Wordファイルで要約を出力</button>-->
        <button id="popup-export" class="primary">Output summary at Word file</button>
      </div>`;
    document.body.appendChild(popup);
    document
      .getElementById("popup-export")
      .addEventListener("click", exportWord);
  }
  popup.style.display = selectedPapers.size > 0 ? "block" : "none";
}

// ----------------- Word出力 -----------------
async function exportWord() {
  if (!window.docx)
    // return alert("docxライブラリが読み込まれていません。index.htmlを確認してください。");
    return alert("Do not load the docx library. Please check index.html.")
  const { Document, Packer, Paragraph, TextRun } = window.docx;
  const selected = resultsCache.filter((r) => selectedPapers.has(r.title));

  try {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: "Selected Papers (2010–2026)", heading: "Heading1" }),
            ...selected.map(
              (r) =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${r.authors.join(", ")} (${r.year}). ${r.title}. arXiv.`,
                      font: "Times New Roman",
                      size: 24,
                    }),
                  ],
                })
            ),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Selected_Papers_2010_2026.docx";
    a.click();
  } catch (err) {
    console.error(err);
    alert("Failed to export Word file.");
  }
}
// ===============================
// Selectable Card Feature
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const resultsContainer = document.querySelector(".results");
  if (!resultsContainer) return;

  // チェックされたカードを追跡する配列
  const selectedPapers = new Set();

  // カード描画後にイベントを再付与する
  const attachCheckboxHandlers = () => {
    const checkboxes = resultsContainer.querySelectorAll("input[type='checkbox']");
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const card = e.target.closest(".card");
        const title = card?.querySelector("h3")?.innerText?.trim() || "Untitled Paper";

        if (e.target.checked) {
          selectedPapers.add(title);
          card.classList.add("selected-card");
        } else {
          selectedPapers.delete(title);
          card.classList.remove("selected-card");
        }

        console.log("Selected papers:", Array.from(selectedPapers));
      });
    });
  };

  // MutationObserverで動的生成カードにも反応
  const observer = new MutationObserver(() => attachCheckboxHandlers());
  observer.observe(resultsContainer, { childList: true, subtree: true });

  attachCheckboxHandlers();
});
