// ====================================================== //
// CONFIGURACIÓN
// Sustituye estos dos valores por los datos de tu proyecto Supabase.
// En Supabase: Project Settings → API → Project URL / anon public key
// ====================================================== //
const SUPABASE_URL = "https://uwnaioghebzrnbsxbouu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_QSaYDWLGVFM1iTUr5DwqxA_ycnwcCLQ";
const ADMIN_EMAIL = "lluis15basket@hotmail.es";

const isConfigured =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_ANON_KEY.length > 30;

const client = isConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let currentUser = null;
let currentProfile = null;
let allTips = [];
let selectedDetail = null;

const $ = (selector) => document.querySelector(selector);

const els = {
  configWarning: $("#configWarning"),
  authSection: $("#authSection"),
  appSection: $("#appSection"),
  userBox: $("#userBox"),
  userNameLabel: $("#userNameLabel"),
  logoutBtn: $("#logoutBtn"),
  showLoginBtn: $("#showLoginBtn"),
  showRegisterBtn: $("#showRegisterBtn"),
  loginForm: $("#loginForm"),
  registerForm: $("#registerForm"),
  tipForm: $("#tipForm"),
  tipAmount: $("#tipAmount"),
  tipCurrency: $("#tipCurrency"),
  tipComment: $("#tipComment"),
  rateInfo: $("#rateInfo"),
  monthPicker: $("#monthPicker"),
  refreshBtn: $("#refreshBtn"),
  exportCsvBtn: $("#exportCsvBtn"),
  monthlyRanking: $("#monthlyRanking"),
  globalRanking: $("#globalRanking"),
  monthlyTotalLabel: $("#monthlyTotalLabel"),
  globalTotalLabel: $("#globalTotalLabel"),
  dailyHistory: $("#dailyHistory"),
  detailSection: $("#detailSection"),
  detailTitle: $("#detailTitle"),
  tipsDetail: $("#tipsDetail"),
  closeDetailBtn: $("#closeDetailBtn"),
  editDialog: $("#editDialog"),
  editForm: $("#editForm"),
  editTipId: $("#editTipId"),
  editAmount: $("#editAmount"),
  editCurrency: $("#editCurrency"),
  editComment: $("#editComment"),
  cancelEditBtn: $("#cancelEditBtn"),
  toast: $("#toast"),
};

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  setTimeout(() => els.toast.classList.add("hidden"), 3000);
}

function money(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function number2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function localDateParts(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return {
    month_key: `${yyyy}-${mm}`,
    day_key: `${yyyy}-${mm}-${dd}`,
    time_label: `${hh}:${min}`,
    device_created_at: date.toISOString(),
    device_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "local",
  };
}

function formatDateTime(tip) {
  if (tip.day_key && tip.time_label) return `${tip.day_key} ${tip.time_label}`;
  return new Date(tip.device_created_at || tip.created_at).toLocaleString("es-ES");
}

function isAdmin() {
  return currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function canEditTip(tip) {
  return isAdmin() || tip.user_id === currentUser?.id;
}

async function getUsdToEurRate() {
  const response = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR");
  if (!response.ok) throw new Error("No se pudo obtener el cambio USD/EUR");
  const data = await response.json();
  const rate = Number(data?.rates?.EUR);
  if (!rate) throw new Error("Cambio USD/EUR inválido");
  return rate;
}

async function convertToEur(amount, currency) {
  const cleanAmount = number2(amount);

  if (currency === "EUR") {
    return { amount_eur: cleanAmount, exchange_rate: 1 };
  }

  const rate = await getUsdToEurRate();
  return {
    amount_eur: number2(cleanAmount * rate),
    exchange_rate: rate,
  };
}

async function checkDisplayNameAvailable(displayName) {
  const { data, error } = await client
    .from("profiles")
    .select("id, display_name")
    .ilike("display_name", displayName.trim())
    .limit(1);

  if (error) throw error;
  return !data || data.length === 0;
}

async function loadProfile() {
  const { data, error } = await client
    .from("profiles")
    .select("id, display_name")
    .eq("id", currentUser.id)
    .single();

  if (error) throw error;
  currentProfile = data;
}

async function loadTips() {
  const { data, error } = await client
    .from("tips")
    .select("*, profiles(display_name)")
    .order("device_created_at", { ascending: false });

  if (error) throw error;
  allTips = data || [];
  renderAll();
}

function groupRanking(tips) {
  const map = new Map();

  for (const tip of tips) {
    const existing = map.get(tip.user_id) || {
      user_id: tip.user_id,
      name: tip.profiles?.display_name || "Sin nombre",
      total: 0,
      count: 0,
    };

    existing.total += Number(tip.amount_eur || 0);
    existing.count += 1;
    map.set(tip.user_id, existing);
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}

function medal(index) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}`;
}

function renderRanking(container, ranking, scope) {
  container.innerHTML = "";

  if (ranking.length === 0) {
    container.innerHTML = `<p class="help">Todavía no hay propinas en este ranking.</p>`;
    return;
  }

  ranking.forEach((row, index) => {
    const btn = document.createElement("button");
    btn.className = "rank-row";
    btn.type = "button";
    btn.innerHTML = `
      <span class="rank-pos">${medal(index)}</span>
      <span>
        <span class="rank-name">${escapeHtml(row.name)}</span><br>
        <span class="rank-meta">${row.count} propina${row.count === 1 ? "" : "s"}</span>
      </span>
      <span class="rank-total">${money(row.total)}</span>
    `;
    btn.addEventListener("click", () => showUserDetail(row.user_id, row.name, scope));
    container.appendChild(btn);
  });
}

function renderDailyHistory(monthTips) {
  const days = new Map();

  for (const tip of monthTips) {
    const key = tip.day_key || "Sin día";
    const existing = days.get(key) || { total: 0, count: 0 };
    existing.total += Number(tip.amount_eur || 0);
    existing.count += 1;
    days.set(key, existing);
  }

  const rows = [...days.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  els.dailyHistory.innerHTML = "";

  if (rows.length === 0) {
    els.dailyHistory.innerHTML = `<p class="help">Todavía no hay historial diario en este mes.</p>`;
    return;
  }

  for (const [day, info] of rows) {
    const div = document.createElement("div");
    div.className = "day-row";
    div.innerHTML = `
      <strong>${escapeHtml(day)}</strong>
      <span>${info.count} propina${info.count === 1 ? "" : "s"} · ${money(info.total)}</span>
    `;
    els.dailyHistory.appendChild(div);
  }
}

function renderAll() {
  const monthKey = els.monthPicker.value || currentMonthKey();
  const monthTips = allTips.filter((tip) => tip.month_key === monthKey);

  const monthlyRanking = groupRanking(monthTips);
  const globalRanking = groupRanking(allTips);

  const monthlyTotal = monthTips.reduce((sum, tip) => sum + Number(tip.amount_eur || 0), 0);
  const globalTotal = allTips.reduce((sum, tip) => sum + Number(tip.amount_eur || 0), 0);

  els.monthlyTotalLabel.textContent = `${money(monthlyTotal)} este mes`;
  els.globalTotalLabel.textContent = `${money(globalTotal)} total`;

  renderRanking(els.monthlyRanking, monthlyRanking, "month");
  renderRanking(els.globalRanking, globalRanking, "global");
  renderDailyHistory(monthTips);

  if (selectedDetail) {
    showUserDetail(selectedDetail.user_id, selectedDetail.name, selectedDetail.scope, false);
  }
}

function showUserDetail(userId, name, scope = "month", scroll = true) {
  selectedDetail = { user_id: userId, name, scope };
  const monthKey = els.monthPicker.value || currentMonthKey();
  const tips = allTips
    .filter((tip) => tip.user_id === userId)
    .filter((tip) => (scope === "month" ? tip.month_key === monthKey : true))
    .sort((a, b) => new Date(b.device_created_at || b.created_at) - new Date(a.device_created_at || a.created_at));

  const total = tips.reduce((sum, tip) => sum + Number(tip.amount_eur || 0), 0);
  els.detailTitle.textContent = `${name} · ${scope === "month" ? "mes seleccionado" : "global"} · ${money(total)}`;
  els.tipsDetail.innerHTML = "";

  if (tips.length === 0) {
    els.tipsDetail.innerHTML = `<p class="help">No hay propinas para mostrar.</p>`;
  }

  for (const tip of tips) {
    const item = document.createElement("div");
    item.className = "tip-item";

    const comment = tip.comment ? `<p class="tip-comment">💬 ${escapeHtml(tip.comment)}</p>` : "";
    const conversion = tip.currency === "USD"
      ? `<br><span class="rank-meta">Original: ${Number(tip.amount_original).toFixed(2)} USD · Cambio: ${Number(tip.exchange_rate).toFixed(4)}</span>`
      : `<br><span class="rank-meta">Original: ${Number(tip.amount_original).toFixed(2)} EUR</span>`;

    const actions = canEditTip(tip)
      ? `<div class="tip-actions">
          <button class="btn ghost" data-edit="${tip.id}" type="button">Editar</button>
          <button class="btn danger" data-delete="${tip.id}" type="button">Borrar</button>
        </div>`
      : `<div class="tip-actions"><span class="help">Solo lectura</span></div>`;

    item.innerHTML = `
      <div class="tip-main">
        <strong>${money(tip.amount_eur)}</strong>
        <span class="rank-meta"> · ${formatDateTime(tip)}</span>
        ${conversion}
        ${comment}
      </div>
      ${actions}
    `;

    els.tipsDetail.appendChild(item);
  }

  els.detailSection.classList.remove("hidden");
  if (scroll) els.detailSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function register(event) {
  event.preventDefault();

  const displayName = $("#registerName").value.trim();
  const email = $("#registerEmail").value.trim().toLowerCase();
  const password = $("#registerPassword").value;

  if (displayName.length < 2) {
    toast("El nombre público debe tener al menos 2 caracteres.");
    return;
  }

  try {
    const available = await checkDisplayNameAvailable(displayName);
    if (!available) {
      toast("Ese nombre público ya está usado. Elige otro.");
      return;
    }

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });

    if (error) throw error;

    if (!data.session) {
      toast("Cuenta creada. Revisa tu email si Supabase pide confirmación.");
      return;
    }

    toast("Cuenta creada. ¡Bienvenido a la liga!");
  } catch (error) {
    toast(error.message || "No se pudo crear la cuenta.");
  }
}

async function login(event) {
  event.preventDefault();

  const email = $("#loginEmail").value.trim().toLowerCase();
  const password = $("#loginPassword").value;

  try {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    toast("Sesión iniciada.");
  } catch (error) {
    toast(error.message || "No se pudo iniciar sesión.");
  }
}

async function logout() {
  await client.auth.signOut();
  toast("Sesión cerrada.");
}

async function addTip(event) {
  event.preventDefault();

  const amount = Number(els.tipAmount.value);
  const currency = els.tipCurrency.value;
  const comment = els.tipComment.value.trim();

  if (!amount || amount <= 0) {
    toast("Introduce una cantidad válida.");
    return;
  }

  try {
    els.rateInfo.textContent = currency === "USD" ? "Calculando cambio USD → EUR..." : "";
    const converted = await convertToEur(amount, currency);
    const local = localDateParts(new Date());

    const { error } = await client.from("tips").insert({
      user_id: currentUser.id,
      amount_original: number2(amount),
      currency,
      amount_eur: converted.amount_eur,
      exchange_rate: converted.exchange_rate,
      comment: comment || null,
      ...local,
    });

    if (error) throw error;

    els.tipForm.reset();
    els.rateInfo.textContent = currency === "USD"
      ? `Cambio usado: 1 USD = ${converted.exchange_rate.toFixed(4)} EUR`
      : "";

    toast(`Propina guardada: ${money(converted.amount_eur)}`);
    await loadTips();
  } catch (error) {
    toast(error.message || "No se pudo guardar la propina.");
  }
}

function openEditDialog(tip) {
  els.editTipId.value = tip.id;
  els.editAmount.value = Number(tip.amount_original).toFixed(2);
  els.editCurrency.value = tip.currency;
  els.editComment.value = tip.comment || "";
  els.editDialog.showModal();
}

async function saveEdit(event) {
  event.preventDefault();

  const id = els.editTipId.value;
  const amount = Number(els.editAmount.value);
  const currency = els.editCurrency.value;
  const comment = els.editComment.value.trim();

  if (!amount || amount <= 0) {
    toast("Introduce una cantidad válida.");
    return;
  }

  try {
    const converted = await convertToEur(amount, currency);
    const { error } = await client
      .from("tips")
      .update({
        amount_original: number2(amount),
        currency,
        amount_eur: converted.amount_eur,
        exchange_rate: converted.exchange_rate,
        comment: comment || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    els.editDialog.close();
    toast("Propina actualizada.");
    await loadTips();
  } catch (error) {
    toast(error.message || "No se pudo editar la propina.");
  }
}

async function deleteTip(id) {
  const ok = confirm("¿Seguro que quieres borrar esta propina?");
  if (!ok) return;

  try {
    const { error } = await client.from("tips").delete().eq("id", id);
    if (error) throw error;
    toast("Propina borrada.");
    await loadTips();
  } catch (error) {
    toast(error.message || "No se pudo borrar la propina.");
  }
}

function exportMonthCsv() {
  const monthKey = els.monthPicker.value || currentMonthKey();
  const rows = allTips.filter((tip) => tip.month_key === monthKey);

  const header = [
    "nombre",
    "cantidad_original",
    "moneda",
    "cantidad_eur",
    "cambio",
    "dia",
    "hora",
    "comentario",
  ];

  const csvRows = [header.join(",")];
  for (const tip of rows) {
    csvRows.push([
      tip.profiles?.display_name || "Sin nombre",
      tip.amount_original,
      tip.currency,
      tip.amount_eur,
      tip.exchange_rate,
      tip.day_key,
      tip.time_label,
      tip.comment || "",
    ].map(csvEscape).join(","));
  }

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tips-la-liga-${monthKey}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function setAuthMode(mode) {
  const isLogin = mode === "login";
  els.loginForm.classList.toggle("hidden", !isLogin);
  els.registerForm.classList.toggle("hidden", isLogin);
  els.showLoginBtn.classList.toggle("active", isLogin);
  els.showRegisterBtn.classList.toggle("active", !isLogin);
}

async function onAuthStateChanged(session) {
  currentUser = session?.user || null;

  if (!currentUser) {
    currentProfile = null;
    allTips = [];
    els.authSection.classList.remove("hidden");
    els.appSection.classList.add("hidden");
    els.userBox.classList.add("hidden");
    return;
  }

  try {
    await loadProfile();
    els.userNameLabel.textContent = `${currentProfile.display_name}${isAdmin() ? " · Admin" : ""}`;
    els.userBox.classList.remove("hidden");
    els.authSection.classList.add("hidden");
    els.appSection.classList.remove("hidden");
    await loadTips();
  } catch (error) {
    toast(error.message || "Error cargando datos.");
  }
}

function setupEvents() {
  els.showLoginBtn.addEventListener("click", () => setAuthMode("login"));
  els.showRegisterBtn.addEventListener("click", () => setAuthMode("register"));
  els.loginForm.addEventListener("submit", login);
  els.registerForm.addEventListener("submit", register);
  els.logoutBtn.addEventListener("click", logout);
  els.tipForm.addEventListener("submit", addTip);
  els.refreshBtn.addEventListener("click", loadTips);
  els.monthPicker.addEventListener("change", renderAll);
  els.exportCsvBtn.addEventListener("click", exportMonthCsv);
  els.closeDetailBtn.addEventListener("click", () => {
    selectedDetail = null;
    els.detailSection.classList.add("hidden");
  });
  els.cancelEditBtn.addEventListener("click", () => els.editDialog.close());
  els.editForm.addEventListener("submit", saveEdit);

  els.tipsDetail.addEventListener("click", (event) => {
    const editId = event.target?.dataset?.edit;
    const deleteId = event.target?.dataset?.delete;

    if (editId) {
      const tip = allTips.find((item) => item.id === editId);
      if (tip) openEditDialog(tip);
    }

    if (deleteId) {
      deleteTip(deleteId);
    }
  });
}

async function init() {
  setupEvents();
  els.monthPicker.value = currentMonthKey();

  if (!isConfigured) {
    els.configWarning.classList.remove("hidden");
    els.authSection.classList.add("hidden");
    return;
  }

  const { data } = await client.auth.getSession();
  await onAuthStateChanged(data.session);

  client.auth.onAuthStateChange((_event, session) => {
    onAuthStateChanged(session);
  });
}

init();
