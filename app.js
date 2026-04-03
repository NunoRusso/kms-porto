const DEFAULT_SALESPEOPLE = [
  "Comercial 1",
  "Comercial 2",
  "Comercial 3",
  "Comercial 4",
  "Comercial 5",
  "Comercial 6",
  "Comercial 7",
];

const STORAGE_KEYS = {
  salespeople: "kms_porto_salespeople_v1",
  currentUser: "kms_porto_current_user_v1",
};

const DB_NAME = "kms_porto_db";
const DB_VERSION = 1;
const STORE_ENTRIES = "entries";

const state = {
  salespeople: loadSalespeople(),
  currentUser: loadCurrentUser(),
  entries: [],
  dashboardPhoto: null,
  receiptPhotos: [],
  isProcessingFiles: false,
};

const els = {
  screens: document.querySelectorAll(".screen"),
  navButtons: document.querySelectorAll(".nav-btn"),
  toast: document.getElementById("toast"),
  currentUser: document.getElementById("current-user"),
  settingsCurrentUser: document.getElementById("settings-current-user"),
  settingsSalespeople: document.getElementById("settings-salespeople"),
  summaryTitle: document.getElementById("summary-title"),
  metricDays: document.getElementById("metric-days"),
  metricKm: document.getElementById("metric-km"),
  metricReceipts: document.getElementById("metric-receipts"),
  btnNewEntry: document.getElementById("btn-new-entry"),
 function buildWeekMediaFiles(entries) {
  const files = [];

  entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((entry, index) => {
      const safeDate = entry.date || `dia_${index + 1}`;

      if (entry.dashboardPhoto?.dataUrl) {
        files.push(
          dataUrlToFile(
            entry.dashboardPhoto.dataUrl,
            `${safeDate}_quadrante_${index + 1}.jpg`
          )
        );
      }

      entry.receiptPhotos.forEach((photo, receiptIndex) => {
        if (photo?.dataUrl) {
          files.push(
            dataUrlToFile(
              photo.dataUrl,
              `${safeDate}_talao_${index + 1}_${receiptIndex + 1}.jpg`
            )
          );
        }
      });
    });

  return files;
}

async function onShareWeekText() {
  const entries = getMyWeekEntries();

  if (!entries.length) {
    showToast("Não existem registos nesta semana.");
    return;
  }

  const week = currentWeek();
  const year = currentYear();
  const text = makeWeeklySummaryText(entries, state.currentUser, week, year);

  try {
    if (navigator.share) {
      await navigator.share({
        title: `Resumo semanal ${state.currentUser}`,
        text,
      });
      showToast("Resumo semanal preparado para partilha.");
      return;
    }

    await navigator.clipboard.writeText(text);
    showToast("Resumo copiado. Abre o WhatsApp e cola.");
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error(error);
      showToast("Não foi possível partilhar o resumo.");
    }
  }
}

function buildWeekMediaFiles(entries) {
  const files = [];

  entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((entry, index) => {
      const safeDate = entry.date || `dia_${index + 1}`;

      if (entry.dashboardPhoto?.dataUrl) {
        files.push(
          dataUrlToFile(
            entry.dashboardPhoto.dataUrl,
            `${safeDate}_quadrante_${index + 1}.jpg`
          )
        );
      }

      entry.receiptPhotos.forEach((photo, receiptIndex) => {
        if (photo?.dataUrl) {
          files.push(
            dataUrlToFile(
              photo.dataUrl,
              `${safeDate}_talao_${index + 1}_${receiptIndex + 1}.jpg`
            )
          );
        }
      });
    });

  return files;
}

async function onShareWeekText() {
  const entries = getMyWeekEntries();

  if (!entries.length) {
    showToast("Não existem registos nesta semana.");
    return;
  }

  const week = currentWeek();
  const year = currentYear();
  const text = makeWeeklySummaryText(entries, state.currentUser, week, year);

  try {
    if (navigator.share) {
      await navigator.share({
        title: `Resumo semanal ${state.currentUser}`,
        text,
      });
      showToast("Resumo semanal preparado para partilha.");
      return;
    }

    await navigator.clipboard.writeText(text);
    showToast("Resumo copiado. Abre o WhatsApp e cola.");
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error(error);
      showToast("Não foi possível partilhar o resumo.");
    }
  }
}

async function onShareWeekPhotos() {
  const entries = getMyWeekEntries();

  if (!entries.length) {
    showToast("Não existem registos nesta semana.");
    return;
  }

  const files = buildWeekMediaFiles(entries);

  if (!files.length) {
    showToast("Não existem fotos para partilhar nesta semana.");
    return;
  }

  try {
    if (navigator.share && navigator.canShare?.({ files })) {
      await navigator.share({
        title: `Fotos semanais ${state.currentUser}`,
        files,
      });
      showToast("Fotos preparadas para partilha.");
      return;
    }

    showToast("Este dispositivo não suporta partilha de fotos.");
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error(error);
      showToast("Não foi possível partilhar as fotos.");
    }
  }
}
function saveSettings() {
  localStorage.setItem(STORAGE_KEYS.salespeople, JSON.stringify(state.salespeople));
  localStorage.setItem(STORAGE_KEYS.currentUser, state.currentUser);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        const store = db.createObjectStore(STORE_ENTRIES, { keyPath: "id" });
        store.createIndex("by_salesperson", "salesperson", { unique: false });
        store.createIndex("by_date", "date", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllEntries() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, "readonly");
    const store = tx.objectStore(STORE_ENTRIES);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function addEntry(entry) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, "readwrite");
    tx.objectStore(STORE_ENTRIES).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteEntry(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, "readwrite");
    tx.objectStore(STORE_ENTRIES).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("pt-PT");
}

function getWeekNumber(dateStr) {
  const d = new Date(dateStr);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function getYear(dateStr) {
  return new Date(dateStr).getFullYear();
}

function currentWeek() {
  return getWeekNumber(todayISO());
}

function currentYear() {
  return getYear(todayISO());
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(dataUrl, filename) {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

function escapeCsv(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvFromEntries(entries) {
  const headers = ["data", "comercial", "kmInicio", "kmFim", "kmDia", "observacoes", "fotoQuadrante", "numTaloes", "criadoEm"];
  const rows = entries.map((entry) => [
    entry.date,
    entry.salesperson,
    entry.kmStart,
    entry.kmEnd,
    entry.kmDay,
    entry.notes || "",
    entry.dashboardPhoto ? "Sim" : "Não",
    entry.receiptPhotos.length,
    entry.createdAt,
  ]);
  return [headers.join(",")].concat(rows.map((row) => row.map(escapeCsv).join(","))).join("\n");
}

function makeWeeklySummaryText(entries, salesperson, week, year) {
  const totalKm = entries.reduce((sum, entry) => sum + (Number(entry.kmDay) || 0), 0);
  const totalReceipts = entries.reduce((sum, entry) => sum + entry.receiptPhotos.length, 0);
  const dashboardPhotos = entries.filter((entry) => entry.dashboardPhoto).length;

  const lines = [
    "Resumo semanal",
    `Comercial: ${salesperson}`,
    `Semana: ${week}/${year}`,
    `Dias registados: ${entries.length}`,
    `KM totais: ${totalKm}`,
    `Fotos de quadrante: ${dashboardPhotos}`,
    `Fotos de talões: ${totalReceipts}`,
    "",
    "Detalhe diário:",
  ];

  entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((entry) => {
      lines.push(`${formatDate(entry.date)} | ${entry.kmStart} → ${entry.kmEnd} | ${entry.kmDay} km${entry.notes ? ` | ${entry.notes}` : ""}`);
    });

  return lines.join("\n");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove("show");
  }, 2400);
}

function getMyEntries() {
  return state.entries.filter((entry) => entry.salesperson === state.currentUser);
}

function getMyWeekEntries() {
  const week = currentWeek();
  const year = currentYear();
  return getMyEntries().filter((entry) => getWeekNumber(entry.date) === week && getYear(entry.date) === year);
}

function populateSalespeople() {
  const html = state.salespeople.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  els.currentUser.innerHTML = html;
  els.settingsCurrentUser.innerHTML = html;
  els.entrySalesperson.innerHTML = `<option value="">Selecionar</option>${html}`;

  if (!state.salespeople.includes(state.currentUser)) {
    state.currentUser = state.salespeople[0] || DEFAULT_SALESPEOPLE[0];
  }

  els.currentUser.value = state.currentUser;
  els.settingsCurrentUser.value = state.currentUser;
  els.entrySalesperson.value = state.currentUser;
  els.settingsSalespeople.value = state.salespeople.join("\n");
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSummary() {
  const weekEntries = getMyWeekEntries();
  const totalKm = weekEntries.reduce((sum, entry) => sum + (Number(entry.kmDay) || 0), 0);
  const totalReceipts = weekEntries.reduce((sum, entry) => sum + entry.receiptPhotos.length, 0);
  const week = currentWeek();
  const year = currentYear();

  els.summaryTitle.textContent = `Semana ${week}/${year}`;
  els.metricDays.textContent = String(weekEntries.length);
  els.metricKm.textContent = String(totalKm);
  els.metricReceipts.textContent = String(totalReceipts);
}

function renderEntries() {
  const week = currentWeek();
  const year = currentYear();
  const ordered = getMyEntries()
    .filter((entry) => getWeekNumber(entry.date) === week && getYear(entry.date) === year)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!ordered.length) {
    els.entriesList.innerHTML = `<div class="empty-state">Ainda não existem registos nesta semana.</div>`;
    return;
  }

  els.entriesList.innerHTML = ordered
    .map((entry) => {
      return `
        <article class="entry-item">
          <div class="entry-top">
            <div>
              <div class="entry-date">${escapeHtml(formatDate(entry.date))}</div>
              <div class="entry-sub">${entry.kmStart} → ${entry.kmEnd} · ${entry.kmDay} km</div>
            </div>
            <button class="delete-btn" data-entry-id="${entry.id}">Apagar</button>
          </div>
          ${entry.notes ? `<p class="muted">${escapeHtml(entry.notes)}</p>` : ""}
          <div class="chips">
            ${entry.dashboardPhoto ? `<span class="chip">Foto quadrante</span>` : ""}
            ${entry.receiptPhotos.length ? `<span class="chip">${entry.receiptPhotos.length} talões</span>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderPreviews() {
  els.dashboardPreview.innerHTML = state.dashboardPhoto ? `<img src="${state.dashboardPhoto.dataUrl}" alt="Foto do quadrante" />` : "";
  els.receiptsPreview.innerHTML = state.receiptPhotos
    .map((photo, index) => `<img src="${photo.dataUrl}" alt="Talão ${index + 1}" />`)
    .join("");
}

function updateKmDayPreview() {
  const startRaw = els.entryKmStart.value;
  const endRaw = els.entryKmEnd.value;

  if (startRaw === "" || endRaw === "") {
    els.kmDayBox.hidden = true;
    els.kmDayPreview.textContent = "0";
    return;
  }

  const start = Number(startRaw);
  const end = Number(endRaw);

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    els.kmDayBox.hidden = true;
    els.kmDayPreview.textContent = "0";
    return;
  }

  els.kmDayBox.hidden = false;
  els.kmDayPreview.textContent = String(end - start);
}

function showScreen(screenId) {
  els.screens.forEach((screen) => {
    screen.classList.toggle("active", screen.id === screenId);
  });
  els.navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.screen === screenId);
  });
}

function resetEntryForm() {
  els.entryForm.reset();
  els.entryDate.value = todayISO();
  els.entrySalesperson.value = state.currentUser;
  state.dashboardPhoto = null;
  state.receiptPhotos = [];
  renderPreviews();
  updateKmDayPreview();
}

async function compressImage(file, { maxWidth = 1400, quality = 0.78 } = {}) {
  const dataUrl = await fileToDataUrl(file);
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const ratio = Math.min(1, maxWidth / img.width);
  const width = Math.round(img.width * ratio);
  const height = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
  return {
    name: (file.name || "foto").replace(/\.[^.]+$/, "") + ".jpg",
    dataUrl: compressedDataUrl,
  };
}

async function handleDashboardPhotoChange(file) {
  if (!file) {
    state.dashboardPhoto = null;
    renderPreviews();
    return;
  }
  state.dashboardPhoto = await compressImage(file, { maxWidth: 1600, quality: 0.78 });
  renderPreviews();
}

async function handleReceiptPhotosChange(fileList) {
  const files = Array.from(fileList || []).slice(0, 5);
  state.receiptPhotos = [];
  for (const file of files) {
    // talões: tamanho mais pequeno para poupar armazenamento
    const photo = await compressImage(file, { maxWidth: 1200, quality: 0.72 });
    state.receiptPhotos.push(photo);
  }
  renderPreviews();
}

async function onEntrySubmit(event) {
  event.preventDefault();

  const salesperson = els.entrySalesperson.value;
  const date = els.entryDate.value;
  const kmStart = Number(els.entryKmStart.value);
  const kmEnd = Number(els.entryKmEnd.value);
  const notes = els.entryNotes.value.trim();

  if (!salesperson) {
    showToast("Seleciona o comercial.");
    return;
  }
  if (!date) {
    showToast("Seleciona a data.");
    return;
  }
  if (Number.isNaN(kmStart) || Number.isNaN(kmEnd)) {
    showToast("Indica os kms inicial e final.");
    return;
  }
  if (kmEnd < kmStart) {
    showToast("O km final não pode ser inferior ao inicial.");
    return;
  }

  const entry = {
    id: crypto.randomUUID(),
    salesperson,
    date,
    kmStart,
    kmEnd,
    kmDay: kmEnd - kmStart,
    notes,
    dashboardPhoto: state.dashboardPhoto,
    receiptPhotos: [...state.receiptPhotos],
    createdAt: new Date().toISOString(),
  };

  try {
    await addEntry(entry);
    state.entries = await getAllEntries();
    resetEntryForm();
    renderSummary();
    renderEntries();
    showScreen("screen-home");
    showToast("Registo diário guardado.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível guardar. Pode faltar espaço no dispositivo.");
  }
}

async function onDeleteEntry(id) {
  await deleteEntry(id);
  state.entries = await getAllEntries();
  renderSummary();
  renderEntries();
  showToast("Registo removido.");
}

function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function onExportWeek() {
  const entries = getMyWeekEntries();
  const filename = `semana_${currentWeek()}_${currentYear()}_${state.currentUser.replace(/\s+/g, "_")}.csv`;
  downloadCsv(filename, csvFromEntries(entries));
  showToast("CSV exportado.");
}

async function onShareWeek() {
  const entries = getMyWeekEntries();

  if (!entries.length) {
    showToast("Não existem registos nesta semana.");
    return;
  }

  const week = currentWeek();
  const year = currentYear();
  const text = makeWeeklySummaryText(entries, state.currentUser, week, year);

  const files = [];

  entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((entry, index) => {
      const safeDate = entry.date || `dia_${index + 1}`;

      if (entry.dashboardPhoto?.dataUrl) {
        files.push(
          dataUrlToFile(
            entry.dashboardPhoto.dataUrl,
            `${safeDate}_quadrante_${index + 1}.jpg`
          )
        );
      }

      entry.receiptPhotos.forEach((photo, receiptIndex) => {
        if (photo?.dataUrl) {
          files.push(
            dataUrlToFile(
              photo.dataUrl,
              `${safeDate}_talao_${index + 1}_${receiptIndex + 1}.jpg`
            )
          );
        }
      });
    });

  try {
    if (navigator.share && files.length && navigator.canShare?.({ files })) {
      await navigator.share({
        title: `Resumo semanal ${state.currentUser}`,
        text,
        files,
      });
      showToast("Resumo semanal preparado para partilha.");
      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: `Resumo semanal ${state.currentUser}`,
        text,
      });
      showToast("Resumo semanal preparado para partilha.");
      return;
    }

    await navigator.clipboard.writeText(text);
    showToast("Resumo copiado. Cola-o no WhatsApp ou email.");
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error(error);
      showToast("Não foi possível partilhar neste dispositivo.");
    }
  }
}

function onSaveSettings() {
  const salespeople = els.settingsSalespeople.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);

  state.salespeople = salespeople.length ? salespeople : [...DEFAULT_SALESPEOPLE];
  state.currentUser = els.settingsCurrentUser.value || state.salespeople[0];
  if (!state.salespeople.includes(state.currentUser)) {
    state.currentUser = state.salespeople[0];
  }
  saveSettings();
  populateSalespeople();
  renderSummary();
  renderEntries();
  showScreen("screen-home");
  showToast("Configuração guardada.");
}

function wireEvents() {
  els.navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.screen;
      if (target === "screen-entry") {
        resetEntryForm();
      }
      if (target === "screen-entries") {
        renderEntries();
      }
      showScreen(target);
    });
  });

  els.currentUser.addEventListener("change", () => {
    state.currentUser = els.currentUser.value;
    saveSettings();
    els.settingsCurrentUser.value = state.currentUser;
    renderSummary();
    renderEntries();
  });

  els.settingsCurrentUser.addEventListener("change", () => {
    state.currentUser = els.settingsCurrentUser.value;
  });

  els.btnNewEntry.addEventListener("click", () => {
    resetEntryForm();
    showScreen("screen-entry");
  });
  els.btnGoEntries.addEventListener("click", () => {
    renderEntries();
    showScreen("screen-entries");
  });
  els.btnGoSettings.addEventListener("click", () => {
    els.settingsCurrentUser.value = state.currentUser;
    els.settingsSalespeople.value = state.salespeople.join("\n");
    showScreen("screen-settings");
  });
  els.btnCancelEntry.addEventListener("click", () => showScreen("screen-home"));
  els.btnBackEntries.addEventListener("click", () => showScreen("screen-home"));
  els.btnCancelSettings.addEventListener("click", () => showScreen("screen-home"));
  els.btnSaveSettings.addEventListener("click", onSaveSettings);
  els.btnExportWeek.addEventListener("click", onExportWeek);
  els.btnShareWeek.addEventListener("click", onShareWeek);

  els.entryForm.addEventListener("submit", onEntrySubmit);
  els.entryKmStart.addEventListener("input", updateKmDayPreview);
  els.entryKmEnd.addEventListener("input", updateKmDayPreview);
  els.entryDashboardPhoto.addEventListener("change", async (event) => {
    await handleDashboardPhotoChange(event.target.files?.[0]);
  });
  els.entryReceiptPhotos.addEventListener("change", async (event) => {
    await handleReceiptPhotosChange(event.target.files);
  });

  els.entriesList.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-entry-id]");
    if (!btn) return;
    await onDeleteEntry(btn.dataset.entryId);
  });
}

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch (error) {
      console.warn("Service worker não registado", error);
    }
  }
}

async function init() {
  if (!("indexedDB" in window)) {
    showToast("Este navegador não suporta armazenamento local avançado.");
    return;
  }

  state.entries = await getAllEntries();
  if (!state.salespeople.includes(state.currentUser)) {
    state.currentUser = state.salespeople[0] || DEFAULT_SALESPEOPLE[0];
    saveSettings();
  }

  populateSalespeople();
  els.entryDate.value = todayISO();
  updateKmDayPreview();
  renderSummary();
  renderEntries();
  wireEvents();
  showScreen("screen-home");
  await registerServiceWorker();
}

init().catch((error) => {
  console.error(error);
  showToast("Erro ao iniciar a app.");
});
