const username = "devonchan";

let page = 1;
let photos = [];
let currentIndex = 0;
let isLoading = false;
let hasMore = true;
let detailCache = new Map();

const gallery = document.getElementById("gallery");
const statusText = document.getElementById("statusText");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const detailTitle = document.getElementById("detailTitle");
const photoMeta = document.getElementById("photoMeta");
const closeBtn = document.getElementById("closeBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const downloadBtn = document.getElementById("downloadBtn");
const sentinel = document.getElementById("sentinel");
const profileLink = document.getElementById("profileLink");
const footerLink = document.getElementById("footerLink");
const footerName = document.getElementById("footerName");

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

async function loadProfile(){
  try{
    const data = await apiFetch(`/api/profile?username=${encodeURIComponent(username)}`);
    const href = data.links?.html || `https://unsplash.com/@${username}`;

    document.getElementById("avatar").src = data.profile_image?.large || data.profile_image?.medium || "";
    document.getElementById("name").innerText = data.name || username;
    document.getElementById("bio").innerText = data.bio || "Unsplash Photographer";
    profileLink.href = href;
    footerLink.href = href;
    footerName.textContent = data.name || username;
  }catch(err){
    console.error(err);
    const href = `https://unsplash.com/@${username}`;
    document.getElementById("name").innerText = username;
    document.getElementById("bio").innerText = "Unable to load profile";
    profileLink.href = href;
    footerLink.href = href;
    footerName.textContent = username;
  }
}

function createCard(photo, index){
  const card = document.createElement("article");
  card.className = "photo-card";

  const img = document.createElement("img");
  img.src = photo.urls?.small || photo.urls?.regular;
  img.alt = photo.alt_description || photo.description || `Photo ${index + 1}`;
  img.loading = "lazy";
  img.decoding = "async";

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
  card.addEventListener("click", () => openLightbox(index));

  return card;
}

async function loadPhotos(){
  if(isLoading || !hasMore) return;

  isLoading = true;
  setStatus(`Loading page ${page}...`);

  try{
    const data = await apiFetch(`/api/photos?username=${encodeURIComponent(username)}&page=${page}&per_page=24`);

    if(!Array.isArray(data) || data.length === 0){
      hasMore = false;
      setStatus("No more photos");
      return;
    }

    const startIndex = photos.length;
    photos = photos.concat(data);

    data.forEach((photo, idx) => {
      const card = createCard(photo, startIndex + idx);
      gallery.appendChild(card);
    });

    page += 1;
    setStatus(`${photos.length} photos loaded`);
  }catch(err){
    console.error(err);
    setStatus("Load failed. Check username or Cloudflare secret.");
  }finally{
    isLoading = false;
  }
}

async function getPhotoDetail(photo){
  if(detailCache.has(photo.id)) return detailCache.get(photo.id);

  const detail = await apiFetch(`/api/photo/${encodeURIComponent(photo.id)}`);
  detailCache.set(photo.id, detail);
  return detail;
}

async function openLightbox(index){
  currentIndex = index;
  const photo = photos[index];
  if(!photo) return;

  lightbox.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  lightboxImg.src = photo.urls?.regular || photo.urls?.full || photo.urls?.small;
  lightboxImg.alt = photo.alt_description || photo.description || "preview";
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

  updateNavState();
}

function closeLightbox(){
  lightbox.classList.add("hidden");
  document.body.style.overflow = "auto";
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
});

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
