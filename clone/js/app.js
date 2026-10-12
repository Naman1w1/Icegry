import {
  products,
  collections,
  heroSlides,
  storySlides,
  featuredTiles,
  stores,
  seoSections,
  money,
  byCollection,
  byId,
  newInChips,
  filterOptions,
} from "./data.js";
import { icons } from "./icons.js";

function getStorage(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

const getRoot = () => document.getElementById("root") || document.body;

const store = {
  cart: getStorage("icegry-cart", []),
  wish: getStorage("icegry-wish", []),
  user: getStorage("icegry-user", null),
  ui: {
    mega: false,
    search: false,
    cart: false,
    chat: false,
    filters: false,
    notif: false,
    menu: false,
    stories: false,
    storyIdx: 0,
    storyPlaying: true,
    quickAddProduct: null,
    pdpProduct: null,
    query: "",
    heroIdx: 0,
    toast: null,
    activeAccordion: 0,
    chip: "view-all",
    sort: "manual",
    draftFilters: emptyFilters(),
    appliedFilters: emptyFilters(),
    cardSlides: {},
    torchBlow: false,
  },
};

function emptyFilters() {
  return { sizes: [], availability: [], types: [], colors: [] };
}

let storyTimer = null;
let heroTimer = null;

function persist() {
  setStorage("icegry-cart", store.cart);
  setStorage("icegry-wish", store.wish);
  setStorage("icegry-user", store.user);
}

function showToast(msg) {
  store.ui.toast = msg;
  render();
  setTimeout(() => {
    if (store.ui.toast === msg) {
      store.ui.toast = null;
      render();
    }
  }, 2500);
}

function navigate(hash) {
  location.hash = hash;
}

function path() {
  const raw = location.hash.replace(/^#/, "") || "/";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function wished(id) {
  return store.wish.includes(id);
}

function toggleWish(id, e) {
  if (e) e.stopPropagation();
  const exists = wished(id);
  store.wish = exists ? store.wish.filter((x) => x !== id) : [...store.wish, id];
  persist();
  showToast(exists ? "Removed from wishlist" : "Saved to wishlist");
  render();
}

function addToBag(id, size = "M", e) {
  if (e) e.stopPropagation();
  const p = byId(id);
  const found = store.cart.find((i) => i.id === id && i.size === size);
  if (found) found.qty += 1;
  else store.cart.push({ id, size, qty: 1 });
  persist();
  store.ui.quickAddProduct = null;
  store.ui.cart = true;
  showToast(`Added ${p.name} (${size}) to bag`);
  render();
}

function setQty(index, delta) {
  store.cart[index].qty += delta;
  if (store.cart[index].qty <= 0) store.cart.splice(index, 1);
  persist();
  render();
}

function removeFromCart(index) {
  store.cart.splice(index, 1);
  persist();
  render();
}

function cartCount() {
  return store.cart.reduce((n, i) => n + i.qty, 0);
}

function cartTotal() {
  return store.cart.reduce((n, i) => n + byId(i.id).price * i.qty, 0);
}

// STORY VIEWER CONTROLS
function startStoryTimer() {
  clearInterval(storyTimer);
  if (!store.ui.stories || !store.ui.storyPlaying) return;
  storyTimer = setInterval(() => {
    if (store.ui.storyIdx < storySlides.length - 1) {
      store.ui.storyIdx++;
      render();
    } else {
      store.ui.stories = false;
      clearInterval(storyTimer);
      render();
    }
  }, 4500);
}

function openStory(idx = 0) {
  store.ui.stories = true;
  store.ui.storyIdx = idx;
  store.ui.storyPlaying = true;
  startStoryTimer();
  render();
}

function closeStory() {
  store.ui.stories = false;
  clearInterval(storyTimer);
  render();
}

function toggleStoryPlay() {
  store.ui.storyPlaying = !store.ui.storyPlaying;
  if (store.ui.storyPlaying) startStoryTimer();
  else clearInterval(storyTimer);
  render();
}

// HERO CAROUSEL CONTROLS
function startHeroAutoPlay() {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => {
    store.ui.heroIdx = (store.ui.heroIdx + 1) % heroSlides.length;
    render();
  }, 6000);
}

// CARD COMPONENT — Latest Drop style (rounded media, dots, always-on +)
function card(p, opts = {}) {
  const saved = wished(p.id);
  const isSale = p.compare && p.compare > p.price;
  const slide = store.ui.cardSlides[p.id] || 0;
  const imgs = p.images && p.images.length ? p.images : [""];
  const activeImg = imgs[Math.min(slide, imgs.length - 1)];
  const dots = Math.min(imgs.length, 6);

  return `
    <article class="card ${opts.compact ? "card-drop" : ""}" data-product-id="${p.id}">
      <div class="card-inner">
        <a class="card-media" href="#/product/${p.id}">
          ${p.soldOut ? `<span class="badge-tag">Sold Out</span>` : isSale ? `<span class="badge-tag sale">Sale</span>` : ""}
          <img class="primary-img" src="${activeImg}" alt="${p.name}" loading="lazy" />
          ${
            imgs[1]
              ? `<img class="hover-img" src="${imgs[1]}" alt="${p.name}" loading="lazy" />`
              : ""
          }
        </a>
        <button class="card-wish-btn ${saved ? "saved" : ""}" data-wish="${p.id}" aria-label="Save to wishlist" title="Wishlist">
          ${saved ? icons.bookmarkFill : icons.bookmark}
        </button>
        ${
          dots > 1
            ? `<div class="card-dots" aria-hidden="true">
                ${Array.from({ length: dots })
                  .map(
                    (_, i) =>
                      `<button class="card-dot ${i === slide % dots ? "active" : ""}" data-card-slide="${p.id}" data-slide="${i}" aria-label="Image ${i + 1}"></button>`
                  )
                  .join("")}
              </div>`
            : ""
        }
      </div>
      <div class="card-info">
        <div class="card-info-main">
          <h3 class="card-title">
            <a href="#/product/${p.id}">${p.name}</a>
          </h3>
          <div class="card-price-row">
            ${isSale ? `<span class="price-was">${money(p.compare)}</span>` : ""}
            <span class="price-current">${money(p.price)}</span>
          </div>
        </div>
        <button class="card-quick-add-btn visible" data-quick-add="${p.id}" aria-label="Quick Add" title="Quick size add">
          ${icons.plus}
        </button>
      </div>
    </article>
  `;
}

function filterCount() {
  const f = store.ui.appliedFilters;
  return f.sizes.length + f.availability.length + f.types.length + f.colors.length;
}

function applyProductFilters(list) {
  const f = store.ui.appliedFilters;
  let out = [...list];

  if (f.sizes.length) {
    out = out.filter((p) => (p.sizes || []).some((s) => f.sizes.includes(s)));
  }
  if (f.availability.length) {
    out = out.filter((p) => {
      const inStock = !p.soldOut;
      if (f.availability.includes("in") && inStock) return true;
      if (f.availability.includes("out") && !inStock) return true;
      return false;
    });
  }
  if (f.types.length) {
    const catSet = new Set();
    filterOptions.types.forEach((t) => {
      if (f.types.includes(t.value)) t.cats.forEach((c) => catSet.add(c));
    });
    out = out.filter((p) => (p.cats || []).some((c) => catSet.has(c)));
  }
  if (f.colors.length) {
    out = out.filter((p) => (p.cats || []).some((c) => f.colors.includes(c)));
  }

  switch (store.ui.sort) {
    case "title-ascending":
      out.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "title-descending":
      out.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "price-ascending":
      out.sort((a, b) => a.price - b.price);
      break;
    case "price-descending":
      out.sort((a, b) => b.price - a.price);
      break;
    case "best-selling":
      out.sort((a, b) => (a.soldOut === b.soldOut ? 0 : a.soldOut ? 1 : -1));
      break;
    default:
      break;
  }
  return out;
}

// HEADER COMPONENT — floating glass navbar (Icegry icon layout, ICEGRY brand)
function header() {
  const cCount = cartCount();
  const wCount = store.wish.length;
  const isHome = path() === "/";
  const isCollection = path().startsWith("/collection/");
  const fCount = filterCount();

  return `
    <!-- Floating top brand bar (mobile / immersive) -->
    <header class="float-top-nav ${isHome ? "navbar-transparent on-hero" : "navbar-solid-white"} ${isCollection ? "on-collection" : ""}">
      <div class="brand-pill ${store.ui.menu ? "open" : ""}">
        <button class="brand-pill-plus" data-toggle-menu aria-label="${store.ui.menu ? "Close menu" : "Open menu"}">
          ${store.ui.menu ? icons.close : icons.plus}
        </button>
        <a class="brand-pill-name" href="#/" aria-label="Icegry Home">
          ${icons.logo}
        </a>
      </div>

      ${
        isCollection
          ? `<button class="advance-filters-btn ${store.ui.filters || fCount ? "active" : ""} ${store.ui.torchBlow ? "blowing" : ""}" data-open-filters aria-label="Advance Filters" aria-pressed="${store.ui.filters || fCount ? "true" : "false"}">
              <span class="advance-filters-icon torch-icon">${icons.flashlight}</span>
              <span class="advance-filters-label">Advance Filters${fCount ? ` (${fCount})` : ""}</span>
            </button>`
          : ""
      }

      <div class="float-top-actions">
        <a class="float-icon-btn" href="#/wishlist" aria-label="Wishlist" title="Wishlist">
          ${icons.bookmark}
          ${wCount ? `<span class="header-badge">${wCount}</span>` : ""}
        </a>
        <button class="float-icon-btn" data-open-cart aria-label="Cart" title="Bag">
          ${icons.cabinet}
          ${cCount ? `<span class="header-badge">${cCount}</span>` : ""}
        </button>
      </div>
    </header>

    <!-- Desktop sticky header -->
    <header class="main-header desktop-only ${isHome ? "navbar-transparent" : "navbar-solid-white"}">
      <div class="header-left">
        <a class="nav-link" href="#/collection/new-in">New in</a>
        <button class="nav-link ${store.ui.mega ? "active" : ""}" data-toggle-mega>Collections</button>
      </div>

      <div class="header-center">
        <a class="header-logo" href="#/" aria-label="Icegry Home">
          ${icons.logo}
        </a>
      </div>

      <div class="header-right">
        ${
          isCollection
            ? `<button class="advance-filters-btn desktop-filters ${store.ui.filters || fCount ? "active" : ""} ${store.ui.torchBlow ? "blowing" : ""}" data-open-filters aria-label="Advance Filters" aria-pressed="${store.ui.filters || fCount ? "true" : "false"}">
                <span class="advance-filters-icon torch-icon">${icons.flashlight}</span>
                <span class="advance-filters-label">Advance Filters${fCount ? ` (${fCount})` : ""}</span>
              </button>`
            : ""
        }
        <button class="header-icon-btn stories-launcher" data-open-story="0" aria-label="Stories" title="View Stories">
          ${icons.stories}
        </button>
        <a class="header-icon-btn" href="#/stores" aria-label="Walk-in stores" title="Walk-in stores">
          ${icons.pin}
        </a>
        <button class="header-icon-btn" data-open-search aria-label="Search" title="Search catalog">
          ${icons.search}
        </button>
        <a class="header-icon-btn" href="#/account" aria-label="Account" title="Account">
          ${icons.user}
        </a>
        <a class="header-icon-btn wish-btn" href="#/wishlist" aria-label="Wishlist" title="Wishlist">
          ${icons.bookmark}
          ${wCount ? `<span class="header-badge">${wCount}</span>` : ""}
        </a>
        <button class="header-icon-btn cart-btn" data-open-cart aria-label="Cart" title="Shopping Bag">
          <span class="cart-label">Cart (${cCount})</span>
        </button>
      </div>
    </header>

    <div id="drawers-container">
      ${store.ui.mega || store.ui.menu ? megaDrawer() : ""}
      ${store.ui.search ? searchDrawer() : ""}
      ${store.ui.filters ? filtersDrawer() : ""}
      ${cartDrawer()}
      ${store.ui.chat ? chatDrawer() : ""}
      ${store.ui.stories ? storyViewer() : ""}
      ${store.ui.quickAddProduct ? quickAddModal() : ""}
      ${mobileBottomNav()}
      ${store.ui.toast ? `<div class="toast-popup">${store.ui.toast}</div>` : ""}
    </div>
  `;
}

const CHIP_CAT_MAP = {
  "view-all": null,
  "t-shirts": ["t-shirts"],
  polo: ["polos"],
  shirts: ["shirts"],
  hoodies: ["hoodies"],
  caps: ["caps"],
  jackets: ["jackets"],
  "puffer-jacket": ["jackets", "puffer"],
  jersey: ["jersey", "t-shirts"],
  pants: ["pants"],
  denims: ["jeans", "denim"],
  "crop-top": ["crop", "tops"],
  shorts: ["shorts"],
  sweatshirt: ["sweatshirts"],
  cargo: ["cargos"],
};

function applyChipFilter(list, chip) {
  const cats = CHIP_CAT_MAP[chip];
  if (!cats) return list;
  return list.filter((p) => (p.cats || []).some((c) => cats.includes(c)));
}

function filtersDrawer() {
  const draft = store.ui.draftFilters;
  const toggleClass = (arr, val) => (arr.includes(val) ? "checked" : "");

  const checkRow = (name, value, label, group) => `
    <label class="filter-check ${toggleClass(draft[group], value)}">
      <input type="checkbox" data-filter-toggle="${group}" data-filter-value="${value}" ${draft[group].includes(value) ? "checked" : ""} />
      <span class="filter-check-box"></span>
      <span class="filter-check-label">${label}</span>
    </label>
  `;

  return `
    <div class="drawer-overlay active" data-close-filters></div>
    <aside class="filters-drawer" role="dialog" aria-label="Advance Filters">
      <div class="filters-drawer-head">
        <div class="filters-drawer-title">
          <span class="advance-filters-icon torch-icon lit">${icons.flashlight}</span>
          <h2>Advance Filters</h2>
        </div>
        <button class="filters-close" data-close-filters aria-label="Close filters">${icons.close}</button>
      </div>

      <div class="filters-drawer-body">
        <section class="filter-group">
          <h3 class="filter-group-title">Size</h3>
          <div class="filter-check-grid">
            ${filterOptions.sizes.map((s) => checkRow("size", s, s, "sizes")).join("")}
          </div>
        </section>

        <section class="filter-group">
          <h3 class="filter-group-title">Availability</h3>
          <div class="filter-check-list">
            ${filterOptions.availability.map((a) => checkRow("availability", a.value, a.label, "availability")).join("")}
          </div>
        </section>

        <section class="filter-group">
          <h3 class="filter-group-title">Product type</h3>
          <div class="filter-check-list">
            ${filterOptions.types.map((t) => checkRow("types", t.value, t.label, "types")).join("")}
          </div>
        </section>

        <section class="filter-group">
          <h3 class="filter-group-title">Color family</h3>
          <div class="filter-check-list">
            ${filterOptions.colors.map((c) => checkRow("colors", c.value, c.label, "colors")).join("")}
          </div>
        </section>

        <section class="filter-group">
          <h3 class="filter-group-title">Sort by</h3>
          <select class="filter-sort-select" data-filter-sort aria-label="Sort by">
            ${filterOptions.sorts
              .map(
                (s) =>
                  `<option value="${s.value}" ${store.ui.sort === s.value ? "selected" : ""}>${s.label}</option>`
              )
              .join("")}
          </select>
        </section>
      </div>

      <div class="filters-drawer-foot">
        <button class="btn-filter-clear" data-filters-clear type="button">Remove all</button>
        <button class="btn-filter-apply" data-filters-apply type="button">Apply</button>
      </div>
    </aside>
  `;
}

// MEGA DRAWER / NAVIGATION MENU
function megaDrawer() {
  const colLinks = (group) =>
    collections
      .filter((c) => c.group === group)
      .map(
        (c) =>
          `<a class="mega-item-link" href="#/collection/${c.slug}">
            ${c.hex ? `<span class="color-dot" style="background:${c.hex}"></span>` : ""}
            ${c.name}
          </a>`
      )
      .join("");

  return `
    <div class="drawer-overlay active" data-close-mega></div>
    <div class="mega-drawer">
      <div class="mega-drawer-inner">
        <div class="mega-col">
          <h4 class="mega-col-title">Collections</h4>
          <div class="mega-links-list">
            ${colLinks("new")}
          </div>
        </div>

        <div class="mega-col">
          <h4 class="mega-col-title">Tops</h4>
          <div class="mega-links-list">
            ${colLinks("top")}
          </div>
        </div>

        <div class="mega-col">
          <h4 class="mega-col-title">Bottoms</h4>
          <div class="mega-links-list">
            ${colLinks("bottom")}
          </div>
        </div>

        <div class="mega-col">
          <h4 class="mega-col-title">Accessories</h4>
          <div class="mega-links-list">
            ${colLinks("accessories")}
          </div>
          <h4 class="mega-col-title" style="margin-top:20px;">Shop by Color</h4>
          <div class="mega-links-list color-grid">
            ${colLinks("color")}
          </div>
        </div>

        <div class="mega-col mega-featured-col desktop-only">
          <h4 class="mega-col-title">Featured Drops</h4>
          <div class="mega-featured-grid">
            <a class="mega-tile" href="#/collection/winter">
              <img src="https://bluorng.com/cdn/shop/files/cdwasa.jpg?v=1769161054&width=400" alt="Winter 2025" />
              <span>Winter Collection</span>
            </a>
            <a class="mega-tile" href="#/collection/bags">
              <img src="https://bluorng.com/cdn/shop/files/dgbetbet-Recovered.jpg?v=1787987969&width=400" alt="Bags" />
              <span>Icegry Bags</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

// SEARCH DRAWER
function searchDrawer() {
  const query = store.ui.query.trim().toLowerCase();
  const results = query
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.cats.some((c) => c.toLowerCase().includes(query)) ||
          p.description.toLowerCase().includes(query)
      )
    : [];

  const trending = ["Hoodies", "T-shirts", "Bags", "Racing", "Caps", "Winter", "Basics"];

  return `
    <div class="drawer-overlay active" data-close-search></div>
    <div class="search-drawer">
      <div class="search-header">
        <div class="search-input-wrap">
          <span class="search-icon">${icons.search}</span>
          <input
            type="search"
            id="searchInput"
            placeholder="Search products, collections, colors..."
            value="${store.ui.query}"
            autofocus
          />
          ${
            store.ui.query
              ? `<button class="clear-search-btn" data-clear-search>${icons.close}</button>`
              : ""
          }
        </div>
        <button class="close-search-btn" data-close-search aria-label="Close search">
          ${icons.close}
        </button>
      </div>

      <div class="search-body">
        ${
          !query
            ? `
            <div class="trending-section">
              <h4>Popular Searches</h4>
              <div class="trending-tags">
                ${trending
                  .map(
                    (tag) =>
                      `<button class="trend-tag" data-trend="${tag}">${tag}</button>`
                  )
                  .join("")}
              </div>
            </div>
            <div class="recent-picks">
              <h4>Recommended Drops</h4>
              <div class="search-grid">
                ${products.slice(0, 4).map((p) => card(p)).join("")}
              </div>
            </div>
          `
            : `
            <div class="results-meta">
              <p>${results.length} result${results.length === 1 ? "" : "s"} for "${store.ui.query}"</p>
            </div>
            ${
              results.length
                ? `<div class="search-grid">${results.map((p) => card(p)).join("")}</div>`
                : `<div class="no-results"><p>No drops found matching "${store.ui.query}". Try searching for Hoodies, T-shirts, or Bags.</p></div>`
            }
          `
        }
      </div>
    </div>
  `;
}

// CART DRAWER ("Your bag")
function cartDrawer() {
  const count = cartCount();
  const total = cartTotal();
  const freeShippingThreshold = 5000;
  const diff = freeShippingThreshold - total;
  const progressPercent = Math.min(100, Math.round((total / freeShippingThreshold) * 100));

  return `
    ${store.ui.cart ? `<div class="drawer-overlay active" data-close-cart></div>` : ""}
    <div class="cart-drawer ${store.ui.cart ? "is-open" : ""}">
      <div class="cart-drawer-header">
        <h2 class="cart-title">Your Bag (${count})</h2>
        <button class="cart-close-btn" data-close-cart aria-label="Close cart">
          ${icons.close}
        </button>
      </div>

      <!-- Free shipping progress bar -->
      <div class="shipping-bar-wrap">
        <div class="shipping-bar-text">
          ${
            diff > 0
              ? `Add <strong>${money(diff)}</strong> more for <strong>FREE EXPRESS SHIPPING</strong>`
              : `<strong>CONGRATULATIONS!</strong> You qualified for Free Express Shipping!`
          }
        </div>
        <div class="shipping-progress">
          <div class="shipping-progress-fill" style="width: ${progressPercent}%;"></div>
        </div>
      </div>

      <div class="cart-drawer-body">
        ${
          count === 0
            ? `
            <div class="empty-cart-state">
              <h3>Your bag is empty!</h3>
              <p>Let's get started with our newest drops.</p>
              <a class="btn-shop-now" href="#/collection/new-in" data-close-cart>
                Shop Now ${icons.direction}
              </a>

              <div class="cart-recommendations">
                <h4>Products you may like</h4>
                <div class="rec-grid">
                  ${products
                    .slice(0, 3)
                    .map(
                      (p) => `
                    <div class="rec-item" data-product-id="${p.id}">
                      <img src="${p.images[0]}" alt="${p.name}" />
                      <div class="rec-info">
                        <h5><a href="#/product/${p.id}" data-close-cart>${p.name}</a></h5>
                        <p>${money(p.price)}</p>
                        <button class="btn-rec-add" data-quick-add="${p.id}">+ Quick Add</button>
                      </div>
                    </div>
                  `
                    )
                    .join("")}
                </div>
              </div>
            </div>
          `
            : `
            <div class="cart-items-list">
              ${store.cart
                .map((item, index) => {
                  const p = byId(item.id);
                  return `
                    <div class="cart-row" data-index="${index}">
                      <a class="cart-row-img" href="#/product/${p.id}" data-close-cart>
                        <img src="${p.images[0]}" alt="${p.name}" />
                      </a>
                      <div class="cart-row-info">
                        <h4><a href="#/product/${p.id}" data-close-cart>${p.name}</a></h4>
                        <div class="cart-row-meta">
                          <span class="size-tag">Size: ${item.size}</span>
                        </div>
                        <div class="cart-row-price">${money(p.price * item.qty)}</div>
                        <div class="cart-row-actions">
                          <div class="qty-stepper">
                            <button data-qty-delta="-1" data-cart-idx="${index}">–</button>
                            <span>${item.qty}</span>
                            <button data-qty-delta="1" data-cart-idx="${index}">+</button>
                          </div>
                          <button class="cart-remove-btn" data-remove-cart="${index}">Remove</button>
                        </div>
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>
          `
        }
      </div>

      ${
        count > 0
          ? `
        <div class="cart-drawer-footer">
          <div class="cart-subtotal-row">
            <span>Estimated Total</span>
            <span class="total-amount">${money(total)}</span>
          </div>
          <p class="tax-note">Taxes included. Free express shipping calculated at checkout.</p>
          <button class="btn-checkout" data-checkout>
            CHECK OUT &bull; ${money(total)}
          </button>
        </div>
      `
          : ""
      }
    </div>
  `;
}

// QUICK ADD MODAL
function quickAddModal() {
  const p = byId(store.ui.quickAddProduct);
  if (!p) return "";

  return `
    <div class="drawer-overlay active" data-close-quick-add></div>
    <div class="quick-add-modal">
      <button class="modal-close-btn" data-close-quick-add aria-label="Close">
        ${icons.close}
      </button>
      <div class="qa-grid">
        <div class="qa-media">
          <img src="${p.images[0]}" alt="${p.name}" />
        </div>
        <div class="qa-details">
          <h3>${p.name}</h3>
          <p class="qa-price">${money(p.price)}</p>
          <p class="qa-label">Select Size:</p>
          <div class="qa-sizes-pills">
            ${p.sizes
              .map(
                (size) =>
                  `<button class="qa-size-pill" data-select-size="${size}" data-product-id="${p.id}">
                    ${size}
                  </button>`
              )
              .join("")}
          </div>
          <p class="qa-hint">Choose your preferred size to add directly to your bag.</p>
        </div>
      </div>
    </div>
  `;
}

// STORY VIEWER COMPONENT
function storyViewer() {
  const s = storySlides[store.ui.storyIdx];
  if (!s) return "";

  return `
    <div class="story-overlay" data-close-story>
      <div class="story-container" onclick="event.stopPropagation()">
        <!-- Progress bars -->
        <div class="story-progress-bars">
          ${storySlides
            .map((slide, i) => {
              const statusClass =
                i < store.ui.storyIdx
                  ? "full"
                  : i === store.ui.storyIdx
                  ? "running"
                  : "empty";
              return `
                <div class="story-bar-track">
                  <div class="story-bar-fill ${statusClass}"></div>
                </div>
              `;
            })
            .join("")}
        </div>

        <!-- Controls -->
        <div class="story-controls">
          <span class="story-brand">ICEGRY STORIES</span>
          <div class="story-ctrl-btns">
            <button class="story-btn" data-toggle-play aria-label="Play/Pause">
              ${store.ui.storyPlaying ? icons.pause : icons.play}
            </button>
            <button class="story-btn" data-close-story aria-label="Close">
              ${icons.close}
            </button>
          </div>
        </div>

        <!-- Main Slide Media -->
        <div class="story-media-wrap">
          <img src="${s.image}" alt="${s.title}" />
          <!-- Tap navigators -->
          <div class="story-tap left" data-story-nav="-1"></div>
          <div class="story-tap right" data-story-nav="1"></div>
        </div>

        <!-- Bottom CTA -->
        <div class="story-bottom">
          <h3 class="story-title">${s.title}</h3>
          <a class="story-cta-btn" href="${s.link}" data-close-story>
            ${s.cta} ${icons.direction}
          </a>
        </div>
      </div>
    </div>
  `;
}

// Floating bottom dock — Explore / Account / Stores / Search + Stories mark + Chat
function mobileBottomNav() {
  return `
    <nav class="float-dock mobile-only" aria-label="Primary">
      <button class="dock-mark" data-open-story="0" aria-label="Stories" title="Stories">
        ${icons.mark}
      </button>

      <div class="dock-pill">
        <a class="dock-item" href="#/collection/all-products" aria-label="Explore" title="Explore">
          ${icons.explore}
        </a>
        <a class="dock-item" href="#/account" aria-label="Account" title="Account">
          ${icons.user}
        </a>
        <a class="dock-item" href="#/stores" aria-label="Walk-in stores" title="Walk-in stores">
          ${icons.pin}
        </a>
        <button class="dock-item" data-open-search aria-label="Search" title="Search">
          ${icons.search}
        </button>
      </div>

      <button class="dock-chat" data-open-chat aria-label="Open chat" title="Chat support">
        ${icons.chat}
      </button>
    </nav>
  `;
}

function chatDrawer() {
  return `
    <div class="drawer-overlay active" data-close-chat></div>
    <aside class="chat-drawer" role="dialog" aria-label="Chat support">
      <div class="chat-drawer-head">
        <div>
          <h3>ICEGRY Support</h3>
          <p>Ask about orders, sizing, or stores</p>
        </div>
        <button class="cart-close-btn" data-close-chat aria-label="Close chat">${icons.close}</button>
      </div>
      <div class="chat-drawer-body">
        <div class="chat-bubble bot">Hi — welcome to ICEGRY. How can we help?</div>
        <a class="chat-action" href="https://wa.me/919599191998" target="_blank" rel="noopener">
          ${icons.whatsapp} Chat on WhatsApp
        </a>
        <a class="chat-action" href="tel:+919599191998">
          ${icons.phone} Call support
        </a>
        <a class="chat-action" href="#/account">
          ${icons.user} Track / account
        </a>
      </div>
    </aside>
  `;
}

// HERO SECTION COMPONENT
function heroSection() {
  const s = heroSlides[store.ui.heroIdx];

  return `
    <section class="hero-section">
      <div class="hero-slides-wrapper">
        ${heroSlides
          .map((slide, i) => {
            const active = i === store.ui.heroIdx ? "active" : "";
            return `
              <div class="hero-slide ${active}">
                <img src="${slide.image}" alt="${slide.title}" />
                <div class="hero-content">
                  <h1 class="hero-title">${slide.title}</h1>
                  <p class="hero-subtitle">${slide.subtitle}</p>
                  <a class="hero-cta-link" href="${slide.link}">
                    ${slide.cta} ${icons.direction}
                  </a>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>

      <!-- Hero Navigation Arrows & Dots -->
      <div class="hero-nav-dots">
        ${heroSlides
          .map(
            (_, i) => `
          <button class="hero-dot ${i === store.ui.heroIdx ? "active" : ""}" data-hero-dot="${i}"></button>
        `
          )
          .join("")}
      </div>
      <button class="hero-arrow prev" data-hero-arrow="-1" aria-label="Previous slide">
        ${icons.arrowLeft}
      </button>
      <button class="hero-arrow next" data-hero-arrow="1" aria-label="Next slide">
        ${icons.arrowRight}
      </button>
    </section>
  `;
}

// HOMEPAGE VIEW
function homePage() {
  const latestDrops = products.slice(0, 8);
  const bags = products.filter((p) => p.cats.includes("bags")).slice(0, 6);
  const winterHoodies = products.filter((p) => p.cats.includes("hoodies")).slice(0, 8);
  const phoneCases = products.filter((p) => p.cats.includes("cases")).slice(0, 4);

  return `
    <div class="home-page">
      ${heroSection()}

      <!-- Latest Drop Carousel -->
      <section class="store-section">
        <div class="section-header">
          <h2 class="section-title">Latest drop</h2>
          <a class="section-view-all" href="#/collection/new-in">
            View All ${icons.direction}
          </a>
        </div>
        <div class="products-carousel-rail">
          ${latestDrops.map((p) => card(p)).join("")}
        </div>
      </section>

      <!-- Icegry Bags Showcase -->
      <section class="store-section bags-showcase">
        <div class="section-header">
          <h2 class="section-title">Icegry Bags</h2>
          <a class="section-view-all" href="#/collection/bags">
            Shop Bags ${icons.direction}
          </a>
        </div>
        <div class="products-grid-4">
          ${bags.map((p) => card(p)).join("")}
        </div>
      </section>

      <!-- Discover Collection Gallery Tiles -->
      <section class="store-section">
        <div class="section-header">
          <h2 class="section-title">discover collection</h2>
        </div>
        <div class="discover-gallery-grid">
          ${featuredTiles
            .map(
              (tile) => `
            <a class="discover-tile" href="#/collection/${tile.slug}">
              <img src="${tile.image}" alt="${tile.name}" loading="lazy" />
              <div class="discover-tile-overlay">
                <h3>${tile.name}</h3>
                <span class="discover-tag">${tile.tag}</span>
                <span class="discover-cta">SHOP NOW ${icons.direction}</span>
              </div>
            </a>
          `
            )
            .join("")}
        </div>
      </section>

      <!-- Winter Collection 2025 (Hoodies Showcase) -->
      <section class="store-section">
        <div class="section-header">
          <h2 class="section-title">Winter Collection 2025</h2>
          <a class="section-view-all" href="#/collection/winter">
            Explore Collection ${icons.direction}
          </a>
        </div>
        <div class="products-carousel-rail">
          ${winterHoodies.map((p) => card(p)).join("")}
        </div>
      </section>

      <!-- iPhone Case Showcase -->
      <section class="store-section cases-showcase">
        <div class="section-header">
          <h2 class="section-title">iPhone Case</h2>
          <a class="section-view-all" href="#/collection/cases">
            View All Cases ${icons.direction}
          </a>
        </div>
        <div class="products-grid-4">
          ${phoneCases.map((p) => card(p)).join("")}
        </div>
      </section>

      <!-- Walk-in Stores Showcase -->
      <section class="store-section walkin-stores-section">
        <div class="section-header">
          <h2 class="section-title">Walk-in Stores</h2>
          <a class="section-view-all" href="#/stores">
            All 8 Locations ${icons.direction}
          </a>
        </div>
        <div class="stores-slider-rail">
          ${stores
            .map(
              (st) => `
            <div class="store-showcase-card">
              <div class="store-img-wrap">
                <img src="${st.image}" alt="${st.city}" loading="lazy" />
              </div>
              <div class="store-card-info">
                <h3>${st.city}</h3>
                <p class="store-address">${st.address}</p>
                <p class="store-hours">${st.hours}</p>
                <div class="store-actions">
                  <a class="store-dir-btn" href="${st.map}" target="_blank" rel="noopener">
                    Get Directions ${icons.direction}
                  </a>
                </div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </section>

      <!-- Editorial SEO Accordion Section -->
      <section class="store-section editorial-section">
        <div class="editorial-header">
          <h2>Feel the Luxury of Premium Streetwear with ICEGRY</h2>
          <p>Best Unisex Clothing Brand in India</p>
        </div>
        <div class="accordion-container">
          ${seoSections
            .map(
              (sec, i) => `
            <details class="acc-item" ${i === store.ui.activeAccordion ? "open" : ""}>
              <summary class="acc-summary">
                <span>${sec.title}</span>
                <span class="acc-icon">${icons.plus}</span>
              </summary>
              <div class="acc-content">
                <p>${sec.content}</p>
              </div>
            </details>
          `
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}

// COLLECTION PAGE VIEW — Latest Drop / NEW IN style
function collectionPage(slug) {
  const isLatest = slug === "new-in" || slug === "latest-drop";
  const col = collections.find((c) => c.slug === slug) || {
    name: slug.replace(/-/g, " ").toUpperCase(),
    slug,
  };

  let list = byCollection(slug);
  if (isLatest) {
    list = applyChipFilter(list, store.ui.chip);
  }
  list = applyProductFilters(list);
  const fCount = filterCount();

  const chips = isLatest
    ? newInChips
        .map(
          (chip) => `
        <button
          type="button"
          class="filter-chip soft ${store.ui.chip === chip.slug ? "active" : ""}"
          data-chip="${chip.slug}"
        >${chip.label}</button>`
        )
        .join("")
    : `
        <a class="filter-chip soft ${slug === "view-all" || slug === "all-products" ? "active" : ""}" href="#/collection/new-in">View all</a>
        ${newInChips
          .slice(1)
          .map((chip) => {
            const hrefSlug =
              chip.slug === "polo"
                ? "polos"
                : chip.slug === "denims"
                  ? "jeans"
                  : chip.slug === "sweatshirt"
                    ? "sweatshirts"
                    : chip.slug === "cargo"
                      ? "cargos"
                      : chip.slug;
            return `<a class="filter-chip soft ${slug === hrefSlug || slug === chip.slug ? "active" : ""}" href="#/collection/${hrefSlug}">${chip.label}</a>`;
          })
          .join("")}
      `;

  return `
    <div class="collection-page latest-drop-page">
      <div class="latest-drop-sheet page-container">
        <div class="collection-hero-bar">
          <h1 class="collection-title latest-title">${isLatest ? "Latest Drop" : col.name}</h1>
          <p class="collection-count">${list.length} product${list.length === 1 ? "" : "s"}${fCount ? ` · ${fCount} filter${fCount === 1 ? "" : "s"}` : ""}</p>
        </div>

        <!-- Sticky category chips — stays under header while products scroll (Icegry New In) -->
        <div class="sticky-filter-bar" data-sticky-filters>
          <div class="filter-chips-rail soft-rail" role="list">
            ${chips}
          </div>
        </div>

        ${
          list.length
            ? `<div class="products-grid-4 latest-grid">${list.map((p) => card(p, { compact: true })).join("")}</div>`
            : `<div class="no-products-msg">
                <p>No items match these filters.</p>
                <button type="button" class="btn-filter-clear inline" data-filters-reset>Clear filters</button>
              </div>`
        }

        ${
          list.length > 12
            ? `<nav class="collection-pagination" aria-label="Pagination">
                <span class="page-pill current">1</span>
                <span class="page-pill">2</span>
                <span class="page-pill">3</span>
                <span class="page-pill muted">…</span>
                <button type="button" class="page-pill next" disabled>Next</button>
              </nav>`
            : ""
        }
      </div>
    </div>
  `;
}

// PRODUCT DETAIL PAGE VIEW
function productPage(id) {
  const p = byId(id);
  const saved = wished(p.id);
  const isSale = p.compare && p.compare > p.price;

  return `
    <div class="pdp-page page-container">
      <div class="pdp-layout">
        <!-- Gallery -->
        <div class="pdp-gallery">
          ${p.images
            .map(
              (img, idx) => `
            <div class="pdp-img-frame">
              <img src="${img}" alt="${p.name} angle ${idx + 1}" />
            </div>
          `
            )
            .join("")}
        </div>

        <!-- Info Column -->
        <div class="pdp-info-sidebar">
          <div class="breadcrumb">
            <a href="#/">Home</a> / <a href="#/collection/all-products">Shop</a> / <span>${p.name}</span>
          </div>

          <h1 class="pdp-title">${p.name}</h1>
          <div class="pdp-price-wrap">
            ${isSale ? `<span class="price-was">${money(p.compare)}</span>` : ""}
            <span class="pdp-price-current">${money(p.price)}</span>
            ${isSale ? `<span class="badge-tag sale">Sale</span>` : ""}
          </div>
          <p class="tax-inclusive-tag">Taxes included. Free shipping across India.</p>

          <!-- Size selector -->
          <div class="size-selection-section">
            <div class="size-label-row">
              <span class="size-label-title">Select Size</span>
              <span class="size-guide-link">Size Guide</span>
            </div>
            <div class="pdp-sizes-grid">
              ${p.sizes
                .map(
                  (size, idx) => `
                <button class="pdp-size-btn ${idx === 3 ? "selected" : ""}" data-pdp-size="${size}">
                  ${size}
                </button>
              `
                )
                .join("")}
            </div>
          </div>

          <!-- Add to Bag and Wishlist buttons -->
          <div class="pdp-actions-row">
            <button class="btn-pdp-add" data-pdp-add-to-bag="${p.id}">
              ADD TO BAG &bull; ${money(p.price)}
            </button>
            <button class="btn-pdp-wish ${saved ? "saved" : ""}" data-wish="${p.id}" title="Wishlist">
              ${saved ? icons.bookmarkFill : icons.bookmark}
            </button>
          </div>

          <!-- Fabric and product specs -->
          <div class="pdp-specs-box">
            <h4>Product Specifications</h4>
            <ul>
              ${p.details.map((d) => `<li>${d}</li>`).join("")}
            </ul>
          </div>

          <div class="pdp-description">
            <h4>Description</h4>
            <p>${p.description}</p>
          </div>
        </div>
      </div>

      <!-- Related Products -->
      <section class="related-section">
        <h2 class="section-title">You may also like</h2>
        <div class="products-grid-4">
          ${products.slice(0, 4).map((item) => card(item)).join("")}
        </div>
      </section>
    </div>
  `;
}

// STORES DIRECTORY PAGE
function storesPage() {
  return `
    <div class="stores-page page-container">
      <div class="page-header">
        <h1 class="page-heading">Our Walk-in Stores</h1>
        <p class="page-subheading">Experience ICEGRY in person across India</p>
      </div>

      <div class="stores-full-grid">
        ${stores
          .map(
            (st) => `
          <div class="store-full-card">
            <div class="store-full-img">
              <img src="${st.image}" alt="${st.city}" />
            </div>
            <div class="store-full-info">
              <h2>${st.city}</h2>
              <p class="store-full-addr">${st.address}</p>
              <div class="store-meta-row">
                <span class="store-status-pill">Open Daily</span>
                <span class="store-hours-text">${st.hours}</span>
              </div>
              <p class="store-phone">Phone: ${st.phone}</p>
              <div class="store-full-actions">
                <a class="btn-directions" href="${st.map}" target="_blank" rel="noopener">
                  Get Directions ${icons.direction}
                </a>
              </div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

// WISHLIST PAGE
function wishlistPage() {
  const savedItems = store.wish.map((id) => byId(id)).filter(Boolean);

  return `
    <div class="wishlist-page page-container">
      <div class="page-header">
        <h1 class="page-heading">My Wishlist</h1>
        <p class="page-subheading">${savedItems.length} saved item${savedItems.length === 1 ? "" : "s"}</p>
      </div>

      ${
        savedItems.length
          ? `<div class="products-grid-4">${savedItems.map((p) => card(p)).join("")}</div>`
          : `
          <div class="empty-state-box">
            <h3>No items in your wishlist yet</h3>
            <p>Save items you love by tapping the ribbon bookmark icon on any product.</p>
            <a class="btn-shop-now" href="#/collection/new-in">Explore Drops ${icons.direction}</a>
          </div>
        `
      }
    </div>
  `;
}

// ACCOUNT PAGE
function accountPage() {
  return `
    <div class="account-page page-container">
      <div class="page-header">
        <h1 class="page-heading">Members Login</h1>
        <p class="page-subheading">Sign in to your ICEGRY member profile</p>
      </div>

      <div class="auth-box">
        <form id="loginForm" onsubmit="event.preventDefault(); alert('Signed in successfully'); location.hash = '#/';">
          <div class="form-group">
            <label for="acc-email">Email Address</label>
            <input type="email" id="acc-email" required placeholder="name@domain.com" />
          </div>
          <div class="form-group">
            <label for="acc-password">Password</label>
            <input type="password" id="acc-password" required placeholder="••••••••" />
          </div>
          <button class="btn-submit" type="submit">SIGN IN</button>
          <div class="auth-links">
            <a href="#/">Forgot password?</a>
            <a href="#/">Create account</a>
          </div>
        </form>
      </div>
    </div>
  `;
}

// FOOTER COMPONENT
function footer() {
  return `
    <footer class="main-footer">
      <div class="footer-grid">
        <!-- Col 1: Connect with us -->
        <div class="footer-col">
          <h4 class="footer-heading">Connect with us</h4>
          <ul class="footer-links-list">
            <li><a href="tel:+918448441388">${icons.phone} Call: +91 84484 41388</a></li>
            <li><a href="https://wa.me/918448441388" target="_blank">${icons.whatsapp} WhatsApp Support</a></li>
            <li><a href="https://www.instagram.com/icegry" target="_blank">${icons.instagram} Instagram</a></li>
            <li><a href="https://youtube.com/@Icegry" target="_blank">${icons.youtube} YouTube</a></li>
            <li><a href="https://www.linkedin.com/company/icegry/" target="_blank">${icons.linkedin} LinkedIn</a></li>
          </ul>
        </div>

        <!-- Col 2: Order Support -->
        <div class="footer-col">
          <h4 class="footer-heading">Order Support</h4>
          <ul class="footer-links-list">
            <li><a href="#/faq">Make a return / Exchange</a></li>
            <li><a href="#/faq">Refund & Exchange Policy</a></li>
            <li><a href="#/faq">Track your order</a></li>
            <li><a href="#/faq">Shipping Policy</a></li>
            <li><a href="#/faq">FAQ's</a></li>
          </ul>
        </div>

        <!-- Col 3: We are ICEGRY -->
        <div class="footer-col">
          <h4 class="footer-heading">We are ICEGRY</h4>
          <ul class="footer-links-list">
            <li><a href="#/stores">Delhi (Vasant Kunj & GK)</a></li>
            <li><a href="#/stores">Gurugram (DLF Summit & Ambience)</a></li>
            <li><a href="#/stores">Mumbai (Khar West)</a></li>
            <li><a href="#/stores">Hyderabad (Banjara Hills)</a></li>
            <li><a href="#/stores">Ahmedabad & Noida</a></li>
            <li><a href="#/">Our Story & Collaborations</a></li>
            <li><a href="#/">Media & Press</a></li>
          </ul>
        </div>

        <!-- Col 4: Newsletter -->
        <div class="footer-col newsletter-col">
          <h4 class="footer-heading">Sign up for drops</h4>
          <p class="newsletter-sub">Be the first to know about private drops, limited editions, and store activations.</p>
          <form class="newsletter-form" onsubmit="event.preventDefault(); alert('Subscribed to drop alerts!'); this.reset();">
            <input type="email" placeholder="Enter your email" required />
            <button type="submit">JOIN</button>
          </form>
          <div class="currency-picker">
            <span>Currency:</span>
            <select>
              <option>INR (₹)</option>
              <option>USD ($)</option>
              <option>EUR (€)</option>
              <option>GBP (£)</option>
              <option>AED (د.إ)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Footer Bottom Bar -->
      <div class="footer-bottom-bar">
        <div class="footer-logo-row">
          ${icons.logo}
        </div>
        <p class="copyright-text">
          &copy; 2026 ICEGRY. All rights reserved. Premium Streetwear in India.
        </p>
      </div>
    </footer>
  `;
}

// MAIN RENDER FUNCTION
function render() {
  const p = path();
  const isHome = p === "/" || p === "";
  const isCollection = p.startsWith("/collection/");
  let content = "";

  if (isHome) {
    content = homePage();
  } else if (p.startsWith("/collection/")) {
    const slug = p.replace("/collection/", "");
    content = collectionPage(slug);
  } else if (p.startsWith("/product/")) {
    const id = p.replace("/product/", "");
    content = productPage(id);
  } else if (p === "/stores") {
    content = storesPage();
  } else if (p === "/wishlist") {
    content = wishlistPage();
  } else if (p === "/account") {
    content = accountPage();
  } else {
    content = homePage();
  }

  const rootEl = getRoot();
  const appEl = document.getElementById("app");
  const mainHeader = document.querySelector(".main-header");
  const floatNav = document.querySelector(".float-top-nav");

  if (!appEl || !mainHeader || !floatNav) {
    rootEl.innerHTML = `
      <div id="app" class="${isHome ? "is-home" : "is-page"}">
        ${header()}
        <main id="main-content">${content}</main>
        <div id="footer-container">${footer()}</div>
      </div>
    `;
  } else {
    // Smoothly update class on existing #app container
    appEl.className = isHome ? "is-home" : "is-page";

    // Smoothly update header classes on existing elements to trigger CSS transitions
    mainHeader.className = `main-header desktop-only ${isHome ? "navbar-transparent" : "navbar-solid-white"}`;
    floatNav.className = `float-top-nav ${isHome ? "navbar-transparent on-hero" : "navbar-solid-white"} ${isCollection ? "on-collection" : ""}`;

    // Update dynamic header contents (counts, filter button, active state)
    const cCount = cartCount();
    const wCount = store.wish.length;
    const fCount = filterCount();

    const right = mainHeader.querySelector(".header-right");
    if (right) {
      right.innerHTML = `
        ${
          isCollection
            ? `<button class="advance-filters-btn desktop-filters ${store.ui.filters || fCount ? "active" : ""} ${store.ui.torchBlow ? "blowing" : ""}" data-open-filters aria-label="Advance Filters" aria-pressed="${store.ui.filters || fCount ? "true" : "false"}">
                <span class="advance-filters-icon torch-icon">${icons.flashlight}</span>
                <span class="advance-filters-label">Advance Filters${fCount ? ` (${fCount})` : ""}</span>
              </button>`
            : ""
        }
        <button class="header-icon-btn stories-launcher" data-open-story="0" aria-label="Stories" title="View Stories">
          ${icons.stories}
        </button>
        <a class="header-icon-btn" href="#/stores" aria-label="Walk-in stores" title="Walk-in stores">
          ${icons.pin}
        </a>
        <button class="header-icon-btn" data-open-search aria-label="Search" title="Search catalog">
          ${icons.search}
        </button>
        <a class="header-icon-btn" href="#/account" aria-label="Account" title="Account">
          ${icons.user}
        </a>
        <a class="header-icon-btn wish-btn" href="#/wishlist" aria-label="Wishlist" title="Wishlist">
          ${icons.bookmark}
          ${wCount ? `<span class="header-badge">${wCount}</span>` : ""}
        </a>
        <button class="header-icon-btn cart-btn" data-open-cart aria-label="Cart" title="Shopping Bag">
          <span class="cart-label">Cart (${cCount})</span>
        </button>
      `;
    }

    const megaBtn = mainHeader.querySelector("[data-toggle-mega]");
    if (megaBtn) {
      megaBtn.className = `nav-link ${store.ui.mega ? "active" : ""}`;
    }

    floatNav.innerHTML = `
      <div class="brand-pill ${store.ui.menu ? "open" : ""}">
        <button class="brand-pill-plus" data-toggle-menu aria-label="${store.ui.menu ? "Close menu" : "Open menu"}">
          ${store.ui.menu ? icons.close : icons.plus}
        </button>
        <a class="brand-pill-name" href="#/" aria-label="Icegry Home">
          ${icons.logo}
        </a>
      </div>

      ${
        isCollection
          ? `<button class="advance-filters-btn ${store.ui.filters || fCount ? "active" : ""} ${store.ui.torchBlow ? "blowing" : ""}" data-open-filters aria-label="Advance Filters" aria-pressed="${store.ui.filters || fCount ? "true" : "false"}">
              <span class="advance-filters-icon torch-icon">${icons.flashlight}</span>
              <span class="advance-filters-label">Advance Filters${fCount ? ` (${fCount})` : ""}</span>
            </button>`
          : ""
      }

      <div class="float-top-actions">
        <a class="float-icon-btn" href="#/wishlist" aria-label="Wishlist" title="Wishlist">
          ${icons.bookmark}
          ${wCount ? `<span class="header-badge">${wCount}</span>` : ""}
        </a>
        <button class="float-icon-btn" data-open-cart aria-label="Cart" title="Bag">
          ${icons.cabinet}
          ${cCount ? `<span class="header-badge">${cCount}</span>` : ""}
        </button>
      </div>
    `;

    const drawers = document.getElementById("drawers-container");
    if (drawers) {
      drawers.innerHTML = `
        ${store.ui.mega || store.ui.menu ? megaDrawer() : ""}
        ${store.ui.search ? searchDrawer() : ""}
        ${store.ui.filters ? filtersDrawer() : ""}
        ${cartDrawer()}
        ${store.ui.chat ? chatDrawer() : ""}
        ${store.ui.stories ? storyViewer() : ""}
        ${store.ui.quickAddProduct ? quickAddModal() : ""}
        ${mobileBottomNav()}
        ${store.ui.toast ? `<div class="toast-popup">${store.ui.toast}</div>` : ""}
      `;
    }

    const mainEl = document.getElementById("main-content");
    if (mainEl) mainEl.innerHTML = content;

    const footerEl = document.getElementById("footer-container");
    if (footerEl) footerEl.innerHTML = footer();
  }

  bindEvents();
}

// EVENT BINDINGS
function bindEvents() {
  // Notification Toggle
  const notifPill = getRoot().querySelector("[data-toggle-notif]");
  if (notifPill) {
    notifPill.onclick = (e) => {
      e.stopPropagation();
      store.ui.notif = !store.ui.notif;
      render();
    };
  }

  // Mega Menu Toggle
  const megaBtn = getRoot().querySelector("[data-toggle-mega]");
  if (megaBtn) {
    megaBtn.onclick = (e) => {
      e.stopPropagation();
      store.ui.mega = !store.ui.mega;
      render();
    };
  }

  // Close Mega
  const closeMega = getRoot().querySelector("[data-close-mega]");
  if (closeMega) {
    closeMega.onclick = () => {
      store.ui.mega = false;
      store.ui.menu = false;
      render();
    };
  }

  // Hamburger Menu Toggle
  const menuBtn = getRoot().querySelector("[data-toggle-menu]");
  if (menuBtn) {
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      store.ui.menu = !store.ui.menu;
      store.ui.mega = store.ui.menu;
      render();
    };
  }

  // Search open / close
  getRoot().querySelectorAll("[data-open-search]").forEach((el) => {
    el.onclick = () => {
      store.ui.search = true;
      render();
      setTimeout(() => {
        const inp = document.getElementById("searchInput");
        if (inp) inp.focus();
      }, 50);
    };
  });

  getRoot().querySelectorAll("[data-close-search]").forEach((el) => {
    el.onclick = () => {
      store.ui.search = false;
      store.ui.query = "";
      render();
    };
  });

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.oninput = (e) => {
      store.ui.query = e.target.value;
      render();
    };
  }

  const clearSearch = getRoot().querySelector("[data-clear-search]");
  if (clearSearch) {
    clearSearch.onclick = () => {
      store.ui.query = "";
      render();
    };
  }

  getRoot().querySelectorAll("[data-trend]").forEach((btn) => {
    btn.onclick = () => {
      store.ui.query = btn.dataset.trend;
      render();
    };
  });

  // Cart open / close
  getRoot().querySelectorAll("[data-open-cart]").forEach((el) => {
    el.onclick = () => {
      store.ui.cart = true;
      render();
    };
  });

  getRoot().querySelectorAll("[data-close-cart]").forEach((el) => {
    el.onclick = () => {
      store.ui.cart = false;
      render();
    };
  });

  // Chat open / close
  getRoot().querySelectorAll("[data-open-chat]").forEach((el) => {
    el.onclick = () => {
      store.ui.chat = true;
      render();
    };
  });

  getRoot().querySelectorAll("[data-close-chat]").forEach((el) => {
    el.onclick = () => {
      store.ui.chat = false;
      render();
    };
  });

  // Cart Quantities
  getRoot().querySelectorAll("[data-qty-delta]").forEach((btn) => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.cartIdx, 10);
      const delta = parseInt(btn.dataset.qtyDelta, 10);
      setQty(idx, delta);
    };
  });

  getRoot().querySelectorAll("[data-remove-cart]").forEach((btn) => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.removeCart, 10);
      removeFromCart(idx);
    };
  });

  // Wishlist toggle
  getRoot().querySelectorAll("[data-wish]").forEach((btn) => {
    btn.onclick = (e) => {
      const id = btn.dataset.wish;
      toggleWish(id, e);
    };
  });

  // Quick Add
  getRoot().querySelectorAll("[data-quick-add]").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      store.ui.quickAddProduct = btn.dataset.quickAdd;
      render();
    };
  });

  getRoot().querySelectorAll("[data-close-quick-add]").forEach((btn) => {
    btn.onclick = () => {
      store.ui.quickAddProduct = null;
      render();
    };
  });

  getRoot().querySelectorAll("[data-select-size]").forEach((btn) => {
    btn.onclick = (e) => {
      const id = btn.dataset.productId;
      const size = btn.dataset.selectSize;
      addToBag(id, size, e);
    };
  });

  // PDP size select and add to bag
  let selectedPdpSize = "M";
  getRoot().querySelectorAll("[data-pdp-size]").forEach((btn) => {
    btn.onclick = () => {
      getRoot().querySelectorAll("[data-pdp-size]").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedPdpSize = btn.dataset.pdpSize;
    };
  });

  const pdpAddBtn = getRoot().querySelector("[data-pdp-add-to-bag]");
  if (pdpAddBtn) {
    pdpAddBtn.onclick = (e) => {
      const id = pdpAddBtn.dataset.pdpAddToBag;
      addToBag(id, selectedPdpSize, e);
    };
  }

  // Stories
  getRoot().querySelectorAll("[data-open-story]").forEach((btn) => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.openStory || "0", 10);
      openStory(idx);
    };
  });

  getRoot().querySelectorAll("[data-close-story]").forEach((btn) => {
    btn.onclick = () => {
      closeStory();
    };
  });

  const playBtn = getRoot().querySelector("[data-toggle-play]");
  if (playBtn) {
    playBtn.onclick = () => {
      toggleStoryPlay();
    };
  }

  getRoot().querySelectorAll("[data-story-nav]").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const dir = parseInt(btn.dataset.storyNav, 10);
      const nextIdx = store.ui.storyIdx + dir;
      if (nextIdx >= 0 && nextIdx < storySlides.length) {
        store.ui.storyIdx = nextIdx;
        startStoryTimer();
        render();
      } else if (nextIdx >= storySlides.length) {
        closeStory();
      }
    };
  });

  // Hero controls
  getRoot().querySelectorAll("[data-hero-arrow]").forEach((btn) => {
    btn.onclick = () => {
      const dir = parseInt(btn.dataset.heroArrow, 10);
      store.ui.heroIdx = (store.ui.heroIdx + dir + heroSlides.length) % heroSlides.length;
      startHeroAutoPlay();
      render();
    };
  });

  getRoot().querySelectorAll("[data-hero-dot]").forEach((btn) => {
    btn.onclick = () => {
      store.ui.heroIdx = parseInt(btn.dataset.heroDot, 10);
      startHeroAutoPlay();
      render();
    };
  });

  // Checkout trigger
  const checkoutBtn = getRoot().querySelector("[data-checkout]");
  if (checkoutBtn) {
    checkoutBtn.onclick = () => {
      alert(`Proceeding to checkout with ${cartCount()} items! Total: ${money(cartTotal())}`);
    };
  }

  // Advance Filters open / close — torch "blows" (lights up) then drawer opens
  getRoot().querySelectorAll("[data-open-filters]").forEach((el) => {
    el.onclick = (e) => {
      e.stopPropagation();
      if (store.ui.filters || store.ui.torchBlow) return;
      store.ui.torchBlow = true;
      render();
      window.setTimeout(() => {
        store.ui.draftFilters = {
          sizes: [...store.ui.appliedFilters.sizes],
          availability: [...store.ui.appliedFilters.availability],
          types: [...store.ui.appliedFilters.types],
          colors: [...store.ui.appliedFilters.colors],
        };
        store.ui.filters = true;
        store.ui.torchBlow = false;
        render();
      }, 420);
    };
  });

  getRoot().querySelectorAll("[data-close-filters]").forEach((el) => {
    el.onclick = () => {
      store.ui.filters = false;
      render();
    };
  });

  getRoot().querySelectorAll("[data-filter-toggle]").forEach((input) => {
    input.onchange = () => {
      const group = input.dataset.filterToggle;
      const value = input.dataset.filterValue;
      const arr = store.ui.draftFilters[group];
      const idx = arr.indexOf(value);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(value);
      render();
    };
  });

  const sortSelect = getRoot().querySelector("[data-filter-sort]");
  if (sortSelect) {
    sortSelect.onchange = () => {
      store.ui.sort = sortSelect.value;
    };
  }

  getRoot().querySelectorAll("[data-filters-clear]").forEach((btn) => {
    btn.onclick = () => {
      store.ui.draftFilters = emptyFilters();
      store.ui.sort = "manual";
      render();
    };
  });

  getRoot().querySelectorAll("[data-filters-apply]").forEach((btn) => {
    btn.onclick = () => {
      store.ui.appliedFilters = {
        sizes: [...store.ui.draftFilters.sizes],
        availability: [...store.ui.draftFilters.availability],
        types: [...store.ui.draftFilters.types],
        colors: [...store.ui.draftFilters.colors],
      };
      store.ui.filters = false;
      showToast("Filters applied");
    };
  });

  getRoot().querySelectorAll("[data-filters-reset]").forEach((btn) => {
    btn.onclick = () => {
      store.ui.appliedFilters = emptyFilters();
      store.ui.draftFilters = emptyFilters();
      store.ui.chip = "view-all";
      store.ui.sort = "manual";
      render();
    };
  });

  // Latest Drop category chips
  getRoot().querySelectorAll("[data-chip]").forEach((btn) => {
    btn.onclick = () => {
      store.ui.chip = btn.dataset.chip;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  });

  // Product card image dots
  getRoot().querySelectorAll("[data-card-slide]").forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.cardSlide;
      const slide = parseInt(btn.dataset.slide, 10) || 0;
      store.ui.cardSlides[id] = slide;
      render();
    };
  });

  // Sticky filter bar shadow when pinned (Latest Drop / New In)
  if (window.__stickyFilterScroll) {
    window.removeEventListener("scroll", window.__stickyFilterScroll);
    window.__stickyFilterScroll = null;
  }
  const stickyBar = getRoot().querySelector("[data-sticky-filters]");
  if (stickyBar) {
    const syncStuck = () => {
      const top = parseFloat(getComputedStyle(stickyBar).top) || 0;
      stickyBar.classList.toggle("is-stuck", stickyBar.getBoundingClientRect().top <= top + 1);
    };
    window.__stickyFilterScroll = syncStuck;
    syncStuck();
    window.addEventListener("scroll", syncStuck, { passive: true });
  }

  // Liquid glass header scroll synchronization
  if (window.__glassHeaderScroll) {
    window.removeEventListener("scroll", window.__glassHeaderScroll);
    window.__glassHeaderScroll = null;
  }
  const syncGlassHeader = () => {
    const isScrolled = window.scrollY > 15;
    const desktopHeader = getRoot().querySelector(".main-header");
    const mobileHeader = getRoot().querySelector(".float-top-nav");
    if (desktopHeader) desktopHeader.classList.toggle("is-scrolled", isScrolled);
    if (mobileHeader) mobileHeader.classList.toggle("is-scrolled", isScrolled);
  };
  window.__glassHeaderScroll = syncGlassHeader;
  syncGlassHeader();
  window.addEventListener("scroll", syncGlassHeader, { passive: true });
}

// Initial bootstrap
window.addEventListener("hashchange", () => {
  store.ui.mega = false;
  store.ui.menu = false;
  store.ui.filters = false;
  const p = path();
  if (p.includes("/collection/new-in") || p.includes("/collection/latest-drop")) {
    store.ui.chip = "view-all";
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
  render();
});

startHeroAutoPlay();
render();
