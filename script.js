const username = "devonchan";
const DEFAULT_AVATAR = "avatar-default.webp";

let page = 1;
let photos = [];
let currentIndex = 0;
let isLoading = false;
let hasMore = true;
let detailCache = new Map();
let lastFocusedElement = null;

const gallery = document.getElementById("gallery");
let columnCount = getColumnCount();
let columnEls = [];
let placeIndex = 0;

function getColumnCount(){
  const w = window.innerWidth;
  if(w <= 640) return 1;
  if(w <= 900) return 2;
  if(w <= 1180) return 3;
  return 4;
}

function buildColumns(){
  gallery.innerHTML = "";
  columnEls = [];
  for(let i = 0; i < columnCount; i++){
    const col = document.createElement("div");
    col.className = "gallery-column";
    gallery.appendChild(col);
    columnEls.push(col);
  }
  placeIndex = 0;
}

function placeInColumn(el){
  columnEls[placeIndex % columnEls.length].appendChild(el);
  placeIndex += 1;
}

function redistributeColumns(){
  const newCount = getColumnCount();
  if(newCount === columnCount) return;
  columnCount = newCount;
  const items = Array.from(gallery.querySelectorAll(".photo-card, .skeleton-card"));
  buildColumns();
  items.forEach(placeInColumn);
}

buildColumns();

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(redistributeColumns, 150);
});

const statusText = document.getElementById("statusText");
const retryBtn = document.getElementById("retryBtn");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const detailTitle = document.getElementById("detailTitle");
const photoMeta = document.getElementById("photoMeta");
const closeBtn = document.getElementById("closeBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const downloadBtn = document.getElementById("downloadBtn");
const detailPanel = document.getElementById("detailPanel");
const sheetDragZone = document.getElementById("sheetDragZone");
const sentinel = document.getElementById("sentinel");
const profileLink = document.getElementById("profileLink");
const footerLink = document.getElementById("footerLink");
const footerName = document.getElementById("footerName");
const avatarImg = document.getElementById("avatar");

function setStatus(text){
  statusText.textContent = text;
}

function safeText(value, fallback = "—"){
  if(value === null || value === undefined || value === "") return fallback;
  return value;
}

function renderMetaLine(label, value){
  return `
    <div class="meta-line">
      <span class="k">${label}</span>
      <span class="v">${safeText(value)}</span>
    </div>
  `;
}

async function apiFetch(url){
  const res = await fetch(url, {
    headers: { "Accept": "application/json" }
  });

  if(!res.ok){
    const msg = await res.text();
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }

  return res.json();
}

avatarImg.addEventListener("error", () => {
  if(avatarImg.src.indexOf(DEFAULT_AVATAR) === -1){
    avatarImg.src = DEFAULT_AVATAR;
  }
});

async function loadProfile(){
  try{
    const data = await apiFetch(`/api/profile?username=${encodeURIComponent(username)}`);
    const href = data.links?.html || `https://unsplash.com/@${username}`;

    avatarImg.src = data.profile_image?.large || data.profile_image?.medium || DEFAULT_AVATAR;
    document.getElementById("name").innerText = data.name || username;
    document.getElementById("bio").innerText = data.bio || "Unsplash Photographer";
    profileLink.href = href;
    footerLink.href = href;
    footerName.textContent = data.name || username;
  }catch(err){
    console.error(err);
    const href = `https://unsplash.com/@${username}`;
    avatarImg.src = DEFAULT_AVATAR;
    document.getElementById("name").innerText = username;
    document.getElementById("bio").innerText = "Portfolio is warming up — check back shortly.";
    profileLink.href = href;
    footerLink.href = href;
    footerName.textContent = username;
  }
}

function createCard(photo, index){
  const card = document.createElement("article");
  card.className = "photo-card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", photo.alt_description || photo.description || `Photo ${index + 1}`);

  const img = document.createElement("img");
  img.src = photo.urls?.small || photo.urls?.regular;
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  if(photo.width && photo.height){
    img.style.aspectRatio = `${photo.width} / ${photo.height}`;
  }
  img.addEventListener("load", () => img.classList.add("loaded"), { once: true });

  const overlay = document.createElement("div");
  overlay.className = "photo-overlay";

  const title = document.createElement("div");
  title.className = "photo-title";
  title.textContent = photo.alt_description || photo.description || "Untitled";

  const sub = document.createElement("div");
  sub.className = "photo-sub";
  sub.textContent = `${photo.width || ""} × ${photo.height || ""}`;

  overlay.appendChild(title);
  overlay.appendChild(sub);

  card.appendChild(img);
  card.appendChild(overlay);
  card.addEventListener("click", () => openLightbox(index, card));
  card.addEventListener("keydown", (e) => {
    if(e.key === "Enter" || e.key === " "){
      e.preventDefault();
      openLightbox(index, card);
    }
  });

  return card;
}

function createSkeletonCards(count){
  const ratios = ["3/4", "1/1", "4/5", "3/2", "4/3"];
  for(let i = 0; i < count; i++){
    const el = document.createElement("div");
    el.className = "skeleton-card";
    el.style.setProperty("--ar", ratios[i % ratios.length]);
    placeInColumn(el);
  }
}

function clearSkeletons(){
  gallery.querySelectorAll(".skeleton-card").forEach((el) => el.remove());
}

function showRetry(show){
  retryBtn.classList.toggle("hidden", !show);
}

async function loadPhotos(){
  if(isLoading || !hasMore) return;

  isLoading = true;
  showRetry(false);
  setStatus(`Loading page ${page}...`);

  const isFirstLoad = photos.length === 0;
  if(isFirstLoad){
    createSkeletonCards(8);
  }

  try{
    const data = await apiFetch(`/api/photos?username=${encodeURIComponent(username)}&page=${page}&per_page=24`);

    if(!Array.isArray(data) || data.length === 0){
      hasMore = false;
      setStatus(photos.length ? `${photos.length} photos loaded` : "No photos to show yet");
      return;
    }

    const startIndex = photos.length;
    photos = photos.concat(data);

    data.forEach((photo, idx) => {
      const card = createCard(photo, startIndex + idx);
      placeInColumn(card);
    });

    page += 1;
    setStatus(`${photos.length} photos loaded`);
  }catch(err){
    console.error(err);
    setStatus("Couldn't load photos right now.");
    // Stop auto-retrying from the IntersectionObserver; the user drives retries from here on.
    hasMore = false;
    showRetry(true);
  }finally{
    clearSkeletons();
    isLoading = false;
  }
}

retryBtn.addEventListener("click", () => {
  hasMore = true;
  loadPhotos();
});

async function getPhotoDetail(photo){
  if(detailCache.has(photo.id)) return detailCache.get(photo.id);

  const detail = await apiFetch(`/api/photo/${encodeURIComponent(photo.id)}`);
  detailCache.set(photo.id, detail);
  return detail;
}

let lightboxLoadToken = 0;

function loadLightboxImage(photo){
  const token = ++lightboxLoadToken;
  const fullSrc = photo.urls?.regular || photo.urls?.full || photo.urls?.small;
  const previewSrc = photo.urls?.small || fullSrc;
  lightboxImg.alt = photo.alt_description || photo.description || "preview";

  if(previewSrc && previewSrc !== fullSrc){
    lightboxImg.classList.add("is-loading");
    lightboxImg.src = previewSrc;

    const fullImage = new Image();
    fullImage.onload = () => {
      if(token !== lightboxLoadToken) return;
      lightboxImg.src = fullSrc;
      lightboxImg.classList.remove("is-loading");
    };
    fullImage.src = fullSrc;
  }else{
    lightboxImg.classList.remove("is-loading");
    lightboxImg.src = fullSrc;
  }
}

async function openLightbox(index, triggerEl){
  currentIndex = index;
  const photo = photos[index];
  if(!photo) return;

  const isFirstOpen = lightbox.classList.contains("hidden");
  if(isFirstOpen){
    lastFocusedElement = triggerEl || document.activeElement;
  }
  lightbox.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  if(isFirstOpen){
    closeBtn.focus();
  }
  resetSheet();

  loadLightboxImage(photo);
  detailTitle.textContent = photo.alt_description || photo.description || "Untitled";
  photoMeta.innerHTML = renderMetaLine("Status", "Loading details...");
  downloadBtn.href = photo.links?.html || "#";

  try{
    const detail = await getPhotoDetail(photo);
    const exif = detail.exif || {};
    const location = detail.location || {};
    const aperture = exif.aperture ? `f/${exif.aperture}` : "";
    const focal = exif.focal_length ? `${exif.focal_length} mm` : "";
    const camera = [exif.make, exif.model].filter(Boolean).join(" ");
    const settings = [aperture, exif.iso ? `ISO ${exif.iso}` : "", focal].filter(Boolean).join(" · ");
    const place = location.name || location.city || location.country || "";
    const dateText = detail.created_at ? new Date(detail.created_at).toLocaleDateString() : "";

    detailTitle.textContent = detail.alt_description || detail.description || "Untitled";
    photoMeta.innerHTML = [
      camera ? renderMetaLine("Camera", camera) : "",
      settings ? renderMetaLine("Settings", settings) : "",
      place ? renderMetaLine("Location", place) : "",
      dateText ? renderMetaLine("Date", dateText) : "",
    ].filter(Boolean).join("");

    if(!photoMeta.innerHTML){
      photoMeta.innerHTML = renderMetaLine("Details", "No extra metadata available");
    }

    downloadBtn.href = detail.links?.html || photo.links?.html || "#";
  }catch(err){
    console.error(err);
    photoMeta.innerHTML = renderMetaLine("Details", "Failed to load metadata");
  }

  if(!sheetExpanded) collapseSheet(false);
  updateNavState();
}

function closeLightbox(){
  lightbox.classList.add("hidden");
  document.body.style.overflow = "auto";
  if(lastFocusedElement && typeof lastFocusedElement.focus === "function"){
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
}

const SHEET_BREAKPOINT = 900;
let sheetExpanded = false;
let sheetDragging = false;
let sheetPointerId = null;
let sheetDragStartY = 0;
let sheetDragStartTranslate = 0;
let sheetCurrentTranslate = 0;
let sheetCollapsedTranslate = 0;
let sheetLastMoveY = 0;
let sheetLastMoveTime = 0;
let sheetVelocity = 0;

function isSheetMode(){
  return window.matchMedia(`(max-width: ${SHEET_BREAKPOINT}px)`).matches;
}

function setSheetTransform(px, animate){
  detailPanel.style.transition = animate ? "" : "none";
  detailPanel.style.transform = `translateY(${px}px)`;
}

function measureCollapsedTranslate(){
  const fullHeight = detailPanel.offsetHeight;
  const headerHeight = sheetDragZone.offsetHeight;
  return Math.max(fullHeight - headerHeight, 0);
}

function collapseSheet(animate = true){
  if(!isSheetMode()) return;
  sheetCollapsedTranslate = measureCollapsedTranslate();
  sheetCurrentTranslate = sheetCollapsedTranslate;
  sheetExpanded = false;
  setSheetTransform(sheetCollapsedTranslate, animate);
}

function expandSheet(animate = true){
  if(!isSheetMode()) return;
  sheetCurrentTranslate = 0;
  sheetExpanded = true;
  setSheetTransform(0, animate);
}

function resetSheet(){
  if(!isSheetMode()){
    detailPanel.style.transition = "";
    detailPanel.style.transform = "";
    return;
  }
  collapseSheet(false);
}

function onSheetPointerDown(e){
  if(!isSheetMode()) return;
  if(e.target.closest("a, button")) return;
  sheetDragging = true;
  sheetPointerId = e.pointerId;
  sheetDragStartY = e.clientY;
  sheetDragStartTranslate = sheetCurrentTranslate;
  sheetLastMoveY = e.clientY;
  sheetLastMoveTime = performance.now();
  sheetVelocity = 0;
  detailPanel.classList.add("dragging");
  sheetDragZone.setPointerCapture(e.pointerId);
}

function onSheetPointerMove(e){
  if(!sheetDragging || e.pointerId !== sheetPointerId) return;
  const now = performance.now();
  const dt = now - sheetLastMoveTime;
  if(dt > 0){
    sheetVelocity = (e.clientY - sheetLastMoveY) / dt;
  }
  sheetLastMoveY = e.clientY;
  sheetLastMoveTime = now;

  let next = sheetDragStartTranslate + (e.clientY - sheetDragStartY);
  if(next < 0){
    next *= 0.3;
  }else if(next > sheetCollapsedTranslate){
    next = sheetCollapsedTranslate + (next - sheetCollapsedTranslate) * 0.3;
  }
  sheetCurrentTranslate = next;
  setSheetTransform(next, false);
}

function onSheetPointerUp(e){
  if(!sheetDragging || e.pointerId !== sheetPointerId) return;
  sheetDragging = false;
  detailPanel.classList.remove("dragging");

  const totalDelta = e.clientY - sheetDragStartY;
  const isTap = Math.abs(totalDelta) < 6;
  const FLICK_VELOCITY = 0.5;

  const shouldExpand = isTap
    ? !sheetExpanded
    : sheetVelocity < -FLICK_VELOCITY ||
      (sheetVelocity <= FLICK_VELOCITY && sheetCurrentTranslate < sheetCollapsedTranslate / 2);

  if(shouldExpand) expandSheet();
  else collapseSheet();
}

sheetDragZone.addEventListener("pointerdown", onSheetPointerDown);
sheetDragZone.addEventListener("pointermove", onSheetPointerMove);
sheetDragZone.addEventListener("pointerup", onSheetPointerUp);
sheetDragZone.addEventListener("pointercancel", onSheetPointerUp);

let sheetResizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(sheetResizeTimer);
  sheetResizeTimer = setTimeout(resetSheet, 150);
});

function getFocusableElements(){
  return Array.from(
    lightbox.querySelectorAll('button, a[href]')
  ).filter((el) => el.offsetParent !== null);
}

function trapFocus(e){
  if(e.key !== "Tab") return;

  const focusable = getFocusableElements();
  if(focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if(e.shiftKey && document.activeElement === first){
    e.preventDefault();
    last.focus();
  }else if(!e.shiftKey && document.activeElement === last){
    e.preventDefault();
    first.focus();
  }
}

function updateNavState(){
  prevBtn.style.visibility = currentIndex > 0 ? "visible" : "hidden";
  nextBtn.style.visibility = currentIndex < photos.length - 1 ? "visible" : "hidden";
}

function nextPhoto(){
  if(currentIndex < photos.length - 1){
    openLightbox(currentIndex + 1);
  }
}

function prevPhoto(){
  if(currentIndex > 0){
    openLightbox(currentIndex - 1);
  }
}

closeBtn.addEventListener("click", closeLightbox);
nextBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  nextPhoto();
});
prevBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  prevPhoto();
});

lightbox.addEventListener("click", (e) => {
  if(e.target === lightbox){
    closeLightbox();
  }
});

document.addEventListener("keydown", (e) => {
  if(lightbox.classList.contains("hidden")) return;

  if(e.key === "Escape") closeLightbox();
  if(e.key === "ArrowRight") nextPhoto();
  if(e.key === "ArrowLeft") prevPhoto();
  trapFocus(e);
});

const SWIPE_THRESHOLD = 50;
let touchStartX = 0;
let touchStartY = 0;

const lightboxMain = document.querySelector(".lightbox-main");

lightboxMain.addEventListener("touchstart", (e) => {
  const touch = e.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

lightboxMain.addEventListener("touchend", (e) => {
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  if(Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;

  if(dx < 0) nextPhoto();
  else prevPhoto();
}, { passive: true });

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if(entry.isIntersecting){
      loadPhotos();
    }
  });
}, {
  rootMargin: "1000px 0px 1000px 0px"
});

observer.observe(sentinel);

loadProfile();
loadPhotos();
