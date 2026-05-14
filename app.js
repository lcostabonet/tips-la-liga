// ====================================================== //
// CONFIGURACIÓN
// Sustituye estos dos valores por los datos de tu proyecto Supabase.
// En Supabase: Project Settings → API → Project URL / anon public key
// ====================================================== //
const SUPABASE_URL = "https://uwnaioghebzrnbsxbouu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_QSaYDWLGVFM1iTUr5DwqxA_ycnwcCLQ";
const ADMIN_EMAIL = "lluis15basket@hotmail.es";
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

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
let selectedDriver = null;
let selectedTipAmount = 0;
let adminDrivers = [];
let driverSelfProfile = null;
let currentAdminMethodsDriverId = null;

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
  darPropinaBtn: $("#darPropinaBtn"),
  tipDriverSection: $("#tipDriverSection"),
  driverList: $("#driverList"),
  driverPayView: $("#driverPayView"),
  backToAppBtn: $("#backToAppBtn"),
  backToDriversBtn: $("#backToDriversBtn"),
  payDriverEmoji: $("#payDriverEmoji"),
  payDriverName: $("#payDriverName"),
  payDriverBio: $("#payDriverBio"),
  driverQr: $("#driverQr"),
  tipChips: $("#tipChips"),
  customAmount: $("#customAmount"),
  payTipBtn: $("#payTipBtn"),
  payConfirm: $("#payConfirm"),
  confirmMsg: $("#confirmMsg"),
  newTipBtn: $("#newTipBtn"),
  adminBtn: $("#adminBtn"),
  adminDriversSection: $("#adminDriversSection"),
  backFromAdminBtn: $("#backFromAdminBtn"),
  driverProfilesList: $("#driverProfilesList"),
  editDriverDialog: $("#editDriverDialog"),
  editDriverForm: $("#editDriverForm"),
  editDriverId: $("#editDriverId"),
  editDriverName: $("#editDriverName"),
  editDriverVehicle: $("#editDriverVehicle"),
  editDriverRoute: $("#editDriverRoute"),
  editDriverVisible: $("#editDriverVisible"),
  cancelEditDriverBtn: $("#cancelEditDriverBtn"),
  editPaymentProvider: $("#editPaymentProvider"),
  editPaymentUrl: $("#editPaymentUrl"),
  editPaymentInstructions: $("#editPaymentInstructions"),
  externalPayBtn: document.querySelector(".external-pay-btn"),
  testLinkBtn: $("#testLinkBtn"),
  urlValidationHint: $("#urlValidationHint"),
  editQrPreview: $("#editQrPreview"),
  editQrPreviewImg: $("#editQrPreviewImg"),
  editProviderBadge: $("#editProviderBadge"),
  driverLinkBtn: $("#driverLinkBtn"),
  driverSelfSection: $("#driverSelfSection"),
  backFromSelfBtn: $("#backFromSelfBtn"),
  driverSelfContent: $("#driverSelfContent"),
  driverMethodsSection: $("#driverMethodsSection"),
  backFromMethodsBtn: $("#backFromMethodsBtn"),
  driverMethodsContent: $("#driverMethodsContent"),
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
  if (!tip || !canEditTip(tip)) {
    toast("No tienes permiso para editar esta propina.");
    return;
  }

  els.editTipId.value = tip.id;
  els.editAmount.value = Number(tip.amount_original).toFixed(2);
  els.editCurrency.value = tip.currency;
  els.editComment.value = tip.comment || "";
  els.editDialog.showModal();
}

async function saveEdit(event) {
  event.preventDefault();

  const id = els.editTipId.value;
  const tip = allTips.find((item) => item.id === id);
  if (!tip || !canEditTip(tip)) {
    toast("No tienes permiso para editar esta propina.");
    return;
  }

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
  const tip = allTips.find((item) => item.id === id);
  if (!tip || !canEditTip(tip)) {
    toast("No tienes permiso para borrar esta propina.");
    return;
  }

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
  els.tipDriverSection.classList.add("hidden");
  els.adminDriversSection.classList.add("hidden");
  els.driverSelfSection.classList.add("hidden");
  els.driverMethodsSection.classList.add("hidden");
  currentUser = session?.user || null;

  if (!currentUser) {
    currentProfile = null;
    allTips = [];
    adminDrivers = [];
    driverSelfProfile = null;
    els.authSection.classList.remove("hidden");
    els.appSection.classList.add("hidden");
    els.userBox.classList.add("hidden");
    els.adminBtn.classList.add("hidden");
    els.driverLinkBtn.classList.add("hidden");
    return;
  }

  try {
    await loadProfile();
    els.userNameLabel.textContent = `${currentProfile.display_name}${isAdmin() ? " · Admin" : ""}`;
    els.userBox.classList.remove("hidden");
    els.authSection.classList.add("hidden");
    els.appSection.classList.remove("hidden");
    if (isAdmin()) els.adminBtn.classList.remove("hidden");
    await loadTips();
    await loadDriverSelfProfile();
    if (driverSelfProfile) els.driverLinkBtn.classList.remove("hidden");
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

  els.darPropinaBtn.addEventListener("click", showTipSection);
  els.backToAppBtn.addEventListener("click", hideTipSection);
  els.backToDriversBtn.addEventListener("click", renderDriverList);
  els.payTipBtn.addEventListener("click", handleTipPayment);
  els.newTipBtn.addEventListener("click", () => {
    selectedTipAmount = null;
    els.customAmount.value = "";
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
    els.payTipBtn.classList.remove("hidden");
    renderDriverList();
  });
  els.customAmount.addEventListener("input", () => {
    const val = parseFloat(els.customAmount.value);
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
    selectedTipAmount = val > 0 ? val : 0;
    updatePayButton();
  });

  els.externalPayBtn.addEventListener("click", () => {
    if (!selectedDriver || !selectedDriver.payment_url) return;
    let payUrl = selectedDriver.payment_url;
    if (selectedTipAmount > 0 && payUrl.includes("paypal.me")) {
      payUrl = `${payUrl.replace(/\/$/, "")}/${selectedTipAmount.toFixed(2)}`;
    }
    window.open(payUrl, "_blank", "noopener");
  });

  els.driverLinkBtn.addEventListener("click", showDriverSelfSection);
  els.backFromSelfBtn.addEventListener("click", hideDriverSelfSection);
  els.backFromMethodsBtn.addEventListener("click", hideDriverMethodsSection);
  els.adminBtn.addEventListener("click", showAdminSection);
  els.backFromAdminBtn.addEventListener("click", hideAdminSection);
  els.editDriverForm.addEventListener("submit", saveEditDriver);
  els.cancelEditDriverBtn.addEventListener("click", () => els.editDriverDialog.close());
  els.editPaymentUrl.addEventListener("input", updatePaymentUrlPreview);
  els.editPaymentProvider.addEventListener("change", updatePaymentUrlPreview);
  els.testLinkBtn.addEventListener("click", () => {
    const url = els.editPaymentUrl.value.trim();
    if (url) window.open(url, "_blank", "noopener");
  });
}

const MOCK_DRIVERS = [
  { id: 1, name: "Marta G.",  emoji: "🚌", bio: "10 años en ruta",    slug: "marta-g",  isMock: true },
  { id: 2, name: "Jordi P.",  emoji: "🚐", bio: "Siempre puntual",    slug: "jordi-p",  isMock: true },
  { id: 3, name: "Sandra R.", emoji: "🚍", bio: "La favorita",        slug: "sandra-r", isMock: true },
  { id: 4, name: "Toni V.",   emoji: "🚎", bio: "El más simpático",   slug: "toni-v",   isMock: true },
];

const TIP_CHIP_AMOUNTS = [1, 2, 5, 10];

function showTipSection() {
  els.authSection.classList.add("hidden");
  els.appSection.classList.add("hidden");
  els.adminDriversSection.classList.add("hidden");
  els.driverSelfSection.classList.add("hidden");
  els.driverMethodsSection.classList.add("hidden");
  els.tipDriverSection.classList.remove("hidden");
  renderDriverList();
}

function hideTipSection() {
  els.tipDriverSection.classList.add("hidden");
  els.driverPayView.classList.add("hidden");
  els.driverList.classList.remove("hidden");
  selectedDriver = null;
  selectedTipAmount = 0;

  if (currentUser) {
    els.appSection.classList.remove("hidden");
  } else {
    els.authSection.classList.remove("hidden");
  }
}

async function renderDriverList() {
  els.driverList.innerHTML = "<p class='help' style='padding:16px'>Cargando conductores...</p>";
  els.driverPayView.classList.add("hidden");
  els.driverList.classList.remove("hidden");

  const drivers = await loadPublicDrivers();
  els.driverList.innerHTML = "";

  if (!drivers.length) {
    els.driverList.innerHTML = "<p class='help' style='padding:16px'>No hay conductores disponibles en este momento.</p>";
    return;
  }

  for (const driver of drivers) {
    const name = driver.display_name || driver.name || "Conductor";
    const bio = [driver.vehicle_info, driver.route_info].filter(Boolean).join(" · ") || driver.bio || "";
    const card = document.createElement("div");
    card.className = "driver-card";
    card.innerHTML = `
      <span class="driver-emoji" aria-hidden="true">${driver.emoji || "🚌"}</span>
      <strong>${escapeHtml(name)}</strong>
      <p class="help">${escapeHtml(bio)}</p>
      <button class="btn primary" type="button">Dar propina</button>
    `;
    const normalized = {
      id: driver.id,
      name,
      bio,
      emoji: driver.emoji || "🚌",
      slug: driver.tip_link_slug || driver.slug || null,
      tip_link_slug: driver.tip_link_slug || driver.slug || null,
      public_url: driver.public_url || null,
      isMock: driver.isMock || false,
      payment_provider: driver.payment_provider || null,
      payment_url: driver.payment_url || null,
      payment_instructions: driver.payment_instructions || null,
      payment_methods: driver.payment_methods || null,
    };
    card.querySelector("button").addEventListener("click", () => showDriverPayView(normalized));
    els.driverList.appendChild(card);
  }
}

function showDriverPayView(driver) {
  selectedDriver = driver;
  selectedTipAmount = 0;

  els.driverList.classList.add("hidden");
  els.driverPayView.classList.remove("hidden");
  els.payConfirm.classList.add("hidden");

  const driverName = driver.display_name || driver.name || "";
  const driverBio = driver.bio || [driver.vehicle_info, driver.route_info].filter(Boolean).join(" · ") || "";
  els.payDriverEmoji.textContent = driver.emoji || "🚌";
  els.payDriverName.textContent = driverName;
  els.payDriverBio.textContent = driverBio;

  const methods = !driver.isMock && Array.isArray(driver.payment_methods) && driver.payment_methods.length > 0
    ? driver.payment_methods : null;
  const hasExternalPay = !driver.isMock && (!!methods || !!driver.payment_url);
  const qrData = methods
    ? methods[0].payment_url
    : (driver.payment_url || driver.public_url || `tips-la-liga-demo-${driver.tip_link_slug || driver.slug || "demo"}`);
  els.driverQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;

  const externalPaySection = els.driverPayView.querySelector(".external-pay-section");
  const demoNoticeEl = els.driverPayView.querySelector(".demo-notice");

  if (hasExternalPay) {
    if (externalPaySection) {
      externalPaySection.classList.remove("hidden");
      const instrEl = externalPaySection.querySelector(".payment-instructions");
      const methodsList = externalPaySection.querySelector(".payment-methods-list");
      const legacyBtn = externalPaySection.querySelector(".external-pay-btn");

      if (methods) {
        // Flujo Sprint 3D: multi-método
        if (instrEl) instrEl.textContent = methods[0].instructions || "";
        if (legacyBtn) legacyBtn.classList.add("hidden");
        if (methodsList) {
          methodsList.innerHTML = "";
          for (const m of methods) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `btn payment-method-btn ${m.provider}`;
            btn.textContent = providerLabel(m.provider);
            btn.addEventListener("click", () => {
              els.driverQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(m.payment_url)}`;
              if (instrEl) instrEl.textContent = m.instructions || "";
              window.open(m.payment_url, "_blank", "noopener");
            });
            methodsList.appendChild(btn);
          }
        }
      } else {
        // Flujo legacy Sprint 3A
        if (instrEl) instrEl.textContent = driver.payment_instructions || "";
        if (methodsList) methodsList.innerHTML = "";
        if (legacyBtn) {
          legacyBtn.classList.remove("hidden");
          legacyBtn.textContent = driver.payment_provider === "paypal" ? "Pagar con PayPal →" : "Pagar →";
        }
      }
    }
    els.tipChips.innerHTML = "";
    els.customAmount.classList.add("hidden");
    els.payTipBtn.classList.add("hidden");
    if (demoNoticeEl) demoNoticeEl.classList.add("hidden");
  } else {
    if (externalPaySection) externalPaySection.classList.add("hidden");
    els.customAmount.classList.remove("hidden");
    els.payTipBtn.classList.remove("hidden");
    if (demoNoticeEl) {
      demoNoticeEl.classList.remove("hidden");
      demoNoticeEl.textContent = driver.isMock
        ? "🧪 Modo demo — el pago no es real"
        : (driver.tip_link_slug || driver.slug)
          ? "🧪 Modo test — el pago es de prueba con Stripe"
          : "Este conductor aún no tiene método de pago configurado.";
    }
    els.customAmount.value = "";
    els.tipChips.innerHTML = "";
    for (const amount of TIP_CHIP_AMOUNTS) {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.type = "button";
      btn.dataset.amount = amount;
      btn.textContent = `${amount} €`;
      btn.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
        btn.classList.add("selected");
        els.customAmount.value = "";
        selectedTipAmount = amount;
        updatePayButton();
      });
      els.tipChips.appendChild(btn);
    }
    updatePayButton();
  }
}

function updatePayButton() {
  if (selectedTipAmount > 0) {
    els.payTipBtn.disabled = false;
    els.payTipBtn.textContent = `Pagar ${selectedTipAmount.toFixed(2).replace(".", ",")} €`;
  } else {
    els.payTipBtn.disabled = true;
    els.payTipBtn.textContent = "Selecciona un importe";
  }
}

async function handleTipPayment() {
  if (!selectedDriver || selectedTipAmount <= 0) return;

  els.payTipBtn.disabled = true;
  els.payTipBtn.textContent = "Procesando...";

  // Stripe aparcado — solo se activa si no hay pago externo configurado
  const slug = selectedDriver.tip_link_slug || selectedDriver.slug;
  if (slug && client && !selectedDriver.isMock && !selectedDriver.payment_url) {
    try {
      const result = await callEdgeFunction(
        "create-driver-payment-link",
        { slug, amount: Number(Number(selectedTipAmount).toFixed(2)), currency: "eur" },
        false,
      );
      if (result.session_url) {
        window.open(result.session_url, "_blank");
        updatePayButton();
        return;
      }
    } catch (err) {
      toast(err.message || "Error al crear el enlace de pago.");
      updatePayButton();
      return;
    }
  }

  const driverName = selectedDriver.display_name || selectedDriver.name || "el conductor";
  setTimeout(() => {
    els.confirmMsg.textContent = `¡Propina de ${Number(selectedTipAmount).toFixed(2).replace(".", ",")} € enviada a ${driverName}!`;
    els.payConfirm.classList.remove("hidden");
    els.payTipBtn.classList.add("hidden");
  }, 1500);
}

async function callEdgeFunction(name, body = {}, requiresAuth = true) {
  if (requiresAuth) {
    const { data, error } = await client.functions.invoke(name, { body });
    if (error) throw new Error(error.message ?? "Error en Edge Function");
    return data;
  }
  // fetch directo para endpoints públicos (sin auth): client.functions.invoke()
  // siempre inyecta el token de sesión activa, lo que rompería la llamada anónima.
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json;
}

async function loadPublicDrivers() {
  if (!client) return MOCK_DRIVERS;
  try {
    const { data, error } = await client
      .from("public_driver_profiles")
      .select("id, display_name, vehicle_info, route_info, tip_link_slug, public_url, payment_provider, payment_url, payment_instructions, payment_methods")
      .order("display_name");
    if (error || !data || data.length === 0) return MOCK_DRIVERS;
    return data;
  } catch {
    return MOCK_DRIVERS;
  }
}

async function loadDriverProfiles() {
  const { data, error } = await client
    .from("driver_payment_profiles")
    .select("id, driver_id, display_name, vehicle_info, route_info, stripe_status, charges_enabled, payouts_enabled, tip_link_slug, public_url, is_active, is_visible, payment_provider, payment_url, payment_instructions")
    .order("display_name");
  if (error) throw error;
  adminDrivers = data || [];
}

function stripeStatusLabel(status) {
  return { not_connected: "Sin conectar", pending: "Pendiente", restricted: "Restringida", active: "Activa ✓" }[status] ?? (status || "Sin conectar");
}

function renderDriverProfiles() {
  const list = els.driverProfilesList;
  list.innerHTML = "";

  if (!adminDrivers.length) {
    list.innerHTML = "<p class='help' style='padding:16px'>No hay perfiles de conductor. Insértalos desde el SQL Editor de Supabase.</p>";
    return;
  }

  for (const driver of adminDrivers) {
    const statusKey = driver.stripe_status || "not_connected";
    const hasSlug = !!driver.tip_link_slug;
    const canPay = hasSlug && !!driver.charges_enabled;
    const qrUrl = driver.public_url
      ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(driver.public_url)}`
      : null;

    const card = document.createElement("div");
    card.className = "driver-profile-card";
    card.dataset.driverId = driver.driver_id;

    const providerBadge = driver.payment_provider
      ? `<span class="payment-badge payment-${escapeHtml(driver.payment_provider)}">${driver.payment_provider === "paypal" ? "PayPal" : escapeHtml(driver.payment_provider)}</span>`
      : "";

    card.innerHTML = `
      <div class="driver-profile-header">
        <div>
          <strong>${escapeHtml(driver.display_name)}</strong>
          <p class="help">${escapeHtml([driver.vehicle_info, driver.route_info].filter(Boolean).join(" · ") || "—")}</p>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${providerBadge}
          <span class="stripe-badge stripe-${escapeHtml(statusKey)}">${escapeHtml(stripeStatusLabel(statusKey))}</span>
        </div>
      </div>
      <div class="driver-stripe-flags">
        <span>Cobros: <span class="${driver.charges_enabled ? "flag-ok" : "flag-no"}">${driver.charges_enabled ? "✓" : "✗"}</span></span>
        <span>Pagos: <span class="${driver.payouts_enabled ? "flag-ok" : "flag-no"}">${driver.payouts_enabled ? "✓" : "✗"}</span></span>
        <span>Visible: <span class="${driver.is_visible ? "flag-ok" : "flag-no"}">${driver.is_visible ? "✓" : "✗"}</span></span>
      </div>
      <div class="driver-actions">
        <button class="btn ghost" data-action="onboarding" data-driver-id="${escapeHtml(driver.driver_id)}">Onboarding</button>
        <button class="btn ghost" data-action="refresh" data-driver-id="${escapeHtml(driver.driver_id)}">Actualizar estado</button>
        <button class="btn ghost" data-action="tiplink" data-driver-id="${escapeHtml(driver.driver_id)}">Generar QR</button>
        <button class="btn ghost" data-action="testpay" data-slug="${escapeHtml(driver.tip_link_slug || "")}" ${!canPay ? "disabled" : ""} title="${!canPay ? "Completa el onboarding primero" : "Pago test de 1€"}">Test 1€</button>
        <button class="btn ghost" data-action="edit" data-driver-id="${escapeHtml(driver.driver_id)}" data-display-name="${escapeHtml(driver.display_name)}" data-vehicle="${escapeHtml(driver.vehicle_info || "")}" data-route="${escapeHtml(driver.route_info || "")}" data-visible="${driver.is_visible ? "1" : "0"}" data-payment-provider="${escapeHtml(driver.payment_provider || "")}" data-payment-url="${escapeHtml(driver.payment_url || "")}" data-payment-instructions="${escapeHtml(driver.payment_instructions || "")}">Editar</button>
        <button class="btn ghost" data-action="methods" data-driver-profile-id="${escapeHtml(driver.id)}" data-display-name="${escapeHtml(driver.display_name)}">Métodos de pago</button>
      </div>
      <div class="driver-qr-box${qrUrl ? "" : " hidden"}">
        ${qrUrl ? `<img src="${escapeHtml(qrUrl)}" alt="QR de ${escapeHtml(driver.display_name)}" width="180" height="180" loading="lazy" />` : ""}
        ${driver.public_url ? `<a href="${escapeHtml(driver.public_url)}" target="_blank" rel="noopener">${escapeHtml(driver.public_url)}</a>` : ""}
      </div>
    `;

    card.addEventListener("click", async (event) => {
      const btn = event.target.closest("[data-action]");
      if (!btn || btn.disabled) return;
      const action = btn.dataset.action;
      const dId = btn.dataset.driverId;

      if (action === "onboarding") await adminOnboarding(dId);
      if (action === "refresh")    await adminRefresh(dId);
      if (action === "tiplink")    await adminGenerateTipLink(dId);
      if (action === "testpay")    await adminTestPay(btn.dataset.slug);
      if (action === "edit")       openEditDriverDialog(btn.dataset);
      if (action === "methods")    showDriverMethodsSection(btn.dataset);
    });

    list.appendChild(card);
  }
}

async function adminOnboarding(driverId) {
  try {
    toast("Iniciando onboarding...");
    const result = await callEdgeFunction("create-driver-connect-account", { driver_id: driverId });
    if (result.onboarding_url) window.open(result.onboarding_url, "_blank");
    toast("Enlace de onboarding abierto.");
  } catch (err) {
    toast(err.message || "Error al iniciar onboarding.");
  }
}

async function adminRefresh(driverId) {
  try {
    toast("Actualizando estado Stripe...");
    await callEdgeFunction("refresh-driver-onboarding-link", { driver_id: driverId });
    await loadDriverProfiles();
    renderDriverProfiles();
    toast("Estado Stripe actualizado.");
  } catch (err) {
    toast(err.message || "Error al actualizar estado.");
  }
}

async function adminGenerateTipLink(driverId) {
  try {
    toast("Generando QR...");
    await callEdgeFunction("generate-tip-link", { driver_id: driverId });
    await loadDriverProfiles();
    renderDriverProfiles();
    toast("QR generado.");
  } catch (err) {
    toast(err.message || "Error al generar QR.");
  }
}

async function adminTestPay(slug) {
  if (!slug) { toast("Este conductor no tiene link de pago."); return; }
  try {
    toast("Creando sesión de pago test...");
    const result = await callEdgeFunction("create-driver-payment-link", { slug, amount: 1.00, currency: "eur" }, false);
    if (result.session_url) window.open(result.session_url, "_blank");
  } catch (err) {
    toast(err.message || "Error al crear pago test.");
  }
}

const VALID_PAYMENT_DOMAINS = {
  paypal:  ["https://paypal.me/", "https://www.paypal.me/", "https://paypal.com/", "https://www.paypal.com/"],
  revolut: ["https://revolut.me/", "https://app.revolut.com/"],
};

function isValidPaymentUrl(provider, url) {
  if (!url) return null;
  const domains = VALID_PAYMENT_DOMAINS[provider];
  if (!domains) return true;
  return domains.some((d) => url.startsWith(d));
}

function providerDisplayName(provider) {
  return { paypal: "PayPal", revolut: "Revolut" }[provider] || provider;
}

function providerLabel(provider) {
  return { paypal: "Pagar con PayPal →", revolut: "Pagar con Revolut →" }[provider]
    || `Pagar con ${providerDisplayName(provider)} →`;
}

function providerValidationMsg(provider) {
  return `✗ El enlace no parece de ${providerDisplayName(provider)}`;
}

let qrPreviewTimer = null;

function updatePaymentUrlPreview() {
  const provider = els.editPaymentProvider.value;
  const url = els.editPaymentUrl.value.trim();
  const valid = isValidPaymentUrl(provider, url);

  els.urlValidationHint.className = "url-validation-hint";
  if (valid === null) {
    els.urlValidationHint.textContent = "";
  } else if (valid) {
    els.urlValidationHint.classList.add("url-valid");
    els.urlValidationHint.textContent = "✓ Enlace válido";
  } else {
    els.urlValidationHint.classList.add("url-invalid");
    els.urlValidationHint.textContent = providerValidationMsg(provider);
  }

  els.testLinkBtn.disabled = !url || valid === false;

  if (provider) {
    els.editProviderBadge.textContent = providerDisplayName(provider);
    els.editProviderBadge.className = `payment-badge payment-${provider}`;
    els.editProviderBadge.classList.remove("hidden");
  } else {
    els.editProviderBadge.classList.add("hidden");
  }

  clearTimeout(qrPreviewTimer);
  if (url && valid !== false) {
    qrPreviewTimer = setTimeout(() => {
      els.editQrPreviewImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}`;
      els.editQrPreview.classList.remove("hidden");
    }, 500);
  } else {
    els.editQrPreview.classList.add("hidden");
    els.editQrPreviewImg.src = "";
  }
}

function openEditDriverDialog(dataset) {
  els.editDriverId.value = dataset.driverId;
  els.editDriverName.value = dataset.displayName || "";
  els.editDriverVehicle.value = dataset.vehicle || "";
  els.editDriverRoute.value = dataset.route || "";
  els.editDriverVisible.checked = dataset.visible === "1";
  els.editPaymentProvider.value = dataset.paymentProvider || "";
  els.editPaymentUrl.value = dataset.paymentUrl || "";
  els.editPaymentInstructions.value = dataset.paymentInstructions || "";
  updatePaymentUrlPreview();
  els.editDriverDialog.showModal();
}

async function saveEditDriver(event) {
  event.preventDefault();
  const driverId = els.editDriverId.value;
  const paymentProvider = els.editPaymentProvider.value || null;
  const paymentUrl = els.editPaymentUrl.value.trim() || null;

  if (paymentProvider === "paypal" && paymentUrl) {
    if (!isValidPaymentUrl(paymentProvider, paymentUrl)) {
      toast("El enlace de PayPal debe empezar por https://paypal.me/ o https://www.paypal.com/");
      return;
    }
  }

  const updates = {
    display_name: els.editDriverName.value.trim(),
    vehicle_info: els.editDriverVehicle.value.trim() || null,
    route_info: els.editDriverRoute.value.trim() || null,
    is_visible: els.editDriverVisible.checked,
    payment_provider: paymentProvider,
    payment_url: paymentUrl,
    payment_instructions: els.editPaymentInstructions.value.trim() || null,
  };
  if (!updates.display_name) { toast("El nombre es obligatorio."); return; }
  try {
    const { error } = await client.from("driver_payment_profiles").update(updates).eq("driver_id", driverId);
    if (error) throw error;
    els.editDriverDialog.close();
    await loadDriverProfiles();
    renderDriverProfiles();
    toast("Perfil actualizado.");
  } catch (err) {
    toast(err.message || "Error al guardar.");
  }
}

function showAdminSection() {
  els.authSection.classList.add("hidden");
  els.appSection.classList.add("hidden");
  els.tipDriverSection.classList.add("hidden");
  els.driverSelfSection.classList.add("hidden");
  els.driverMethodsSection.classList.add("hidden");
  els.adminDriversSection.classList.remove("hidden");
  loadDriverProfiles().then(renderDriverProfiles).catch((err) => toast(err.message || "Error cargando conductores."));
}

function hideAdminSection() {
  els.adminDriversSection.classList.add("hidden");
  if (currentUser) els.appSection.classList.remove("hidden");
  else els.authSection.classList.remove("hidden");
}

async function loadDriverSelfProfile() {
  if (!client || !currentUser) return;
  try {
    const { data, error } = await client
      .from("driver_payment_profiles")
      .select("id, driver_id, display_name, payment_provider, payment_url, payment_instructions, is_visible")
      .eq("driver_id", currentUser.id)
      .maybeSingle();
    if (error) throw error;
    driverSelfProfile = data || null;
  } catch {
    driverSelfProfile = null;
  }
}

async function showDriverSelfSection() {
  if (!currentUser) return;
  els.authSection.classList.add("hidden");
  els.appSection.classList.add("hidden");
  els.tipDriverSection.classList.add("hidden");
  els.adminDriversSection.classList.add("hidden");
  els.driverMethodsSection.classList.add("hidden");
  els.driverSelfSection.classList.remove("hidden");

  const p = driverSelfProfile;

  els.driverSelfContent.innerHTML = `
    <div class="driver-self-card">
      <p class="driver-self-name">${escapeHtml(p.display_name)}</p>
      <label class="checkbox-label" style="margin-bottom:16px">
        <input id="selfVisibleToggle" type="checkbox"${p.is_visible ? " checked" : ""} />
        Visible en "Dar propina"
      </label>
      <div id="selfMethodList"></div>
      <div class="disclaimer-box">
        Tips La Liga no procesa pagos. El pago se realiza fuera de la app y llega directamente a ti.
      </div>
      <div style="margin-top:12px;display:flex;justify-content:flex-end">
        <button id="closeSelfBtn" class="btn ghost" type="button">Cerrar</button>
      </div>
    </div>
  `;

  document.getElementById("closeSelfBtn").addEventListener("click", hideDriverSelfSection);
  document.getElementById("selfVisibleToggle").addEventListener("change", async (e) => {
    if (!currentUser) return;
    const { error } = await client
      .from("driver_payment_profiles")
      .update({ is_visible: e.target.checked })
      .eq("driver_id", currentUser.id);
    if (error) toast(error.message || "Error al guardar.");
    else {
      driverSelfProfile = { ...driverSelfProfile, is_visible: e.target.checked };
      toast(e.target.checked ? "Ahora eres visible." : "Ahora estás oculto.");
    }
  });

  const methods = await loadSelfMethods();
  renderMethodList(methods, document.getElementById("selfMethodList"), driverSelfProfile.id, p.display_name);
}

function hideDriverSelfSection() {
  els.driverSelfSection.classList.add("hidden");
  if (currentUser) els.appSection.classList.remove("hidden");
  else els.authSection.classList.remove("hidden");
}

let selfQrPreviewTimer = null;

function updateSelfUrlPreview() {
  const providerEl = document.getElementById("selfPaymentProvider");
  const urlEl = document.getElementById("selfPaymentUrl");
  const hintEl = document.getElementById("selfUrlValidationHint");
  const testBtn = document.getElementById("selfTestLinkBtn");
  const badgeEl = document.getElementById("selfProviderBadge");
  const qrBox = document.getElementById("selfQrPreview");
  const qrImg = document.getElementById("selfQrPreviewImg");

  if (!providerEl || !urlEl) return;

  const provider = providerEl.value;
  const url = urlEl.value.trim();
  const valid = isValidPaymentUrl(provider, url);

  hintEl.className = "url-validation-hint";
  if (valid === null) {
    hintEl.textContent = "";
  } else if (valid) {
    hintEl.classList.add("url-valid");
    hintEl.textContent = "✓ Enlace válido";
  } else {
    hintEl.classList.add("url-invalid");
    hintEl.textContent = providerValidationMsg(provider);
  }

  testBtn.disabled = !url || valid === false;

  if (provider) {
    badgeEl.textContent = providerDisplayName(provider);
    badgeEl.className = `payment-badge payment-${provider}`;
    badgeEl.classList.remove("hidden");
  } else {
    badgeEl.classList.add("hidden");
  }

  clearTimeout(selfQrPreviewTimer);
  if (url && valid !== false) {
    selfQrPreviewTimer = setTimeout(() => {
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}`;
      qrBox.classList.remove("hidden");
    }, 500);
  } else {
    qrBox.classList.add("hidden");
    qrImg.src = "";
  }
}

async function saveDriverSelfProfile(event) {
  event.preventDefault();
  if (!currentUser) return;
  const paymentProvider = document.getElementById("selfPaymentProvider").value || null;
  const paymentUrl = document.getElementById("selfPaymentUrl").value.trim() || null;

  if (paymentProvider === "paypal" && paymentUrl) {
    if (!isValidPaymentUrl(paymentProvider, paymentUrl)) {
      toast("El enlace de PayPal debe empezar por https://paypal.me/ o https://www.paypal.com/");
      return;
    }
  }

  const updates = {
    payment_provider: paymentProvider,
    payment_url: paymentUrl,
    payment_instructions: document.getElementById("selfPaymentInstructions").value.trim() || null,
    is_visible: document.getElementById("selfDriverVisible").checked,
  };

  try {
    const { error } = await client
      .from("driver_payment_profiles")
      .update(updates)
      .eq("driver_id", currentUser.id);
    if (error) throw error;
    driverSelfProfile = { ...driverSelfProfile, ...updates };
    hideDriverSelfSection();
    toast("Enlace guardado.");
  } catch (err) {
    toast(err.message || "Error al guardar.");
  }
}

async function loadDriverMethods(driverProfileId) {
  const { data, error } = await client
    .from("driver_payment_methods")
    .select("id, provider, payment_url, instructions, is_enabled, is_verified, display_order")
    .eq("driver_profile_id", driverProfileId)
    .order("display_order")
    .order("created_at");
  if (error) throw error;
  return data || [];
}

async function loadSelfMethods() {
  if (!client || !currentUser || !driverSelfProfile?.id) return [];
  try { return await loadDriverMethods(driverSelfProfile.id); }
  catch { return []; }
}

async function insertDriverMethod(driverProfileId, payload) {
  const { error } = await client
    .from("driver_payment_methods")
    .insert({ driver_profile_id: driverProfileId, ...payload });
  if (error) throw error;
}

async function updateDriverMethod(methodId, payload) {
  const { error } = await client
    .from("driver_payment_methods")
    .update(payload)
    .eq("id", methodId);
  if (error) throw error;
}

async function deleteDriverMethod(methodId) {
  const { error } = await client
    .from("driver_payment_methods")
    .delete()
    .eq("id", methodId);
  if (error) throw error;
}

function renderMethodList(methods, container, driverId, driverName) {
  container.innerHTML = "";

  if (!methods.length) {
    container.innerHTML = "<p class='help' style='margin-bottom:12px'>Sin métodos configurados.</p>";
  }

  for (const m of methods) {
    const item = document.createElement("div");
    item.className = "method-list-item";
    item.innerHTML = `
      <span class="payment-badge payment-${escapeHtml(m.provider)}">${escapeHtml(providerDisplayName(m.provider))}</span>
      <span class="method-url help">${escapeHtml(m.payment_url)}</span>
      <span class="${m.is_enabled ? "flag-ok" : "flag-no"}" style="font-size:12px">${m.is_enabled ? "Activo" : "Inactivo"}</span>
      <div class="method-actions">
        <button class="btn ghost" data-mid="${escapeHtml(m.id)}" data-maction="edit-method">Editar</button>
        <button class="btn danger" data-mid="${escapeHtml(m.id)}" data-maction="delete-method">Eliminar</button>
      </div>
    `;
    container.appendChild(item);
  }

  const addBtn = document.createElement("button");
  addBtn.className = "btn ghost";
  addBtn.type = "button";
  addBtn.textContent = "+ Añadir método";
  addBtn.style.marginTop = "10px";
  addBtn.addEventListener("click", () => showMethodForm(null, driverId, container, driverName));
  container.appendChild(addBtn);

  container.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-maction]");
    if (!btn) return;
    const mid = btn.dataset.mid;
    if (btn.dataset.maction === "delete-method") {
      if (!confirm("¿Eliminar este método de pago?")) return;
      try {
        await deleteDriverMethod(mid);
        const updated = await loadDriverMethods(driverId);
        renderMethodList(updated, container, driverId, driverName);
        toast("Método eliminado.");
      } catch (err) { toast(err.message || "Error al eliminar."); }
    }
    if (btn.dataset.maction === "edit-method") {
      const methods = await loadDriverMethods(driverId);
      const existing = methods.find((m) => m.id === mid);
      if (existing) showMethodForm(existing, driverId, container, driverName);
    }
  });
}

let methodFormPreviewTimer = null;

function updateMethodFormPreview() {
  const providerEl = document.getElementById("mProvider");
  const urlEl = document.getElementById("mUrl");
  const hintEl = document.getElementById("mUrlHint");
  const testBtn = document.getElementById("mTestBtn");
  const badgeEl = document.getElementById("mProviderBadge");
  const qrBox = document.getElementById("mQrPreview");
  const qrImg = document.getElementById("mQrImg");
  if (!providerEl || !urlEl) return;

  const provider = providerEl.value;
  const url = urlEl.value.trim();
  const valid = isValidPaymentUrl(provider, url);

  hintEl.className = "url-validation-hint";
  if (valid === null) hintEl.textContent = "";
  else if (valid) { hintEl.classList.add("url-valid"); hintEl.textContent = "✓ Enlace válido"; }
  else { hintEl.classList.add("url-invalid"); hintEl.textContent = providerValidationMsg(provider); }

  testBtn.disabled = !url || valid === false;

  if (provider) {
    badgeEl.textContent = providerDisplayName(provider);
    badgeEl.className = `payment-badge payment-${provider}`;
    badgeEl.classList.remove("hidden");
  } else {
    badgeEl.classList.add("hidden");
  }

  clearTimeout(methodFormPreviewTimer);
  if (url && valid !== false) {
    methodFormPreviewTimer = setTimeout(() => {
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}`;
      qrBox.classList.remove("hidden");
    }, 500);
  } else {
    qrBox.classList.add("hidden");
    qrImg.src = "";
  }
}

function showMethodForm(existing, driverId, listContainer, driverName) {
  listContainer.querySelectorAll(".method-form-wrapper").forEach((el) => el.remove());

  const wrapper = document.createElement("div");
  wrapper.className = "method-form-wrapper driver-self-card";
  wrapper.style.marginTop = "16px";
  wrapper.innerHTML = `
    <form id="methodForm" class="form compact">
      <label for="mProvider">Proveedor</label>
      <div class="provider-select-row">
        <select id="mProvider">
          <option value="paypal"${existing?.provider === "paypal" ? " selected" : ""}>PayPal</option>
          <option value="revolut"${existing?.provider === "revolut" ? " selected" : ""}>Revolut</option>
        </select>
        <span id="mProviderBadge" class="payment-badge payment-none hidden"></span>
      </div>
      <label for="mUrl">Enlace de pago</label>
      <input id="mUrl" type="url" maxlength="300"
             placeholder="https://paypal.me/... o https://revolut.me/..."
             value="${escapeHtml(existing?.payment_url || "")}" />
      <div class="url-validation-hint" id="mUrlHint"></div>
      <div class="url-test-row">
        <button id="mTestBtn" class="btn ghost btn-sm" type="button" disabled>Probar →</button>
      </div>
      <div class="qr-preview-box hidden" id="mQrPreview">
        <img id="mQrImg" src="" alt="QR preview" width="120" height="120" loading="lazy" />
        <p class="help" style="font-size:11px;margin:0">Previsualización del QR</p>
      </div>
      <label for="mInstructions">Instrucciones (opcional)</label>
      <textarea id="mInstructions" maxlength="200" rows="2" style="resize:vertical">${escapeHtml(existing?.instructions || "")}</textarea>
      <label class="checkbox-label">
        <input id="mIsActive" type="checkbox"${existing?.is_enabled !== false ? " checked" : ""} />
        Activo
      </label>
      <div class="dialog-actions" style="margin-top:8px">
        <button id="mCancelBtn" class="btn ghost" type="button">Cancelar</button>
        <button class="btn primary" type="submit">${existing ? "Guardar cambios" : "Añadir método"}</button>
      </div>
    </form>
  `;

  listContainer.appendChild(wrapper);

  document.getElementById("mProvider").addEventListener("change", updateMethodFormPreview);
  document.getElementById("mUrl").addEventListener("input", updateMethodFormPreview);
  document.getElementById("mTestBtn").addEventListener("click", () => {
    const url = document.getElementById("mUrl").value.trim();
    if (url) window.open(url, "_blank", "noopener");
  });
  document.getElementById("mCancelBtn").addEventListener("click", () => wrapper.remove());
  document.getElementById("methodForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const provider = document.getElementById("mProvider").value;
    const url = document.getElementById("mUrl").value.trim();
    if (!url) { toast("La URL es obligatoria."); return; }
    if (!isValidPaymentUrl(provider, url)) {
      toast(`La URL no es válida para ${providerDisplayName(provider)}.`);
      return;
    }
    const payload = {
      provider,
      payment_url: url,
      instructions: document.getElementById("mInstructions").value.trim() || null,
      is_enabled: document.getElementById("mIsActive").checked,
    };
    try {
      if (existing) await updateDriverMethod(existing.id, payload);
      else await insertDriverMethod(driverId, payload);
      const updated = await loadDriverMethods(driverId);
      renderMethodList(updated, listContainer, driverId, driverName);
      wrapper.remove();
      toast(existing ? "Método actualizado." : "Método añadido.");
    } catch (err) { toast(err.message || "Error al guardar."); }
  });

  updateMethodFormPreview();
}

async function showDriverMethodsSection(driverDataset) {
  if (!currentUser) return;
  currentAdminMethodsDriverId = driverDataset.driverProfileId;
  els.authSection.classList.add("hidden");
  els.appSection.classList.add("hidden");
  els.tipDriverSection.classList.add("hidden");
  els.adminDriversSection.classList.add("hidden");
  els.driverSelfSection.classList.add("hidden");
  els.driverMethodsSection.classList.remove("hidden");

  els.driverMethodsContent.innerHTML = "<p class='help'>Cargando...</p>";
  try {
    const methods = await loadDriverMethods(driverDataset.driverProfileId);
    renderMethodList(methods, els.driverMethodsContent, driverDataset.driverProfileId, driverDataset.displayName);
  } catch (err) {
    els.driverMethodsContent.innerHTML = `<p class='help'>${escapeHtml(err.message || "Error cargando métodos.")}</p>`;
  }
}

function hideDriverMethodsSection() {
  els.driverMethodsSection.classList.add("hidden");
  showAdminSection();
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
