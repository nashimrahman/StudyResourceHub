const CONFIG = {
  
  apiEndpoint: "https://sheetdb.io/api/v1/pj7hvckq1123c",
 
  uploadFormUrl: "https://forms.gle/LTrY97P2MmeAVv147"
};

const state = {
  allResources: [],
  visibleResources: []
};

const ui = {
  searchInput: document.getElementById("searchInput"),
  departmentFilter: document.getElementById("departmentFilter"),
  yearFilter: document.getElementById("yearFilter"),
  typeFilter: document.getElementById("typeFilter"),
  sortSelect: document.getElementById("sortSelect"),
  uploadButton: document.getElementById("uploadButton"),
  loadingState: document.getElementById("loadingState"),
  errorState: document.getElementById("errorState"),
  emptyState: document.getElementById("emptyState"),
  resourceGrid: document.getElementById("resourceGrid"),
  recentSection: document.getElementById("recentSection"),
  recentGrid: document.getElementById("recentGrid")
};

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

  return {
    title: getValue("Title"),
    subject: getValue("Subject"),
    department: getValue("Department"),
    year: getValue("Year"),

  
    type: getValue("Type", "Resource Type"),

  
    fileLink: getValue(
      "FileLink",
      "File Link",
      "Add Your File"   
    ),

  
    uploadDate: getValue("UploadDate", "Upload Date", "Timestamp")
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
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700"
  };
  return `<span class="rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone] || tones.slate}">${escapeHtml(text || "N/A")}</span>`;
}

function resourceCardTemplate(resource) {
  const safeTitle = escapeHtml(resource.title || "Untitled Resource");
  const safeSubject = escapeHtml(resource.subject || "Unknown Subject");
  const date = parseDate(resource.uploadDate);
  const formattedDate = date ? date.toLocaleDateString() : "Unknown Date";
  const rawLink = resource.fileLink || "#";
  const downloadLink = toGoogleDriveDownloadLink(rawLink);
  const previewLink = toGoogleDrivePreviewLink(rawLink);

  return `
    <article class="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div class="mb-3">
        <h3 class="line-clamp-2 text-base font-bold text-slate-900">${safeTitle}</h3>
        <p class="mt-1 text-sm text-slate-600">${safeSubject}</p>
      </div>
      <div class="mb-4 flex flex-wrap gap-2">
        ${createBadge(resource.department, "slate")}
        ${createBadge(resource.year, "blue")}
        ${createBadge(resource.type, "green")}
      </div>
      <p class="mb-4 text-xs text-slate-500">Uploaded: ${escapeHtml(formattedDate)}</p>
      <div class="mt-auto flex items-center gap-2">
        <a
          href="${escapeHtml(downloadLink)}"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex flex-1 items-center justify-center rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          Download
        </a>
        <a
          href="${escapeHtml(previewLink)}"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          View
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
    return;
  }

  ui.recentSection.classList.remove("hidden");
  ui.recentGrid.innerHTML = latest.map(resourceCardTemplate).join("");
}

function applyControls() {
  const searchTerm = ui.searchInput.value.trim().toLowerCase();
  const selectedDepartment = ui.departmentFilter.value;
  const selectedYear = ui.yearFilter.value;
  const selectedType = ui.typeFilter.value;
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

function setFilterOptions(selectElement, values, labelPrefix) {
  const options = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const existingValue = selectElement.value;

  selectElement.innerHTML = `<option value="">${labelPrefix}</option>`;
  options.forEach((option) => {
    selectElement.insertAdjacentHTML(
      "beforeend",
      `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`
    );
  });

  if (options.includes(existingValue)) {
    selectElement.value = existingValue;
  }
}

function setupFilters(resources) {
  setFilterOptions(
    ui.departmentFilter,
    resources.map((resource) => resource.department),
    "All Departments"
  );
  setFilterOptions(
    ui.yearFilter,
    resources.map((resource) => resource.year),
    "All Years"
  );
  setFilterOptions(
    ui.typeFilter,
    resources.map((resource) => resource.type),
    "All Types"
  );
}

function showLoading(isLoading) {
  ui.loadingState.classList.toggle("hidden", !isLoading);
}

function showError(message = "") {
  if (!message) {
    ui.errorState.classList.add("hidden");
    ui.errorState.textContent = "";
    return;
  }
  ui.errorState.classList.remove("hidden");
  ui.errorState.textContent = message;
}

async function fetchResources() {
  showLoading(true);
  showError();
  ui.emptyState.classList.add("hidden");
  ui.resourceGrid.innerHTML = "";

  try {
    if (CONFIG.apiEndpoint.includes("REPLACE_WITH_YOUR_ENDPOINT")) {
      throw new Error(
        "Set your SheetDB API URL in app.js (CONFIG.apiEndpoint) before using the app."
      );
    }

    const response = await fetch(CONFIG.apiEndpoint);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Unexpected API response format. Expected an array of resources.");
    }

    state.allResources = data.map(normalizeResource);
    setupFilters(state.allResources);
    renderRecent(state.allResources);
    applyControls();
  } catch (error) {
    showError(error.message || "Failed to load resources.");
    renderRecent([]);
    renderResources([]);
  } finally {
    showLoading(false);
  }
}

function setupEvents() {
  ui.searchInput.addEventListener("input", applyControls);
  ui.departmentFilter.addEventListener("change", applyControls);
  ui.yearFilter.addEventListener("change", applyControls);
  ui.typeFilter.addEventListener("change", applyControls);
  ui.sortSelect.addEventListener("change", applyControls);

  ui.uploadButton.href = CONFIG.uploadFormUrl;
}

setupEvents();
fetchResources();
