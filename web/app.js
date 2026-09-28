"use strict";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const diagramCanvas = document.getElementById("diagramCanvas");
const dctx = diagramCanvas.getContext("2d");
const toast = document.getElementById("toast");
const dynamicsCanvas = document.getElementById("dynamicsCanvas");
const dynamicsCtx = dynamicsCanvas ? dynamicsCanvas.getContext("2d") : null;
const dynamicsToast = document.getElementById("dynamicsToast");

const els = {
  welcomeScreen: document.getElementById("welcomeScreen"),
  announcementButton: document.getElementById("announcementButton"),
  announcementDialog: document.getElementById("announcementDialog"),
  announcementCloseButton: document.getElementById("announcementCloseButton"),
  appShell: document.getElementById("appShell"),
  authChoicePanel: document.getElementById("authChoicePanel"),
  showLoginButton: document.getElementById("showLoginButton"),
  showRegisterButton: document.getElementById("showRegisterButton"),
  authPanel: document.getElementById("authPanel"),
  loginCard: document.getElementById("loginCard"),
  registerCard: document.getElementById("registerCard"),
  startPanel: document.getElementById("startPanel"),
  authMessage: document.getElementById("authMessage"),
  legacyProfileNotice: document.getElementById("legacyProfileNotice"),
  loginUsername: document.getElementById("loginUsername"),
  loginPassword: document.getElementById("loginPassword"),
  loginSubmit: document.getElementById("loginSubmit"),
  internalLoginEntry: document.getElementById("internalLoginEntry"),
  registerUsername: document.getElementById("registerUsername"),
  registerPassword: document.getElementById("registerPassword"),
  registerPasswordConfirm: document.getElementById("registerPasswordConfirm"),
  registerNickname: document.getElementById("registerNickname"),
  acceptTerms: document.getElementById("acceptTerms"),
  acceptPrivacy: document.getElementById("acceptPrivacy"),
  registerAvatar: document.getElementById("registerAvatar"),
  registerAvatarPreview: document.getElementById("registerAvatarPreview"),
  registerSubmit: document.getElementById("registerSubmit"),
  startAppButton: document.getElementById("startAppButton"),
  moduleChoicePanel: document.getElementById("moduleChoicePanel"),
  staticModuleButton: document.getElementById("staticModuleButton"),
  dynamicsModuleButton: document.getElementById("dynamicsModuleButton"),
  staticActiveButton: document.getElementById("staticActiveButton"),
  staticToDynamicsButton: document.getElementById("staticToDynamicsButton"),
  welcomeLogoutButton: document.getElementById("welcomeLogoutButton"),
  mainUserAvatar: document.getElementById("mainUserAvatar"),
  mainUserName: document.getElementById("mainUserName"),
  mainUserTier: document.getElementById("mainUserTier"),
  benefitsButton: document.getElementById("benefitsButton"),
  dynamicsShell: document.getElementById("dynamicsShell"),
  dynamicsUserAvatar: document.getElementById("dynamicsUserAvatar"),
  dynamicsUserName: document.getElementById("dynamicsUserName"),
  dynamicsUserTier: document.getElementById("dynamicsUserTier"),
  dynamicsBenefitsButton: document.getElementById("dynamicsBenefitsButton"),
  dynamicsSettingsButton: document.getElementById("dynamicsSettingsButton"),
  dynamicsToStaticButton: document.getElementById("dynamicsToStaticButton"),
  dynamicsBuildKind: document.getElementById("dynamicsBuildKind"),
  dynamicsCustomMode: document.getElementById("dynamicsCustomMode"),
  dynamicsPlaceButton: document.getElementById("dynamicsPlaceButton"),
  dynamicsFieldButton: document.getElementById("dynamicsFieldButton"),
  dynamicsForceButton: document.getElementById("dynamicsForceButton"),
  dynamicsFieldStatus: document.getElementById("dynamicsFieldStatus"),
  dynamicsFieldCancelButton: document.getElementById("dynamicsFieldCancelButton"),
  dynamicsClearButton: document.getElementById("dynamicsClearButton"),
  dynamicsUndoButton: document.getElementById("dynamicsUndoButton"),
  dynamicsRedoButton: document.getElementById("dynamicsRedoButton"),
  dynamicsDeleteButton: document.getElementById("dynamicsDeleteButton"),
  dynamicsOpenButton: document.getElementById("dynamicsOpenButton"),
  dynamicsSaveButton: document.getElementById("dynamicsSaveButton"),
  dynamicsReportButton: document.getElementById("dynamicsReportButton"),
  dynamicsFileInput: document.getElementById("dynamicsFileInput"),
  dynamicsSolveDialog: document.getElementById("dynamicsSolveDialog"),
  runDynamicsSolveButton: document.getElementById("runDynamicsSolveButton"),
  dynamicsFieldDialog: document.getElementById("dynamicsFieldDialog"),
  dynamicsEnvironment: document.getElementById("dynamicsEnvironment"),
  dynamicsFieldMode: document.getElementById("dynamicsFieldMode"),
  dynamicsFieldExpressionFields: document.getElementById("dynamicsFieldExpressionFields"),
  dynamicsFieldExpressionXLabel: document.getElementById("dynamicsFieldExpressionXLabel"),
  dynamicsFieldExpressionX: document.getElementById("dynamicsFieldExpressionX"),
  dynamicsFieldExpressionYField: document.getElementById("dynamicsFieldExpressionYField"),
  dynamicsFieldExpressionY: document.getElementById("dynamicsFieldExpressionY"),
  dynamicsFieldMagnitude: document.getElementById("dynamicsFieldMagnitude"),
  dynamicsFieldDirectionPreset: document.getElementById("dynamicsFieldDirectionPreset"),
  dynamicsVectorDirectionField: document.getElementById("dynamicsVectorDirectionField"),
  dynamicsFieldAngleField: document.getElementById("dynamicsFieldAngleField"),
  dynamicsFieldAngle: document.getElementById("dynamicsFieldAngle"),
  dynamicsMagneticDirectionField: document.getElementById("dynamicsMagneticDirectionField"),
  dynamicsMagneticDirection: document.getElementById("dynamicsMagneticDirection"),
  dynamicsFieldRange: document.getElementById("dynamicsFieldRange"),
  dynamicsFieldCenterX: document.getElementById("dynamicsFieldCenterX"),
  dynamicsFieldCenterY: document.getElementById("dynamicsFieldCenterY"),
  dynamicsRectangleRangeFields: document.getElementById("dynamicsRectangleRangeFields"),
  dynamicsFieldWidth: document.getElementById("dynamicsFieldWidth"),
  dynamicsFieldHeight: document.getElementById("dynamicsFieldHeight"),
  dynamicsCircleRangeField: document.getElementById("dynamicsCircleRangeField"),
  dynamicsFieldRadius: document.getElementById("dynamicsFieldRadius"),
  dynamicsFieldMessage: document.getElementById("dynamicsFieldMessage"),
  dynamicsFieldNumericApplyButton: document.getElementById("dynamicsFieldNumericApplyButton"),
  dynamicsFieldApplyButton: document.getElementById("dynamicsFieldApplyButton"),
  dynamicsForceDialog: document.getElementById("dynamicsForceDialog"),
  dynamicsForceTarget: document.getElementById("dynamicsForceTarget"),
  dynamicsForceType: document.getElementById("dynamicsForceType"),
  dynamicsForceMagnitudeLabel: document.getElementById("dynamicsForceMagnitudeLabel"),
  dynamicsForceMagnitude: document.getElementById("dynamicsForceMagnitude"),
  dynamicsForceDirectionPreset: document.getElementById("dynamicsForceDirectionPreset"),
  dynamicsForceAngle: document.getElementById("dynamicsForceAngle"),
  dynamicsForceStartField: document.getElementById("dynamicsForceStartField"),
  dynamicsForceStart: document.getElementById("dynamicsForceStart"),
  dynamicsForceDurationField: document.getElementById("dynamicsForceDurationField"),
  dynamicsForceDuration: document.getElementById("dynamicsForceDuration"),
  dynamicsForcePointFrame: document.getElementById("dynamicsForcePointFrame"),
  dynamicsForcePointX: document.getElementById("dynamicsForcePointX"),
  dynamicsForcePointY: document.getElementById("dynamicsForcePointY"),
  dynamicsForceMessage: document.getElementById("dynamicsForceMessage"),
  dynamicsForceApplyButton: document.getElementById("dynamicsForceApplyButton"),
  dynamicsRigidToggle: document.getElementById("dynamicsRigidToggle"),
  dynamicsGroundToggle: document.getElementById("dynamicsGroundToggle"),
  dynamicsSolveButton: document.getElementById("dynamicsSolveButton"),
  dynamicsMass: document.getElementById("dynamicsMass"),
  dynamicsDensity: document.getElementById("dynamicsDensity"),
  dynamicsCharge: document.getElementById("dynamicsCharge"),
  dynamicsSizeALabel: document.getElementById("dynamicsSizeALabel"),
  dynamicsSizeBLabel: document.getElementById("dynamicsSizeBLabel"),
  dynamicsSizeCLabel: document.getElementById("dynamicsSizeCLabel"),
  dynamicsSizeA: document.getElementById("dynamicsSizeA"),
  dynamicsSizeB: document.getElementById("dynamicsSizeB"),
  dynamicsSizeC: document.getElementById("dynamicsSizeC"),
  dynamicsMaterialE: document.getElementById("dynamicsMaterialE"),
  dynamicsShapeEquation: document.getElementById("dynamicsShapeEquation"),
  dynamicsX0: document.getElementById("dynamicsX0"),
  dynamicsY0: document.getElementById("dynamicsY0"),
  dynamicsVx0: document.getElementById("dynamicsVx0"),
  dynamicsVy0: document.getElementById("dynamicsVy0"),
  dynamicsTheta0: document.getElementById("dynamicsTheta0"),
  dynamicsOmega0: document.getElementById("dynamicsOmega0"),
  dynamicsDuration: document.getElementById("dynamicsDuration"),
  dynamicsTimeStep: document.getElementById("dynamicsTimeStep"),
  dynamicsOptionInputs: [...document.querySelectorAll("input[name='dynamicsOption']")],
  dynamicsResultText: document.getElementById("dynamicsResultText"),
  dynamicsObjectPanelTitle: document.getElementById("dynamicsObjectPanelTitle"),
  dynamicsObjectCount: document.getElementById("dynamicsObjectCount"),
  dynamicsFieldCount: document.getElementById("dynamicsFieldCount"),
  dynamicsForceCount: document.getElementById("dynamicsForceCount"),
  dynamicsTrackCount: document.getElementById("dynamicsTrackCount"),
  dynamicsObjectList: document.getElementById("dynamicsObjectList"),
  dynamicsFieldList: document.getElementById("dynamicsFieldList"),
  dynamicsForceList: document.getElementById("dynamicsForceList"),
  dynamicsTrackList: document.getElementById("dynamicsTrackList"),
  settingsButton: document.getElementById("settingsButton"),
  settingsDialog: document.getElementById("settingsDialog"),
  fontSizeSelect: document.getElementById("fontSizeSelect"),
  settingsNickname: document.getElementById("settingsNickname"),
  settingsAvatar: document.getElementById("settingsAvatar"),
  settingsAvatarPreview: document.getElementById("settingsAvatarPreview"),
  saveNicknameButton: document.getElementById("saveNicknameButton"),
  saveAvatarButton: document.getElementById("saveAvatarButton"),
  settingsCurrentPassword: document.getElementById("settingsCurrentPassword"),
  settingsNewPassword: document.getElementById("settingsNewPassword"),
  settingsNewPasswordConfirm: document.getElementById("settingsNewPasswordConfirm"),
  savePasswordButton: document.getElementById("savePasswordButton"),
  logoutButton: document.getElementById("logoutButton"),
  settingsMessage: document.getElementById("settingsMessage"),
  entitlementsDialog: document.getElementById("entitlementsDialog"),
  entitlementCurrentLabel: document.getElementById("entitlementCurrentLabel"),
  entitlementExpiry: document.getElementById("entitlementExpiry"),
  entitlementPlanList: document.getElementById("entitlementPlanList"),
  internalInviteCode: document.getElementById("internalInviteCode"),
  redeemInternalButton: document.getElementById("redeemInternalButton"),
  pinnWaitlistStatus: document.getElementById("pinnWaitlistStatus"),
  joinPinnWaitlistButton: document.getElementById("joinPinnWaitlistButton"),
  entitlementsMessage: document.getElementById("entitlementsMessage"),
  toolButtons: [...document.querySelectorAll(".tool-button")],
  selectionMode: document.getElementById("selectionMode"),
  supportPreset: document.getElementById("supportPreset"),
  gridToggle: document.getElementById("gridToggle"),
  snapToggle: document.getElementById("snapToggle"),
  orthogonalToggle: document.getElementById("orthogonalToggle"),
  themeButton: document.getElementById("themeButton"),
  solverBackend: document.getElementById("solverBackend"),
  elementType: document.getElementById("elementType"),
  momentReleaseI: document.getElementById("momentReleaseI"),
  momentReleaseJ: document.getElementById("momentReleaseJ"),
  elementLength: document.getElementById("elementLength"),
  setElementLengthButton: document.getElementById("setElementLengthButton"),
  materialE: document.getElementById("materialE"),
  sectionA: document.getElementById("sectionA"),
  sectionI: document.getElementById("sectionI"),
  deformScale: document.getElementById("deformScale"),
  deformedToggle: document.getElementById("deformedToggle"),
  momentToggle: document.getElementById("momentToggle"),
  shearToggle: document.getElementById("shearToggle"),
  axialToggle: document.getElementById("axialToggle"),
  stressStrainToggle: document.getElementById("stressStrainToggle"),
  nodeCount: document.getElementById("nodeCount"),
  elementCount: document.getElementById("elementCount"),
  loadCount: document.getElementById("loadCount"),
  selectionInfo: document.getElementById("selectionInfo"),
  resultText: document.getElementById("resultText"),
  solveButton: document.getElementById("solveButton"),
  saveButton: document.getElementById("saveButton"),
  reportButton: document.getElementById("reportButton"),
  openButton: document.getElementById("openButton"),
  fileInput: document.getElementById("fileInput"),
  undoButton: document.getElementById("undoButton"),
  redoButton: document.getElementById("redoButton"),
  deleteButton: document.getElementById("deleteButton"),
  elementDialog: document.getElementById("elementDialog"),
  elementGeometry: document.getElementById("elementGeometry"),
  sectionShape: document.getElementById("sectionShape"),
  sectionRadius: document.getElementById("sectionRadius"),
  shapeInertia: document.getElementById("shapeInertia"),
  shapeInertiaProduct: document.getElementById("shapeInertiaProduct"),
  shapeStaticMoment: document.getElementById("shapeStaticMoment"),
  teeDepth: document.getElementById("teeDepth"),
  elementCurvature: document.getElementById("elementCurvature"),
  elementArcAngle: document.getElementById("elementArcAngle"),
  applyElementSettingsButton: document.getElementById("applyElementSettingsButton"),
  loadDialog: document.getElementById("loadDialog"),
  concentratedLoadPanel: document.getElementById("concentratedLoadPanel"),
  pointMomentPanel: document.getElementById("pointMomentPanel"),
  distributedLoadPanel: document.getElementById("distributedLoadPanel"),
  distributedMomentPanel: document.getElementById("distributedMomentPanel"),
  loadModeRadios: [...document.querySelectorAll("input[name='loadMode']")],
  loadDirectionButtons: [...document.querySelectorAll("[data-load-direction]")],
  pointLoadMagnitude: document.getElementById("pointLoadMagnitude"),
  pointLoadAngle: document.getElementById("pointLoadAngle"),
  pointLoadMoment: document.getElementById("pointLoadMoment"),
  pointMomentOnly: document.getElementById("pointMomentOnly"),
  distributedShape: document.getElementById("distributedShape"),
  distributedDirection: document.getElementById("distributedDirection"),
  distributedAngle: document.getElementById("distributedAngle"),
  distributedQi: document.getElementById("distributedQi"),
  distributedQj: document.getElementById("distributedQj"),
  distributedCoefficients: document.getElementById("distributedCoefficients"),
  distributedMoment: document.getElementById("distributedMoment"),
  applyLoadToSelectionButton: document.getElementById("applyLoadToSelectionButton"),
  solveDialog: document.getElementById("solveDialog"),
  runSolveButton: document.getElementById("runSolveButton"),
  supportDialog: document.getElementById("supportDialog"),
  supportAngle: document.getElementById("supportAngle"),
  applySupportSettingsButton: document.getElementById("applySupportSettingsButton"),
  solidifySupportNodeButton: document.getElementById("solidifySupportNodeButton"),
  nodeDialog: document.getElementById("nodeDialog"),
  solidifyNodeButton: document.getElementById("solidifyNodeButton"),
};

const state = {
  tool: "select",
  nodes: [],
  elements: [],
  loads: [],
  elementLoads: [],
  selected: null,
  selection: { nodes: [], elements: [] },
  pendingNode: null,
  pointer: null,
  drag: null,
  pan: null,
  rotateSupport: null,
  freeformDraw: null,
  dialogNodeId: null,
  pendingAvatar: "",
  pendingSettingsAvatar: "",
  currentUser: null,
  entitlements: null,
  result: null,
  expansion: {},
  lastProject: null,
  lastScope: "whole",
  projectMetadata: { name: "canvas_project" },
  projectMaterials: [{ id: "steel", E: "200 GPa", nu: 0.3 }],
  projectSections: [{ id: "default", A: "10000 mm^2", I: "80000000 mm^4" }],
  nodeSeq: 1,
  elementSeq: 1,
  undoStack: [],
  redoStack: [],
  origin: { x: 80, y: 620 },
  pxPerMeter: 90,
  minPxPerMeter: 18,
  maxPxPerMeter: 420,
  gridSize: 0.5,
  loadMode: "concentrated",
  loadDirection: "down",
  elementGeometry: "straight",
  elementDefaults: {
    sectionShape: "circle",
    sectionRadius: "50 mm",
    inertia: "80000000 mm^4",
    inertiaProduct: "0 mm^4",
    staticMoment: "0 mm^3",
    teeDepth: "0.35 m",
    curvature: 0.25,
    arcAngle: 45,
  },
  solveOptions: ["determinacy", "system", "internal", "moment", "shear", "axial", "displacement", "reaction", "danger"],
  activeModule: "welcome",
  dynamics: {
    model: "independent-particle2d",
    objects: [],
    fields: [],
    forces: [],
    grounds: [],
    tracks: [],
    constraints: [],
    simulationSettings: {},
    objectSeq: 1,
    fieldSeq: 1,
    forceSeq: 1,
    selectedObjectId: null,
    object: null,
    field: null,
    result: null,
    animationId: null,
    animationStart: 0,
    paintPath: [],
    painting: false,
    placementMode: false,
    pan: null,
    fieldPlacement: DynamicsFieldPlacement.createPlacementState(),
    undoStack: [],
    redoStack: [],
    scale: 58,
    origin: { x: 80, y: 520 },
    viewportInitialized: false,
  },
};

const LEGACY_AUTH_USERS_KEY = "cms_users";
const LEGACY_AUTH_CURRENT_KEY = "cms_current_user";
const AUTH_FONT_SIZE_KEY = "cms_font_size";
const DEFAULT_USER_AVATAR = "";
const authClient = AuthClient.create();
const USER_TIER_LABELS = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
  internal_tester: "Internal Tester",
  admin: "Admin",
};
let announcementReturnFocus = null;

function openAnnouncement() {
  if (!els.announcementDialog || els.announcementDialog.open) return;
  announcementReturnFocus = document.activeElement;
  els.announcementDialog.showModal();
  requestAnimationFrame(() => els.announcementCloseButton?.focus());
}

function closeAnnouncement() {
  if (els.announcementDialog?.open) els.announcementDialog.close();
}

function restoreAnnouncementFocus() {
  if (announcementReturnFocus instanceof HTMLElement) announcementReturnFocus.focus();
  announcementReturnFocus = null;
}

function setAuthMessage(message) {
  els.authMessage.textContent = message || "";
}

function setSettingsMessage(message) {
  els.settingsMessage.textContent = message || "";
}

function normalizedFontSize(value) {
  const size = String(value || "14");
  return ["13", "14", "16", "18"].includes(size) ? size : "14";
}

function applyFontSize(value, persist = true) {
  const size = normalizedFontSize(value);
  document.documentElement.style.setProperty("--ui-font-size", `${size}px`);
  els.fontSizeSelect.value = size;
  if (persist) localStorage.setItem(AUTH_FONT_SIZE_KEY, size);
}

function showDefaultAvatar(target) {
  target.classList.add("default-avatar");
  target.textContent = "CM";
}

function showAvatar(target, avatarData) {
  target.replaceChildren();
  target.classList.add("default-avatar");
  if (avatarData) {
    const image = document.createElement("img");
    image.src = avatarData;
    image.alt = "用户头像";
    image.addEventListener("error", () => showDefaultAvatar(target), { once: true });
    target.appendChild(image);
  } else {
    target.textContent = "CM";
  }
}

function userAvatar(user) {
  return (user && user.avatarUrl) || DEFAULT_USER_AVATAR;
}

function refreshTierDisplay(target, user) {
  if (!target || !user) {
    if (target) {
      target.textContent = "";
      target.removeAttribute("data-role");
      target.classList.add("hidden");
    }
    return;
  }
  const role = String(user.role || "free");
  target.textContent = state.entitlements?.label || USER_TIER_LABELS[role] || "Free";
  target.dataset.role = role;
  target.classList.remove("hidden");
}

function refreshAvatarRole(target, user) {
  if (!target) return;
  target.classList.toggle("internal-tester-avatar", user?.role === "internal_tester");
}

function refreshCurrentUserDisplay(user = state.currentUser) {
  if (!user) {
    els.mainUserName.textContent = "未登录";
    els.mainUserName.title = "";
    showAvatar(els.mainUserAvatar, DEFAULT_USER_AVATAR);
    refreshTierDisplay(els.mainUserTier, null);
    refreshAvatarRole(els.mainUserAvatar, null);
    if (els.dynamicsUserName && els.dynamicsUserAvatar) {
      els.dynamicsUserName.textContent = "未登录";
      els.dynamicsUserName.title = "";
      showAvatar(els.dynamicsUserAvatar, DEFAULT_USER_AVATAR);
      refreshTierDisplay(els.dynamicsUserTier, null);
      refreshAvatarRole(els.dynamicsUserAvatar, null);
    }
    return;
  }
  const displayName = user.displayName || user.username;
  els.mainUserName.textContent = displayName;
  els.mainUserName.title = user.displayName ? `${user.displayName} (${user.username})` : user.username;
  showAvatar(els.mainUserAvatar, userAvatar(user));
  refreshTierDisplay(els.mainUserTier, user);
  refreshAvatarRole(els.mainUserAvatar, user);
  if (els.dynamicsUserName && els.dynamicsUserAvatar) {
    els.dynamicsUserName.textContent = displayName;
    els.dynamicsUserName.title = user.displayName ? `${user.displayName} (${user.username})` : user.username;
    showAvatar(els.dynamicsUserAvatar, userAvatar(user));
    refreshTierDisplay(els.dynamicsUserTier, user);
    refreshAvatarRole(els.dynamicsUserAvatar, user);
  }
}

function hasLegacyAuthData() {
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key === LEGACY_AUTH_USERS_KEY || key === LEGACY_AUTH_CURRENT_KEY) return true;
  }
  return false;
}

function clearLegacyAuthData() {
  localStorage.removeItem(LEGACY_AUTH_USERS_KEY);
  localStorage.removeItem(LEGACY_AUTH_CURRENT_KEY);
}

function updateMigrationNotice() {
  if (!els.legacyProfileNotice) return;
  els.legacyProfileNotice.classList.toggle("hidden", !hasLegacyAuthData());
}

function setButtonBusy(button, busy, label) {
  if (!button) return;
  if (busy) {
    button.dataset.idleLabel = button.textContent;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.idleLabel || button.textContent;
    button.disabled = false;
    delete button.dataset.idleLabel;
  }
}

function authErrorMessage(error) {
  if (error instanceof AuthClient.AuthClientError) return error.message;
  return "账户服务暂时不可用，请稍后再试。";
}

function setEntitlementsMessage(message) {
  if (els.entitlementsMessage) els.entitlementsMessage.textContent = message || "";
}

function entitlementExpiryText(value) {
  if (!value) return "";
  const expiresAt = new Date(value);
  if (Number.isNaN(expiresAt.getTime())) return "内部测试资格有效期由服务器管理。";
  return `内部测试资格有效至 ${new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(expiresAt)}`;
}

function renderEntitlements() {
  if (!els.entitlementPlanList) return;
  const view = state.entitlements;
  els.entitlementPlanList.replaceChildren();
  els.entitlementCurrentLabel.textContent = view?.label || "正在读取……";
  els.entitlementExpiry.textContent = entitlementExpiryText(view?.internalExpiresAt);

  const plans = Array.isArray(view?.plans) ? view.plans : [];
  if (!plans.length) {
    const empty = document.createElement("p");
    empty.className = "entitlement-muted";
    empty.textContent = view ? "套餐信息暂不可用。" : "正在从服务器读取套餐信息……";
    els.entitlementPlanList.appendChild(empty);
  }
  for (const plan of plans) {
    const card = document.createElement("article");
    card.className = "entitlement-plan";
    if (plan.current) card.classList.add("current");

    const title = document.createElement("h4");
    title.textContent = plan.displayName || plan.name || "套餐";
    const description = document.createElement("p");
    description.textContent = plan.description || "权益以服务端当前配置为准。";
    const status = document.createElement("span");
    status.className = "entitlement-plan-status";
    status.textContent = plan.current
      ? "当前套餐"
      : plan.purchaseAvailable
        ? "可申请"
        : "尚未开放购买";
    card.append(title, description, status);
    els.entitlementPlanList.appendChild(card);
  }

  const isInternal = view?.role === "internal_tester";
  els.internalInviteCode.disabled = isInternal;
  els.redeemInternalButton.disabled = isInternal;
  els.redeemInternalButton.textContent = isInternal ? "已启用" : "验证并启用";

  const waiting = view?.pinnStatus === "waiting";
  els.pinnWaitlistStatus.textContent = waiting ? "已加入等待名单" : "尚未加入等待名单";
  els.joinPinnWaitlistButton.disabled = waiting || !view;
  els.joinPinnWaitlistButton.textContent = waiting ? "已加入" : "加入等待名单";
}

function applyEntitlementPayload(payload) {
  if (!payload || typeof payload !== "object") return;
  state.entitlements = {
    role: String(payload.role || "free"),
    label: String(payload.label || "Free"),
    entitlements: Array.isArray(payload.entitlements) ? [...payload.entitlements] : [],
    plans: Array.isArray(payload.plans) ? payload.plans.map((plan) => ({ ...plan })) : [],
    internalExpiresAt: payload.internalExpiresAt || null,
    pinnStatus: payload.pinnStatus || null,
  };
  if (payload.user && typeof payload.user === "object") {
    state.currentUser = { ...payload.user };
  }
  refreshCurrentUserDisplay(state.currentUser);
  renderEntitlements();
}

async function refreshEntitlements({ silent = true } = {}) {
  const requestedUserId = state.currentUser?.id;
  if (!requestedUserId) return null;
  try {
    const payload = await authClient.entitlements();
    if (state.currentUser?.id !== requestedUserId) return null;
    applyEntitlementPayload(payload);
    return payload;
  } catch (error) {
    if (error instanceof AuthClient.AuthClientError && error.status === 401) {
      completeLogout();
      return null;
    }
    if (!silent) setEntitlementsMessage(authErrorMessage(error));
    return null;
  }
}

async function openEntitlementsDialog() {
  if (!state.currentUser || !els.entitlementsDialog) return;
  setEntitlementsMessage("正在从服务器读取当前权益……");
  renderEntitlements();
  if (!els.entitlementsDialog.open) els.entitlementsDialog.showModal();
  const payload = await refreshEntitlements({ silent: false });
  if (payload) setEntitlementsMessage("权益由服务器实时校验。Plus 与 Pro 购买暂未开放。");
}

async function redeemInternalAccess() {
  let credential = els.internalInviteCode.value.trim();
  els.internalInviteCode.value = "";
  if (!credential) {
    setEntitlementsMessage("请输入内部测试凭据。凭据不会保存在浏览器中。");
    return;
  }
  setButtonBusy(els.redeemInternalButton, true, "验证中……");
  setEntitlementsMessage("");
  try {
    const payload = await authClient.redeemInternal(credential);
    applyEntitlementPayload(payload);
    setEntitlementsMessage("Internal Tester 已启用；该身份不包含管理员权限。");
  } catch (error) {
    setEntitlementsMessage(authErrorMessage(error));
  } finally {
    credential = "";
    setButtonBusy(els.redeemInternalButton, false);
    renderEntitlements();
  }
}

async function joinPinnWaitlist() {
  setButtonBusy(els.joinPinnWaitlistButton, true, "提交中……");
  setEntitlementsMessage("");
  try {
    const payload = await authClient.joinPinnWaitlist();
    applyEntitlementPayload(payload);
    setEntitlementsMessage("已加入 PINN 等待名单。PINN 求解能力仍在开发中，尚未启用。");
  } catch (error) {
    setEntitlementsMessage(authErrorMessage(error));
  } finally {
    setButtonBusy(els.joinPinnWaitlistButton, false);
    renderEntitlements();
  }
}

function showAuthMode(mode) {
  const isLogin = mode === "login";
  els.authPanel.classList.remove("hidden");
  els.loginCard.classList.toggle("hidden", !isLogin);
  els.registerCard.classList.toggle("hidden", isLogin);
  els.showLoginButton.classList.toggle("active", isLogin);
  els.showRegisterButton.classList.toggle("active", !isLogin);
  setAuthMessage("");
  const focusTarget = isLogin ? els.loginUsername : els.registerUsername;
  focusTarget.focus();
}

function resetAuthChoice() {
  els.authChoicePanel.classList.remove("hidden");
  els.authPanel.classList.add("hidden");
  els.loginCard.classList.add("hidden");
  els.registerCard.classList.add("hidden");
  els.showLoginButton.classList.remove("active");
  els.showRegisterButton.classList.remove("active");
  els.startAppButton.classList.remove("hidden");
  if (els.moduleChoicePanel) els.moduleChoicePanel.classList.add("hidden");
}

function setCurrentUser(user) {
  state.entitlements = null;
  state.currentUser = user;
  els.authChoicePanel.classList.add("hidden");
  els.authPanel.classList.add("hidden");
  els.loginCard.classList.add("hidden");
  els.registerCard.classList.add("hidden");
  els.startPanel.classList.remove("hidden");
  els.startAppButton.classList.remove("hidden");
  if (els.moduleChoicePanel) els.moduleChoicePanel.classList.add("hidden");
  refreshCurrentUserDisplay(user);
  setAuthMessage(`已登录：${user.username}`);
  void refreshEntitlements({ silent: true });
}

async function initAuth() {
  resetAuthChoice();
  els.startPanel.classList.add("hidden");
  showDefaultAvatar(els.registerAvatarPreview);
  refreshCurrentUserDisplay(null);
  updateMigrationNotice();
  setAuthMessage("正在检查登录状态……");
  try {
    const session = await authClient.session();
    if (session.authenticated && session.user) {
      setCurrentUser(session.user);
      return;
    }
    setAuthMessage(hasLegacyAuthData() ? "请注册服务器账户完成旧配置迁移。" : "");
  } catch (error) {
    setAuthMessage(authErrorMessage(error));
  }
}

async function loginUser() {
  const username = els.loginUsername.value.trim();
  const password = els.loginPassword.value;
  if (!username || !password) {
    setAuthMessage("请填写账户名和密码。");
    return;
  }
  setButtonBusy(els.loginSubmit, true, "正在登录……");
  setAuthMessage("");
  try {
    const session = await authClient.login({ username, password });
    clearLegacyAuthData();
    updateMigrationNotice();
    els.loginPassword.value = "";
    setCurrentUser(session.user);
  } catch (error) {
    setAuthMessage(authErrorMessage(error));
  } finally {
    setButtonBusy(els.loginSubmit, false);
  }
}

async function registerUser() {
  const username = els.registerUsername.value.trim();
  const password = els.registerPassword.value;
  const passwordConfirm = els.registerPasswordConfirm.value;
  const displayName = els.registerNickname.value.trim();
  if (!username || !password || !passwordConfirm || !displayName) {
    setAuthMessage("注册需要填写账户名、密码、确认密码和昵称。");
    return;
  }
  if (!els.acceptTerms.checked || !els.acceptPrivacy.checked) {
    setAuthMessage("请先阅读并同意用户协议与隐私说明。");
    return;
  }
  setButtonBusy(els.registerSubmit, true, "正在注册……");
  setAuthMessage("");
  try {
    let session = await authClient.register({
      username,
      password,
      passwordConfirm,
      displayName,
      acceptedTerms: true,
      acceptedPrivacy: true,
    });
    const avatarFile = els.registerAvatar.files && els.registerAvatar.files[0];
    let avatarWarning = "";
    if (avatarFile) {
      try {
        session = await authClient.uploadAvatar(avatarFile);
      } catch (error) {
        avatarWarning = `账户已创建，但头像未保存：${authErrorMessage(error)}`;
      }
    }
    clearLegacyAuthData();
    updateMigrationNotice();
    state.pendingAvatar = "";
    els.registerAvatar.value = "";
    els.registerPassword.value = "";
    els.registerPasswordConfirm.value = "";
    setCurrentUser(session.user);
    if (avatarWarning) setAuthMessage(avatarWarning);
  } catch (error) {
    setAuthMessage(authErrorMessage(error));
  } finally {
    setButtonBusy(els.registerSubmit, false);
  }
}

function previewRegisterAvatar(file) {
  if (!file) {
    state.pendingAvatar = "";
    showDefaultAvatar(els.registerAvatarPreview);
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state.pendingAvatar = String(reader.result || "");
    showAvatar(els.registerAvatarPreview, state.pendingAvatar);
  });
  reader.readAsDataURL(file);
}

function openSettingsDialog() {
  if (!state.currentUser) return;
  state.pendingSettingsAvatar = "";
  els.settingsNickname.value = state.currentUser.displayName || "";
  els.settingsAvatar.value = "";
  els.settingsCurrentPassword.value = "";
  els.settingsNewPassword.value = "";
  els.settingsNewPasswordConfirm.value = "";
  applyFontSize(localStorage.getItem(AUTH_FONT_SIZE_KEY), false);
  showAvatar(els.settingsAvatarPreview, userAvatar(state.currentUser));
  setSettingsMessage("");
  if (!els.settingsDialog.open) els.settingsDialog.showModal();
}

async function saveNickname() {
  const displayName = els.settingsNickname.value.trim();
  if (!displayName) {
    setSettingsMessage("昵称不能为空。");
    return;
  }
  setButtonBusy(els.saveNicknameButton, true, "保存中……");
  try {
    const session = await authClient.updateProfile(displayName);
    state.currentUser = session.user;
    refreshCurrentUserDisplay(session.user);
    setSettingsMessage("昵称已保存到服务器。");
  } catch (error) {
    setSettingsMessage(authErrorMessage(error));
  } finally {
    setButtonBusy(els.saveNicknameButton, false);
  }
}

function previewSettingsAvatar(file) {
  if (!file) {
    state.pendingSettingsAvatar = "";
    showAvatar(els.settingsAvatarPreview, userAvatar(state.currentUser));
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state.pendingSettingsAvatar = String(reader.result || "");
    showAvatar(els.settingsAvatarPreview, state.pendingSettingsAvatar);
  });
  reader.readAsDataURL(file);
}

async function saveSettingsAvatar() {
  const avatarFile = els.settingsAvatar.files && els.settingsAvatar.files[0];
  if (!avatarFile) {
    setSettingsMessage("请选择新的头像文件。");
    return;
  }
  setButtonBusy(els.saveAvatarButton, true, "上传中……");
  try {
    const session = await authClient.uploadAvatar(avatarFile);
    state.currentUser = session.user;
    refreshCurrentUserDisplay(session.user);
    showAvatar(els.settingsAvatarPreview, userAvatar(session.user));
    state.pendingSettingsAvatar = "";
    els.settingsAvatar.value = "";
    setSettingsMessage("头像已安全保存到服务器。");
  } catch (error) {
    setSettingsMessage(authErrorMessage(error));
  } finally {
    setButtonBusy(els.saveAvatarButton, false);
  }
}

async function savePassword() {
  const currentPassword = els.settingsCurrentPassword.value;
  const newPassword = els.settingsNewPassword.value;
  const newPasswordConfirm = els.settingsNewPasswordConfirm.value;
  if (!currentPassword || !newPassword || !newPasswordConfirm) {
    setSettingsMessage("请完整填写原密码、新密码和确认新密码。");
    return;
  }
  setButtonBusy(els.savePasswordButton, true, "更新中……");
  try {
    const session = await authClient.changePassword(
      currentPassword,
      newPassword,
      newPasswordConfirm
    );
    state.currentUser = session.user;
    refreshCurrentUserDisplay(session.user);
    els.settingsCurrentPassword.value = "";
    els.settingsNewPassword.value = "";
    els.settingsNewPasswordConfirm.value = "";
    setSettingsMessage("密码已更新，其他登录会话已撤销。");
  } catch (error) {
    setSettingsMessage(authErrorMessage(error));
  } finally {
    setButtonBusy(els.savePasswordButton, false);
  }
}

function completeLogout() {
  cancelDynamicsFieldPlacement({ silent: true });
  state.currentUser = null;
  state.entitlements = null;
  if (els.settingsDialog.open) els.settingsDialog.close();
  if (els.entitlementsDialog?.open) els.entitlementsDialog.close();
  if (els.internalInviteCode) els.internalInviteCode.value = "";
  els.appShell.classList.add("app-hidden");
  if (els.dynamicsShell) els.dynamicsShell.classList.add("app-hidden");
  els.welcomeScreen.classList.remove("hidden");
  els.startPanel.classList.add("hidden");
  if (els.moduleChoicePanel) els.moduleChoicePanel.classList.add("hidden");
  state.activeModule = "welcome";
  document.body.classList.remove("dynamics-active");
  resetAuthChoice();
  showDefaultAvatar(els.registerAvatarPreview);
  refreshCurrentUserDisplay(null);
  setAuthMessage("");
  setSettingsMessage("");
  setEntitlementsMessage("");
  renderEntitlements();
}

async function logoutUser() {
  if (!state.currentUser) {
    completeLogout();
    return;
  }
  setSettingsMessage("正在退出……");
  try {
    await authClient.logout();
    completeLogout();
  } catch (error) {
    setSettingsMessage(authErrorMessage(error));
    if (error instanceof AuthClient.AuthClientError && error.status === 401) completeLogout();
  }
}

function startApplication() {
  if (!state.currentUser) {
    initAuth();
    return;
  }
  els.startAppButton.classList.add("hidden");
  if (els.moduleChoicePanel) els.moduleChoicePanel.classList.remove("hidden");
  setAuthMessage("请选择计算模块。");
}

function launchStaticApplication() {
  if (!state.currentUser) {
    initAuth();
    return;
  }
  cancelDynamicsFieldPlacement({ silent: true });
  state.activeModule = "static";
  document.body.classList.remove("dynamics-active");
  cancelDynamicsAnimation();
  els.welcomeScreen.classList.add("hidden");
  els.appShell.classList.remove("app-hidden");
  if (els.dynamicsShell) els.dynamicsShell.classList.add("app-hidden");
  window.scrollTo(0, 0);
  resizeCanvas();
  syncUi();
}

function launchDynamicsApplication() {
  if (!state.currentUser) {
    initAuth();
    return;
  }
  state.activeModule = "dynamics";
  document.body.classList.add("dynamics-active");
  els.welcomeScreen.classList.add("hidden");
  els.appShell.classList.add("app-hidden");
  els.dynamicsShell.classList.remove("app-hidden");
  window.scrollTo(0, 0);
  resizeDynamicsCanvas();
  syncDynamicsControls();
  updateDynamicsFieldStatus();
  renderDynamicsSceneLists();
  drawDynamicsScene();
}

function snapshot() {
  return JSON.stringify({
    nodes: state.nodes,
    elements: state.elements,
    loads: state.loads,
    elementLoads: state.elementLoads,
    nodeSeq: state.nodeSeq,
    elementSeq: state.elementSeq,
  });
}

function restore(serialized) {
  const data = JSON.parse(serialized);
  state.nodes = data.nodes || [];
  state.elements = data.elements || [];
  state.loads = data.loads || [];
  state.elementLoads = data.elementLoads || [];
  state.nodeSeq = data.nodeSeq || nextSequence(state.nodes, "N");
  state.elementSeq = data.elementSeq || nextSequence(state.elements, "E");
  state.selected = null;
  state.selection = { nodes: [], elements: [] };
  state.pendingNode = null;
  state.result = null;
  syncUi();
  draw();
}

function mutate(change) {
  state.undoStack.push(snapshot());
  if (state.undoStack.length > 100) state.undoStack.shift();
  state.redoStack = [];
  change();
  state.result = null;
  syncUi();
  draw();
}

function undo() {
  if (state.undoStack.length === 0) return;
  state.redoStack.push(snapshot());
  restore(state.undoStack.pop());
}

function redo() {
  if (state.redoStack.length === 0) return;
  state.undoStack.push(snapshot());
  restore(state.redoStack.pop());
}

function dynamicsSnapshot() {
  return JSON.stringify({
    model: state.dynamics.model,
    objects: state.dynamics.objects,
    fields: state.dynamics.fields,
    forces: state.dynamics.forces,
    grounds: state.dynamics.grounds,
    tracks: state.dynamics.tracks,
    constraints: state.dynamics.constraints,
    simulationSettings: state.dynamics.simulationSettings,
    objectSeq: state.dynamics.objectSeq,
    fieldSeq: state.dynamics.fieldSeq,
    forceSeq: state.dynamics.forceSeq,
  });
}

function recordDynamicsHistory() {
  state.dynamics.undoStack.push(dynamicsSnapshot());
  if (state.dynamics.undoStack.length > 100) state.dynamics.undoStack.shift();
  state.dynamics.redoStack = [];
}

function restoreDynamics(serialized) {
  cancelDynamicsFieldPlacement({ silent: true });
  cancelDynamicsAnimation();
  const data = JSON.parse(serialized);
  state.dynamics.model = data.model || "independent-particle2d";
  state.dynamics.objects = data.objects || [];
  state.dynamics.fields = data.fields || [];
  state.dynamics.forces = data.forces || [];
  state.dynamics.grounds = data.grounds || [];
  state.dynamics.tracks = data.tracks || [];
  state.dynamics.constraints = data.constraints || [];
  state.dynamics.simulationSettings = data.simulationSettings || {};
  if (els.dynamicsGroundToggle) els.dynamicsGroundToggle.checked = state.dynamics.grounds.length > 0;
  state.dynamics.objectSeq = data.objectSeq || nextSequence(state.dynamics.objects, "D");
  state.dynamics.fieldSeq = data.fieldSeq || nextSequence(state.dynamics.fields, "F");
  state.dynamics.forceSeq = data.forceSeq || nextSequence(state.dynamics.forces, "A");
  state.dynamics.selectedObjectId = state.dynamics.objects[0]?.id || null;
  state.dynamics.object = state.dynamics.objects[0] || null;
  state.dynamics.field = state.dynamics.fields[state.dynamics.fields.length - 1] || null;
  state.dynamics.result = null;
  syncDynamicsObjectControls(state.dynamics.object);
  updateDynamicsFieldStatus();
  renderDynamicsSceneLists();
  renderDynamicsResult();
  drawDynamicsScene();
}

function undoDynamics() {
  if (state.dynamics.fieldPlacement.active) {
    cancelDynamicsFieldPlacement();
    return;
  }
  if (!state.dynamics.undoStack.length) return;
  state.dynamics.redoStack.push(dynamicsSnapshot());
  restoreDynamics(state.dynamics.undoStack.pop());
}

function redoDynamics() {
  if (state.dynamics.fieldPlacement.active) {
    cancelDynamicsFieldPlacement();
    return;
  }
  if (!state.dynamics.redoStack.length) return;
  state.dynamics.undoStack.push(dynamicsSnapshot());
  restoreDynamics(state.dynamics.redoStack.pop());
}

function setTool(tool) {
  if (tool === "element") {
    openElementDialog();
    return;
  }
  activateTool(tool);
}

function activateTool(tool) {
  state.tool = tool;
  state.pendingNode = null;
  state.freeformDraw = null;
  document.body.classList.toggle("freeform-drawing", tool === "element" && state.elementGeometry === "freeform");
  els.toolButtons.forEach((button) => button.classList.toggle("active", button.dataset.tool === tool));
  if (tool === "load") openLoadDialog();
  draw();
}

function openElementDialog() {
  els.elementGeometry.value = state.elementGeometry;
  els.sectionShape.value = state.elementDefaults.sectionShape;
  els.sectionRadius.value = state.elementDefaults.sectionRadius;
  els.shapeInertia.value = state.elementDefaults.inertia;
  els.shapeInertiaProduct.value = state.elementDefaults.inertiaProduct;
  els.shapeStaticMoment.value = state.elementDefaults.staticMoment;
  els.teeDepth.value = state.elementDefaults.teeDepth;
  els.elementCurvature.value = state.elementDefaults.curvature;
  els.elementArcAngle.value = state.elementDefaults.arcAngle;
  if (!els.elementDialog.open) els.elementDialog.showModal();
}

function applyElementSettings() {
  state.elementGeometry = els.elementGeometry.value;
  state.elementDefaults = {
    sectionShape: els.sectionShape.value,
    sectionRadius: els.sectionRadius.value || "50 mm",
    inertia: els.shapeInertia.value || "80000000 mm^4",
    inertiaProduct: els.shapeInertiaProduct.value || "0 mm^4",
    staticMoment: els.shapeStaticMoment.value || "0 mm^3",
    teeDepth: els.teeDepth.value || "0.35 m",
    curvature: Number(els.elementCurvature.value || 0),
    arcAngle: Number(els.elementArcAngle.value || 45),
  };
  els.sectionI.value = state.elementDefaults.inertia;
  activateTool("element");
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(760, Math.floor(rect.width));
  canvas.height = Math.max(500, Math.floor(rect.height));
  const diagramRect = diagramCanvas.getBoundingClientRect();
  diagramCanvas.width = Math.max(760, Math.floor(diagramRect.width));
  diagramCanvas.height = Math.max(300, Math.floor(diagramRect.height));
  if (!state.originInitialized) {
    state.origin = { x: 70, y: canvas.height - 58 };
    state.originInitialized = true;
  }
  draw();
}

function screenToWorld(point) {
  const raw = {
    x: (point.x - state.origin.x) / state.pxPerMeter,
    y: (state.origin.y - point.y) / state.pxPerMeter,
  };
  return snapWorld(raw);
}

function screenToWorldRaw(point) {
  return {
    x: (point.x - state.origin.x) / state.pxPerMeter,
    y: (state.origin.y - point.y) / state.pxPerMeter,
  };
}

function worldToScreen(point) {
  return {
    x: state.origin.x + point.x * state.pxPerMeter,
    y: state.origin.y - point.y * state.pxPerMeter,
  };
}

function snapWorld(point) {
  if (!els.snapToggle.checked) return point;
  return {
    x: Math.round(point.x / state.gridSize) * state.gridSize,
    y: Math.round(point.y / state.gridSize) * state.gridSize,
  };
}

function applyOrthogonalLock(point) {
  if (!els.orthogonalToggle.checked || !state.pendingNode) return point;
  const first = getNode(state.pendingNode);
  if (!first) return point;
  const dx = Math.abs(point.x - first.x);
  const dy = Math.abs(point.y - first.y);
  return dx >= dy ? { x: point.x, y: first.y } : { x: first.x, y: point.y };
}

function getNode(id) {
  return state.nodes.find((node) => node.id === id);
}

function getElement(id) {
  return state.elements.find((element) => element.id === id);
}

function elementGeometryOf(element) {
  if (element.geometry) return element.geometry;
  if (["arc", "tee", "freeform", "right_angle"].includes(element.type)) return element.type;
  return "straight";
}

function nodeAtScreen(x, y) {
  let best = null;
  let bestDistance = 9;
  for (const node of state.nodes) {
    if (node.fused) continue;
    const screen = worldToScreen(node);
    const distance = Math.hypot(screen.x - x, screen.y - y);
    if (distance < bestDistance) {
      best = node;
      bestDistance = distance;
    }
  }
  return best;
}

function nodeOrSupportAtScreen(x, y) {
  return nodeAtScreen(x, y) || supportAtScreen(x, y);
}

function supportAtScreen(x, y) {
  const point = { x, y };
  let best = null;
  let bestDistance = 10;
  for (const node of state.nodes) {
    if (!isSupportNode(node)) continue;
    const distance = supportHitDistance(node, point);
    if (distance < bestDistance) {
      best = node;
      bestDistance = distance;
    }
  }
  return best;
}

function supportSymbolSize() {
  return Math.max(42, Math.min(110, state.pxPerMeter * 0.95));
}

function supportHitDistance(node, point) {
  const screen = worldToScreen(node);
  const support = node.support || supportFromRestraints(node.restraints);
  const dir = supportDirection(node);
  const normal = { x: -dir.y, y: dir.x };
  const size = supportSymbolSize();
  const toNode = Math.hypot(screen.x - point.x, screen.y - point.y);
  let best = toNode;
  if (support.type === "ground") {
    const halfWidth = size * 0.62;
    best = Math.min(best, pointToSegmentDistance(point, groundStart(screen, normal, halfWidth), groundEnd(screen, normal, halfWidth)));
    return best;
  }
  if (support.type === "fixed" || (node.restraints.ux && node.restraints.uy && node.restraints.rz)) {
    const halfWidth = size * 0.62;
    best = Math.min(best, pointToSegmentDistance(point, groundStart(screen, normal, halfWidth), groundEnd(screen, normal, halfWidth)));
    return best;
  }
  const height = support.type === "roller" ? size * 0.58 : size * 0.55;
  const halfBase = support.type === "roller" ? size * 0.36 : size * 0.38;
  const base = { x: screen.x - dir.x * height, y: screen.y - dir.y * height };
  const p1 = { x: base.x + normal.x * halfBase, y: base.y + normal.y * halfBase };
  const p2 = { x: base.x - normal.x * halfBase, y: base.y - normal.y * halfBase };
  best = Math.min(best, pointToSegmentDistance(point, screen, p1), pointToSegmentDistance(point, screen, p2), pointToSegmentDistance(point, p1, p2));
  if (support.type === "roller") {
    const radius = Math.max(4, size * 0.085);
    const rollerCenter = { x: base.x - dir.x * (radius + 3), y: base.y - dir.y * (radius + 3) };
    for (const offset of [-radius * 1.8, radius * 1.8]) {
      const center = { x: rollerCenter.x + normal.x * offset, y: rollerCenter.y + normal.y * offset };
      best = Math.min(best, Math.abs(Math.hypot(point.x - center.x, point.y - center.y) - radius));
    }
    const groundCenter = { x: base.x - dir.x * (radius * 3 + 8), y: base.y - dir.y * (radius * 3 + 8) };
    best = Math.min(best, pointToSegmentDistance(point, groundStart(groundCenter, normal, halfBase + 12), groundEnd(groundCenter, normal, halfBase + 12)));
  } else {
    best = Math.min(best, pointToSegmentDistance(point, groundStart(base, normal, halfBase + 8), groundEnd(base, normal, halfBase + 8)));
  }
  return best;
}

function groundStart(center, normal, halfWidth) {
  return { x: center.x + normal.x * halfWidth, y: center.y + normal.y * halfWidth };
}

function groundEnd(center, normal, halfWidth) {
  return { x: center.x - normal.x * halfWidth, y: center.y - normal.y * halfWidth };
}

function elementAtScreen(x, y) {
  let best = null;
  let bestDistance = 8;
  for (const element of state.elements) {
    const nodeI = getNode(element.node_i);
    const nodeJ = getNode(element.node_j);
    if (!nodeI || !nodeJ) continue;
    const a = worldToScreen(nodeI);
    const b = worldToScreen(nodeJ);
    const distance = elementDistanceAtScreen(element, { x, y }, a, b);
    if (distance < bestDistance) {
      best = element;
      bestDistance = distance;
    }
  }
  return best;
}

function elementDistanceAtScreen(element, point, a, b) {
  if (elementGeometryOf(element) === "right_angle") {
    const elbow = { x: b.x, y: a.y };
    return Math.min(pointToSegmentDistance(point, a, elbow), pointToSegmentDistance(point, elbow, b));
  }
  if (elementGeometryOf(element) !== "arc" && elementGeometryOf(element) !== "freeform") return pointToSegmentDistance(point, a, b);
  if (elementGeometryOf(element) === "freeform" && Array.isArray(element.path) && element.path.length > 1) {
    const points = element.path.map((item) => worldToScreen(item));
    let best = Infinity;
    for (let index = 1; index < points.length; index++) {
      best = Math.min(best, pointToSegmentDistance(point, points[index - 1], points[index]));
    }
    return best;
  }
  const control = arcControlPoint(element, a, b);
  let best = Infinity;
  let previous = a;
  for (let index = 1; index <= 48; index++) {
    const t = index / 48;
    const current = quadraticPoint(a, control, b, t);
    best = Math.min(best, pointToSegmentDistance(point, previous, current));
    previous = current;
  }
  return best;
}

function quadraticPoint(a, c, b, t) {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

function pointToSegmentDistance(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  if (length2 === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length2));
  const projection = { x: a.x + t * dx, y: a.y + t * dy };
  return Math.hypot(point.x - projection.x, point.y - projection.y);
}

function addNode(point) {
  const node = {
    id: `N${state.nodeSeq++}`,
    x: Number(point.x.toFixed(4)),
    y: Number(point.y.toFixed(4)),
    restraints: { ux: false, uy: false, rz: false },
    support: { type: "free", angle: 0, mode: "free" },
    fused: false,
  };
  state.nodes.push(node);
  setSelection("node", node.id);
  return node;
}

function addElement(nodeI, nodeJ) {
  if (nodeI === nodeJ) return null;
  const exists = state.elements.some((element) => {
    return (
      (element.node_i === nodeI && element.node_j === nodeJ) ||
      (element.node_i === nodeJ && element.node_j === nodeI)
    );
  });
  if (exists) {
    showToast("杆件已存在");
    return null;
  }
  const element = {
    id: `E${state.elementSeq++}`,
    node_i: nodeI,
    node_j: nodeJ,
    material: state.projectMaterials[0]?.id || "steel",
    section: state.projectSections[0]?.id || "default",
    type: els.elementType.value || "frame",
    geometry: state.elementGeometry,
    curvature: Number(state.elementDefaults.curvature || 0),
    arcAngle: Number(state.elementDefaults.arcAngle || 45),
    teeDepth: state.elementDefaults.teeDepth || "0.35 m",
    sectionParams: { ...state.elementDefaults },
    moment_release_i: false,
    moment_release_j: false,
  };
  state.elements.push(element);
  setSelection("element", element.id);
  return element;
}

function addFreeformElement(screenPath) {
  if (screenPath.length < 2) return null;
  const worldPath = screenPath.map((point) => {
    const world = screenToWorldRaw(point);
    return { x: Number(world.x.toFixed(4)), y: Number(world.y.toFixed(4)) };
  });
  const start = addNode(worldPath[0]);
  const end = addNode(worldPath[worldPath.length - 1]);
  const element = addElement(start.id, end.id);
  if (!element) return null;
  element.geometry = "freeform";
  element.path = worldPath;
  setSelection("element", element.id);
  return element;
}

function setSelection(type, id, additive = false) {
  if (!additive) state.selection = { nodes: [], elements: [] };
  const key = type === "node" ? "nodes" : "elements";
  if (!state.selection[key].includes(id)) state.selection[key].push(id);
  state.selected = { type, id };
  syncUi();
}

function clearSelection() {
  state.selected = null;
  state.selection = { nodes: [], elements: [] };
  syncUi();
}

function isNodeSelected(id) {
  return state.selection.nodes.includes(id) || (state.selected && state.selected.type === "node" && state.selected.id === id);
}

function isElementSelected(id) {
  return state.selection.elements.includes(id) || (state.selected && state.selected.type === "element" && state.selected.id === id);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / Math.max(rect.width, 1)),
    y: (event.clientY - rect.top) * (canvas.height / Math.max(rect.height, 1)),
  };
}

function handlePointAction(point, event) {
  const hitNode = nodeOrSupportAtScreen(point.x, point.y);
  const hitElement = elementAtScreen(point.x, point.y);
  let world = screenToWorld(point);
  world = applyOrthogonalLock(world);

  if (state.tool === "select") {
    if (hitNode) {
      setSelection("node", hitNode.id, event.shiftKey);
    } else if (hitElement) {
      setSelection("element", hitElement.id, event.shiftKey);
    } else {
      clearSelection();
    }
    draw();
    return;
  }

  if (state.tool === "node") {
    mutate(() => {
      if (hitNode) setSelection("node", hitNode.id);
      else addNode(world);
    });
    return;
  }

  if (state.tool === "element") {
    mutate(() => {
      const target = hitNode || addNode(world);
      if (!state.pendingNode) {
        state.pendingNode = target.id;
        setSelection("node", target.id);
        return;
      }
      addElement(state.pendingNode, target.id);
      state.pendingNode = null;
    });
    return;
  }

  if (state.tool === "support") {
    if (!hitNode) return;
    mutate(() => {
      applySupportPreset(hitNode, els.supportPreset.value);
      setSelection("node", hitNode.id);
    });
    return;
  }

  if (state.tool === "load") {
    mutate(() => applyCurrentLoad(hitNode, hitElement, point));
  }
}

function selectByBox(start, end) {
  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);
  const nodes = state.nodes.filter((node) => {
    if (node.fused) return false;
    const point = worldToScreen(node);
    return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
  });
  const nodeIds = nodes.map((node) => node.id);
  const elements = state.elements.filter((element) => {
    const nodeI = getNode(element.node_i);
    const nodeJ = getNode(element.node_j);
    if (!nodeI || !nodeJ) return false;
    const a = worldToScreen(nodeI);
    const b = worldToScreen(nodeJ);
    return (
      (a.x >= left && a.x <= right && a.y >= top && a.y <= bottom) ||
      (b.x >= left && b.x <= right && b.y >= top && b.y <= bottom) ||
      pointToSegmentDistance({ x: left, y: top }, a, b) < Math.max(right - left, bottom - top)
    );
  });
  setGroupSelection(nodeIds, elements.map((element) => element.id));
}

function selectByLasso(path) {
  if (path.length < 3) return;
  const nodeIds = state.nodes
    .filter((node) => !node.fused)
    .filter((node) => pointInPolygon(worldToScreen(node), path))
    .map((node) => node.id);
  const elementIds = state.elements
    .filter((element) => {
      const nodeI = getNode(element.node_i);
      const nodeJ = getNode(element.node_j);
      if (!nodeI || !nodeJ) return false;
      const a = worldToScreen(nodeI);
      const b = worldToScreen(nodeJ);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      return pointInPolygon(mid, path);
    })
    .map((element) => element.id);
  setGroupSelection(nodeIds, elementIds);
}

function setGroupSelection(nodeIds, elementIds) {
  state.selection = {
    nodes: [...new Set(nodeIds)],
    elements: [...new Set(elementIds)],
  };
  if (state.selection.elements.length) {
    state.selected = { type: "element", id: state.selection.elements[0] };
  } else if (state.selection.nodes.length) {
    state.selected = { type: "node", id: state.selection.nodes[0] };
  } else {
    state.selected = null;
  }
  syncUi();
  draw();
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    const intersects =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y + Number.EPSILON) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function supportPresetToRestraints(preset) {
  if (preset === "fixed") return { ux: true, uy: true, rz: true };
  if (preset === "ground") return { ux: true, uy: true, rz: true };
  if (preset === "pin") return { ux: true, uy: true, rz: false };
  if (preset === "roller") return { ux: false, uy: true, rz: false };
  return { ux: false, uy: false, rz: false };
}

function applySupportPreset(node, preset) {
  const current = node.support || {};
  node.restraints = supportPresetToRestraints(preset);
  node.support = {
    type: preset,
    mode: preset === "pin" ? "fixed-ground" : preset === "roller" ? "rolling-ground" : preset === "ground" ? "fixed-ground" : preset,
    angle: Number(current.angle || 0),
    orientationExplicit: Boolean(current.orientationExplicit || current.mode === "rotating"),
  };
}

function parseRestraints(raw) {
  if (!raw) return { ux: false, uy: false, rz: false };
  if (Array.isArray(raw)) {
    return {
      ux: raw.includes("ux"),
      uy: raw.includes("uy"),
      rz: raw.includes("rz"),
    };
  }
  return {
    ux: Boolean(raw.ux),
    uy: Boolean(raw.uy),
    rz: Boolean(raw.rz),
  };
}

function restraintsToList(restraints) {
  return ["ux", "uy", "rz"].filter((dof) => Boolean(restraints[dof]));
}

function deleteSelection() {
  if (!state.selected && !state.selection.nodes.length && !state.selection.elements.length && state.pointer) {
    const hitNode = nodeOrSupportAtScreen(state.pointer.x, state.pointer.y);
    const hitElement = elementAtScreen(state.pointer.x, state.pointer.y);
    if (hitNode) {
      state.selected = { type: "node", id: hitNode.id };
      state.selection = { nodes: [hitNode.id], elements: [] };
    } else if (hitElement) {
      state.selected = { type: "element", id: hitElement.id };
      state.selection = { nodes: [], elements: [hitElement.id] };
    }
  }
  if (!state.selected && !state.selection.nodes.length && !state.selection.elements.length) return;
  mutate(() => {
    const nodeIds = new Set(state.selection.nodes);
    const elementIds = new Set(state.selection.elements);
    if (state.selected) {
      if (state.selected.type === "node") nodeIds.add(state.selected.id);
      if (state.selected.type === "element") elementIds.add(state.selected.id);
    }
    state.elements.forEach((element) => {
      if (nodeIds.has(element.node_i) || nodeIds.has(element.node_j)) elementIds.add(element.id);
    });
    state.nodes = state.nodes.filter((node) => !nodeIds.has(node.id));
    state.elements = state.elements.filter((element) => !elementIds.has(element.id));
    state.loads = state.loads.filter((load) => {
      if (load.node) return !nodeIds.has(load.node);
      if (load.element) return !elementIds.has(load.element);
      return true;
    });
    state.elementLoads = state.elementLoads.filter((load) => !elementIds.has(load.element));
    clearSelection();
    state.pendingNode = null;
  });
}

function buildProject(options = {}) {
  const scope = options.scope || "whole";
  const model = scopedModel(scope);
  // Arc / right-angle / free-form members are split into straight segments
  // for the solver; `expansion` maps each parent member to its segments and
  // travels with the project object without being serialised.
  const expanded = GeometryDiscretize.expandModel(model);
  const project = {
    schema: ProjectAdapter.STATIC_SCHEMA,
    application: ProjectAdapter.APPLICATION_ID,
    module: "statics",
    metadata: {
      name: scope === "selection" ? "isolated_body" : "canvas_project",
      solve_options: state.solveOptions.join(","),
    },
    solver: els.solverBackend.value,
    materials: [{ id: "steel", E: els.materialE.value, nu: 0.3 }],
    sections: [{ id: "default", A: els.sectionA.value, I: els.sectionI.value }],
    nodes: expanded.nodes.map((node) => ({
      id: node.id,
      x: `${node.x} m`,
      y: `${node.y} m`,
      restraints: restraintsToList(node.restraints),
      support: node.support || { type: "free", angle: 0, mode: "free" },
      support_angle: supportAngleOf(node),
      fused: Boolean(node.fused),
      ...(node.parent ? { parent: node.parent } : {}),
    })),
    elements: expanded.elements.map((element) => ({
      id: element.id,
      node_i: element.node_i,
      node_j: element.node_j,
      material: "steel",
      section: "default",
      ...ProjectAdapter.solverElement(element),
      geometry: elementGeometryOf(element),
      curvature: Number(element.curvature || 0),
      arcAngle: Number(element.arcAngle || 45),
      teeDepth: element.teeDepth || "0.35 m",
      sectionParams: element.sectionParams || {},
      ...(element.parent && element.parent !== element.id ? { parent: element.parent } : {}),
    })),
    loads: {
      nodes: projectNodalLoads(model),
      elements: expanded.elementLoads,
    },
  };
  Object.defineProperty(project, "expansion", { value: expanded.expansion, enumerable: false });
  return project;
}

function discretisationLines(expansion) {
  const lines = [];
  for (const [parent, info] of Object.entries(expansion || {})) {
    if (!info) continue;
    lines.push(`- ${parent}：${geometryLabel(info.geometry)}，沿绘制路径离散为 ${info.segments.length} 段直杆（总弧长 ${formatNumber(info.length)} m），结果已按母杆件合并。`);
  }
  return lines;
}

function solverElementType(element) {
  return ProjectAdapter.solverElementType(element);
}

function projectNodalLoads(model) {
  return model.loads
    .filter((load) => load.node)
    .map((load) => ({
        node: load.node,
        fx: load.fx || "0 N",
        fy: load.fy || "0 N",
        mz: load.mz || "0 N*m",
      }));
}

function scopedModel(scope) {
  if (scope !== "selection") {
    return {
      nodes: state.nodes,
      elements: state.elements,
      loads: state.loads,
      elementLoads: state.elementLoads,
    };
  }
  const elementIds = new Set(state.selection.elements);
  const nodeIds = new Set(state.selection.nodes);
  if (state.selected) {
    if (state.selected.type === "element") elementIds.add(state.selected.id);
    if (state.selected.type === "node") nodeIds.add(state.selected.id);
  }
  for (const element of state.elements) {
    if (nodeIds.has(element.node_i) && nodeIds.has(element.node_j)) elementIds.add(element.id);
  }
  for (const element of state.elements) {
    if (elementIds.has(element.id)) {
      nodeIds.add(element.node_i);
      nodeIds.add(element.node_j);
    }
  }
  const nodes = state.nodes.filter((node) => nodeIds.has(node.id));
  const elements = state.elements.filter((element) => elementIds.has(element.id));
  if (!elements.length) throw new Error("选中隔离体至少需要包含一根杆件。");
  return {
    nodes,
    elements,
    loads: state.loads.filter((load) => (load.node ? nodeIds.has(load.node) : elementIds.has(load.element))),
    elementLoads: state.elementLoads.filter((load) => elementIds.has(load.element)),
  };
}

function importProject(rawProject) {
  const project = ProjectAdapter.loadStaticProject(rawProject);
  const nextNodes = project.nodes.map((node, index) => ({
    id: String(node.id || `N${index + 1}`),
    x: quantityToNumber(node.x ?? 0, "m"),
    y: quantityToNumber(node.y ?? 0, "m"),
    restraints: parseRestraints(node.restraints),
    support: parseSupport(node.support, node.restraints, node.support_angle),
    fused: Boolean(node.fused),
  }));
  const nextElements = project.elements.map((element, index) => ({
    id: String(element.id || `E${index + 1}`),
    node_i: String(element.node_i),
    node_j: String(element.node_j),
    material: String(element.material),
    section: String(element.section),
    type: String(element.type),
    geometry: String(element.geometry),
    curvature: Number(element.curvature || 0),
    arcAngle: Number(element.arcAngle || 45),
    teeDepth: element.teeDepth == null ? "0.35 m" : quantityToText(element.teeDepth, "m"),
    path: (element.path || []).map((point) => ({ x: Number(point.x), y: Number(point.y) })),
    sectionParams: JSON.parse(JSON.stringify(element.sectionParams || {})),
    moment_release_i: Boolean(element.moment_release_i),
    moment_release_j: Boolean(element.moment_release_j),
  }));
  const nextLoads = project.loads.nodes.map((load) => {
    const imported = {
      kind: load.kind ? String(load.kind) : "node",
      fx: quantityToText(load.fx, "N"),
      fy: quantityToText(load.fy, "N"),
      mz: quantityToText(load.mz, "N*m"),
    };
    if (load.element) {
      imported.element = String(load.element);
      imported.ratio = load.ratio == null ? 0.5 : Number(load.ratio);
    } else {
      imported.node = String(load.node);
    }
    return imported;
  });
  for (const load of project.loads.elements.filter((item) => String(item.kind) === "point_global")) {
    nextLoads.push({
      kind: "element_point",
      element: String(load.element),
      ratio: Number(load.ratio),
      fx: quantityToText(load.fx, "N"),
      fy: quantityToText(load.fy, "N"),
      mz: quantityToText(load.mz, "N*m"),
    });
  }
  const nextElementLoads = project.loads.elements
    .filter((load) => String(load.kind) !== "point_global")
    .map((load) => ({
      element: String(load.element),
      kind: String(load.kind),
      qx: quantityToText(load.qx, "N/m"),
      qy: quantityToText(load.qy, "N/m"),
      qx_i: quantityToText(load.qx_i, "N/m"),
      qx_j: quantityToText(load.qx_j, "N/m"),
      qy_i: quantityToText(load.qy_i, "N/m"),
      qy_j: quantityToText(load.qy_j, "N/m"),
      qx_coefficients: (load.qx_coefficients || []).map((item) => quantityToText(item, "N/m")),
      qy_coefficients: (load.qy_coefficients || []).map((item) => quantityToText(item, "N/m")),
    }));
  const nextMetadata = JSON.parse(JSON.stringify(project.metadata || {}));
  const nextMaterials = JSON.parse(JSON.stringify(project.materials));
  const nextSections = JSON.parse(JSON.stringify(project.sections));
  const nextSolver = String(project.solver || project.metadata?.solver || "frame2d");
  const nextMaterialE = nextMaterials[0]?.E;
  const nextSectionA = nextSections[0]?.A;
  const nextSectionI = nextSections[0]?.I;

  state.nodes = nextNodes;
  state.elements = nextElements;
  state.loads = nextLoads;
  state.elementLoads = nextElementLoads;
  state.projectMetadata = nextMetadata;
  state.projectMaterials = nextMaterials;
  state.projectSections = nextSections;
  state.nodeSeq = nextSequence(nextNodes, "N");
  state.elementSeq = nextSequence(nextElements, "E");
  state.selected = null;
  state.selection = { nodes: [], elements: [] };
  state.pendingNode = null;
  state.result = null;
  state.undoStack = [];
  state.redoStack = [];
  els.solverBackend.value = nextSolver;
  if (!els.solverBackend.value) els.solverBackend.value = "frame2d";
  if (nextMaterialE !== undefined) els.materialE.value = quantityToText(nextMaterialE, "Pa");
  if (nextSectionA !== undefined) els.sectionA.value = quantityToText(nextSectionA, "m^2");
  if (nextSectionI !== undefined) els.sectionI.value = quantityToText(nextSectionI, "m^4");
  syncUi();
  draw();
}

function parseSupport(raw, restraints, supportAngle) {
  const fallbackAngle = Number.isFinite(Number(supportAngle)) ? Number(supportAngle) : 0;
  if (raw && typeof raw === "object") {
    const angle = Number(raw.angle);
    return {
      type: String(raw.type || "free"),
      mode: String(raw.mode || raw.type || "free"),
      angle: Number.isFinite(angle) ? angle : fallbackAngle,
      orientationExplicit: Boolean(raw.orientationExplicit || raw.mode === "rotating"),
    };
  }
  const parsed = parseRestraints(restraints);
  if (parsed.ux && parsed.uy && parsed.rz) return { type: "fixed", mode: "fixed", angle: fallbackAngle };
  if (parsed.ux && parsed.uy) return { type: "pin", mode: "fixed-ground", angle: fallbackAngle };
  if (parsed.uy) return { type: "roller", mode: "rolling-ground", angle: fallbackAngle };
  return { type: "free", mode: "free", angle: 0 };
}

function supportAngleOf(node) {
  const angle = Number(node && node.support ? node.support.angle : 0);
  return Number.isFinite(angle) ? angle : 0;
}

function nextSequence(items, prefix) {
  let max = 0;
  for (const item of items) {
    const match = String(item.id).match(new RegExp(`^${prefix}(\\d+)$`));
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function quantityToText(value, defaultUnit) {
  return Units.quantityToText(value, defaultUnit);
}

function quantityToNumber(value, defaultUnit) {
  return Units.parseQuantity(value, defaultUnit);
}

function formatQuantity(value, unit) {
  const rounded = Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(6));
  return `${rounded} ${unit}`;
}

function saveProject() {
  try {
    const project = ProjectAdapter.loadStaticProject(buildEditableProject());
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mechanics-project.json";
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    showToast(String(error.message || error));
  }
}

function buildEditableProject() {
  const materials = JSON.parse(JSON.stringify(state.projectMaterials));
  const sections = JSON.parse(JSON.stringify(state.projectSections));
  if (!materials.length) materials.push({ id: "steel", E: els.materialE.value, nu: 0.3 });
  if (!sections.length) sections.push({ id: "default", A: els.sectionA.value, I: els.sectionI.value });
  materials[0] = { ...materials[0], E: els.materialE.value };
  sections[0] = { ...sections[0], A: els.sectionA.value, I: els.sectionI.value };
  return {
    schema: ProjectAdapter.STATIC_SCHEMA,
    application: ProjectAdapter.APPLICATION_ID,
    module: "statics",
    metadata: {
      ...JSON.parse(JSON.stringify(state.projectMetadata || {})),
      name: state.projectMetadata?.name || "canvas_project",
      solve_options: state.solveOptions.join(","),
    },
    solver: els.solverBackend.value,
    materials,
    sections,
    nodes: state.nodes.map((node) => ({
      id: node.id,
      x: `${node.x} m`,
      y: `${node.y} m`,
      restraints: restraintsToList(node.restraints),
      support: node.support || { type: "free", angle: 0, mode: "free" },
      fused: Boolean(node.fused),
    })),
    elements: state.elements.map((element) => ({
      id: element.id,
      node_i: element.node_i,
      node_j: element.node_j,
      material: element.material || materials[0].id,
      section: element.section || sections[0].id,
      type: element.type || "frame",
      geometry: elementGeometryOf(element),
      curvature: Number(element.curvature || 0),
      arcAngle: Number(element.arcAngle || 45),
      teeDepth: element.teeDepth || "0.35 m",
      sectionParams: element.sectionParams || {},
      moment_release_i: Boolean(element.moment_release_i),
      moment_release_j: Boolean(element.moment_release_j),
    })),
    loads: {
      nodes: state.loads.filter((load) => load.node).map((load) => ({ ...load })),
      elements: [
        ...state.elementLoads.map((load) => ({ ...load })),
        ...state.loads
          .filter((load) => load.kind === "element_point" && load.element)
          .map((load) => ({ ...load, kind: "point_global" })),
      ],
    },
  };
}

function selectedElement() {
  if (!state.selected || state.selected.type !== "element") return null;
  return getElement(state.selected.id);
}

function setSelectedElementType() {
  const element = selectedElement();
  if (!element) {
    showToast("请先选择杆件。");
    return;
  }
  mutate(() => {
    element.type = els.elementType.value;
    if (element.type !== "frame") {
      element.moment_release_i = false;
      element.moment_release_j = false;
    }
  });
}

function setSelectedElementReleases(changedEnd) {
  const element = selectedElement();
  if (!element) {
    showToast("请先选择普通梁柱杆件。");
    syncUi();
    return;
  }
  if (solverElementType(element) !== "frame") {
    showToast("端部弯矩释放仅适用于普通梁柱杆件。");
    syncUi();
    return;
  }
  let releaseI = Boolean(els.momentReleaseI.checked);
  let releaseJ = Boolean(els.momentReleaseJ.checked);
  if (releaseI && releaseJ) {
    if (changedEnd === "i") releaseJ = false;
    else releaseI = false;
    showToast("当前版本一次仅支持一个端部弯矩释放。");
  }
  mutate(() => {
    element.moment_release_i = releaseI;
    element.moment_release_j = releaseJ;
  });
}

function setSelectedElementShapeProperties() {
  const element = selectedElement();
  if (!element) return;
  mutate(() => {
    element.curvature = Number(els.elementCurvature.value || 0);
    element.teeDepth = els.teeDepth.value || "0.35 m";
  });
}

function setSelectedElementLength() {
  const element = selectedElement();
  if (!element) {
    showToast("请先选择杆件。");
    return;
  }
  const nodeI = getNode(element.node_i);
  const nodeJ = getNode(element.node_j);
  const length = quantityToNumber(els.elementLength.value, "m");
  if (!nodeI || !nodeJ || length <= 0) {
    showToast("杆件长度必须大于 0。");
    return;
  }
  mutate(() => {
    const dx = nodeJ.x - nodeI.x;
    const dy = nodeJ.y - nodeI.y;
    const current = Math.hypot(dx, dy) || 1;
    nodeJ.x = Number((nodeI.x + (dx / current) * length).toFixed(4));
    nodeJ.y = Number((nodeI.y + (dy / current) * length).toFixed(4));
  });
}

function openLoadDialog() {
  if (!els.loadDialog.open) els.loadDialog.showModal();
}

function syncLoadPanels() {
  state.loadMode = els.loadModeRadios.find((radio) => radio.checked).value;
  els.concentratedLoadPanel.classList.toggle("hidden", state.loadMode !== "concentrated");
  els.pointMomentPanel.classList.toggle("hidden", state.loadMode !== "point_moment");
  els.distributedLoadPanel.classList.toggle("hidden", state.loadMode !== "distributed");
  els.distributedMomentPanel.classList.toggle("hidden", state.loadMode !== "distributed_moment");
}

function setLoadDirection(direction) {
  state.loadDirection = direction;
  const angleMap = { right: 0, up: 90, left: 180, down: -90 };
  els.pointLoadAngle.value = angleMap[direction];
  els.loadDirectionButtons.forEach((button) => button.classList.toggle("active", button.dataset.loadDirection === direction));
}

function applyCurrentLoad(hitNode = null, hitElement = null, screenPoint = null) {
  if (state.loadMode === "distributed_moment") {
    const element = hitElement || (state.selected && state.selected.type === "element" ? getElement(state.selected.id) : null);
    if (!element) {
      showToast("均布力偶需要点选一根杆件。");
      return;
    }
    if (solverElementType(element) === "truss") {
      showToast("桁架杆只能在节点处承受外荷载，不能施加均布力偶。");
      return;
    }
    const intensity = quantityToNumber(els.distributedMoment.value || "0 N*m/m", "N*m/m");
    if (!Number.isFinite(intensity) || Math.abs(intensity) < 1e-12) {
      showToast("均布力偶强度不能为 0。");
      return;
    }
    state.elementLoads.push(makeDistributedMomentLoad(element, intensity));
    setSelection("element", element.id);
    return;
  }

  if (state.loadMode === "concentrated" || state.loadMode === "point_moment") {
    const node = hitNode || (state.selected && state.selected.type === "node" ? getNode(state.selected.id) : null);
    if (node) {
      const load = state.loadMode === "point_moment" ? makePointMomentLoad(node.id) : makeConcentratedLoad(node.id);
      state.loads.push(load);
      setSelection("node", node.id);
      return;
    }
    const element = hitElement || (state.selected && state.selected.type === "element" ? getElement(state.selected.id) : null);
    if (!element) {
      showToast("集中力或集中力偶需要点选节点或杆件上的任意位置。");
      return;
    }
    if (solverElementType(element) === "truss") {
      showToast("桁架杆只能在节点处承受外荷载；请在荷载位置插入节点并拆分杆件。");
      return;
    }
    const ratio = screenPoint ? elementRatioAtScreen(element, screenPoint) : 0.5;
    const load = state.loadMode === "point_moment" ? makeElementPointMomentLoad(element.id, ratio) : makeElementPointLoad(element.id, ratio);
    state.loads.push(load);
    setSelection("element", element.id);
    return;
  }

  const element = hitElement || (state.selected && state.selected.type === "element" ? getElement(state.selected.id) : null);
  if (!element) {
    showToast("分布荷载需要点选一根杆件。");
    return;
  }
  const load = makeDistributedLoad(element);
  state.elementLoads.push(load);
  setSelection("element", element.id);
}

function makeConcentratedLoad(nodeId) {
  const magnitude = Math.abs(quantityToNumber(els.pointLoadMagnitude.value, "N"));
  const angle = Number(els.pointLoadAngle.value || 0) * (Math.PI / 180);
  const fx = magnitude * Math.cos(angle);
  const fy = magnitude * Math.sin(angle);
  return {
    node: nodeId,
    fx: formatQuantity(fx, "N"),
    fy: formatQuantity(fy, "N"),
    mz: els.pointLoadMoment.value || "0 N*m",
  };
}

function makePointMomentLoad(nodeId) {
  return {
    node: nodeId,
    fx: "0 N",
    fy: "0 N",
    mz: els.pointMomentOnly.value || "0 N*m",
  };
}

function makeElementPointLoad(elementId, ratio) {
  const magnitude = Math.abs(quantityToNumber(els.pointLoadMagnitude.value, "N"));
  const angle = Number(els.pointLoadAngle.value || 0) * (Math.PI / 180);
  const fx = magnitude * Math.cos(angle);
  const fy = magnitude * Math.sin(angle);
  return {
    kind: "element_point",
    element: elementId,
    ratio: Number(Math.max(0, Math.min(1, ratio)).toFixed(4)),
    fx: formatQuantity(fx, "N"),
    fy: formatQuantity(fy, "N"),
    mz: els.pointLoadMoment.value || "0 N*m",
  };
}

function makeElementPointMomentLoad(elementId, ratio) {
  return {
    kind: "element_point",
    element: elementId,
    ratio: Number(Math.max(0, Math.min(1, ratio)).toFixed(4)),
    fx: "0 N",
    fy: "0 N",
    mz: els.pointMomentOnly.value || "0 N*m",
  };
}

function elementRatioAtScreen(element, point) {
  // Ratio is measured along the drawn path (arc length), which is also how
  // loads are mapped onto the solver segments of curved members.
  const path = elementScreenPath(element);
  if (path.length < 2) return 0.5;
  return GeometryDiscretize.pathRatioAtPoint(path, point);
}

function elementLengthWorld(element) {
  const nodeI = getNode(element.node_i);
  const nodeJ = getNode(element.node_j);
  if (!nodeI || !nodeJ) return 0;
  return Math.hypot(nodeJ.x - nodeI.x, nodeJ.y - nodeI.y);
}

function makeDistributedMomentLoad(element, intensity) {
  return {
    element: element.id,
    kind: "uniform_moment_local",
    mz: formatQuantity(intensity, "N*m/m"),
  };
}

function makeDistributedLoad(element) {
  const shape = els.distributedShape.value;
  if (shape === "custom") {
    return {
      element: element.id,
      kind: "polynomial_local",
      qx_coefficients: [],
      qy_coefficients: splitCoefficients(els.distributedCoefficients.value),
    };
  }

  const qiMagnitude = shape === "triangular" ? 0 : Math.abs(quantityToNumber(els.distributedQi.value, "N/m"));
  const qjMagnitude = Math.abs(quantityToNumber(els.distributedQj.value, "N/m"));
  const qi = localLoadComponents(element, qiMagnitude);
  const qj = localLoadComponents(element, qjMagnitude);
  if (shape === "rectangular") {
    return {
      element: element.id,
      kind: "uniform_local",
      qx: formatQuantity(qi.qx, "N/m"),
      qy: formatQuantity(qi.qy, "N/m"),
    };
  }
  return {
    element: element.id,
    kind: "linear_local",
    qx_i: formatQuantity(qi.qx, "N/m"),
    qy_i: formatQuantity(qi.qy, "N/m"),
    qx_j: formatQuantity(qj.qx, "N/m"),
    qy_j: formatQuantity(qj.qy, "N/m"),
  };
}

function splitCoefficients(text) {
  return String(text || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function globalVectorFromDirection(magnitude, direction, angleValue) {
  const angleMap = { right: 0, up: 90, left: 180, down: -90 };
  const angle = (direction === "angle" ? Number(angleValue || 0) : angleMap[direction]) * (Math.PI / 180);
  return { x: magnitude * Math.cos(angle), y: magnitude * Math.sin(angle) };
}

function localLoadComponents(element, magnitude) {
  const nodeI = getNode(element.node_i);
  const nodeJ = getNode(element.node_j);
  const dx = nodeJ.x - nodeI.x;
  const dy = nodeJ.y - nodeI.y;
  const length = Math.hypot(dx, dy) || 1;
  const c = dx / length;
  const s = dy / length;
  const global = globalVectorFromDirection(magnitude, els.distributedDirection.value, els.distributedAngle.value);
  return {
    qx: c * global.x + s * global.y,
    qy: -s * global.x + c * global.y,
  };
}

function openSolveDialog() {
  if (!els.solveDialog.open) els.solveDialog.showModal();
}

function openSupportDialog(node) {
  if (!node || !els.supportDialog) return;
  state.dialogNodeId = node.id;
  const support = node.support || supportFromRestraints(node.restraints);
  const type = ["pin", "roller", "ground", "fixed"].includes(support.type) ? support.type : "fixed";
  const radio = document.querySelector(`input[name='supportType'][value='${type}']`);
  if (radio) radio.checked = true;
  els.supportAngle.value = supportAngleOf(node);
  if (!els.supportDialog.open) els.supportDialog.showModal();
}

function applySupportSettings() {
  const node = getNode(state.dialogNodeId);
  if (!node) return;
  const checked = document.querySelector("input[name='supportType']:checked");
  const type = checked ? checked.value : "fixed";
  const rawAngle = Number(els.supportAngle.value);
  const angle = Number.isFinite(rawAngle) ? normalizeSupportAngle(rawAngle) : 0;
  mutate(() => {
    if (type === "ground") {
      node.restraints = { ux: true, uy: true, rz: true };
      node.support = { type: "ground", mode: "fixed-ground", angle, orientationExplicit: true };
    } else if (type === "fixed") {
      node.restraints = { ux: true, uy: true, rz: true };
      node.support = { type: "fixed", mode: "fixed", angle, orientationExplicit: true };
    } else if (type === "roller") {
      node.restraints = supportPresetToRestraints("roller");
      node.support = { type: "roller", mode: "rolling-ground", angle, orientationExplicit: true };
    } else {
      node.restraints = { ux: true, uy: true, rz: false };
      node.support = { type: "pin", mode: "fixed-ground", angle, orientationExplicit: true };
    }
    setSelection("node", node.id);
  });
}

function normalizeSupportAngle(angle) {
  let value = ((Number(angle) % 360) + 360) % 360;
  if (value > 180) value -= 360;
  return Number(value.toFixed(1));
}

function openNodeDialog(node) {
  if (!node || !els.nodeDialog) return;
  state.dialogNodeId = node.id;
  if (!els.nodeDialog.open) els.nodeDialog.showModal();
}

function solidifyDialogNode() {
  const node = getNode(state.dialogNodeId);
  if (!node) return;
  const connected = state.elements.filter((element) => element.node_i === node.id || element.node_j === node.id);
  if (!connected.length) {
    showToast("游离节点不能固化为杆件内部点。");
    return;
  }
  mutate(() => {
    node.fused = true;
    if (state.selected && state.selected.type === "node" && state.selected.id === node.id) clearSelection();
  });
  showToast(`${node.id} 已固化为杆件内部点。`);
}

async function solveFromDialog() {
  state.solveOptions = [...document.querySelectorAll("input[name='solveOption']:checked")].map((input) => input.value);
  const scope = document.querySelector("input[name='solveScope']:checked").value;
  els.solveDialog.close();
  await solveProject(scope);
}

async function solveProject(scope = "whole") {
  let project;
  try {
    project = buildProject({ scope });
  } catch (error) {
    showToast(String(error.message || error));
    return;
  }
  els.solveButton.disabled = true;
  try {
    const response = await fetch("/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(translateSolverError(payload.error || "求解失败。"));
    state.result = GeometryDiscretize.mergeResult(payload, project.expansion);
    state.expansion = project.expansion || {};
    state.lastProject = project;
    state.lastScope = scope;
    els.resultText.textContent = formatResult(state.result, project, scope);
    applySolveDisplayOptions();
    showToast("求解完成。");
    draw();
  } catch (error) {
    state.result = null;
    els.resultText.textContent = String(error.message || error);
    showToast(String(error.message || error));
    draw();
  } finally {
    els.solveButton.disabled = false;
  }
}

function applySolveDisplayOptions() {
  els.momentToggle.checked = state.solveOptions.includes("moment");
  els.shearToggle.checked = state.solveOptions.includes("shear");
  els.axialToggle.checked = state.solveOptions.includes("axial");
  els.stressStrainToggle.checked = state.solveOptions.includes("stress_strain");
}

function formatResult(payload, project, scope) {
  const summary = payload.summary || {};
  const optionLabels = state.solveOptions.map((option) => solveOptionLabel(option));
  const lines = [
    "求解结果",
    `求解范围：${scope === "selection" ? "选中隔离体" : "整体模型"}`,
    `求解内容：${optionLabels.join("、") || "未指定"}`,
    `体系判断：${systemJudgementText(payload)}`,
    "",
  ];

  const discretised = discretisationLines(project.expansion);
  if (discretised.length) {
    lines.push("几何离散");
    lines.push(...discretised);
    lines.push("");
  }

  appendDiagnosticsResult(lines, summary.diagnostics);

  if (state.solveOptions.includes("displacement")) {
    lines.push("节点位移与转角");
    for (const [nodeId, values] of sortedEntries(payload.displacements || {})) {
      lines.push(
        `- ${nodeId}: ux=${formatSigned(values.ux * 1000)} mm，uy=${formatSigned(values.uy * 1000)} mm，θ=${formatSigned(values.rz)} rad`
      );
    }
    lines.push("");
  }

  if (state.solveOptions.includes("reaction")) {
    lines.push("支座反力");
    const reactions = sortedEntries(payload.reactions || {});
    if (!reactions.length) lines.push("- 未形成支座反力。");
    for (const [nodeId, values] of reactions) {
      let text = `- ${nodeId}: Fx=${formatSigned((values.fx || 0) / 1000)} kN，Fy=${formatSigned((values.fy || 0) / 1000)} kN，Mz=${formatSigned(
        (values.mz || 0) / 1000
      )} kN·m`;
      const projectNode = (project.nodes || []).find((node) => node.id === nodeId);
      const angle = Number(projectNode && projectNode.support_angle);
      if (Number.isFinite(angle) && Math.abs(angle) > 1e-9) {
        const radians = (angle * Math.PI) / 180;
        const normal = -Math.sin(radians) * (values.fx || 0) + Math.cos(radians) * (values.fy || 0);
        const tangent = Math.cos(radians) * (values.fx || 0) + Math.sin(radians) * (values.fy || 0);
        text += `；支座转角 ${formatNumber(angle, 1)}°，法向反力 R⊥=${formatSigned(normal / 1000)} kN，沿地面 R∥=${formatSigned(tangent / 1000)} kN`;
      }
      lines.push(text);
    }
    lines.push("");
  }

  if (state.solveOptions.includes("internal")) {
    lines.push("杆端内力");
    for (const [elementId, values] of sortedEntries(payload.element_end_forces || {})) {
      lines.push(
        `- ${elementId}: Ni=${formatSigned(values.n_i / 1000)} kN，Vi=${formatSigned(values.v_i / 1000)} kN，Mi=${formatSigned(
          values.m_i / 1000
        )} kN·m；Nj=${formatSigned(values.n_j / 1000)} kN，Vj=${formatSigned(values.v_j / 1000)} kN，Mj=${formatSigned(
          values.m_j / 1000
        )} kN·m`
      );
    }
    lines.push("");
  }

  const extrema = [];
  if (state.solveOptions.includes("shear")) extrema.push(["剪力 V", "v", 1 / 1000, "kN"]);
  if (state.solveOptions.includes("moment")) extrema.push(["弯矩 M", "m", 1 / 1000, "kN·m"]);
  if (state.solveOptions.includes("axial")) extrema.push(["轴力 N", "n", 1 / 1000, "kN"]);
  if (extrema.length) {
    lines.push("内力图极值");
    for (const [label, component, scale, unit] of extrema) {
      const item = resultExtrema(payload, component, scale);
      if (!item) continue;
      lines.push(
        `- ${label}: 最大 ${formatSigned(item.max.value)} ${unit}（${item.max.element}, x=${formatNumber(item.max.x)} m），最小 ${formatSigned(
          item.min.value
        )} ${unit}（${item.min.element}, x=${formatNumber(item.min.x)} m）`
      );
    }
    lines.push("");
  }

  if (state.solveOptions.includes("stress") || state.solveOptions.includes("strain") || state.solveOptions.includes("stress_strain")) {
    appendStressStrainSummary(lines, payload, project);
  }

  if (state.solveOptions.includes("danger") && (summary.dangerous_sections || []).length) {
    lines.push("危险截面");
    for (const item of summary.dangerous_sections.slice(0, 3)) {
      lines.push(`- ${item.element}: x=${formatNumber(item.x)} m，|M|=${formatSigned(Math.abs(item.moment) / 1000)} kN·m`);
    }
    lines.push("");
  }

  if (state.solveOptions.includes("flexibility")) {
    lines.push("柔度");
    const flexibility = summary.load_point_flexibility || [];
    if (!flexibility.length) lines.push("- 当前荷载点没有可计算的柔度结果。");
    for (const item of flexibility) {
      const unit = item.kind === "rotation" ? "rad/(N·m)" : "m/N";
      lines.push(
        `- ${item.node}: 荷载=${formatSigned(item.load)}，响应=${formatSigned(item.displacement)}，柔度=${formatSigned(item.flexibility, 6)} ${unit}`
      );
    }
    lines.push("");
  }

  lines.push("计算推导过程");
  lines.push("1. 将界面输入统一换算到 SI 单位：力 N、长度 m、弹性模量 Pa、截面 A 为 m²、惯性矩 I 为 m⁴。");
  lines.push("2. 对每根杆件建立局部坐标梁柱单元刚度矩阵 k'，再用方向余弦构造转换矩阵 T，得到全局刚度 k=Tᵀk'T。");
  lines.push("3. 把集中荷载、分布荷载换算成等效节点荷载，组装总体方程 [K]{u}={P}。");
  lines.push("4. 按支座约束消去受限自由度，求得节点位移 ux、uy 和转角 θ。");
  lines.push("5. 由 {R}=[K]{u}-{P} 得到支座反力，由杆端位移反算 Ni、Vi、Mi、Nj、Vj、Mj，并沿杆长插值得到 N/V/M 图。");
  lines.push("   内力图符号约定：轴力 N 以拉为正、压为负；弯矩 M 以杆件下侧（局部 -y 侧）受拉为正；剪力 V 取截面左侧横向力之和。");
  if (state.solveOptions.includes("stress") || state.solveOptions.includes("strain") || state.solveOptions.includes("stress_strain")) {
    lines.push("6. 应力按 σ=N/A+M·c/I 估算，应变按 ε=σ/E 计算；当前 c 取等效截面高度 sqrt(A)/2。");
  }
  return lines.join("\n");
}

function solveOptionLabel(option) {
  const labels = {
    determinacy: "静定/超静定分析",
    system: "体系判断",
    internal: "各内力求解",
    moment: "弯矩图",
    shear: "剪力图",
    axial: "轴力图",
    displacement: "位移",
    reaction: "支座反力",
    danger: "危险截面",
    flexibility: "柔度",
    stress: "组合正应力估算",
    strain: "应变",
    stress_strain: "应变-应力图",
  };
  return labels[option] || option;
}

function appendDiagnosticsResult(lines, diagnostics) {
  if (!diagnostics) return;
  lines.push("模型诊断");
  lines.push(`- 节点数：${diagnostics.node_count ?? 0}`);
  lines.push(`- 单元数：${diagnostics.element_count ?? 0}`);
  lines.push(`- 约束自由度数：${diagnostics.restrained_dof_count ?? 0}`);
  lines.push(`- 总自由度数：${diagnostics.total_dof_count ?? 0}`);
  lines.push(`- 自由自由度数：${diagnostics.free_dof_count ?? 0}`);
  lines.push(`- 静定指数 s：${diagnostics.determinacy_index ?? 0}`);
  const components = diagnostics.connected_components || [];
  if (components.length) {
    lines.push(`- 连通分量：${components.map((component) => `[${component.join(", ")}]`).join("；")}`);
  }
  const issues = diagnostics.issues || [];
  if (issues.length) {
    lines.push("提示：");
    for (const issue of issues) {
      lines.push(`- [${diagnosticLevelLabel(issue.level)}] ${diagnosticIssueText(issue)}`);
    }
  } else {
    lines.push("提示：未发现拓扑级诊断问题。");
  }
  lines.push("");
}

function diagnosticLevelLabel(level) {
  const labels = {
    info: "信息",
    warning: "警告",
    error: "错误",
  };
  return labels[level] || level || "信息";
}

function diagnosticIssueText(issue) {
  const messages = {
    duplicate_node_id: "存在重复节点 ID。",
    missing_node_i: "存在杆件引用了缺失的起点节点。",
    missing_node_j: "存在杆件引用了缺失的终点节点。",
    zero_length_element: "存在零长度杆件。",
    disconnected_structure: "模型存在多个不连通部分。",
    isolated_node: "存在未连接到任何杆件的孤立节点。",
    no_free_dof: "模型没有可求解的自由自由度。",
    likely_mechanism: "静定指数为负，模型可能为机构或约束不足。",
    roughly_determinate: "静定指数为 0，拓扑估算可能为静定结构。",
    roughly_indeterminate: "静定指数为正，拓扑估算可能为超静定结构。",
  };
  return messages[issue.code] || issue.message || issue.code || "未知诊断信息。";
}

function sortedEntries(object) {
  return Object.entries(object || {}).sort(([a], [b]) => a.localeCompare(b, "zh-CN", { numeric: true }));
}

function formatNumber(value, digits = 4) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "0";
  if (Math.abs(numeric) < 1e-12) return "0";
  const abs = Math.abs(numeric);
  if (abs >= 100000 || abs < 0.001) return numeric.toExponential(3);
  return String(Number(numeric.toFixed(digits)));
}

function formatSigned(value, digits = 4) {
  return formatNumber(value, digits);
}

function resultExtrema(payload, component, scale = 1) {
  const points = [];
  for (const [elementId, rows] of sortedEntries(payload.element_diagrams || {})) {
    for (const row of rows || []) {
      points.push({ element: elementId, x: Number(row.x || 0), value: Number(row[component] || 0) * scale });
    }
  }
  if (!points.length) return null;
  return {
    max: points.reduce((best, point) => (point.value > best.value ? point : best), points[0]),
    min: points.reduce((best, point) => (point.value < best.value ? point : best), points[0]),
  };
}

function appendStressStrainSummary(lines, payload, project) {
  const values = [];
  for (const [elementId, rows] of sortedEntries(payload.element_diagrams || {})) {
    for (const row of rows || []) {
      const stress = stressAtProjectRow(row, project);
      values.push({
        element: elementId,
        x: Number(row.x || 0),
        stress: stress / 1e6,
        strain: (stress / projectElasticModulus(project)) * 1e6,
      });
    }
  }
  if (!values.length) return;
  const maxStress = values.reduce((best, item) => (Math.abs(item.stress) > Math.abs(best.stress) ? item : best), values[0]);
  const maxStrain = values.reduce((best, item) => (Math.abs(item.strain) > Math.abs(best.strain) ? item : best), values[0]);
  lines.push("应力与应变");
  if (state.solveOptions.includes("stress") || state.solveOptions.includes("stress_strain")) {
    lines.push(`- 最大组合正应力：${formatSigned(maxStress.stress)} MPa（${maxStress.element}, x=${formatNumber(maxStress.x)} m）`);
  }
  if (state.solveOptions.includes("strain") || state.solveOptions.includes("stress_strain")) {
    lines.push(`- 最大应变：${formatSigned(maxStrain.strain)} με（${maxStrain.element}, x=${formatNumber(maxStrain.x)} m）`);
  }
  lines.push("");
}

function stressAtProjectRow(row, project) {
  const section = (project.sections && project.sections[0]) || {};
  const area = Math.max(quantityToNumber(section.A || els.sectionA.value, "m^2"), 1e-12);
  const inertia = Math.max(quantityToNumber(section.I || els.sectionI.value, "m^4"), 1e-18);
  const c = Math.sqrt(area) / 2;
  return Number(row.n || 0) / area + (Number(row.m || 0) * c) / inertia;
}

function projectElasticModulus(project) {
  const material = (project.materials && project.materials[0]) || {};
  return Math.max(quantityToNumber(material.E || els.materialE.value, "Pa"), 1);
}

function systemJudgementText(payload) {
  const system = payload && payload.summary && payload.summary.system;
  if (!system || !Number.isFinite(Number(system.degrees_of_freedom))) return "后端未提供体系判断";
  const W = Number(system.degrees_of_freedom);
  const hinges = Number(system.hinged_connections || 0);
  const pins = Number(system.pin_joints || 0);
  let count = `W = 3×${system.joints} − 3×${system.members}`;
  if (hinges) count += ` + ${hinges}（铰接端）`;
  count += ` − ${system.restraints}（约束）`;
  if (pins) count += ` − ${pins}（全铰节点）`;
  count += ` = ${W}`;
  if (system.classification === "unstable") return `几何可变体系（常变），${count}`;
  if (system.classification === "determinate") return `几何不变、静定结构（刚度矩阵满秩），${count}`;
  return `几何不变、${system.indeterminacy} 次超静定结构（刚度矩阵满秩），${count}`;
}

function translateSolverError(message) {
  const text = String(message || "");
  if (/At least three restrained DOFs/i.test(text)) return "体系判断：约束自由度少于 3，属于几何可变体系，无法求解。请补充支座。";
  if (/Isolated nodes are not allowed/i.test(text)) return `存在未连接杆件的孤立节点，无法求解：${text.split(":").pop().trim()}`;
  if (/at least one element/i.test(text)) return "模型中还没有杆件。";
  if (/at least one node/i.test(text)) return "模型中还没有节点。";
  if (/Model has no free degrees of freedom/i.test(text)) return "模型没有自由度（所有节点都被完全约束），无需求解。";
  if (/Unsupported element type/i.test(text)) return `后端不支持该杆件类型，请在前端离散为直杆后求解：${text}`;
  if (/geometrically unstable/i.test(text)) return text.replace(/\s*\[Structure is geometrically unstable[^\]]*\]\s*$/, "");
  return text;
}

async function downloadReport() {
  let project;
  try {
    project = buildProject();
  } catch (error) {
    showToast(String(error.message || error));
    return;
  }
  els.reportButton.disabled = true;
  try {
    draw();
    const reportProject = {
      ...project,
      metadata: {
        ...project.metadata,
        report_options: state.solveOptions.join(","),
        report_scope: state.lastScope || "whole",
      },
      report_options: state.solveOptions,
      report_images: {
        model: canvasDataUrl(canvas),
        diagrams: canvasDataUrl(diagramCanvas),
      },
    };
    const response = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportProject),
    });
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "导出失败。");
    }
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mechanics-report.pdf";
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("计算书已导出。");
  } catch (error) {
    showToast(String(error.message || error));
  } finally {
    els.reportButton.disabled = false;
  }
}

function canvasDataUrl(target) {
  try {
    return target.toDataURL("image/jpeg", 0.92);
  } catch (error) {
    return "";
  }
}

function syncUi() {
  els.nodeCount.textContent = String(state.nodes.filter((node) => !node.fused).length);
  els.elementCount.textContent = String(state.elements.length);
  els.loadCount.textContent = String(state.loads.length + state.elementLoads.length);
  els.undoButton.disabled = state.undoStack.length === 0;
  els.redoButton.disabled = state.redoStack.length === 0;
  els.deleteButton.disabled = !state.selected && !state.selection.nodes.length && !state.selection.elements.length;
  syncSelectionInfo();
}

function syncSelectionInfo() {
  const selectedCount = state.selection.nodes.length + state.selection.elements.length;
  if (!state.selected && selectedCount === 0) {
    els.selectionInfo.textContent = "未选择";
    els.setElementLengthButton.disabled = true;
    els.momentReleaseI.checked = false;
    els.momentReleaseJ.checked = false;
    els.momentReleaseI.disabled = true;
    els.momentReleaseJ.disabled = true;
    return;
  }
  els.setElementLengthButton.disabled = !(state.selected && state.selected.type === "element");
  if (selectedCount > 1) {
    els.selectionInfo.textContent = `已选择：${state.selection.nodes.length} 个节点，${state.selection.elements.length} 根杆件`;
    els.momentReleaseI.disabled = true;
    els.momentReleaseJ.disabled = true;
    return;
  }
  if (state.selected && state.selected.type === "node") {
    const node = getNode(state.selected.id);
    const load = state.loads.find((item) => item.node === node.id);
    const restraints = restraintsToList(node.restraints).join(", ") || "自由";
    els.selectionInfo.textContent = `${node.id}: x=${node.x.toFixed(3)} m, y=${node.y.toFixed(3)} m, 约束=${restraints}${
      load ? `, 荷载=(${load.fx}, ${load.fy}, ${load.mz})` : ""
    }`;
    els.momentReleaseI.checked = false;
    els.momentReleaseJ.checked = false;
    els.momentReleaseI.disabled = true;
    els.momentReleaseJ.disabled = true;
    return;
  }
  if (state.selected && state.selected.type === "element") {
    const element = getElement(state.selected.id);
    const nodeI = getNode(element.node_i);
    const nodeJ = getNode(element.node_j);
    const length = Math.hypot(nodeJ.x - nodeI.x, nodeJ.y - nodeI.y);
    const load = state.elementLoads.find((item) => item.element === element.id);
    els.elementType.value = element.type || "frame";
    const canReleaseMoment = solverElementType(element) === "frame";
    els.momentReleaseI.checked = Boolean(element.moment_release_i);
    els.momentReleaseJ.checked = Boolean(element.moment_release_j);
    els.momentReleaseI.disabled = !canReleaseMoment;
    els.momentReleaseJ.disabled = !canReleaseMoment;
    els.elementLength.value = `${Number(length.toFixed(4))} m`;
    const geometry = elementGeometryOf(element);
    els.selectionInfo.textContent = `${element.id}: ${element.node_i} -> ${element.node_j}, 长度=${length.toFixed(3)} m, 力学类型=${
      element.type || "frame"
    }, 几何=${geometryLabel(geometry)}${geometry === "arc" ? `, 曲率=${element.curvature || 0}` : ""}${
      geometry === "tee" ? `, T形高度=${element.teeDepth || "0.35 m"}` : ""
    }${
      load ? `, 分布荷载=${load.kind}` : ""
    }`;
  }
}

function geometryLabel(geometry) {
  const labels = {
    right_angle: "直角杆件",
    straight: "直杆",
    arc: "弧形杆件",
    tee: "T形杆件",
    freeform: "任意形状杆件",
  };
  return labels[geometry] || geometry;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("visible"), 2400);
}

function cssColor(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawElements();
  drawElementLoads();
  if (state.result && els.deformedToggle.checked) drawDeformedShape();
  drawSupports();
  drawLoads();
  drawNodes();
  drawPreview();
  drawSelectionGesture();
  drawDiagrams();
}

function resizeDynamicsCanvas() {
  if (!dynamicsCanvas) return;
  const rect = dynamicsCanvas.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return;
  const previousWidth = dynamicsCanvas.width;
  const previousHeight = dynamicsCanvas.height;
  const nextWidth = Math.max(1, Math.floor(rect.width));
  const nextHeight = Math.max(1, Math.floor(rect.height));
  if (nextWidth === previousWidth && nextHeight === previousHeight) {
    drawDynamicsScene();
    return;
  }
  dynamicsCanvas.width = nextWidth;
  dynamicsCanvas.height = nextHeight;
  if (!state.dynamics.viewportInitialized) {
    state.dynamics.origin = { x: nextWidth / 2, y: nextHeight / 2 };
    state.dynamics.viewportInitialized = true;
  } else {
    state.dynamics.origin.x += (nextWidth - previousWidth) / 2;
    state.dynamics.origin.y += (nextHeight - previousHeight) / 2;
  }
  drawDynamicsScene();
}

function syncDynamicsControls() {
  if (!els.dynamicsBuildKind) return;
  const isCustom = els.dynamicsBuildKind.value === "custom";
  els.dynamicsCustomMode.disabled = !isCustom;
  els.dynamicsShapeEquation.disabled = true;
  syncDynamicsSizeLabels();
  syncDynamicsFieldDialog();
  syncDynamicsCanvasCursor();
}

function dynamicsObjectById(id) {
  return state.dynamics.objects.find((object) => object.id === id) || null;
}

function selectedDynamicsObject() {
  return dynamicsObjectById(state.dynamics.selectedObjectId);
}

function dynamicsObjectColor(index) {
  return ["#1688c5", "#e06c3b", "#6f9f39", "#8b5fc7", "#c08b18", "#d04f7b"][index % 6];
}

function syncDynamicsSizeLabels() {
  const kind = els.dynamicsBuildKind.value;
  const labels = {
    particle: ["显示尺寸", "质点半径", "厚度"],
    rod: ["杆长", "杆宽", "厚度"],
    circle: ["圆盘直径", "圆盘半径", "厚度"],
    ring: ["外径", "圆环半径", "厚度"],
    rectangle: ["矩形长度", "矩形宽度", "厚度"],
    custom: ["包络长度", "包络宽度", "厚度"],
  }[kind] || ["尺寸 A", "尺寸 B", "厚度"];
  els.dynamicsSizeALabel.textContent = labels[0];
  els.dynamicsSizeBLabel.textContent = labels[1];
  els.dynamicsSizeCLabel.textContent = labels[2];
}

function dynamicsObjectFromControls(kind, world, path = null) {
  const id = `D${state.dynamics.objectSeq++}`;
  const rigid = els.dynamicsRigidToggle.checked;
  const sizeB = Math.max(Math.abs(dynamicsValue(els.dynamicsSizeB, "m")), 1e-6);
  if (rigid) state.dynamics.model = "coupled-rigid-body2d";
  return {
    id,
    name: `${dynamicsKindLabel(kind)} ${id}`,
    dynamicsModel: "particle2d",
    kind,
    x: world.x,
    y: world.y,
    vx0: dynamicsValue(els.dynamicsVx0, "m/s"),
    vy0: dynamicsValue(els.dynamicsVy0, "m/s"),
    mass: Math.max(dynamicsValue(els.dynamicsMass, "kg"), 1e-9),
    density: Math.max(dynamicsValue(els.dynamicsDensity, "kg/m^3"), 0),
    charge: dynamicsValue(els.dynamicsCharge, "C"),
    sizeA: Math.max(Math.abs(dynamicsValue(els.dynamicsSizeA, "m")), 1e-6),
    sizeB,
    sizeC: Math.max(Math.abs(dynamicsValue(els.dynamicsSizeC, "m")), 1e-6),
    materialE: Math.max(dynamicsValue(els.dynamicsMaterialE, "Pa"), 0),
    rigid,
    theta0: Number(els.dynamicsTheta0.value || 0),
    omega0: Number(els.dynamicsOmega0.value || 0),
    collisionRadius: sizeB,
    contact: {
      enabled: rigid && ["particle", "circle"].includes(kind),
      restitution: 0.8,
      staticFriction: 0.5,
      dynamicFriction: 0.3,
      damping: 0,
    },
    equation: els.dynamicsShapeEquation.value.trim(),
    path,
  };
}

function syncDynamicsObjectControls(object) {
  if (!object) {
    els.dynamicsObjectPanelTitle.textContent = "对象参数";
    return;
  }
  els.dynamicsObjectPanelTitle.textContent = `对象参数 · ${object.name}`;
  els.dynamicsBuildKind.value = object.kind;
  els.dynamicsMass.value = `${formatNumber(object.mass)} kg`;
  els.dynamicsDensity.value = `${formatNumber(object.density)} kg/m^3`;
  els.dynamicsCharge.value = `${formatNumber(object.charge)} C`;
  els.dynamicsSizeA.value = `${formatNumber(object.sizeA)} m`;
  els.dynamicsSizeB.value = `${formatNumber(object.sizeB)} m`;
  els.dynamicsSizeC.value = `${formatNumber(object.sizeC)} m`;
  els.dynamicsMaterialE.value = `${formatNumber(object.materialE)} Pa`;
  els.dynamicsShapeEquation.value = object.equation || els.dynamicsShapeEquation.value;
  els.dynamicsRigidToggle.checked = Boolean(object.rigid);
  els.dynamicsX0.value = `${formatNumber(object.x)} m`;
  els.dynamicsY0.value = `${formatNumber(object.y)} m`;
  els.dynamicsVx0.value = `${formatNumber(object.vx0)} m/s`;
  els.dynamicsVy0.value = `${formatNumber(object.vy0)} m/s`;
  els.dynamicsTheta0.value = String(Number(object.theta0 || 0));
  els.dynamicsOmega0.value = String(Number(object.omega0 || 0));
  state.dynamics.object = object;
  syncDynamicsControls();
}

function updateSelectedDynamicsObjectFromControls() {
  const object = selectedDynamicsObject();
  if (!object) return;
  recordDynamicsHistory();
  object.mass = Math.max(dynamicsValue(els.dynamicsMass, "kg"), 1e-9);
  object.density = Math.max(dynamicsValue(els.dynamicsDensity, "kg/m^3"), 0);
  object.charge = dynamicsValue(els.dynamicsCharge, "C");
  object.sizeA = Math.max(Math.abs(dynamicsValue(els.dynamicsSizeA, "m")), 1e-6);
  object.sizeB = Math.max(Math.abs(dynamicsValue(els.dynamicsSizeB, "m")), 1e-6);
  object.sizeC = Math.max(Math.abs(dynamicsValue(els.dynamicsSizeC, "m")), 1e-6);
  object.materialE = Math.max(dynamicsValue(els.dynamicsMaterialE, "Pa"), 0);
  object.rigid = els.dynamicsRigidToggle.checked;
  object.theta0 = Number(els.dynamicsTheta0.value || 0);
  object.omega0 = Number(els.dynamicsOmega0.value || 0);
  object.collisionRadius = object.sizeB;
  object.contact = {
    ...(object.contact || {}),
    enabled: object.rigid && ["particle", "circle"].includes(object.kind),
    restitution: Number(object.contact?.restitution ?? 0.8),
    staticFriction: Number(object.contact?.staticFriction ?? 0.5),
    dynamicFriction: Number(object.contact?.dynamicFriction ?? 0.3),
    damping: Number(object.contact?.damping ?? 0),
  };
  if (object.rigid) state.dynamics.model = "coupled-rigid-body2d";
  object.equation = els.dynamicsShapeEquation.value.trim();
  object.x = dynamicsValue(els.dynamicsX0, "m");
  object.y = dynamicsValue(els.dynamicsY0, "m");
  object.vx0 = dynamicsValue(els.dynamicsVx0, "m/s");
  object.vy0 = dynamicsValue(els.dynamicsVy0, "m/s");
  state.dynamics.object = object;
  state.dynamics.result = null;
  cancelDynamicsAnimation();
  renderDynamicsResult();
  renderDynamicsSceneLists();
  drawDynamicsScene();
}

function selectDynamicsObject(id) {
  cancelDynamicsFieldPlacement({ silent: true });
  const object = dynamicsObjectById(id);
  if (!object) return;
  state.dynamics.selectedObjectId = id;
  state.dynamics.object = object;
  syncDynamicsObjectControls(object);
  renderDynamicsSceneLists();
  drawDynamicsScene();
}

function deleteDynamicsObject(id) {
  cancelDynamicsFieldPlacement({ silent: true });
  if (!dynamicsObjectById(id)) return;
  recordDynamicsHistory();
  cancelDynamicsAnimation();
  state.dynamics.objects = state.dynamics.objects.filter((object) => object.id !== id);
  state.dynamics.forces = state.dynamics.forces.filter((force) => force.targetId !== id);
  state.dynamics.constraints = (state.dynamics.constraints || []).filter((constraint) => constraint.bodyId !== id);
  if (state.dynamics.selectedObjectId === id) {
    state.dynamics.selectedObjectId = state.dynamics.objects[0]?.id || null;
    state.dynamics.object = state.dynamics.objects[0] || null;
    syncDynamicsObjectControls(state.dynamics.object);
  }
  state.dynamics.result = null;
  renderDynamicsResult();
  renderDynamicsSceneLists();
  drawDynamicsScene();
}

function deleteDynamicsField(id) {
  cancelDynamicsFieldPlacement({ silent: true });
  if (!state.dynamics.fields.some((field) => field.id === id)) return;
  recordDynamicsHistory();
  cancelDynamicsAnimation();
  state.dynamics.fields = state.dynamics.fields.filter((field) => field.id !== id);
  state.dynamics.field = state.dynamics.fields[state.dynamics.fields.length - 1] || null;
  state.dynamics.result = null;
  renderDynamicsResult();
  updateDynamicsFieldStatus();
  renderDynamicsSceneLists();
  drawDynamicsScene();
}

function deleteDynamicsForce(id) {
  cancelDynamicsFieldPlacement({ silent: true });
  if (!state.dynamics.forces.some((force) => force.id === id)) return;
  recordDynamicsHistory();
  cancelDynamicsAnimation();
  state.dynamics.forces = state.dynamics.forces.filter((force) => force.id !== id);
  state.dynamics.result = null;
  renderDynamicsResult();
  renderDynamicsSceneLists();
  drawDynamicsScene();
}

function deleteDynamicsTrack(id) {
  cancelDynamicsFieldPlacement({ silent: true });
  if (!(state.dynamics.tracks || []).some((track) => track.id === id)) return;
  recordDynamicsHistory();
  cancelDynamicsAnimation();
  state.dynamics.tracks = state.dynamics.tracks.filter((track) => track.id !== id);
  state.dynamics.constraints = (state.dynamics.constraints || []).filter((constraint) => constraint.trackId !== id);
  state.dynamics.result = null;
  renderDynamicsResult();
  renderDynamicsSceneLists();
  drawDynamicsScene();
}

function createDynamicsSceneRow({ id, text, color, selected = false, kind }) {
  const row = document.createElement("div");
  row.className = `dynamics-scene-row${selected ? " selected" : ""}`;
  row.dataset.kind = String(kind);
  row.dataset.id = String(id);

  const swatch = document.createElement("span");
  swatch.className = "dynamics-scene-swatch";
  swatch.style.backgroundColor = color;

  const label = document.createElement("span");
  label.className = "dynamics-scene-row-main";
  label.textContent = text;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.dataset.delete = String(kind);
  deleteButton.setAttribute("aria-label", "删除");
  deleteButton.textContent = "×";
  row.append(swatch, label, deleteButton);
  return row;
}

function replaceDynamicsSceneList(container, rows, emptyText) {
  container.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "dynamics-scene-empty";
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  rows.forEach((row) => fragment.appendChild(row));
  container.appendChild(fragment);
}

function renderDynamicsSceneLists() {
  if (!els.dynamicsObjectList) return;
  els.dynamicsObjectCount.textContent = String(state.dynamics.objects.length);
  els.dynamicsFieldCount.textContent = String(state.dynamics.fields.length);
  els.dynamicsForceCount.textContent = String(state.dynamics.forces.length);
  els.dynamicsTrackCount.textContent = String((state.dynamics.tracks || []).length);
  replaceDynamicsSceneList(
    els.dynamicsObjectList,
    state.dynamics.objects.map((object, index) =>
      createDynamicsSceneRow({
        id: object.id,
        text: `${object.name} · m=${formatNumber(object.mass)} kg`,
        color: dynamicsObjectColor(index),
        selected: object.id === state.dynamics.selectedObjectId,
        kind: "object",
      })
    ),
    "暂无对象"
  );
  replaceDynamicsSceneList(
    els.dynamicsFieldList,
    state.dynamics.fields.map((field) =>
      createDynamicsSceneRow({
        id: field.id,
        text: `${dynamicsFieldKindLabel(field.kind)} · ${dynamicsRangeLabel(field.rangeType)}`,
        color: dynamicsFieldColor(field.kind),
        kind: "field",
      })
    ),
    "暂无场"
  );
  replaceDynamicsSceneList(
    els.dynamicsForceList,
    state.dynamics.forces.map((force) => {
      const target = dynamicsObjectById(force.targetId);
      const type = force.type === "impulse" ? "瞬时" : "持续";
      const unit = force.type === "impulse" ? "N·s" : "N";
      return createDynamicsSceneRow({
        id: force.id,
        text: `${type} · ${target?.name || force.targetId} · ${formatNumber(force.magnitude)} ${unit}`,
        color: force.type === "impulse" ? "#8b5fc7" : "#e06c3b",
        kind: "force",
      });
    }),
    "暂无外力"
  );
  replaceDynamicsSceneList(
    els.dynamicsTrackList,
    (state.dynamics.tracks || []).map((track) =>
      createDynamicsSceneRow({
        id: track.id,
        text: `${track.kind || track.type} · ${track.endpointBehavior || "open"}`,
        color: "#24c7b1",
        kind: "track",
      })
    ),
    "暂无轨道（可打开 v2 工程）"
  );
  syncDynamicsActionUi();
}

function selectedDynamicsOptions() {
  return new Set(els.dynamicsOptionInputs.filter((input) => input.checked).map((input) => input.value));
}

function buildDynamicsProject() {
  return {
    schema: ProjectAdapter.DYNAMICS_SCHEMA,
    application: ProjectAdapter.APPLICATION_ID,
    module: "dynamics",
    model: state.dynamics.model || "independent-particle2d",
    simulation: {
      ...JSON.parse(JSON.stringify(state.dynamics.simulationSettings || {})),
      duration: els.dynamicsDuration.value,
      timeStep: els.dynamicsTimeStep.value,
    },
    objects: JSON.parse(JSON.stringify(state.dynamics.objects)),
    fields: JSON.parse(JSON.stringify(state.dynamics.fields)),
    forces: JSON.parse(JSON.stringify(state.dynamics.forces)),
    grounds: JSON.parse(JSON.stringify(state.dynamics.grounds || [])),
    tracks: JSON.parse(JSON.stringify(state.dynamics.tracks || [])),
    constraints: JSON.parse(JSON.stringify(state.dynamics.constraints || [])),
  };
}

function saveDynamicsProject() {
  try {
    const project = DynamicsController.loadProject(buildDynamicsProject());
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mechanics-dynamics-project.json";
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    showDynamicsToast(String(error.message || error), 3600);
  }
}

function importDynamicsProject(rawProject) {
  cancelDynamicsFieldPlacement({ silent: true });
  const project = DynamicsController.loadProject(rawProject);
  const nextObjects = project.objects.map((raw, index) => {
    const object = DynamicsCore.normalizeObject(raw);
    return {
      ...object,
      id: String(raw.id || `D${index + 1}`),
      name: String(raw.name || `${dynamicsKindLabel(object.kind)} D${index + 1}`),
      dynamicsModel: String(raw.dynamicsModel || object.dynamicsModel || "particle2d"),
      density: Number(raw.massProperties?.density ?? raw.density ?? 0),
      rigid: Boolean(raw.rigid || raw.dynamicsModel === "rigid-body2d" || project.model === "coupled-rigid-body2d"),
      theta0: Number(raw.initialState?.theta ?? raw.theta0 ?? raw.angle ?? 0),
      omega0: Number(raw.initialState?.omega ?? raw.omega0 ?? raw.angularVelocity ?? 0),
      inertia: raw.massProperties?.inertia ?? raw.inertia,
      centerOfMass: raw.massProperties?.centerOfMass ?? raw.centerOfMass,
      collisionRadius: raw.geometry?.collisionRadius ?? raw.collisionRadius,
      contact: raw.contact ? JSON.parse(JSON.stringify(raw.contact)) : undefined,
      path: Array.isArray(object.path) ? object.path.map((point) => ({ x: Number(point.x), y: Number(point.y) })) : null,
    };
  });
  const nextFields = JSON.parse(JSON.stringify(project.fields));
  const nextForces = JSON.parse(JSON.stringify(project.forces));
  const nextGrounds = JSON.parse(JSON.stringify(project.grounds || []));
  const nextTracks = JSON.parse(JSON.stringify(project.tracks || []));
  const nextConstraints = JSON.parse(JSON.stringify(project.constraints || []));
  const nextObjectSeq = nextSequence(nextObjects, "D");
  const nextFieldSeq = nextSequence(nextFields, "F");
  const nextForceSeq = nextSequence(nextForces, "A");
  const nextDuration = quantityToText(project.simulation.duration, "s");
  const nextTimeStep = quantityToText(project.simulation.timeStep, "s");

  cancelDynamicsAnimation();
  state.dynamics.objects = nextObjects;
  state.dynamics.fields = nextFields;
  state.dynamics.forces = nextForces;
  state.dynamics.model = project.model;
  state.dynamics.grounds = nextGrounds;
  state.dynamics.tracks = nextTracks;
  state.dynamics.constraints = nextConstraints;
  state.dynamics.simulationSettings = Object.fromEntries(
    Object.entries(project.simulation).filter(([key]) => !["duration", "timeStep"].includes(key))
  );
  if (els.dynamicsGroundToggle) els.dynamicsGroundToggle.checked = nextGrounds.length > 0;
  state.dynamics.objectSeq = nextObjectSeq;
  state.dynamics.fieldSeq = nextFieldSeq;
  state.dynamics.forceSeq = nextForceSeq;
  state.dynamics.selectedObjectId = nextObjects[0]?.id || null;
  state.dynamics.object = nextObjects[0] || null;
  state.dynamics.field = nextFields[nextFields.length - 1] || null;
  state.dynamics.result = null;
  state.dynamics.undoStack = [];
  state.dynamics.redoStack = [];
  els.dynamicsDuration.value = nextDuration;
  els.dynamicsTimeStep.value = nextTimeStep;
  syncDynamicsObjectControls(state.dynamics.object);
  updateDynamicsFieldStatus();
  renderDynamicsSceneLists();
  renderDynamicsResult();
  drawDynamicsScene();
}

function deleteSelectedDynamicsObject() {
  if (!state.dynamics.selectedObjectId) return;
  deleteDynamicsObject(state.dynamics.selectedObjectId);
}

function syncDynamicsActionUi() {
  if (!els.dynamicsUndoButton) return;
  els.dynamicsUndoButton.disabled = state.dynamics.undoStack.length === 0;
  els.dynamicsRedoButton.disabled = state.dynamics.redoStack.length === 0;
  els.dynamicsDeleteButton.disabled = !state.dynamics.selectedObjectId;
  els.dynamicsReportButton.disabled = !state.dynamics.result;
}

function openDynamicsSolveDialog() {
  cancelDynamicsFieldPlacement({ silent: true });
  if (!state.dynamics.objects.length) {
    showDynamicsToast("请先放置至少一个对象。", 2600);
    return;
  }
  if (!els.dynamicsSolveDialog.open) els.dynamicsSolveDialog.showModal();
}

async function downloadDynamicsReport() {
  if (!state.dynamics.result) {
    showDynamicsToast("请先完成动力学求解。", 2600);
    return;
  }
  els.dynamicsReportButton.disabled = true;
  try {
    const reportText = DynamicsReport.buildReportText({
      objects: state.dynamics.objects,
      fields: state.dynamics.fields,
      forces: state.dynamics.forces,
      result: state.dynamics.result,
      options: selectedDynamicsOptions(),
    });
    const response = await fetch("/api/dynamics-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report_text: reportText,
        report_images: { model: canvasDataUrl(dynamicsCanvas) },
      }),
    });
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "导出失败。");
    }
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "动力学计算书.pdf";
    link.click();
    URL.revokeObjectURL(link.href);
    showDynamicsToast("动力学计算书已导出。", 2200);
  } catch (error) {
    showDynamicsToast(String(error.message || error), 3600);
  } finally {
    syncDynamicsActionUi();
  }
}

function dynamicsValue(input, defaultUnit) {
  return quantityToNumber(input.value, defaultUnit);
}

function vectorFromAngle(magnitude, angleDegrees) {
  return DynamicsCore.vectorFromAngle(magnitude, angleDegrees);
}

function dynamicsFieldUnit(kind) {
  if (kind === "electric") return "N/C";
  if (kind === "magnetic") return "T";
  return "m/s^2";
}

function dynamicsFieldKindLabel(kind) {
  return {
    zero: "零场",
    gravity: "重力场",
    electric: "电场",
    magnetic: "磁场",
  }[kind] || kind;
}

function dynamicsRangeLabel(rangeType) {
  return {
    global: "全局范围",
    rectangle: "矩形范围",
    circle: "圆形范围",
    custom: "任意范围",
  }[rangeType] || rangeType;
}

function dynamicsFieldColor(kind) {
  return { gravity: "#1688c5", electric: "#e08a2e", magnetic: "#8b5fc7" }[kind] || "#1688c5";
}

function setDynamicsFieldDefaults(kind) {
  if (kind === "gravity") {
    els.dynamicsFieldMagnitude.value = "9.81 m/s^2";
    els.dynamicsFieldDirectionPreset.value = "down";
    els.dynamicsFieldAngle.value = "-90";
    els.dynamicsFieldExpressionX.value = "0";
    els.dynamicsFieldExpressionY.value = "-9.81";
  } else if (kind === "electric") {
    els.dynamicsFieldMagnitude.value = "1 N/C";
    els.dynamicsFieldDirectionPreset.value = "right";
    els.dynamicsFieldAngle.value = "0";
    els.dynamicsFieldExpressionX.value = "1";
    els.dynamicsFieldExpressionY.value = "0";
  } else if (kind === "magnetic") {
    els.dynamicsFieldMagnitude.value = "1 T";
    els.dynamicsMagneticDirection.value = "out";
    els.dynamicsFieldExpressionX.value = "1";
    els.dynamicsFieldExpressionY.value = "0";
  } else {
    els.dynamicsFieldMagnitude.value = "0";
  }
}

function syncDynamicsFieldDialog() {
  if (!els.dynamicsEnvironment) return;
  const kind = els.dynamicsEnvironment.value;
  const rangeType = els.dynamicsFieldRange.value;
  const isZero = kind === "zero";
  const isMagnetic = kind === "magnetic";
  const variableMode = els.dynamicsFieldMode.value !== "constant" && !isZero;
  const editingFieldId = state.dynamics.fieldPlacement.editingFieldId;
  const editingField = editingFieldId ? state.dynamics.fields.find((field) => field.id === editingFieldId) : null;
  els.dynamicsFieldMagnitude.disabled = isZero || variableMode;
  els.dynamicsFieldExpressionFields.classList.toggle("hidden", !variableMode);
  els.dynamicsFieldExpressionXLabel.textContent = isMagnetic ? "Bz 表达式（T）" : "x 分量表达式";
  els.dynamicsFieldExpressionYField.classList.toggle("hidden", isMagnetic);
  els.dynamicsVectorDirectionField.classList.toggle("hidden", isMagnetic || isZero || variableMode);
  els.dynamicsFieldAngleField.classList.toggle("hidden", isMagnetic || isZero || variableMode);
  els.dynamicsMagneticDirectionField.classList.toggle("hidden", !isMagnetic || variableMode);
  els.dynamicsFieldRange.disabled = isZero;
  els.dynamicsFieldCenterX.disabled = isZero || rangeType === "global";
  els.dynamicsFieldCenterY.disabled = isZero || rangeType === "global";
  els.dynamicsRectangleRangeFields.classList.toggle("hidden", rangeType !== "rectangle" || isZero);
  els.dynamicsCircleRangeField.classList.toggle("hidden", rangeType !== "circle" || isZero);
  els.dynamicsFieldAngle.disabled = els.dynamicsFieldDirectionPreset.value !== "custom" || isZero;
  const canApplyNumerically =
    !isZero &&
    rangeType !== "global" &&
    (rangeType !== "custom" || (editingField?.rangeType === "custom" && Array.isArray(editingField.path)));
  els.dynamicsFieldNumericApplyButton.classList.toggle("hidden", !canApplyNumerically);
  els.dynamicsFieldNumericApplyButton.textContent = editingField ? "按数值更新" : "按数值添加";
  els.dynamicsFieldApplyButton.textContent = {
    global: "应用全局场",
    rectangle: "在画布绘制矩形范围",
    circle: "在画布绘制圆形范围",
    custom: "在画布绘制任意范围",
  }[rangeType] || "应用场";
  if (isZero) els.dynamicsFieldApplyButton.textContent = editingField ? "删除当前场" : "应用零场";
  if (!isMagnetic && !isZero && els.dynamicsFieldDirectionPreset.value !== "custom") {
    const angles = { right: 0, up: 90, left: 180, down: -90 };
    els.dynamicsFieldAngle.value = String(angles[els.dynamicsFieldDirectionPreset.value] ?? -90);
  }
  if (isZero) {
    els.dynamicsFieldMessage.textContent = "零场不会在画布中绘制，也不会对对象施加外场作用。";
  } else if (variableMode) {
    els.dynamicsFieldMessage.textContent = "表达式仅允许 t、x、y、vx、vy 与白名单数学函数；使用受控 AST 求值，不执行脚本。常量大小仅用于画布预览。";
  } else if (rangeType === "global") {
    els.dynamicsFieldMessage.textContent = "全局均匀场作用于无限建模空间，可连续定义重力势能或电势能。";
  } else if (rangeType === "custom") {
    els.dynamicsFieldMessage.textContent = editingField?.rangeType === "custom"
      ? "可按数值更新场参数和中心位置，或重新在画布绘制范围。"
      : "点击主按钮后，在建模区按住鼠标左键绘制任意场范围。";
  } else {
    els.dynamicsFieldMessage.textContent = "可按数值精确添加，也可在建模区拖动绘制范围。";
  }
}

function openDynamicsFieldDialog(fieldId = null) {
  cancelDynamicsFieldPlacement({ silent: true });
  state.dynamics.placementMode = false;
  state.dynamics.painting = false;
  state.dynamics.paintPath = [];
  const field = fieldId ? state.dynamics.fields.find((item) => item.id === fieldId) : null;
  state.dynamics.fieldPlacement = DynamicsFieldPlacement.configurePlacement(field?.id || null);
  if (field) {
    els.dynamicsEnvironment.value = field.kind;
    els.dynamicsFieldMagnitude.value = field.magnitudeText || `${field.magnitude} ${dynamicsFieldUnit(field.kind)}`;
    els.dynamicsFieldDirectionPreset.value = field.directionPreset || "custom";
    els.dynamicsFieldAngle.value = String(field.angle ?? -90);
    els.dynamicsMagneticDirection.value = field.magneticDirection || "out";
    els.dynamicsFieldRange.value = field.rangeType || "rectangle";
    els.dynamicsFieldCenterX.value = `${field.centerX ?? 0} m`;
    els.dynamicsFieldCenterY.value = `${field.centerY ?? 0} m`;
    els.dynamicsFieldWidth.value = `${field.width ?? 8} m`;
    els.dynamicsFieldHeight.value = `${field.height ?? 6} m`;
    els.dynamicsFieldRadius.value = `${field.radius ?? 3} m`;
    els.dynamicsFieldMode.value = field.variation?.mode || "constant";
    const expressions = field.variation?.expressions || field.variation?.components || {};
    els.dynamicsFieldExpressionX.value = String(field.kind === "magnetic" ? expressions.z ?? "1" : expressions.x ?? "0");
    els.dynamicsFieldExpressionY.value = String(expressions.y ?? "0");
  } else {
    const center = DynamicsFieldGeometry.viewportWorldCenter({
      origin: state.dynamics.origin,
      scale: state.dynamics.scale,
      canvasWidth: dynamicsCanvas.width,
      canvasHeight: dynamicsCanvas.height,
    });
    els.dynamicsEnvironment.value = "gravity";
    els.dynamicsFieldMode.value = "constant";
    setDynamicsFieldDefaults("gravity");
    els.dynamicsFieldRange.value = "rectangle";
    els.dynamicsFieldCenterX.value = `${formatNumber(center.x)} m`;
    els.dynamicsFieldCenterY.value = `${formatNumber(center.y)} m`;
    els.dynamicsFieldWidth.value = "8 m";
    els.dynamicsFieldHeight.value = "6 m";
    els.dynamicsFieldRadius.value = "3 m";
  }
  syncDynamicsFieldDialog();
  syncDynamicsCanvasCursor();
  els.dynamicsFieldDialog.showModal();
}

function dynamicsFieldDraftFromDialog({ preserveCustomPath = false } = {}) {
  const kind = els.dynamicsEnvironment.value;
  const rangeType = els.dynamicsFieldRange.value;
  const editingFieldId = state.dynamics.fieldPlacement.editingFieldId;
  const existing = editingFieldId ? state.dynamics.fields.find((field) => field.id === editingFieldId) : null;
  const field = {
    kind,
    magnitude: Math.abs(dynamicsValue(els.dynamicsFieldMagnitude, dynamicsFieldUnit(kind))),
    magnitudeText: els.dynamicsFieldMagnitude.value.trim(),
    directionPreset: els.dynamicsFieldDirectionPreset.value,
    angle: Number(els.dynamicsFieldAngle.value || 0),
    magneticDirection: els.dynamicsMagneticDirection.value,
    rangeType,
    centerX: dynamicsValue(els.dynamicsFieldCenterX, "m"),
    centerY: dynamicsValue(els.dynamicsFieldCenterY, "m"),
    width: Math.abs(dynamicsValue(els.dynamicsFieldWidth, "m")),
    height: Math.abs(dynamicsValue(els.dynamicsFieldHeight, "m")),
    radius: Math.abs(dynamicsValue(els.dynamicsFieldRadius, "m")),
    path: null,
  };
  if (els.dynamicsFieldMode.value !== "constant") {
    field.variation = {
      mode: els.dynamicsFieldMode.value,
      representation: "components",
      unit: dynamicsFieldUnit(kind),
      components:
        kind === "magnetic"
          ? { z: els.dynamicsFieldExpressionX.value.trim() }
          : {
              x: els.dynamicsFieldExpressionX.value.trim(),
              y: els.dynamicsFieldExpressionY.value.trim(),
            },
    };
  }
  if (rangeType === "custom" && preserveCustomPath && existing?.rangeType === "custom" && Array.isArray(existing.path)) {
    field.path = DynamicsFieldGeometry.translatePathToCenter(existing.path, {
      x: field.centerX,
      y: field.centerY,
    });
    const bounds = DynamicsFieldGeometry.polygonBounds(field.path);
    field.centerX = bounds.centerX;
    field.centerY = bounds.centerY;
    field.width = bounds.width;
    field.height = bounds.height;
  }
  return field;
}

function dynamicsFieldValidationMessage(field, validation) {
  if (field.rangeType === "rectangle") return "矩形场的宽度和高度必须大于 0。";
  if (field.rangeType === "circle") return "圆形场的半径必须大于 0。";
  if (field.rangeType === "custom") return "任意场范围至少需要三个点，并且必须围成有效区域。";
  return validation.error || "场范围无效。";
}

function commitDynamicsField(field, editingFieldId = null) {
  if (field.variation) DynamicsFields.compileField(DynamicsWorld.variableFieldSpec(field));
  const validation = DynamicsFieldGeometry.validateFieldGeometry(field);
  if (!validation.valid) {
    const message = dynamicsFieldValidationMessage(field, validation);
    els.dynamicsFieldMessage.textContent = message;
    showDynamicsToast(message, 3000);
    return false;
  }
  const existingIndex = editingFieldId
    ? state.dynamics.fields.findIndex((item) => item.id === editingFieldId)
    : -1;
  if (editingFieldId && existingIndex < 0) {
    showDynamicsToast("要编辑的场已不存在，请重新选择。", 2800);
    return false;
  }
  recordDynamicsHistory();
  const completed = JSON.parse(JSON.stringify(field));
  if (existingIndex >= 0) {
    completed.id = state.dynamics.fields[existingIndex].id;
    state.dynamics.fields[existingIndex] = completed;
  } else {
    completed.id = `F${state.dynamics.fieldSeq++}`;
    state.dynamics.fields.push(completed);
  }
  state.dynamics.field = completed;
  state.dynamics.fieldPlacement = DynamicsFieldPlacement.cancelPlacement();
  state.dynamics.result = null;
  cancelDynamicsAnimation();
  renderDynamicsResult();
  updateDynamicsFieldStatus();
  renderDynamicsSceneLists();
  syncDynamicsCanvasCursor();
  drawDynamicsScene();
  showDynamicsToast(`${dynamicsFieldKindLabel(completed.kind)}已${existingIndex >= 0 ? "更新" : "添加"}。`, 2200);
  return true;
}

function applyDynamicsZeroField(editingFieldId) {
  state.dynamics.fieldPlacement = DynamicsFieldPlacement.cancelPlacement();
  els.dynamicsFieldDialog.close();
  if (editingFieldId && state.dynamics.fields.some((field) => field.id === editingFieldId)) {
    deleteDynamicsField(editingFieldId);
    showDynamicsToast("当前场已删除，场景恢复为无该外场。", 2200);
  } else {
    syncDynamicsCanvasCursor();
    showDynamicsToast("零场不产生作用，未添加新的场。", 2200);
  }
}

function applyDynamicsField() {
  try {
    const editingFieldId = state.dynamics.fieldPlacement.editingFieldId;
    const kind = els.dynamicsEnvironment.value;
    if (kind === "zero") {
      applyDynamicsZeroField(editingFieldId);
      return;
    }
    const rangeType = els.dynamicsFieldRange.value;
    const draft = dynamicsFieldDraftFromDialog();
    if (rangeType === "global") {
      if (commitDynamicsField(draft, editingFieldId)) els.dynamicsFieldDialog.close();
      return;
    }
    state.dynamics.placementMode = false;
    state.dynamics.painting = false;
    state.dynamics.paintPath = [];
    state.dynamics.fieldPlacement = DynamicsFieldPlacement.beginPlacement(state.dynamics.fieldPlacement, {
      mode: rangeType,
      draft,
    });
    els.dynamicsFieldDialog.close();
    updateDynamicsFieldStatus();
    syncDynamicsCanvasCursor();
    drawDynamicsScene();
    showDynamicsToast(`在建模区拖动绘制${dynamicsRangeLabel(rangeType)}；Esc 或右键取消。`, 3600);
  } catch (error) {
    els.dynamicsFieldMessage.textContent = String(error.message || error);
  }
}

function applyDynamicsFieldNumerically() {
  try {
    const editingFieldId = state.dynamics.fieldPlacement.editingFieldId;
    const field = dynamicsFieldDraftFromDialog({ preserveCustomPath: true });
    if (commitDynamicsField(field, editingFieldId)) els.dynamicsFieldDialog.close();
  } catch (error) {
    els.dynamicsFieldMessage.textContent = String(error.message || error);
  }
}

function cancelDynamicsFieldPlacement({ silent = false } = {}) {
  const wasActive = Boolean(state.dynamics.fieldPlacement?.active);
  state.dynamics.fieldPlacement = DynamicsFieldPlacement.cancelPlacement();
  if (els.dynamicsFieldDialog?.open) els.dynamicsFieldDialog.close();
  updateDynamicsFieldStatus();
  syncDynamicsCanvasCursor();
  drawDynamicsScene();
  if (wasActive && !silent) showDynamicsToast("已取消场放置，场景未发生变化。", 2200);
}

function updateDynamicsFieldStatus() {
  if (state.dynamics.fieldPlacement.active) {
    els.dynamicsFieldStatus.textContent = `正在绘制${dynamicsRangeLabel(state.dynamics.fieldPlacement.mode)}`;
    return;
  }
  const fields = state.dynamics.fields;
  if (!fields.length) {
    els.dynamicsFieldStatus.textContent = "未应用场";
    return;
  }
  els.dynamicsFieldStatus.textContent = `复合场 ${fields.length}`;
}

function dynamicsFieldVector(field) {
  return DynamicsCore.fieldVector(field);
}

function pointInDynamicsField(point, field) {
  return DynamicsCore.pointInField(point, field);
}

function syncDynamicsForceDialog() {
  const continuous = els.dynamicsForceType.value === "continuous";
  const pointFrame = els.dynamicsForcePointFrame.value;
  els.dynamicsForceMagnitudeLabel.textContent = continuous ? "力的大小" : "冲量大小";
  els.dynamicsForceStartField.classList.toggle("hidden", !continuous);
  els.dynamicsForceDurationField.classList.toggle("hidden", !continuous);
  els.dynamicsForceAngle.disabled = els.dynamicsForceDirectionPreset.value !== "custom";
  els.dynamicsForcePointX.disabled = pointFrame === "center";
  els.dynamicsForcePointY.disabled = pointFrame === "center";
  if (els.dynamicsForceDirectionPreset.value !== "custom") {
    const angles = { right: 0, up: 90, left: 180, down: -90 };
    els.dynamicsForceAngle.value = String(angles[els.dynamicsForceDirectionPreset.value] ?? 0);
  }
  const pointMessage =
    pointFrame === "center" ? "默认作用于质心。" : pointFrame === "local" ? "局部作用点会随刚体旋转。" : "世界作用点保持绝对坐标。";
  els.dynamicsForceMessage.textContent = `${
    continuous
      ? "持续力在设定时间段内参与积分；持续时间为 0 时作用到求解结束。"
      : "瞬时力按冲量处理，只在初始瞬间改变线速度与角速度。"
  } ${pointMessage}`;
}

function openDynamicsForceDialog() {
  cancelDynamicsFieldPlacement({ silent: true });
  if (!state.dynamics.objects.length) {
    showDynamicsToast("请先放置至少一个对象。", 2400);
    return;
  }
  els.dynamicsForceTarget.replaceChildren();
  state.dynamics.objects.forEach((object) => {
    const option = document.createElement("option");
    option.value = String(object.id);
    option.textContent = object.name;
    els.dynamicsForceTarget.appendChild(option);
  });
  if (state.dynamics.selectedObjectId) els.dynamicsForceTarget.value = state.dynamics.selectedObjectId;
  els.dynamicsForceType.value = "impulse";
  els.dynamicsForceMagnitude.value = "1 N*s";
  els.dynamicsForceDirectionPreset.value = "right";
  els.dynamicsForceAngle.value = "0";
  els.dynamicsForceStart.value = "0 s";
  els.dynamicsForceDuration.value = "0 s";
  els.dynamicsForcePointFrame.value = "center";
  els.dynamicsForcePointX.value = "0";
  els.dynamicsForcePointY.value = "0";
  syncDynamicsForceDialog();
  els.dynamicsForceDialog.showModal();
}

function applyDynamicsForce() {
  const targetId = els.dynamicsForceTarget.value;
  if (!dynamicsObjectById(targetId)) return;
  const type = els.dynamicsForceType.value;
  const unit = type === "impulse" ? "N*s" : "N";
  const magnitude = Math.abs(dynamicsValue(els.dynamicsForceMagnitude, unit));
  const angle = Number(els.dynamicsForceAngle.value || 0);
  const vector = vectorFromAngle(magnitude, angle);
  const pointFrame = els.dynamicsForcePointFrame.value;
  const applicationPoint = {
    frame: pointFrame === "world" ? "world" : "local",
    x: pointFrame === "center" ? 0 : Number(els.dynamicsForcePointX.value || 0),
    y: pointFrame === "center" ? 0 : Number(els.dynamicsForcePointY.value || 0),
  };
  recordDynamicsHistory();
  if (pointFrame !== "center") {
    state.dynamics.model = "coupled-rigid-body2d";
    const target = dynamicsObjectById(targetId);
    target.rigid = true;
    target.collisionRadius = target.collisionRadius || target.sizeB;
    target.contact = {
      ...(target.contact || {}),
      enabled: ["particle", "circle"].includes(target.kind),
      restitution: Number(target.contact?.restitution ?? 0.8),
      staticFriction: Number(target.contact?.staticFriction ?? 0.5),
      dynamicFriction: Number(target.contact?.dynamicFriction ?? 0.3),
      damping: Number(target.contact?.damping ?? 0),
    };
  }
  state.dynamics.forces.push({
    id: `A${state.dynamics.forceSeq++}`,
    targetId,
    type,
    magnitude,
    angle,
    x: vector.x,
    y: vector.y,
    start: type === "continuous" ? Math.max(0, dynamicsValue(els.dynamicsForceStart, "s")) : 0,
    duration: type === "continuous" ? Math.max(0, dynamicsValue(els.dynamicsForceDuration, "s")) : 0,
    applicationPoint,
  });
  state.dynamics.result = null;
  els.dynamicsForceDialog.close();
  renderDynamicsResult();
  renderDynamicsSceneLists();
  drawDynamicsScene();
  showDynamicsToast(type === "impulse" ? "瞬时冲量已添加。" : "持续力已添加。", 2000);
}

function solveDynamics() {
  if (!els.dynamicsMass) return;
  if (!state.dynamics.objects.length) {
    showDynamicsToast("请先点击“放置对象”，并在建模区确定对象位置。", 3200);
    return;
  }
  cancelDynamicsAnimation();
  const duration = dynamicsValue(els.dynamicsDuration, "s");
  const timeStep = dynamicsValue(els.dynamicsTimeStep, "s");
  try {
    const project = buildDynamicsProject();
    project.simulation.duration = duration;
    project.simulation.timeStep = timeStep;
    const controller = DynamicsController.createController(project);
    state.dynamics.result = controller.solve();
  } catch (error) {
    state.dynamics.result = null;
    renderDynamicsResult();
    showDynamicsToast(String(error.message || error), 4500);
    return;
  }
  renderDynamicsResult();
  drawDynamicsScene();
  if (selectedDynamicsOptions().has("trajectory")) startDynamicsAnimation();
  showDynamicsToast(`已完成 ${state.dynamics.result.objectResults.length} 个对象的动力学求解。`);
}

function renderDynamicsResult() {
  const result = state.dynamics.result;
  if (!result) {
    els.dynamicsResultText.textContent = "暂无结果";
    syncDynamicsActionUi();
    return;
  }
  els.dynamicsResultText.textContent = DynamicsReport.buildResultText({
    result,
    fields: state.dynamics.fields,
    forces: state.dynamics.forces,
    options: selectedDynamicsOptions(),
  }).trimEnd();
  syncDynamicsActionUi();
}

function dynamicsKindLabel(kind) {
  return {
    particle: "质点",
    rod: "杆",
    circle: "圆",
    ring: "圆环",
    rectangle: "矩形",
    custom: "任意形状",
  }[kind] || kind;
}

function drawDynamicsScene(sampleMap = null) {
  if (!dynamicsCtx || !dynamicsCanvas) return;
  dynamicsCtx.clearRect(0, 0, dynamicsCanvas.width, dynamicsCanvas.height);
  drawDynamicsGrid();
  drawDynamicsField();
  drawDynamicsTracksAndGrounds();
  const result = state.dynamics.result;
  if (result && selectedDynamicsOptions().has("trajectory")) {
    for (const item of result.objectResults) {
      const sample = sampleMap?.[item.objectId] || null;
      drawDynamicsTrajectory(item.samples, sample ? sample.t : Infinity, item.objectId);
      drawDynamicsObject(sample || item.samples[0], item);
    }
  } else {
    for (const object of state.dynamics.objects) drawDynamicsObject(object, null);
  }
  drawDynamicsAppliedForces();
  drawDynamicsRangeDraft();
}

function dynamicsToScreen(point) {
  return {
    x: state.dynamics.origin.x + point.x * state.dynamics.scale,
    y: state.dynamics.origin.y - point.y * state.dynamics.scale,
  };
}

function dynamicsToWorld(point) {
  return {
    x: (point.x - state.dynamics.origin.x) / state.dynamics.scale,
    y: (state.dynamics.origin.y - point.y) / state.dynamics.scale,
  };
}

function dynamicsGridStep() {
  const desiredWorld = 62 / state.dynamics.scale;
  const power = 10 ** Math.floor(Math.log10(desiredWorld));
  const normalized = desiredWorld / power;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * power;
}

function drawDynamicsGrid() {
  dynamicsCtx.save();
  dynamicsCtx.fillStyle = cssColor("--canvas");
  dynamicsCtx.fillRect(0, 0, dynamicsCanvas.width, dynamicsCanvas.height);
  dynamicsCtx.strokeStyle = cssColor("--grid");
  dynamicsCtx.lineWidth = 1;
  const worldStep = dynamicsGridStep();
  const step = worldStep * state.dynamics.scale;
  for (let x = ((state.dynamics.origin.x % step) + step) % step; x < dynamicsCanvas.width; x += step) {
    lineDynamics({ x, y: 0 }, { x, y: dynamicsCanvas.height });
  }
  for (let y = ((state.dynamics.origin.y % step) + step) % step; y < dynamicsCanvas.height; y += step) {
    lineDynamics({ x: 0, y }, { x: dynamicsCanvas.width, y });
  }
  dynamicsCtx.strokeStyle = cssColor("--grid-major");
  dynamicsCtx.lineWidth = 1.4;
  if (state.dynamics.origin.y >= 0 && state.dynamics.origin.y <= dynamicsCanvas.height) {
    lineDynamics({ x: 0, y: state.dynamics.origin.y }, { x: dynamicsCanvas.width, y: state.dynamics.origin.y });
  }
  if (state.dynamics.origin.x >= 0 && state.dynamics.origin.x <= dynamicsCanvas.width) {
    lineDynamics({ x: state.dynamics.origin.x, y: 0 }, { x: state.dynamics.origin.x, y: dynamicsCanvas.height });
  }
  dynamicsCtx.fillStyle = cssColor("--muted");
  dynamicsCtx.font = "12px Segoe UI, Arial, sans-serif";
  dynamicsCtx.fillText(`网格 ${formatNumber(worldStep)} m`, 14, 22);
  if (state.dynamics.origin.y >= 18 && state.dynamics.origin.y <= dynamicsCanvas.height) {
    dynamicsCtx.fillText("x (m)", dynamicsCanvas.width - 54, state.dynamics.origin.y - 8);
  }
  if (state.dynamics.origin.x >= 0 && state.dynamics.origin.x <= dynamicsCanvas.width - 42) {
    dynamicsCtx.fillText("y (m)", state.dynamics.origin.x + 8, 18);
  }
  dynamicsCtx.restore();
}

function drawDynamicsField() {
  for (const field of state.dynamics.fields) drawSingleDynamicsField(field);
}

function drawDynamicsTracksAndGrounds() {
  dynamicsCtx.save();
  dynamicsCtx.strokeStyle = "#24c7b1";
  dynamicsCtx.lineWidth = 2.4;
  for (const trackSpec of state.dynamics.tracks || []) {
    try {
      const frames = DynamicsTracks.sampleTrack({ ...trackSpec, ...(trackSpec.geometry || {}) }, { count: 96 });
      dynamicsCtx.beginPath();
      frames.forEach((frame, index) => {
        const screen = dynamicsToScreen(frame.point || frame);
        if (index === 0) dynamicsCtx.moveTo(screen.x, screen.y);
        else dynamicsCtx.lineTo(screen.x, screen.y);
      });
      dynamicsCtx.stroke();
    } catch (_error) {
      // Project validation reports malformed tracks; the renderer stays fail-safe.
    }
  }
  dynamicsCtx.strokeStyle = "#e5b955";
  dynamicsCtx.lineWidth = 2;
  for (const ground of state.dynamics.grounds || []) {
    const normal = ground.normal || { x: 0, y: 1 };
    const lengthSquared = normal.x * normal.x + normal.y * normal.y;
    if (!(lengthSquared > 1e-12)) continue;
    const offset = Number(ground.offset || 0);
    const base = { x: (normal.x * offset) / lengthSquared, y: (normal.y * offset) / lengthSquared };
    const tangent = { x: -normal.y, y: normal.x };
    const extent = (Math.max(dynamicsCanvas.width, dynamicsCanvas.height) / state.dynamics.scale) * 2;
    const start = dynamicsToScreen({ x: base.x - tangent.x * extent, y: base.y - tangent.y * extent });
    const end = dynamicsToScreen({ x: base.x + tangent.x * extent, y: base.y + tangent.y * extent });
    dynamicsCtx.beginPath();
    dynamicsCtx.moveTo(start.x, start.y);
    dynamicsCtx.lineTo(end.x, end.y);
    dynamicsCtx.stroke();
  }
  dynamicsCtx.restore();
}

function drawSingleDynamicsField(field) {
  if (field.kind === "zero" || (field.rangeType === "custom" && (!field.path || field.path.length < 3))) return;
  const color = dynamicsFieldColor(field.kind);
  dynamicsCtx.save();
  traceDynamicsFieldRange(field);
  dynamicsCtx.fillStyle = `${color}${document.body.classList.contains("dark-theme") ? "20" : "14"}`;
  dynamicsCtx.fill();
  dynamicsCtx.strokeStyle = color;
  dynamicsCtx.lineWidth = 1.5;
  dynamicsCtx.setLineDash([7, 5]);
  dynamicsCtx.stroke();
  dynamicsCtx.setLineDash([]);
  traceDynamicsFieldRange(field);
  dynamicsCtx.clip();
  const spacing = 54;
  for (let x = 26; x < dynamicsCanvas.width; x += spacing) {
    for (let y = 30; y < dynamicsCanvas.height; y += spacing) {
      const world = dynamicsToWorld({ x, y });
      if (!pointInDynamicsField(world, field)) continue;
      if (field.kind === "magnetic") drawDynamicsMagneticSymbol({ x, y }, field.magneticDirection, color);
      else drawDynamicsVectorSymbol({ x, y }, dynamicsFieldVector(field), color);
    }
  }
  dynamicsCtx.restore();
}

function traceDynamicsFieldRange(field) {
  dynamicsCtx.beginPath();
  if (field.rangeType === "global") {
    dynamicsCtx.rect(0, 0, dynamicsCanvas.width, dynamicsCanvas.height);
    return;
  }
  if (field.rangeType === "circle") {
    const center = dynamicsToScreen({ x: field.centerX, y: field.centerY });
    dynamicsCtx.arc(center.x, center.y, field.radius * state.dynamics.scale, 0, Math.PI * 2);
    return;
  }
  if (field.rangeType === "custom") {
    field.path.forEach((point, index) => {
      const screen = dynamicsToScreen(point);
      if (index === 0) dynamicsCtx.moveTo(screen.x, screen.y);
      else dynamicsCtx.lineTo(screen.x, screen.y);
    });
    dynamicsCtx.closePath();
    return;
  }
  const topLeft = dynamicsToScreen({ x: field.centerX - field.width / 2, y: field.centerY + field.height / 2 });
  dynamicsCtx.rect(topLeft.x, topLeft.y, field.width * state.dynamics.scale, field.height * state.dynamics.scale);
}

function drawDynamicsVectorSymbol(center, vector, color = cssColor("--blue")) {
  const length = Math.hypot(vector.x, vector.y);
  if (length < 1e-12) return;
  const unit = { x: vector.x / length, y: -vector.y / length };
  const start = { x: center.x - unit.x * 10, y: center.y - unit.y * 10 };
  const end = { x: center.x + unit.x * 10, y: center.y + unit.y * 10 };
  dynamicsCtx.strokeStyle = color;
  dynamicsCtx.fillStyle = color;
  dynamicsCtx.lineWidth = 1.6;
  drawDynamicsArrow(start, end, 6);
}

function drawDynamicsMagneticSymbol(center, direction, color = cssColor("--blue")) {
  dynamicsCtx.strokeStyle = color;
  dynamicsCtx.fillStyle = color;
  dynamicsCtx.lineWidth = 1.5;
  dynamicsCtx.beginPath();
  dynamicsCtx.arc(center.x, center.y, 7, 0, Math.PI * 2);
  dynamicsCtx.stroke();
  if (direction === "out") {
    dynamicsCtx.beginPath();
    dynamicsCtx.arc(center.x, center.y, 2.2, 0, Math.PI * 2);
    dynamicsCtx.fill();
  } else {
    lineDynamics({ x: center.x - 4, y: center.y - 4 }, { x: center.x + 4, y: center.y + 4 });
    lineDynamics({ x: center.x + 4, y: center.y - 4 }, { x: center.x - 4, y: center.y + 4 });
  }
}

function drawDynamicsTrajectory(samples, endTime = Infinity, objectId = null) {
  if (!samples.length) return;
  const visibleSamples = samples.filter((point) => point.t <= endTime + 1e-9);
  if (!visibleSamples.length) return;
  dynamicsCtx.save();
  const objectIndex = Math.max(0, state.dynamics.objects.findIndex((object) => object.id === objectId));
  dynamicsCtx.strokeStyle = dynamicsObjectColor(objectIndex);
  dynamicsCtx.lineWidth = 2.2;
  dynamicsCtx.beginPath();
  visibleSamples.forEach((point, index) => {
    const screen = dynamicsToScreen(point);
    if (index === 0) dynamicsCtx.moveTo(screen.x, screen.y);
    else dynamicsCtx.lineTo(screen.x, screen.y);
  });
  dynamicsCtx.stroke();
  dynamicsCtx.setLineDash([5, 5]);
  dynamicsCtx.strokeStyle = cssColor("--muted");
  for (let index = 0; index < visibleSamples.length; index += Math.max(1, Math.floor(samples.length / 18))) {
    const screen = dynamicsToScreen(visibleSamples[index]);
    lineDynamics({ x: screen.x, y: screen.y }, { x: screen.x, y: state.dynamics.origin.y });
  }
  dynamicsCtx.restore();
}

function drawDynamicsObject(point, result) {
  const model = result ? dynamicsObjectById(result.objectId) : dynamicsObjectById(point.id) || point;
  const kind = result?.buildKind || model?.kind || els.dynamicsBuildKind.value;
  const screen = dynamicsToScreen(point);
  const sizeA = Math.max(16, Math.min(120, (result?.sizeA || model?.sizeA || 1) * state.dynamics.scale));
  const rawSizeB = (result?.sizeB || model?.sizeB || 0.2) * state.dynamics.scale;
  const sizeB = Math.max(kind === "particle" ? 4 : 10, Math.min(kind === "particle" ? 40 : 90, rawSizeB));
  const bodyAngle = Number(point.angle ?? point.theta ?? model?.theta0 ?? 0);
  const objectIndex = Math.max(0, state.dynamics.objects.findIndex((object) => object.id === model?.id));
  const color = dynamicsObjectColor(objectIndex);
  dynamicsCtx.save();
  dynamicsCtx.strokeStyle = color;
  dynamicsCtx.fillStyle = `${color}${document.body.classList.contains("dark-theme") ? "3d" : "26"}`;
  dynamicsCtx.lineWidth = model?.id === state.dynamics.selectedObjectId ? 3 : 2;
  if (kind === "custom" && model?.path?.length > 1) {
    const dx = point.x - model.x;
    const dy = point.y - model.y;
    dynamicsCtx.beginPath();
    model.path.forEach((pathPoint, index) => {
      const pathScreen = dynamicsToScreen({ x: pathPoint.x + dx, y: pathPoint.y + dy });
      if (index === 0) dynamicsCtx.moveTo(pathScreen.x, pathScreen.y);
      else dynamicsCtx.lineTo(pathScreen.x, pathScreen.y);
    });
    dynamicsCtx.closePath();
    dynamicsCtx.fill();
    dynamicsCtx.stroke();
  } else if (kind === "rod") {
    const axis = { x: Math.cos(bodyAngle) * sizeA / 2, y: -Math.sin(bodyAngle) * sizeA / 2 };
    lineDynamics({ x: screen.x - axis.x, y: screen.y - axis.y }, { x: screen.x + axis.x, y: screen.y + axis.y });
  } else if (kind === "rectangle") {
    dynamicsCtx.translate(screen.x, screen.y);
    dynamicsCtx.rotate(-bodyAngle);
    dynamicsCtx.strokeRect(-sizeA / 2, -sizeB / 2, sizeA, sizeB);
    dynamicsCtx.fillRect(-sizeA / 2, -sizeB / 2, sizeA, sizeB);
    dynamicsCtx.setTransform(1, 0, 0, 1, 0, 0);
  } else {
    dynamicsCtx.beginPath();
    dynamicsCtx.arc(screen.x, screen.y, sizeB, 0, Math.PI * 2);
    if (kind !== "ring") dynamicsCtx.fill();
    dynamicsCtx.stroke();
    if (kind === "ring") {
      dynamicsCtx.beginPath();
      dynamicsCtx.arc(screen.x, screen.y, Math.max(4, sizeB * 0.62), 0, Math.PI * 2);
      dynamicsCtx.stroke();
    }
    if (kind === "circle" || kind === "ring") {
      lineDynamics(
        { x: screen.x, y: screen.y },
        { x: screen.x + Math.cos(bodyAngle) * sizeB, y: screen.y - Math.sin(bodyAngle) * sizeB }
      );
    }
  }
  dynamicsCtx.fillStyle = cssColor("--ink");
  dynamicsCtx.font = "12px Segoe UI, Arial, sans-serif";
  const label = result ? `${model?.name || result.name} · t=${formatNumber(point.t || 0)} s` : model?.name || dynamicsKindLabel(kind);
  dynamicsCtx.fillText(label, screen.x + 12, screen.y - 12);
  dynamicsCtx.restore();
}

function drawDynamicsAppliedForces() {
  for (const force of state.dynamics.forces) {
    const object = dynamicsObjectById(force.targetId);
    if (!object) continue;
    const applicationPoint = force.applicationPoint || { frame: "local", x: 0, y: 0 };
    const angle = Number(object.theta0 || 0);
    const worldPoint =
      applicationPoint.frame === "world"
        ? { x: Number(applicationPoint.x || 0), y: Number(applicationPoint.y || 0) }
        : {
            x:
              object.x +
              Math.cos(angle) * Number(applicationPoint.x || 0) -
              Math.sin(angle) * Number(applicationPoint.y || 0),
            y:
              object.y +
              Math.sin(angle) * Number(applicationPoint.x || 0) +
              Math.cos(angle) * Number(applicationPoint.y || 0),
          };
    const point = dynamicsToScreen(worldPoint);
    const magnitude = Math.hypot(force.x, force.y);
    if (magnitude < 1e-12) continue;
    const unit = { x: force.x / magnitude, y: -force.y / magnitude };
    const length = force.type === "impulse" ? 34 : 46;
    const start = { x: point.x - unit.x * length, y: point.y - unit.y * length };
    dynamicsCtx.save();
    dynamicsCtx.strokeStyle = force.type === "impulse" ? "#8b5fc7" : "#e06c3b";
    dynamicsCtx.fillStyle = dynamicsCtx.strokeStyle;
    dynamicsCtx.lineWidth = 2;
    drawDynamicsArrow(start, point, 8);
    dynamicsCtx.font = "11px Segoe UI, Arial, sans-serif";
    dynamicsCtx.fillText(force.type === "impulse" ? "J" : "F", start.x + 4, start.y - 4);
    dynamicsCtx.restore();
  }
}

function drawDynamicsRangeDraft() {
  const objectPath = state.dynamics.paintPath;
  if (objectPath?.length > 1) {
    dynamicsCtx.save();
    dynamicsCtx.strokeStyle = cssColor("--select");
    dynamicsCtx.setLineDash([6, 4]);
    dynamicsCtx.lineWidth = 2;
    dynamicsCtx.beginPath();
    objectPath.forEach((point, index) => {
      const screen = dynamicsToScreen(point);
      if (index === 0) dynamicsCtx.moveTo(screen.x, screen.y);
      else dynamicsCtx.lineTo(screen.x, screen.y);
    });
    dynamicsCtx.stroke();
    dynamicsCtx.restore();
  }

  const placement = state.dynamics.fieldPlacement;
  if (!placement.active || !placement.startWorld || !placement.currentWorld) return;
  const color = dynamicsFieldColor(placement.draft?.kind);
  dynamicsCtx.save();
  dynamicsCtx.fillStyle = `${color}${document.body.classList.contains("dark-theme") ? "42" : "28"}`;
  dynamicsCtx.strokeStyle = cssColor("--select");
  dynamicsCtx.setLineDash([7, 5]);
  dynamicsCtx.lineWidth = 2;
  dynamicsCtx.beginPath();
  let label = "";
  let labelPoint = dynamicsToScreen(placement.currentWorld);
  if (placement.mode === "rectangle") {
    const geometry = DynamicsFieldGeometry.rectangleFromDrag(placement.startWorld, placement.currentWorld);
    const topLeft = dynamicsToScreen({
      x: geometry.centerX - geometry.width / 2,
      y: geometry.centerY + geometry.height / 2,
    });
    dynamicsCtx.rect(topLeft.x, topLeft.y, geometry.width * state.dynamics.scale, geometry.height * state.dynamics.scale);
    label = `${formatNumber(geometry.width)} m × ${formatNumber(geometry.height)} m`;
    labelPoint = dynamicsToScreen({ x: geometry.centerX, y: geometry.centerY });
  } else if (placement.mode === "circle") {
    const geometry = DynamicsFieldGeometry.circleFromDrag(placement.startWorld, placement.currentWorld);
    const center = dynamicsToScreen({ x: geometry.centerX, y: geometry.centerY });
    dynamicsCtx.arc(center.x, center.y, geometry.radius * state.dynamics.scale, 0, Math.PI * 2);
    label = `r = ${formatNumber(geometry.radius)} m`;
    labelPoint = center;
  } else {
    placement.path.forEach((point, index) => {
      const screen = dynamicsToScreen(point);
      if (index === 0) dynamicsCtx.moveTo(screen.x, screen.y);
      else dynamicsCtx.lineTo(screen.x, screen.y);
    });
    if (placement.path.length >= 3) dynamicsCtx.closePath();
  }
  if (placement.mode !== "custom" || placement.path.length >= 3) dynamicsCtx.fill();
  dynamicsCtx.stroke();
  dynamicsCtx.setLineDash([]);
  if (label) {
    dynamicsCtx.font = "12px Segoe UI, Arial, sans-serif";
    const width = dynamicsCtx.measureText(label).width;
    dynamicsCtx.fillStyle = cssColor("--surface");
    dynamicsCtx.fillRect(labelPoint.x - width / 2 - 5, labelPoint.y - 10, width + 10, 20);
    dynamicsCtx.fillStyle = cssColor("--ink");
    dynamicsCtx.fillText(label, labelPoint.x - width / 2, labelPoint.y + 4);
  }
  dynamicsCtx.restore();
}

function startDynamicsAnimation() {
  if (!state.dynamics.result) return;
  cancelDynamicsAnimation();
  state.dynamics.animationStart = performance.now();
  const duration = state.dynamics.result.duration;
  const animate = (now) => {
    if (!state.dynamics.result || state.activeModule !== "dynamics") return;
    const elapsed = ((now - state.dynamics.animationStart) / 1000) % Math.max(duration, 0.01);
    const sampleMap = Object.fromEntries(
      state.dynamics.result.objectResults.map((result) => [
        result.objectId,
        DynamicsRenderer.interpolateSamples(result.samples, elapsed) || result.final,
      ])
    );
    drawDynamicsScene(sampleMap);
    state.dynamics.animationId = requestAnimationFrame(animate);
  };
  state.dynamics.animationId = requestAnimationFrame(animate);
}

function cancelDynamicsAnimation() {
  if (state.dynamics.animationId) cancelAnimationFrame(state.dynamics.animationId);
  state.dynamics.animationId = null;
}

function lineDynamics(a, b) {
  dynamicsCtx.beginPath();
  dynamicsCtx.moveTo(a.x, a.y);
  dynamicsCtx.lineTo(b.x, b.y);
  dynamicsCtx.stroke();
}

function drawDynamicsArrow(start, end, headSize = 9) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  lineDynamics(start, end);
  dynamicsCtx.beginPath();
  dynamicsCtx.moveTo(end.x, end.y);
  dynamicsCtx.lineTo(end.x - headSize * Math.cos(angle - Math.PI / 7), end.y - headSize * Math.sin(angle - Math.PI / 7));
  dynamicsCtx.lineTo(end.x - headSize * Math.cos(angle + Math.PI / 7), end.y - headSize * Math.sin(angle + Math.PI / 7));
  dynamicsCtx.closePath();
  dynamicsCtx.fill();
}

function showDynamicsToast(message, duration = 2400) {
  if (!dynamicsToast) return;
  dynamicsToast.textContent = message;
  dynamicsToast.classList.add("visible");
  clearTimeout(showDynamicsToast.timer);
  showDynamicsToast.timer = setTimeout(() => dynamicsToast.classList.remove("visible"), duration);
}

function isDynamicsPaintMode() {
  return (
    state.activeModule === "dynamics" &&
    els.dynamicsBuildKind.value === "custom" &&
    els.dynamicsCustomMode.value === "paint"
  );
}

function dynamicsCanvasPoint(event) {
  const rect = dynamicsCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (dynamicsCanvas.width / Math.max(rect.width, 1)),
    y: (event.clientY - rect.top) * (dynamicsCanvas.height / Math.max(rect.height, 1)),
  };
}

function syncDynamicsCanvasCursor() {
  if (!dynamicsCanvas) return;
  const drawingObject = state.dynamics.placementMode && isDynamicsPaintMode();
  const drawingField = Boolean(state.dynamics.fieldPlacement.active);
  dynamicsCanvas.classList.toggle("placing", state.dynamics.placementMode && !drawingObject);
  dynamicsCanvas.classList.toggle("drawing-object", drawingObject);
  dynamicsCanvas.classList.toggle("drawing-range", drawingField);
  els.dynamicsPlaceButton.classList.toggle("active", state.dynamics.placementMode);
  els.dynamicsFieldButton.classList.toggle("active", drawingField);
  els.dynamicsFieldCancelButton.classList.toggle("hidden", !drawingField);
}

function beginDynamicsObjectPlacement() {
  cancelDynamicsFieldPlacement({ silent: true });
  cancelDynamicsAnimation();
  state.dynamics.placementMode = true;
  state.dynamics.result = null;
  syncDynamicsCanvasCursor();
  const message = isDynamicsPaintMode()
    ? "在建模区按住鼠标左键绘制任意形状。"
    : "在建模区单击确定对象位置。";
  showDynamicsToast(message, 3000);
  drawDynamicsScene();
}

function placeDynamicsObject(world) {
  const kind = els.dynamicsBuildKind.value;
  const object = dynamicsObjectFromControls(kind, world);
  recordDynamicsHistory();
  state.dynamics.objects.push(object);
  state.dynamics.object = object;
  state.dynamics.selectedObjectId = object.id;
  state.dynamics.placementMode = false;
  state.dynamics.result = null;
  els.dynamicsX0.value = `${formatNumber(world.x)} m`;
  els.dynamicsY0.value = `${formatNumber(world.y)} m`;
  renderDynamicsResult();
  renderDynamicsSceneLists();
  syncDynamicsObjectControls(object);
  syncDynamicsCanvasCursor();
  drawDynamicsScene();
  showDynamicsToast(`${dynamicsKindLabel(kind)}已放置。`, 1800);
}

function finishDynamicsPaintedObject(path) {
  if (path.length < 3) {
    state.dynamics.paintPath = [];
    showDynamicsToast("绘制路径过短，请重新绘制。", 2200);
    drawDynamicsScene();
    return;
  }
  const center = path.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  center.x /= path.length;
  center.y /= path.length;
  const object = dynamicsObjectFromControls("custom", center, [...path]);
  recordDynamicsHistory();
  state.dynamics.objects.push(object);
  state.dynamics.object = object;
  state.dynamics.selectedObjectId = object.id;
  state.dynamics.paintPath = [];
  state.dynamics.placementMode = false;
  state.dynamics.result = null;
  els.dynamicsX0.value = `${formatNumber(center.x)} m`;
  els.dynamicsY0.value = `${formatNumber(center.y)} m`;
  renderDynamicsResult();
  renderDynamicsSceneLists();
  syncDynamicsObjectControls(object);
  syncDynamicsCanvasCursor();
  drawDynamicsScene();
  showDynamicsToast("任意形状对象已建立。", 1800);
}

function finishDynamicsFieldPlacement() {
  const current = state.dynamics.fieldPlacement;
  const editingFieldId = current.editingFieldId;
  const tooSmall =
    current.mode === "rectangle"
      ? Math.abs(current.currentWorld.x - current.startWorld.x) * state.dynamics.scale < 4 ||
        Math.abs(current.currentWorld.y - current.startWorld.y) * state.dynamics.scale < 4
      : current.mode === "circle"
        ? Math.hypot(
            current.currentWorld.x - current.startWorld.x,
            current.currentWorld.y - current.startWorld.y
          ) * state.dynamics.scale < 4
        : false;
  const completed = DynamicsFieldPlacement.completePlacement(current);
  state.dynamics.fieldPlacement = completed.placement;
  if (tooSmall || !completed.validation.valid) {
    updateDynamicsFieldStatus();
    syncDynamicsCanvasCursor();
    drawDynamicsScene();
    const message = tooSmall
      ? "绘制范围过小，已取消且未修改场景。"
      : dynamicsFieldValidationMessage(completed.field || { rangeType: current.mode }, completed.validation);
    showDynamicsToast(message, 3000);
    return;
  }
  commitDynamicsField(completed.field, editingFieldId);
  updateDynamicsFieldStatus();
  syncDynamicsCanvasCursor();
}

function clearDynamicsModel() {
  cancelDynamicsFieldPlacement({ silent: true });
  if (
    !state.dynamics.objects.length &&
    !state.dynamics.fields.length &&
    !state.dynamics.forces.length &&
    !(state.dynamics.grounds || []).length &&
    !(state.dynamics.tracks || []).length
  )
    return;
  recordDynamicsHistory();
  cancelDynamicsAnimation();
  state.dynamics.objects = [];
  state.dynamics.fields = [];
  state.dynamics.forces = [];
  state.dynamics.model = "independent-particle2d";
  state.dynamics.grounds = [];
  state.dynamics.tracks = [];
  state.dynamics.constraints = [];
  state.dynamics.simulationSettings = {};
  if (els.dynamicsGroundToggle) els.dynamicsGroundToggle.checked = false;
  state.dynamics.objectSeq = 1;
  state.dynamics.fieldSeq = 1;
  state.dynamics.forceSeq = 1;
  state.dynamics.selectedObjectId = null;
  state.dynamics.object = null;
  state.dynamics.field = null;
  state.dynamics.result = null;
  state.dynamics.paintPath = [];
  state.dynamics.placementMode = false;
  state.dynamics.fieldPlacement = DynamicsFieldPlacement.cancelPlacement();
  els.dynamicsResultText.textContent = "暂无结果";
  updateDynamicsFieldStatus();
  renderDynamicsSceneLists();
  syncDynamicsObjectControls(null);
  syncDynamicsCanvasCursor();
  drawDynamicsScene();
  showDynamicsToast("动力学建模区已清空。", 1800);
}

function drawGrid() {
  ctx.save();
  ctx.fillStyle = cssColor("--canvas");
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!els.gridToggle.checked) {
    drawAxes();
    ctx.restore();
    return;
  }
  const step = state.gridSize * state.pxPerMeter;
  const startX = state.origin.x % step;
  const startY = state.origin.y % step;
  ctx.strokeStyle = cssColor("--grid");
  ctx.lineWidth = 1;
  for (let x = startX; x < canvas.width; x += step) line({ x, y: 0 }, { x, y: canvas.height });
  for (let y = startY; y < canvas.height; y += step) line({ x: 0, y }, { x: canvas.width, y });
  drawAxes();
  ctx.restore();
}

function drawAxes() {
  ctx.strokeStyle = cssColor("--grid-major");
  ctx.lineWidth = 1.4;
  line({ x: 0, y: state.origin.y }, { x: canvas.width, y: state.origin.y });
  line({ x: state.origin.x, y: 0 }, { x: state.origin.x, y: canvas.height });
}

function drawElements() {
  ctx.save();
  ctx.lineCap = "round";
  for (const element of state.elements) {
    const nodeI = getNode(element.node_i);
    const nodeJ = getNode(element.node_j);
    if (!nodeI || !nodeJ) continue;
    const a = worldToScreen(nodeI);
    const b = worldToScreen(nodeJ);
    const selected = isElementSelected(element.id);
    ctx.strokeStyle = selected ? cssColor("--select") : cssColor("--ink");
    ctx.lineWidth = selected ? 4 : 3;
    drawElementShape(element, a, b);
    const geometry = elementGeometryOf(element);
    if (element.type === "rigid") {
      ctx.setLineDash([7, 5]);
      ctx.lineWidth = 1.5;
      line(offsetPoint(a, b, 5), offsetPoint(b, a, -5));
      ctx.setLineDash([]);
    } else if (geometry === "tee") {
      drawTeeElementGlyph(a, b, selected);
    }
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    drawText(element.id, mid.x + 6, mid.y - 8, cssColor("--ink"));
  }
  ctx.restore();
}

function drawElementShape(element, a, b) {
  const geometry = elementGeometryOf(element);
  if (geometry === "freeform" && Array.isArray(element.path) && element.path.length > 1) {
    const points = element.path.map((point) => worldToScreen(point));
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.stroke();
    return;
  }
  if (geometry === "right_angle") {
    const elbow = { x: b.x, y: a.y };
    line(a, elbow);
    line(elbow, b);
    return;
  }
  if (geometry !== "arc") {
    line(a, b);
    return;
  }
  const control = arcControlPoint(element, a, b);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(control.x, control.y, b.x, b.y);
  ctx.stroke();
}

function arcControlPoint(element, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / length, y: dx / length };
  const curvature = Number(element.curvature || element.sectionParams?.curvature || 0.25);
  return {
    x: (a.x + b.x) / 2 + normal.x * curvature * length,
    y: (a.y + b.y) / 2 + normal.y * curvature * length,
  };
}

function drawTeeElementGlyph(a, b, selected) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / length, y: dx / length };
  const tangent = { x: dx / length, y: dy / length };
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const depth = selected ? 17 : 14;
  const cap = selected ? 18 : 14;
  ctx.save();
  ctx.strokeStyle = selected ? cssColor("--select") : cssColor("--ink");
  ctx.lineWidth = 1.8;
  const stem = { x: mid.x + normal.x * depth, y: mid.y + normal.y * depth };
  line(mid, stem);
  line({ x: stem.x - tangent.x * cap, y: stem.y - tangent.y * cap }, { x: stem.x + tangent.x * cap, y: stem.y + tangent.y * cap });
  ctx.restore();
}

function drawNodes() {
  ctx.save();
  for (const node of state.nodes) {
    if (node.fused) continue;
    const point = worldToScreen(node);
    const selected = isNodeSelected(node.id);
    ctx.beginPath();
    ctx.arc(point.x, point.y, selected ? 7 : 5, 0, Math.PI * 2);
    ctx.fillStyle = selected ? cssColor("--select") : cssColor("--surface");
    ctx.strokeStyle = selected ? cssColor("--select") : cssColor("--ink");
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    drawText(node.id, point.x + 8, point.y - 10, cssColor("--muted"));
  }
  ctx.restore();
}

function offsetPoint(point, toward, offset) {
  const dx = toward.x - point.x;
  const dy = toward.y - point.y;
  const length = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / length, y: dx / length };
  return { x: point.x + normal.x * offset, y: point.y + normal.y * offset };
}

function drawSupports() {
  for (const node of state.nodes) {
    const restraints = restraintsToList(node.restraints);
    if (!restraints.length) continue;
    const point = worldToScreen(node);
    const support = node.support || supportFromRestraints(node.restraints);
    const direction = supportDirection(node);
    if (support.type === "ground") {
      drawGroundFoundation(point, direction);
    } else if (support.type === "fixed" || (node.restraints.ux && node.restraints.uy && node.restraints.rz)) {
      drawFixedSupport(point, direction);
    } else if (support.type === "pin" || (node.restraints.ux && node.restraints.uy)) {
      drawPinSupport(point, direction);
    } else {
      drawRollerSupport(point, direction);
    }
  }
}

function supportFromRestraints(restraints) {
  if (restraints.ux && restraints.uy && restraints.rz) return { type: "fixed", mode: "fixed", angle: 0 };
  if (restraints.ux && restraints.uy) return { type: "pin", mode: "fixed-ground", angle: 0 };
  if (restraints.uy) return { type: "roller", mode: "rolling-ground", angle: 0 };
  return { type: "free", mode: "free", angle: 0 };
}

function supportDirection(node) {
  // Unit vector (screen space) pointing from the ground towards the node.
  // Angle 0 puts the ground below the node; positive angles rotate the
  // support counter-clockwise, matching the solver's support_angle.
  const radians = supportAngleOf(node) * (Math.PI / 180);
  return { x: -Math.sin(radians), y: -Math.cos(radians) };
}

function drawFixedSupport(point, dir) {
  ctx.save();
  ctx.strokeStyle = cssColor("--ink");
  ctx.lineWidth = 2.2;
  const normal = { x: -dir.y, y: dir.x };
  const halfWidth = supportSymbolSize() * 0.62;
  const a = groundStart(point, normal, halfWidth);
  const b = groundEnd(point, normal, halfWidth);
  line(a, b);
  for (let i = -halfWidth + 5; i <= halfWidth - 5; i += 8) {
    const base = { x: point.x + normal.x * i, y: point.y + normal.y * i };
    line(base, { x: base.x - dir.x * 12 + normal.x * 4, y: base.y - dir.y * 12 + normal.y * 4 });
  }
  ctx.restore();
}

function drawGroundFoundation(point, dir) {
  ctx.save();
  const normal = { x: -dir.y, y: dir.x };
  drawSupportGround(point, dir, normal, supportSymbolSize() * 0.68, cssColor("--ink"), 2.4);
  ctx.restore();
}

function drawPinSupport(point, dir) {
  ctx.save();
  ctx.strokeStyle = cssColor("--ink");
  ctx.fillStyle = document.body.classList.contains("dark-theme") ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.05)";
  ctx.lineWidth = 2.1;
  const normal = { x: -dir.y, y: dir.x };
  const size = supportSymbolSize();
  const height = size * 0.55;
  const halfBase = size * 0.38;
  const base = { x: point.x - dir.x * height, y: point.y - dir.y * height };
  const p1 = { x: base.x + normal.x * halfBase, y: base.y + normal.y * halfBase };
  const p2 = { x: base.x - normal.x * halfBase, y: base.y - normal.y * halfBase };
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawSupportGround(base, dir, normal, halfBase + 9, cssColor("--ink"), 1.9);
  ctx.restore();
}

function drawRollerSupport(point, dir) {
  ctx.save();
  ctx.strokeStyle = cssColor("--ink");
  ctx.fillStyle = document.body.classList.contains("dark-theme") ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.05)";
  ctx.lineWidth = 2.1;
  const normal = { x: -dir.y, y: dir.x };
  const size = supportSymbolSize();
  const height = size * 0.58;
  const halfBase = size * 0.36;
  const radius = Math.max(4, size * 0.085);
  const base = { x: point.x - dir.x * height, y: point.y - dir.y * height };
  const p1 = { x: base.x + normal.x * halfBase, y: base.y + normal.y * halfBase };
  const p2 = { x: base.x - normal.x * halfBase, y: base.y - normal.y * halfBase };
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const rollerCenter = { x: base.x - dir.x * (radius + 3), y: base.y - dir.y * (radius + 3) };
  for (const offset of [-radius * 1.8, radius * 1.8]) {
    ctx.beginPath();
    ctx.arc(rollerCenter.x + normal.x * offset, rollerCenter.y + normal.y * offset, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  const groundCenter = { x: base.x - dir.x * (radius * 3 + 8), y: base.y - dir.y * (radius * 3 + 8) };
  drawSupportGround(groundCenter, dir, normal, halfBase + 12, cssColor("--ink"), 1.9);
  ctx.restore();
}

function drawSupportGround(center, dir, normal, halfWidth, color = cssColor("--ink"), lineWidth = 1.8) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  line(groundStart(center, normal, halfWidth), groundEnd(center, normal, halfWidth));
  ctx.lineWidth = Math.max(1.2, lineWidth - 0.4);
  for (let offset = -halfWidth + 4; offset <= halfWidth - 4; offset += 8) {
    const start = { x: center.x + normal.x * offset, y: center.y + normal.y * offset };
    const end = {
      x: start.x - dir.x * 11 + normal.x * 4,
      y: start.y - dir.y * 11 + normal.y * 4,
    };
    line(start, end);
  }
  ctx.restore();
}

function drawLoads() {
  for (const load of state.loads) {
    if (load.kind === "element_point" && load.element) {
      drawElementPointLoad(load);
      continue;
    }
    const node = getNode(load.node);
    if (!node) continue;
    const point = worldToScreen(node);
    const fx = quantityToNumber(load.fx, "N");
    const fy = quantityToNumber(load.fy, "N");
    const magnitude = Math.hypot(fx, fy);
    if (magnitude > 0) {
      const length = Math.min(70, Math.max(30, magnitude / 250));
      const vector = { x: (fx / magnitude) * length, y: (-fy / magnitude) * length };
      drawArrow({ x: point.x - vector.x, y: point.y - vector.y }, point, cssColor("--danger"));
      drawText(compactForce(magnitude), point.x - vector.x + 6, point.y - vector.y, cssColor("--danger"));
    }
    const mz = quantityToNumber(load.mz, "N*m");
    if (Math.abs(mz) > 0) drawMomentGlyph(point, mz);
  }
}

function drawElementPointLoad(load) {
  const element = getElement(load.element);
  if (!element) return;
  const nodeI = getNode(element.node_i);
  const nodeJ = getNode(element.node_j);
  if (!nodeI || !nodeJ) return;
  const ratio = Math.max(0, Math.min(1, Number(load.ratio ?? 0.5)));
  const point = GeometryDiscretize.pointAtPathRatio(elementScreenPath(element), ratio);
  const fx = quantityToNumber(load.fx, "N");
  const fy = quantityToNumber(load.fy, "N");
  const magnitude = Math.hypot(fx, fy);
  if (magnitude > 0) {
    const length = Math.min(70, Math.max(30, magnitude / 250));
    const vector = { x: (fx / magnitude) * length, y: (-fy / magnitude) * length };
    drawArrow({ x: point.x - vector.x, y: point.y - vector.y }, point, cssColor("--danger"));
    drawText(`${compactForce(magnitude)} @${Math.round(ratio * 100)}%`, point.x - vector.x + 6, point.y - vector.y, cssColor("--danger"));
  }
  const mz = quantityToNumber(load.mz, "N*m");
  if (Math.abs(mz) > 0) drawMomentGlyph(point, mz);
}

function drawElementLoads() {
  ctx.save();
  for (const load of state.elementLoads) {
    const element = getElement(load.element);
    if (!element) continue;
    const nodeI = getNode(element.node_i);
    const nodeJ = getNode(element.node_j);
    if (!nodeI || !nodeJ) continue;
    const a = worldToScreen(nodeI);
    const b = worldToScreen(nodeJ);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    const normal = { x: -dy / length, y: dx / length };
    if (load.kind === "uniform_moment_local") {
      drawUniformMomentLoad(load, a, b, normal);
      continue;
    }
    const qi = quantityToNumber(load.qy_i || load.qy, "N/m");
    const qj = quantityToNumber(load.qy_j || load.qy, "N/m");
    const maxQ = Math.max(Math.abs(qi), Math.abs(qj), 1);
    const side = Math.abs(qi) >= Math.abs(qj) ? (qi < 0 ? 1 : -1) : qj < 0 ? 1 : -1;
    const count = 9;
    const starts = [];
    ctx.save();
    ctx.strokeStyle = cssColor("--danger");
    ctx.fillStyle = cssColor("--danger");
    ctx.lineWidth = 1.8;
    for (let index = 0; index < count; index++) {
      const r = count === 1 ? 0 : index / (count - 1);
      const q = qi + (qj - qi) * r;
      const base = { x: a.x + dx * r, y: a.y + dy * r };
      const arrowLength = Math.max(3, (Math.abs(q) / maxQ) * 38);
      const start = {
        x: base.x + normal.x * arrowLength * side,
        y: base.y + normal.y * arrowLength * side,
      };
      starts.push(start);
      if (Math.abs(q) > maxQ * 0.03) drawArrow(start, base, cssColor("--danger"));
    }
    ctx.beginPath();
    starts.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    line(starts[0], a);
    line(starts[starts.length - 1], b);
    const mid = starts[Math.floor(starts.length / 2)];
    drawText(distributedLoadLabel(load), mid.x + normal.x * 8 * side, mid.y + normal.y * 8 * side, cssColor("--danger"));
    ctx.restore();
  }
  ctx.restore();
}

function drawUniformMomentLoad(load, a, b, normal) {
  const intensity = quantityToNumber(load.mz || "0 N*m/m", "N*m/m");
  const sign = intensity >= 0 ? 1 : -1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  ctx.save();
  ctx.strokeStyle = cssColor("--danger");
  ctx.fillStyle = cssColor("--danger");
  ctx.lineWidth = 1.8;
  for (let index = 1; index <= 5; index++) {
    const r = index / 6;
    const center = { x: a.x + dx * r + normal.x * 24, y: a.y + dy * r + normal.y * 24 };
    drawMomentGlyph(center, sign);
  }
  const mid = { x: (a.x + b.x) / 2 + normal.x * 48, y: (a.y + b.y) / 2 + normal.y * 48 };
  drawText(load.mz || "0 N*m/m", mid.x, mid.y, cssColor("--danger"));
  ctx.restore();
}

function distributedLoadLabel(load) {
  if (load.kind === "uniform_local") return load.qy || load.qx || "0 N/m";
  if (load.kind === "linear_local") return `${load.qy_i || "0 N/m"} → ${load.qy_j || "0 N/m"}`;
  if (load.kind === "uniform_moment_local") return load.mz || "0 N*m/m";
  return "q(x)";
}

function compactForce(value) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)} kN`;
  return `${value.toFixed(0)} N`;
}

function drawMomentGlyph(point, moment) {
  ctx.save();
  ctx.strokeStyle = cssColor("--danger");
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 22, moment > 0 ? -0.3 : 0.3, moment > 0 ? 4.7 : -4.7, moment < 0);
  ctx.stroke();
  ctx.restore();
}

function drawDeformedShape() {
  const factor = Number(els.deformScale.value || 1);
  ctx.save();
  ctx.strokeStyle = cssColor("--accent");
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2;
  for (const element of state.elements) {
    const nodeI = getNode(element.node_i);
    const nodeJ = getNode(element.node_j);
    if (!nodeI || !nodeJ) continue;
    const info = state.expansion && state.expansion[element.id];
    if (info && info.segments.length) {
      // Discretised member: follow the sub-node chain with the raw solver displacements.
      const points = [deformedScreenPoint(nodeI, factor)];
      info.segments.forEach((segment, index) => {
        const nodeId = info.nodeIds[index + 1];
        const world = index === info.segments.length - 1 ? nodeJ : { id: nodeId, x: segment.to.x, y: segment.to.y };
        points.push(deformedScreenPoint(world, factor));
      });
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.stroke();
      continue;
    }
    line(deformedScreenPoint(nodeI, factor), deformedScreenPoint(nodeJ, factor));
  }
  ctx.restore();
}

function deformedScreenPoint(node, factor) {
  const source = (state.result && state.result.raw && state.result.raw.displacements) || (state.result && state.result.displacements) || {};
  const displacement = source[node.id] || {};
  return worldToScreen({
    x: node.x + Number(displacement.ux || 0) * factor,
    y: node.y + Number(displacement.uy || 0) * factor,
  });
}

function elementScreenPath(element) {
  const nodeI = getNode(element.node_i);
  const nodeJ = getNode(element.node_j);
  if (!nodeI || !nodeJ) return [];
  return GeometryDiscretize.elementPath(element, nodeI, nodeJ).map((point) => worldToScreen(point));
}

function drawDiagrams() {
  if (!dctx) return;
  dctx.clearRect(0, 0, diagramCanvas.width, diagramCanvas.height);
  dctx.fillStyle = cssColor("--surface");
  dctx.fillRect(0, 0, diagramCanvas.width, diagramCanvas.height);

  if (!state.result) {
    dctx.fillStyle = cssColor("--muted");
    dctx.font = "14px Segoe UI, Arial, sans-serif";
    dctx.fillText("求解后在此分开展示剪力图 V、弯矩图 M、轴力图 N、应力和应变图。", 24, 38);
    return;
  }

  const specs = selectedDiagramSpecs();
  if (specs.length === 0) {
    dctx.fillStyle = cssColor("--muted");
    dctx.font = "14px Segoe UI, Arial, sans-serif";
    dctx.fillText("当前未选择要显示的图形。", 24, 38);
    return;
  }

  const stressStrain = els.stressStrainToggle.checked || state.solveOptions.includes("stress_strain");
  const chartCount = specs.length + (stressStrain ? 1 : 0);
  const gap = chartCount > 4 ? 10 : 16;
  const topMargin = chartCount > 4 ? 12 : 18;
  const chartHeight = Math.max(28, (diagramCanvas.height - topMargin * 2 - gap * (chartCount - 1)) / chartCount);
  let top = topMargin;
  for (const spec of specs) {
    drawSingleDiagram(spec, top, chartHeight);
    top += chartHeight + gap;
  }
  if (stressStrain) drawStressStrainDiagram(top, chartHeight);
}

function selectedDiagramSpecs() {
  const specs = [];
  if (els.shearToggle.checked) {
    specs.push({ component: "v", symbol: "V", unit: "kN", scale: 1 / 1000, color: cssColor("--danger") });
  }
  if (els.momentToggle.checked) {
    specs.push({ component: "m", symbol: "M", unit: "kN·m", scale: 1 / 1000, color: cssColor("--warn") });
  }
  if (els.axialToggle.checked) {
    specs.push({ component: "n", symbol: "N", unit: "kN", scale: 1 / 1000, color: cssColor("--blue") });
  }
  return specs;
}

function drawSingleDiagram(spec, top, height) {
  const data = chartData(spec.component);
  const left = 70;
  const right = diagramCanvas.width - 28;
  const topPad = Math.min(18, Math.max(10, height * 0.2));
  const bottomPad = Math.min(24, Math.max(12, height * 0.24));
  const bottom = top + height - bottomPad;
  const yAxisTop = top + topPad;
  const y0 = top + height * 0.54;
  const plotHeight = Math.max(6, Math.min(height * 0.34, Math.max(6, (bottom - yAxisTop) * 0.44)));
  const maxAbs = Math.max(...data.map((point) => Math.abs(point.value)), 1e-9);
  const totalLength = Math.max(data[data.length - 1]?.x || 1, 1e-9);
  const toX = (x) => left + (x / totalLength) * (right - left);
  const toY = (value) => y0 - (value / maxAbs) * plotHeight;

  dctx.save();
  dctx.strokeStyle = cssColor("--line");
  dctx.lineWidth = 1;
  dctx.strokeRect(8, top, diagramCanvas.width - 16, height);

  dctx.strokeStyle = cssColor("--ink");
  dctx.lineWidth = 1.3;
  lineD({ x: left, y: y0 }, { x: right, y: y0 });
  lineD({ x: left, y: bottom }, { x: left, y: yAxisTop });
  drawAxisArrowD({ x: right, y: y0 }, "x");
  drawAxisArrowD({ x: left, y: yAxisTop }, "y");

  dctx.fillStyle = cssColor("--ink");
  dctx.font = "13px Segoe UI, Arial, sans-serif";
  dctx.fillText(`${spec.symbol} (${spec.unit})`, 16, top + 18);
  dctx.fillText("x (m)", right - 34, y0 - 8);
  dctx.fillText("0", left - 18, y0 + 4);
  dctx.fillText(`${totalLength.toFixed(2)} m`, right - 50, y0 + 18);

  dctx.strokeStyle = hexToAlpha(spec.color, 0.5);
  dctx.lineWidth = 1;
  for (let index = 0; index < data.length; index += Math.max(1, Math.floor(data.length / 28))) {
    const point = data[index];
    const x = toX(point.x);
    lineD({ x, y: y0 }, { x, y: toY(point.value) });
  }

  dctx.beginPath();
  data.forEach((point, index) => {
    const x = toX(point.x);
    const y = toY(point.value);
    if (index === 0) dctx.moveTo(x, y);
    else dctx.lineTo(x, y);
  });
  dctx.strokeStyle = spec.color;
  dctx.lineWidth = 2.2;
  dctx.stroke();

  annotateExtrema(data, spec, toX, toY, y0);
  dctx.restore();
}

function annotateExtrema(data, spec, toX, toY, y0) {
  const extrema = [];
  const maxPoint = data.reduce((best, point) => (point.value > best.value ? point : best), data[0]);
  const minPoint = data.reduce((best, point) => (point.value < best.value ? point : best), data[0]);
  if (Math.abs(maxPoint.value) > 1e-9) extrema.push(maxPoint);
  if (Math.abs(minPoint.value - maxPoint.value) > 1e-9) extrema.push(minPoint);
  dctx.save();
  dctx.setLineDash([5, 4]);
  dctx.strokeStyle = cssColor("--muted");
  dctx.fillStyle = cssColor("--ink");
  dctx.font = "12px Segoe UI, Arial, sans-serif";
  for (const point of extrema) {
    const x = toX(point.x);
    const y = toY(point.value);
    lineD({ x, y }, { x, y: y0 });
    lineD({ x, y }, { x: 70, y });
    dctx.setLineDash([]);
    dctx.beginPath();
    dctx.arc(x, y, 3.5, 0, Math.PI * 2);
    dctx.fillStyle = spec.color;
    dctx.fill();
    dctx.fillStyle = cssColor("--ink");
    dctx.fillText(`${formatNumber(point.value)} ${spec.unit}`, x + 6, y - 6);
    dctx.setLineDash([5, 4]);
  }
  dctx.restore();
}

function chartData(component) {
  const diagrams = state.result.element_diagrams || {};
  const data = [];
  let offset = 0;
  for (const element of state.elements) {
    const rows = diagrams[element.id] || [];
    if (!rows.length) continue;
    const elementLength = rows[rows.length - 1].x || elementLengthFromModel(element);
    for (const row of rows) {
      data.push({ x: offset + row.x, value: diagramValue(component, row) });
    }
    offset += elementLength;
  }
  return data.length ? data : [{ x: 0, value: 0 }, { x: 1, value: 0 }];
}

function diagramValue(component, row) {
  if (component === "stress") return stressAtRow(row) / 1e6;
  if (component === "strain") return (stressAtRow(row) / elasticModulusPa()) * 1e6;
  return (row[component] || 0) / 1000;
}

function stressAtRow(row) {
  const area = Math.max(quantityToNumber(els.sectionA.value, "m^2"), 1e-12);
  const inertia = Math.max(quantityToNumber(els.sectionI.value, "m^4"), 1e-18);
  const equivalentDepth = Math.sqrt(area);
  const c = equivalentDepth / 2;
  return (row.n || 0) / area + ((row.m || 0) * c) / inertia;
}

function elasticModulusPa() {
  return Math.max(quantityToNumber(els.materialE.value, "Pa"), 1);
}

function elementLengthFromModel(element) {
  const nodeI = getNode(element.node_i);
  const nodeJ = getNode(element.node_j);
  if (!nodeI || !nodeJ) return 1;
  return Math.hypot(nodeJ.x - nodeI.x, nodeJ.y - nodeI.y) || 1;
}

function drawStressStrainDiagram(top, height) {
  const stressData = chartData("stress");
  const maxStress = Math.max(...stressData.map((point) => Math.abs(point.value)), 1e-9);
  const maxStrain = Math.max(...stressData.map((point) => Math.abs(((point.value * 1e6) / elasticModulusPa()) * 1e6)), 1e-9);
  const left = 70;
  const right = diagramCanvas.width - 28;
  const bottom = top + height - Math.min(28, Math.max(12, height * 0.25));
  const topY = top + Math.min(18, Math.max(10, height * 0.2));
  dctx.save();
  dctx.strokeStyle = cssColor("--line");
  dctx.strokeRect(8, top, diagramCanvas.width - 16, height);
  dctx.strokeStyle = cssColor("--ink");
  lineD({ x: left, y: bottom }, { x: right, y: bottom });
  lineD({ x: left, y: bottom }, { x: left, y: topY });
  drawAxisArrowD({ x: right, y: bottom }, "x");
  drawAxisArrowD({ x: left, y: topY }, "y");
  dctx.fillStyle = cssColor("--ink");
  dctx.font = "13px Segoe UI, Arial, sans-serif";
  dctx.fillText("σ-ε 图", 16, top + 18);
  dctx.fillText("ε (με)", right - 46, bottom - 8);
  dctx.fillText("σ (MPa)", 16, top + 36);
  dctx.strokeStyle = "#8e24aa";
  dctx.lineWidth = 2.2;
  dctx.beginPath();
  dctx.moveTo(left, bottom);
  dctx.lineTo(right, topY);
  dctx.stroke();
  dctx.fillText(`${formatNumber(maxStrain)} με`, right - 82, bottom + 18);
  dctx.fillText(`${formatNumber(maxStress)} MPa`, left + 10, topY + 12);
  dctx.restore();
}

function drawAxisArrowD(point, axis) {
  dctx.save();
  dctx.fillStyle = cssColor("--ink");
  dctx.beginPath();
  if (axis === "x") {
    dctx.moveTo(point.x, point.y);
    dctx.lineTo(point.x - 8, point.y - 4);
    dctx.lineTo(point.x - 8, point.y + 4);
  } else {
    dctx.moveTo(point.x, point.y);
    dctx.lineTo(point.x - 4, point.y + 8);
    dctx.lineTo(point.x + 4, point.y + 8);
  }
  dctx.closePath();
  dctx.fill();
  dctx.restore();
}

function lineD(a, b) {
  dctx.beginPath();
  dctx.moveTo(a.x, a.y);
  dctx.lineTo(b.x, b.y);
  dctx.stroke();
}

function hexToAlpha(color, alpha) {
  if (!color.startsWith("#")) return `rgba(0,0,0,${alpha})`;
  const value = color.slice(1);
  const int = parseInt(value.length === 3 ? value.replace(/(.)/g, "$1$1") : value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawPreview() {
  if (state.tool === "element" && state.elementGeometry === "freeform" && state.freeformDraw && state.freeformDraw.path.length > 1) {
    ctx.save();
    ctx.strokeStyle = cssColor("--accent");
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(state.freeformDraw.path[0].x, state.freeformDraw.path[0].y);
    for (const point of state.freeformDraw.path.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (state.tool !== "element" || !state.pendingNode || !state.pointer) return;
  const first = getNode(state.pendingNode);
  if (!first) return;
  let world = screenToWorld(state.pointer);
  world = applyOrthogonalLock(world);
  ctx.save();
  ctx.strokeStyle = cssColor("--accent");
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  const a = worldToScreen(first);
  const b = worldToScreen(world);
  if (state.elementGeometry === "right_angle") {
    line(a, { x: b.x, y: a.y });
    line({ x: b.x, y: a.y }, b);
  } else if (state.elementGeometry === "arc") {
    const control = arcControlPoint({ curvature: state.elementDefaults.curvature }, a, b);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(control.x, control.y, b.x, b.y);
    ctx.stroke();
  } else {
    line(a, b);
  }
  ctx.restore();
}

function drawSelectionGesture() {
  if (!state.drag || state.tool !== "select") return;
  ctx.save();
  ctx.strokeStyle = cssColor("--select");
  ctx.setLineDash([7, 5]);
  ctx.lineWidth = 1.6;
  if (els.selectionMode.value === "box") {
    const start = state.drag.start;
    const current = state.drag.current;
    ctx.strokeRect(start.x, start.y, current.x - start.x, current.y - start.y);
  }
  if (els.selectionMode.value === "lasso" && state.drag.path.length > 1) {
    ctx.beginPath();
    ctx.moveTo(state.drag.path[0].x, state.drag.path[0].y);
    for (const point of state.drag.path.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
  ctx.restore();
}

function line(a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function drawArrow(start, end, color) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  line(start, end);
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - 10 * Math.cos(angle - Math.PI / 7), end.y - 10 * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(end.x - 10 * Math.cos(angle + Math.PI / 7), end.y - 10 * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawText(text, x, y, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = "12px Segoe UI, Arial, sans-serif";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function isRotatableSupport(node, event = null) {
  if (!isSupportNode(node)) return false;
  if (event && event.altKey) return true;
  return Boolean(node.support && node.support.mode === "rotating");
}

function isSupportNode(node) {
  return node && restraintsToList(node.restraints || {}).length > 0;
}

function angleFromSupportDrag(node, point) {
  // The ground faces the pointer: pointer straight below the node is angle 0,
  // pointer to the right is +90° (counter-clockwise from "ground below").
  const center = worldToScreen(node);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  if (Math.hypot(dx, dy) < 1) return supportAngleOf(node);
  return normalizeSupportAngle((Math.atan2(dx, dy) * 180) / Math.PI);
}

function pushUndoForInteraction(interaction) {
  if (interaction.undoPushed) return;
  state.undoStack.push(snapshot());
  if (state.undoStack.length > 100) state.undoStack.shift();
  state.redoStack = [];
  interaction.undoPushed = true;
}

canvas.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  const point = canvasPoint(event);
  state.pointer = point;
  if (state.tool === "element" && state.elementGeometry === "freeform") {
    state.freeformDraw = { path: [point] };
    state.drag = null;
    return;
  }
  const hitNode = nodeOrSupportAtScreen(point.x, point.y);
  const hitElement = elementAtScreen(point.x, point.y);
  if (state.tool === "select" && isRotatableSupport(hitNode, event)) {
    state.rotateSupport = {
      nodeId: hitNode.id,
      start: point,
      moved: false,
      undoPushed: false,
    };
    state.drag = null;
    return;
  }
  if (state.tool === "select" && els.selectionMode.value === "point" && !hitNode && !hitElement && !event.shiftKey) {
    state.pan = {
      start: point,
      originStart: { ...state.origin },
      moved: false,
    };
    state.drag = null;
    return;
  }
  state.drag = { start: point, current: point, path: [point], moved: false };
});

canvas.addEventListener("mousemove", (event) => {
  const point = canvasPoint(event);
  state.pointer = point;
  if (state.freeformDraw) {
    const last = state.freeformDraw.path[state.freeformDraw.path.length - 1];
    if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 3) state.freeformDraw.path.push(point);
    draw();
    return;
  }
  if (state.rotateSupport) {
    const node = getNode(state.rotateSupport.nodeId);
    if (!node) return;
    state.rotateSupport.moved =
      state.rotateSupport.moved || Math.hypot(point.x - state.rotateSupport.start.x, point.y - state.rotateSupport.start.y) > 3;
    if (state.rotateSupport.moved) {
      pushUndoForInteraction(state.rotateSupport);
      node.support.angle = angleFromSupportDrag(node, point);
      state.result = null;
      syncUi();
    }
    draw();
    return;
  }
  if (state.pan) {
    const dx = point.x - state.pan.start.x;
    const dy = point.y - state.pan.start.y;
    state.pan.moved = state.pan.moved || Math.hypot(dx, dy) > 3;
    state.origin = {
      x: state.pan.originStart.x + dx,
      y: state.pan.originStart.y + dy,
    };
    draw();
    return;
  }
  if (state.drag) {
    state.drag.current = point;
    state.drag.moved = state.drag.moved || Math.hypot(point.x - state.drag.start.x, point.y - state.drag.start.y) > 4;
    if (els.selectionMode.value === "lasso") state.drag.path.push(point);
  }
  if ((state.tool === "select" && state.drag) || (state.tool === "element" && state.pendingNode)) draw();
});

canvas.addEventListener("mouseup", (event) => {
  const point = canvasPoint(event);
  if (state.freeformDraw) {
    const path = [...state.freeformDraw.path, point];
    state.freeformDraw = null;
    if (path.length > 2) {
      mutate(() => addFreeformElement(path));
    } else {
      draw();
    }
    return;
  }
  if (state.rotateSupport) {
    const interaction = state.rotateSupport;
    state.rotateSupport = null;
    const node = getNode(interaction.nodeId);
    if (node && !interaction.moved) setSelection("node", node.id, event.shiftKey);
    syncUi();
    draw();
    return;
  }
  if (state.pan) {
    const wasClick = !state.pan.moved;
    state.pan = null;
    if (wasClick) handlePointAction(point, event);
    draw();
    return;
  }
  if (state.tool === "select" && state.drag && state.drag.moved && els.selectionMode.value !== "point") {
    if (els.selectionMode.value === "box") selectByBox(state.drag.start, point);
    if (els.selectionMode.value === "lasso") selectByLasso(state.drag.path);
    state.drag = null;
    return;
  }
  handlePointAction(point, event);
  state.drag = null;
});

canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    const point = canvasPoint(event);
    const before = {
      x: (point.x - state.origin.x) / state.pxPerMeter,
      y: (state.origin.y - point.y) / state.pxPerMeter,
    };
    const factor = Math.exp(-event.deltaY * 0.001);
    const nextScale = Math.min(state.maxPxPerMeter, Math.max(state.minPxPerMeter, state.pxPerMeter * factor));
    if (Math.abs(nextScale - state.pxPerMeter) < 1e-6) return;
    state.pxPerMeter = nextScale;
    state.origin = {
      x: point.x - before.x * nextScale,
      y: point.y + before.y * nextScale,
    };
    draw();
  },
  { passive: false }
);

canvas.addEventListener("mouseleave", () => {
  state.pointer = null;
  state.drag = null;
  state.pan = null;
  state.rotateSupport = null;
  state.freeformDraw = null;
  draw();
});

canvas.addEventListener("dblclick", (event) => {
  const point = canvasPoint(event);
  const hitNode = nodeOrSupportAtScreen(point.x, point.y);
  if (!hitNode) return;
  event.preventDefault();
  if (isSupportNode(hitNode)) openSupportDialog(hitNode);
  else openNodeDialog(hitNode);
});

els.showLoginButton.addEventListener("click", () => showAuthMode("login"));
if (els.announcementButton) els.announcementButton.addEventListener("click", openAnnouncement);
if (els.announcementDialog) {
  els.announcementDialog.addEventListener("click", (event) => {
    if (event.target === els.announcementDialog) closeAnnouncement();
  });
  els.announcementDialog.addEventListener("close", restoreAnnouncementFocus);
}
els.showRegisterButton.addEventListener("click", () => showAuthMode("register"));
if (els.internalLoginEntry) {
  els.internalLoginEntry.addEventListener("click", () => {
    setAuthMessage("请先登录，再通过“获得更多权益”进入内部测试通道。");
  });
}
els.loginSubmit.addEventListener("click", loginUser);
els.registerSubmit.addEventListener("click", registerUser);
els.startAppButton.addEventListener("click", startApplication);
if (els.staticModuleButton) els.staticModuleButton.addEventListener("click", launchStaticApplication);
if (els.dynamicsModuleButton) els.dynamicsModuleButton.addEventListener("click", launchDynamicsApplication);
els.welcomeLogoutButton.addEventListener("click", logoutUser);
els.settingsButton.addEventListener("click", openSettingsDialog);
if (els.dynamicsSettingsButton) els.dynamicsSettingsButton.addEventListener("click", openSettingsDialog);
if (els.benefitsButton) els.benefitsButton.addEventListener("click", openEntitlementsDialog);
if (els.dynamicsBenefitsButton) {
  els.dynamicsBenefitsButton.addEventListener("click", openEntitlementsDialog);
}
if (els.redeemInternalButton) {
  els.redeemInternalButton.addEventListener("click", redeemInternalAccess);
}
if (els.joinPinnWaitlistButton) {
  els.joinPinnWaitlistButton.addEventListener("click", joinPinnWaitlist);
}
if (els.internalInviteCode) {
  els.internalInviteCode.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      redeemInternalAccess();
    }
  });
}
if (els.dynamicsToStaticButton) els.dynamicsToStaticButton.addEventListener("click", launchStaticApplication);
if (els.staticToDynamicsButton) els.staticToDynamicsButton.addEventListener("click", launchDynamicsApplication);
els.fontSizeSelect.addEventListener("change", () => applyFontSize(els.fontSizeSelect.value));
els.saveNicknameButton.addEventListener("click", saveNickname);
els.saveAvatarButton.addEventListener("click", saveSettingsAvatar);
els.savePasswordButton.addEventListener("click", savePassword);
els.logoutButton.addEventListener("click", logoutUser);
els.registerAvatar.addEventListener("change", () => {
  const file = els.registerAvatar.files && els.registerAvatar.files[0];
  previewRegisterAvatar(file);
});
els.settingsAvatar.addEventListener("change", () => {
  const file = els.settingsAvatar.files && els.settingsAvatar.files[0];
  previewSettingsAvatar(file);
});
for (const input of [els.loginUsername, els.loginPassword]) {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") loginUser();
  });
}
for (const input of [
  els.registerUsername,
  els.registerPassword,
  els.registerPasswordConfirm,
  els.registerNickname,
]) {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") registerUser();
  });
}

els.toolButtons.forEach((button) => button.addEventListener("click", () => setTool(button.dataset.tool)));
els.undoButton.addEventListener("click", undo);
els.redoButton.addEventListener("click", redo);
els.deleteButton.addEventListener("click", deleteSelection);
els.saveButton.addEventListener("click", saveProject);
els.reportButton.addEventListener("click", downloadReport);
els.openButton.addEventListener("click", () => els.fileInput.click());
els.solveButton.addEventListener("click", openSolveDialog);
els.runSolveButton.addEventListener("click", (event) => {
  event.preventDefault();
  solveFromDialog();
});
els.applyElementSettingsButton.addEventListener("click", (event) => {
  event.preventDefault();
  applyElementSettings();
  els.elementDialog.close();
});
els.applySupportSettingsButton.addEventListener("click", (event) => {
  event.preventDefault();
  applySupportSettings();
  els.supportDialog.close();
});
els.solidifySupportNodeButton.addEventListener("click", (event) => {
  event.preventDefault();
  solidifyDialogNode();
  els.supportDialog.close();
});
els.solidifyNodeButton.addEventListener("click", (event) => {
  event.preventDefault();
  solidifyDialogNode();
  els.nodeDialog.close();
});
els.elementType.addEventListener("change", setSelectedElementType);
els.momentReleaseI.addEventListener("change", () => setSelectedElementReleases("i"));
els.momentReleaseJ.addEventListener("change", () => setSelectedElementReleases("j"));
els.setElementLengthButton.addEventListener("click", setSelectedElementLength);
els.themeButton.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  els.themeButton.textContent = document.body.classList.contains("dark-theme") ? "白底" : "黑底";
  draw();
});
els.loadModeRadios.forEach((radio) => radio.addEventListener("change", syncLoadPanels));
els.loadDirectionButtons.forEach((button) => button.addEventListener("click", () => setLoadDirection(button.dataset.loadDirection)));
els.applyLoadToSelectionButton.addEventListener("click", () => {
  mutate(() => applyCurrentLoad());
  els.loadDialog.close();
});
els.fileInput.addEventListener("change", async () => {
  const file = els.fileInput.files && els.fileInput.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    importProject(JSON.parse(text));
    showToast("工程已打开。");
  } catch (error) {
    showToast(String(error.message || error));
  } finally {
    els.fileInput.value = "";
  }
});

if (els.dynamicsSolveButton) els.dynamicsSolveButton.addEventListener("click", openDynamicsSolveDialog);
if (els.runDynamicsSolveButton) {
  els.runDynamicsSolveButton.addEventListener("click", () => {
    els.dynamicsSolveDialog.close();
    solveDynamics();
  });
}
if (els.dynamicsUndoButton) els.dynamicsUndoButton.addEventListener("click", undoDynamics);
if (els.dynamicsRedoButton) els.dynamicsRedoButton.addEventListener("click", redoDynamics);
if (els.dynamicsDeleteButton) els.dynamicsDeleteButton.addEventListener("click", deleteSelectedDynamicsObject);
if (els.dynamicsSaveButton) els.dynamicsSaveButton.addEventListener("click", saveDynamicsProject);
if (els.dynamicsOpenButton) els.dynamicsOpenButton.addEventListener("click", () => els.dynamicsFileInput.click());
if (els.dynamicsReportButton) els.dynamicsReportButton.addEventListener("click", downloadDynamicsReport);
if (els.dynamicsFileInput) {
  els.dynamicsFileInput.addEventListener("change", async () => {
    const file = els.dynamicsFileInput.files && els.dynamicsFileInput.files[0];
    if (!file) return;
    try {
      importDynamicsProject(JSON.parse(await file.text()));
      showDynamicsToast("动力学工程已打开。", 2200);
    } catch (error) {
      showDynamicsToast(String(error.message || error), 3600);
    } finally {
      els.dynamicsFileInput.value = "";
    }
  });
}
if (els.dynamicsPlaceButton) els.dynamicsPlaceButton.addEventListener("click", beginDynamicsObjectPlacement);
if (els.dynamicsFieldButton) els.dynamicsFieldButton.addEventListener("click", () => openDynamicsFieldDialog());
if (els.dynamicsForceButton) els.dynamicsForceButton.addEventListener("click", openDynamicsForceDialog);
if (els.dynamicsClearButton) els.dynamicsClearButton.addEventListener("click", clearDynamicsModel);
if (els.dynamicsFieldApplyButton) els.dynamicsFieldApplyButton.addEventListener("click", applyDynamicsField);
if (els.dynamicsFieldNumericApplyButton) {
  els.dynamicsFieldNumericApplyButton.addEventListener("click", applyDynamicsFieldNumerically);
}
if (els.dynamicsFieldCancelButton) {
  els.dynamicsFieldCancelButton.addEventListener("click", () => cancelDynamicsFieldPlacement());
}
if (els.dynamicsFieldDialog) {
  els.dynamicsFieldDialog.addEventListener("close", () => {
    if (state.dynamics.fieldPlacement.phase !== "configuring") return;
    state.dynamics.fieldPlacement = DynamicsFieldPlacement.cancelPlacement();
    syncDynamicsCanvasCursor();
    updateDynamicsFieldStatus();
  });
}
if (els.dynamicsForceApplyButton) els.dynamicsForceApplyButton.addEventListener("click", applyDynamicsForce);
if (els.dynamicsForceType) els.dynamicsForceType.addEventListener("change", () => {
  els.dynamicsForceMagnitude.value = els.dynamicsForceType.value === "continuous" ? "1 N" : "1 N*s";
  syncDynamicsForceDialog();
});
if (els.dynamicsForceDirectionPreset) els.dynamicsForceDirectionPreset.addEventListener("change", syncDynamicsForceDialog);
if (els.dynamicsForcePointFrame) els.dynamicsForcePointFrame.addEventListener("change", syncDynamicsForceDialog);

if (els.dynamicsEnvironment) {
  els.dynamicsEnvironment.addEventListener("change", () => {
    setDynamicsFieldDefaults(els.dynamicsEnvironment.value);
    syncDynamicsFieldDialog();
  });
}
for (const control of [els.dynamicsFieldDirectionPreset, els.dynamicsFieldRange, els.dynamicsFieldMode]) {
  if (control) control.addEventListener("change", syncDynamicsFieldDialog);
}

for (const control of [els.dynamicsBuildKind, els.dynamicsCustomMode]) {
  if (!control) continue;
  control.addEventListener("change", () => {
    cancelDynamicsFieldPlacement({ silent: true });
    state.dynamics.placementMode = false;
    if (control === els.dynamicsBuildKind && selectedDynamicsObject()?.kind !== els.dynamicsBuildKind.value) {
      state.dynamics.selectedObjectId = null;
      state.dynamics.object = null;
      els.dynamicsObjectPanelTitle.textContent = "新对象参数";
      renderDynamicsSceneLists();
    }
    syncDynamicsControls();
    drawDynamicsScene();
  });
}

for (const control of [
  els.dynamicsRigidToggle,
  els.dynamicsMass,
  els.dynamicsDensity,
  els.dynamicsCharge,
  els.dynamicsSizeA,
  els.dynamicsSizeB,
  els.dynamicsSizeC,
  els.dynamicsMaterialE,
  els.dynamicsShapeEquation,
  els.dynamicsVx0,
  els.dynamicsVy0,
  els.dynamicsTheta0,
  els.dynamicsOmega0,
]) {
  if (!control) continue;
  control.addEventListener("change", () => {
    updateSelectedDynamicsObjectFromControls();
    syncDynamicsControls();
  });
}

if (els.dynamicsGroundToggle) {
  els.dynamicsGroundToggle.addEventListener("change", () => {
    recordDynamicsHistory();
    if (els.dynamicsGroundToggle.checked) {
      state.dynamics.model = "coupled-rigid-body2d";
      state.dynamics.grounds = [
        {
          id: "G1",
          normal: { x: 0, y: 1 },
          offset: 0,
          contact: { restitution: 0.5, staticFriction: 0.6, dynamicFriction: 0.4, damping: 0 },
        },
      ];
    } else {
      state.dynamics.grounds = [];
    }
    state.dynamics.result = null;
    cancelDynamicsAnimation();
    renderDynamicsResult();
    drawDynamicsScene();
  });
}

for (const control of [els.dynamicsX0, els.dynamicsY0, els.dynamicsDuration, els.dynamicsTimeStep]) {
  if (!control) continue;
  control.addEventListener("change", () => {
    if (control === els.dynamicsX0 || control === els.dynamicsY0) updateSelectedDynamicsObjectFromControls();
    cancelDynamicsAnimation();
    state.dynamics.result = null;
    renderDynamicsResult();
    drawDynamicsScene();
  });
}

for (const list of [els.dynamicsObjectList, els.dynamicsFieldList, els.dynamicsForceList, els.dynamicsTrackList]) {
  if (!list) continue;
  list.addEventListener("click", (event) => {
    const row = event.target.closest(".dynamics-scene-row");
    if (!row) return;
    const { kind, id } = row.dataset;
    if (event.target.closest("button[data-delete]")) {
      if (kind === "object") deleteDynamicsObject(id);
      if (kind === "field") deleteDynamicsField(id);
      if (kind === "force") deleteDynamicsForce(id);
      if (kind === "track") deleteDynamicsTrack(id);
      return;
    }
    if (kind === "object") selectDynamicsObject(id);
    if (kind === "field") openDynamicsFieldDialog(id);
  });
}

for (const control of els.dynamicsOptionInputs) {
  control.addEventListener("change", () => {
    renderDynamicsResult();
    cancelDynamicsAnimation();
    drawDynamicsScene();
    if (state.dynamics.result && selectedDynamicsOptions().has("trajectory")) startDynamicsAnimation();
  });
}

if (dynamicsCanvas) {
  dynamicsCanvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    const screen = dynamicsCanvasPoint(event);
    const world = dynamicsToWorld(screen);
    if (state.dynamics.fieldPlacement.active) {
      state.dynamics.fieldPlacement = DynamicsFieldPlacement.startPlacement(state.dynamics.fieldPlacement, world);
      drawDynamicsScene();
      return;
    }
    if (state.dynamics.placementMode && isDynamicsPaintMode()) {
      state.dynamics.painting = true;
      state.dynamics.paintPath = [world];
      return;
    }
    if (state.dynamics.placementMode) {
      placeDynamicsObject(world);
      return;
    }
    state.dynamics.pan = {
      start: screen,
      originStart: { ...state.dynamics.origin },
    };
  });

  dynamicsCanvas.addEventListener("mousemove", (event) => {
    const screen = dynamicsCanvasPoint(event);
    const world = dynamicsToWorld(screen);
    if (state.dynamics.fieldPlacement.active && state.dynamics.fieldPlacement.startWorld) {
      state.dynamics.fieldPlacement = DynamicsFieldPlacement.updatePlacement(
        state.dynamics.fieldPlacement,
        world,
        3 / state.dynamics.scale
      );
      drawDynamicsScene();
      return;
    }
    if (state.dynamics.painting && isDynamicsPaintMode()) {
      const last = state.dynamics.paintPath[state.dynamics.paintPath.length - 1];
      if (!last || Math.hypot(world.x - last.x, world.y - last.y) * state.dynamics.scale > 3) state.dynamics.paintPath.push(world);
      drawDynamicsScene();
      return;
    }
    if (!state.dynamics.pan) return;
    state.dynamics.origin = {
      x: state.dynamics.pan.originStart.x + screen.x - state.dynamics.pan.start.x,
      y: state.dynamics.pan.originStart.y + screen.y - state.dynamics.pan.start.y,
    };
    drawDynamicsScene();
  });

  dynamicsCanvas.addEventListener("mouseup", (event) => {
    if (state.dynamics.fieldPlacement.active && state.dynamics.fieldPlacement.startWorld) {
      state.dynamics.fieldPlacement = DynamicsFieldPlacement.updatePlacement(
        state.dynamics.fieldPlacement,
        dynamicsToWorld(dynamicsCanvasPoint(event)),
        1 / state.dynamics.scale
      );
      finishDynamicsFieldPlacement();
      return;
    }
    if (state.dynamics.painting) {
      state.dynamics.painting = false;
      finishDynamicsPaintedObject(state.dynamics.paintPath);
      return;
    }
    state.dynamics.pan = null;
  });

  dynamicsCanvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const screen = dynamicsCanvasPoint(event);
      const before = dynamicsToWorld(screen);
      const factor = Math.exp(-event.deltaY * 0.001);
      const nextScale = Math.min(320, Math.max(12, state.dynamics.scale * factor));
      if (Math.abs(nextScale - state.dynamics.scale) < 1e-6) return;
      state.dynamics.scale = nextScale;
      state.dynamics.origin = {
        x: screen.x - before.x * nextScale,
        y: screen.y + before.y * nextScale,
      };
      drawDynamicsScene();
    },
    { passive: false }
  );

  dynamicsCanvas.addEventListener("mouseleave", () => {
    state.dynamics.pan = null;
    if (state.dynamics.painting) {
      state.dynamics.painting = false;
      state.dynamics.paintPath = [];
    }
    if (state.dynamics.fieldPlacement.active && state.dynamics.fieldPlacement.startWorld) {
      cancelDynamicsFieldPlacement();
      return;
    }
    drawDynamicsScene();
  });

  dynamicsCanvas.addEventListener("contextmenu", (event) => {
    if (!state.dynamics.fieldPlacement.active) return;
    event.preventDefault();
    cancelDynamicsFieldPlacement();
  });
}

for (const control of [
  els.gridToggle,
  els.snapToggle,
  els.orthogonalToggle,
  els.deformedToggle,
  els.momentToggle,
  els.shearToggle,
  els.axialToggle,
  els.stressStrainToggle,
  els.deformScale,
]) {
  control.addEventListener("input", draw);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && els.announcementDialog?.open) {
    event.preventDefault();
    closeAnnouncement();
    return;
  }
  if (event.key === "Escape" && state.dynamics.fieldPlacement.active) {
    event.preventDefault();
    cancelDynamicsFieldPlacement();
    return;
  }
  if (isTextEditingEvent(event)) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (state.activeModule === "dynamics") undoDynamics();
    else undo();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
    event.preventDefault();
    if (state.activeModule === "dynamics") redoDynamics();
    else redo();
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    if (state.activeModule === "dynamics") deleteSelectedDynamicsObject();
    else deleteSelection();
  }
});

function isTextEditingEvent(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

window.addEventListener("resize", () => {
  resizeCanvas();
  resizeDynamicsCanvas();
});
if (typeof ResizeObserver === "function" && dynamicsCanvas?.parentElement) {
  let pendingDynamicsResize = 0;
  const dynamicsResizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(pendingDynamicsResize);
    pendingDynamicsResize = requestAnimationFrame(resizeDynamicsCanvas);
  });
  dynamicsResizeObserver.observe(dynamicsCanvas.parentElement);
}
applyFontSize(localStorage.getItem(AUTH_FONT_SIZE_KEY), false);
syncLoadPanels();
initAuth();
resizeCanvas();
resizeDynamicsCanvas();
syncDynamicsControls();
renderDynamicsSceneLists();
syncUi();
