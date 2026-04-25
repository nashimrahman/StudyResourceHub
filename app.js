const CONFIG = {
  
  apiEndpoint: "https://sheetdb.io/api/v1/pj7hvckq1123c",
 
  uploadFormUrl: "https://forms.gle/LTrY97P2MmeAVv147"
};

const state = {
  allResources: [],
  visibleResources: [],
  selectedType: "",
  selectedDepartment: "",
  selectedYear: "",
  currentView: "welcome",
  bookmarkedIds: JSON.parse(localStorage.getItem('bookmarkedIds') || '[]'),
  upvotedIds: JSON.parse(localStorage.getItem('upvotedIds') || '[]')
};

const ui = {
  searchInput: document.getElementById("searchInput"),
  departmentChips: document.getElementById("departmentChips"),
  yearChips: document.getElementById("yearChips"),
  categoryTabs: document.getElementById("categoryTabs"),
  sortSelect: document.getElementById("sortSelect"),
  loadingState: document.getElementById("loadingState"),
  errorState: document.getElementById("errorState"),
  emptyState: document.getElementById("emptyState"),
  resourceGrid: document.getElementById("resourceGrid"),
  recentSection: document.getElementById("recentSection"),
  recentGrid: document.getElementById("recentGrid"),
  trendingSection: document.getElementById("trendingSection"),
  trendingGrid: document.getElementById("trendingGrid"),
  uploadExternalBtn: document.getElementById("uploadExternalBtn"),
  bookmarksEmptyState: document.getElementById("bookmarksEmptyState"),
  bookmarksGrid: document.getElementById("bookmarksGrid"),
  toastContainer: document.getElementById("toastContainer")
};

function switchView(viewId) {
  state.currentView = viewId;
  
 
  document.querySelectorAll('.view-section').forEach(el => {
    el.classList.add('hidden');
  });
  
 
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) targetView.classList.remove('hidden');

  if (viewId === 'bookmarks') renderBookmarks();

  document.querySelectorAll('.nav-btn').forEach(btn => {
    const isTarget = btn.dataset.view === viewId;
    
    btn.classList.remove('text-brand-700', 'bg-brand-50', 'shadow-sm', 'ring-1', 'ring-brand-100', 'text-slate-600', 'hover:bg-slate-50', 'text-brand-600');
    
    if (isTarget) {
      btn.classList.add('text-brand-700', 'bg-brand-50', 'shadow-sm', 'ring-1', 'ring-brand-100');
    } else {
      btn.classList.add('text-slate-600', 'hover:bg-slate-50');
    }
  });
}

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeResource(resource) {
  const getValue = (...keys) => {
    for (const key of keys) {
      if (resource[key] !== undefined && resource[key] !== null) {
        return String(resource[key]).trim();
      }
    }
    return "";
  };

  const title = getValue("Title");
  const uploadDate = getValue("UploadDate", "Upload Date", "Timestamp");
  const id = btoa(unescape(encodeURIComponent(title + uploadDate))).replace(/=/g, '');
  
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i);
    hash |= 0;
  }
  const baseUpvotes = Math.abs(hash) % 150 + 5;

  return {
    id,
    baseUpvotes,
    title,
    subject: getValue("Subject"),
    department: getValue("Department"),
    year: getValue("Year"),
    type: getValue("Type", "Resource Type"),
    fileLink: getValue("FileLink", "File Link", "Add Your File"),
    uploadDate
  };
}

function toGoogleDriveDownloadLink(url) {
  if (!url) return "#";

  let fileId = "";

  if (url.includes("/file/d/")) {
    fileId = url.split("/file/d/")[1].split("/")[0];
  } else if (url.includes("id=")) {
    fileId = url.split("id=")[1].split("&")[0];
  }

  if (!fileId) return url;

  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

function toGoogleDrivePreviewLink(url) {
  if (!url) return "#";

  let fileId = "";

  if (url.includes("/file/d/")) {
    fileId = url.split("/file/d/")[1].split("/")[0];
  } else if (url.includes("id=")) {
    fileId = url.split("id=")[1].split("&")[0];
  }

  if (!fileId) return url;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

function createBadge(text, tone = "slate") {
  const tones = {
    slate: "bg-slate-100 text-slate-700 border border-slate-200",
    blue: "bg-blue-50 text-blue-700 border border-blue-200",
    green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    brand: "bg-brand-50 text-brand-700 border border-brand-200"
  };
  return `<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${tones[tone] || tones.slate}">${escapeHtml(text || "N/A")}</span>`;
}

function resourceCardTemplate(resource) {
  const safeTitle = escapeHtml(resource.title || "Untitled Resource");
  const safeSubject = escapeHtml(resource.subject || "Unknown Subject");
  const date = parseDate(resource.uploadDate);
  const formattedDate = date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "Unknown Date";
  const rawLink = resource.fileLink || "#";
  const downloadLink = toGoogleDriveDownloadLink(rawLink);
  const previewLink = toGoogleDrivePreviewLink(rawLink);

  const initial = safeTitle.charAt(0).toUpperCase();

  const isBookmarked = state.bookmarkedIds.includes(resource.id);
  const isUpvoted = state.upvotedIds.includes(resource.id);
  const currentUpvotes = isUpvoted ? resource.baseUpvotes + 1 : resource.baseUpvotes;

  const bookmarkIcon = isBookmarked 
    ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-400 group-hover:text-amber-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>`;

  const upvoteClass = isUpvoted ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200";

  return `
    <article class="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden group">
      <div class="p-6 flex-1">
        <!-- Top header -->
        <div class="flex items-start justify-between mb-5">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl font-bold text-brand-600 shadow-inner">
            ${initial}
          </div>
          <div class="flex items-center gap-2">
            <button onclick="toggleUpvote('${resource.id}')" class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-90 ${upvoteClass}" title="Upvote">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" /></svg>
              ${currentUpvotes}
            </button>
            <button onclick="toggleBookmark('${resource.id}')" class="group p-1.5 transition-transform active:scale-90 bg-slate-50 hover:bg-slate-100 rounded-full" title="Save Bookmark">
              ${bookmarkIcon}
            </button>
          </div>
        </div>

        <!-- Title & Subject -->
        <div class="mb-5 flex-grow">
          <h3 class="line-clamp-2 text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors">${safeTitle}</h3>
          <p class="mt-1.5 text-sm text-slate-500 line-clamp-2 leading-relaxed">${safeSubject}</p>
        </div>

        <!-- Badges -->
        <div class="mb-2 flex flex-wrap gap-2">
          ${createBadge(resource.department, "brand")}
          ${createBadge(resource.year, "blue")}
          ${createBadge(resource.type, "green")}
        </div>
      </div>
      
      <!-- Actions -->
      <div class="border-t border-slate-100 bg-slate-50/80 px-6 py-4 flex items-center justify-between gap-3">
        <div class="flex gap-2 flex-1">
          <a
            href="${escapeHtml(downloadLink)}"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download
          </a>
          <button
            onclick="copyToClipboard('${escapeHtml(rawLink)}')"
            class="inline-flex items-center justify-center rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-brand-600 active:scale-95"
            title="Copy Link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          </button>
        </div>
        <a
          href="${escapeHtml(previewLink)}"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          Preview
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
      </div>
    </article>
  `;
}

function renderResources(resources) {
  if (!resources.length) {
    ui.resourceGrid.innerHTML = "";
    ui.emptyState.classList.remove("hidden");
    return;
  }

  ui.emptyState.classList.add("hidden");
  ui.resourceGrid.innerHTML = resources.map(resourceCardTemplate).join("");
}

function renderRecent(resources) {
  const latest = [...resources]
    .filter((r) => parseDate(r.uploadDate))
    .sort((a, b) => parseDate(b.uploadDate) - parseDate(a.uploadDate))
    .slice(0, 3);

  if (!latest.length) {
    ui.recentSection.classList.add("hidden");
    ui.recentGrid.innerHTML = "";
  } else {
    ui.recentSection.classList.remove("hidden");
    ui.recentGrid.innerHTML = latest.map(resourceCardTemplate).join("");
  }
}

function renderTrending(resources) {
  const trending = [...resources]
    .sort((a, b) => {
      const aUpvotes = state.upvotedIds.includes(a.id) ? a.baseUpvotes + 1 : a.baseUpvotes;
      const bUpvotes = state.upvotedIds.includes(b.id) ? b.baseUpvotes + 1 : b.baseUpvotes;
      return bUpvotes - aUpvotes;
    })
    .slice(0, 3);

  if (!trending.length) {
    ui.trendingSection.classList.add("hidden");
    ui.trendingGrid.innerHTML = "";
  } else {
    ui.trendingSection.classList.remove("hidden");
    ui.trendingGrid.innerHTML = trending.map(resourceCardTemplate).join("");
  }
}

function applyControls() {
  const searchTerm = ui.searchInput.value.trim().toLowerCase();
  const selectedDepartment = state.selectedDepartment;
  const selectedYear = state.selectedYear;
  const selectedType = state.selectedType;
  const selectedSort = ui.sortSelect.value;

  let filtered = state.allResources.filter((resource) => {
    const matchesSearch =
      resource.title.toLowerCase().includes(searchTerm) ||
      resource.subject.toLowerCase().includes(searchTerm);
    const matchesDepartment = !selectedDepartment || resource.department === selectedDepartment;
    const matchesYear = !selectedYear || resource.year === selectedYear;
    const matchesType = !selectedType || resource.type === selectedType;

    return matchesSearch && matchesDepartment && matchesYear && matchesType;
  });

  if (selectedSort === "alphabetical") {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    filtered.sort((a, b) => {
      const aDate = parseDate(a.uploadDate)?.getTime() || 0;
      const bDate = parseDate(b.uploadDate)?.getTime() || 0;
      return bDate - aDate;
    });
  }

  state.visibleResources = filtered;
  renderResources(filtered);
}

function setChipFilters(container, values, stateKey) {
  const options = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  
  const createBtn = (text, value) => {
    const isActive = state[stateKey] === value;
    const baseClass = "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all active:scale-95 border";
    const activeClass = isActive 
      ? "bg-brand-600 text-white border-brand-600 shadow-sm" 
      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50";
    return `<button data-val="${escapeHtml(value)}" class="${baseClass} ${activeClass}">${escapeHtml(text)}</button>`;
  };

  let html = createBtn("All", "");
  options.forEach(opt => html += createBtn(opt, opt));
  container.innerHTML = html;

  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      state[stateKey] = e.currentTarget.dataset.val || "";
      setChipFilters(container, values, stateKey); // re-render to update classes
      applyControls();
    });
  });
}

function setCategoryTabs(values) {
  const options = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  let html = `<button data-category="" class="whitespace-nowrap border-b-2 ${!state.selectedType ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'} py-3 px-1 text-sm font-medium outline-none transition-colors">All Types</button>`;
  
  options.forEach((option) => {
    const isActive = state.selectedType === option;
    const classes = isActive 
      ? 'border-brand-500 text-brand-600' 
      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700';
    html += `<button data-category="${escapeHtml(option)}" class="whitespace-nowrap border-b-2 ${classes} py-3 px-1 text-sm font-medium outline-none transition-colors">${escapeHtml(option)}</button>`;
  });
  
  ui.categoryTabs.innerHTML = html;

  ui.categoryTabs.querySelectorAll('button').forEach(tab => {
    tab.addEventListener('click', (e) => {
      state.selectedType = e.currentTarget.dataset.category || "";
      setCategoryTabs(values); // re-render
      applyControls();
    });
  });
}

function setupFilters(resources) {
  setChipFilters(
    ui.departmentChips,
    resources.map((resource) => resource.department),
    "selectedDepartment"
  );
  setChipFilters(
    ui.yearChips,
    resources.map((resource) => resource.year),
    "selectedYear"
  );
  setCategoryTabs(
    resources.map((resource) => resource.type)
  );
}

function showLoading(isLoading) {
  ui.loadingState.classList.toggle("hidden", !isLoading);
}

function showError(message = "") {
  const msgEl = document.getElementById("errorMessage");
  if (!message) {
    ui.errorState.classList.add("hidden");
    if (msgEl) msgEl.textContent = "";
    return;
  }
  ui.errorState.classList.remove("hidden");
  if (msgEl) {
    msgEl.textContent = message;
  } else {
    ui.errorState.textContent = message;
  }
}

async function fetchResources() {
  ui.errorState.classList.add("hidden");
  
  const cached = localStorage.getItem('cachedResources');
  if (cached) {
    try {
      state.allResources = JSON.parse(cached);
      setupFilters(state.allResources);
      renderRecent(state.allResources);
      renderTrending(state.allResources);
      applyControls();
      if (state.currentView === 'bookmarks') renderBookmarks();
    } catch (e) {
      console.error("Cache parse error", e);
    }
  } else {
    showLoading(true);
    ui.emptyState.classList.add("hidden");
    ui.resourceGrid.innerHTML = "";
  }

  try {
    if (CONFIG.apiEndpoint.includes("REPLACE_WITH_YOUR_ENDPOINT")) {
      throw new Error("Set your SheetDB API URL in app.js");
    }

    const response = await fetch(CONFIG.apiEndpoint);
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Unexpected API response format.");

    state.allResources = data.map(normalizeResource);
    localStorage.setItem('cachedResources', JSON.stringify(state.allResources));

    setupFilters(state.allResources);
    renderRecent(state.allResources);
    renderTrending(state.allResources);
    applyControls();
    if (state.currentView === 'bookmarks') renderBookmarks();
  } catch (error) {
    if (!cached) {
      showError(error.message || "Failed to load resources.");
      renderRecent([]);
      renderResources([]);
    }
  } finally {
    showLoading(false);
  }
}

function renderBookmarks() {
  const bookmarks = state.allResources.filter(r => state.bookmarkedIds.includes(r.id));
  if (!bookmarks.length) {
    ui.bookmarksEmptyState.classList.remove("hidden");
    ui.bookmarksGrid.innerHTML = "";
    return;
  }
  ui.bookmarksEmptyState.classList.add("hidden");
  ui.bookmarksGrid.innerHTML = bookmarks.map(resourceCardTemplate).join("");
}

window.toggleBookmark = function(id) {
  const index = state.bookmarkedIds.indexOf(id);
  if (index === -1) {
    state.bookmarkedIds.push(id);
    showToast("Added to bookmarks!");
  } else {
    state.bookmarkedIds.splice(index, 1);
    showToast("Removed from bookmarks.");
  }
  localStorage.setItem('bookmarkedIds', JSON.stringify(state.bookmarkedIds));
  applyControls();
  if (state.currentView === 'bookmarks') renderBookmarks();
}

window.toggleUpvote = function(id) {
  const index = state.upvotedIds.indexOf(id);
  if (index === -1) {
    state.upvotedIds.push(id);
  } else {
    state.upvotedIds.splice(index, 1);
  }
  localStorage.setItem('upvotedIds', JSON.stringify(state.upvotedIds));
  applyControls();
  if (state.currentView === 'bookmarks') renderBookmarks();
}

window.copyToClipboard = function(url) {
  navigator.clipboard.writeText(url).then(() => {
    showToast("Link copied to clipboard!");
  }).catch(() => {
    showToast("Failed to copy link.");
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 transform translate-y-10 opacity-0 flex items-center gap-2';
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
    </svg>
    ${escapeHtml(message)}
  `;
  
  ui.toastContainer.appendChild(toast);
  
  setTimeout(() => toast.classList.remove('translate-y-10', 'opacity-0'), 10);
  
  setTimeout(() => {
    toast.classList.add('translate-y-10', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function setupEvents() {
  ui.searchInput.addEventListener("input", applyControls);
  ui.sortSelect.addEventListener("change", applyControls);

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const viewId = e.currentTarget.dataset.view;
      if (viewId) switchView(viewId);
    });
  });

  if (ui.uploadExternalBtn) {
    ui.uploadExternalBtn.href = CONFIG.uploadFormUrl;
    ui.uploadExternalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      const uploadContent = document.getElementById('uploadContent');
      const uploadLoadingState = document.getElementById('uploadLoadingState');
      
      if (uploadContent && uploadLoadingState) {
        // Show loading state
        uploadContent.classList.add('hidden');
        uploadContent.classList.remove('flex');
        uploadLoadingState.classList.remove('hidden');
        uploadLoadingState.classList.add('flex');
        
        // Wait 2 seconds, then open the form
        setTimeout(() => {
          window.open(CONFIG.uploadFormUrl, '_blank');
          
          // Reset UI after opening so it's ready when they come back
          setTimeout(() => {
            uploadLoadingState.classList.add('hidden');
            uploadLoadingState.classList.remove('flex');
            uploadContent.classList.remove('hidden');
            uploadContent.classList.add('flex');
          }, 1000);
        }, 1500); // 1.5 second fake loading time for effect
      } else {
        window.open(CONFIG.uploadFormUrl, '_blank');
      }
    });
  }
}

setupEvents();
fetchResources();
