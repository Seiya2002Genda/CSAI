// ==============================
// app.js — CS Scholar Enhanced (English UI)
// ==============================

const el = {
  q: document.getElementById("q"),
  searchBtn: document.getElementById("search-btn"),
  results: document.getElementById("results"),
  stats: document.getElementById("stats"),
  exportMenuBtn: document.getElementById("export-menu-btn"),
};

let resultsCache = [];
let selectedPapers = new Set();

// ----------------- Search -----------------
if (el.searchBtn) el.searchBtn.addEventListener("click", search);
el.q?.addEventListener("keydown", (e) => e.key === "Enter" && search());

async function search() {
  const q = el.q.value.trim();
  if (!q) return;
  el.stats.textContent = "Searching...";
  el.results.innerHTML = "";
  resultsCache = [];
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&max_results=200`;
    const res = await fetch(url);
    const xml = await res.text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const entries = Array.from(doc.getElementsByTagName("entry"));
    entries.forEach((e) => {
      const title = e.getElementsByTagName("title")[0]?.textContent?.trim() || "";
      const summary = e.getElementsByTagName("summary")[0]?.textContent?.trim() || "";
      const link = e.getElementsByTagName("id")[0]?.textContent?.trim() || "";
      const published = e.getElementsByTagName("published")[0]?.textContent?.trim() || "";
      const year = published.slice(0, 4);
      const authors = Array.from(e.getElementsByTagName("author")).map(a =>
        a.getElementsByTagName("name")[0]?.textContent?.trim()
      );
      resultsCache.push({ title, summary, url: link, year, authors, venue: "arXiv" });
    });
    rerender();
  } catch (err) {
    console.error(err);
    el.stats.textContent = "Failed to fetch results.";
  }
}

// ----------------- Render -----------------
function rerender() {
  el.results.innerHTML = "";
  selectedPapers.clear();
  resultsCache.forEach((r) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h3 style="display:flex;align-items:center;justify-content:space-between;">
        <span>${r.title}</span>
        <input type="checkbox" class="paper-check" style="transform:scale(1.3);margin-left:10px;">
      </h3>
      <div class="meta">${r.authors.join(", ")} ・ ${r.year} ・ ${r.venue}</div>
      <p class="summary">${r.summary}</p>
      <div class="card-aside">
        <button class="copy ghost">Copy</button>
        <a class="open primary" href="${r.url}" target="_blank" rel="noopener">Open</a>
      </div>`;
    div.querySelector(".copy").addEventListener("click", () =>
      navigator.clipboard.writeText(`${r.title}\n${r.authors.join(", ")} (${r.year})\n${r.summary}`)
    );
    div.querySelector(".paper-check").addEventListener("change", (e) => {
      if (e.target.checked) selectedPapers.add(r.title);
      else selectedPapers.delete(r.title);
      updatePopupVisibility();
    });
    el.results.appendChild(div);
  });
  el.stats.textContent = `${resultsCache.length} results found (${resultsCache.length ? resultsCache[0].year : ""})`;
}

// ----------------- Popup -----------------
let popup = null;
function updatePopupVisibility() {
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "export-popup";
    popup.innerHTML = `
      <div class="popup-inner">
        <p>✅ Export the selected papers as a summarized Word file?</p>
        <button id="popup-export" class="primary">Export Selected Papers to Word</button>
      </div>`;
    document.body.appendChild(popup);
    document.getElementById("popup-export").addEventListener("click", exportSelectedSummariesToWord);
  }
  popup.style.display = selectedPapers.size > 0 ? "block" : "none";
}

// ----------------- Word Export -----------------
async function exportSelectedSummariesToWord() {
  if (!selectedPapers.size) {
    alert("No papers selected.");
    return;
  }

  if (!window.docx) {
    alert("docx library not loaded.\nPlease add this line to index.html:\n<script src='https://unpkg.com/docx@8.0.0/build/index.umd.js'></script>");
    return;
  }

  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;
  const selected = resultsCache.filter((r) => selectedPapers.has(r.title));

  const docChildren = [
    new Paragraph({
      text: "Combined Summary of Selected Papers",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 400 },
    }),
  ];

  selected.forEach((r) => {
    docChildren.push(
      new Paragraph({
        text: `${r.authors.join(", ")} (${r.year}). ${r.title}. ${r.venue}.`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: r.summary,
            font: "Times New Roman",
            size: 24,
          }),
        ],
        spacing: { after: 300 },
      })
    );
  });

  const doc = new Document({
    sections: [{ properties: {}, children: docChildren }],
  });

  const blob = await Packer.toBlob(doc);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Selected_Papers_Summary.docx";
  a.click();
}

// ===============================
// Mutation observer for checkbox
// ===============================
const observer = new MutationObserver(() => {
  const checkboxes = document.querySelectorAll(".paper-check");
  checkboxes.forEach((cb) => {
    if (!cb.dataset.bound) {
      cb.dataset.bound = "1";
      cb.addEventListener("change", (e) => {
        const title = e.target.closest(".card").querySelector("span").innerText;
        if (e.target.checked) selectedPapers.add(title);
        else selectedPapers.delete(title);
        updatePopupVisibility();
      });
    }
  });
});
observer.observe(el.results, { childList: true, subtree: true });
