import { CHECKED_ON, DEALS } from "./deals.js";

const VERDICT_RANK = { newlow: 0, strong: 1, good: 2, modest: 3, flag: 4 };

const grid = document.getElementById("deal-grid");
const resultLine = document.getElementById("result-line");
const emptyNote = document.getElementById("empty");
const searchInput = document.getElementById("search");
const storeSelect = document.getElementById("store");
const discountSelect = document.getElementById("discount");
const sortSelect = document.getElementById("sort");
const chipsBox = document.getElementById("category-chips");

const CATEGORIES = ["All", ...new Set(DEALS.map((d) => d.category))];
let activeCategory = "All";

function money(n) {
  return "$" + n.toFixed(2).replace(/\.00$/, "");
}

function discountPct(deal) {
  return Math.round((1 - deal.sale / deal.usual) * 100);
}

function saving(deal) {
  return deal.usual - deal.sale;
}

function buildChips() {
  for (const cat of CATEGORIES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = cat;
    btn.setAttribute("aria-pressed", cat === activeCategory ? "true" : "false");
    btn.addEventListener("click", () => {
      activeCategory = cat;
      for (const other of chipsBox.querySelectorAll(".chip")) {
        other.setAttribute("aria-pressed", other === btn ? "true" : "false");
      }
      render();
    });
    chipsBox.appendChild(btn);
  }
}

function dealCard(deal) {
  const pct = discountPct(deal);
  const card = document.createElement("article");
  card.className = "card";

  const top = document.createElement("div");
  top.className = "card-top";
  const store = document.createElement("span");
  store.className = "store";
  store.textContent = deal.store;
  const cat = document.createElement("span");
  cat.className = "category";
  cat.textContent = deal.category;
  top.append(store, cat);

  const pill = document.createElement("span");
  pill.className = "pill pill-" + deal.verdict;
  pill.textContent = deal.verdictLabel;

  const title = document.createElement("h2");
  title.textContent = deal.name;

  const prices = document.createElement("div");
  prices.className = "prices";
  const sale = document.createElement("span");
  sale.className = "sale";
  sale.textContent = money(deal.sale);
  const usual = document.createElement("span");
  usual.className = "usual";
  usual.textContent = money(deal.usual);
  const off = document.createElement("span");
  off.className = "off";
  off.textContent = pct + "% off";
  prices.append(sale, usual, off);

  const saveLine = document.createElement("p");
  saveLine.className = "save-line";
  const saveStrong = document.createElement("strong");
  saveStrong.textContent = "You save " + money(saving(deal));
  saveLine.append(saveStrong, document.createTextNode(" vs the usual price."));

  const verdictNote = document.createElement("p");
  verdictNote.className = "verdict-note";
  verdictNote.textContent = deal.note;

  card.append(top, pill, title, prices, saveLine, verdictNote);

  if (deal.alsoAt) {
    const also = document.createElement("p");
    also.className = "also";
    also.textContent = deal.alsoAt;
    card.appendChild(also);
  }

  const link = document.createElement("a");
  link.className = "shop-link";
  link.href = deal.url;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "View at " + deal.store + " \u2197";
  card.appendChild(link);

  const checked = document.createElement("p");
  checked.className = "checked";
  checked.textContent =
    "Checked " + CHECKED_ON + " \u00b7 price reported by " + deal.source + ", " + deal.sourceDate + ".";
  card.appendChild(checked);

  return card;
}

function filteredDeals() {
  const q = searchInput.value.trim().toLowerCase();
  const store = storeSelect.value;
  const minPct = Number(discountSelect.value);
  let list = DEALS.filter((d) => {
    if (activeCategory !== "All" && d.category !== activeCategory) return false;
    if (store !== "all" && d.store !== store) return false;
    if (discountPct(d) < minPct) return false;
    if (q && !(d.name + " " + d.store + " " + d.category).toLowerCase().includes(q)) return false;
    return true;
  });
  const mode = sortSelect.value;
  const by = {
    verdict: (a, b) => VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict] || discountPct(b) - discountPct(a),
    pct: (a, b) => discountPct(b) - discountPct(a),
    save: (a, b) => saving(b) - saving(a),
    price: (a, b) => a.sale - b.sale
  }[mode];
  return list.sort(by);
}

function render() {
  const list = filteredDeals();
  grid.replaceChildren(...list.map(dealCard));
  emptyNote.hidden = list.length !== 0;
  const total = DEALS.length;
  resultLine.textContent =
    list.length === total
      ? "Showing all " + total + " checked deals."
      : "Showing " + list.length + " of " + total + " checked deals.";
}

function renderSummary() {
  const pcts = DEALS.map(discountPct);
  const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  const totalSave = DEALS.reduce((a, d) => a + saving(d), 0);
  const genuine = DEALS.filter((d) => d.verdict !== "flag");
  const best = genuine.reduce((a, b) => (discountPct(b) > discountPct(a) ? b : a), genuine[0]);
  document.getElementById("stat-count").textContent = String(DEALS.length);
  document.getElementById("stat-avg").textContent = avg + "%";
  document.getElementById("stat-save").textContent = money(totalSave);
  document.getElementById("stat-best").textContent = discountPct(best) + "%";
}

buildChips();
renderSummary();
applyUrlParams();
render();
for (const el of [searchInput, storeSelect, discountSelect, sortSelect]) {
  el.addEventListener("input", render);
}

// Shareable filtered views: ?q=lego&category=Audio&store=Amazon&min=40&sort=pct
function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  const q = params.get("q");
  if (q) searchInput.value = q;
  const category = params.get("category");
  if (category && CATEGORIES.includes(category)) {
    activeCategory = category;
    for (const chip of chipsBox.querySelectorAll(".chip")) {
      chip.setAttribute("aria-pressed", chip.textContent === category ? "true" : "false");
    }
  }
  const store = params.get("store");
  if (store && [...storeSelect.options].some((o) => o.value === store)) storeSelect.value = store;
  const min = params.get("min");
  if (min && [...discountSelect.options].some((o) => o.value === min)) discountSelect.value = min;
  const sort = params.get("sort");
  if (sort && [...sortSelect.options].some((o) => o.value === sort)) sortSelect.value = sort;
}
