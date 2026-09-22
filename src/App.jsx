import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertCircle, Archive, ArrowUpDown, BarChart3, Bell, Brush, Calendar, CheckCircle2, ChevronDown,
  ClipboardCheck, Clock3, Copy, Database, Download, Edit3, Eraser, Eye, EyeOff, FileText,
  FolderKanban, Grid3X3, Image as ImageIcon, LayoutDashboard, ListFilter, Menu,
  Minus, MoreHorizontal, Move, MousePointer2, LogOut, PanelRight, Pause, Play, Plus,
  Redo2, RotateCcw, Save, Search, Settings, ShieldCheck, Square, Target, Trash2,
  TrendingUp, Undo2, Upload, Users, X, ZoomIn, ZoomOut, FileArchive, FileJson, FileSpreadsheet, Check, Filter, RefreshCw, UserPlus, BriefcaseBusiness, Zap, Palette, SlidersHorizontal, Layers, Workflow, CheckSquare, Star
} from "lucide-react";
import "./App.css";
import { supabase } from "./supabaseClient.js";
import JSZip from "jszip";

// ---- Build 42: Error Monitoring ----
// Bulletproof by design: this capture path never depends on React state or a
// live session, so it keeps working even if the app itself has crashed.
const ERROR_LOG_KEY = "annotatepro_error_log_v1";
function logClientError(message, stack, context) {
  try {
    const raw = localStorage.getItem(ERROR_LOG_KEY);
    const log = raw ? JSON.parse(raw) : [];
    log.unshift({ id: `err-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, message: String(message || "Unknown error").slice(0, 500), stack: String(stack || "").slice(0, 2000), context: context || "", timestamp: new Date().toISOString(), synced: false });
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(log.slice(0, 100)));
  } catch { /* localStorage unavailable — nothing more we can do */ }
}
if (typeof window !== "undefined" && !window.__annotateProErrorHooksInstalled) {
  window.__annotateProErrorHooksInstalled = true;
  window.addEventListener("error", (e) => logClientError(e.message, e.error?.stack, "window.onerror"));
  window.addEventListener("unhandledrejection", (e) => logClientError(e.reason?.message || String(e.reason), e.reason?.stack, "unhandledrejection"));
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { logClientError(error.message, error.stack, `ErrorBoundary: ${(info.componentStack || "").slice(0, 300)}`); }
  render() {
    if (this.state.hasError) {
      return <div className="crash-screen">
        <div className="crash-card">
          <AlertCircle size={32} />
          <h2>Something went wrong</h2>
          <p>AnnotatePro hit an unexpected error. Your data is safe — it's saved as you go. Reloading usually fixes this.</p>
          <button className="primary-btn" onClick={() => window.location.reload()}>Reload AnnotatePro</button>
        </div>
      </div>;
    }
    return this.props.children;
  }
}

const PROJECTS_KEY = "annotatepro_projects_v2";
const TASKS_KEY = "annotatepro_tasks_v1";
const DATASETS_KEY = "annotatepro_datasets_v1";
const SETTINGS_KEY = "annotatepro_settings_v1";

const labelPalette = [
  "#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ea580c",
  "#0891b2", "#ca8a04", "#db2777", "#4f46e5", "#65a30d"
];

const GROUP_ICONS = { Brush, Square, Layers, FolderKanban, Target, ShieldCheck };

const defaultProjectGroups = [
  { id: "grp-segmentation", name: "Segmentation", description: "Pixel-level segmentation work — masks, polygons and brush labels.", icon: "Brush", color: "#1D9E75", status: "Active", stage: "Active", ownerId: "m1", teamIds: ["m1","m4"] },
  { id: "grp-detection", name: "Detection", description: "Bounding-box object detection work.", icon: "Square", color: "#378ADD", status: "Active", stage: "Active", ownerId: "m1", teamIds: ["m1","m3","m7"] },
  { id: "grp-combined", name: "Combined", description: "Projects mixing multiple annotation types.", icon: "Layers", color: "#8B5CF6", status: "Active", stage: "Planning", ownerId: "", teamIds: [] }
];

const PROJECT_STAGES = ["Planning", "Active", "In Review", "Completed"];

const sampleProjects = [
  {
    id: "p1", name: "Road Object Detection", client: "Mobility AI",
    annotationType: "Bounding Box", groupId: "grp-detection", totalImages: 120, completedImages: 46,
    team: "Road Vision Team", status: "In Progress", startDate: "2026-09-01",
    dueDate: "2026-09-25", description: "Vehicle and road-object detection dataset."
  },
  {
    id: "p2", name: "Pavement Segmentation", client: "Urban Mapping",
    annotationType: "Segmentation", groupId: "grp-segmentation", totalImages: 80, completedImages: 29,
    team: "Segmentation Team", status: "In Progress", startDate: "2026-08-25",
    dueDate: "2026-09-20", description: "Road and pavement segmentation."
  },
  {
    id: "p3", name: "Street Infrastructure", client: "City Intelligence",
    annotationType: "Polygon", groupId: "grp-combined", totalImages: 150, completedImages: 64,
    team: "Infrastructure Team", status: "In Progress", startDate: "2026-08-20",
    dueDate: "2026-10-05", description: "Street infrastructure object annotation."
  },
  {
    id: "p4", name: "Traffic Sign Classification", client: "DriveSafe AI",
    annotationType: "Classification", groupId: "grp-combined", totalImages: 50, completedImages: 50,
    team: "Classification Team", status: "Completed", startDate: "2026-08-01",
    dueDate: "2026-09-10", description: "Traffic sign classification."
  }
];

const sampleTasks = [
  { id: "task-001", projectId: "p1", datasetId: "ds-p1-default", name: "road_scene_001.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=85" },
  { id: "task-002", projectId: "p1", datasetId: "ds-p1-default", name: "road_scene_002.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=1600&q=85" },
  { id: "task-003", projectId: "p2", datasetId: "ds-p2-default", name: "road_scene_003.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1600&q=85" },
  { id: "task-004", projectId: "p2", datasetId: "ds-p2-default", name: "street_scene_004.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1600&q=85" },
  { id: "task-005", projectId: "p3", datasetId: "ds-p3-default", name: "street_scene_005.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=85" },
  { id: "task-006", projectId: "p4", datasetId: "ds-p4-default", name: "traffic_scene_006.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1600&q=85" }
];

const DATASET_STAGES = ["Draft", "Collecting", "Ready", "In Use", "Retired"];

function defaultDatasetFor(project) {
  return { id: `ds-${project.id}-default`, projectId: project.id, name: "Default Dataset", description: "Initial imported dataset.", version: 1, stage: "Ready", status: "Active", versionHistory: [], createdAt: new Date().toISOString() };
}
const defaultDatasets = sampleProjects.map(defaultDatasetFor);

const defaultLabels = [
  { id: "car", name: "Car", color: "#2563eb", type: "Rectangle", parentId: null, groupId: null, shortcut: "1", attributes: [] },
  { id: "person", name: "Person", color: "#16a34a", type: "Rectangle", parentId: null, groupId: null, shortcut: "2", attributes: [] },
  { id: "truck", name: "Truck", color: "#dc2626", type: "Rectangle", parentId: null, groupId: null, shortcut: "3", attributes: [] },
  { id: "bus", name: "Bus", color: "#9333ea", type: "Rectangle", parentId: null, groupId: null, shortcut: "4", attributes: [] },
  { id: "traffic-sign", name: "Traffic Sign", color: "#ea580c", type: "Rectangle", parentId: null, groupId: null, shortcut: "5", attributes: [] }
];
// Single-character keys reserved by the annotation workspace's tool shortcuts —
// label shortcuts can't reuse these since tool-switching takes priority.
const RESERVED_SHORTCUTS = ["v","b","p","l","k","g","r","e"," "];
const ATTRIBUTE_TYPES = ["Text", "Number", "Boolean", "Select"];

const emptyProject = {
  name: "", client: "", annotationType: "Bounding Box", groupId: defaultProjectGroups[0].id, totalImages: 100,
  completedImages: 0, team: "Annotation Team", status: "Pending",
  startDate: "", dueDate: "", description: ""
};

// ---- Build 44: Storage optimization — downscale large images before upload.
// Only ever shrinks (never crops), so percent-based annotation coordinates
// stay valid regardless of the final pixel size. Falls back to the original
// blob on any failure so a broken image can never block an import.
function compressImageBlob(blob, maxDimension = 1920, quality = 0.85) {
  return new Promise((resolve) => {
    if (!blob || !blob.type || !blob.type.startsWith("image/") || blob.type.includes("svg")) { resolve(blob); return; }
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      if (scale >= 1 || !img.width || !img.height) { URL.revokeObjectURL(url); resolve(blob); return; }
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const outType = blob.type.includes("png") ? "image/png" : "image/jpeg";
        canvas.toBlob((out) => { URL.revokeObjectURL(url); resolve(out || blob); }, outType, quality);
      } catch { URL.revokeObjectURL(url); resolve(blob); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
    img.src = url;
  });
}

function progressOf(p) {
  const total = Number(p.totalImages) || 0;
  const completed = Math.min(total, Math.max(0, Number(p.completedImages) || 0));
  return total ? Math.round((completed / total) * 100) : 0;
}

function initials(name = "?") {
  return name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();
}

function validateDataset(dsTasks, config) {
  const issues = [];
  if (!dsTasks.length) issues.push("No images in this dataset yet");
  const invalid = dsTasks.filter(t => !t.image).length;
  if (invalid) issues.push(`${invalid} invalid file${invalid > 1 ? "s" : ""} (missing image data)`);
  const duplicateNames = dsTasks.map(t => t.name).filter((n, i, arr) => arr.indexOf(n) !== i);
  if (duplicateNames.length) issues.push(`${new Set(duplicateNames).size} duplicate filename${new Set(duplicateNames).size > 1 ? "s" : ""}`);
  if (!config?.labels?.length) issues.push("Project has no labels configured yet");
  return { valid: issues.length === 0, issues };
}

function projectHealth(groupTasks, recentActivity) {
  if (!groupTasks.length) return { level: "No data", overdue: 0 };
  const today = new Date().toISOString().slice(0, 10);
  const overdue = groupTasks.filter(p => p.dueDate && p.dueDate < today && p.status !== "Completed").length;
  const overdueRatio = overdue / groupTasks.length;
  const lastActivityAt = recentActivity[0]?.timestamp;
  const daysSinceActivity = lastActivityAt ? (Date.now() - new Date(lastActivityAt).getTime()) / 86400000 : Infinity;
  let level = "Healthy";
  if (overdueRatio > 0.3 || daysSinceActivity > 14) level = "Critical";
  else if (overdueRatio > 0 || daysSinceActivity > 7) level = "At Risk";
  return { level, overdue };
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [dashboardLayouts, setDashboardLayouts] = useState(() => readStorage("annotatepro_dashboard_layouts_v1", DASHBOARD_PRESETS));
  const [activeDashboardLayoutId, setActiveDashboardLayoutId] = useState(() => readStorage("annotatepro_dashboard_active_layout_v1", "overview"));
  const [dashboardEditing, setDashboardEditing] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  function confirmAction(message, options = {}) {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve, title: options.title || "Are you sure?", confirmLabel: options.confirmLabel || "Confirm", cancelLabel: options.cancelLabel || "Cancel", danger: options.danger !== false });
    });
  }
  function resolveConfirm(result) {
    confirmState?.resolve(result);
    setConfirmState(null);
  }
  const [commandOpen, setCommandOpen] = useState(false);
  const [recentItems, setRecentItems] = useState(() => readStorage("annotatepro_recent_items_v1", []));
  const [favoriteItems, setFavoriteItems] = useState(() => readStorage("annotatepro_favorite_items_v1", []));
  useEffect(() => { localStorage.setItem("annotatepro_recent_items_v1", JSON.stringify(recentItems)); }, [recentItems]);
  useEffect(() => { localStorage.setItem("annotatepro_favorite_items_v1", JSON.stringify(favoriteItems)); }, [favoriteItems]);
  const [apiTokens, setApiTokens] = useState(() => readStorage("annotatepro_api_tokens_v1", []));
  const [webhooks, setWebhooks] = useState(() => readStorage("annotatepro_webhooks_v1", []));
  useEffect(() => { localStorage.setItem("annotatepro_api_tokens_v1", JSON.stringify(apiTokens)); }, [apiTokens]);
  useEffect(() => { localStorage.setItem("annotatepro_webhooks_v1", JSON.stringify(webhooks)); }, [webhooks]);
  useEffect(() => {
    function onGlobalKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(v => !v);
      } else if (e.key === "Escape") {
        setCommandOpen(false);
      }
    }
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, []);
  useEffect(() => { localStorage.setItem("annotatepro_dashboard_layouts_v1", JSON.stringify(dashboardLayouts)); }, [dashboardLayouts]);
  useEffect(() => { localStorage.setItem("annotatepro_dashboard_active_layout_v1", JSON.stringify(activeDashboardLayoutId)); }, [activeDashboardLayoutId]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authProfile, setAuthProfile] = useState(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash || "";
    if (hash.includes("type=recovery") || hash.includes("type=invite")) setPasswordRecovery(true);
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setAuthProfile(null); return; }
    supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
      setAuthProfile(data || null);
    });
  }, [session?.user?.id]);

  const currentUserName = authProfile?.full_name || session?.user?.email?.split("@")[0] || "there";
  const currentUserEmail = session?.user?.email || "";
  const currentUserInitial = initials(currentUserName);
  const currentUserRole = authProfile?.role || "Annotator";
  const isAdmin = currentUserRole === "Admin";
  const canManage = isAdmin || currentUserRole === "Team Lead";
  const canReview = canManage || currentUserRole === "Reviewer";

  async function signOut() {
    await supabase.auth.signOut();
    setProfileOpen(false);
  }

  async function signOutAllDevices() {
    await supabase.auth.signOut({ scope: "global" });
    setProfileOpen(false);
  }

  // ---- Build 42: Session security — idle timeout ----
  const lastActivityRef = useRef(Date.now());
  useEffect(() => {
    const mark = () => { lastActivityRef.current = Date.now(); };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(evt => window.addEventListener(evt, mark, { passive: true }));
    return () => events.forEach(evt => window.removeEventListener(evt, mark));
  }, []);
  useEffect(() => {
    const [appSettings, setAppSettings] = useState(() => readStorage(SETTINGS_KEY, {
  ...
  sessionIdleMinutes: 30
}));

// Build 42: Session security — idle timeout
const lastActivityRef = useRef(Date.now());

useEffect(() => {
  ...
}, []);

useEffect(() => {
  const minutes = appSettings.sessionIdleMinutes;
  ...
}, [appSettings.sessionIdleMinutes, session]);

  const [accountActionStatus, setAccountActionStatus] = useState({ loading: false, forEmail: null, message: "", error: false });

  const [roleProfiles, setRoleProfiles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  async function loadRoleProfiles() {
    setRolesLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("created_at");
    if (!error) setRoleProfiles(data || []);
    setRolesLoading(false);
  }

  async function updateProfileRole(id, role) {
    setRoleProfiles(prev => prev.map(p => p.id === id ? { ...p, role } : p));
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) {
      setDatasetToast(`Couldn't update role: ${error.message}`);
      setTimeout(() => setDatasetToast(""), 2600);
      loadRoleProfiles();
    }
  }

  async function inviteTeamMember(email, fullName) {
    if (!email) return;
    setAccountActionStatus({ loading: true, forEmail: email, message: "Sending invite...", error: false });
    const { data, error } = await supabase.functions.invoke("admin-invite-user", { body: { email, full_name: fullName } });
    if (error || data?.error) {
      setAccountActionStatus({ loading: false, forEmail: email, message: (data?.error || error.message || "Invite failed — is the admin-invite-user function deployed?"), error: true });
      return;
    }
    setAccountActionStatus({ loading: false, forEmail: email, message: "Invite sent — they'll get an email to set their password.", error: false });
  }

  async function sendPasswordReset(email) {
    if (!email) return;
    setAccountActionStatus({ loading: true, forEmail: email, message: "Sending reset email...", error: false });
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) {
      setAccountActionStatus({ loading: false, forEmail: email, message: error.message, error: true });
      return;
    }
    setAccountActionStatus({ loading: false, forEmail: email, message: "Password reset email sent.", error: false });
  }

  const [appSettings, setAppSettings] = useState(() => readStorage(SETTINGS_KEY, {
    workspaceName: "Production Workspace",
    timezone: "Asia/Kolkata",
    theme: "System",
    autosave: true,
    autosaveInterval: 10,
    confirmSubmit: true,
    showObjectIds: true,
    keyboardShortcuts: true,
    compactMode: false,
    emailAssignments: true,
    emailQa: true,
    emailRework: true,
    defaultPage: "Dashboard",
    sessionIdleMinutes: 30
  }));
  const [settingsTab, setSettingsTab] = useState("Workspace");
  const [taskSettingsId, setTaskSettingsId] = useState(null);
  const [taskSettingsTab, setTaskSettingsTab] = useState("General");
  const [taskSettingsSubTab, setTaskSettingsSubTab] = useState("Import");
  const [settingsMessage, setSettingsMessage] = useState("");

  const [migrationStatus, setMigrationStatus] = useState({});
  const [migrationRunning, setMigrationRunning] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState({});
  const [verifying, setVerifying] = useState(false);
  const [lastMigratedAt, setLastMigratedAt] = useState(() => localStorage.getItem("annotatepro_last_migration_v1"));
  const [imageMigration, setImageMigration] = useState({ running: false, total: 0, done: 0, failed: 0 });

  async function migrateImagesToStorage() {
    const base64Tasks = tasks.filter(t => t.image && t.image.startsWith("data:"));
    if (!base64Tasks.length) { setImageMigration({ running: false, total: 0, done: 0, failed: 0, complete: true }); return; }
    setImageMigration({ running: true, total: base64Tasks.length, done: 0, failed: 0 });
    for (const task of base64Tasks) {
      try {
        const res = await fetch(task.image);
        const blob = await res.blob();
        const ext = (blob.type.split("/")[1] || "jpg").split("+")[0];
        const path = `${task.projectId || "unassigned"}/${task.datasetId || "unassigned"}/${Date.now()}-${task.id}.${ext}`;
        const { error } = await supabase.storage.from("task-images").upload(path, blob, { cacheControl: "3600", upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from("task-images").getPublicUrl(path);
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, image: data.publicUrl, source: "Cloud Storage" } : t));
        syncUpdate("tasks", task.id, { image: data.publicUrl, source: "Cloud Storage" });
        setImageMigration(prev => ({ ...prev, done: prev.done + 1 }));
      } catch (err) {
        console.warn("[Storage] image migration failed for", task.id, err.message);
        setImageMigration(prev => ({ ...prev, failed: prev.failed + 1 }));
      }
    }
    setImageMigration(prev => ({ ...prev, running: false, complete: true }));
  }

  function migrationDomains() {
    return [
      { key: "groups", label: "Projects (groups)", table: "project_groups", rows: () => projectGroups.map(g => ({
          id: g.id, name: g.name, description: g.description || "", icon: g.icon || "FolderKanban",
          color: g.color || "#2563eb", status: g.status || "Active", owner_id: g.ownerId || null, team_ids: g.teamIds || []
        })) },
      { key: "projects", label: "Tasks", table: "projects", rows: () => projects.map(p => ({
          id: p.id, group_id: p.groupId || null, name: p.name, client: p.client || "",
          annotation_type: p.annotationType || "Bounding Box", total_images: Number(p.totalImages) || 0,
          completed_images: Number(p.completedImages) || 0, team: p.team || "", status: p.status || "Pending",
          start_date: p.startDate || null, due_date: p.dueDate || null, description: p.description || ""
        })) },
      { key: "datasets", label: "Datasets", table: "datasets", rows: () => datasets.map(d => ({
          id: d.id, project_id: d.projectId || null, name: d.name, description: d.description || "",
          version: d.version || 1, stage: d.stage || "Draft", version_history: d.versionHistory || [],
          status: d.status || "Active", created_at: d.createdAt || new Date().toISOString()
        })) },
      { key: "tasks", label: "Images", table: "tasks", rows: () => tasks.map(t => ({
          id: t.id, project_id: t.projectId || null, dataset_id: t.datasetId || null, name: t.name,
          status: t.status || "Pending", image: t.image || null, size: t.size || null,
          source: t.source || "Sample", due_date: t.dueDate || null, assignee_id: t.assigneeId || null,
          reviewer_id: t.reviewerId || null, priority: t.priority || null, queue: t.queue || null,
          created_at: t.createdAt || new Date().toISOString()
        })) },
      { key: "annotations", label: "Annotations", table: "annotations", rows: () => {
          const rows = [];
          Object.entries(annotationsByTask).forEach(([taskId, list]) => {
            (list || []).forEach(a => rows.push({
              id: a.id, task_id: taskId, label_id: a.labelId || null, type: a.type,
              color: a.color || null, locked: !!a.locked, hidden: !!a.hidden,
              geometry: { x: a.x, y: a.y, w: a.w, h: a.h, rotation: a.rotation, points: a.points }
            }));
          });
          return rows;
        } },
      { key: "team", label: "Team members", table: "team_members", rows: () => teamMembers.map(m => ({
          id: m.id, name: m.name, email: m.email || null, role: m.role || "Annotator",
          status: m.status || "Active", capacity: m.capacity ?? 8, completed: m.completed ?? 0, qa_score: m.qaScore ?? 100
        })) },
      { key: "configs", label: "Project configuration", table: "project_configs", rows: () => Object.entries(projectConfigs).map(([groupId, c]) => ({
          group_id: groupId, labels: c.labels || [], require_qa: !!c.requireQa,
          allow_annotator_submit: !!c.allowAnnotatorSubmit, auto_save: !!c.autoSave,
          default_reviewer: c.defaultReviewer || "", max_tasks_per_annotator: c.maxTasksPerAnnotator || 10,
          instructions: c.instructions || "", color: c.color || "", workspace: c.workspace || "",
          task_sampling: c.taskSampling || "Sequential", show_instructions_before_labeling: !!c.showInstructionsBeforeLabeling,
          use_predictions: !!c.usePredictions, prediction_source: c.predictionSource || ""
        })) },
      { key: "qa", label: "QA reviews", table: "qa_reviews", rows: () => Object.entries(qaReviews).map(([taskId, r]) => ({
          task_id: taskId, decision: r.decision || null, score: r.score ?? null, reviewer: r.reviewer || null,
          comment: r.comment || "", reason: r.reason || "", annotation_count: r.annotationCount || 0,
          criteria_scores: r.criteriaScores || {}, errors: r.errors || [],
          history: r.history || [], reviewed_at: r.reviewedAt || new Date().toISOString()
        })) },
      { key: "notifications", label: "Notifications", table: "notifications", rows: () => notifications.map(n => ({
          id: n.id, type: n.type || null, title: n.title || "", message: n.message || "",
          read: !!n.read, project_id: n.projectId || null, task_id: n.taskId || null,
          created_at: n.createdAt || new Date().toISOString()
        })) },
      { key: "audit", label: "Audit events", table: "audit_events", rows: () => auditEvents.map(e => ({
          id: e.id, action: e.action, actor: e.actor || null, actor_role: e.actorRole || null,
          project_id: e.projectId || null, task_id: e.taskId || null, details: e.details || "",
          timestamp: e.timestamp || new Date().toISOString()
        })) },
      { key: "importHistory", label: "Import history", table: "import_history", rows: () => importHistory.map(h => ({
          id: h.id, file_name: h.fileName || null, dataset_id: h.datasetId || null, dataset_name: h.datasetName || null,
          imported: h.imported || 0, skipped: h.skipped || 0, at: h.at || new Date().toISOString()
        })) },
      { key: "exportHistory", label: "Export history", table: "export_history", rows: () => exportHistory.map(h => ({
          id: String(h.id), scope: h.scope || null, format: h.format || null,
          task_count: h.tasks ?? null, annotation_count: h.annotations ?? null, created_at: h.at || new Date().toISOString()
        })) },
      { key: "planner", label: "Planner targets", table: "planner_targets", conflictKeys: "member_id,role", rows: () => {
          const rows = [];
          Object.entries(plannerTargets.annotators || {}).forEach(([memberId, target]) => rows.push({ member_id: memberId, role: "annotator", daily_target: Number(target) || 0 }));
          Object.entries(plannerTargets.reviewers || {}).forEach(([memberId, target]) => rows.push({ member_id: memberId, role: "reviewer", daily_target: Number(target) || 0 }));
          return rows;
        } },
      { key: "operations", label: "Operation read states", table: "operation_reads", rows: () => Object.entries(operationRead).map(([id, read]) => ({ operation_id: id, read: !!read })) }
    ];
  }

  function migrationSingletons() {
    return [
      { key: "workload", label: "Workload settings", table: "workload_settings", row: () => ({
          id: 1, default_daily_capacity: workloadSettings.defaultDailyCapacity ?? 8, default_weekly_capacity: workloadSettings.defaultWeeklyCapacity ?? 40
        }) },
      { key: "appSettings", label: "App settings", table: "app_settings", row: () => ({
          id: 1, workspace_name: appSettings.workspaceName, timezone: appSettings.timezone, theme: appSettings.theme,
          autosave: appSettings.autosave, autosave_interval: appSettings.autosaveInterval, confirm_submit: appSettings.confirmSubmit,
          show_object_ids: appSettings.showObjectIds, keyboard_shortcuts: appSettings.keyboardShortcuts, compact_mode: appSettings.compactMode,
          email_assignments: appSettings.emailAssignments, email_qa: appSettings.emailQa, email_rework: appSettings.emailRework,
          default_page: appSettings.defaultPage
        }) }
    ];
  }

  // ---- Build 30.1: Supabase Live Data Cutover — row <-> app-shape mappers (Phase 1) ----
  function groupFromRow(g) {
    return { id: g.id, name: g.name, description: g.description || "", icon: g.icon || "FolderKanban", color: g.color || "#2563eb", status: g.status || "Active", ownerId: g.owner_id || "", teamIds: g.team_ids || [] };
  }
  function groupToRow(g) {
    return { id: g.id, name: g.name, description: g.description || "", icon: g.icon || "FolderKanban", color: g.color || "#2563eb", status: g.status || "Active", owner_id: g.ownerId || null, team_ids: g.teamIds || [] };
  }
  function projectFromRow(p) {
    return { id: p.id, groupId: p.group_id || "", name: p.name, client: p.client || "", annotationType: p.annotation_type || "Bounding Box", totalImages: Number(p.total_images) || 0, completedImages: Number(p.completed_images) || 0, team: p.team || "", status: p.status || "Pending", startDate: p.start_date || "", dueDate: p.due_date || "", description: p.description || "" };
  }
  function projectToRow(p) {
    return { id: p.id, group_id: p.groupId || null, name: p.name, client: p.client || "", annotation_type: p.annotationType || "Bounding Box", total_images: Number(p.totalImages) || 0, completed_images: Number(p.completedImages) || 0, team: p.team || "", status: p.status || "Pending", start_date: p.startDate || null, due_date: p.dueDate || null, description: p.description || "" };
  }
  function datasetFromRow(d) {
    return { id: d.id, projectId: d.project_id || "", name: d.name, description: d.description || "", version: d.version || 1, stage: d.stage || "Draft", versionHistory: d.version_history || [], status: d.status || "Active", createdAt: d.created_at || new Date().toISOString() };
  }
  function datasetToRow(d) {
    return { id: d.id, project_id: d.projectId || null, name: d.name, description: d.description || "", version: d.version || 1, stage: d.stage || "Draft", version_history: d.versionHistory || [], status: d.status || "Active", created_at: d.createdAt || new Date().toISOString() };
  }
  function taskFromRow(t) {
    return { id: t.id, projectId: t.project_id || "", datasetId: t.dataset_id || "", name: t.name, status: t.status || "Pending", image: t.image || null, size: t.size || null, source: t.source || "Sample", dueDate: t.due_date || null, assigneeId: t.assignee_id || null, reviewerId: t.reviewer_id || null, priority: t.priority || null, queue: t.queue || null, createdAt: t.created_at || new Date().toISOString() };
  }
  function taskToRow(t) {
    return { id: t.id, project_id: t.projectId || null, dataset_id: t.datasetId || null, name: t.name, status: t.status || "Pending", image: t.image || null, size: t.size || null, source: t.source || "Sample", due_date: t.dueDate || null, assignee_id: t.assigneeId || null, reviewer_id: t.reviewerId || null, priority: t.priority || null, queue: t.queue || null, created_at: t.createdAt || new Date().toISOString() };
  }
  function memberFromRow(m) {
    return { id: m.id, name: m.name, email: m.email || "", role: m.role || "Annotator", status: m.status || "Active", capacity: m.capacity ?? 8, completed: m.completed ?? 0, qaScore: m.qa_score ?? 100 };
  }
  function memberToRow(m) {
    return { id: m.id, name: m.name, email: m.email || null, role: m.role || "Annotator", status: m.status || "Active", capacity: m.capacity ?? 8, completed: m.completed ?? 0, qa_score: m.qaScore ?? 100 };
  }
  function syncUpsert(table, row) {
    if (!session) return;
    supabase.from(table).upsert(row).then(({ error }) => { if (error) console.warn(`[Cloud] ${table} upsert failed:`, error.message); });
  }
  function syncDelete(table, id) {
    if (!session) return;
    supabase.from(table).delete().eq("id", id).then(({ error }) => { if (error) console.warn(`[Cloud] ${table} delete failed:`, error.message); });
  }
  function syncUpdate(table, id, patch) {
    if (!session) return;
    supabase.from(table).update(patch).eq("id", id).then(({ error }) => { if (error) console.warn(`[Cloud] ${table} update failed:`, error.message); });
  }

  // Hydrate Phase 1 domains from Supabase once per session — cloud is the source of
  // truth for any device that connects after data already exists there. If a table
  // comes back empty (fresh workspace, migration not yet run) we keep local/sample
  // data so the UI isn't blanked out before the one-time migration is performed.
  const [cloudHydrated, setCloudHydrated] = useState(false);
  useEffect(() => {
    if (!session?.user) { setCloudHydrated(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const [groupsRes, projectsRes, datasetsRes, tasksRes, membersRes, qaRes] = await Promise.all([
          supabase.from("project_groups").select("*"),
          supabase.from("projects").select("*"),
          supabase.from("datasets").select("*"),
          supabase.from("tasks").select("*"),
          supabase.from("team_members").select("*"),
          supabase.from("qa_reviews").select("*")
        ]);
        if (cancelled) return;
        if (!groupsRes.error && groupsRes.data?.length) setProjectGroups(groupsRes.data.map(groupFromRow));
        if (!projectsRes.error && projectsRes.data?.length) setProjects(projectsRes.data.map(projectFromRow));
        if (!datasetsRes.error && datasetsRes.data?.length) setDatasets(datasetsRes.data.map(datasetFromRow));
        if (!tasksRes.error && tasksRes.data?.length) setTasks(tasksRes.data.map(taskFromRow));
        if (!membersRes.error && membersRes.data?.length) setTeamMembers(membersRes.data.map(memberFromRow));
        if (!qaRes.error && qaRes.data?.length) {
          const mapped = {};
          qaRes.data.forEach(row => {
            mapped[row.task_id] = { decision: row.decision, score: row.score, reviewer: row.reviewer, comment: row.comment, reason: row.reason, annotationCount: row.annotation_count, criteriaScores: row.criteria_scores || {}, errors: row.errors || [], history: row.history || [], reviewedAt: row.reviewed_at };
          });
          setQaReviews(mapped);
        }
        [groupsRes, projectsRes, datasetsRes, tasksRes, membersRes, qaRes].forEach(r => { if (r.error) console.warn("[Cloud] hydrate failed:", r.error.message); });
      } catch (err) {
        console.warn("[Cloud] hydrate failed:", err.message);
      } finally {
        if (!cancelled) setCloudHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  async function runMigration() {
    if (migrationRunning) return;
    setMigrationRunning(true);
    setVerifyStatus({});
    const domains = migrationDomains();
    const singletons = migrationSingletons();
    const initial = {};
    [...domains, ...singletons].forEach(d => { initial[d.key] = { state: "pending", count: 0 }; });
    setMigrationStatus(initial);

    for (const d of domains) {
      setMigrationStatus(prev => ({ ...prev, [d.key]: { state: "running", count: 0 } }));
      try {
        const rows = d.rows();
        if (rows.length) {
          const { error } = d.conflictKeys ? await supabase.from(d.table).upsert(rows, { onConflict: d.conflictKeys }) : await supabase.from(d.table).upsert(rows);
          if (error) throw error;
        }
        setMigrationStatus(prev => ({ ...prev, [d.key]: { state: "done", count: rows.length } }));
      } catch (err) {
        setMigrationStatus(prev => ({ ...prev, [d.key]: { state: "error", count: 0, error: err.message } }));
      }
    }
    for (const s of singletons) {
      setMigrationStatus(prev => ({ ...prev, [s.key]: { state: "running", count: 0 } }));
      try {
        const { error } = await supabase.from(s.table).upsert(s.row());
        if (error) throw error;
        setMigrationStatus(prev => ({ ...prev, [s.key]: { state: "done", count: 1 } }));
      } catch (err) {
        setMigrationStatus(prev => ({ ...prev, [s.key]: { state: "error", count: 0, error: err.message } }));
      }
    }
    setMigrationRunning(false);
    const now = new Date().toISOString();
    setLastMigratedAt(now);
    localStorage.setItem("annotatepro_last_migration_v1", now);
  }

  async function verifyMigrationCounts() {
    setVerifying(true);
    const domains = migrationDomains();
    const results = {};
    for (const d of domains) {
      const localCount = d.rows().length;
      try {
        const { count, error } = await supabase.from(d.table).select("*", { count: "exact", head: true });
        if (error) throw error;
        results[d.key] = { local: localCount, cloud: count ?? 0, match: (count ?? 0) >= localCount };
      } catch (err) {
        results[d.key] = { local: localCount, cloud: null, match: false, error: err.message };
      }
    }
    setVerifyStatus(results);
    setVerifying(false);
  }

  const [projects, setProjects] = useState(() => readStorage(PROJECTS_KEY, sampleProjects));
  const [projectSearch, setProjectSearch] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState("All");
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [projectDetails, setProjectDetails] = useState(null);

  const PROJECT_GROUPS_KEY = "annotatepro_project_groups_v1";
  const emptyGroupForm = { name: "", description: "", icon: "FolderKanban", color: labelPalette[0], status: "Active", stage: "Planning", ownerId: "", teamIds: [] };
  const [projectGroups, setProjectGroups] = useState(() => readStorage(PROJECT_GROUPS_KEY, defaultProjectGroups));
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const [groupMessage, setGroupMessage] = useState("");
  useEffect(() => { localStorage.setItem(PROJECT_GROUPS_KEY, JSON.stringify(projectGroups)); }, [projectGroups]);

  function openCreateGroup() { setEditingGroupId(null); setGroupForm(emptyGroupForm); setGroupModalOpen(true); }
  function openEditGroup(group) { setEditingGroupId(group.id); setGroupForm({ name: group.name, description: group.description || "", icon: group.icon || "FolderKanban", color: group.color || labelPalette[0], status: group.status || "Active", stage: group.stage || "Planning", ownerId: group.ownerId || "", teamIds: group.teamIds || [] }); setGroupModalOpen(true); }
  function saveGroup(e) {
    e.preventDefault();
    if (!groupForm.name.trim()) return;
    if (editingGroupId) {
      const updated = { ...groupForm, id: editingGroupId };
      setProjectGroups(prev => prev.map(g => g.id === editingGroupId ? { ...g, ...groupForm } : g));
      syncUpsert("project_groups", groupToRow(updated));
    } else {
      const created = { ...groupForm, id: `grp-${Date.now()}` };
      setProjectGroups(prev => [...prev, created]);
      syncUpsert("project_groups", groupToRow(created));
    }
    setGroupModalOpen(false);
  }
  function deleteGroup(id) {
    if (projects.some(p => p.groupId === id)) {
      setGroupMessage("Move or delete this project's tasks before deleting it.");
      setTimeout(() => setGroupMessage(""), 3000);
      return;
    }
    setProjectGroups(prev => prev.filter(g => g.id !== id));
    setProjectConfigs(prev => { const next = { ...prev }; delete next[id]; return next; });
    syncDelete("project_groups", id);
  }
  function updateGroupMeta(id, patch) {
    setProjectGroups(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
    syncUpdate("project_groups", id, groupToRow({ ...(projectGroups.find(g => g.id === id) || {}), ...patch }));
  }
  function archiveGroup(id) { updateGroupMeta(id, { status: "Archived" }); }
  function restoreGroup(id) { updateGroupMeta(id, { status: "Active" }); }
  function duplicateGroup(id) {
    const source = projectGroups.find(g => g.id === id);
    if (!source) return;
    const newId = `grp-${Date.now()}`;
    const copy = { ...source, id: newId, name: `${source.name} (Copy)`, status: "Active" };
    setProjectGroups(prev => [...prev, copy]);
    syncUpsert("project_groups", groupToRow(copy));
    setProjectConfigs(prev => {
      const sourceConfig = prev[id] || makeDefaultProjectConfig(source);
      const idMap = {};
      const newLabels = sourceConfig.labels.map(l => { const nid = `${newId}-${l.id}`; idMap[l.id] = nid; return { ...l, id: nid }; });
      newLabels.forEach(l => { if (l.parentId) l.parentId = idMap[l.parentId] || null; });
      const groupIdMap = {};
      const newLabelGroups = (sourceConfig.labelGroups || []).map(g => { const nid = `${newId}-${g.id}`; groupIdMap[g.id] = nid; return { ...g, id: nid }; });
      newLabels.forEach(l => { if (l.groupId) l.groupId = groupIdMap[l.groupId] || null; });
      return { ...prev, [newId]: { ...sourceConfig, projectId: newId, labels: newLabels, labelGroups: newLabelGroups, schemaVersion: 1, schemaHistory: [], automationRules: (sourceConfig.automationRules || []).map(r => ({ ...r, id: `${newId}-rule-${r.id}` })), qaCriteria: sourceConfig.qaCriteria || [], errorCategories: sourceConfig.errorCategories || [], samplingRate: sourceConfig.samplingRate ?? 100, calibrationSet: [] } };
    });
  }


  const [tasks, setTasks] = useState(() => readStorage(TASKS_KEY, sampleTasks));
  const [datasets, setDatasets] = useState(() => readStorage(DATASETS_KEY, defaultDatasets));
  useEffect(() => { localStorage.setItem(DATASETS_KEY, JSON.stringify(datasets)); }, [datasets]);
  useEffect(() => {
    setDatasets(prev => {
      const next = [...prev]; let changed = false;
      projects.forEach(project => { if (!next.some(d => d.projectId === project.id)) { next.push(defaultDatasetFor(project)); changed = true; } });
      return changed ? next : prev;
    });
  }, [projects]);

  const emptyDatasetForm = { name: "", description: "", version: 1, stage: "Draft" };
  const [datasetModalOpen, setDatasetModalOpen] = useState(false);
  const [editingDatasetId, setEditingDatasetId] = useState(null);
  const [datasetForm, setDatasetForm] = useState(emptyDatasetForm);
  const [importTaskId, setImportTaskId] = useState(sampleProjects[0]?.id || "");
  const [activeDatasetId, setActiveDatasetId] = useState(null);
  const [datasetListSearch, setDatasetListSearch] = useState("");
  const [datasetListStatus, setDatasetListStatus] = useState("Active");
  const [importTargetDataset, setImportTargetDataset] = useState(null);
  const [compareVersion, setCompareVersion] = useState(null);

  function openCreateDataset(projectId) { setEditingDatasetId(null); setDatasetForm({ ...emptyDatasetForm, projectId }); setDatasetModalOpen(true); }
  function openEditDataset(ds) { setEditingDatasetId(ds.id); setDatasetForm({ name: ds.name, description: ds.description || "", version: ds.version || 1, stage: ds.stage || "Draft", projectId: ds.projectId }); setDatasetModalOpen(true); }
  function saveDataset(e) {
    e.preventDefault();
    if (!datasetForm.name.trim()) return;
    if (editingDatasetId) {
      const updated = { ...(datasets.find(d => d.id === editingDatasetId) || {}), ...datasetForm, id: editingDatasetId };
      setDatasets(prev => prev.map(d => d.id === editingDatasetId ? { ...d, ...datasetForm } : d));
      syncUpsert("datasets", datasetToRow(updated));
    } else {
      const created = { ...datasetForm, id: `ds-${Date.now()}`, status: "Active", versionHistory: [], createdAt: new Date().toISOString() };
      setDatasets(prev => [...prev, created]);
      syncUpsert("datasets", datasetToRow(created));
    }
    setDatasetModalOpen(false);
  }
  function snapshotDatasetVersion(id) {
    const ds = datasets.find(d => d.id === id);
    if (!ds) return;
    const dsTasks = tasks.filter(t => t.datasetId === id);
    const nextVersion = (ds.version || 1) + 1;
    const snapshot = { version: ds.version || 1, savedAt: new Date().toISOString(), imageIds: dsTasks.map(t => t.name) };
    const nextHistory = [...(ds.versionHistory || []), snapshot];
    setDatasets(prev => prev.map(d => d.id === id ? { ...d, version: nextVersion, versionHistory: nextHistory } : d));
    syncUpsert("datasets", datasetToRow({ ...ds, version: nextVersion, versionHistory: nextHistory }));
    setDatasetToast(`Saved as v${ds.version || 1} — now editing v${nextVersion}`);
    setTimeout(() => setDatasetToast(""), 2400);
  }
  function archiveDataset(id) { setDatasets(prev => prev.map(d => d.id === id ? { ...d, status: "Archived" } : d)); syncUpdate("datasets", id, { status: "Archived" }); }
  function restoreDataset(id) { setDatasets(prev => prev.map(d => d.id === id ? { ...d, status: "Active" } : d)); syncUpdate("datasets", id, { status: "Active" }); }
  function deleteDataset(id) {
    if (tasks.some(t => t.datasetId === id)) {
      setDatasetToast("Remove or move this dataset's images before deleting it.");
      setTimeout(() => setDatasetToast(""), 3000);
      return;
    }
    setDatasets(prev => prev.filter(d => d.id !== id));
    syncDelete("datasets", id);
    if (activeDatasetId === id) setActiveDatasetId(null);
  }

  const [datasetSearch, setDatasetSearch] = useState("");
  const [datasetStatus, setDatasetStatus] = useState("All");
  const [datasetView, setDatasetView] = useState("table");
  const [datasetToast, setDatasetToast] = useState("");
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [tool, setTool] = useState("select");
  const [selectedLabel, setSelectedLabel] = useState(defaultLabels[0].id);
  const [labels, setLabels] = useState(defaultLabels);
  const [annotationsByTask, setAnnotationsByTask] = useState({});
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
  const [additionalSelectedIds, setAdditionalSelectedIds] = useState([]);
  const [marquee, setMarquee] = useState(null);
  const clipboardRef = useRef([]);
  const selectedIds = useMemo(() => (
    selectedAnnotationId ? [selectedAnnotationId, ...additionalSelectedIds.filter(id => id !== selectedAnnotationId)] : additionalSelectedIds
  ), [selectedAnnotationId, additionalSelectedIds]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drawing, setDrawing] = useState(null);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [workspaceProject, setWorkspaceProject] = useState(projects[0]?.id || "p1");
  const [workstationMode, setWorkstationMode] = useState("Annotation"); // "Annotation" | "Review"
  const [taskFilter, setTaskFilter] = useState("All");
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const [qaReviews, setQaReviews] = useState(() => readStorage("annotatepro_qa_reviews_v1", {}));
  const [qaSelectedTaskId, setQaSelectedTaskId] = useState(null);
  const [qaFilter, setQaFilter] = useState("All");
  const [qaSearch, setQaSearch] = useState("");
  const [qaScore, setQaScore] = useState(96);
  const [qaCriteriaScores, setQaCriteriaScores] = useState({});
  const [qaErrors, setQaErrors] = useState([]);
  const [qaScorecardOpen, setQaScorecardOpen] = useState(false);
  const [qaReason, setQaReason] = useState("Incorrect label");
  const [qaComment, setQaComment] = useState("");
  const [qaMessage, setQaMessage] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState("7 days");
  const [analyticsProject, setAnalyticsProject] = useState("All Projects");
  const [exportFormat, setExportFormat] = useState("AnnotatePro JSON");
  const [exportScope, setExportScope] = useState("All Tasks");
  const [exportProject, setExportProject] = useState("All Projects");
  const [exportSearch, setExportSearch] = useState("");
  const [exportHistory, setExportHistory] = useState(() => readStorage("annotatepro_export_history_v1", []));
  const [exportMessage, setExportMessage] = useState("");
  const TEAM_KEY = "annotatepro_team_v1";
  const [teamMembers, setTeamMembers] = useState(() => readStorage(TEAM_KEY, [
    { id: "m1", name: "Manjunath", email: "manjunath@annotatepro.local", role: "Team Lead", status: "Active", projects: ["p1", "p2"], capacity: 8, completed: 46, qaScore: 97 },
    { id: "m2", name: "Priya Sharma", email: "priya@annotatepro.local", role: "Reviewer", status: "Active", projects: ["p1", "p3"], capacity: 6, completed: 39, qaScore: 98 },
    { id: "m3", name: "Rahul Kumar", email: "rahul@annotatepro.local", role: "Annotator", status: "Active", projects: ["p1"], capacity: 7, completed: 52, qaScore: 96 },
    { id: "m4", name: "Sneha Patil", email: "sneha@annotatepro.local", role: "Annotator", status: "Active", projects: ["p2"], capacity: 6, completed: 44, qaScore: 95 },
    { id: "m5", name: "Arjun Rao", email: "arjun@annotatepro.local", role: "Annotator", status: "Active", projects: ["p3"], capacity: 8, completed: 61, qaScore: 97 },
    { id: "m6", name: "Kavya Nair", email: "kavya@annotatepro.local", role: "Reviewer", status: "Active", projects: ["p2", "p4"], capacity: 5, completed: 34, qaScore: 99 },
    { id: "m7", name: "Vikram Singh", email: "vikram@annotatepro.local", role: "Annotator", status: "Active", projects: ["p1", "p3"], capacity: 7, completed: 48, qaScore: 94 },
    { id: "m8", name: "Ananya Das", email: "ananya@annotatepro.local", role: "Annotator", status: "Inactive", projects: [], capacity: 0, completed: 27, qaScore: 93 }
  ]));
  const myTeamMemberId = teamMembers.find(m => m.email && currentUserEmail && m.email.toLowerCase() === currentUserEmail.toLowerCase())?.id || null;
  const canEditProject = (group) => canManage || (group?.teamIds || []).includes(myTeamMemberId);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamRoleFilter, setTeamRoleFilter] = useState("All Roles");
  const [teamStatusFilter, setTeamStatusFilter] = useState("All Status");
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [teamForm, setTeamForm] = useState({ name: "", email: "", role: "Annotator", status: "Active", projects: [], capacity: 6 });
  const [teamMessage, setTeamMessage] = useState("");
  const PROJECT_CONFIGS_KEY = "annotatepro_project_configs_v1";
  const makeDefaultProjectConfig = (project) => ({
    projectId: project.id,
    labels: defaultLabels.map(label => ({ ...label, id: `${project.id}-${label.id}` })),
    labelGroups: [],
    schemaVersion: 1,
    schemaHistory: [],
    automationRules: [],
    annotatorSlaHours: 24,
    reviewerSlaHours: 12,
    escalateAfterHours: 24,
    qaCriteria: [
      { id: "crit-accuracy", name: "Label Accuracy", weight: 40 },
      { id: "crit-boundary", name: "Boundary Precision", weight: 35 },
      { id: "crit-completeness", name: "Completeness", weight: 25 }
    ],
    errorCategories: [
      { id: "err-missing", name: "Missing Object", severity: "Major" },
      { id: "err-wrong-label", name: "Wrong Label", severity: "Major" },
      { id: "err-boundary", name: "Boundary Error", severity: "Minor" },
      { id: "err-duplicate", name: "Duplicate Annotation", severity: "Minor" },
      { id: "err-attribute", name: "Attribute Error", severity: "Minor" }
    ],
    samplingRate: 100,
    calibrationSet: [],
    requireQa: true, allowAnnotatorSubmit: true, autoSave: true, defaultReviewer: "", maxTasksPerAnnotator: 10,
    instructions: project.description || "Follow the project annotation guidelines and maintain consistent labeling quality.",
    color: labelPalette[0],
    workspace: "",
    taskSampling: "Sequential",
    showInstructionsBeforeLabeling: false,
    usePredictions: false,
    predictionSource: ""
  });
  const [projectConfigs, setProjectConfigs] = useState(() => {
    const saved = readStorage(PROJECT_CONFIGS_KEY, null);
    return saved || Object.fromEntries(defaultProjectGroups.map(group => [group.id, makeDefaultProjectConfig(group)]));
  });
  const [configProject, setConfigProject] = useState(projectGroups[0]?.id || defaultProjectGroups[0].id);
  const [configTab, setConfigTab] = useState("General");
  const [configMessage, setConfigMessage] = useState("");
  const TASK_PLANNER_KEY = "annotatepro_task_planner_v1";
  const [plannerProjectId, setPlannerProjectId] = useState(null);
  const [plannerPriority, setPlannerPriority] = useState("MEDIUM");
  const [plannerQueue, setPlannerQueue] = useState("Now");
  const [plannerDate, setPlannerDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [plannerTargets, setPlannerTargets] = useState(() => readStorage(TASK_PLANNER_KEY, { annotators: {}, reviewers: {} }));
  const [plannerReworkFilter, setPlannerReworkFilter] = useState("Issues");
  const [plannerReworkSelection, setPlannerReworkSelection] = useState([]);
  const [plannerMessage, setPlannerMessage] = useState("");
  const [plannerAssignmentOpen, setPlannerAssignmentOpen] = useState(false);
  const [plannerAssignmentTaskIds, setPlannerAssignmentTaskIds] = useState([]);
  const [plannerAssignmentAssignee, setPlannerAssignmentAssignee] = useState("");
  const [plannerAssignmentReviewer, setPlannerAssignmentReviewer] = useState("");
  const [plannerAssignmentPriority, setPlannerAssignmentPriority] = useState("MEDIUM");
  const [plannerAssignmentQueue, setPlannerAssignmentQueue] = useState("Now");
  const WORKLOAD_KEY = "annotatepro_workload_v1";
  const [workloadFilter, setWorkloadFilter] = useState("All Projects");
  const [workloadRole, setWorkloadRole] = useState("Annotator");
  const [workloadMessage, setWorkloadMessage] = useState("");
  const [workloadCapacityMode, setWorkloadCapacityMode] = useState("Daily");
  const [workloadSettings, setWorkloadSettings] = useState(() => readStorage(WORKLOAD_KEY, { defaultDailyCapacity: 8, defaultWeeklyCapacity: 40 }));
  const [labelEditorOpen, setLabelEditorOpen] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState(null);
  const emptyLabelForm = { name: "", color: labelPalette[0], type: "Rectangle", parentId: "", groupId: "", shortcut: "", attributes: [] };
  const [labelForm, setLabelForm] = useState(emptyLabelForm);
  const [importOpen, setImportOpen] = useState(false);
  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const IMPORT_HISTORY_KEY = "annotatepro_import_history_v1";
  const [importHistory, setImportHistory] = useState(() => readStorage(IMPORT_HISTORY_KEY, []));
  useEffect(() => { localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(importHistory)); }, [importHistory]);
  const [importStep, setImportStep] = useState("upload");
  const [importRows, setImportRows] = useState([]);
  const [importColumns, setImportColumns] = useState([]);
  const [importMapping, setImportMapping] = useState({ name: "", image: "", status: "" });
  const [importFileName, setImportFileName] = useState("");
  const [importError, setImportError] = useState("");
  const [importDuplicateMode, setImportDuplicateMode] = useState("Skip");
  const structuredInputRef = useRef(null);

  const [advImportOpen, setAdvImportOpen] = useState(false);
  const [advImportStep, setAdvImportStep] = useState("upload"); // upload | mapping | preview
  const [advImportKind, setAdvImportKind] = useState(null); // zip-images | yolo | coco
  const [advImportFileName, setAdvImportFileName] = useState("");
  const [advImportError, setAdvImportError] = useState("");
  const [advImportParsed, setAdvImportParsed] = useState(null);
  const [advImportMapping, setAdvImportMapping] = useState({});
  const [advImportProgress, setAdvImportProgress] = useState({ done: 0, total: 0 });
  const [advImportRunning, setAdvImportRunning] = useState(false);
  const advImportInputRef = useRef(null);

  function resetAdvImportWizard() {
    setAdvImportStep("upload"); setAdvImportKind(null); setAdvImportFileName("");
    setAdvImportError(""); setAdvImportParsed(null); setAdvImportMapping({});
    setAdvImportProgress({ done: 0, total: 0 });
  }

  function resetImportWizard() {
    setImportStep("upload"); setImportRows([]); setImportColumns([]);
    setImportMapping({ name: "", image: "", status: "" }); setImportFileName(""); setImportError("");
  }

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return { columns: [], rows: [] };
    const splitLine = (line) => {
      const out = []; let cur = ""; let quoted = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { if (quoted && line[i+1] === '"') { cur += '"'; i++; } else quoted = !quoted; }
        else if (ch === "," && !quoted) { out.push(cur); cur = ""; }
        else cur += ch;
      }
      out.push(cur);
      return out.map(v => v.trim());
    };
    const columns = splitLine(lines[0]);
    const rows = lines.slice(1).map(line => {
      const values = splitLine(line);
      return Object.fromEntries(columns.map((c, i) => [c, values[i] ?? ""]));
    });
    return { columns, rows };
  }

  function flattenRecord(record) {
    const out = {};
    const walk = (obj, prefix) => {
      Object.entries(obj || {}).forEach(([k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && !Array.isArray(v)) walk(v, key);
        else out[key] = Array.isArray(v) ? JSON.stringify(v) : v;
      });
    };
    walk(record, "");
    return out;
  }

  function autoMap(columns) {
    const find = (patterns) => columns.find(c => patterns.some(p => c.toLowerCase().includes(p))) || "";
    return {
      name: find(["name", "file", "title", "id"]),
      image: find(["image", "url", "src", "path", "uri"]),
      status: find(["status", "state"])
    };
  }

  async function handleStructuredFile(file) {
    if (!file) return;
    setImportFileName(file.name);
    setImportError("");
    try {
      const text = await file.text();
      let parsed;
      if (file.name.toLowerCase().endsWith(".json")) {
        const data = JSON.parse(text);
        const list = Array.isArray(data) ? data : Array.isArray(data.tasks) ? data.tasks : Array.isArray(data.data) ? data.data : [data];
        const flat = list.map(flattenRecord);
        const columns = [...new Set(flat.flatMap(r => Object.keys(r)))];
        parsed = { columns, rows: flat };
      } else {
        parsed = parseCsv(text);
      }
      if (!parsed.rows.length) { setImportError("No rows found in this file."); return; }
      setImportColumns(parsed.columns);
      setImportRows(parsed.rows);
      setImportMapping(autoMap(parsed.columns));
      setImportStep("mapping");
    } catch (err) {
      setImportError(`Could not parse this file: ${err.message}`);
    }
  }

  const importValidation = useMemo(() => {
    if (!importRows.length) return { valid: [], invalid: [], duplicates: [] };
    const targetDatasetId = importTargetDataset || datasets.find(d => d.projectId === importTaskId)?.id || datasets[0]?.id;
    const existingNames = new Set(tasks.filter(t => t.datasetId === targetDatasetId).map(t => t.name));
    const seen = new Set();
    const valid = [], invalid = [], duplicates = [];
    importRows.forEach((row, i) => {
      const name = String(row[importMapping.name] ?? "").trim();
      const image = String(row[importMapping.image] ?? "").trim();
      const status = String(row[importMapping.status] ?? "").trim();
      const entry = { row: i + 1, name, image, status: ["Pending","In Progress","Completed"].includes(status) ? status : "Pending" };
      if (!name) { invalid.push({ ...entry, reason: "Missing name" }); return; }
      if (!image) { invalid.push({ ...entry, reason: "Missing image URL" }); return; }
      if (!/^https?:\/\/|^data:image\//i.test(image)) { invalid.push({ ...entry, reason: "Invalid image URL" }); return; }
      if (existingNames.has(name) || seen.has(name)) { duplicates.push({ ...entry, reason: "Duplicate name" }); return; }
      seen.add(name);
      valid.push(entry);
    });
    return { valid, invalid, duplicates };
  }, [importRows, importMapping, tasks, datasets, importTargetDataset, importTaskId]);

  function runStructuredImport() {
    const targetDatasetId = importTargetDataset || datasets.find(d => d.projectId === importTaskId)?.id || datasets[0]?.id;
    const targetDataset = datasets.find(d => d.id === targetDatasetId);
    if (!targetDataset) { setImportError("Select a dataset to import into."); return; }
    const toImport = importDuplicateMode === "Import anyway"
      ? [...importValidation.valid, ...importValidation.duplicates]
      : importValidation.valid;
    if (!toImport.length) { setImportError("Nothing valid to import."); return; }
    const newTasks = toImport.map((entry, i) => ({
      id: `import-${Date.now()}-${i}`,
      name: entry.name, status: entry.status, image: entry.image,
      source: importFileName.toLowerCase().endsWith(".json") ? "JSON import" : "CSV import",
      projectId: targetDataset.projectId, datasetId: targetDatasetId,
      createdAt: new Date().toISOString()
    }));
    setTasks(prev => [...prev, ...newTasks]);
    setImportHistory(prev => [{
      id: `imp-${Date.now()}`, fileName: importFileName, datasetId: targetDatasetId,
      datasetName: targetDataset.name, imported: newTasks.length,
      skipped: importValidation.invalid.length + (importDuplicateMode === "Import anyway" ? 0 : importValidation.duplicates.length),
      at: new Date().toISOString()
    }, ...prev].slice(0, 50));
    setImportOpen(false);
    resetImportWizard();
    setDatasetToast(`${newTasks.length} task${newTasks.length > 1 ? "s" : ""} imported from ${importFileName}`);
    setTimeout(() => setDatasetToast(""), 2600);
  }

  async function handleAdvancedImportFile(file) {
    if (!file) return;
    setAdvImportFileName(file.name);
    setAdvImportError("");
    try {
      if (file.name.toLowerCase().endsWith(".zip")) {
        const zip = await JSZip.loadAsync(file);
        const entries = Object.entries(zip.files).filter(([, e]) => !e.dir);
        const isImage = (p) => /\.(jpe?g|png|webp|gif|bmp)$/i.test(p);
        const baseName = (p) => p.split("/").pop();
        const stripExt = (n) => n.replace(/\.[^.]+$/, "");

        const imageEntries = entries.filter(([p]) => isImage(p));
        if (!imageEntries.length) { setAdvImportError("No image files found inside this zip."); return; }

        const classesEntry = entries.find(([p]) => /(^|\/)classes\.txt$/i.test(p));
        const yamlEntry = entries.find(([p]) => /(^|\/)data\.ya?ml$/i.test(p));
        const labelTxtEntries = entries.filter(([p]) => /\.txt$/i.test(p) && !/classes\.txt$/i.test(p));
        const cocoJsonEntry = entries.find(([p]) => /\.json$/i.test(p));

        // Try COCO: any JSON entry shaped like {images, annotations, categories}
        if (cocoJsonEntry) {
          const jsonText = await cocoJsonEntry[1].async("string");
          let cocoData;
          try { cocoData = JSON.parse(jsonText); } catch { cocoData = null; }
          if (cocoData && Array.isArray(cocoData.images) && Array.isArray(cocoData.annotations) && Array.isArray(cocoData.categories)) {
            const images = [];
            for (const [path, entry] of imageEntries) {
              const blob = await entry.async("blob");
              images.push({ name: baseName(path), blob });
            }
            const categories = cocoData.categories.map(c => ({ id: c.id, name: c.name }));
            const imagesById = Object.fromEntries(cocoData.images.map(im => [im.id, im]));
            const annotationsByImageName = {};
            cocoData.annotations.forEach(ann => {
              const im = imagesById[ann.image_id];
              if (!im) return;
              const key = baseName(im.file_name || "");
              if (!annotationsByImageName[key]) annotationsByImageName[key] = [];
              const w = im.width || 1, h = im.height || 1;
              let shape = null;
              if (Array.isArray(ann.segmentation) && ann.segmentation.length && Array.isArray(ann.segmentation[0])) {
                const flat = ann.segmentation[0];
                const points = [];
                for (let i = 0; i < flat.length - 1; i += 2) points.push({ x: Math.max(0, Math.min(100, (flat[i] / w) * 100)), y: Math.max(0, Math.min(100, (flat[i + 1] / h) * 100)) });
                if (points.length >= 3) shape = { type: "polygon", points };
              }
              if (!shape && Array.isArray(ann.bbox) && ann.bbox.length === 4) {
                const [x, y, bw, bh] = ann.bbox;
                shape = { type: "rectangle", x: Math.max(0, (x / w) * 100), y: Math.max(0, (y / h) * 100), w: Math.min(100, (bw / w) * 100), h: Math.min(100, (bh / h) * 100) };
              }
              if (shape) annotationsByImageName[key].push({ ...shape, categoryId: ann.category_id });
            });
            setAdvImportParsed({ kind: "coco", images, classes: categories, annotationsByImageName });
            setAdvImportMapping({});
            setAdvImportKind("coco");
            setAdvImportStep(categories.length ? "mapping" : "preview");
            return;
          }
        }

        // Try YOLO: classes file/yaml + matching .txt label files
        if ((classesEntry || yamlEntry) && labelTxtEntries.length) {
          let classNames = [];
          if (classesEntry) {
            const text = await classesEntry[1].async("string");
            classNames = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          } else if (yamlEntry) {
            const text = await yamlEntry[1].async("string");
            const inline = text.match(/names:\s*\[(.+?)\]/s);
            if (inline) classNames = inline[1].split(",").map(s => s.replace(/['"]/g, "").trim()).filter(Boolean);
            else {
              const lines = text.split(/\r?\n/);
              const idx = lines.findIndex(l => /^names:/.test(l.trim()));
              if (idx >= 0) {
                for (let i = idx + 1; i < lines.length; i++) {
                  const m = lines[i].match(/^\s*\d+:\s*(.+)$/) || lines[i].match(/^\s*-\s*(.+)$/);
                  if (!m) break;
                  classNames.push(m[1].replace(/['"]/g, "").trim());
                }
              }
            }
          }
          if (!classNames.length) { setAdvImportError("Found label files but couldn't read class names from classes.txt / data.yaml."); return; }

          const images = [];
          for (const [path, entry] of imageEntries) {
            const blob = await entry.async("blob");
            images.push({ name: baseName(path), blob, key: stripExt(baseName(path)) });
          }
          const annotationsByImageName = {};
          for (const [path, entry] of labelTxtEntries) {
            const key = stripExt(baseName(path));
            const match = images.find(im => im.key === key);
            if (!match) continue;
            const text = await entry.async("string");
            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            const shapes = lines.map(line => {
              const parts = line.split(/\s+/).map(Number);
              if (parts.length < 5) return null;
              const [classId, cx, cy, w, h] = parts;
              return { type: "rectangle", x: Math.max(0, (cx - w / 2) * 100), y: Math.max(0, (cy - h / 2) * 100), w: Math.min(100, w * 100), h: Math.min(100, h * 100), categoryId: classId };
            }).filter(Boolean);
            annotationsByImageName[match.name] = shapes;
          }
          setAdvImportParsed({ kind: "yolo", images, classes: classNames.map((n, i) => ({ id: i, name: n })), annotationsByImageName });
          setAdvImportMapping({});
          setAdvImportKind("yolo");
          setAdvImportStep("mapping");
          return;
        }

        // Plain zip of images, no annotations
        const images = [];
        for (const [path, entry] of imageEntries) {
          const blob = await entry.async("blob");
          images.push({ name: baseName(path), blob });
        }
        setAdvImportParsed({ kind: "zip-images", images, classes: [], annotationsByImageName: {} });
        setAdvImportKind("zip-images");
        setAdvImportStep("preview");
        return;
      }

      if (file.name.toLowerCase().endsWith(".json")) {
        const text = await file.text();
        let cocoData;
        try { cocoData = JSON.parse(text); } catch { cocoData = null; }
        if (!cocoData || !Array.isArray(cocoData.images) || !Array.isArray(cocoData.annotations) || !Array.isArray(cocoData.categories)) {
          setAdvImportError("This doesn't look like a COCO file (expected images/annotations/categories). For plain task lists, use the CSV / JSON import instead.");
          return;
        }
        const withUrls = cocoData.images.filter(im => im.coco_url || /^https?:\/\//i.test(im.file_name || ""));
        if (!withUrls.length) { setAdvImportError("This COCO file's images have no URLs — upload a zip containing both the images and the COCO json instead."); return; }
        const categories = cocoData.categories.map(c => ({ id: c.id, name: c.name }));
        const imagesById = Object.fromEntries(cocoData.images.map(im => [im.id, im]));
        const images = withUrls.map(im => ({ name: (im.file_name || `image-${im.id}`).split("/").pop(), url: im.coco_url || im.file_name }));
        const annotationsByImageName = {};
        cocoData.annotations.forEach(ann => {
          const im = imagesById[ann.image_id];
          if (!im) return;
          const key = (im.file_name || "").split("/").pop();
          if (!annotationsByImageName[key]) annotationsByImageName[key] = [];
          const w = im.width || 1, h = im.height || 1;
          if (Array.isArray(ann.bbox) && ann.bbox.length === 4) {
            const [x, y, bw, bh] = ann.bbox;
            annotationsByImageName[key].push({ type: "rectangle", x: Math.max(0, (x / w) * 100), y: Math.max(0, (y / h) * 100), w: Math.min(100, (bw / w) * 100), h: Math.min(100, (bh / h) * 100), categoryId: ann.category_id });
          }
        });
        setAdvImportParsed({ kind: "coco-urls", images, classes: categories, annotationsByImageName });
        setAdvImportMapping({});
        setAdvImportKind("coco");
        setAdvImportStep(categories.length ? "mapping" : "preview");
        return;
      }

      setAdvImportError("Unsupported file — upload a .zip (images, YOLO export, or COCO export) or a standalone COCO .json.");
    } catch (err) {
      setAdvImportError(`Couldn't read this file: ${err.message}`);
    }
  }

  function ensureLabelForClass(groupId, className) {
    const config = projectConfigs[groupId];
    const existing = config?.labels?.find(l => l.name.toLowerCase() === className.toLowerCase());
    if (existing) return existing.id;
    const newLabel = { id: `label-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: className, color: labelPalette[(config?.labels?.length || 0) % labelPalette.length], type: "Rectangle", parentId: null, groupId: null, shortcut: null, attributes: [] };
    setProjectConfigs(prev => ({ ...prev, [groupId]: { ...(prev[groupId] || makeDefaultProjectConfig({ id: groupId })), labels: [...(prev[groupId]?.labels || []), newLabel] } }));
    return newLabel.id;
  }

  async function runAdvancedImport() {
    if (!advImportParsed) return;
    const targetDatasetId = importTargetDataset || datasets.find(d => d.projectId === importTaskId)?.id || datasets[0]?.id;
    const targetDataset = datasets.find(d => d.id === targetDatasetId);
    if (!targetDataset) { setAdvImportError("Select a dataset to import into."); return; }
    const groupId = projects.find(p => p.id === targetDataset.projectId)?.groupId;

    const resolvedLabelIds = {};
    advImportParsed.classes.forEach(c => {
      const choice = advImportMapping[c.id];
      if (choice === "__new__" || !choice) resolvedLabelIds[c.id] = ensureLabelForClass(groupId, c.name);
      else resolvedLabelIds[c.id] = choice;
    });

    setAdvImportRunning(true);
    const existingNames = new Set(tasks.filter(t => t.datasetId === targetDatasetId).map(t => t.name));
    const toImport = advImportParsed.images.filter(im => !existingNames.has(im.name));
    setAdvImportProgress({ done: 0, total: toImport.length });

    const newTasks = [];
    const newAnnotationsByTask = {};
    for (let i = 0; i < toImport.length; i++) {
      const im = toImport[i];
      let imageUrl = im.url || null;
      if (!imageUrl && im.blob) {
        const path = `${targetDataset.projectId || "unassigned"}/${targetDatasetId}/${Date.now()}-${i}-${im.name}`;
        try {
          const compressed = await compressImageBlob(im.blob);
          const { error } = await supabase.storage.from("task-images").upload(path, compressed, { cacheControl: "3600", upsert: false });
          if (error) throw error;
          imageUrl = supabase.storage.from("task-images").getPublicUrl(path).data.publicUrl;
        } catch {
          imageUrl = await new Promise(resolve => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => resolve(null); r.readAsDataURL(im.blob); });
        }
      }
      if (!imageUrl) continue;
      const taskId = `import-${advImportKind}-${Date.now()}-${i}`;
      newTasks.push({ id: taskId, name: im.name, status: "Pending", image: imageUrl, source: `${advImportKind.toUpperCase()} import`, projectId: targetDataset.projectId, datasetId: targetDatasetId, createdAt: new Date().toISOString() });
      const shapes = advImportParsed.annotationsByImageName[im.name] || [];
      if (shapes.length) {
        newAnnotationsByTask[taskId] = shapes.map((s, si) => ({ id: `${taskId}-ann-${si}`, type: s.type, labelId: resolvedLabelIds[s.categoryId], x: s.x, y: s.y, w: s.w, h: s.h, points: s.points }));
      }
      setAdvImportProgress({ done: i + 1, total: toImport.length });
    }

    setTasks(prev => [...prev, ...newTasks]);
    setAnnotationsByTask(prev => ({ ...prev, ...newAnnotationsByTask }));
    if (session) {
      newTasks.forEach(t => {
        supabase.from("tasks").upsert({ id: t.id, project_id: t.projectId, dataset_id: t.datasetId, name: t.name, status: t.status, image: t.image, source: t.source, created_at: t.createdAt }).then(({error})=>{if(error) console.warn("[Import] task sync failed:", error.message);});
      });
      Object.entries(newAnnotationsByTask).forEach(([taskId, anns]) => {
        anns.forEach(a => {
          supabase.from("annotations").upsert({ id: a.id, task_id: taskId, label_id: a.labelId, type: a.type, geometry: { x: a.x, y: a.y, w: a.w, h: a.h, points: a.points } }).then(({error})=>{if(error) console.warn("[Import] annotation sync failed:", error.message);});
        });
      });
    }
    setImportHistory(prev => [{
      id: `imp-${Date.now()}`, fileName: advImportFileName, datasetId: targetDatasetId, datasetName: targetDataset.name,
      imported: newTasks.length, skipped: advImportParsed.images.length - newTasks.length, at: new Date().toISOString()
    }, ...prev].slice(0, 50));

    setAdvImportRunning(false);
    setAdvImportOpen(false);
    resetAdvImportWizard();
    const annCount = Object.values(newAnnotationsByTask).reduce((n, a) => n + a.length, 0);
    setDatasetToast(`${newTasks.length} image${newTasks.length !== 1 ? "s" : ""} imported${annCount ? ` with ${annCount} annotations` : ""}`);
    setTimeout(() => setDatasetToast(""), 3000);
  }

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const panStart = useRef(null);
  const editRef = useRef(null);

  const [notifications, setNotifications] = useState(() => readStorage("annotatepro_notifications_v1", []));
  const [notificationFilter, setNotificationFilter] = useState("All");
  const [notificationSearch, setNotificationSearch] = useState("");

  useEffect(() => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("annotatepro_qa_reviews_v1", JSON.stringify(qaReviews));
  }, [qaReviews]);

  useEffect(() => {
    localStorage.setItem("annotatepro_export_history_v1", JSON.stringify(exportHistory));
  }, [exportHistory]);

  useEffect(() => {
    localStorage.setItem(TEAM_KEY, JSON.stringify(teamMembers));
  }, [teamMembers]);

  useEffect(() => { localStorage.setItem(PROJECT_CONFIGS_KEY, JSON.stringify(projectConfigs)); }, [projectConfigs]);
  useEffect(() => { localStorage.setItem(TASK_PLANNER_KEY, JSON.stringify(plannerTargets)); }, [plannerTargets]);
  useEffect(() => { localStorage.setItem(WORKLOAD_KEY, JSON.stringify(workloadSettings)); }, [workloadSettings]);
  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings)); }, [appSettings]);
  useEffect(() => { localStorage.setItem("annotatepro_notifications_v1", JSON.stringify(notifications)); }, [notifications]);
  const OPERATIONS_KEY = "annotatepro_operations_v1";
  const [operationRead, setOperationRead] = useState(() => readStorage(OPERATIONS_KEY, {}));
  const [operationsSearch, setOperationsSearch] = useState("");
  const [operationsFilter, setOperationsFilter] = useState("All");
  const [operationsProject, setOperationsProject] = useState("All Projects");
  const [operationsShowUnread, setOperationsShowUnread] = useState(false);
  const AUDIT_KEY = "annotatepro_audit_trail_v1";
  const [auditEvents, setAuditEvents] = useState(() => readStorage(AUDIT_KEY, []));
  const [onlineUsers, setOnlineUsers] = useState([]);
  const presenceChannelRef = useRef(null);

  useEffect(() => {
    if (!session?.user) { setOnlineUsers([]); return; }

    const dataChannel = supabase
      .channel("live-data-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "DELETE") { setTasks(prev => prev.filter(t => t.id !== payload.old.id)); return; }
        const row = payload.new;
        const mapped = { id: row.id, projectId: row.project_id, datasetId: row.dataset_id, name: row.name, status: row.status, image: row.image, size: row.size, source: row.source, createdAt: row.created_at };
        // Only touch columns that actually came back from the cloud row — otherwise
        // leave any locally-set value alone instead of wiping it with undefined,
        // which matters for fields whose columns may not exist yet on every deployment.
        if (row.due_date !== undefined) mapped.dueDate = row.due_date;
        if (row.assignee_id !== undefined) mapped.assigneeId = row.assignee_id;
        if (row.reviewer_id !== undefined) mapped.reviewerId = row.reviewer_id;
        if (row.priority !== undefined) mapped.priority = row.priority;
        if (row.queue !== undefined) mapped.queue = row.queue;
        setTasks(prev => prev.some(t => t.id === mapped.id) ? prev.map(t => t.id === mapped.id ? { ...t, ...mapped } : t) : [...prev, mapped]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "project_groups" }, (payload) => {
        if (payload.eventType === "DELETE") { setProjectGroups(prev => prev.filter(g => g.id !== payload.old.id)); return; }
        const mapped = groupFromRow(payload.new);
        setProjectGroups(prev => prev.some(g => g.id === mapped.id) ? prev.map(g => g.id === mapped.id ? mapped : g) : [...prev, mapped]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, (payload) => {
        if (payload.eventType === "DELETE") { setProjects(prev => prev.filter(p => p.id !== payload.old.id)); return; }
        const mapped = projectFromRow(payload.new);
        setProjects(prev => prev.some(p => p.id === mapped.id) ? prev.map(p => p.id === mapped.id ? mapped : p) : [...prev, mapped]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "datasets" }, (payload) => {
        if (payload.eventType === "DELETE") { setDatasets(prev => prev.filter(d => d.id !== payload.old.id)); return; }
        const mapped = datasetFromRow(payload.new);
        setDatasets(prev => prev.some(d => d.id === mapped.id) ? prev.map(d => d.id === mapped.id ? mapped : d) : [...prev, mapped]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, (payload) => {
        if (payload.eventType === "DELETE") { setTeamMembers(prev => prev.filter(m => m.id !== payload.old.id)); return; }
        const mapped = memberFromRow(payload.new);
        setTeamMembers(prev => prev.some(m => m.id === mapped.id) ? prev.map(m => m.id === mapped.id ? mapped : m) : [...prev, mapped]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "qa_reviews" }, (payload) => {
        if (payload.eventType === "DELETE") return;
        const row = payload.new;
        setQaReviews(prev => ({ ...prev, [row.task_id]: { decision: row.decision, score: row.score, reviewer: row.reviewer, comment: row.comment, reason: row.reason, annotationCount: row.annotation_count, criteriaScores: row.criteria_scores || {}, errors: row.errors || [], history: row.history, reviewedAt: row.reviewed_at } }));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const row = payload.new;
        setNotifications(prev => prev.some(n => n.id === row.id) ? prev : [{ id: row.id, type: row.type, title: row.title, message: row.message, read: row.read, projectId: row.project_id, taskId: row.task_id, createdAt: row.created_at }, ...prev]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_events" }, (payload) => {
        const row = payload.new;
        setAuditEvents(prev => prev.some(e => e.id === row.id) ? prev : [{ id: row.id, action: row.action, actor: row.actor, actorRole: row.actor_role, projectId: row.project_id, taskId: row.task_id, details: row.details, timestamp: row.timestamp }, ...prev].slice(0, 2000));
      })
      .subscribe();

    const presenceChannel = supabase.channel("workspace-presence", { config: { presence: { key: session.user.id } } });
    presenceChannelRef.current = presenceChannel;
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setOnlineUsers(Object.values(state).map(entries => entries[0]).filter(Boolean));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: session.user.id, name: currentUserName, online_at: new Date().toISOString(), current_task_id: null });
        }
      });

    return () => {
      supabase.removeChannel(dataChannel);
      supabase.removeChannel(presenceChannel);
      presenceChannelRef.current = null;
    };
  }, [session?.user?.id]);

  const [auditSearch, setAuditSearch] = useState("");
  const [auditFilter, setAuditFilter] = useState("All Actions");
  const [auditProject, setAuditProject] = useState("All Projects");
  const [auditUser, setAuditUser] = useState("All Users");
  const [auditTask, setAuditTask] = useState("");
  const [auditDate, setAuditDate] = useState("All Time");
  const [auditSelectedTask, setAuditSelectedTask] = useState(null);
  useEffect(() => { localStorage.setItem(AUDIT_KEY, JSON.stringify(auditEvents)); }, [auditEvents]);
  useEffect(() => {
    if (auditEvents.length || (!tasks.length && !projects.length)) return;
    const now = Date.now();
    const seed = [];
    projects.forEach((p, i) => seed.push({ id:`audit-project-${p.id}`, action:"Project Created", actor:"Manjunath", actorRole:"Team Lead", projectId:p.id, taskId:null, details:`Project ${p.name} is available in the workspace.`, timestamp:new Date(now-(i+2)*86400000).toISOString() }));
    tasks.forEach((t, i) => {
      seed.push({ id:`audit-task-${t.id}`, action:"Task Created", actor:"System", actorRole:"System", projectId:t.projectId, taskId:t.id, details:`Task ${t.name} added to the dataset.`, timestamp:new Date(now-(i+1)*3600000).toISOString() });
      if (t.assigneeId) seed.push({ id:`audit-assign-${t.id}`, action:"Task Assigned", actor:"Manjunath", actorRole:"Team Lead", projectId:t.projectId, taskId:t.id, details:`Assigned to ${teamMembers.find(m=>m.id===t.assigneeId)?.name || t.assigneeId}.`, timestamp:new Date(now-(i+1)*1800000).toISOString() });
      if (t.status && t.status !== "Pending") seed.push({ id:`audit-status-${t.id}`, action:`Status → ${t.status}`, actor:"System", actorRole:"System", projectId:t.projectId, taskId:t.id, details:`Current task status is ${t.status}.`, timestamp:new Date(now-(i+1)*900000).toISOString() });
    });
    Object.entries(qaReviews).forEach(([taskId, r], i) => { const t=tasks.find(x=>x.id===taskId); if(t&&r) seed.push({id:`audit-qa-${taskId}`,action:`QA ${r.decision}`,actor:r.reviewer||"Manjunath",actorRole:"Reviewer",projectId:t.projectId,taskId,details:`QA score ${r.score ?? "—"}${r.comment ? ` · ${r.comment}` : ""}`,timestamp:r.reviewedAt||new Date(now-i*600000).toISOString()}); });
    setAuditEvents(seed.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)));
  }, []);

  useEffect(() => { localStorage.setItem(OPERATIONS_KEY, JSON.stringify(operationRead)); }, [operationRead]);
  useEffect(() => {
    setProjectConfigs(prev => {
      const next = { ...prev }; let changed = false;
      projectGroups.forEach(group => { if (!next[group.id]) { next[group.id] = makeDefaultProjectConfig(group); changed = true; } });
      return changed ? next : prev;
    });
  }, [projectGroups]);
  useEffect(() => {
    const project = projects.find(p => p.id === workspaceProject) || projects[0];
    const group = projectGroups.find(g => g.id === project?.groupId) || projectGroups[0];
    const config = (group && projectConfigs[group.id]) || (group ? makeDefaultProjectConfig(group) : null);
    setLabels(config?.labels || []);
    setSelectedLabel(config?.labels?.[0]?.id || null);
  }, [workspaceProject, projectConfigs, projects, projectGroups]);

  const flashWorkload = (msg) => { setWorkloadMessage(msg); window.setTimeout(() => setWorkloadMessage(""), 2400); };
  const workloadProjects = useMemo(() => ["All Projects", ...projects.map(p => p.id)], [projects]);
  const workloadRows = useMemo(() => {
    const members = teamMembers.filter(m => m.status === "Active" && (m.role === workloadRole || workloadRole === "All Roles"));
    return members.map(member => {
      const memberTasks = tasks.filter(t => t.assigneeId === member.id && (workloadFilter === "All Projects" || t.projectId === workloadFilter));
      const assigned = memberTasks.length;
      const inProgress = memberTasks.filter(t => t.status === "In Progress").length;
      const submitted = memberTasks.filter(t => ["Submitted", "QA Review"].includes(t.status)).length;
      const completed = memberTasks.filter(t => ["Approved", "Completed"].includes(t.status)).length;
      const capacity = Number(member.capacity) || workloadSettings.defaultDailyCapacity || 8;
      const load = capacity ? Math.round((assigned / capacity) * 100) : 0;
      return { member, memberTasks, assigned, inProgress, submitted, completed, capacity, load: Math.min(100, load) };
    });
  }, [teamMembers, tasks, workloadFilter, workloadRole, workloadSettings]);
  const workloadSummary = useMemo(() => {
    const active = workloadRows.length;
    const assigned = workloadRows.reduce((n, r) => n + r.assigned, 0);
    const capacity = workloadRows.reduce((n, r) => n + r.capacity, 0);
    const unassigned = tasks.filter(t => (workloadFilter === "All Projects" || t.projectId === workloadFilter) && !t.assigneeId).length;
    const overloaded = workloadRows.filter(r => r.assigned > r.capacity).length;
    return { active, assigned, capacity, unassigned, overloaded, utilization: capacity ? Math.round((assigned / capacity) * 100) : 0 };
  }, [workloadRows, tasks, workloadFilter]);
  function autoBalanceWorkload() {
    const pool = teamMembers.filter(m => m.status === "Active" && m.role === "Annotator" && (workloadFilter === "All Projects" || m.projects?.includes(workloadFilter)));
    if (!pool.length) { flashWorkload("No eligible annotators for this project"); return; }
    const candidates = tasks.filter(t => (workloadFilter === "All Projects" || t.projectId === workloadFilter) && !t.assigneeId && t.status === "Pending");
    if (!candidates.length) { flashWorkload("No unassigned pending tasks to balance"); return; }
    const counts = Object.fromEntries(pool.map(m => [m.id, tasks.filter(t => t.assigneeId === m.id).length]));
    const next = [...tasks];
    candidates.forEach(task => {
      const target = [...pool].sort((a,b) => (counts[a.id]||0) - (counts[b.id]||0))[0];
      if (!target) return;
      const idx = next.findIndex(t => t.id === task.id);
      if (idx >= 0) next[idx] = { ...next[idx], assigneeId: target.id, priority: next[idx].priority || "MEDIUM", queue: next[idx].queue || "Now", status: "In Progress" };
      syncUpdate("tasks", task.id, { status: "In Progress", assignee_id: target.id, priority: next[idx]?.priority || "MEDIUM", queue: next[idx]?.queue || "Now" });
      counts[target.id] = (counts[target.id] || 0) + 1;
    });
    setTasks(next);
    flashWorkload(`Balanced ${candidates.length} task${candidates.length === 1 ? "" : "s"} across ${pool.length} annotators`);
  }
  function updateMemberCapacity(memberId, value) {
    const capacity = Math.max(1, Number(value) || 1);
    setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, capacity } : m));
  }
  const currentTask = tasks[selectedTaskIndex] || tasks[0];
  const taskSettingsTask = projects.find(p => p.id === taskSettingsId) || null;
  const currentAnnotations = annotationsByTask[currentTask?.id] || [];
  const currentLabel = labels.find((l) => l.id === selectedLabel) || labels[0];

  useEffect(() => {
    if (!session?.user || !presenceChannelRef.current) return;
    presenceChannelRef.current.track({ user_id: session.user.id, name: currentUserName, online_at: new Date().toISOString(), current_task_id: activePage === "Annotation Workspace" ? (currentTask?.id || null) : null });
  }, [currentTask?.id, activePage, session?.user?.id]);

  const coEditors = onlineUsers.filter(u => u.user_id !== session?.user?.id && u.current_task_id && u.current_task_id === currentTask?.id);

  const dashboardStats = useMemo(() => {
    const active = projects.filter(p => p.status !== "Completed").length;
    const total = projects.reduce((s, p) => s + Number(p.totalImages || 0), 0);
    const completed = projects.reduce((s, p) => s + Number(p.completedImages || 0), 0);
    return { active, total, remaining: Math.max(0, total - completed), completed };
  }, [projects]);

  const filteredProjects = useMemo(() => projects.filter(p => {
    const q = projectSearch.toLowerCase();
    const matchesSearch = !q || `${p.name} ${p.client} ${p.team}`.toLowerCase().includes(q);
    const matchesStatus = projectStatusFilter === "All" || p.status === projectStatusFilter;
    return matchesSearch && matchesStatus;
  }), [projects, projectSearch, projectStatusFilter]);

  const filteredTasks = useMemo(() => tasks.filter(t => taskFilter === "All" || t.status === taskFilter), [tasks, taskFilter]);

  function navigate(page) {
    setActivePage(page);
    setSidebarOpen(false);
  }

  // ---- Build 38: Customizable Dashboard ----
  const activeDashboardLayout = dashboardLayouts[activeDashboardLayoutId] || dashboardLayouts.overview || Object.values(dashboardLayouts)[0];
  function toggleDashboardWidget(widgetId) {
    setDashboardLayouts(prev => {
      const layout = prev[activeDashboardLayoutId];
      if (!layout) return prev;
      const has = layout.widgets.includes(widgetId);
      const widgets = has ? layout.widgets.filter(w => w !== widgetId) : [...layout.widgets, widgetId];
      return { ...prev, [activeDashboardLayoutId]: { ...layout, widgets } };
    });
  }
  function moveDashboardWidget(widgetId, direction) {
    setDashboardLayouts(prev => {
      const layout = prev[activeDashboardLayoutId];
      if (!layout) return prev;
      const idx = layout.widgets.indexOf(widgetId);
      const next = idx + direction;
      if (idx < 0 || next < 0 || next >= layout.widgets.length) return prev;
      const widgets = [...layout.widgets];
      [widgets[idx], widgets[next]] = [widgets[next], widgets[idx]];
      return { ...prev, [activeDashboardLayoutId]: { ...layout, widgets } };
    });
  }
  function saveDashboardLayoutAs(name) {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    const id = `layout-${Date.now()}`;
    setDashboardLayouts(prev => ({ ...prev, [id]: { name: trimmed, widgets: [...(activeDashboardLayout?.widgets || [])], builtIn: false } }));
    setActiveDashboardLayoutId(id);
  }
  function deleteDashboardLayout(id) {
    if (Object.keys(dashboardLayouts).length <= 1) return;
    setDashboardLayouts(prev => { const next = { ...prev }; delete next[id]; return next; });
    if (activeDashboardLayoutId === id) setActiveDashboardLayoutId(Object.keys(dashboardLayouts).find(k => k !== id) || "overview");
  }
  function renameDashboardLayout(id, name) {
    setDashboardLayouts(prev => ({ ...prev, [id]: { ...prev[id], name } }));
  }

  // ---- Build 40: API & Integrations ----
  function generateApiToken(name, scopes) {
    const token = `apk_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    const entry = { id: `tok-${Date.now()}`, name: (name || "").trim() || "Unnamed token", token, scopes: scopes || ["read"], createdBy: currentUserName, createdAt: new Date().toISOString(), lastUsedAt: null, revoked: false };
    setApiTokens(prev => [entry, ...prev]);
    if (session) supabase.from("api_tokens").upsert({ id: entry.id, name: entry.name, token: entry.token, scopes: entry.scopes, created_by: entry.createdBy, created_at: entry.createdAt, revoked: false }).then(({ error }) => { if (error) console.warn("[Cloud] api_tokens upsert failed:", error.message); });
    logAudit("API Token Created", null, null, `Token "${entry.name}" generated by ${currentUserName}.`);
    return entry;
  }
  function revokeApiToken(id) {
    setApiTokens(prev => prev.map(t => t.id === id ? { ...t, revoked: true } : t));
    if (session) supabase.from("api_tokens").update({ revoked: true }).eq("id", id).then(({ error }) => { if (error) console.warn("[Cloud] token revoke failed:", error.message); });
    logAudit("API Token Revoked", null, null, "A token was revoked.");
  }
  function deleteApiToken(id) {
    setApiTokens(prev => prev.filter(t => t.id !== id));
    if (session) supabase.from("api_tokens").delete().eq("id", id).then(({ error }) => { if (error) console.warn("[Cloud] token delete failed:", error.message); });
  }

  function createWebhook(webhook) {
    const entry = { id: `wh-${Date.now()}`, name: (webhook.name || "").trim() || "Webhook", url: webhook.url, events: webhook.events || [], enabled: true, createdAt: new Date().toISOString(), lastTriggeredAt: null, lastStatus: null };
    setWebhooks(prev => [entry, ...prev]);
    if (session) supabase.from("webhooks").upsert({ id: entry.id, name: entry.name, url: entry.url, events: entry.events, enabled: true, created_at: entry.createdAt }).then(({ error }) => { if (error) console.warn("[Cloud] webhooks upsert failed:", error.message); });
    logAudit("Webhook Created", null, null, `Webhook "${entry.name}" registered for ${entry.events.join(", ") || "no events"}.`);
    return entry;
  }
  function updateWebhook(id, patch) {
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, ...patch } : w));
    if (session) supabase.from("webhooks").update({ name: patch.name, url: patch.url, events: patch.events, enabled: patch.enabled }).eq("id", id).then(({ error }) => { if (error) console.warn("[Cloud] webhook update failed:", error.message); });
  }
  function deleteWebhook(id) {
    setWebhooks(prev => prev.filter(w => w.id !== id));
    if (session) supabase.from("webhooks").delete().eq("id", id).then(({ error }) => { if (error) console.warn("[Cloud] webhook delete failed:", error.message); });
  }
  async function sendWebhookPayload(webhook, eventType, payload) {
    try {
      const res = await fetch(webhook.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: eventType, timestamp: new Date().toISOString(), workspace: appSettings?.workspaceName || "AnnotatePro", data: payload }) });
      setWebhooks(prev => prev.map(w => w.id === webhook.id ? { ...w, lastTriggeredAt: new Date().toISOString(), lastStatus: res.ok ? "Success" : `Error ${res.status}` } : w));
    } catch (err) {
      setWebhooks(prev => prev.map(w => w.id === webhook.id ? { ...w, lastTriggeredAt: new Date().toISOString(), lastStatus: `Failed: ${err.message}` } : w));
    }
  }
  const webhookRateLimitRef = useRef(new Map());
  function fireWebhooks(eventType, payload) {
    const now = Date.now();
    webhooks.filter(w => w.enabled && (w.events || []).includes(eventType)).forEach(w => {
      const lastFired = webhookRateLimitRef.current.get(w.id) || 0;
      if (now - lastFired < 2000) { // max ~1 call per webhook per 2s — protects the receiving endpoint from bulk-action bursts
        logAudit("Webhook Rate-Limited", null, null, `"${w.name}" skipped a rapid duplicate trigger for ${eventType}.`, "System", "Automation");
        return;
      }
      webhookRateLimitRef.current.set(w.id, now);
      sendWebhookPayload(w, eventType, payload);
    });
  }
  function testWebhook(id) {
    const wh = webhooks.find(w => w.id === id);
    if (wh) sendWebhookPayload(wh, "test", { message: "Test payload from AnnotatePro", sentBy: currentUserName });
  }

  function importMlPredictions(groupId, targetProjectId, predictions) {
    let matchedTasks = 0, importedAnnotations = 0, unmatched = [];
    predictions.forEach(entry => {
      const task = tasks.find(t => t.projectId === targetProjectId && t.name === entry.fileName);
      if (!task) { unmatched.push(entry.fileName); return; }
      matchedTasks++;
      const shapes = (entry.predictions || []).map((p, i) => {
        const labelId = ensureLabelForClass(groupId, p.label);
        importedAnnotations++;
        return { id: `${task.id}-model-${Date.now()}-${i}`, type: "rectangle", labelId, x: p.bbox[0], y: p.bbox[1], w: p.bbox[2], h: p.bbox[3], source: "model", confidence: p.confidence ?? null, reviewState: "pending" };
      });
      if (shapes.length) setAnnotationsByTask(prev => ({ ...prev, [task.id]: [...(prev[task.id] || []), ...shapes] }));
    });
    logAudit("ML Predictions Imported", null, targetProjectId, `${importedAnnotations} prediction${importedAnnotations===1?"":"s"} imported across ${matchedTasks} task${matchedTasks===1?"":"s"}${unmatched.length ? ` · ${unmatched.length} file${unmatched.length===1?"":"s"} unmatched` : ""}.`);
    return { matchedTasks, importedAnnotations, unmatched };
  }

  function exportProjectJson(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const payload = {
      exportedAt: new Date().toISOString(),
      project,
      tasks: projectTasks.map(t => ({ ...t, annotations: annotationsByTask[t.id] || [], qaReview: qaReviews[t.id] || null }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${project.name.toLowerCase().replace(/\s+/g,"-")}-export.json`; a.click();
    logAudit("Project JSON Exported", null, projectId, `Full data export for ${project.name}.`);
  }

  // ---- Build 41: AI-Assisted Annotation ----
  function acceptPrediction(taskId, annotationId) {
    setAnnotationsByTask(prev => ({ ...prev, [taskId]: (prev[taskId] || []).map(a => a.id === annotationId ? { ...a, reviewState: "accepted" } : a) }));
  }
  function rejectPrediction(taskId, annotationId) {
    setAnnotationsByTask(prev => ({ ...prev, [taskId]: (prev[taskId] || []).filter(a => a.id !== annotationId) }));
  }
  function acceptAllPredictions(taskId) {
    const pendingCount = (annotationsByTask[taskId] || []).filter(a => a.reviewState === "pending").length;
    setAnnotationsByTask(prev => ({ ...prev, [taskId]: (prev[taskId] || []).map(a => a.reviewState === "pending" ? { ...a, reviewState: "accepted" } : a) }));
    if (pendingCount) logAudit("AI Predictions Accepted", taskId, tasks.find(t => t.id === taskId)?.projectId, `${pendingCount} pre-labeled region${pendingCount===1?"":"s"} accepted.`);
  }
  function rejectAllPredictions(taskId) {
    const pendingCount = (annotationsByTask[taskId] || []).filter(a => a.reviewState === "pending").length;
    setAnnotationsByTask(prev => ({ ...prev, [taskId]: (prev[taskId] || []).filter(a => a.reviewState !== "pending") }));
    if (pendingCount) logAudit("AI Predictions Rejected", taskId, tasks.find(t => t.id === taskId)?.projectId, `${pendingCount} pre-labeled region${pendingCount===1?"":"s"} rejected.`);
  }

  // Suggested labels: a frequency-based heuristic (not a real model) — the labels
  // most used so far in this task's dataset, surfaced first in the label picker.
  function suggestedLabelIds(datasetId, labels) {
    const counts = {};
    tasks.filter(t => t.datasetId === datasetId).forEach(t => (annotationsByTask[t.id] || []).forEach(a => { counts[a.labelId] = (counts[a.labelId] || 0) + 1; }));
    return [...labels].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0)).filter(l => counts[l.id]).slice(0, 3).map(l => l.id);
  }

  // ---- Build 42: Security & Production Hardening ----
  function exportWorkspaceBackup() {
    const payload = {
      exportedAt: new Date().toISOString(), workspaceName: appSettings?.workspaceName || "AnnotatePro", version: "backup-v1",
      projectGroups, projects, datasets, tasks, teamMembers, projectConfigs, annotationsByTask, qaReviews,
      notifications, auditEvents: auditEvents.slice(0, 500), appSettings
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `annotatepro-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
    logAudit("Workspace Backup Exported", null, null, `Full backup: ${projects.length} projects, ${tasks.length} tasks.`, currentUserName, "Admin");
  }
  function restoreWorkspaceBackup(file, onDone) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || data.version !== "backup-v1") throw new Error("This file isn't a recognized AnnotatePro backup.");
        if (!(await confirmAction(`Restore this backup? It will replace ${projects.length} current projects and ${tasks.length} tasks with ${data.projects?.length || 0} projects and ${data.tasks?.length || 0} tasks from the backup (dated ${new Date(data.exportedAt).toLocaleString()}). This can't be undone locally — run Migration afterward to push it to the cloud.`, { title: "Restore backup", confirmLabel: "Restore backup" }))) { onDone?.({ ok: false, message: "Cancelled" }); return; }
        if (data.projectGroups) setProjectGroups(data.projectGroups);
        if (data.projects) setProjects(data.projects);
        if (data.datasets) setDatasets(data.datasets);
        if (data.tasks) setTasks(data.tasks);
        if (data.teamMembers) setTeamMembers(data.teamMembers);
        if (data.projectConfigs) setProjectConfigs(data.projectConfigs);
        if (data.annotationsByTask) setAnnotationsByTask(data.annotationsByTask);
        if (data.qaReviews) setQaReviews(data.qaReviews);
        if (data.notifications) setNotifications(data.notifications);
        logAudit("Workspace Backup Restored", null, null, `Restored backup from ${new Date(data.exportedAt).toLocaleString()}.`, currentUserName, "Admin");
        onDone?.({ ok: true, message: `Restored ${data.projects?.length || 0} projects and ${data.tasks?.length || 0} tasks. Run Migration to push this to the cloud.` });
      } catch (err) {
        onDone?.({ ok: false, message: `Restore failed: ${err.message}` });
      }
    };
    reader.readAsText(file);
  }

  // Error log: captured to localStorage even if the app crashes (see logClientError
  // near the top of the file); this just surfaces it in the UI and, best-effort,
  // syncs unsynced entries to the cloud once a session and table exist.
  const [errorLogEntries, setErrorLogEntries] = useState(() => readStorage(ERROR_LOG_KEY, []));
  function refreshErrorLog() { setErrorLogEntries(readStorage(ERROR_LOG_KEY, [])); }
  function clearErrorLog() { localStorage.setItem(ERROR_LOG_KEY, "[]"); setErrorLogEntries([]); }
  useEffect(() => {
    if (!session) return;
    const unsynced = errorLogEntries.filter(e => !e.synced);
    if (!unsynced.length) return;
    Promise.all(unsynced.map(e => supabase.from("error_logs").insert({ id: e.id, message: e.message, stack: e.stack, context: e.context, occurred_at: e.timestamp }))).then(results => {
      const anySucceeded = results.some(r => !r.error);
      if (anySucceeded) {
        const next = errorLogEntries.map(e => unsynced.some(u => u.id === e.id) ? { ...e, synced: true } : e);
        localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(next));
        setErrorLogEntries(next);
      }
    }).catch(() => {});
  }, [session, errorLogEntries]);

  // ---- Build 43: Testing & Regression — live data-integrity health check ----
  function runHealthCheck() {
    const results = [];
    const push = (area, label, status, detail) => results.push({ id: `${area}-${label}`.toLowerCase().replace(/\s+/g,"-"), area, label, status, detail });

    // Projects
    const groupIds = new Set(projectGroups.map(g => g.id));
    const badProjects = projects.filter(p => p.groupId && !groupIds.has(p.groupId));
    push("Projects", "Project → group references", badProjects.length ? "fail" : "pass", badProjects.length ? `${badProjects.length} project(s) reference a group that no longer exists.` : `All ${projects.length} projects reference a valid group.`);
    const dupProjectIds = projects.length - new Set(projects.map(p=>p.id)).size;
    push("Projects", "Duplicate project IDs", dupProjectIds ? "fail" : "pass", dupProjectIds ? `${dupProjectIds} duplicate ID(s) found.` : "No duplicate project IDs.");

    // Datasets
    const projectIds = new Set(projects.map(p => p.id));
    const badDatasets = datasets.filter(d => d.projectId && !projectIds.has(d.projectId));
    push("Datasets", "Dataset → project references", badDatasets.length ? "fail" : "pass", badDatasets.length ? `${badDatasets.length} dataset(s) reference a missing project.` : `All ${datasets.length} datasets reference a valid project.`);

    // Tasks
    const datasetIds = new Set(datasets.map(d => d.id));
    const badTaskProject = tasks.filter(t => t.projectId && !projectIds.has(t.projectId));
    push("Tasks", "Task → project references", badTaskProject.length ? "fail" : "pass", badTaskProject.length ? `${badTaskProject.length} task(s) reference a missing project.` : `All ${tasks.length} tasks reference a valid project.`);
    const badTaskDataset = tasks.filter(t => t.datasetId && !datasetIds.has(t.datasetId));
    push("Tasks", "Task → dataset references", badTaskDataset.length ? "warn" : "pass", badTaskDataset.length ? `${badTaskDataset.length} task(s) reference a missing dataset.` : "All task-dataset references resolve.");
    const dupTaskIds = tasks.length - new Set(tasks.map(t=>t.id)).size;
    push("Tasks", "Duplicate task IDs", dupTaskIds ? "fail" : "pass", dupTaskIds ? `${dupTaskIds} duplicate ID(s) found.` : "No duplicate task IDs.");

    // Annotation
    const taskIdSet = new Set(tasks.map(t => t.id));
    const orphanAnnotationKeys = Object.keys(annotationsByTask).filter(id => !taskIdSet.has(id) && (annotationsByTask[id]||[]).length);
    push("Annotation", "Orphaned annotation sets", orphanAnnotationKeys.length ? "warn" : "pass", orphanAnnotationKeys.length ? `${orphanAnnotationKeys.length} task ID(s) with saved annotations no longer have a matching task.` : "No orphaned annotation data.");
    let badLabelRefs = 0;
    Object.entries(annotationsByTask).forEach(([tid, list]) => {
      const t = tasks.find(x => x.id === tid);
      if (!t) return;
      const config = getGroupConfig(getGroupIdForTask(t));
      const labelIds = new Set((config.labels||[]).map(l=>l.id));
      (list||[]).forEach(a => { if (!labelIds.has(a.labelId)) badLabelRefs++; });
    });
    push("Annotation", "Annotation → label references", badLabelRefs ? "warn" : "pass", badLabelRefs ? `${badLabelRefs} annotation(s) reference a label no longer in that project's schema.` : "All annotations reference a valid label.");

    // QA
    const orphanReviews = Object.keys(qaReviews).filter(id => !taskIdSet.has(id));
    push("QA", "Orphaned QA reviews", orphanReviews.length ? "warn" : "pass", orphanReviews.length ? `${orphanReviews.length} review(s) reference a task that no longer exists.` : "No orphaned QA reviews.");

    // Team
    const emailCounts = {};
    teamMembers.forEach(m => { if (m.email) emailCounts[m.email] = (emailCounts[m.email]||0)+1; });
    const dupEmails = Object.values(emailCounts).filter(c=>c>1).length;
    push("Team", "Duplicate member emails", dupEmails ? "warn" : "pass", dupEmails ? `${dupEmails} email address(es) used by more than one member.` : "No duplicate member emails.");
    const memberIdSet = new Set(teamMembers.map(m=>m.id));
    const badAssignee = tasks.filter(t => t.assigneeId && !memberIdSet.has(t.assigneeId));
    const badReviewer = tasks.filter(t => t.reviewerId && !memberIdSet.has(t.reviewerId));
    push("Team", "Task → assignee/reviewer references", (badAssignee.length+badReviewer.length) ? "warn" : "pass", (badAssignee.length+badReviewer.length) ? `${badAssignee.length} assignee + ${badReviewer.length} reviewer reference(s) point to a removed member.` : "All assignee/reviewer references resolve.");

    // Workload
    const zeroCapacity = teamMembers.filter(m => m.status === "Active" && (Number(m.capacity)||0) <= 0);
    push("Workload", "Active members with zero capacity", zeroCapacity.length ? "warn" : "pass", zeroCapacity.length ? `${zeroCapacity.length} active member(s) have 0 task capacity, so they'll never receive auto-assignments.` : "All active members have usable capacity.");

    // Notifications / Audit — informational size checks
    push("Notifications", "Notification volume", notifications.length > 500 ? "warn" : "pass", `${notifications.length} notifications stored.`);
    push("Audit", "Audit log size", auditEvents.length >= 2000 ? "warn" : "pass", `${auditEvents.length} / 2000 audit events (oldest entries drop off past the cap).`);

    // Authentication / Permissions
    push("Authentication", "Session present", session ? "pass" : "fail", session ? `Signed in as ${currentUserEmail}.` : "No active session.");
    push("Permissions", "Recognized role", ["Admin","Team Lead","Reviewer","Annotator"].includes(currentUserRole) ? "pass" : "warn", `Current role: ${currentUserRole || "unset"}.`);

    // Cloud storage
    const base64Count = tasks.filter(t => t.image && t.image.startsWith("data:")).length;
    push("Cloud Storage", "Images not yet migrated", base64Count ? "warn" : "pass", base64Count ? `${base64Count} task image(s) are still stored inline (base64) instead of Supabase Storage.` : "All task images are in Supabase Storage.");

    // Performance & Scalability (Build 44)
    push("Performance", "Task volume", tasks.length > 5000 ? "warn" : "pass", `${tasks.length.toLocaleString()} tasks in memory. Paginated views (Import, Audit Trail, Notifications) stay fast at any size; unpaginated dashboards and filters may slow down past ~5,000.`);
    push("Performance", "Audit log volume", auditEvents.length >= 1800 ? "warn" : "pass", `${auditEvents.length.toLocaleString()} / 2,000 audit events. Nearing the cap means older history is about to start dropping off.`);
    const largeAnnotationTasks = Object.values(annotationsByTask).filter(l => (l||[]).length > 150).length;
    push("Performance", "Very dense annotation sets", largeAnnotationTasks ? "warn" : "pass", largeAnnotationTasks ? `${largeAnnotationTasks} task(s) have 150+ regions — canvas panning/dragging may feel slower on those specific images.` : "No unusually dense annotation sets.");

    logAudit("Health Check Run", null, null, `${results.filter(r=>r.status==="fail").length} failing, ${results.filter(r=>r.status==="warn").length} warnings, ${results.filter(r=>r.status==="pass").length} passing.`, currentUserName, "Admin");
    return results;
  }

  // ---- Build 39: Global Search & Command Center ----
  function labelNameFor(labelId) {
    for (const cfg of Object.values(projectConfigs)) {
      const l = (cfg.labels || []).find(x => x.id === labelId);
      if (l) return l.name;
    }
    return labelId;
  }

  function getSearchResults(query) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return null;
    const match = (s) => (s || "").toLowerCase().includes(q);
    const projectResults = projectGroups.filter(g => match(g.name) || match(g.description)).slice(0, 6)
      .map(g => ({ type: "project", id: g.id, title: g.name, subtitle: `Project · ${g.status}`, icon: FolderKanban }));
    const taskResults = tasks.filter(t => match(t.name)).slice(0, 6)
      .map(t => ({ type: "task", id: t.id, projectId: t.projectId, title: t.name, subtitle: `Task · ${t.status}`, icon: ImageIcon }));
    const userResults = teamMembers.filter(m => match(m.name) || match(m.email)).slice(0, 6)
      .map(m => ({ type: "user", id: m.id, title: m.name, subtitle: `${m.role} · ${m.email}`, icon: Users }));
    const datasetResults = datasets.filter(d => match(d.name)).slice(0, 6)
      .map(d => ({ type: "dataset", id: d.id, title: d.name, subtitle: `Dataset · v${d.version || 1}`, icon: Database }));
    const reviewResults = Object.entries(qaReviews).filter(([taskId, r]) => { const t = tasks.find(x => x.id === taskId); return match(t?.name) || match(r.reviewer) || match(r.decision); }).slice(0, 6)
      .map(([taskId, r]) => { const t = tasks.find(x => x.id === taskId); return { type: "review", id: taskId, projectId: t?.projectId, title: `Review: ${t?.name || taskId}`, subtitle: `${r.decision || "Pending"} · ${r.reviewer || "Unassigned"}`, icon: ClipboardCheck }; });
    const annotationResults = [];
    outer: for (const [taskId, list] of Object.entries(annotationsByTask)) {
      for (const a of (list || [])) {
        const name = labelNameFor(a.labelId);
        if (match(name)) {
          const t = tasks.find(x => x.id === taskId);
          annotationResults.push({ type: "annotation", id: `${taskId}-${a.id}`, taskId, projectId: t?.projectId, title: `${name} — in ${t?.name || taskId}`, subtitle: "Annotation", icon: Brush });
          if (annotationResults.length >= 6) break outer;
        }
      }
    }
    const auditResults = auditEvents.filter(e => match(e.action) || match(e.details) || match(e.actor)).slice(0, 6)
      .map(e => ({ type: "audit", id: e.id, title: e.action, subtitle: `${e.actor} · ${timeAgo(e.timestamp)}`, icon: FileText }));
    const notificationResults = notifications.filter(n => match(n.title) || match(n.message)).slice(0, 6)
      .map(n => ({ type: "notification", id: n.id, title: n.title, subtitle: n.message, icon: Bell }));
    return { project: projectResults, task: taskResults, user: userResults, dataset: datasetResults, review: reviewResults, annotation: annotationResults, audit: auditResults, notification: notificationResults };
  }

  const quickActions = [
    { type: "action", id: "create-project", title: "Create Project", subtitle: "Quick action", icon: Plus, run: () => { navigate("Projects"); openCreateGroup(); } },
    { type: "action", id: "start-annotating", title: "Start Annotating", subtitle: "Quick action", icon: Play, run: () => openWorkstation(null, "Annotation") },
    { type: "action", id: "pending-reviews", title: "Pending Reviews", subtitle: "Quick action", icon: ClipboardCheck, run: () => openWorkstation(null, "Review") },
    { type: "action", id: "task-planner", title: "Task Planner", subtitle: "Quick action", icon: Target, run: () => navigate("Task Planner") },
    { type: "action", id: "deadlines", title: "Deadlines", subtitle: "Quick action", icon: Calendar, run: () => navigate("Deadlines") },
    { type: "action", id: "qa-quality", title: "QA & Quality", subtitle: "Quick action", icon: ShieldCheck, run: () => navigate("QA & Quality") },
    { type: "action", id: "reports", title: "Reports", subtitle: "Quick action", icon: TrendingUp, run: () => navigate("Reports") },
    { type: "action", id: "analytics", title: "Analytics", subtitle: "Quick action", icon: BarChart3, run: () => navigate("Analytics") },
    { type: "action", id: "workload", title: "Workload", subtitle: "Quick action", icon: Layers, run: () => navigate("Workload") },
    { type: "action", id: "team", title: "Team", subtitle: "Quick action", icon: Users, run: () => navigate("Team") },
    { type: "action", id: "audit-trail", title: "Audit Trail", subtitle: "Quick action", icon: FileText, run: () => navigate("Audit Trail") },
    { type: "action", id: "settings", title: "Settings", subtitle: "Quick action", icon: Settings, run: () => navigate("Settings") }
  ];

  function recordRecentItem(item) {
    if (item.type === "action") return;
    const entry = { type: item.type, id: item.id, title: item.title, subtitle: item.subtitle, projectId: item.projectId, taskId: item.taskId, visitedAt: new Date().toISOString() };
    setRecentItems(prev => [entry, ...prev.filter(i => !(i.type === item.type && i.id === item.id))].slice(0, 12));
  }
  function isFavorite(item) { return favoriteItems.some(f => f.type === item.type && f.id === item.id); }
  function toggleFavorite(item) {
    setFavoriteItems(prev => isFavorite(item) ? prev.filter(f => !(f.type === item.type && f.id === item.id)) : [{ type: item.type, id: item.id, title: item.title, subtitle: item.subtitle, projectId: item.projectId, taskId: item.taskId }, ...prev].slice(0, 30));
  }
  function openSearchResult(item) {
    if (item.type === "action") { item.run(); setCommandOpen(false); return; }
    recordRecentItem(item);
    setCommandOpen(false);
    switch (item.type) {
      case "project": navigate("Projects"); break;
      case "task": openWorkstation(item.projectId, "Annotation", item.id); break;
      case "annotation": openWorkstation(item.projectId, "Annotation", item.taskId); break;
      case "user": navigate("Team"); break;
      case "dataset": navigate("Projects"); break;
      case "review": { const t = tasks.find(x => x.id === item.id); openWorkstation(t?.projectId, "Review", item.id); break; }
      case "audit": navigate("Audit Trail"); break;
      case "notification": navigate("Notifications"); break;
      default: break;
    }
  }

  function openCreateProject(groupId) {
    setEditingProjectId(null);
    setProjectForm(groupId ? { ...emptyProject, groupId } : emptyProject);
    setProjectModalOpen(true);
  }

  function openEditProject(p) {
    setEditingProjectId(p.id);
    setProjectForm({ ...emptyProject, ...p });
    setProjectModalOpen(true);
  }

  function saveProject(e) {
    e.preventDefault();
    if (!projectForm.name.trim() || !projectForm.client.trim()) return;
    const total = Math.max(1, Number(projectForm.totalImages) || 1);
    const completed = Math.min(total, Math.max(0, Number(projectForm.completedImages) || 0));
    const next = { ...projectForm, totalImages: total, completedImages: completed };
    if (editingProjectId) {
      const updated = { ...(projects.find(p => p.id === editingProjectId) || {}), ...next, id: editingProjectId };
      setProjects(prev => prev.map(p => p.id === editingProjectId ? { ...p, ...next } : p));
      syncUpsert("projects", projectToRow(updated));
    } else {
      const created = { ...next, id: `p-${Date.now()}` };
      setProjects(prev => [...prev, created]);
      syncUpsert("projects", projectToRow(created));
    }
    setProjectModalOpen(false);
  }


  async function deleteProject(id) {
    const orphanedTasks = tasks.filter(t => t.projectId === id);
    const confirmMsg = orphanedTasks.length
      ? `Delete this project? Its ${orphanedTasks.length} task${orphanedTasks.length===1?"":"s"} will be deleted too — this can't be undone.`
      : "Delete this project?";
    if (!(await confirmAction(confirmMsg, { title: "Delete project", confirmLabel: "Delete project" }))) return;
    const removedIdSet = new Set(orphanedTasks.map(t => t.id));
    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.filter(t => t.projectId !== id));
    setAnnotationsByTask(prev => Object.fromEntries(Object.entries(prev).filter(([tid]) => !removedIdSet.has(tid))));
    setQaReviews(prev => Object.fromEntries(Object.entries(prev).filter(([tid]) => !removedIdSet.has(tid))));
    syncDelete("projects", id);
    if (session) orphanedTasks.forEach(t => syncDelete("tasks", t.id));
    if (workspaceProject === id) setWorkspaceProject(projects.find(p => p.id !== id)?.id || "");
  }

  function pushHistory(nextAnnotations) {
    setHistory(prev => [...prev, currentAnnotations]);
    setFuture([]);
    setAnnotationsByTask(prev => ({ ...prev, [currentTask.id]: nextAnnotations }));
  }

  function updateCurrentAnnotations(next) {
    setAnnotationsByTask(prev => ({ ...prev, [currentTask.id]: next }));
  }

  function undo() {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setFuture(prev => [currentAnnotations, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    updateCurrentAnnotations(previous);
    setSelectedAnnotationId(null);
  }

  function redo() {
    if (!future.length) return;
    const next = future[0];
    setHistory(prev => [...prev, currentAnnotations]);
    setFuture(prev => prev.slice(1));
    updateCurrentAnnotations(next);
  }

  function selectAnnotation(id, shiftKey = false) {
    if (shiftKey) {
      if (id === selectedAnnotationId) {
        const [next, ...rest] = additionalSelectedIds;
        setSelectedAnnotationId(next || null);
        setAdditionalSelectedIds(rest);
      } else if (additionalSelectedIds.includes(id)) {
        setAdditionalSelectedIds(prev => prev.filter(x => x !== id));
      } else if (selectedAnnotationId) {
        setAdditionalSelectedIds(prev => [...prev, id]);
      } else {
        setSelectedAnnotationId(id);
      }
    } else {
      setSelectedAnnotationId(id);
      setAdditionalSelectedIds([]);
    }
    setTool("select");
  }

  function annotationBounds(a) {
    if (a.type === "rectangle") return { minX: a.x, minY: a.y, maxX: a.x + a.w, maxY: a.y + a.h };
    if (a.points?.length) {
      const xs = a.points.map(p => p.x), ys = a.points.map(p => p.y);
      return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
    }
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  function copySelection() {
    if (!selectedIds.length) return;
    clipboardRef.current = selectedIds.map(id => currentAnnotations.find(a => a.id === id)).filter(Boolean).map(a => JSON.parse(JSON.stringify(a)));
    setWorkspaceMessage(`Copied ${clipboardRef.current.length} object${clipboardRef.current.length > 1 ? "s" : ""}`);
    setTimeout(() => setWorkspaceMessage(""), 1600);
  }

  function pasteClipboard() {
    if (!clipboardRef.current.length) return;
    const copies = clipboardRef.current.map((a, i) => ({
      ...a,
      id: `${a.type}-${Date.now()}-${i}`,
      x: a.x == null ? a.x : Math.min(94, a.x + 3),
      y: a.y == null ? a.y : Math.min(94, a.y + 3),
      points: a.points?.map(p => ({ x: Math.min(96, p.x + 3), y: Math.min(96, p.y + 3) }))
    }));
    pushHistory([...currentAnnotations, ...copies]);
    setSelectedAnnotationId(copies[0]?.id || null);
    setAdditionalSelectedIds(copies.slice(1).map(c => c.id));
  }

  function eraseAt(point) {
    if (!currentTask) return;
    const ERASE_RADIUS = 3;
    setAnnotationsByTask(prev => {
      const list = prev[currentTask.id] || [];
      const next = list
        .map(a => {
          if (a.type !== "brush" || a.locked) return a;
          const points = a.points.filter(p => distance(p, point) > ERASE_RADIUS);
          return points.length >= 2 ? { ...a, points } : null;
        })
        .filter(Boolean);
      return { ...prev, [currentTask.id]: next };
    });
  }

  function selectAll() {
    if (!currentAnnotations.length) return;
    setSelectedAnnotationId(currentAnnotations[0].id);
    setAdditionalSelectedIds(currentAnnotations.slice(1).map(a => a.id));
  }

  function deleteSelected() {
    if (!selectedIds.length) return;
    const targets = selectedIds.map(id => currentAnnotations.find(a => a.id === id)).filter(Boolean);
    const lockedCount = targets.filter(a => a.locked).length;
    if (lockedCount === targets.length) {
      setWorkspaceMessage("These objects are locked — unlock them first");
      setTimeout(() => setWorkspaceMessage(""), 2000);
      return;
    }
    const removeIds = new Set(targets.filter(a => !a.locked).map(a => a.id));
    const next = currentAnnotations.filter(a => !removeIds.has(a.id));
    pushHistory(next);
    setSelectedAnnotationId(null);
    setAdditionalSelectedIds([]);
    if (lockedCount) { setWorkspaceMessage(`${lockedCount} locked object${lockedCount>1?"s were":" was"} skipped`); setTimeout(() => setWorkspaceMessage(""), 2000); }
  }

  function duplicateSelected() {
    if (!selectedIds.length) return;
    const items = selectedIds.map(id => currentAnnotations.find(a => a.id === id)).filter(Boolean);
    if (!items.length) return;
    const copies = items.map((item, i) => ({
      ...item,
      id: `${item.type}-${Date.now()}-${i}`,
      x: item.x == null ? item.x : Math.min(94, item.x + 3),
      y: item.y == null ? item.y : Math.min(94, item.y + 3),
      points: item.points?.map(p => ({ x: Math.min(96, p.x + 3), y: Math.min(96, p.y + 3) }))
    }));
    pushHistory([...currentAnnotations, ...copies]);
    setSelectedAnnotationId(copies[0]?.id || null);
    setAdditionalSelectedIds(copies.slice(1).map(c => c.id));
  }

  function updateAnnotation(id, patch) {
    updateCurrentAnnotations(currentAnnotations.map(a => a.id === id ? { ...a, ...patch } : a));
  }

  function toggleAnnotationLock(id) {
    const item = currentAnnotations.find(a => a.id === id);
    if (!item) return;
    pushHistory(currentAnnotations.map(a => a.id === id ? { ...a, locked: !a.locked } : a));
  }

  function toggleAnnotationVisible(id) {
    const item = currentAnnotations.find(a => a.id === id);
    if (!item) return;
    pushHistory(currentAnnotations.map(a => a.id === id ? { ...a, hidden: !a.hidden } : a));
  }

  function moveAnnotationOrder(id, delta) {
    const index = currentAnnotations.findIndex(a => a.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= currentAnnotations.length) return;
    const next = [...currentAnnotations];
    [next[index], next[target]] = [next[target], next[index]];
    pushHistory(next);
  }

  function insertVertex(id, afterIndex) {
    const item = currentAnnotations.find(a => a.id === id);
    if (!item?.points?.length) return;
    const points = item.points;
    const a = points[afterIndex];
    const b = points[(afterIndex + 1) % points.length];
    if (!b) return;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const nextPoints = [...points.slice(0, afterIndex + 1), mid, ...points.slice(afterIndex + 1)];
    pushHistory(currentAnnotations.map(x => x.id === id ? { ...x, points: nextPoints } : x));
  }

  function deleteVertex(id, vertexIndex) {
    const item = currentAnnotations.find(a => a.id === id);
    if (!item?.points?.length) return;
    const minPoints = item.type === "polygon" ? 3 : 2;
    if (item.points.length <= minPoints) {
      setWorkspaceMessage(`A ${item.type} needs at least ${minPoints} points`);
      setTimeout(() => setWorkspaceMessage(""), 2000);
      return;
    }
    const nextPoints = item.points.filter((_, i) => i !== vertexIndex);
    pushHistory(currentAnnotations.map(x => x.id === id ? { ...x, points: nextPoints } : x));
  }

  function imagePoint(e) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    };
  }

  function onCanvasPointerDown(e) {
    if (tool === "select") {
      const hit = [...currentAnnotations].reverse().find(a => hitTest(a, imagePoint(e)));
      if (hit) { selectAnnotation(hit.id, e.shiftKey); return; }
      if (!e.shiftKey) { setSelectedAnnotationId(null); setAdditionalSelectedIds([]); }
      const point = imagePoint(e);
      setMarquee({ start: point, current: point, additive: e.shiftKey });
      e.currentTarget.setPointerCapture?.(e.pointerId);
      return;
    }
    if (tool === "pan") {
      panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      e.currentTarget.setPointerCapture?.(e.pointerId);
      return;
    }
    if (tool === "eraser") {
      setHistory(prev => [...prev, currentAnnotations]);
      setFuture([]);
      setDrawing({ type: "eraser" });
      eraseAt(imagePoint(e));
      e.currentTarget.setPointerCapture?.(e.pointerId);
      return;
    }
    const point = imagePoint(e);
    if (tool === "keypoint") {
      const annotation = { id: `keypoint-${Date.now()}`, type: "keypoint", labelId: selectedLabel, color: currentLabel?.color || "#2563eb", points: [point] };
      pushHistory([...currentAnnotations, annotation]);
      setSelectedAnnotationId(annotation.id);
      return;
    }
    if (tool === "polygon" || tool === "polyline") {
      if (drawing?.type === tool) {
        const points = [...drawing.points, point];
        if (tool === "polygon" && points.length >= 3 && distance(points[0], point) < 2.5) {
          const annotation = { id: `${tool}-${Date.now()}`, type: tool, labelId: selectedLabel, color: currentLabel?.color || "#2563eb", points: points.slice(0, -1) };
          pushHistory([...currentAnnotations, annotation]);
          setSelectedAnnotationId(annotation.id);
          setDrawing(null);
        } else {
          setDrawing({ ...drawing, points });
        }
      } else {
        setDrawing({ type: tool, points: [point] });
      }
      return;
    }
    if (tool === "brush") {
      setDrawing({ type: "brush", points: [point] });
      e.currentTarget.setPointerCapture?.(e.pointerId);
      return;
    }
    if (tool === "rectangle" || tool === "line") {
      setDrawing({ type: tool, start: point, current: point });
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
  }

  function finishPathDrawing() {
    if (!drawing || !["polygon", "polyline"].includes(drawing.type)) return;
    const minPoints = drawing.type === "polygon" ? 3 : 2;
    if (drawing.points.length < minPoints) { setDrawing(null); return; }
    const annotation = { id: `${drawing.type}-${Date.now()}`, type: drawing.type, labelId: selectedLabel, color: currentLabel?.color || "#2563eb", points: drawing.points };
    pushHistory([...currentAnnotations, annotation]);
    setSelectedAnnotationId(annotation.id);
    setDrawing(null);
  }

  function onCanvasDoubleClick(e) {
    e.preventDefault();
    if (drawing && ["polygon", "polyline"].includes(drawing.type)) finishPathDrawing();
  }

  function onCanvasPointerMove(e) {
    if (panStart.current && tool === "pan") {
      setPan({ x: panStart.current.px + (e.clientX - panStart.current.x), y: panStart.current.py + (e.clientY - panStart.current.y) });
      return;
    }
    if (marquee) {
      setMarquee(prev => ({ ...prev, current: imagePoint(e) }));
      return;
    }
    if (editRef.current) {
      const edit = editRef.current;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = ((e.clientX - edit.startClientX) / rect.width) * 100;
      const dy = ((e.clientY - edit.startClientY) / rect.height) * 100;
      if (edit.mode === "rotate") {
        const a = edit.originals[0];
        const cx = a.type === "rectangle" ? a.x + a.w / 2 : a.points.reduce((s,p)=>s+p.x,0)/a.points.length;
        const cy = a.type === "rectangle" ? a.y + a.h / 2 : a.points.reduce((s,p)=>s+p.y,0)/a.points.length;
        const cxPx = rect.left + (cx / 100) * rect.width, cyPx = rect.top + (cy / 100) * rect.height;
        const angle = Math.atan2(e.clientY - cyPx, e.clientX - cxPx) * 180 / Math.PI + 90;
        const next = { ...a, rotation: Math.round(angle) };
        setAnnotationsByTask(prev => ({ ...prev, [currentTask.id]: (prev[currentTask.id] || []).map(item => item.id === a.id ? next : item) }));
        return;
      }
      const updates = {};
      edit.originals.forEach(a => {
        let next = { ...a };
        if (a.type === "rectangle") {
          if (edit.mode === "move") {
            next.x = Math.max(0, Math.min(100 - a.w, a.x + dx));
            next.y = Math.max(0, Math.min(100 - a.h, a.y + dy));
          } else {
            const minSize = 1.2;
            let left = a.x, top = a.y, right = a.x + a.w, bottom = a.y + a.h;
            if (edit.mode.includes("w")) left = Math.min(right - minSize, Math.max(0, a.x + dx));
            if (edit.mode.includes("e")) right = Math.max(left + minSize, Math.min(100, a.x + a.w + dx));
            if (edit.mode.includes("n")) top = Math.min(bottom - minSize, Math.max(0, a.y + dy));
            if (edit.mode.includes("s")) bottom = Math.max(top + minSize, Math.min(100, a.y + a.h + dy));
            next = { ...a, x: left, y: top, w: right - left, h: bottom - top };
          }
        } else if (a.points?.length) {
          if (edit.mode.startsWith("vertex:")) {
            const vi = Number(edit.mode.split(":")[1]);
            next.points = a.points.map((p, i) => i === vi
              ? { x: Math.max(0, Math.min(100, p.x + dx)), y: Math.max(0, Math.min(100, p.y + dy)) }
              : p);
          } else {
            next.points = a.points.map(p => ({ x: Math.max(0, Math.min(100, p.x + dx)), y: Math.max(0, Math.min(100, p.y + dy)) }));
          }
        }
        updates[a.id] = next;
      });
      setAnnotationsByTask(prev => ({ ...prev, [currentTask.id]: (prev[currentTask.id] || []).map(item => updates[item.id] || item) }));
      return;
    }
    if (drawing && drawing.type === "eraser") {
      eraseAt(imagePoint(e));
      return;
    }
    if (drawing && drawing.type === "brush") {
      const point = imagePoint(e);
      setDrawing(prev => ({ ...prev, points: [...prev.points, point] }));
      return;
    }
    if (drawing && (drawing.type === "rectangle" || drawing.type === "line")) {
      setDrawing(prev => ({ ...prev, current: imagePoint(e) }));
    }
  }

  function onCanvasPointerUp() {
    if (panStart.current) { panStart.current = null; return; }
    if (marquee) {
      const { start, current, additive } = marquee;
      const minX = Math.min(start.x, current.x), maxX = Math.max(start.x, current.x);
      const minY = Math.min(start.y, current.y), maxY = Math.max(start.y, current.y);
      setMarquee(null);
      if (maxX - minX < 0.6 && maxY - minY < 0.6) return;
      const hits = currentAnnotations.filter(a => {
        const b = annotationBounds(a);
        return b.minX <= maxX && b.maxX >= minX && b.minY <= maxY && b.maxY >= minY;
      }).map(a => a.id);
      if (!hits.length) return;
      if (additive) {
        setAdditionalSelectedIds(prev => [...new Set([...prev, ...hits.filter(id=>id!==selectedAnnotationId)])]);
        if (!selectedAnnotationId) setSelectedAnnotationId(hits[0]);
      } else {
        setSelectedAnnotationId(hits[0]);
        setAdditionalSelectedIds(hits.slice(1));
      }
      return;
    }
    if (editRef.current) {
      const { originals } = editRef.current;
      const changedModelIds = originals.filter(o => {
        if (o.source !== "model" || o.corrected) return false;
        const live = currentAnnotations.find(a => a.id === o.id);
        if (!live) return false;
        const key = (a) => JSON.stringify({ x: a.x, y: a.y, w: a.w, h: a.h, points: a.points, labelId: a.labelId });
        return key(live) !== key(o);
      }).map(o => o.id);
      if (changedModelIds.length && currentTask) {
        setAnnotationsByTask(prev => ({ ...prev, [currentTask.id]: (prev[currentTask.id] || []).map(a => changedModelIds.includes(a.id) ? { ...a, corrected: true } : a) }));
      }
      editRef.current = null;
      return;
    }
    if (drawing && drawing.type === "eraser") { setDrawing(null); return; }
    if (!drawing) return;
    if (drawing.type === "brush") {
      if (drawing.points.length >= 2) {
        const annotation = { id: `brush-${Date.now()}`, type: "brush", labelId: selectedLabel, color: currentLabel?.color || "#2563eb", points: drawing.points };
        pushHistory([...currentAnnotations, annotation]);
        setSelectedAnnotationId(annotation.id);
      }
      setDrawing(null);
      return;
    }
    if (!["rectangle", "line"].includes(drawing.type)) return;
    const s = drawing.start, c = drawing.current;
    if (Math.abs(c.x - s.x) < 1.2 || Math.abs(c.y - s.y) < 1.2) { setDrawing(null); return; }
    const annotation = drawing.type === "rectangle"
      ? { id: `box-${Date.now()}`, type: "rectangle", labelId: selectedLabel, color: currentLabel?.color || "#2563eb", x: Math.min(s.x, c.x), y: Math.min(s.y, c.y), w: Math.abs(c.x - s.x), h: Math.abs(c.y - s.y) }
      : { id: `line-${Date.now()}`, type: "line", labelId: selectedLabel, color: currentLabel?.color || "#2563eb", points: [s, c] };
    pushHistory([...currentAnnotations, annotation]);
    setSelectedAnnotationId(annotation.id);
    setDrawing(null);
  }

  function startAnnotationEdit(id, e, mode = "move") {
    e.stopPropagation();
    const original = currentAnnotations.find(a => a.id === id);
    if (!original) return;
    const isBatchMove = mode === "move" && selectedIds.includes(id) && selectedIds.length > 1;
    if (!isBatchMove) selectAnnotation(id, e.shiftKey);
    setTool("select");
    if (original.locked && !isBatchMove) return;
    const targetIds = isBatchMove ? selectedIds : [id];
    const originals = targetIds
      .map(tid => currentAnnotations.find(a => a.id === tid))
      .filter(a => a && !a.locked)
      .map(a => JSON.parse(JSON.stringify(a)));
    if (!originals.length) return;
    editRef.current = { mode, originals, startClientX: e.clientX, startClientY: e.clientY };
    setHistory(prev => [...prev, currentAnnotations]);
    setFuture([]);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function hitTest(a, p) {
    if (a.type === "rectangle") return p.x >= a.x && p.x <= a.x + a.w && p.y >= a.y && p.y <= a.y + a.h;
    if (a.points?.length) {
      if (a.type === "keypoint") return distance(a.points[0], p) <= 3;
      const xs = a.points.map(v => v.x), ys = a.points.map(v => v.y);
      return p.x >= Math.min(...xs) - 2 && p.x <= Math.max(...xs) + 2 && p.y >= Math.min(...ys) - 2 && p.y <= Math.max(...ys) + 2;
    }
    return false;
  }

  function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function changeTask(delta) {
    setDrawing(null);
    setSelectedAnnotationId(null);
    setSelectedTaskIndex(i => Math.max(0, Math.min(tasks.length - 1, i + delta)));
    resetView();
    setQaCriteriaScores({});
    setQaErrors([]);
  }

  function logAudit(action, taskId=null, projectId=null, details="", actor=currentUserName, actorRole="Team Lead") {
    const event = { id:`audit-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, action, actor, actorRole, projectId:projectId || tasks.find(t=>t.id===taskId)?.projectId || workspaceProject, taskId, details, timestamp:new Date().toISOString() };
    setAuditEvents(prev => [event, ...prev].slice(0, 2000));
    if (session) {
      supabase.from("audit_events").insert({
        id: event.id, action: event.action, actor: event.actor, actor_role: event.actorRole,
        project_id: event.projectId, task_id: event.taskId, details: event.details, timestamp: event.timestamp
      }).then(({ error }) => { if (error) console.warn("[Realtime] audit sync failed:", error.message); });
    }
  }

  function pushNotification(type, title, message, projectId=null, taskId=null) {
    const note = { id:`notif-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, type, title, message, read:false, projectId, taskId, createdAt:new Date().toISOString() };
    setNotifications(prev => [note, ...prev]);
    if (session) {
      supabase.from("notifications").insert({
        id: note.id, type: note.type, title: note.title, message: note.message, read: false,
        project_id: note.projectId, task_id: note.taskId, created_at: note.createdAt
      }).then(({ error }) => { if (error) console.warn("[Realtime] notification sync failed:", error.message); });
    }
  }

  function saveTask() {
    if (!currentTask) return;
    const nextStatus = currentAnnotations.length ? "In Progress" : currentTask.status;
    setTasks(prev => prev.map((t, i) => i === selectedTaskIndex ? { ...t, status: nextStatus } : t));
    if (nextStatus !== currentTask.status) syncUpdate("tasks", currentTask.id, { status: nextStatus });
    logAudit("Annotation Saved", currentTask.id, currentTask.projectId, `${currentAnnotations.length} annotation${currentAnnotations.length===1?"":"s"} saved.`);
    setWorkspaceMessage("Task saved");
    setTimeout(() => setWorkspaceMessage(""), 1800);
  }

  function submitTask() {
    if (!currentTask) return;
    setTasks(prev => prev.map((t, i) => i === selectedTaskIndex ? { ...t, status: "Submitted" } : t));
    syncUpdate("tasks", currentTask.id, { status: "Submitted" });
    logAudit("Task Submitted", currentTask.id, currentTask.projectId, "Task submitted for QA review.");
    fireWebhooks("task.submitted", { taskId: currentTask.id, taskName: currentTask.name, projectId: currentTask.projectId });
    setWorkspaceMessage("Task submitted for QA review");
    setTimeout(() => setWorkspaceMessage(""), 1800);
  }

  function skipTask() {
    if (!currentTask) return;
    logAudit("Task Skipped", currentTask.id, currentTask.projectId, "Annotator skipped this task.");
    setWorkspaceMessage("Task skipped");
    setTimeout(() => setWorkspaceMessage(""), 1600);
    changeTask(1);
  }

  function openWorkstation(projectId, mode = "Annotation", taskId = null) {
    if (projectId) setWorkspaceProject(projectId);
    const idx = taskId ? tasks.findIndex(t => t.id === taskId) : tasks.findIndex(t => !projectId || t.projectId === projectId);
    if (idx >= 0) setSelectedTaskIndex(idx);
    setWorkstationMode(mode);
    setSelectedAnnotationId(null);
    setDrawing(null);
    resetView();
    setQaCriteriaScores({});
    setQaErrors([]);
    navigate("Annotation Workspace");
  }

  // Review decisions issued from inside the workstation (same layout as annotation).
  function reviewCurrentTask(decision) {
    if (!currentTask) return;
    const now = new Date().toISOString();
    const existing = qaReviews[currentTask.id];
    const annotationCount = (annotationsByTask[currentTask.id] || []).length;
    const groupConfig = getGroupConfig(getGroupIdForTask(currentTask));
    const criteria = groupConfig.qaCriteria || [];
    const hasScorecardInput = criteria.length && Object.keys(qaCriteriaScores).length;
    const computedScore = hasScorecardInput ? weightedQaScore(criteria, qaCriteriaScores) : Number(existing?.score ?? qaScore ?? 96);
    const review = {
      decision,
      score: computedScore,
      reason: decision === "Rejected" ? (qaReason || "Incorrect label") : "",
      comment: (qaComment || "").trim(),
      reviewer: currentUserName,
      reviewedAt: now,
      annotationCount,
      criteriaScores: hasScorecardInput ? { ...qaCriteriaScores } : (existing?.criteriaScores || {}),
      errors: qaErrors.length ? qaErrors : (existing?.errors || []),
      history: [
        ...(existing?.history || []),
        { decision, score: computedScore, reason: decision === "Rejected" ? (qaReason || "Incorrect label") : "", comment: (qaComment || "").trim(), reviewer: currentUserName, reviewedAt: now }
      ]
    };
    setQaReviews(prev => ({ ...prev, [currentTask.id]: review }));
    const nextStatus = decision === "Approved" ? "Approved" : "Rejected";
    setTasks(prev => prev.map((t, i) => i === selectedTaskIndex ? { ...t, status: nextStatus } : t));
    syncUpdate("tasks", currentTask.id, { status: nextStatus });
    logAudit(`QA ${decision}`, currentTask.id, currentTask.projectId, `QA score ${review.score ?? "—"}${review.errors.length ? ` · ${review.errors.length} error${review.errors.length===1?"":"s"} logged` : ""}${review.comment ? ` · ${review.comment}` : ""}`, currentUserName, "Reviewer");
    if (session) {
      supabase.from("qa_reviews").upsert({
        task_id: currentTask.id, decision: review.decision, score: review.score, reviewer: review.reviewer,
        comment: review.comment, reason: review.reason, annotation_count: review.annotationCount,
        criteria_scores: review.criteriaScores || {}, errors: review.errors || [],
        history: review.history, reviewed_at: review.reviewedAt
      }).then(({ error }) => { if (error) console.warn("[Realtime] QA review sync failed:", error.message); });
    }
    if (decision === "Rejected") {
      pushNotification("qa", "QA Rejected", `${currentTask.name} was rejected by ${currentUserName}${review.reason ? ` — ${review.reason}` : ""}`, currentTask.projectId, currentTask.id);
    }
    fireWebhooks(decision === "Approved" ? "qa.approved" : "qa.rejected", { taskId: currentTask.id, taskName: currentTask.name, projectId: currentTask.projectId, score: review.score, reviewer: review.reviewer, reason: review.reason });
    setQaCriteriaScores({});
    setQaErrors([]);
    setWorkspaceMessage(`${currentTask.name} ${decision.toLowerCase()}`);
    setTimeout(() => setWorkspaceMessage(""), 1800);
  }

  async function importImages(files) {
    const selectedFiles = Array.from(files || []).filter(file => file.type.startsWith("image/"));
    if (!selectedFiles.length) return;
    const targetDatasetId = importTargetDataset || datasets.find(d => d.projectId === workspaceProject)?.id || datasets[0]?.id;
    const targetDataset = datasets.find(d => d.id === targetDatasetId);
    const targetProjectId = targetDataset?.projectId || workspaceProject;
    const existingNames = new Set(tasks.filter(t => t.datasetId === targetDatasetId).map(t => t.name));
    const duplicateNames = selectedFiles.filter(f => existingNames.has(f.name)).map(f => f.name);
    const newFiles = selectedFiles.filter(f => !existingNames.has(f.name));

    const readAsDataUrl = file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });

    const uploadFile = async file => {
      const compressed = await compressImageBlob(file);
      const path = `${targetProjectId || "unassigned"}/${targetDatasetId || "unassigned"}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${file.name}`;
      const { error } = await supabase.storage.from("task-images").upload(path, compressed, { cacheControl: "3600", upsert: false });
      if (error) {
        console.warn("[Storage] upload failed, falling back to local base64:", error.message);
        return { image: await readAsDataUrl(file), source: "Local upload (offline)" };
      }
      const { data } = supabase.storage.from("task-images").getPublicUrl(path);
      return { image: data.publicUrl, source: "Cloud Storage" };
    };

    const buildTask = async file => {
      const { image, source } = await uploadFile(file);
      if (!image) return null;
      return {
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name, status: "Pending", image, size: file.size,
        source, projectId: targetProjectId, datasetId: targetDatasetId, createdAt: new Date().toISOString()
      };
    };

    const next = (await Promise.all(newFiles.map(buildTask))).filter(Boolean);
    if (next.length) {
      const startIndex = tasks.length;
      setTasks(prev => [...prev, ...next]);
      setSelectedTaskIndex(startIndex);
    }
    setImageUploadOpen(false);
    const skippedNote = duplicateNames.length ? `, skipped ${duplicateNames.length} duplicate${duplicateNames.length > 1 ? "s" : ""}` : "";
    setDatasetToast(next.length ? `${next.length} image${next.length > 1 ? "s" : ""} imported${skippedNote}` : `No new images imported${skippedNote}`);
    setTimeout(() => setDatasetToast(""), 2600);
    if (next.length && !importTargetDataset) navigate("Annotation Workspace");
    setImportTargetDataset(null);
  }

  async function removeTask(id) {
    const index = tasks.findIndex(t => t.id === id);
    if (index < 0) return;
    if (!(await confirmAction(`Remove ${tasks[index].name} from the dataset?`, { title: "Remove image", confirmLabel: "Remove" }))) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    setAnnotationsByTask(prev => { const next = { ...prev }; delete next[id]; return next; });
    setQaReviews(prev => { const next = { ...prev }; delete next[id]; return next; });
    syncDelete("tasks", id);
    setSelectedTaskIndex(prev => Math.max(0, Math.min(prev, tasks.length - 2)));
    setDatasetToast("Image removed");
    setTimeout(() => setDatasetToast(""), 1800);
  }

  async function clearDataset(datasetId) {
    const count = tasks.filter(t => t.datasetId === datasetId).length;
    if (!count) return;
    if (!(await confirmAction(`Remove all ${count} image${count>1?"s":""} in this dataset?`, { title: "Clear dataset", confirmLabel: "Remove all" }))) return;
    const removedIds = tasks.filter(t => t.datasetId === datasetId).map(t => t.id);
    const removedIdSet = new Set(removedIds);
    setTasks(prev => prev.filter(t => t.datasetId !== datasetId));
    setAnnotationsByTask(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => !removedIdSet.has(id))));
    setQaReviews(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => !removedIdSet.has(id))));
    if (session) removedIds.forEach(id => syncDelete("tasks", id));
    setSelectedTaskIndex(0);
    setDatasetToast("Dataset images cleared");
    setTimeout(() => setDatasetToast(""), 1800);
  }

  function updateTaskStatus(id, status) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    if (session) {
      supabase.from("tasks").update({ status }).eq("id", id).then(({ error }) => {
        if (error) console.warn("[Realtime] task status sync failed:", error.message);
      });
    }
  }

  function exportTasksCsv() {
    const rows = [
      ["id", "name", "status", "image"],
      ...tasks.map(t => [t.id, t.name, t.status, t.image])
    ];
    const csv = rows.map(row => row.map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "annotatepro-tasks.csv"; a.click();
  }


  const exportTasks = useMemo(() => {
    const q = exportSearch.trim().toLowerCase();
    return tasks.filter(task => {
      const review = qaReviews[task.id];
      const annotations = annotationsByTask[task.id] || [];
        const matchesSearch = !q || `${task.name} ${task.id}`.toLowerCase().includes(q);
      const matchesProject = exportProject === "All Projects" || (task.projectId || workspaceProject) === exportProject;
      const matchesScope = exportScope === "All Tasks"
        || (exportScope === "Annotated Only" && annotations.length > 0)
        || (exportScope === "Completed Only" && ["Completed","Submitted","QA Review","Approved","Rejected"].includes(task.status))
        || (exportScope === "QA Approved" && review?.decision === "Approved");
      return matchesSearch && matchesProject && matchesScope;
    });
  }, [tasks, qaReviews, annotationsByTask, projects, workspaceProject, exportSearch, exportProject, exportScope]);

  function downloadText(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function csvEscape(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function buildTaskCsv(list) {
    const rows = [["task_id","task_name","status","annotation_count","qa_decision","qa_score","reviewer","image_source","created_at"]];
    list.forEach(task => {
      const review = qaReviews[task.id] || {};
      rows.push([task.id, task.name, task.status, (annotationsByTask[task.id] || []).length, review.decision || "", review.score ?? "", review.reviewer || "", task.source || "Sample", task.createdAt || ""]);
    });
    return rows.map(row => row.map(csvEscape).join(",")).join("\n");
  }

  function buildAnnotationCsv(list) {
    const rows = [["task_id","task_name","annotation_id","label_id","type","x","y","width","height","points","color"]];
    list.forEach(task => {
      (annotationsByTask[task.id] || []).forEach(a => {
        const xs = (a.points || []).map(p => p.x);
        const ys = (a.points || []).map(p => p.y);
        const x = a.x ?? (xs.length ? Math.min(...xs) : "");
        const y = a.y ?? (ys.length ? Math.min(...ys) : "");
        rows.push([task.id, task.name, a.id, a.labelId || "", a.type, x, y, a.w ?? "", a.h ?? "", JSON.stringify(a.points || []), a.color || ""]);
      });
    });
    return rows.map(row => row.map(csvEscape).join(",")).join("\n");
  }

  function buildCoco(list) {
    const categories = [];
    const categoryMap = new Map();
    let nextCategory = 1;
    const images = [];
    const anns = [];
    let nextAnn = 1;
    list.forEach((task, imageIndex) => {
      images.push({ id: imageIndex + 1, file_name: task.name, width: task.width || 1000, height: task.height || 1000 });
      (annotationsByTask[task.id] || []).forEach(a => {
        const label = a.labelId || "unlabeled";
        if (!categoryMap.has(label)) {
          categoryMap.set(label, nextCategory);
          categories.push({ id: nextCategory, name: label });
          nextCategory += 1;
        }
        if (a.type === "rectangle") {
          const w = (a.w || 0) / 100 * (task.width || 1000);
          const h = (a.h || 0) / 100 * (task.height || 1000);
          const x = (a.x || 0) / 100 * (task.width || 1000);
          const y = (a.y || 0) / 100 * (task.height || 1000);
          anns.push({ id: nextAnn++, image_id: imageIndex + 1, category_id: categoryMap.get(label), bbox: [x,y,w,h], area: Math.max(0,w*h), iscrowd: 0 });
        }
      });
    });
    return JSON.stringify({ info: { description: "AnnotatePro COCO export", version: "5.0", exported_at: new Date().toISOString() }, images, annotations: anns, categories }, null, 2);
  }

  function buildYoloManifest(list) {
    const lines = ["# AnnotatePro YOLO manifest", "# task | class | center_x | center_y | width | height (all normalized 0-1)"];
    list.forEach(task => {
      (annotationsByTask[task.id] || []).forEach(a => {
        if (a.type !== "rectangle") return;
        const cx = ((a.x || 0) + (a.w || 0) / 2) / 100;
        const cy = ((a.y || 0) + (a.h || 0) / 2) / 100;
        lines.push([task.name, a.labelId || "unlabeled", cx.toFixed(6), cy.toFixed(6), ((a.w||0)/100).toFixed(6), ((a.h||0)/100).toFixed(6)].join(" | "));
      });
    });
    return lines.join("\n");
  }

  function performExport() {
    const list = exportTasks;
    if (!list.length) {
      setExportMessage("No tasks match the selected export filters.");
      setTimeout(() => setExportMessage(""), 2200);
      return;
    }
    let filename = "annotatepro-export";
    let content = "";
    let type = "application/json;charset=utf-8";
    if (exportFormat === "AnnotatePro JSON") {
      filename += ".json";
      content = JSON.stringify({ version: "5.0", exportedAt: new Date().toISOString(), project: exportProject, tasks: list, annotations: Object.fromEntries(list.map(t => [t.id, annotationsByTask[t.id] || []])), qaReviews: Object.fromEntries(list.map(t => [t.id, qaReviews[t.id] || null])) }, null, 2);
    } else if (exportFormat === "Task CSV") {
      filename += "-tasks.csv"; content = buildTaskCsv(list); type = "text/csv;charset=utf-8";
    } else if (exportFormat === "Annotation CSV") {
      filename += "-annotations.csv"; content = buildAnnotationCsv(list); type = "text/csv;charset=utf-8";
    } else if (exportFormat === "COCO JSON") {
      filename += "-coco.json"; content = buildCoco(list);
    } else {
      filename += "-yolo-manifest.txt"; content = buildYoloManifest(list); type = "text/plain;charset=utf-8";
    }
    downloadText(filename, content, type);
    logAudit("Export Created", null, exportProject === "All Projects" ? null : exportProject, `${filename} exported with ${list.length} task${list.length===1?"":"s"}.`);
    const entry = { id: Date.now(), format: exportFormat, scope: exportScope, tasks: list.length, annotations: list.reduce((n,t) => n + (annotationsByTask[t.id] || []).length, 0), at: new Date().toISOString() };
    setExportHistory(prev => [entry, ...prev].slice(0, 12));
    setExportMessage(`${exportFormat} exported successfully.`);
    setTimeout(() => setExportMessage(""), 2200);
  }

  function clearExportHistory() {
    setExportHistory([]);
  }

  const qaQueue = useMemo(() => {
    const q = qaSearch.toLowerCase();
    return tasks.filter(task => {
      const review = qaReviews[task.id];
      const reviewStatus = review?.decision || "Pending Review";
      const matchesSearch = !q || `${task.name} ${task.id}`.toLowerCase().includes(q);
      const matchesFilter = qaFilter === "All" || reviewStatus === qaFilter;
      return matchesSearch && matchesFilter;
    });
  }, [tasks, qaReviews, qaSearch, qaFilter]);

  const qaStats = useMemo(() => {
    const reviews = tasks.map(t => qaReviews[t.id]).filter(Boolean);
    const approved = reviews.filter(r => r.decision === "Approved").length;
    const rejected = reviews.filter(r => r.decision === "Rejected").length;
    const changes = reviews.filter(r => r.decision === "Changes Requested").length;
    const pending = tasks.filter(t => !qaReviews[t.id]?.decision || qaReviews[t.id]?.decision === "Changes Requested").length;
    const average = reviews.length ? Math.round(reviews.reduce((s, r) => s + Number(r.score || 0), 0) / reviews.length) : 0;
    return { pending, approved, rejected, changes, average, reviewed: reviews.length };
  }, [tasks, qaReviews]);

  const qaSelectedTask = tasks.find(t => t.id === qaSelectedTaskId) || qaQueue[0] || tasks[0];
  const qaSelectedAnnotations = qaSelectedTask ? (annotationsByTask[qaSelectedTask.id] || []) : [];
  const qaSelectedReview = qaSelectedTask ? qaReviews[qaSelectedTask.id] : null;

  function selectQaTask(id) {
    setQaSelectedTaskId(id);
    const review = qaReviews[id];
    setQaScore(review?.score ?? 96);
    setQaReason(review?.reason || "Incorrect label");
    setQaComment(review?.comment || "");
  }

  function completeQaReview(decision) {
    if (!qaSelectedTask) return;
    const now = new Date().toISOString();
    const review = {
      decision,
      score: Number(qaScore),
      reason: decision === "Rejected" || decision === "Changes Requested" ? qaReason : "",
      comment: qaComment.trim(),
      reviewer: currentUserName,
      reviewedAt: now,
      annotationCount: qaSelectedAnnotations.length,
      criteriaScores: qaSelectedReview?.criteriaScores || {},
      errors: qaSelectedReview?.errors || [],
      history: [
        ...(qaSelectedReview?.history || []),
        { decision, score: Number(qaScore), reason: decision === "Approved" ? "" : qaReason, comment: qaComment.trim(), reviewer: currentUserName, reviewedAt: now }
      ]
    };
    setQaReviews(prev => ({ ...prev, [qaSelectedTask.id]: review }));
    const nextStatus = decision === "Approved" ? "Approved" : decision === "Rejected" ? "Rejected" : "QA Review";
    setTasks(prev => prev.map(t => t.id === qaSelectedTask.id ? { ...t, status: nextStatus } : t));
    syncUpdate("tasks", qaSelectedTask.id, { status: nextStatus });
    logAudit(`QA ${decision}`, qaSelectedTask.id, qaSelectedTask.projectId, `QA score ${qaScore}${qaComment.trim() ? ` · ${qaComment.trim()}` : ""}`, currentUserName, "Reviewer");
    if (session) {
      supabase.from("qa_reviews").upsert({
        task_id: qaSelectedTask.id, decision: review.decision, score: review.score, reviewer: review.reviewer,
        comment: review.comment, reason: review.reason, annotation_count: review.annotationCount,
        criteria_scores: review.criteriaScores, errors: review.errors,
        history: review.history, reviewed_at: review.reviewedAt
      }).then(({ error }) => { if (error) console.warn("[Realtime] QA review sync failed:", error.message); });
    }
    if (decision === "Changes Requested" || decision === "Rejected") {
      pushNotification("qa", `QA ${decision}`, `${qaSelectedTask.name} was ${decision.toLowerCase()} by ${currentUserName}${review.reason ? ` — ${review.reason}` : ""}`, qaSelectedTask.projectId, qaSelectedTask.id);
    }
    setQaMessage(`${qaSelectedTask.name} marked ${decision.toLowerCase()}`);
    setTimeout(() => setQaMessage(""), 2200);
  }

  function handleImageError() {
    setWorkspaceMessage("Sample image could not be loaded. Use Import Images to add local images.");
  }

  useEffect(() => {
    function keydown(e) {
      const tag = document.activeElement?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z") { e.preventDefault(); redo(); }
      else if (e.ctrlKey && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      else if (e.ctrlKey && e.key.toLowerCase() === "c") { e.preventDefault(); copySelection(); }
      else if (e.ctrlKey && e.key.toLowerCase() === "v") { e.preventDefault(); pasteClipboard(); }
      else if (e.ctrlKey && e.key.toLowerCase() === "a") { e.preventDefault(); selectAll(); }
      else if (e.ctrlKey && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelected(); }
      else if (e.key === "Escape") { setDrawing(null); setSelectedAnnotationId(null); setAdditionalSelectedIds([]); }
      else if (e.key.toLowerCase() === "v") setTool("select");
      else if (e.key.toLowerCase() === "b") setTool("rectangle");
      else if (e.key.toLowerCase() === "p") setTool("polygon");
      else if (e.key.toLowerCase() === "l") setTool("line");
      else if (e.key.toLowerCase() === "k") setTool("keypoint");
      else if (e.key.toLowerCase() === "g") setTool("polyline");
      else if (e.key.toLowerCase() === "r") setTool("brush");
      else if (e.key.toLowerCase() === "e") setTool("eraser");
      else if (e.key === "+" || e.key === "=") setZoom(z => Math.min(4, +(z + 0.1).toFixed(2)));
      else if (e.key === "-") setZoom(z => Math.max(0.25, +(z - 0.1).toFixed(2)));
      else if (e.key === "ArrowRight") changeTask(1);
      else if (e.key === "ArrowLeft") changeTask(-1);
      else if (e.key === " ") { e.preventDefault(); setTool("pan"); }
      else {
        const key = e.key.toLowerCase();
        if (!RESERVED_SHORTCUTS.includes(key)) {
          const match = labels.find(l => (l.shortcut || "").toLowerCase() === key);
          if (match) setSelectedLabel(match.id);
        }
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });

  const datasetFilteredTasks = useMemo(() => tasks.filter(t => {
    const q = datasetSearch.toLowerCase();
    return t.datasetId === activeDatasetId && (!q || `${t.name} ${t.id}`.toLowerCase().includes(q)) && (datasetStatus === "All" || t.status === datasetStatus);
  }), [tasks, datasetSearch, datasetStatus, activeDatasetId]);

  useEffect(() => {
    const handler = (e) => {
      const index = Number(e.detail);
      if (Number.isFinite(index)) { setSelectedTaskIndex(index); setWorkstationMode("Annotation"); setActivePage("Annotation Workspace"); }
    };
    window.addEventListener("annotatepro-open-task", handler);
    return () => window.removeEventListener("annotatepro-open-task", handler);
  }, []);

  const teamFilteredMembers = useMemo(() => teamMembers.filter(member => {
    const q = teamSearch.trim().toLowerCase();
    const matchesSearch = !q || `${member.name} ${member.email} ${member.role}`.toLowerCase().includes(q);
    const matchesRole = teamRoleFilter === "All Roles" || member.role === teamRoleFilter;
    const matchesStatus = teamStatusFilter === "All Status" || member.status === teamStatusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  }), [teamMembers, teamSearch, teamRoleFilter, teamStatusFilter]);

  const teamStats = useMemo(() => {
    const active = teamMembers.filter(m => m.status === "Active").length;
    const annotators = teamMembers.filter(m => m.role === "Annotator" && m.status === "Active").length;
    const reviewers = teamMembers.filter(m => m.role === "Reviewer" && m.status === "Active").length;
    const assigned = tasks.filter(t => t.assigneeId).length;
    const avgQuality = teamMembers.length ? Math.round(teamMembers.reduce((s,m) => s + Number(m.qaScore || 0), 0) / teamMembers.length) : 0;
    return { active, annotators, reviewers, assigned, avgQuality };
  }, [teamMembers, tasks]);

  function openCreateMember() {
    setEditingMemberId(null);
    setTeamForm({ name: "", email: "", role: "Annotator", status: "Active", projects: projects[0] ? [projects[0].id] : [], capacity: 6 });
    setTeamModalOpen(true);
  }

  function openEditMember(member) {
    setEditingMemberId(member.id);
    setTeamForm({ name: member.name, email: member.email || "", role: member.role, status: member.status, projects: member.projects || [], capacity: member.capacity || 6 });
    setTeamModalOpen(true);
  }

  function saveMember(e) {
    e.preventDefault();
    if (!teamForm.name.trim() || !teamForm.email.trim()) return;
    if (editingMemberId) {
      const updated = { ...(teamMembers.find(m => m.id === editingMemberId) || {}), ...teamForm, id: editingMemberId, name: teamForm.name.trim(), email: teamForm.email.trim(), capacity: Math.max(0, Number(teamForm.capacity) || 0) };
      setTeamMembers(prev => prev.map(m => m.id === editingMemberId ? { ...m, ...teamForm, name: teamForm.name.trim(), email: teamForm.email.trim(), capacity: Math.max(0, Number(teamForm.capacity) || 0) } : m));
      syncUpsert("team_members", memberToRow(updated));
      setTeamMessage("Team member updated successfully");
    } else {
      const member = { id: `member-${Date.now()}`, ...teamForm, name: teamForm.name.trim(), email: teamForm.email.trim(), capacity: Math.max(0, Number(teamForm.capacity) || 0), completed: 0, qaScore: 0 };
      setTeamMembers(prev => [member, ...prev]);
      syncUpsert("team_members", memberToRow(member));
      setTeamMessage("Team member added successfully");
    }
    setTeamModalOpen(false);
    setTimeout(() => setTeamMessage(""), 2600);
  }

  function toggleMemberStatus(member) {
    const next = member.status === "Active" ? "Inactive" : "Active";
    setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, status: next } : m));
    syncUpdate("team_members", member.id, { status: next });
    setTeamMessage(`${member.name} is now ${next.toLowerCase()}`);
    setTimeout(() => setTeamMessage(""), 2600);
  }

  function deleteMember(member) {
    if (member.id === "m1") return;
    const affectedAssignee = tasks.filter(t => t.assigneeId === member.id).map(t => t.id);
    const affectedReviewer = tasks.filter(t => t.reviewerId === member.id).map(t => t.id);
    setTeamMembers(prev => prev.filter(m => m.id !== member.id));
    setTasks(prev => prev.map(t => (t.assigneeId === member.id || t.reviewerId === member.id) ? { ...t, assigneeId: t.assigneeId === member.id ? null : t.assigneeId, reviewerId: t.reviewerId === member.id ? null : t.reviewerId } : t));
    affectedAssignee.forEach(id => syncUpdate("tasks", id, { assignee_id: null }));
    affectedReviewer.forEach(id => syncUpdate("tasks", id, { reviewer_id: null }));
    syncDelete("team_members", member.id);
    setTeamMessage(`${member.name} removed from the workspace`);
    setTimeout(() => setTeamMessage(""), 2600);
  }

  function assignTask(taskId, memberId) {
    const prevTask = tasks.find(t => t.id === taskId);
    const nextTaskStatus = memberId && prevTask?.status === "Pending" ? "In Progress" : prevTask?.status;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigneeId: memberId || null, status: memberId && t.status === "Pending" ? "In Progress" : t.status } : t));
    const syncPatch = { assignee_id: memberId || null };
    if (nextTaskStatus && nextTaskStatus !== prevTask?.status) syncPatch.status = nextTaskStatus;
    syncUpdate("tasks", taskId, syncPatch);
    const member = teamMembers.find(m => m.id === memberId);
    logAudit(member ? "Task Assigned" : "Task Unassigned", taskId, tasks.find(t=>t.id===taskId)?.projectId, member ? `Assigned to ${member.name}.` : "Assignment cleared.");
    setTeamMessage(member ? `Task assigned to ${member.name}` : "Task assignment cleared");
    setTimeout(() => setTeamMessage(""), 2200);
  }

  function openTaskPlanner(projectId = null) {
    setPlannerProjectId(projectId);
    setPlannerPriority("MEDIUM");
    setPlannerQueue("Now");
    setPlannerReworkSelection([]);
    navigate("Task Planner");
  }

  function openPlannerAssignment(taskIds = [], memberId = "") {
    const ids = Array.isArray(taskIds) ? taskIds : [taskIds];
    const first = tasks.find(t => ids.includes(t.id));
    setPlannerAssignmentTaskIds(ids.filter(Boolean));
    setPlannerAssignmentAssignee(memberId || first?.assigneeId || "");
    setPlannerAssignmentReviewer(first?.reviewerId || "");
    setPlannerAssignmentPriority(first?.priority || plannerPriority || "MEDIUM");
    setPlannerAssignmentQueue(first?.queue || plannerQueue || "Now");
    setPlannerAssignmentOpen(true);
  }

  function savePlannerAssignments() {
    if (!plannerAssignmentTaskIds.length) { flashPlanner("Select at least one task"); return; }
    setTasks(prev => prev.map(task => {
      if (!plannerAssignmentTaskIds.includes(task.id)) return task;
      let status = task.status;
      if (plannerAssignmentAssignee && status === "Pending") status = "In Progress";
      if (!plannerAssignmentAssignee && status === "In Progress") status = "Pending";
      syncUpdate("tasks", task.id, {
        assignee_id: plannerAssignmentAssignee || null,
        reviewer_id: plannerAssignmentReviewer || null,
        priority: plannerAssignmentPriority,
        queue: plannerAssignmentQueue,
        ...(status !== task.status ? { status } : {})
      });
      return {
        ...task,
        assigneeId: plannerAssignmentAssignee || null,
        reviewerId: plannerAssignmentReviewer || null,
        priority: plannerAssignmentPriority,
        queue: plannerAssignmentQueue,
        status
      };
    }));
    plannerAssignmentTaskIds.forEach(id => { const t=tasks.find(x=>x.id===id); logAudit(plannerAssignmentAssignee ? "Task Assigned" : "Task Unassigned", id, t?.projectId, plannerAssignmentAssignee ? `Assigned to ${teamMembers.find(m=>m.id===plannerAssignmentAssignee)?.name || plannerAssignmentAssignee}; reviewer ${teamMembers.find(m=>m.id===plannerAssignmentReviewer)?.name || plannerAssignmentReviewer || "None"}.` : "Assignment cleared."); });
    const count = plannerAssignmentTaskIds.length;
    const member = teamMembers.find(m => m.id === plannerAssignmentAssignee);
    flashPlanner(member ? `${count} task${count === 1 ? "" : "s"} assigned to ${member.name}` : `${count} task${count === 1 ? "" : "s"} unassigned`);
    setPlannerAssignmentOpen(false);
    setPlannerAssignmentTaskIds([]);
  }

  function setPlannerTarget(role, memberId, field, value) {
    setPlannerTargets(prev => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        [memberId]: { ...(prev[role]?.[memberId] || {}), [field]: Math.max(0, Number(value) || 0) }
      }
    }));
  }

  function flashPlanner(message) {
    setPlannerMessage(message);
    setTimeout(() => setPlannerMessage(""), 2400);
  }

  function applyPlannerRework(action) {
    if (!plannerReworkSelection.length) { flashPlanner("Select at least one task first"); return; }
    const reworkStatus = action === "rework" ? "Changes Requested" : "Pending";
    setTasks(prev => prev.map(task => plannerReworkSelection.includes(task.id)
      ? { ...task, status: reworkStatus }
      : task
    ));
    plannerReworkSelection.forEach(id => syncUpdate("tasks", id, { status: reworkStatus }));
    flashPlanner(`${plannerReworkSelection.length} task${plannerReworkSelection.length === 1 ? "" : "s"} moved to ${action === "rework" ? "rework" : "the original queue"}`);
    setPlannerReworkSelection([]);
  }

  const updateAppSetting = (patch) => {
    setAppSettings(prev => ({ ...prev, ...patch }));
    setSettingsMessage("Settings saved automatically");
    window.setTimeout(() => setSettingsMessage(""), 1800);
  };

  const resetAppSettings = () => {
    const defaults = { workspaceName: "Production Workspace", timezone: "Asia/Kolkata", theme: "System", autosave: true, autosaveInterval: 10, confirmSubmit: true, showObjectIds: true, keyboardShortcuts: true, compactMode: false, emailAssignments: true, emailQa: true, emailRework: true, defaultPage: "Dashboard" };
    setAppSettings(defaults);
    setSettingsMessage("Settings restored to defaults");
    window.setTimeout(() => setSettingsMessage(""), 1800);
  };

  const navItems = [
    ["Dashboard", LayoutDashboard], ["Projects", FolderKanban], ["Task Planner", Target], ["Workload", Layers],
    ["Team", Users], ["Deadlines", Calendar], ["QA & Quality", ShieldCheck], ["Reports", TrendingUp], ["Analytics", BarChart3], ["Operations", Activity], ["Audit Trail", FileText], ["Notifications", Bell],
    ["Settings", Settings]
  ];

  const currentConfig = projectConfigs[configProject] || makeDefaultProjectConfig(projectGroups.find(g => g.id === configProject) || projectGroups[0] || defaultProjectGroups[0]);
  const openCreateLabel = (parentId = null) => { setEditingLabelId(null); setLabelForm({ ...emptyLabelForm, color: labelPalette[currentConfig.labels.length % labelPalette.length], parentId: parentId || "" }); setLabelEditorOpen(true); };
  const openEditLabel = (label) => { setEditingLabelId(label.id); setLabelForm({ name: label.name, color: label.color || labelPalette[0], type: label.type || "Rectangle", parentId: label.parentId || "", groupId: label.groupId || "", shortcut: label.shortcut || "", attributes: (label.attributes || []).map(a => ({ ...a })) }); setLabelEditorOpen(true); };
  const [labelSchemaError, setLabelSchemaError] = useState("");
  const saveProjectLabel = (e) => {
    e.preventDefault();
    const name = labelForm.name.trim();
    if (!name) return;
    const shortcut = (labelForm.shortcut || "").trim().toLowerCase().slice(0, 1);
    if (shortcut && RESERVED_SHORTCUTS.includes(shortcut)) { setLabelSchemaError(`"${shortcut.toUpperCase()}" is reserved for a workspace tool shortcut.`); return; }
    const cleanAttributes = (labelForm.attributes || []).filter(a => a.name.trim()).map(a => ({ id: a.id || `attr-${Date.now()}-${Math.random().toString(36).slice(2,5)}`, name: a.name.trim(), type: a.type || "Text", options: a.type === "Select" ? (a.options || "").split(",").map(o => o.trim()).filter(Boolean) : [], required: !!a.required }));
    setProjectConfigs(prev => {
      const cfg = prev[configProject] || currentConfig;
      const duplicateShortcut = shortcut && cfg.labels.some(l => l.id !== editingLabelId && (l.shortcut || "").toLowerCase() === shortcut);
      if (duplicateShortcut) { setLabelSchemaError(`Shortcut "${shortcut.toUpperCase()}" is already used by another label.`); return prev; }
      setLabelSchemaError("");
      const payload = { name, color: labelForm.color, type: labelForm.type, parentId: labelForm.parentId || null, groupId: labelForm.groupId || null, shortcut: shortcut || null, attributes: cleanAttributes };
      const nextLabels = editingLabelId
        ? cfg.labels.map(l => l.id === editingLabelId ? { ...l, ...payload } : l)
        : [...cfg.labels, { id: `${configProject}-label-${Date.now()}`, ...payload }];
      return { ...prev, [configProject]: { ...cfg, labels: nextLabels } };
    });
    if (labelSchemaError) return;
    setLabelEditorOpen(false);
    setConfigMessage(editingLabelId ? "Label updated" : "Label added");
    setTimeout(() => setConfigMessage(""), 2200);
  };
  const deleteProjectLabel = async (labelId) => {
    const childCount = currentConfig.labels.filter(l => l.parentId === labelId).length;
    if (childCount && !(await confirmAction(`This label has ${childCount} child label${childCount===1?"":"s"}. Delete it and promote its children to top-level?`, { title: "Delete label", confirmLabel: "Delete label" }))) return;
    setProjectConfigs(prev => ({ ...prev, [configProject]: { ...currentConfig, labels: currentConfig.labels.filter(l => l.id !== labelId).map(l => l.parentId === labelId ? { ...l, parentId: null } : l) } }));
    setConfigMessage("Label removed");
    setTimeout(() => setConfigMessage(""), 2200);
  };

  // ---- Build 32: label groups ----
  function createLabelGroup(name) {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    const group = { id: `lg-${Date.now()}`, name: trimmed, color: labelPalette[(currentConfig.labelGroups?.length || 0) % labelPalette.length] };
    setProjectConfigs(prev => ({ ...prev, [configProject]: { ...currentConfig, labelGroups: [...(currentConfig.labelGroups || []), group] } }));
  }
  function renameLabelGroup(id, name) {
    setProjectConfigs(prev => ({ ...prev, [configProject]: { ...currentConfig, labelGroups: (currentConfig.labelGroups || []).map(g => g.id === id ? { ...g, name } : g) } }));
  }
  function deleteLabelGroup(id) {
    setProjectConfigs(prev => ({ ...prev, [configProject]: { ...currentConfig, labelGroups: (currentConfig.labelGroups || []).filter(g => g.id !== id), labels: currentConfig.labels.map(l => l.groupId === id ? { ...l, groupId: null } : l) } }));
  }

  // ---- Build 32: label schema versioning ----
  function saveLabelSchemaVersion(note) {
    const version = (currentConfig.schemaVersion || 1) + 1;
    const snapshot = { version: currentConfig.schemaVersion || 1, savedAt: new Date().toISOString(), labelCount: currentConfig.labels.length, note: note || "", labels: currentConfig.labels, labelGroups: currentConfig.labelGroups || [] };
    setProjectConfigs(prev => ({ ...prev, [configProject]: { ...currentConfig, schemaVersion: version, schemaHistory: [snapshot, ...(currentConfig.schemaHistory || [])].slice(0, 50) } }));
    setConfigMessage(`Saved as schema v${snapshot.version} — now editing v${version}`);
    setTimeout(() => setConfigMessage(""), 2400);
  }
  async function restoreLabelSchemaVersion(snapshot) {
    if (!(await confirmAction(`Restore schema v${snapshot.version}? This replaces the current label set (current labels are kept in history).`, { title: "Restore schema version", confirmLabel: "Restore", danger: false }))) return;
    const currentSnapshot = { version: currentConfig.schemaVersion || 1, savedAt: new Date().toISOString(), labelCount: currentConfig.labels.length, note: "Replaced by restore", labels: currentConfig.labels, labelGroups: currentConfig.labelGroups || [] };
    setProjectConfigs(prev => ({ ...prev, [configProject]: { ...currentConfig, labels: snapshot.labels, labelGroups: snapshot.labelGroups || [], schemaVersion: (currentConfig.schemaVersion || 1) + 1, schemaHistory: [currentSnapshot, ...(currentConfig.schemaHistory || [])].slice(0, 50) } }));
    setConfigMessage(`Restored schema v${snapshot.version}`);
    setTimeout(() => setConfigMessage(""), 2400);
  }

  // ---- Build 32: schema import / export ----
  function exportLabelSchema() {
    const payload = { exportedAt: new Date().toISOString(), projectName: (projectGroups.find(g => g.id === configProject) || {}).name || configProject, schemaVersion: currentConfig.schemaVersion || 1, labelGroups: currentConfig.labelGroups || [], labels: currentConfig.labels };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${(payload.projectName||"labels").toLowerCase().replace(/\s+/g,"-")}-label-schema-v${payload.schemaVersion}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function importLabelSchema(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const importedLabels = Array.isArray(parsed.labels) ? parsed.labels : [];
        if (!importedLabels.length) { setConfigMessage("Import failed: no labels found in file"); setTimeout(() => setConfigMessage(""), 2600); return; }
        const idPrefix = `${configProject}-import-${Date.now()}`;
        const idMap = {};
        const newLabels = importedLabels.map((l, i) => { const nid = `${idPrefix}-${i}`; idMap[l.id] = nid; return { id: nid, name: l.name || "Untitled", color: l.color || labelPalette[i % labelPalette.length], type: l.type || "Rectangle", parentId: l.parentId || null, groupId: l.groupId || null, shortcut: l.shortcut || null, attributes: l.attributes || [] }; });
        newLabels.forEach(l => { if (l.parentId) l.parentId = idMap[l.parentId] || null; });
        const groupIdMap = {};
        const newGroups = (Array.isArray(parsed.labelGroups) ? parsed.labelGroups : []).map((g, i) => { const nid = `${idPrefix}-grp-${i}`; groupIdMap[g.id] = nid; return { ...g, id: nid }; });
        newLabels.forEach(l => { if (l.groupId) l.groupId = groupIdMap[l.groupId] || null; });
        const currentSnapshot = { version: currentConfig.schemaVersion || 1, savedAt: new Date().toISOString(), labelCount: currentConfig.labels.length, note: "Replaced by import", labels: currentConfig.labels, labelGroups: currentConfig.labelGroups || [] };
        setProjectConfigs(prev => ({ ...prev, [configProject]: { ...currentConfig, labels: [...currentConfig.labels, ...newLabels], labelGroups: [...(currentConfig.labelGroups || []), ...newGroups], schemaVersion: (currentConfig.schemaVersion || 1) + 1, schemaHistory: [currentSnapshot, ...(currentConfig.schemaHistory || [])].slice(0, 50) } }));
        setConfigMessage(`Imported ${newLabels.length} label${newLabels.length===1?"":"s"}`);
        setTimeout(() => setConfigMessage(""), 2600);
      } catch (err) {
        setConfigMessage("Import failed: file isn't valid label schema JSON");
        setTimeout(() => setConfigMessage(""), 2600);
      }
    };
    reader.readAsText(file);
  }

  // ---- Build 32: label usage statistics ----
  const labelUsageStats = useMemo(() => {
    const groupProjectIds = new Set(projects.filter(p => p.groupId === configProject).map(p => p.id));
    const groupTaskIds = new Set(tasks.filter(t => groupProjectIds.has(t.projectId)).map(t => t.id));
    const counts = {};
    Object.entries(annotationsByTask).forEach(([taskId, list]) => {
      if (!groupTaskIds.has(taskId)) return;
      (list || []).forEach(a => { counts[a.labelId] = (counts[a.labelId] || 0) + 1; });
    });
    return counts;
  }, [projects, tasks, annotationsByTask, configProject]);
  const updateProjectConfig = (patch) => { setProjectConfigs(prev => ({ ...prev, [configProject]: { ...currentConfig, ...patch } })); setConfigMessage("Project configuration saved"); setTimeout(() => setConfigMessage(""), 2200); };

  // ---- Build 33: Workflow Automation ----
  function getGroupIdForTask(task) { return projects.find(p => p.id === task?.projectId)?.groupId || null; }
  function statusAuditActions(status) {
    switch (status) {
      case "Submitted": case "QA Review": return ["Task Submitted"];
      case "Rejected": case "Changes Requested": return ["QA Rejected"];
      case "Approved": return ["QA Approved"];
      case "Pending": return ["Task Unassigned"];
      default: return [];
    }
  }
  function getTaskStatusSince(task) {
    const actions = statusAuditActions(task.status);
    const match = auditEvents.find(e => e.taskId === task.id && actions.includes(e.action));
    return match?.timestamp || task.createdAt || new Date().toISOString();
  }

  function createAutomationRule(groupId) {
    const rule = { id: `rule-${Date.now()}`, name: "New rule", enabled: true, whenStatus: "Pending", afterHours: 0, action: "auto_assign", note: "" };
    setProjectConfigs(prev => ({ ...prev, [groupId]: { ...(prev[groupId] || makeDefaultProjectConfig({ id: groupId })), automationRules: [...(prev[groupId]?.automationRules || []), rule] } }));
    return rule.id;
  }
  function updateAutomationRule(groupId, ruleId, patch) {
    setProjectConfigs(prev => ({ ...prev, [groupId]: { ...prev[groupId], automationRules: (prev[groupId]?.automationRules || []).map(r => r.id === ruleId ? { ...r, ...patch } : r) } }));
  }
  function deleteAutomationRule(groupId, ruleId) {
    setProjectConfigs(prev => ({ ...prev, [groupId]: { ...prev[groupId], automationRules: (prev[groupId]?.automationRules || []).filter(r => r.id !== ruleId) } }));
  }
  function addSuggestedRule(groupId, template) {
    const rule = { id: `rule-${Date.now()}`, ...template };
    setProjectConfigs(prev => ({ ...prev, [groupId]: { ...(prev[groupId] || makeDefaultProjectConfig({ id: groupId })), automationRules: [...(prev[groupId]?.automationRules || []), rule] } }));
  }

  function runAutomationAction(rule, task) {
    const groupId = getGroupIdForTask(task);
    const group = projectGroups.find(g => g.id === groupId);
    const eligible = (role) => teamMembers.filter(m => m.status === "Active" && m.role === role && (!group?.teamIds?.length || group.teamIds.includes(m.id)));
    switch (rule.action) {
      case "auto_assign": {
        if (task.assigneeId) return;
        const pool = eligible("Annotator");
        if (!pool.length) return;
        const counts = Object.fromEntries(pool.map(m => [m.id, tasks.filter(t => t.assigneeId === m.id && ["Pending", "In Progress"].includes(t.status)).length]));
        const target = [...pool].sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0))[0];
        assignTask(task.id, target.id);
        pushNotification("Assignment", "Auto-assigned by workflow", `${task.name} was auto-assigned to ${target.name} by rule "${rule.name}".`, task.projectId, task.id);
        break;
      }
      case "auto_route_qa": {
        const pool = eligible("Reviewer");
        if (!pool.length) return;
        const counts = Object.fromEntries(pool.map(m => [m.id, tasks.filter(t => t.reviewerId === m.id && ["Submitted", "QA Review"].includes(t.status)).length]));
        const target = [...pool].sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0))[0];
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, reviewerId: target.id } : t));
        syncUpdate("tasks", task.id, { reviewer_id: target.id });
        logAudit("Task Routed to QA", task.id, task.projectId, `Routed to reviewer ${target.name} by rule "${rule.name}".`);
        pushNotification("QA", "Routed for review", `${task.name} was routed to ${target.name} for QA by rule "${rule.name}".`, task.projectId, task.id);
        break;
      }
      case "auto_route_rework": {
        if (!task.assigneeId) { runAutomationAction({ ...rule, action: "auto_assign" }, task); return; }
        const assignee = teamMembers.find(m => m.id === task.assigneeId);
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: "In Progress" } : t));
        syncUpdate("tasks", task.id, { status: "In Progress" });
        logAudit("Task Routed for Rework", task.id, task.projectId, `Sent back to ${assignee?.name || "annotator"} by rule "${rule.name}".`);
        pushNotification("Rework", "Rework routed", `${task.name} was sent back to ${assignee?.name || "the assignee"} for rework.`, task.projectId, task.id);
        break;
      }
      case "escalate": {
        const owner = teamMembers.find(m => m.id === group?.ownerId);
        logAudit("Task Escalated", task.id, task.projectId, `Escalated after sitting in "${task.status}" past the threshold for rule "${rule.name}".`);
        pushNotification("Alert", "Task escalated", `${task.name} has been stuck in ${task.status}${owner ? ` — escalated to ${owner.name}` : " and was escalated"}.`, task.projectId, task.id);
        break;
      }
      case "auto_complete": {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: "Completed" } : t));
        syncUpdate("tasks", task.id, { status: "Completed" });
        logAudit("Task Completed", task.id, task.projectId, `Auto-completed by rule "${rule.name}".`);
        pushNotification("System", "Task completed", `${task.name} was automatically marked complete.`, task.projectId, task.id);
        break;
      }
      case "notify": {
        pushNotification("System", rule.name || "Workflow notification", rule.note || `${task.name} matched workflow rule "${rule.name}".`, task.projectId, task.id);
        break;
      }
      default: break;
    }
  }

  // Immediate rules: fire once when a task's status transitions into rule.whenStatus.
  const prevTaskStatusRef = useRef({});
  useEffect(() => {
    const prevMap = prevTaskStatusRef.current;
    tasks.forEach(task => {
      const prevStatus = prevMap[task.id];
      if (prevStatus !== undefined && prevStatus !== task.status) {
        const groupId = getGroupIdForTask(task);
        const rules = (projectConfigs[groupId]?.automationRules || []).filter(r => r.enabled && r.whenStatus === task.status && (!r.afterHours || r.afterHours <= 0));
        rules.forEach(rule => runAutomationAction(rule, task));
      }
    });
    const nextMap = {};
    tasks.forEach(t => { nextMap[t.id] = t.status; });
    prevTaskStatusRef.current = nextMap;
  }, [tasks]);

  // Time-based rules (escalation, auto-complete): checked periodically against
  // how long a task has sat in its current status, derived from the audit log.
  const firedTimedRulesRef = useRef(new Set());
  useEffect(() => {
    const check = () => {
      tasks.forEach(task => {
        const groupId = getGroupIdForTask(task);
        const rules = (projectConfigs[groupId]?.automationRules || []).filter(r => r.enabled && r.whenStatus === task.status && r.afterHours > 0);
        rules.forEach(rule => {
          const since = getTaskStatusSince(task);
          const key = `${task.id}:${rule.id}:${since}`;
          if (firedTimedRulesRef.current.has(key)) return;
          const hoursElapsed = (Date.now() - new Date(since).getTime()) / 3600000;
          if (hoursElapsed >= rule.afterHours) {
            firedTimedRulesRef.current.add(key);
            runAutomationAction(rule, task);
          }
        });
      });
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [tasks, projectConfigs, auditEvents]);

  // ---- Build 34: SLA & Deadline Management ----
  const OPEN_TASK_STATUSES = ["Pending", "In Progress", "Submitted", "QA Review", "Rejected", "Changes Requested"];
  function getGroupConfig(groupId) { return projectConfigs[groupId] || makeDefaultProjectConfig({ id: groupId }); }
  function taskSlaHours(task, config) { return ["Submitted", "QA Review"].includes(task.status) ? (config.reviewerSlaHours ?? 12) : (config.annotatorSlaHours ?? 24); }
  function taskDeadline(task) {
    if (!OPEN_TASK_STATUSES.includes(task.status)) return null;
    if (task.dueDate) return new Date(task.dueDate).getTime();
    const config = getGroupConfig(getGroupIdForTask(task));
    const since = new Date(getTaskStatusSince(task)).getTime();
    return since + taskSlaHours(task, config) * 3600000;
  }
  function taskHoursOverdue(task) { const dl = taskDeadline(task); return dl === null ? 0 : Math.max(0, (Date.now() - dl) / 3600000); }
  function taskAgingHours(task) { return Math.max(0, (Date.now() - new Date(getTaskStatusSince(task)).getTime()) / 3600000); }
  function setTaskDueDate(taskId, dateStr) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, dueDate: dateStr || null } : t));
    syncUpdate("tasks", taskId, { due_date: dateStr || null });
  }
  function escalateTaskNow(task) {
    const groupId = getGroupIdForTask(task);
    const group = projectGroups.find(g => g.id === groupId);
    const owner = teamMembers.find(m => m.id === group?.ownerId);
    logAudit("Task Escalated", task.id, task.projectId, "Manually escalated from the Deadlines dashboard.");
    pushNotification("Alert", "Task escalated", `${task.name} was escalated${owner ? ` to ${owner.name}` : ""}.`, task.projectId, task.id);
    fireWebhooks("task.escalated", { taskId: task.id, taskName: task.name, projectId: task.projectId, escalatedTo: owner?.name || null, manual: true });
  }

  const slaAlertedRef = useRef(new Set());
  const slaEscalatedRef = useRef(new Set());
  useEffect(() => {
    const check = () => {
      tasks.forEach(task => {
        if (!OPEN_TASK_STATUSES.includes(task.status)) return;
        const groupId = getGroupIdForTask(task);
        const config = getGroupConfig(groupId);
        const overdueHours = taskHoursOverdue(task);
        if (overdueHours <= 0) return;
        const since = getTaskStatusSince(task);
        const alertKey = `${task.id}:${since}`;
        if (!slaAlertedRef.current.has(alertKey)) {
          slaAlertedRef.current.add(alertKey);
          logAudit("Task Overdue", task.id, task.projectId, `Passed its SLA deadline (${taskSlaHours(task, config)}h target).`);
          pushNotification("Alert", "SLA breached", `${task.name} is now overdue.`, task.projectId, task.id);
          fireWebhooks("sla.breach", { taskId: task.id, taskName: task.name, projectId: task.projectId, status: task.status });
        }
        const escalateAfter = config.escalateAfterHours ?? 24;
        if (overdueHours >= escalateAfter) {
          const escKey = `${alertKey}:esc`;
          if (!slaEscalatedRef.current.has(escKey)) {
            slaEscalatedRef.current.add(escKey);
            const group = projectGroups.find(g => g.id === groupId);
            const owner = teamMembers.find(m => m.id === group?.ownerId);
            logAudit("Task Escalated", task.id, task.projectId, `Escalated — ${overdueHours.toFixed(1)}h past its SLA deadline.`);
            pushNotification("Alert", "Task escalated (SLA)", `${task.name} is ${overdueHours.toFixed(1)}h overdue${owner ? ` — escalated to ${owner.name}` : ""}.`, task.projectId, task.id);
            fireWebhooks("task.escalated", { taskId: task.id, taskName: task.name, projectId: task.projectId, escalatedTo: owner?.name || null, overdueHours, manual: false });
          }
        }
      });
      projects.forEach(p => {
        if (!p.dueDate) return;
        const total = Number(p.totalImages) || 0, completed = Number(p.completedImages) || 0;
        if (total && completed >= total) return;
        if (Date.now() <= new Date(p.dueDate).getTime()) return;
        const key = `project:${p.id}:${p.dueDate}`;
        if (slaAlertedRef.current.has(key)) return;
        slaAlertedRef.current.add(key);
        logAudit("Project Overdue", null, p.id, `Passed its due date (${p.dueDate}).`);
        pushNotification("Alert", "Project deadline passed", `${p.name} passed its due date and isn't complete yet.`, p.id, null);
      });
    };
    check();
    const id = setInterval(check, 120000);
    return () => clearInterval(id);
  }, [tasks, projects, projectConfigs]);

  const deadlineOverview = useMemo(() => {
    const now = Date.now();
    const rows = tasks.filter(t => OPEN_TASK_STATUSES.includes(t.status)).map(t => {
      const groupId = getGroupIdForTask(t);
      const config = getGroupConfig(groupId);
      const deadline = taskDeadline(t);
      const overdueHours = deadline !== null ? Math.max(0, (now - deadline) / 3600000) : 0;
      const agingHours = taskAgingHours(t);
      return { task: t, groupId, deadline, overdueHours, agingHours, isOverdue: deadline !== null && now > deadline, slaHours: taskSlaHours(t, config) };
    });
    const overdue = rows.filter(r => r.isOverdue).sort((a, b) => b.overdueHours - a.overdueHours);
    const dueToday = rows.filter(r => !r.isOverdue && r.deadline && (r.deadline - now) <= 24 * 3600000);
    const dueWeek = rows.filter(r => !r.isOverdue && r.deadline && (r.deadline - now) <= 7 * 24 * 3600000);
    const agingBuckets = [
      { label: "0–24h", count: rows.filter(r => r.agingHours < 24).length },
      { label: "24–48h", count: rows.filter(r => r.agingHours >= 24 && r.agingHours < 48).length },
      { label: "48–72h", count: rows.filter(r => r.agingHours >= 48 && r.agingHours < 72).length },
      { label: "72h+", count: rows.filter(r => r.agingHours >= 72).length }
    ];
    let compliant = 0, measured = 0;
    tasks.filter(t => ["Approved", "Completed"].includes(t.status)).forEach(t => {
      const submitEvt = auditEvents.find(e => e.taskId === t.id && e.action === "Task Submitted");
      const approveEvt = auditEvents.find(e => e.taskId === t.id && e.action === "QA Approved");
      if (!submitEvt || !approveEvt) return;
      measured++;
      const config = getGroupConfig(getGroupIdForTask(t));
      const hoursTaken = (new Date(approveEvt.timestamp) - new Date(submitEvt.timestamp)) / 3600000;
      if (hoursTaken <= (config.reviewerSlaHours ?? 12)) compliant++;
    });
    const slaCompliance = measured ? Math.round((compliant / measured) * 100) : null;
    const upcomingProjects = projects.filter(p => p.dueDate).map(p => ({ project: p, daysLeft: Math.ceil((new Date(p.dueDate).getTime() - now) / 86400000), progress: progressOf(p) })).sort((a, b) => a.daysLeft - b.daysLeft);
    return { rows, overdue, dueToday, dueWeek, agingBuckets, slaCompliance, measured, upcomingProjects };
  }, [tasks, projects, projectConfigs, projectGroups, auditEvents]);

  // ---- Build 35: Advanced QA & Quality Scoring ----
  function createQaCriterion(groupId) {
    const criterion = { id: `crit-${Date.now()}`, name: "New criterion", weight: 10 };
    setProjectConfigs(prev => ({ ...prev, [groupId]: { ...(prev[groupId] || makeDefaultProjectConfig({ id: groupId })), qaCriteria: [...(prev[groupId]?.qaCriteria || []), criterion] } }));
  }
  function updateQaCriterion(groupId, id, patch) {
    setProjectConfigs(prev => ({ ...prev, [groupId]: { ...prev[groupId], qaCriteria: (prev[groupId]?.qaCriteria || []).map(c => c.id === id ? { ...c, ...patch } : c) } }));
  }
  function deleteQaCriterion(groupId, id) {
    setProjectConfigs(prev => ({ ...prev, [groupId]: { ...prev[groupId], qaCriteria: (prev[groupId]?.qaCriteria || []).filter(c => c.id !== id) } }));
  }
  function createErrorCategory(groupId) {
    const category = { id: `err-${Date.now()}`, name: "New error type", severity: "Minor" };
    setProjectConfigs(prev => ({ ...prev, [groupId]: { ...(prev[groupId] || makeDefaultProjectConfig({ id: groupId })), errorCategories: [...(prev[groupId]?.errorCategories || []), category] } }));
  }
  function updateErrorCategory(groupId, id, patch) {
    setProjectConfigs(prev => ({ ...prev, [groupId]: { ...prev[groupId], errorCategories: (prev[groupId]?.errorCategories || []).map(c => c.id === id ? { ...c, ...patch } : c) } }));
  }
  function deleteErrorCategory(groupId, id) {
    setProjectConfigs(prev => ({ ...prev, [groupId]: { ...prev[groupId], errorCategories: (prev[groupId]?.errorCategories || []).filter(c => c.id !== id) } }));
  }
  function addCalibrationEntry(groupId, taskId, goldScore, notes) {
    if (!taskId) return;
    const entry = { id: `cal-${Date.now()}`, taskId, goldScore: Math.max(0, Math.min(100, Number(goldScore) || 0)), notes: notes || "", addedAt: new Date().toISOString() };
    setProjectConfigs(prev => ({ ...prev, [groupId]: { ...(prev[groupId] || makeDefaultProjectConfig({ id: groupId })), calibrationSet: [...(prev[groupId]?.calibrationSet || []), entry] } }));
  }
  function deleteCalibrationEntry(groupId, id) {
    setProjectConfigs(prev => ({ ...prev, [groupId]: { ...prev[groupId], calibrationSet: (prev[groupId]?.calibrationSet || []).filter(e => e.id !== id) } }));
  }

  function weightedQaScore(criteria, criteriaScores) {
    if (!criteria?.length || !criteriaScores) return null;
    const totalWeight = criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0) || 1;
    const weighted = criteria.reduce((s, c) => s + ((criteriaScores[c.id] ?? 100) * (Number(c.weight) || 0)), 0);
    return Math.round(weighted / totalWeight);
  }

  // Sampling: when a task first becomes Submitted, decide whether it needs full QA
  // or can be auto-approved outside the review sample, based on the project's sampling rate.
  const samplingProcessedRef = useRef(new Set());
  useEffect(() => {
    tasks.forEach(task => {
      if (task.status !== "Submitted") return;
      if (qaReviews[task.id]) return;
      const groupId = getGroupIdForTask(task);
      const config = getGroupConfig(groupId);
      const rate = config.samplingRate ?? 100;
      if (rate >= 100) return;
      const key = task.id;
      if (samplingProcessedRef.current.has(key)) return;
      samplingProcessedRef.current.add(key);
      if (Math.random() * 100 >= rate) {
        const now = new Date().toISOString();
        const review = { decision: "Approved", score: null, reason: "", comment: "Outside QA sample — auto-approved.", reviewer: "System", reviewedAt: now, annotationCount: (annotationsByTask[task.id] || []).length, criteriaScores: {}, errors: [], history: [{ decision: "Approved", score: null, reason: "", comment: "Auto-approved (sampling)", reviewer: "System", reviewedAt: now }] };
        setQaReviews(prev => ({ ...prev, [task.id]: review }));
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: "Approved" } : t));
        syncUpdate("tasks", task.id, { status: "Approved" });
        logAudit("QA Sampling Skip", task.id, task.projectId, `Outside the ${rate}% QA sample — auto-approved.`, "System", "Automation");
        if (session) supabase.from("qa_reviews").upsert({ task_id: task.id, decision: review.decision, score: review.score, reviewer: review.reviewer, comment: review.comment, reason: review.reason, annotation_count: review.annotationCount, criteria_scores: {}, errors: [], history: review.history, reviewed_at: review.reviewedAt }).then(({ error }) => { if (error) console.warn("[Cloud] qa_reviews upsert failed:", error.message); });
      }
    });
  }, [tasks, projectConfigs]);

  // Quality analytics: trends, rankings, agreement, calibration drift — computed
  // once per relevant change rather than re-derived inline in the page component.
  const qualityAnalytics = useMemo(() => {
    const reviewEntries = Object.entries(qaReviews).map(([taskId, r]) => ({ taskId, task: tasks.find(t => t.id === taskId), ...r }));
    const scored = reviewEntries.filter(r => r.score !== null && r.score !== undefined);

    // Quality trend: weekly average score over the last 8 weeks
    const now = Date.now();
    const weeks = Array.from({ length: 8 }, (_, i) => 7 - i).map(weeksAgo => {
      const end = now - weeksAgo * 7 * 86400000;
      const start = end - 7 * 86400000;
      const inWeek = scored.filter(r => { const t = new Date(r.reviewedAt).getTime(); return t >= start && t < end; });
      const avg = inWeek.length ? Math.round(inWeek.reduce((s, r) => s + r.score, 0) / inWeek.length) : null;
      return { label: new Date(end).toLocaleDateString(undefined, { month: "short", day: "numeric" }), avg, count: inWeek.length };
    });

    // Annotator quality ranking
    const annotators = teamMembers.filter(m => m.role === "Annotator");
    const annotatorStats = annotators.map(m => {
      const mine = reviewEntries.filter(r => r.task && r.task.assigneeId === m.id);
      const mineScored = mine.filter(r => r.score !== null && r.score !== undefined);
      const approved = mine.filter(r => r.decision === "Approved").length;
      const errorCount = mine.reduce((s, r) => s + (r.errors?.length || 0), 0);
      return {
        member: m, reviewCount: mine.length,
        avgScore: mineScored.length ? Math.round(mineScored.reduce((s, r) => s + r.score, 0) / mineScored.length) : null,
        approvalRate: mine.length ? Math.round((approved / mine.length) * 100) : null,
        errorCount
      };
    }).filter(a => a.reviewCount > 0).sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1));

    // Reviewer performance
    const reviewerNames = [...new Set(reviewEntries.map(r => r.reviewer).filter(Boolean))];
    const reviewerStats = reviewerNames.map(name => {
      const mine = reviewEntries.filter(r => r.reviewer === name);
      const mineScored = mine.filter(r => r.score !== null && r.score !== undefined);
      const rejected = mine.filter(r => r.decision === "Rejected").length;
      const turnarounds = mine.map(r => {
        const submitEvt = auditEvents.find(e => e.taskId === r.taskId && e.action === "Task Submitted");
        if (!submitEvt) return null;
        return (new Date(r.reviewedAt) - new Date(submitEvt.timestamp)) / 3600000;
      }).filter(h => h !== null && h >= 0);
      return {
        name, reviewCount: mine.length,
        avgScoreGiven: mineScored.length ? Math.round(mineScored.reduce((s, r) => s + r.score, 0) / mineScored.length) : null,
        rejectionRate: mine.length ? Math.round((rejected / mine.length) * 100) : null,
        avgTurnaroundHours: turnarounds.length ? (turnarounds.reduce((s, h) => s + h, 0) / turnarounds.length) : null
      };
    }).filter(r => r.name !== "System").sort((a, b) => b.reviewCount - a.reviewCount);

    // Reviewer agreement: among tasks reviewed more than once, how often every
    // round agreed with the final decision — a data-grounded proxy for inter-rater
    // consistency given the app's single-reviewer-per-round model.
    const multiReviewed = reviewEntries.filter(r => (r.history || []).length > 1);
    let agreeCount = 0;
    multiReviewed.forEach(r => { if ((r.history || []).every(h => h.decision === r.decision)) agreeCount++; });
    const agreementRate = multiReviewed.length ? Math.round((agreeCount / multiReviewed.length) * 100) : null;

    // Error category breakdown — resolved to names/severity here since each task's
    // group can define its own category set, so a raw categoryId isn't safe to
    // display without its owning config.
    const errorTally = {};
    reviewEntries.forEach(r => {
      if (!r.errors?.length || !r.task) return;
      const groupConfig = getGroupConfig(getGroupIdForTask(r.task));
      r.errors.forEach(e => {
        const cat = (groupConfig.errorCategories || []).find(c => c.id === e.categoryId);
        const name = cat?.name || "Unknown";
        const key = name;
        if (!errorTally[key]) errorTally[key] = { name, severity: cat?.severity || e.severity || "Minor", count: 0 };
        errorTally[key].count++;
      });
    });
    const errorTallyList = Object.values(errorTally).sort((a, b) => b.count - a.count);

    // Calibration drift per group
    const calibrationRows = [];
    projectGroups.forEach(g => {
      const config = projectConfigs[g.id];
      (config?.calibrationSet || []).forEach(entry => {
        const review = qaReviews[entry.taskId];
        calibrationRows.push({ group: g, entry, review, drift: review && review.score !== null && review.score !== undefined ? review.score - entry.goldScore : null });
      });
    });

    return { reviewEntries, scored, weeks, annotatorStats, reviewerStats, agreementRate, multiReviewedCount: multiReviewed.length, errorTally: errorTallyList, calibrationRows };
  }, [qaReviews, tasks, teamMembers, auditEvents, projectGroups, projectConfigs]);

  // ---- Build 37: Advanced Analytics & Reporting ----
  const reportingAnalytics = useMemo(() => {
    const now = Date.now();
    const DONE_STATUSES = ["Approved", "Completed"];

    // Throughput: tasks completed (Approved/Completed) per day over the last 30 days,
    // derived from the audit log so it reflects when work actually finished.
    const completionEvents = auditEvents.filter(e => e.action === "QA Approved" || e.action === "Task Completed");
    const throughputDays = Array.from({ length: 30 }, (_, i) => 29 - i).map(daysAgo => {
      const dayStart = now - daysAgo * 86400000;
      const dayEnd = dayStart + 86400000;
      const count = completionEvents.filter(e => { const t = new Date(e.timestamp).getTime(); return t >= dayStart - (dayStart % 86400000) && t < dayEnd; }).length;
      return { label: new Date(dayStart).toLocaleDateString(undefined, { month: "short", day: "numeric" }), count };
    });
    const last7 = throughputDays.slice(-7).reduce((s, d) => s + d.count, 0);
    const prev7 = throughputDays.slice(-14, -7).reduce((s, d) => s + d.count, 0);
    const throughputTrendPct = prev7 ? Math.round(((last7 - prev7) / prev7) * 100) : null;
    const dailyVelocity = last7 / 7;

    // Production
    const totalImages = tasks.length;
    const processedImages = tasks.filter(t => t.status !== "Pending").length;
    const totalAnnotationsCount = Object.values(annotationsByTask).reduce((s, l) => s + (l?.length || 0), 0);
    const avgAnnotationsPerTask = processedImages ? (totalAnnotationsCount / processedImages) : 0;

    // Team analytics: utilization per member across all roles
    const teamUtilization = teamMembers.filter(m => m.status === "Active").map(m => {
      const assigned = tasks.filter(t => t.assigneeId === m.id && ["Pending", "In Progress"].includes(t.status)).length;
      const capacity = Number(m.capacity) || 1;
      return { member: m, assigned, capacity, utilization: Math.round((assigned / capacity) * 100) };
    }).sort((a, b) => b.utilization - a.utilization);

    // Accuracy & rework, from QA review history
    const reviewed = Object.values(qaReviews);
    const finalApproved = reviewed.filter(r => r.decision === "Approved").length;
    const finalRejected = reviewed.filter(r => r.decision === "Rejected").length;
    const accuracyRate = (finalApproved + finalRejected) ? Math.round((finalApproved / (finalApproved + finalRejected)) * 100) : null;
    const firstPassApproved = reviewed.filter(r => r.decision === "Approved" && (r.history || []).length <= 1).length;
    const firstPassYield = reviewed.length ? Math.round((firstPassApproved / reviewed.length) * 100) : null;
    const reworkedCount = reviewed.filter(r => (r.history || []).length > 1).length;
    const reworkRate = reviewed.length ? Math.round((reworkedCount / reviewed.length) * 100) : null;

    // Forecasting: per active project, remaining work vs recent velocity
    const forecasts = projects.filter(p => (Number(p.completedImages) || 0) < (Number(p.totalImages) || 0)).map(p => {
      const projectTaskIds = new Set(tasks.filter(t => t.projectId === p.id).map(t => t.id));
      const recentCompletions = completionEvents.filter(e => projectTaskIds.has(e.taskId) && (now - new Date(e.timestamp).getTime()) <= 7 * 86400000).length;
      const velocity = recentCompletions / 7;
      const remaining = Math.max(0, (Number(p.totalImages) || 0) - (Number(p.completedImages) || 0));
      const daysLeft = velocity > 0 ? Math.ceil(remaining / velocity) : null;
      const projectedDate = daysLeft !== null ? new Date(now + daysLeft * 86400000) : null;
      return { project: p, remaining, velocity, daysLeft, projectedDate };
    }).sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));

    return { throughputDays, last7, prev7, throughputTrendPct, dailyVelocity, totalImages, processedImages, totalAnnotationsCount, avgAnnotationsPerTask, teamUtilization, accuracyRate, firstPassYield, reworkRate, reworkedCount, reviewedCount: reviewed.length, forecasts };
  }, [tasks, projects, teamMembers, qaReviews, auditEvents, annotationsByTask]);

  function exportCustomReport(sections, projectFilter, rangeDays) {
    const lines = [];
    const push = (row) => lines.push(row.map(v => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","));
    push([`AnnotatePro Custom Report — generated ${new Date().toLocaleString()}`]);
    push([`Project filter: ${projectFilter === "All" ? "All Projects" : projects.find(p => p.id === projectFilter)?.name || projectFilter}`, `Range: last ${rangeDays} days`]);
    push([]);
    if (sections.production) {
      push(["PRODUCTION"]);
      push(["Total Images", reportingAnalytics.totalImages]);
      push(["Processed Images", reportingAnalytics.processedImages]);
      push(["Total Annotations", reportingAnalytics.totalAnnotationsCount]);
      push(["Avg Annotations / Task", reportingAnalytics.avgAnnotationsPerTask.toFixed(2)]);
      push(["Throughput (last 7 days)", reportingAnalytics.last7]);
      push([]);
    }
    if (sections.team) {
      push(["TEAM UTILIZATION"]);
      push(["Name", "Role", "Assigned", "Capacity", "Utilization %"]);
      reportingAnalytics.teamUtilization.forEach(u => push([u.member.name, u.member.role, u.assigned, u.capacity, u.utilization]));
      push([]);
    }
    if (sections.qa) {
      push(["QA & QUALITY"]);
      push(["Accuracy Rate %", reportingAnalytics.accuracyRate ?? "—"]);
      push(["First-Pass Yield %", reportingAnalytics.firstPassYield ?? "—"]);
      push(["Rework Rate %", reportingAnalytics.reworkRate ?? "—"]);
      push(["Reviewer Agreement %", qualityAnalytics.agreementRate ?? "—"]);
      push([]);
      push(["Annotator", "Reviews", "Avg Score", "Approval Rate %"]);
      qualityAnalytics.annotatorStats.forEach(a => push([a.member.name, a.reviewCount, a.avgScore ?? "—", a.approvalRate ?? "—"]));
      push([]);
      push(["Reviewer", "Reviews", "Avg Score Given", "Rejection Rate %", "Avg Turnaround (h)"]);
      qualityAnalytics.reviewerStats.forEach(r => push([r.name, r.reviewCount, r.avgScoreGiven ?? "—", r.rejectionRate ?? "—", r.avgTurnaroundHours !== null ? r.avgTurnaroundHours.toFixed(1) : "—"]));
      push([]);
    }
    if (sections.sla) {
      push(["SLA & DEADLINES"]);
      push(["Overdue Tasks", deadlineOverview.overdue.length]);
      push(["Due Today", deadlineOverview.dueToday.length]);
      push(["Due This Week", deadlineOverview.dueWeek.length]);
      push(["SLA Compliance %", deadlineOverview.slaCompliance ?? "—"]);
      push([]);
    }
    if (sections.forecast) {
      push(["FORECASTING"]);
      push(["Project", "Remaining Images", "Velocity /day", "Est. Days Left", "Projected Completion"]);
      reportingAnalytics.forecasts.forEach(f => push([f.project.name, f.remaining, f.velocity.toFixed(1), f.daysLeft ?? "—", f.projectedDate ? f.projectedDate.toLocaleDateString() : "—"]));
      push([]);
    }
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `annotatepro-report-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    logAudit("Custom Report Exported", null, projectFilter === "All" ? null : projectFilter, `Sections: ${Object.entries(sections).filter(([,v])=>v).map(([k])=>k).join(", ")}`);
  }




  if (authLoading) {
    return <div className="auth-loading-screen"><div className="brand-mark"><Grid3X3 size={22}/></div><RefreshCw size={20} className="mig-spin"/><span>Loading AnnotatePro...</span></div>;
  }
  if (!session) {
    return <AuthScreen/>;
  }
  if (passwordRecovery) {
    return <UpdatePasswordScreen onDone={() => setPasswordRecovery(false)}/>;
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Grid3X3 size={20} /></div>
          <div><strong>AnnotatePro</strong><span>Annotation Platform</span></div>
        </div>

        <div className="workspace-switcher">
          <span>WORKSPACE</span>
          <button><div className="workspace-avatar">A</div><div><b>Annotation Team</b><small>Production Workspace</small></div><ChevronDown size={15} /></button>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-label">MAIN MENU</p>
          {navItems.map(([name, Icon]) => (
            <button key={name} className={`nav-item ${activePage === name ? "active" : ""}`} onClick={() => navigate(name)}>
              <Icon size={18} /><span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="online-status"><span></span> System operational</div>
          <div className="user-card">
            <div className="user-avatar">{currentUserInitial}</div>
            <div><b>{currentUserName}</b><span>{currentUserEmail}</span></div>
            <button className="sidebar-signout" title="Sign out" aria-label="Sign out" onClick={signOut}><LogOut size={16}/></button>
          </div>
        </div>
      </aside>

      <main className="main-area" id="main-content" tabIndex={-1}>
        <header className="topbar">
          <button aria-label="Toggle menu" className="mobile-menu" onClick={() => setSidebarOpen(v => !v)}><Menu size={21} /></button>
          <div className="breadcrumb">
            {activePage === "Annotation Workspace"
              ? <><button className="crumb-link" onClick={() => navigate("Projects")}>Projects</button><b>/</b><span>{projects.find(p => p.id === workspaceProject)?.name || "Tasks"}</span><b>/</b><strong>{workstationMode}</strong></>
              : <><span>AnnotatePro</span><b>/</b><strong>{activePage}</strong></>}
          </div>
          <div className="top-actions">
            <button className="global-search" onClick={() => setCommandOpen(true)}><Search size={17} /><span>Search…</span><kbd>{navigator.platform?.toLowerCase().includes("mac") ? "⌘K" : "Ctrl K"}</kbd></button>
            {onlineUsers.length > 0 && <div className="presence-stack" title={onlineUsers.map(u=>u.name).join(", ")}>
              {onlineUsers.slice(0,4).map(u => <div key={u.user_id} className="member-avatar small presence-avatar">{initials(u.name)}</div>)}
              {onlineUsers.length > 4 && <div className="member-avatar small presence-avatar">+{onlineUsers.length-4}</div>}
              <span className="presence-count">{onlineUsers.length} online</span>
            </div>}
            <button className="icon-btn notification-trigger" onClick={() => navigate("Notifications")}><Bell size={19} />{notifications.filter(n=>!n.read).length > 0 && <i>{notifications.filter(n=>!n.read).length > 9 ? "9+" : notifications.filter(n=>!n.read).length}</i>}</button>
            <div className="profile-wrap">
              <button className="profile-button" onClick={() => setProfileOpen(v => !v)}><div className="tiny-avatar">{currentUserInitial}</div><span>{currentUserName}</span><ChevronDown size={15} /></button>
              {profileOpen && <div className="profile-menu"><b>{currentUserName}</b><span>{currentUserEmail}</span><hr /><button onClick={() => { setProfileOpen(false); navigate("Settings"); }}><Settings size={15}/> Settings</button><button onClick={signOut}><LogOut size={15}/> Sign out</button></div>}
            </div>
          </div>
        </header>

        {activePage === "Dashboard" && <Dashboard projects={projects} tasks={tasks} teamMembers={teamMembers} qaReviews={qaReviews} auditEvents={auditEvents} stats={dashboardStats} reporting={reportingAnalytics} quality={qualityAnalytics} deadlines={deadlineOverview} onCreate={openCreateGroup} onNavigate={navigate} onOpenWorkstation={openWorkstation} userName={currentUserName}
          layouts={dashboardLayouts} activeLayoutId={activeDashboardLayoutId} setActiveLayoutId={setActiveDashboardLayoutId} editing={dashboardEditing} setEditing={setDashboardEditing}
          onToggleWidget={toggleDashboardWidget} onMoveWidget={moveDashboardWidget} onSaveLayoutAs={saveDashboardLayoutAs} onDeleteLayout={deleteDashboardLayout} onRenameLayout={renameDashboardLayout}
        />}
        {activePage === "Projects" && <ProjectsPage groups={projectGroups} projects={filteredProjects} teamMembers={teamMembers} projectConfigs={projectConfigs} auditEvents={auditEvents} search={projectSearch} setSearch={setProjectSearch} filter={projectStatusFilter} setFilter={setProjectStatusFilter} onCreate={openCreateProject} onEdit={openEditProject} onDelete={deleteProject} onDetails={setProjectDetails} onWorkspace={(id) => openWorkstation(id, "Annotation")} onReview={(id) => openWorkstation(id, "Review")} onPlanner={openTaskPlanner} onTaskSettings={(id) => { setTaskSettingsId(id); setImportTaskId(id); setExportProject(id); setTaskSettingsTab("General"); navigate("Task Settings"); }} onCreateGroup={openCreateGroup} onEditGroup={openEditGroup} onDeleteGroup={deleteGroup} onDuplicateGroup={duplicateGroup} onArchiveGroup={archiveGroup} onRestoreGroup={restoreGroup} onOpenConfig={(groupId) => { setConfigProject(groupId); navigate("Project Configuration"); }} groupMessage={groupMessage} canManage={canManage} canEditProject={canEditProject} />}
        {activePage === "Project Configuration" && <ProjectConfigurationPage groups={projectGroups} flatProjects={projects} tasks={tasks} configProject={configProject} setConfigProject={setConfigProject} config={currentConfig} tab={configTab} setTab={setConfigTab} onAddLabel={openCreateLabel} onEditLabel={openEditLabel} onDeleteLabel={deleteProjectLabel} onUpdateConfig={updateProjectConfig} onUpdateProject={updateGroupMeta} onBack={()=>navigate("Projects")} message={configMessage} labelEditorOpen={labelEditorOpen} setLabelEditorOpen={setLabelEditorOpen} editingLabelId={editingLabelId} labelForm={labelForm} setLabelForm={setLabelForm} onSaveLabel={saveProjectLabel} labelSchemaError={labelSchemaError} setLabelSchemaError={setLabelSchemaError}
          onCreateLabelGroup={createLabelGroup} onRenameLabelGroup={renameLabelGroup} onDeleteLabelGroup={deleteLabelGroup}
          onSaveSchemaVersion={saveLabelSchemaVersion} onRestoreSchemaVersion={restoreLabelSchemaVersion}
          onExportSchema={exportLabelSchema} onImportSchema={importLabelSchema} labelUsageStats={labelUsageStats}
          teamMembers={teamMembers} onCreateRule={createAutomationRule} onUpdateRule={updateAutomationRule} onDeleteRule={deleteAutomationRule} onAddSuggestedRule={addSuggestedRule}
          onCreateCriterion={createQaCriterion} onUpdateCriterion={updateQaCriterion} onDeleteCriterion={deleteQaCriterion}
          onCreateErrorCategory={createErrorCategory} onUpdateErrorCategory={updateErrorCategory} onDeleteErrorCategory={deleteErrorCategory}
          onAddCalibration={addCalibrationEntry} onDeleteCalibration={deleteCalibrationEntry} qaReviews={qaReviews}
        />}
        {activePage === "Task Planner" && <TaskPlannerPage
          projects={projects} tasks={tasks} teamMembers={teamMembers} annotations={annotationsByTask} qaReviews={qaReviews}
          selectedProjectId={plannerProjectId} setSelectedProjectId={setPlannerProjectId} priority={plannerPriority} setPriority={setPlannerPriority}
          queue={plannerQueue} setQueue={setPlannerQueue} date={plannerDate} setDate={setPlannerDate}
          targets={plannerTargets} setTarget={setPlannerTarget} reworkFilter={plannerReworkFilter} setReworkFilter={setPlannerReworkFilter}
          selection={plannerReworkSelection} setSelection={setPlannerReworkSelection} onRework={applyPlannerRework} onRefresh={()=>flashPlanner("Task Planner refreshed")}
          onBack={()=>setPlannerProjectId(null)} onOpenWorkspace={(id)=>openWorkstation(id, "Annotation")} onOpenReview={(id)=>openWorkstation(id, "Review")}
          onAssign={openPlannerAssignment} onCloseAssignment={()=>setPlannerAssignmentOpen(false)} onSaveAssignment={savePlannerAssignments}
          assignmentOpen={plannerAssignmentOpen} assignmentTaskIds={plannerAssignmentTaskIds} assignmentAssignee={plannerAssignmentAssignee} setAssignmentAssignee={setPlannerAssignmentAssignee}
          assignmentReviewer={plannerAssignmentReviewer} setAssignmentReviewer={setPlannerAssignmentReviewer} assignmentPriority={plannerAssignmentPriority} setAssignmentPriority={setPlannerAssignmentPriority}
          assignmentQueue={plannerAssignmentQueue} setAssignmentQueue={setPlannerAssignmentQueue} message={plannerMessage}
        />}
        {activePage === "Workload" && <WorkloadPage
          projects={projects} rows={workloadRows} summary={workloadSummary} tasks={tasks}
          project={workloadFilter} setProject={setWorkloadFilter} projectOptions={workloadProjects}
          role={workloadRole} setRole={setWorkloadRole} capacityMode={workloadCapacityMode} setCapacityMode={setWorkloadCapacityMode}
          settings={workloadSettings} setSettings={setWorkloadSettings} onBalance={autoBalanceWorkload}
          onCapacity={updateMemberCapacity} message={workloadMessage} onOpenPlanner={openTaskPlanner}
        />}
        {activePage === "Annotation Workspace" && (
          <Workspace
            projects={projects} workspaceProject={workspaceProject} setWorkspaceProject={setWorkspaceProject}
            tasks={tasks} currentTask={currentTask} selectedTaskIndex={selectedTaskIndex} setSelectedTaskIndex={setSelectedTaskIndex}
            filteredTasks={filteredTasks} taskFilter={taskFilter} setTaskFilter={setTaskFilter}
            tool={tool} setTool={setTool} labels={labels} selectedLabel={selectedLabel} setSelectedLabel={setSelectedLabel}
            currentAnnotations={currentAnnotations} selectedAnnotationId={selectedAnnotationId} selectAnnotation={selectAnnotation}
            selectedAnnotation={currentAnnotations.find(a => a.id === selectedAnnotationId)}
            drawing={drawing} zoom={zoom} setZoom={setZoom} pan={pan} setPan={setPan}
            canvasRef={canvasRef} imageRef={imageRef} onCanvasPointerDown={onCanvasPointerDown} onCanvasPointerMove={onCanvasPointerMove}
            onCanvasPointerUp={onCanvasPointerUp} onCanvasDoubleClick={onCanvasDoubleClick} handleImageError={handleImageError}
            onDelete={deleteSelected} onDuplicate={duplicateSelected} onUndo={undo} onRedo={redo}
            onReset={resetView} onPrevious={() => changeTask(-1)} onNext={() => changeTask(1)}
            onSave={saveTask} onSubmit={submitTask} message={workspaceMessage}
            mode={workstationMode} setMode={setWorkstationMode} onSkip={skipTask}
            onAccept={() => reviewCurrentTask("Approved")} onReject={() => reviewCurrentTask("Rejected")}
            currentReview={currentTask ? qaReviews[currentTask.id] : null} canReview={canReview}
            onBackToTasks={() => navigate("Projects")}
            qaCriteria={(projectConfigs[getGroupIdForTask(currentTask||{})]||{}).qaCriteria || []}
            errorCategories={(projectConfigs[getGroupIdForTask(currentTask||{})]||{}).errorCategories || []}
            qaCriteriaScores={qaCriteriaScores} setQaCriteriaScores={setQaCriteriaScores}
            qaErrors={qaErrors} setQaErrors={setQaErrors}
            qaScorecardOpen={qaScorecardOpen} setQaScorecardOpen={setQaScorecardOpen}
            onAcceptPrediction={acceptPrediction} onRejectPrediction={rejectPrediction} onAcceptAllPredictions={acceptAllPredictions} onRejectAllPredictions={rejectAllPredictions}
            suggestedIds={currentTask ? suggestedLabelIds(currentTask.datasetId, (projectConfigs[getGroupIdForTask(currentTask)]||{}).labels || []) : []}
            updateAnnotation={updateAnnotation} startAnnotationEdit={startAnnotationEdit} showShortcuts={showShortcuts} setShowShortcuts={setShowShortcuts}
            onImport={() => imageInputRef.current?.click()}
            imageInputRef={imageInputRef} importImages={importImages}
            insertVertex={insertVertex} deleteVertex={deleteVertex} selectedIds={selectedIds} marquee={marquee}
            onToggleVisible={toggleAnnotationVisible} onToggleLock={toggleAnnotationLock} onReorder={moveAnnotationOrder}
            coEditors={coEditors}
          />
        )}
        {activePage === "Team" && <TeamPage
          members={teamFilteredMembers} allMembers={teamMembers} projects={projects} tasks={tasks}
          stats={teamStats} search={teamSearch} setSearch={setTeamSearch}
          roleFilter={teamRoleFilter} setRoleFilter={setTeamRoleFilter}
          statusFilter={teamStatusFilter} setStatusFilter={setTeamStatusFilter}
          onCreate={openCreateMember} onEdit={openEditMember} onToggleStatus={toggleMemberStatus} onDelete={deleteMember}
          onAssign={assignTask} message={teamMessage} modalOpen={teamModalOpen} setModalOpen={setTeamModalOpen}
          editing={!!editingMemberId} form={teamForm} setForm={setTeamForm} onSave={saveMember}
          onInvite={inviteTeamMember} onSendReset={sendPasswordReset} accountActionStatus={accountActionStatus} isAdmin={isAdmin}
        />}
        {activePage === "QA & Reviews" && <QAReviews tasks={tasks} queue={qaQueue} stats={qaStats} selectedTask={qaSelectedTask} selectedAnnotations={qaSelectedAnnotations} selectedReview={qaSelectedReview} search={qaSearch} setSearch={setQaSearch} filter={qaFilter} setFilter={setQaFilter} score={qaScore} setScore={setQaScore} reason={qaReason} setReason={setQaReason} comment={qaComment} setComment={setQaComment} onSelect={selectQaTask} onReview={completeQaReview} message={qaMessage} reviews={qaReviews} canReview={canReview} /> }
        {activePage === "Analytics" && <AnalyticsPage projects={projects} tasks={tasks} annotations={annotationsByTask} qaReviews={qaReviews} auditEvents={auditEvents} range={analyticsRange} setRange={setAnalyticsRange} project={analyticsProject} setProject={setAnalyticsProject} onExport={exportCustomReport} />}
        {activePage === "Operations" && <OperationsPage projects={projects} tasks={tasks} teamMembers={teamMembers} qaReviews={qaReviews} exportHistory={exportHistory} search={operationsSearch} setSearch={setOperationsSearch} filter={operationsFilter} setFilter={setOperationsFilter} project={operationsProject} setProject={setOperationsProject} showUnread={operationsShowUnread} setShowUnread={setOperationsShowUnread} readMap={operationRead} setReadMap={setOperationRead} />}
        {activePage === "Deadlines" && <DeadlinesPage overview={deadlineOverview} projects={projects} teamMembers={teamMembers} onSetTaskDueDate={setTaskDueDate} onEscalate={escalateTaskNow} onOpenTask={(task) => openWorkstation(task.projectId, task.status === "Submitted" || task.status === "QA Review" ? "Review" : "Annotation", task.id)} />}
        {activePage === "QA & Quality" && <QaQualityPage analytics={qualityAnalytics} projectGroups={projectGroups} />}
        {activePage === "Reports" && <ReportsPage reporting={reportingAnalytics} quality={qualityAnalytics} deadlines={deadlineOverview} projects={projects} onExport={exportCustomReport} />}
        {activePage === "Audit Trail" && <AuditTrailPage events={auditEvents} projects={projects} tasks={tasks} teamMembers={teamMembers} search={auditSearch} setSearch={setAuditSearch} filter={auditFilter} setFilter={setAuditFilter} project={auditProject} setProject={setAuditProject} user={auditUser} setUser={setAuditUser} task={auditTask} setTask={setAuditTask} date={auditDate} setDate={setAuditDate} selectedTask={auditSelectedTask} setSelectedTask={setAuditSelectedTask} onClear={()=>setAuditEvents([])} onSeed={()=>{ setAuditEvents([]); window.setTimeout(()=>window.location.reload(), 50); }} /> }
        {activePage === "Notifications" && <NotificationsPage notifications={notifications} setNotifications={setNotifications} filter={notificationFilter} setFilter={setNotificationFilter} search={notificationSearch} setSearch={setNotificationSearch} tasks={tasks} projects={projects} teamMembers={teamMembers} />}
        {activePage === "Task Settings" && taskSettingsTask && <TaskSettingsPage
          task={taskSettingsTask} tab={taskSettingsTab} setTab={setTaskSettingsTab} subTab={taskSettingsSubTab} setSubTab={setTaskSettingsSubTab}
          onBack={() => navigate("Projects")} onEditTask={() => openEditProject(taskSettingsTask)}
          importProps={{projects, tasks, datasets, projectConfigs, importHistory, onClearHistory: () => setImportHistory([]), importTaskId, setImportTaskId, activeDatasetId, setActiveDatasetId, listSearch: datasetListSearch, setListSearch: setDatasetListSearch, listStatus: datasetListStatus, setListStatus: setDatasetListStatus, filteredTasks: datasetFilteredTasks, search: datasetSearch, setSearch: setDatasetSearch, status: datasetStatus, setStatus: setDatasetStatus, view: datasetView, setView: setDatasetView, onImport: (datasetId) => { setImportTargetDataset(datasetId); imageInputRef.current?.click(); }, onCsv: () => setImportOpen(true), onAdvImport: (datasetId) => { setImportTargetDataset(datasetId); resetAdvImportWizard(); setAdvImportOpen(true); }, onRemove: removeTask, onClear: clearDataset, onStatus: updateTaskStatus, onExport: exportTasksCsv, onCreateDataset: openCreateDataset, onEditDataset: openEditDataset, onArchiveDataset: archiveDataset, onRestoreDataset: restoreDataset, onDeleteDataset: deleteDataset, onSnapshotVersion: snapshotDatasetVersion, compareVersion, setCompareVersion}}
          exportProps={{tasks: exportTasks, allTasks: tasks, annotations: annotationsByTask, qaReviews, format: exportFormat, setFormat: setExportFormat, scope: exportScope, setScope: setExportScope, project: exportProject, setProject: setExportProject, projects, search: exportSearch, setSearch: setExportSearch, history: exportHistory, onExport: performExport, onClearHistory: clearExportHistory, message: exportMessage, scopedToTask: true}}
        />}
        {activePage === "Settings" && <SettingsPage settings={appSettings} tab={settingsTab} setTab={setSettingsTab} onUpdate={updateAppSetting} onReset={resetAppSettings} message={settingsMessage}
          migrationStatus={migrationStatus} migrationRunning={migrationRunning} onRunMigration={runMigration}
          verifyStatus={verifyStatus} verifying={verifying} onVerify={verifyMigrationCounts} lastMigratedAt={lastMigratedAt}
          migrationDomains={migrationDomains} migrationSingletons={migrationSingletons}
          imageMigration={imageMigration} onMigrateImages={migrateImagesToStorage}
          base64ImageCount={tasks.filter(t => t.image && t.image.startsWith("data:")).length}
          userName={currentUserName} userEmail={currentUserEmail} userInitial={currentUserInitial} onSignOut={signOut}
          isAdmin={isAdmin} roleProfiles={roleProfiles} rolesLoading={rolesLoading} onLoadRoles={loadRoleProfiles} onUpdateRole={updateProfileRole}
          apiTokens={apiTokens} onGenerateToken={generateApiToken} onRevokeToken={revokeApiToken} onDeleteToken={deleteApiToken}
          webhooks={webhooks} onCreateWebhook={createWebhook} onUpdateWebhook={updateWebhook} onDeleteWebhook={deleteWebhook} onTestWebhook={testWebhook}
          projects={projects} projectGroups={projectGroups} onImportMlPredictions={importMlPredictions} onExportProjectJson={exportProjectJson}
          errorLogEntries={errorLogEntries} onRefreshErrorLog={refreshErrorLog} onClearErrorLog={clearErrorLog}
          onExportBackup={exportWorkspaceBackup} onRestoreBackup={restoreWorkspaceBackup} onSignOutAllDevices={signOutAllDevices}
          onRunHealthCheck={runHealthCheck} />}

        <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={e => { importImages(e.target.files); e.target.value=""; }} />
        {datasetToast && <div className="workspace-toast"><CheckCircle2 size={17}/>{datasetToast}</div>}
      </main>

      {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} getResults={getSearchResults} quickActions={quickActions} recentItems={recentItems} favoriteItems={favoriteItems} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} onSelect={openSearchResult} />}
      {confirmState && <ConfirmDialog {...confirmState} onConfirm={() => resolveConfirm(true)} onCancel={() => resolveConfirm(false)} />}
      {projectModalOpen && <ProjectModal form={projectForm} setForm={setProjectForm} editing={!!editingProjectId} onClose={() => setProjectModalOpen(false)} onSave={saveProject} />}
      {groupModalOpen && <GroupModal form={groupForm} setForm={setGroupForm} editing={!!editingGroupId} onClose={() => setGroupModalOpen(false)} onSave={saveGroup} teamMembers={teamMembers} />}
      {datasetModalOpen && <DatasetModal form={datasetForm} setForm={setDatasetForm} editing={!!editingDatasetId} onClose={() => setDatasetModalOpen(false)} onSave={saveDataset} />}
      {projectDetails && <ProjectDetails project={projectDetails} onClose={() => setProjectDetails(null)} onEdit={() => { setProjectDetails(null); openEditProject(projectDetails); }} />}
      {importOpen && <ImportModal onClose={() => { setImportOpen(false); resetImportWizard(); }} onImport={() => { setImportOpen(false); resetImportWizard(); imageInputRef.current?.click(); }} step={importStep} setStep={setImportStep} fileName={importFileName} columns={importColumns} rows={importRows} mapping={importMapping} setMapping={setImportMapping} validation={importValidation} error={importError} duplicateMode={importDuplicateMode} setDuplicateMode={setImportDuplicateMode} datasets={datasets} projects={projects} targetDatasetId={importTargetDataset || datasets.find(d => d.projectId === importTaskId)?.id || datasets[0]?.id} setTargetDataset={setImportTargetDataset} onFile={handleStructuredFile} fileRef={structuredInputRef} onRun={runStructuredImport} />}
      {advImportOpen && <AdvancedImportModal onClose={() => { setAdvImportOpen(false); resetAdvImportWizard(); }} step={advImportStep} setStep={setAdvImportStep} kind={advImportKind} fileName={advImportFileName} parsed={advImportParsed} mapping={advImportMapping} setMapping={setAdvImportMapping} error={advImportError} progress={advImportProgress} running={advImportRunning} datasets={datasets} projects={projects} projectConfigs={projectConfigs} targetDatasetId={importTargetDataset || datasets.find(d => d.projectId === importTaskId)?.id || datasets[0]?.id} setTargetDataset={setImportTargetDataset} onFile={handleAdvancedImportFile} fileRef={advImportInputRef} onRun={runAdvancedImport} />}
    </div>
  );
}

function timeAgo(timestamp) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs===1?"":"s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days===1?"":"s"} ago`;
}

const ACTIVITY_ICONS = { "QA Approved": CheckCircle2, "QA Rejected": AlertCircle, "Task Submitted": Upload, "Annotation Saved": Edit3, "Task Assigned": Users, "Task Escalated": AlertCircle, "Task Completed": ShieldCheck };

const WIDGET_REGISTRY = [
  { id: "kpi-active-projects", title: "Active Projects", category: "Overview", size: "kpi", icon: FolderKanban,
    render: (d) => <StatCard icon={FolderKanban} label="Active Projects" value={d.stats.active} meta={`${d.projects.length} total projects`} /> },
  { id: "kpi-images-remaining", title: "Images to Annotate", category: "Project", size: "kpi", icon: ImageIcon,
    render: (d) => <StatCard icon={ImageIcon} label="Images to Annotate" value={d.stats.remaining.toLocaleString()} meta={`${d.stats.completed.toLocaleString()} completed`} /> },
  { id: "kpi-team-members", title: "Team Members", category: "Team", size: "kpi", icon: Users,
    render: (d) => <StatCard icon={Users} label="Team Members" value={d.teamMembers.length} meta={`${d.teamMembers.filter(m=>m.status==="Active").length} active`} /> },
  { id: "kpi-quality-score", title: "Quality Score", category: "QA", size: "kpi", icon: ShieldCheck,
    render: (d) => { const scored = Object.values(d.qaReviews).filter(r=>r.score!==null&&r.score!==undefined); const avg = scored.length?Math.round(scored.reduce((s,r)=>s+r.score,0)/scored.length):null; return <StatCard icon={ShieldCheck} label="Quality Score" value={avg===null?"—":`${avg}%`} meta={`${scored.length} scored review${scored.length===1?"":"s"}`} />; } },
  { id: "kpi-throughput", title: "Throughput (7d)", category: "Project", size: "kpi", icon: TrendingUp,
    render: (d) => <StatCard icon={TrendingUp} label="Throughput (7d)" value={d.reporting.last7} meta={d.reporting.throughputTrendPct===null?"vs prior week: —":`${d.reporting.throughputTrendPct>=0?"+":""}${d.reporting.throughputTrendPct}% vs prior week`} /> },
  { id: "kpi-sla-compliance", title: "SLA Compliance", category: "SLA", size: "kpi", icon: Calendar,
    render: (d) => <StatCard icon={Calendar} label="SLA Compliance" value={d.deadlines.slaCompliance===null?"—":`${d.deadlines.slaCompliance}%`} meta={`${d.deadlines.overdue.length} overdue now`} /> },
  { id: "kpi-overdue", title: "Overdue Tasks", category: "SLA", size: "kpi", icon: AlertCircle,
    render: (d) => <StatCard icon={AlertCircle} label="Overdue Tasks" value={d.deadlines.overdue.length} meta={`${d.deadlines.dueToday.length} due today`} /> },
  { id: "kpi-pending-reviews", title: "Pending Reviews", category: "QA", size: "kpi", icon: ClipboardCheck,
    render: (d) => <StatCard icon={ClipboardCheck} label="Pending Reviews" value={d.tasks.filter(t=>["Submitted","QA Review"].includes(t.status)).length} meta="Awaiting QA" /> },

  { id: "panel-active-projects", title: "Active Projects", category: "Project", size: "large", icon: FolderKanban,
    render: (d) => <section className="panel"><div className="panel-head"><div><h2>Active Projects</h2><p>Current annotation workload</p></div><button className="text-btn" onClick={() => d.onNavigate("Projects")}>View all <span>→</span></button></div><div className="table-wrap"><table><thead><tr><th>PROJECT</th><th>TYPE</th><th>TOTAL</th><th>PROGRESS</th><th>STATUS</th></tr></thead><tbody>
      {d.projects.slice(0, 5).map(p => <tr key={p.id}><td><b>{p.name}</b><small>{p.client}</small></td><td>{p.annotationType}</td><td>{Number(p.totalImages).toLocaleString()}</td><td><div className="table-progress"><span><i style={{width:`${progressOf(p)}%`}}></i></span><b>{progressOf(p)}%</b></div></td><td><StatusBadge status={p.status}/></td></tr>)}
    </tbody></table></div></section> },

  { id: "panel-recent-activity", title: "Recent Activity", category: "Overview", size: "medium", icon: Activity,
    render: (d) => <section className="panel"><div className="panel-head"><div><h2>Recent Activity</h2><p>Latest workspace events</p></div></div><div className="activity-list">
      {d.auditEvents.length ? d.auditEvents.slice(0, 6).map(e => <ActivityRow key={e.id} icon={ACTIVITY_ICONS[e.action] || Activity} title={e.action} text={e.details || e.actor} time={timeAgo(e.timestamp)}/>) : <div className="analytics-empty">No activity yet.</div>}
    </div></section> },

  { id: "panel-quick-actions", title: "Quick Actions", category: "Overview", size: "medium", icon: Zap,
    render: (d) => <section className="panel quick-panel"><div className="panel-head"><div><h2>Quick Actions</h2><p>Jump into common workflows</p></div></div><div className="quick-grid"><Quick icon={Play} title="Start Annotating" onClick={() => d.onOpenWorkstation(null, "Annotation")}/><Quick icon={Target} title="Task Planner" onClick={() => d.onNavigate("Task Planner")}/><Quick icon={ClipboardCheck} title="Pending Reviews" onClick={() => d.onOpenWorkstation(null, "Review")}/><Quick icon={TrendingUp} title="View Analytics" onClick={() => d.onNavigate("Analytics")}/><Quick icon={Upload} title="Import Images" onClick={() => d.onNavigate("Projects")}/></div></section> },

  { id: "panel-team-utilization", title: "Team Utilization", category: "Team", size: "medium", icon: Users,
    render: (d) => <section className="panel"><div className="panel-head"><div><h2>Team Utilization</h2><p>Workload against capacity</p></div></div>{d.reporting.teamUtilization.length ? <div className="utilization-list">{d.reporting.teamUtilization.slice(0,5).map(u => <div className="utilization-row" key={u.member.id}><div className="utilization-main"><b>{u.member.name}</b><span>{u.member.role} · {u.assigned}/{u.capacity}</span></div><div className="utilization-track"><i className={u.utilization>=100?"over":u.utilization>=75?"high":""} style={{width:`${Math.min(100,u.utilization)}%`}}/></div><span className="utilization-pct">{u.utilization}%</span></div>)}</div> : <div className="analytics-empty">No active team members.</div>}</section> },

  { id: "panel-qa-distribution", title: "QA Distribution", category: "QA", size: "medium", icon: ClipboardCheck,
    render: (d) => { const reviewed = Object.values(d.qaReviews); const approved = reviewed.filter(r=>r.decision==="Approved").length; const rejected = reviewed.filter(r=>r.decision==="Rejected").length; const changes = reviewed.filter(r=>r.decision==="Changes Requested").length; const scored = reviewed.filter(r=>r.score!==null&&r.score!==undefined); const avg = scored.length?Math.round(scored.reduce((s,r)=>s+r.score,0)/scored.length):null; return <section className="panel quality-panel"><div className="panel-head"><div><h2>QA Distribution</h2><p>Current review decisions</p></div><ClipboardCheck size={17}/></div><div className="quality-ring"><div><strong>{avg===null?"—":`${avg}%`}</strong><span>avg score</span></div></div><div className="quality-legend"><div><i className="approved-dot"></i><span>Approved</span><b>{approved}</b></div><div><i className="changes-dot"></i><span>Changes requested</span><b>{changes}</b></div><div><i className="rejected-dot"></i><span>Rejected</span><b>{rejected}</b></div></div></section>; } },

  { id: "panel-upcoming-deadlines", title: "Upcoming Deadlines", category: "SLA", size: "medium", icon: Calendar,
    render: (d) => <section className="panel"><div className="panel-head"><div><h2>Upcoming Deadlines</h2><p>Soonest project due dates</p></div></div>{d.deadlines.upcomingProjects.length ? <div className="upcoming-deadlines-list">{d.deadlines.upcomingProjects.slice(0,5).map(u => <div className="upcoming-deadline-row" key={u.project.id}><div><b>{u.project.name}</b><span>{new Date(u.project.dueDate).toLocaleDateString()}</span></div><div className="upcoming-progress"><div className="progress-track"><i style={{width:`${u.progress}%`}}/></div><small>{u.progress}%</small></div><span className={`days-left-badge ${u.daysLeft<0?"overdue":u.daysLeft<=3?"soon":""}`}>{u.daysLeft<0?`${Math.abs(u.daysLeft)}d overdue`:`${u.daysLeft}d left`}</span></div>)}</div> : <div className="analytics-empty">No project deadlines set.</div>}</section> },

  { id: "panel-overdue-tasks", title: "Overdue Tasks", category: "SLA", size: "medium", icon: AlertCircle,
    render: (d) => <section className="panel"><div className="panel-head"><div><h2>Overdue Tasks</h2><p>Past their SLA or due date</p></div></div>{d.deadlines.overdue.length ? <div className="overdue-task-list">{d.deadlines.overdue.slice(0,5).map(r => <div className="overdue-task-row" key={r.task.id}><div className="overdue-task-main"><b>{r.task.name}</b><span>{r.task.status}</span></div><span className="overdue-hours-badge">{r.overdueHours.toFixed(1)}h overdue</span></div>)}</div> : <div className="analytics-empty">Nothing overdue.</div>}</section> },

  { id: "panel-quality-trend", title: "Quality Trend", category: "QA", size: "large", icon: TrendingUp,
    render: (d) => { const weeks = d.quality.weeks; const maxAvg = Math.max(1, ...weeks.map(w=>w.avg||0)); return <section className="panel analytics-chart-panel"><div className="panel-head"><div><h2>Quality Trend</h2><p>Average QA score by week</p></div></div><div className="trend-chart"><div className="chart-y"><span>100</span><span>50</span><span>0</span></div><div className="chart-bars">{weeks.map((w,i)=><div className="chart-bar-wrap" key={i}><div className="chart-bar" style={{height:`${w.avg?Math.max(6,w.avg):3}%`}}></div><span>{w.label}</span></div>)}</div></div></section>; } },

  { id: "panel-forecast", title: "Project Forecast", category: "Project", size: "large", icon: Target,
    render: (d) => <section className="panel"><div className="panel-head"><div><h2>Project Forecast</h2><p>Projected completion at current velocity</p></div></div>{d.reporting.forecasts.length ? <div className="table-wrap"><table className="analytics-table"><thead><tr><th>PROJECT</th><th>REMAINING</th><th>DAYS LEFT</th><th>PROJECTED</th></tr></thead><tbody>{d.reporting.forecasts.slice(0,5).map(f => <tr key={f.project.id}><td><b>{f.project.name}</b></td><td>{f.remaining.toLocaleString()}</td><td>{f.daysLeft??"—"}</td><td>{f.projectedDate?f.projectedDate.toLocaleDateString():<span className="forecast-stalled">Stalled</span>}</td></tr>)}</tbody></table></div> : <div className="analytics-empty">All projects complete.</div>}</section> }
];

const DASHBOARD_PRESETS = {
  overview: { name: "Overview", builtIn: true, widgets: ["kpi-active-projects", "kpi-images-remaining", "kpi-team-members", "kpi-quality-score", "panel-active-projects", "panel-recent-activity", "panel-quick-actions"] },
  team: { name: "Team Dashboard", builtIn: true, widgets: ["kpi-team-members", "kpi-pending-reviews", "panel-team-utilization", "panel-quick-actions"] },
  project: { name: "Project Dashboard", builtIn: true, widgets: ["kpi-active-projects", "kpi-images-remaining", "kpi-throughput", "panel-active-projects", "panel-forecast"] },
  qa: { name: "QA Dashboard", builtIn: true, widgets: ["kpi-quality-score", "kpi-pending-reviews", "panel-qa-distribution", "panel-quality-trend"] },
  sla: { name: "SLA Dashboard", builtIn: true, widgets: ["kpi-sla-compliance", "kpi-overdue", "panel-upcoming-deadlines", "panel-overdue-tasks"] }
};

function Dashboard({ projects, tasks, teamMembers, qaReviews, auditEvents, stats, reporting, quality, deadlines, onCreate, onNavigate, onOpenWorkstation, userName,
  layouts, activeLayoutId, setActiveLayoutId, editing, setEditing, onToggleWidget, onMoveWidget, onSaveLayoutAs, onDeleteLayout, onRenameLayout }) {
  const [newLayoutName, setNewLayoutName] = useState("");
  const layout = layouts[activeLayoutId] || Object.values(layouts)[0];
  const data = { projects, tasks, teamMembers, qaReviews, auditEvents, stats, reporting, quality, deadlines, onNavigate, onOpenWorkstation };
  const placed = layout.widgets.map(id => WIDGET_REGISTRY.find(w => w.id === id)).filter(Boolean);
  const available = WIDGET_REGISTRY.filter(w => !layout.widgets.includes(w.id));

  return (
    <div className="page">
      <div className="page-head">
        <div><span className="eyebrow">OVERVIEW</span><h1>Good afternoon, {userName}</h1><p>Here's what's happening across your annotation workspace.</p></div>
        <div className="dashboard-head-actions">
          <select className="layout-switcher" value={activeLayoutId} onChange={e=>setActiveLayoutId(e.target.value)}>{Object.entries(layouts).map(([id,l])=><option key={id} value={id}>{l.name}</option>)}</select>
          <button className={`secondary-btn ${editing?"active-toggle":""}`} onClick={()=>setEditing(v=>!v)}><SlidersHorizontal size={16}/> {editing?"Done":"Customize"}</button>
          <button className="primary-btn" onClick={()=>onCreate()}><Plus size={17}/> Create Project</button>
        </div>
      </div>

      {editing && <section className="panel dashboard-editor">
        <div className="panel-head"><div><h2>Customize this layout</h2><p>Add, remove and reorder widgets, or save your own layout</p></div></div>
        <div className="dashboard-editor-row">
          <span className="section-label">ON THIS DASHBOARD ({placed.length})</span>
          <div className="placed-widget-list">{placed.map((w,i) => <div className="placed-widget-chip" key={w.id}>
            <w.icon size={13}/><span>{w.title}</span>
            <button disabled={i===0} onClick={()=>onMoveWidget(w.id,-1)} title="Move earlier"><ChevronDown size={12} style={{transform:"rotate(90deg)"}}/></button>
            <button disabled={i===placed.length-1} onClick={()=>onMoveWidget(w.id,1)} title="Move later"><ChevronDown size={12} style={{transform:"rotate(-90deg)"}}/></button>
            <button className="chip-x" onClick={()=>onToggleWidget(w.id)} title="Remove"><X size={12}/></button>
          </div>)}</div>
        </div>
        {!!available.length && <div className="dashboard-editor-row">
          <span className="section-label">WIDGET LIBRARY</span>
          <div className="widget-library-grid">{available.map(w => <button key={w.id} className="widget-library-card" onClick={()=>onToggleWidget(w.id)}><w.icon size={16}/><span>{w.title}</span><Plus size={13}/></button>)}</div>
        </div>}
        <div className="dashboard-editor-row layout-save-row">
          <input value={newLayoutName} onChange={e=>setNewLayoutName(e.target.value)} placeholder="Save current arrangement as..."/>
          <button className="ghost-btn" onClick={()=>{ onSaveLayoutAs(newLayoutName); setNewLayoutName(""); }}><Save size={13}/> Save as new layout</button>
          {!layout.builtIn && <button className="ghost-btn" onClick={()=>{ const name = window.prompt("Rename layout", layout.name); if (name) onRenameLayout(activeLayoutId, name); }}><Edit3 size={13}/> Rename</button>}
          {Object.keys(layouts).length > 1 && <button className="danger-icon" onClick={()=>onDeleteLayout(activeLayoutId)} title="Delete this layout"><Trash2 size={14}/></button>}
        </div>
      </section>}

      <div className="widget-grid">
        {placed.filter(w=>w.size==="kpi").length > 0 && <div className="stats-grid">{placed.filter(w=>w.size==="kpi").map(w => <React.Fragment key={w.id}>{w.render(data)}</React.Fragment>)}</div>}
        {placed.filter(w=>w.size!=="kpi").map(w => <div className={`widget-slot widget-${w.size}`} key={w.id}>{w.render(data)}</div>)}
        {!placed.length && <div className="config-empty"><LayoutDashboard size={34}/><h3>This layout is empty</h3><p>Click Customize to add widgets.</p></div>}
      </div>
    </div>
  );
}

function AiQaInsightPanel({ annotations, labels }) {
  const [open, setOpen] = useState(true);
  const withConfidence = annotations.filter(a => a.confidence != null);
  const avgConfidence = withConfidence.length ? Math.round((withConfidence.reduce((s, a) => s + a.confidence, 0) / withConfidence.length) * 100) : null;
  const correctedCount = annotations.filter(a => a.corrected).length;
  const lowConfidence = annotations.filter(a => a.confidence != null && a.confidence < 0.6);
  return <div className="qa-scorecard-panel ai-qa-panel">
    <button type="button" className="qa-scorecard-toggle" onClick={() => setOpen(v => !v)}>
      <Zap size={14}/> AI-Assisted QA
      <b className="qa-live-score">{annotations.length}</b>
      <ChevronDown size={14} style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : "none" }}/>
    </button>
    {open && <div className="qa-scorecard-body">
      <div className="ai-qa-stat-row"><span>Regions from AI</span><b>{annotations.length}</b></div>
      <div className="ai-qa-stat-row"><span>Avg. confidence</span><b>{avgConfidence===null?"—":`${avgConfidence}%`}</b></div>
      <div className="ai-qa-stat-row"><span>Corrected by annotator</span><b>{correctedCount}</b></div>
      {lowConfidence.length > 0 && <div className="ai-qa-lowconf">
        <span className="section-label">LOW CONFIDENCE — REVIEW CLOSELY</span>
        {lowConfidence.map(a => <div key={a.id} className="ai-qa-lowconf-row"><span>{labels.find(l=>l.id===a.labelId)?.name || "Object"}</span><b>{Math.round(a.confidence*100)}%</b></div>)}
      </div>}
    </div>}
  </div>;
}

function QaScorecardPanel({ criteria, categories, scores, setScores, errors, setErrors, open, setOpen }) {
  const totalWeight = (criteria || []).reduce((s, c) => s + (Number(c.weight) || 0), 0) || 1;
  const overallScore = criteria?.length ? Math.round((criteria || []).reduce((s, c) => s + ((scores[c.id] ?? 100) * (Number(c.weight) || 0)), 0) / totalWeight) : null;
  return <div className="qa-scorecard-panel">
    <button type="button" className="qa-scorecard-toggle" onClick={() => setOpen(v => !v)}>
      <ShieldCheck size={14}/> QA Scorecard
      {overallScore !== null && <b className="qa-live-score">{overallScore}</b>}
      <ChevronDown size={14} style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : "none" }}/>
    </button>
    {open && <div className="qa-scorecard-body">
      {criteria?.length ? criteria.map(c => <div className="qa-criterion-row" key={c.id}>
        <span>{c.name}<small>{c.weight}%</small></span>
        <input type="range" min="0" max="100" value={scores[c.id] ?? 100} onChange={e => setScores(prev => ({ ...prev, [c.id]: Number(e.target.value) }))}/>
        <b>{scores[c.id] ?? 100}</b>
      </div>) : <p className="qa-scorecard-empty">No scoring criteria configured — add some in Project Configuration → QA Scorecard.</p>}
      <div className="qa-error-log">
        <span className="section-label">ERRORS LOGGED ({errors.length})</span>
        {errors.map(err => <div className="qa-error-chip" key={err.id}>
          <b>{categories.find(c => c.id === err.categoryId)?.name || "Error"}</b>
          <span className={`sev-badge sev-${(err.severity || "Minor").toLowerCase()}`}>{err.severity}</span>
          <button aria-label="Remove error" type="button" onClick={() => setErrors(prev => prev.filter(e => e.id !== err.id))}><X size={11}/></button>
        </div>)}
        {categories?.length ? <QaErrorAdder categories={categories} onAdd={(categoryId, severity) => setErrors(prev => [...prev, { id: `logged-${Date.now()}`, categoryId, severity }])}/> : null}
      </div>
    </div>}
  </div>;
}

function QaErrorAdder({ categories, onAdd }) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const cat = categories.find(c => c.id === categoryId);
  return <div className="qa-error-adder">
    <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
    <button type="button" className="ghost-btn" onClick={() => categoryId && onAdd(categoryId, cat?.severity || "Minor")}><Plus size={12}/> Log</button>
  </div>;
}

function Workspace({
  projects, workspaceProject, setWorkspaceProject, tasks, currentTask, selectedTaskIndex, setSelectedTaskIndex,
  filteredTasks, taskFilter, setTaskFilter, tool, setTool, labels, selectedLabel, setSelectedLabel,
  currentAnnotations, selectedAnnotationId, selectAnnotation, selectedAnnotation, drawing, zoom, setZoom, pan, setPan,
  canvasRef, imageRef, onCanvasPointerDown, onCanvasPointerMove, onCanvasPointerUp, onCanvasDoubleClick, handleImageError,
  onDelete, onDuplicate, onUndo, onRedo, onReset, onPrevious, onNext, onSave, onSubmit, message,
  updateAnnotation, startAnnotationEdit, showShortcuts, setShowShortcuts, onImport,
  insertVertex, deleteVertex, onToggleVisible, onToggleLock, onReorder, selectedIds, marquee, coEditors,
  mode = "Annotation", setMode, onSkip, onAccept, onReject, currentReview, canReview = true, onBackToTasks,
  qaCriteria, errorCategories, qaCriteriaScores, setQaCriteriaScores, qaErrors, setQaErrors, qaScorecardOpen, setQaScorecardOpen,
  onAcceptPrediction, onRejectPrediction, onAcceptAllPredictions, onRejectAllPredictions, suggestedIds
}) {
  const isReview = mode === "Review";
  const pendingPredictions = currentAnnotations.filter(a => a.reviewState === "pending");
  const modelAnnotations = currentAnnotations.filter(a => a.source === "model");
  const [taskSearch, setTaskSearch] = useState("");
  const [rightTab, setRightTab] = useState("Labels");
  const [infoTab, setInfoTab] = useState("Info");
  const [labelSearch, setLabelSearch] = useState("");
  const workspaceTasks = useMemo(() => tasks.map((task, index) => ({ task, index })).filter(({ task }) => {
    const projectMatch = !workspaceProject || task.projectId === workspaceProject;
    const q = taskSearch.trim().toLowerCase();
    const searchMatch = !q || `${task.name} ${task.id}`.toLowerCase().includes(q);
    const statusMatch = taskFilter === "All" || task.status === taskFilter;
    return projectMatch && searchMatch && statusMatch;
  }), [tasks, workspaceProject, taskSearch, taskFilter]);
  const filteredLabels = labels.filter(label => !labelSearch.trim() || label.name.toLowerCase().includes(labelSearch.trim().toLowerCase()));
  const labelById = useMemo(() => Object.fromEntries(labels.map(l => [l.id, l])), [labels]);
  const currentProject = projects.find(p => p.id === workspaceProject);
  const selectedLabelObject = labels.find(l => l.id === selectedLabel);
  const objectCountByLabel = currentAnnotations.reduce((acc, a) => { acc[a.labelId] = (acc[a.labelId] || 0) + 1; return acc; }, {});
  const toolGroups = [
    ["NAVIGATE", [["select", MousePointer2, "Select", "V"], ["pan", Move, "Pan", "Space"]]],
    ["SHAPES", [["rectangle", Square, "Bounding Box", "B"], ["polygon", Grid3X3, "Polygon", "P"], ["polyline", Activity, "Polyline", "G"], ["line", Minus, "Line", "L"]]],
    ["POINT / MASK", [["keypoint", Target, "Keypoint", "K"], ["brush", Edit3, "Brush", "R"], ["eraser", Eraser, "Eraser", "E"]]]
  ];

  return (
    <div className="workspace-page build8-workspace">
      <div className="workspace-top">
        <button className="workstation-back" onClick={onBackToTasks} title="Back to tasks" aria-label="Back to tasks"><ChevronDown size={15} style={{transform:"rotate(90deg)"}}/> Tasks</button>
        <div className="workspace-project"><span>PROJECT</span><select value={workspaceProject} onChange={e => { const id=e.target.value; setWorkspaceProject(id); const first=tasks.findIndex(t=>!id || t.projectId===id); setSelectedTaskIndex(first>=0?first:0); setZoom(1); setPan({x:0,y:0}); }}><option value="">All Projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="workspace-task-title"><b>{currentTask?.name || "No task loaded"}</b><span>{currentTask?.id || "—"} · {selectedTaskIndex + 1} / {tasks.length} tasks</span></div>
        <div className="workspace-top-meta"><span className="workspace-live-dot"></span><span>{currentAnnotations.length} objects</span><span>{selectedLabelObject?.name || "No label selected"}</span></div>
        <div className="workstation-mode-switch" role="tablist" aria-label="Task stage">
          <button role="tab" aria-selected={!isReview} className={!isReview ? "active" : ""} onClick={()=>setMode && setMode("Annotation")}><Edit3 size={14}/> Annotation</button>
          <button role="tab" aria-selected={isReview} className={isReview ? "active" : ""} onClick={()=>setMode && setMode("Review")}><ClipboardCheck size={14}/> Review</button>
        </div>
        <div className="workspace-actions">
          <button className="secondary-btn" onClick={onSave}><Save size={16}/> Save</button>
          {isReview
            ? <><button className="secondary-btn reject-btn" onClick={onReject} disabled={!canReview || !currentTask}><AlertCircle size={16}/> Reject</button><button className="primary-btn accept-btn" onClick={onAccept} disabled={!canReview || !currentTask}><CheckCircle2 size={16}/> Accept</button></>
            : <><button className="secondary-btn skip-btn" onClick={onSkip} disabled={!currentTask}><ChevronDown size={16} style={{transform:"rotate(-90deg)"}}/> Skip</button><button className="primary-btn" onClick={onSubmit} disabled={!currentTask}><CheckCircle2 size={16}/> Submit</button></>}
        </div>
      </div>
      {coEditors?.length > 0 && <div className="co-edit-banner"><Users size={14}/><span>{coEditors.map(u=>u.name).join(", ")} {coEditors.length===1?"is":"are"} also viewing this task right now — coordinate before submitting to avoid overwriting each other's work.</span></div>}

      <div className="annotation-shell build8-shell">
        <aside className="task-queue-panel">
          <div className="queue-head"><div><span className="panel-section-title">TASKS</span><b>{workspaceTasks.length} matching</b></div><button onClick={onImport} title="Import images" aria-label="Import images"><Upload size={15}/></button></div>
          <div className="queue-search"><Search size={14}/><input value={taskSearch} onChange={e=>setTaskSearch(e.target.value)} placeholder="Search task ID..."/></div>
          <div className="queue-filter"><select value={taskFilter} onChange={e=>setTaskFilter(e.target.value)}><option>All</option><option>Pending</option><option>In Progress</option><option>Submitted</option><option>QA Review</option><option>Approved</option><option>Rejected</option><option>Changes Requested</option></select><Filter size={13}/></div>
          <div className="task-queue-list">
            {workspaceTasks.map(({task,index}) => {
              const active = index === selectedTaskIndex;
              return <button key={task.id} className={`task-queue-row ${active ? "active" : ""}`} onClick={() => { setSelectedTaskIndex(index); setZoom(1); setPan({x:0,y:0}); }}>
                <span className="task-check">{active ? <Check size={11}/> : <span/>}</span>
                <div className="task-thumb"><img src={task.image} alt="" loading="lazy" decoding="async"/></div>
                <div className="task-row-copy"><b>{task.id}</b><span>{task.name}</span><small>{task.status}</small></div>
                <span className="task-row-count">{task.status === "Pending" ? "" : "•"}</span>
              </button>;
            })}
            {!workspaceTasks.length && <div className="task-queue-empty"><ImageIcon size={26}/><b>No matching tasks</b><span>Import images or change the filters.</span></div>}
          </div>
          <div className="queue-footer"><span>Queue</span><b>{workspaceTasks.length} tasks</b></div>
        </aside>

        <section className="canvas-area build8-canvas-area">
          <div className="canvas-toolbar build8-toolbar">
            <div className="canvas-tool-status"><span className="tool-dot"></span><b>{toolGroups.flatMap(g=>g[1]).find(t=>t[0]===tool)?.[2] || "Select"}</b><small>{currentAnnotations.length} regions</small></div>
            <div className="canvas-help"><span>Double-click to finish polygon/polyline</span><span>Drag objects to move</span></div>
            <div className="canvas-controls"><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(.25,+(z-.1).toFixed(2)))}><ZoomOut size={15}/></button><b>{Math.round(zoom*100)}%</b><button aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(4,+(z+.1).toFixed(2)))}><ZoomIn size={15}/></button><button onClick={onReset}>Fit</button><button onClick={()=>document.documentElement.requestFullscreen?.()} title="Full screen"><Grid3X3 size={14}/></button></div>
          </div>
          <div className={`canvas-stage build8-stage ${tool === "pan" ? "pan-mode" : ""} ${tool === "eraser" ? "eraser-mode" : ""}`}>
            {currentTask ? <div ref={canvasRef} className="annotation-canvas build8-canvas" style={{transform:`translate(${pan.x}px, ${pan.y}px) scale(${zoom})`}} onPointerDown={onCanvasPointerDown} onPointerMove={onCanvasPointerMove} onPointerUp={onCanvasPointerUp} onDoubleClick={onCanvasDoubleClick}>
              <img ref={imageRef} src={currentTask.image} alt={currentTask.name} onError={handleImageError} draggable="false"/>
              <div className="annotation-overlay">
                {currentAnnotations.map((a,index)=><AnnotationShape key={a.id} a={a} index={index} selected={(selectedIds||[a.id===selectedAnnotationId?a.id:null]).includes(a.id)} onEditStart={startAnnotationEdit} label={labelById[a.labelId]} onInsertVertex={insertVertex} onDeleteVertex={deleteVertex}/>) }
                {drawing && <DrawingPreview drawing={drawing} color={selectedLabelObject?.color || "#2563eb"}/>}
                {marquee && <div className="marquee-box" style={{left:`${Math.min(marquee.start.x,marquee.current.x)}%`,top:`${Math.min(marquee.start.y,marquee.current.y)}%`,width:`${Math.abs(marquee.current.x-marquee.start.x)}%`,height:`${Math.abs(marquee.current.y-marquee.start.y)}%`}}/>}
              </div>
              <div className="canvas-crosshair"><span></span></div>
            </div> : <div className="empty-canvas"><ImageIcon size={45}/><h3>No images yet</h3><p>Import images to start annotating.</p><button className="primary-btn" onClick={onImport}><Upload size={16}/> Import Images</button></div>}
            {drawing && (drawing.type === "polygon" || drawing.type === "polyline") && <div className="drawing-hint">{drawing.points.length} points · double-click to finish · Esc to cancel</div>}
            <div className="floating-tool-dock">
              <div className="floating-zoom-slider" title={`Zoom ${Math.round(zoom*100)}%`}>
                <input type="range" min="0.25" max="4" step="0.05" value={zoom} onChange={e=>setZoom(parseFloat(e.target.value))}/>
              </div>
              <div className="floating-tool-group">
                {toolGroups.flatMap(g=>g[1]).map(([id,Icon,title,key]) => <button key={id} className={`floating-tool-btn ${tool===id?"active":""}`} title={`${title} (${key})`} aria-label={`${title} (${key})`} onClick={()=>setTool(id)}><Icon size={16}/></button>)}
              </div>
              <div className="floating-tool-group">
                <button className="floating-tool-btn" title="Undo (Ctrl+Z)" aria-label="Undo (Ctrl+Z)" onClick={onUndo}><Undo2 size={16}/></button>
                <button className="floating-tool-btn" title="Redo (Ctrl+Shift+Z)" aria-label="Redo (Ctrl+Shift+Z)" onClick={onRedo}><Redo2 size={16}/></button>
                <button className="floating-tool-btn" title="Duplicate" aria-label="Duplicate" onClick={onDuplicate} disabled={!selectedAnnotation}><Copy size={16}/></button>
                <button className="floating-tool-btn danger" title="Delete (Del)" aria-label="Delete (Del)" onClick={onDelete} disabled={!selectedAnnotation}><Trash2 size={16}/></button>
              </div>
              <div className="floating-tool-group">
                <button className="floating-tool-btn" title="Reset view" aria-label="Reset view" onClick={onReset}><RotateCcw size={16}/></button>
                <button className="floating-tool-btn" title="Shortcuts" aria-label="Shortcuts" onClick={()=>setShowShortcuts(true)}><Target size={16}/></button>
              </div>
            </div>
          </div>
          <div className="canvas-bottom build8-bottom">
            <button onClick={onPrevious} disabled={selectedTaskIndex<=0}>← Previous</button><div className="task-counter"><b>{selectedTaskIndex+1}</b> / {tasks.length}</div><button onClick={onNext} disabled={selectedTaskIndex>=tasks.length-1}>Next →</button>
            <span className="bottom-spacer"></span><button className="bottom-action" onClick={onUndo}><Undo2 size={13}/> Undo</button><button className="bottom-action" onClick={onRedo}><Redo2 size={13}/> Redo</button><span className="canvas-status-note">{currentTask?.status || "Pending"}</span>
          </div>
        </section>

        <aside className="right-panel build8-right-panel">
          <div className="right-tabs build8-top-tabs"><button className={infoTab==="Info"?"active":""} onClick={()=>setInfoTab("Info")}>Info</button><button className={infoTab==="History"?"active":""} onClick={()=>setInfoTab("History")}>History</button></div>
          {infoTab === "Info" ? <div className="region-info-card">
            <div className="info-icon"><MousePointer2 size={20}/></div><b>{selectedAnnotation ? "View region details" : "Select a region"}</b><p>{selectedAnnotation ? `${selectedLabelObject?.name || "Object"} · ${selectedAnnotation.type}` : "Select an annotation to view its properties, metadata and available actions."}</p>
            {selectedAnnotation && <div className="info-fields"><div><span>LABEL</span><b>{labels.find(l=>l.id===selectedAnnotation.labelId)?.name || "—"}</b></div><div><span>TYPE</span><b>{selectedAnnotation.type}</b></div><div><span>REGION</span><b>#{currentAnnotations.findIndex(a=>a.id===selectedAnnotation.id)+1}</b></div></div>}
          </div> : <div className="history-panel"><div className="history-entry"><Clock3 size={14}/><div><b>Current task</b><span>{currentTask?.name || "No task"}</span></div></div><div className="history-entry"><Save size={14}/><div><b>Local autosave</b><span>Changes persist in this browser</span></div></div></div>}
          <div className="right-subtabs"><button className={rightTab==="Labels"?"active":""} onClick={()=>setRightTab("Labels")}>Labels</button><button className={rightTab==="Regions"?"active":""} onClick={()=>setRightTab("Regions")}>Regions <em>{currentAnnotations.length}</em></button><button>Relations</button></div>
          <div className="right-content build8-right-content">
            {rightTab === "Labels" ? <div className="right-section label-section-build8">
              <div className="right-section-head"><div><b>LABELS</b><small>{labels.length} configured</small></div><button onClick={onImport} title="Import images" aria-label="Import images"><Plus size={15}/></button></div>
              <div className="label-search-build8"><Search size={13}/><input value={labelSearch} onChange={e=>setLabelSearch(e.target.value)} placeholder="Filter labels..."/></div>
              <div className="label-list build8-label-list">{filteredLabels.map(label=><button key={label.id} className={`label-item build8-label-item ${selectedLabel===label.id?"selected":""}`} onClick={()=>setSelectedLabel(label.id)}><span className="label-color" style={{background:label.color}}></span><span>{label.name}</span>{suggestedIds?.includes(label.id) && <i className="ai-suggested-badge" title="AI-suggested: frequently used in this dataset"><Zap size={10}/></i>}<b>{objectCountByLabel[label.id] || 0}</b><kbd>{label.type}</kbd></button>)}</div>
              {!filteredLabels.length && <div className="empty-objects"><Target size={24}/><p>No labels found</p></div>}
            </div> : <div className="right-section"><div className="right-section-head"><div><b>REGIONS</b><small>{currentAnnotations.length} objects on canvas{selectedIds?.length>1?` · ${selectedIds.length} selected`:""}</small></div></div>
            {pendingPredictions.length > 0 && <div className="ai-review-banner"><Zap size={14}/><span>{pendingPredictions.length} AI-suggested region{pendingPredictions.length===1?"":"s"} need review</span><div className="ai-review-banner-actions"><button onClick={()=>onAcceptAllPredictions(currentTask.id)}><Check size={12}/> Accept All</button><button onClick={()=>onRejectAllPredictions(currentTask.id)}><X size={12}/> Reject All</button></div></div>}
            {currentAnnotations.length ? <div className="object-list build8-object-list">{currentAnnotations.map((a,i)=>{const l=labels.find(x=>x.id===a.labelId);const pending=a.reviewState==="pending";return <div key={a.id} className={`object-item build8-object-item ${(selectedIds||[]).includes(a.id)?"selected":""} ${a.hidden?"is-hidden":""} ${pending?"is-pending-ai":""}`} onClick={e=>selectAnnotation(a.id,e.shiftKey)}><span className="object-number" style={{background:l?.color||"#64748b"}}>{i+1}</span><div className="object-item-main"><b>{l?.name||"Object"}</b><small>{a.type === "rectangle" ? "Bounding Box" : a.type}{a.source==="model" && <span className="ai-source-tag"> · AI{a.confidence!=null?` ${Math.round(a.confidence*100)}%`:""}{a.corrected?" · corrected":""}</span>}</small></div>{pending ? <div className="object-item-actions"><button title="Accept" aria-label="Accept" className="accept-btn" onClick={e=>{e.stopPropagation();onAcceptPrediction(currentTask.id,a.id);}}><Check size={13}/></button><button title="Reject" aria-label="Reject" className="danger" onClick={e=>{e.stopPropagation();onRejectPrediction(currentTask.id,a.id);}}><X size={13}/></button></div> : <div className="object-item-actions"><button title={a.hidden?"Show":"Hide"} aria-label={a.hidden?"Show":"Hide"} className={a.hidden?"active":""} onClick={e=>{e.stopPropagation();onToggleVisible(a.id);}}><Eye size={13}/></button><button title={a.locked?"Unlock":"Lock"} aria-label={a.locked?"Unlock":"Lock"} className={a.locked?"active":""} onClick={e=>{e.stopPropagation();onToggleLock(a.id);}}>{a.locked?<ShieldCheck size={13}/>:<Square size={13}/>}</button><button title="Bring forward" aria-label="Bring forward" disabled={i===currentAnnotations.length-1} onClick={e=>{e.stopPropagation();onReorder(a.id,1);}}><ChevronDown size={13} style={{transform:"rotate(180deg)"}}/></button><button title="Send backward" aria-label="Send backward" disabled={i===0} onClick={e=>{e.stopPropagation();onReorder(a.id,-1);}}><ChevronDown size={13}/></button></div>}</div>})}</div>:<div className="empty-objects"><Target size={25}/><p>No regions yet</p><small>Select a label and draw on the image.</small></div>}</div>}
            {selectedAnnotation && <div className="selected-card build8-selected-card"><div><b>Selected region</b><span>{labels.find(l=>l.id===selectedAnnotation.labelId)?.name || "Object"}</span></div><div className="selected-actions"><button onClick={onDuplicate}><Copy size={14}/> Duplicate</button><button className="danger" onClick={onDelete}><Trash2 size={14}/> Delete</button></div></div>}
          </div>
          {isReview && <QaScorecardPanel criteria={qaCriteria} categories={errorCategories} scores={qaCriteriaScores} setScores={setQaCriteriaScores} errors={qaErrors} setErrors={setQaErrors} open={qaScorecardOpen} setOpen={setQaScorecardOpen}/>}
          {isReview && modelAnnotations.length > 0 && <AiQaInsightPanel annotations={modelAnnotations} labels={labels}/>}
          <div className="right-footer build8-right-footer"><div><span>{isReview ? "Review decision" : "Task status"}</span><StatusBadge status={isReview ? (currentReview?.decision || "Pending Review") : (currentTask?.status || "Pending")}/></div><div><span>Regions</span><b>{currentAnnotations.length}</b></div></div>
        </aside>
      </div>
      <div className="quick-label-bar"><div className="quick-label-title"><Zap size={14}/><b>QUICK LABELS</b></div><div className="quick-label-scroll">{labels.map(label=><button key={label.id} className={selectedLabel===label.id?"active":""} onClick={()=>setSelectedLabel(label.id)}><span style={{background:label.color}}></span>{label.name}</button>)}</div></div>
      {message && <div className="workspace-toast"><CheckCircle2 size={17}/>{message}</div>}
      {showShortcuts && <Shortcuts onClose={()=>setShowShortcuts(false)}/>} 
    </div>
  );
}

const AnnotationShape = React.memo(function AnnotationShape({ a, index, selected, onEditStart, label, onInsertVertex, onDeleteVertex }) {
  const color = a.color || label?.color || "#2563eb";
  const style = { "--annotation-color": color };
  if (a.hidden) return null;
  const lockClass = a.locked ? "locked" : "";
  if (a.type === "rectangle") {
    const rotation = a.rotation || 0;
    const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
    return <div className={`annotation-box build8-annotation-box ${selected?"selected":""} ${lockClass} ${a.reviewState==="pending"?"pending-ai-box":""}`} style={{...style,left:`${a.x}%`,top:`${a.y}%`,width:`${a.w}%`,height:`${a.h}%`,transform:rotation?`rotate(${rotation}deg)`:undefined,transformOrigin:"center center"}} onPointerDown={e=>{e.stopPropagation();onEditStart(a.id,e,"move");}}>
      <span>{index+1}</span><b>{label?.name || "Object"}{a.locked && " 🔒"}{a.reviewState==="pending" && a.confidence!=null && ` · ${Math.round(a.confidence*100)}%`}</b>
      {selected && !a.locked && <div className="resize-handles">{["nw","n","ne","e","se","s","sw","w"].map(pos=><i key={pos} className={`handle-${pos}`} onPointerDown={e=>{e.stopPropagation();onEditStart(a.id,e,pos);}}/>)}<i className="handle-rotate" onPointerDown={e=>{e.stopPropagation();onEditStart(a.id,e,"rotate");}}/></div>}
    </div>;
  }
  if (a.type === "keypoint") return <svg className={`annotation-svg build8-annotation-svg ${selected?"selected":""} ${lockClass}`} viewBox="0 0 100 100" preserveAspectRatio="none" onPointerDown={e=>{e.stopPropagation();onEditStart(a.id,e,"move");}}><circle cx={a.points[0].x} cy={a.points[0].y} r="1.25" fill="#fff" stroke={color} strokeWidth=".55"/><circle cx={a.points[0].x} cy={a.points[0].y} r=".38" fill={color}/><text x={a.points[0].x+1.5} y={a.points[0].y-1.5} fill={color} fontSize="2.2">{index+1}</text></svg>;
  if (a.points?.length) {
    const points = a.points.map(p=>`${p.x},${p.y}`).join(" ");
    const editable = selected && !a.locked && (a.type === "polygon" || a.type === "polyline" || a.type === "line");
    const midpoints = editable ? a.points.map((p,i)=>{
      const nextPoint = a.points[(i+1) % a.points.length];
      if (a.type !== "polygon" && i === a.points.length-1) return null;
      return { x:(p.x+nextPoint.x)/2, y:(p.y+nextPoint.y)/2, afterIndex:i };
    }).filter(Boolean) : [];
    return <svg className={`annotation-svg build8-annotation-svg ${selected?"selected":""} ${lockClass}`} viewBox="0 0 100 100" preserveAspectRatio="none" onPointerDown={e=>{e.stopPropagation();onEditStart(a.id,e,"move");}}>
      {a.type === "polygon" ? <polygon points={points} fill={`${color}22`} stroke={color} strokeWidth=".55"/> : <polyline points={points} fill={a.type === "brush" ? `${color}12` : "none"} stroke={color} strokeWidth={a.type === "brush" ? "2.2" : ".65"} strokeLinecap="round" strokeLinejoin="round"/>}
      {midpoints.map(m=><circle key={`mid-${m.afterIndex}`} className="vertex-midpoint" cx={m.x} cy={m.y} r=".55" fill={color} fillOpacity=".45" stroke="#fff" strokeWidth=".18" onPointerDown={e=>{e.stopPropagation();onInsertVertex?.(a.id,m.afterIndex);}}><title>Click to add a point here</title></circle>)}
      {selected && a.points.map((p,i)=><circle key={i} className={editable?"vertex-handle":""} cx={p.x} cy={p.y} r=".8" fill="#fff" stroke={color} strokeWidth=".35"
        onPointerDown={editable ? e=>{e.stopPropagation(); if(e.altKey||e.metaKey){onDeleteVertex?.(a.id,i);} else {onEditStart(a.id,e,`vertex:${i}`);}} : undefined}
        onDoubleClick={editable ? e=>{e.stopPropagation();onDeleteVertex?.(a.id,i);} : undefined}>
        {editable && <title>Drag to move · double-click or Alt-click to delete</title>}
      </circle>)}
      <text x={(a.points[0]?.x||2)+1.2} y={(a.points[0]?.y||3)-1.2} fill={color} fontSize="2.3">{index+1}</text>
    </svg>;
  }
  return null;
});

function DrawingPreview({drawing,color}) {
  if (drawing.type === "rectangle") { const s=drawing.start,c=drawing.current; return <div className="drawing-box" style={{left:`${Math.min(s.x,c.x)}%`,top:`${Math.min(s.y,c.y)}%`,width:`${Math.abs(c.x-s.x)}%`,height:`${Math.abs(c.y-s.y)}%`,borderColor:color}}/>; }
  if (drawing.type === "line") return <svg className="annotation-svg drawing"><polyline points={[drawing.start,drawing.current].map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={color} strokeWidth=".7"/></svg>;
  if (drawing.type === "brush") return <svg className="annotation-svg drawing"><polyline points={drawing.points.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (drawing.points?.length) return <svg className="annotation-svg drawing"><polyline points={drawing.points.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={color} strokeWidth=".65" strokeDasharray="1.2 1"/><circle cx={drawing.points[0].x} cy={drawing.points[0].y} r="1" fill="#fff" stroke={color} strokeWidth=".45"/></svg>;
  return null;
}


function TaskPlannerPage({
  projects, tasks, teamMembers, annotations, qaReviews, selectedProjectId, setSelectedProjectId,
  priority, setPriority, queue, setQueue, date, setDate, targets, setTarget,
  reworkFilter, setReworkFilter, selection, setSelection, onRework, onRefresh, onBack,
  onOpenWorkspace, onAssign, assignmentOpen, assignmentTaskIds, assignmentAssignee, setAssignmentAssignee,
  assignmentReviewer, setAssignmentReviewer, assignmentPriority, setAssignmentPriority, assignmentQueue, setAssignmentQueue,
  onCloseAssignment, onSaveAssignment, message
}) {
  const [search, setSearch] = useState("");
  const [showAllProjects, setShowAllProjects] = useState(!selectedProjectId);
  const project = projects.find(p => p.id === selectedProjectId);
  const projectTasks = tasks.filter(t => !selectedProjectId || t.projectId === selectedProjectId);
  const projectMembers = teamMembers.filter(m => m.status === "Active" && (!selectedProjectId || (m.projects || []).includes(selectedProjectId)));
  const annotators = projectMembers.filter(m => m.role === "Annotator");
  const reviewers = projectMembers.filter(m => m.role === "Reviewer");
  const assigned = projectTasks.filter(t => t.assigneeId).length;
  const unassigned = Math.max(0, projectTasks.length - assigned);
  const submitted = projectTasks.filter(t => ["Submitted", "QA Review", "Approved", "Rejected", "Changes Requested"].includes(t.status)).length;
  const awaiting = projectTasks.filter(t => ["Submitted", "QA Review"].includes(t.status)).length;
  const inReview = projectTasks.filter(t => t.status === "QA Review").length;
  const reviewed = projectTasks.filter(t => ["Approved", "Rejected"].includes(t.status)).length;
  const issues = projectTasks.filter(t => ["Rejected", "Changes Requested"].includes(t.status) || qaReviews[t.id]?.decision === "Rejected" || qaReviews[t.id]?.decision === "Changes Requested").length;
  const total = project ? Number(project.totalImages || projectTasks.length) : projects.reduce((n,p)=>n+Number(p.totalImages||0),0);
  const completed = project ? Math.min(total, Number(project.completedImages || 0)) : projects.reduce((n,p)=>n+Number(p.completedImages||0),0);
  const progress = total ? Math.round(completed / total * 100) : 0;
  const visibleProjects = projects.filter(p => {
    const q = search.trim().toLowerCase();
    return !q || `${p.name} ${p.client} ${p.team}`.toLowerCase().includes(q);
  });
  const taskCandidates = projectTasks.filter(t => {
    if (reworkFilter === "Issues") return ["Rejected", "Changes Requested"].includes(t.status) || ["Rejected", "Changes Requested"].includes(qaReviews[t.id]?.decision);
    if (reworkFilter === "Submitted") return ["Submitted", "QA Review"].includes(t.status);
    return true;
  });

  useEffect(() => { setShowAllProjects(!selectedProjectId); }, [selectedProjectId]);

  const toggleSelection = id => setSelection(selection.includes(id) ? selection.filter(x=>x!==id) : [...selection, id]);
  const selectAllVisible = () => {
    const ids = taskCandidates.map(t=>t.id);
    setSelection(selection.length === ids.length && ids.length ? [] : ids);
  };

  if (showAllProjects) return <div className="page task-planner-page">
    <div className="page-head planner-landing-head">
      <div><span className="eyebrow">MANAGE</span><h1>Task Planner</h1><p>Select a project to plan assignments, track annotators and manage rework.</p></div>
      <div className="planner-landing-actions"><button className="secondary-btn" onClick={onRefresh}><RefreshCw size={15}/> Refresh</button></div>
    </div>
    <section className="planner-global-summary">
      <MiniStat label="Total Projects" value={projects.length}/>
      <MiniStat label="Total Tasks" value={projects.reduce((n,p)=>n+Number(p.totalImages||0),0).toLocaleString()}/>
      <MiniStat label="In Progress" value={projects.filter(p=>p.status === "In Progress").length}/>
      <MiniStat label="Completed" value={projects.filter(p=>p.status === "Completed").length}/>
    </section>
    <section className="panel planner-project-picker-panel">
      <div className="panel-head"><div><h2>Projects</h2><p>All annotation projects available for planning</p></div><div className="planner-project-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects..."/></div></div>
      <div className="planner-project-grid">
        {visibleProjects.map(p => <button key={p.id} className="planner-project-card" onClick={()=>setSelectedProjectId(p.id)}>
          <div className="planner-card-top"><span className="planner-folder"><FolderKanban size={17}/></span><StatusBadge status={p.status}/></div>
          <h3>{p.name}</h3><p>{p.client}</p>
          <div className="planner-card-meta"><span>{p.annotationType}</span><span>{p.team}</span></div>
          <div className="planner-card-progress"><div><b>{progressOf(p)}%</b><span>{Number(p.completedImages||0).toLocaleString()} / {Number(p.totalImages||0).toLocaleString()}</span></div><div className="progress-track"><i style={{width:`${progressOf(p)}%`}}/></div></div>
          <div className="planner-open-label">Open Task Planner <span>→</span></div>
        </button>)}
      </div>
      {!visibleProjects.length && <div className="empty-state"><FolderKanban size={38}/><h3>No projects found</h3><p>Try another project search.</p></div>}
    </section>
  </div>;

  return <div className="page task-planner-page planner-project-view">
    <div className="planner-reference-head">
      <div className="planner-title-wrap"><button className="planner-back-btn" onClick={onBack}>←</button><div><h1>Task Planner</h1><span>{project?.name || "Project"}</span></div></div>
      <div className="planner-head-controls">
        <button className="planner-project-btn" onClick={onBack}><FolderKanban size={14}/> Project</button>
        <div className="planner-control-group"><span>Priority:</span>{["TOP","HIGH","MEDIUM","LOW"].map(v=><button key={v} className={`priority-chip ${v.toLowerCase()} ${priority===v?"active":""}`} onClick={()=>setPriority(v)}>{v}</button>)}</div>
        <div className="planner-control-group"><span>Queue:</span>{["Now","Next","Later","Hold"].map(v=><button key={v} className={`queue-chip ${queue===v?"active":""} ${v === "Hold" ? "hold" : ""}`} onClick={()=>setQueue(v)}>{v}</button>)}</div>
        <button className="secondary-btn planner-refresh" onClick={onRefresh}><RefreshCw size={14}/> Refresh</button>
      </div>
    </div>

    <section className="planner-overall panel"><div><b>Overall Progress</b><div className="planner-progress-track"><i style={{width:`${progress}%`}}/></div></div><strong>{completed.toLocaleString()} / {total.toLocaleString()} completed ({progress}%)</strong></section>

    <section className="planner-stat-grid">
      <MiniStat label="Total Tasks" value={total.toLocaleString()}/><MiniStat label="Assigned" value={assigned.toLocaleString()}/><MiniStat label="Unassigned" value={unassigned.toLocaleString()}/><MiniStat label="Submitted" value={submitted.toLocaleString()}/><MiniStat label="Issues" value={issues.toLocaleString()}/><MiniStat label="Annotators" value={annotators.length}/><MiniStat label="Awaiting Review" value={awaiting.toLocaleString()}/><MiniStat label="In Review" value={inReview.toLocaleString()}/><MiniStat label="Reviewed" value={reviewed.toLocaleString()}/>
    </section>

    <section className="panel planner-section assignment-section">
      <div className="planner-section-head"><div><h2><UserPlus size={18}/> Task Assignment</h2><p>Assign tasks to annotators and reviewers, then control priority and queue placement.</p></div><button className="primary-btn" onClick={()=>onAssign(projectTasks.slice(0,1).map(t=>t.id))}><UserPlus size={15}/> Assign Tasks</button></div>
      <div className="assignment-toolbar"><div className="assignment-summary"><span><b>{assigned}</b> assigned</span><span><b>{unassigned}</b> unassigned</span><span><b>{projectTasks.filter(t=>t.priority === "TOP").length}</b> top priority</span><span><b>{projectTasks.filter(t=>t.queue === "Hold").length}</b> on hold</span></div><button className="secondary-btn" onClick={()=>onAssign(projectTasks.filter(t=>!t.assigneeId).slice(0,20).map(t=>t.id))} disabled={!unassigned}><Plus size={14}/> Assign unassigned</button></div>
      <div className="assignment-task-list">
        {projectTasks.slice(0,25).map(t => { const a=teamMembers.find(m=>m.id===t.assigneeId); const r=teamMembers.find(m=>m.id===t.reviewerId); return <div className="assignment-task-row" key={t.id}>
          <div className="assignment-task-main"><span className="task-id-chip">{t.id}</span><b>{t.name}</b><StatusBadge status={t.status}/></div>
          <div className="assignment-task-meta"><span>{a ? `A: ${a.name}` : "Unassigned"}</span><span>{r ? `R: ${r.name}` : "No reviewer"}</span><span className={`priority-mini ${String(t.priority||"MEDIUM").toLowerCase()}`}>{t.priority||"MEDIUM"}</span><span>{t.queue||"Now"}</span></div>
          <button className="tiny-outline" onClick={()=>onAssign([t.id])}>Manage</button>
        </div> })}
        {!projectTasks.length && <div className="planner-empty-row">No tasks are available for this project.</div>}
      </div>
      {projectTasks.length>25 && <div className="rework-more">Showing first 25 tasks. Use Import Data or the project workspace for the full dataset.</div>}
    </section>

    <section className="panel planner-section">
      <div className="planner-section-head"><div><h2>Annotator Tracking</h2><p>Assignment, submission and approval progress for this project.</p></div><span className="planner-section-tag">{annotators.length} annotators</span></div>
      <div className="planner-table-wrap"><table className="planner-table"><thead><tr><th>ANNOTATOR</th><th>TOTAL</th><th>PENDING</th><th>SUBMITTED</th><th>HAS ANNOTATIONS</th><th>CLEAN/IRRELEVANT</th><th>APPROVED</th><th>PROGRESS</th><th>ACTIONS</th></tr></thead><tbody>
        {annotators.map(member => { const mine=projectTasks.filter(t=>t.assigneeId===member.id); const pending=mine.filter(t=>["Pending","In Progress"].includes(t.status)).length; const sub=mine.filter(t=>["Submitted","QA Review","Approved","Rejected","Changes Requested"].includes(t.status)).length; const ann=mine.reduce((n,t)=>n+(annotations[t.id]||[]).length,0); const approved=mine.filter(t=>qaReviews[t.id]?.decision === "Approved" || t.status === "Approved").length; const bad=mine.filter(t=>["Rejected","Changes Requested"].includes(t.status) || ["Rejected","Changes Requested"].includes(qaReviews[t.id]?.decision)).length; const pct=mine.length?Math.round((sub/mine.length)*100):0; return <tr key={member.id}><td><b>{member.name}</b><small>{member.email}</small></td><td>{mine.length}</td><td className="planner-purple">{pending}</td><td className="planner-green">{sub}</td><td className="planner-purple">{ann}</td><td className="planner-red">{bad}</td><td className="planner-blue">{approved}</td><td><div className="planner-row-progress"><span><i style={{width:`${pct}%`}}/></span><b>{pct}%</b></div></td><td><button className="tiny-outline" onClick={()=>onAssign(mine.map(t=>t.id), member.id)}>Re-assign</button><button className="tiny-danger" onClick={()=>onAssign(mine.map(t=>t.id), "")}>Unassign</button></td></tr> })}
        {!annotators.length && <tr><td colSpan="9"><div className="planner-empty-row">No active annotators have access to this project.</div></td></tr>}
      </tbody></table></div>
    </section>

    <section className="panel planner-section rework-section">
      <div className="planner-section-head"><div><h2>↻ Trigger Rework</h2><p>Filter tasks, select which ones need rework, then choose an action.</p></div><span className="planner-section-tag">{selection.length} selected</span></div>
      <div className="rework-controls"><label><span>FILTER</span><select value={reworkFilter} onChange={e=>{setReworkFilter(e.target.value);setSelection([])}}><option>Issues</option><option>Submitted</option><option>All</option></select></label><button className="secondary-btn" onClick={selectAllVisible}><CheckSquare size={14}/> {selection.length===taskCandidates.length && taskCandidates.length ? "Clear Selection" : "Select All"}</button><button className="secondary-btn" onClick={()=>setSelection([])}>Clear</button></div>
      <div className="rework-task-list">{taskCandidates.slice(0,30).map(t=><label key={t.id} className={`rework-task-row ${selection.includes(t.id)?"selected":""}`}><input type="checkbox" checked={selection.includes(t.id)} onChange={()=>toggleSelection(t.id)}/><span className="rework-task-name"><b>{t.name}</b><small>{t.id}</small></span><StatusBadge status={t.status}/><span className="rework-project-name">{project?.name}</span></label>)}{!taskCandidates.length && <div className="planner-empty-row">No tasks match this rework filter.</div>}</div>
      {taskCandidates.length>30 && <div className="rework-more">Showing first 30 matching tasks.</div>}
      <div className="rework-actions"><button className="danger-outline" onClick={()=>onRework("rework")} disabled={!selection.length}><RefreshCw size={14}/> Request Rework</button><button className="primary-btn" onClick={()=>onRework("original")} disabled={!selection.length}><RotateCcw size={14}/> Return to Original Queue</button></div>
    </section>

    <section className="panel planner-section target-section">
      <div className="planner-section-head"><div><h2>◎ Annotator Targets</h2><p>Set daily and weekly production targets for this project.</p></div><button className="primary-btn" onClick={()=>setTarget("annotators", "__save__", "savedAt", Date.now())}><Save size={14}/> Save Targets</button></div>
      <div className="target-toolbar"><label>Apply to all: <span>Daily</span><input type="number" min="0" defaultValue="0" onKeyDown={e=>{if(e.key==="Enter"){const v=Number(e.currentTarget.value)||0; annotators.forEach(m=>setTarget("annotators",m.id,"daily",v));}}}/></label><small>Press Enter to apply. Weekly target = total assigned (at least daily × 5, capped at total).</small><div className="target-queue"><span>Queue — all:</span><button className="active">Original</button><button>Rework</button></div><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
      <TargetTable role="annotators" people={annotators} tasks={projectTasks} annotations={annotations} qaReviews={qaReviews} targets={targets} setTarget={setTarget} date={date} />
    </section>

    <section className="panel planner-section target-section">
      <div className="planner-section-head"><div><h2>◎ Reviewer Targets</h2><p>Track review throughput and set reviewer targets.</p></div><button className="primary-btn" onClick={()=>setTarget("reviewers", "__save__", "savedAt", Date.now())}><Save size={14}/> Save Targets</button></div>
      <div className="target-toolbar"><label>Apply to all: <span>Daily</span><input type="number" min="0" defaultValue="0" onKeyDown={e=>{if(e.key==="Enter"){const v=Number(e.currentTarget.value)||0; reviewers.forEach(m=>setTarget("reviewers",m.id,"daily",v));}}}/></label><small>Weekly target = assigned work with a minimum of daily × 5.</small><div className="target-queue"><span>Queue — all:</span><button className="active">Original</button><button>Rework</button></div><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
      <TargetTable role="reviewers" people={reviewers} tasks={projectTasks} annotations={annotations} qaReviews={qaReviews} targets={targets} setTarget={setTarget} date={date} reviewer />
    </section>
    {message && <div className="workspace-toast planner-toast"><CheckCircle2 size={17}/>{message}</div>}
    {assignmentOpen && <PlannerAssignmentModal
      tasks={projectTasks.filter(t=>assignmentTaskIds.includes(t.id))} teamMembers={teamMembers}
      assignee={assignmentAssignee} setAssignee={setAssignmentAssignee} reviewer={assignmentReviewer} setReviewer={setAssignmentReviewer}
      priority={assignmentPriority} setPriority={setAssignmentPriority} queue={assignmentQueue} setQueue={setAssignmentQueue}
      onClose={onCloseAssignment} onSave={onSaveAssignment}
    />}
  </div>;
}

function PlannerAssignmentModal({tasks, teamMembers, assignee, setAssignee, reviewer, setReviewer, priority, setPriority, queue, setQueue, onClose, onSave}) {
  const annotators = teamMembers.filter(m=>m.status === "Active" && m.role === "Annotator");
  const reviewers = teamMembers.filter(m=>m.status === "Active" && m.role === "Reviewer");
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><form className="modal planner-assignment-modal" onSubmit={e=>{e.preventDefault();onSave();}}>
    <div className="modal-head"><div><span className="eyebrow">TASK OPERATIONS</span><h2>Manage Assignment</h2><p>{tasks.length} task{tasks.length===1?"":"s"} selected for this operation.</p></div><button aria-label="Close dialog" type="button" className="modal-close" onClick={onClose}><X size={18}/></button></div>
    <div className="planner-assignment-task-preview">{tasks.slice(0,8).map(t=><div key={t.id}><span>{t.id}</span><b>{t.name}</b></div>)}{tasks.length>8&&<small>+ {tasks.length-8} more tasks</small>}</div>
    <div className="assignment-form-grid">
      <label><span>ANNOTATOR</span><select value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="">Unassigned</option>{annotators.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      <label><span>REVIEWER</span><select value={reviewer} onChange={e=>setReviewer(e.target.value)}><option value="">No reviewer</option>{reviewers.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      <label><span>PRIORITY</span><select value={priority} onChange={e=>setPriority(e.target.value)}>{["TOP","HIGH","MEDIUM","LOW"].map(v=><option key={v}>{v}</option>)}</select></label>
      <label><span>QUEUE</span><select value={queue} onChange={e=>setQueue(e.target.value)}>{["Now","Next","Later","Hold"].map(v=><option key={v}>{v}</option>)}</select></label>
    </div>
    <div className="assignment-capacity-note"><Zap size={16}/><span>Assignments update the Task Planner immediately and are saved locally.</span></div>
    <div className="modal-foot"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button type="submit" className="primary-btn"><Save size={15}/> Save Assignment</button></div>
  </form></div>;
}


function TargetTable({role, people, tasks, annotations, qaReviews, targets, setTarget}) {
  return <div className="planner-table-wrap"><table className="planner-table target-table"><thead><tr><th>{role === "reviewers" ? "REVIEWER" : "ANNOTATOR"}</th><th>ASSIGNED</th><th>{role === "reviewers" ? "REVIEWED" : "COMPLETED"}</th><th>REMAINING</th><th>DAILY TARGET</th><th>WEEKLY TARGET</th><th>DAYS NEEDED</th><th>TODAY'S PROGRESS</th><th>THIS WEEK</th><th>QUEUE MODE</th></tr></thead><tbody>
    {people.map(person => { const mine=tasks.filter(t=>t.assigneeId===person.id); const done=role === "reviewers" ? mine.filter(t=>["Approved","Rejected"].includes(t.status) || qaReviews[t.id]?.decision).length : mine.filter(t=>["Completed","Submitted","QA Review","Approved","Rejected","Changes Requested"].includes(t.status)).length; const remaining=Math.max(0,mine.length-done); const cfg=targets[role]?.[person.id]||{}; const daily=Number(cfg.daily)||0; const weekly=Math.min(mine.length, Math.max(Number(cfg.weekly)||0, daily*5)); const days=daily?Math.ceil(remaining/daily):null; const today=done; return <tr key={person.id}><td><b>{person.name}</b></td><td>{mine.length}</td><td className="planner-green">{done}</td><td className="planner-purple">{remaining}</td><td><input className="target-input" type="number" min="0" value={daily} onChange={e=>setTarget(role,person.id,"daily",e.target.value)}/></td><td><input className="target-input" type="number" min="0" value={Number(cfg.weekly)||weekly} onChange={e=>setTarget(role,person.id,"weekly",e.target.value)}/></td><td>{days===null?"—":days}</td><td>{today?today:"—"}</td><td>{done?done:"—"}</td><td><span className="queue-toggle"><b>Orig</b><span>Rework</span></span></td></tr>})}
    {!people.length && <tr><td colSpan="10"><div className="planner-empty-row">No active {role === "reviewers" ? "reviewers" : "annotators"} have access to this project.</div></td></tr>}
  </tbody></table></div>;
}

function ProjectConfigurationPage({groups,flatProjects,tasks,configProject,setConfigProject,config,tab,setTab,onAddLabel,onEditLabel,onDeleteLabel,onUpdateConfig,onUpdateProject,onBack,message,labelEditorOpen,setLabelEditorOpen,editingLabelId,labelForm,setLabelForm,onSaveLabel,labelSchemaError,setLabelSchemaError,onCreateLabelGroup,onRenameLabelGroup,onDeleteLabelGroup,onSaveSchemaVersion,onRestoreSchemaVersion,onExportSchema,onImportSchema,labelUsageStats,teamMembers,onCreateRule,onUpdateRule,onDeleteRule,onAddSuggestedRule,onCreateCriterion,onUpdateCriterion,onDeleteCriterion,onCreateErrorCategory,onUpdateErrorCategory,onDeleteErrorCategory,onAddCalibration,onDeleteCalibration,qaReviews}) {
  const project = groups.find(g => g.id === configProject) || groups[0];
  const reviewers = ["", "Priya Sharma", "Kavya Nair"];
  const workspaceOptions = ["", "Production", "QA Sandbox", "Client Review"];
  const groupTaskIds = flatProjects.filter(p => p.groupId === project?.id).map(p => p.id);
  const previewTask = tasks?.find(t => groupTaskIds.includes(t.projectId));
  const GroupIcon = GROUP_ICONS[project?.icon] || Layers;
  const samplingOptions = [
    { id: "Sequential", title: "Sequential sampling", text: "Tasks are ordered by Task ID." },
    { id: "Random", title: "Random sampling", text: "Tasks are chosen with uniform random." },
    { id: "Uncertainty", title: "Uncertainty sampling", text: "Tasks are chosen according to model uncertainty score (active learning mode).", pro: true }
  ];
  return <div className="page project-config-page">
    <div className="page-head"><div><button className="category-back-btn" onClick={onBack}><ChevronDown size={15} style={{transform:"rotate(90deg)"}}/> {project?.name || "Projects"}</button><span className="eyebrow">PROJECT ADMINISTRATION</span><h1>Project Configuration</h1><p>Configure labels, workflow and project-level rules before production work begins.</p></div></div>
    <div className="config-overview"><div className="config-project-icon" style={{background:project?.color?`${project.color}22`:undefined,color:project?.color||undefined}}><GroupIcon size={24}/></div><div><h2>{project?.name || "Project"}</h2><p>{groupTaskIds.length} task{groupTaskIds.length===1?"":"s"}</p></div><div className="config-overview-stats"><MiniStat label="Labels" value={config.labels.length}/><MiniStat label="QA" value={config.requireQa ? "Required" : "Optional"}/><MiniStat label="Auto-save" value={config.autoSave ? "On" : "Off"}/></div></div>
    <div className="config-tabs"><button className={tab==="General"?"active":""} onClick={()=>setTab("General")}><SlidersHorizontal size={16}/> General</button><button className={tab==="Labeling Interface"?"active":""} onClick={()=>setTab("Labeling Interface")}><Palette size={16}/> Labeling Interface</button><button className={tab==="Annotation"?"active":""} onClick={()=>setTab("Annotation")}><FileText size={16}/> Annotation</button><button className={tab==="Workflow"?"active":""} onClick={()=>setTab("Workflow")}><Workflow size={16}/> Workflow</button><button className={tab==="Automation"?"active":""} onClick={()=>setTab("Automation")}><Zap size={16}/> Automation</button><button className={tab==="SLA"?"active":""} onClick={()=>setTab("SLA")}><Calendar size={16}/> SLA & Deadlines</button><button className={tab==="QA Scorecard"?"active":""} onClick={()=>setTab("QA Scorecard")}><ShieldCheck size={16}/> QA Scorecard</button></div>

    {tab === "General" && <section className="panel config-panel general-settings-panel">
      <div className="config-panel-head"><div><h2>General Settings</h2><p>Basic identity and task-ordering rules for this project.</p></div><SlidersHorizontal size={20}/></div>
      <div className="general-settings-grid">
        <label><span>PROJECT NAME</span><input value={project?.name||""} onChange={e=>onUpdateProject(project.id,{name:e.target.value})} placeholder="Project name"/></label>
        <label className="full"><span>DESCRIPTION</span><textarea rows="3" value={project?.description||""} onChange={e=>onUpdateProject(project.id,{description:e.target.value})} placeholder="What is this project about?"/></label>
        <label><span>WORKSPACE</span><select value={config.workspace||""} onChange={e=>onUpdateConfig({workspace:e.target.value})}>{workspaceOptions.map(w=><option key={w} value={w}>{w||"Select an option"}</option>)}</select></label>
      </div>
      <div className="general-settings-section">
        <span className="section-label">COLOR</span>
        <div className="color-picker-row general-color-row"><button type="button" className={!config.color?"selected":""} style={{background:"#e5e9ee"}} onClick={()=>onUpdateConfig({color:""})}/>{labelPalette.map(c=><button type="button" key={c} className={config.color===c?"selected":""} style={{background:c}} onClick={()=>onUpdateConfig({color:c})}/>)}</div>
      </div>
      <div className="general-settings-section">
        <span className="section-label">TASK SAMPLING</span>
        <div className="sampling-options">{samplingOptions.map(opt=><label key={opt.id} className={`sampling-option ${config.taskSampling===opt.id?"active":""}`}><input type="radio" name="taskSampling" checked={config.taskSampling===opt.id} onChange={()=>onUpdateConfig({taskSampling:opt.id})}/><div><b>{opt.title}{opt.pro && <em className="pro-badge">Enterprise</em>}</b><span>{opt.text}</span></div></label>)}</div>
      </div>
    </section>}

    {tab === "Labeling Interface" && <TaxonomyManager config={config} onAddLabel={onAddLabel} onEditLabel={onEditLabel} onDeleteLabel={onDeleteLabel}
      onCreateLabelGroup={onCreateLabelGroup} onRenameLabelGroup={onRenameLabelGroup} onDeleteLabelGroup={onDeleteLabelGroup}
      onSaveSchemaVersion={onSaveSchemaVersion} onRestoreSchemaVersion={onRestoreSchemaVersion}
      onExportSchema={onExportSchema} onImportSchema={onImportSchema} labelUsageStats={labelUsageStats} previewTask={previewTask} />}

    {tab === "Annotation" && <section className="panel config-panel annotation-settings-panel">
      <div className="config-panel-head"><div><h2>Annotation Settings</h2><p>Instructions annotators see, plus optional prelabeling from predictions.</p></div><FileText size={20}/></div>
      <div className="annotation-settings-block">
        <h3>Labeling instructions</h3>
        <p className="settings-subtext">Write instructions to help annotators complete labeling tasks.</p>
        <SettingToggle title="Show before labeling" text="Display these instructions to annotators before they start a task." checked={!!config.showInstructionsBeforeLabeling} onChange={v=>onUpdateConfig({showInstructionsBeforeLabeling:v})}/>
        <textarea className="guideline-editor-textarea" value={config.instructions||""} onChange={e=>onUpdateConfig({instructions:e.target.value})} placeholder="Describe what should and should not be annotated..." rows="8"/>
      </div>
      <div className="annotation-settings-block">
        <h3>Prelabeling</h3>
        <SettingToggle title="Use predictions to prelabel tasks" text="Enable and select which set of predictions to use for prelabeling." checked={!!config.usePredictions} onChange={v=>onUpdateConfig({usePredictions:v})}/>
        {config.usePredictions && <label className="prelabel-select"><span>SELECT WHICH PREDICTIONS OR MODEL YOU WANT TO USE</span><select value={config.predictionSource||""} onChange={e=>onUpdateConfig({predictionSource:e.target.value})}><option value="">No predictions available yet</option><option value="latest-export">{project?.name} — latest export</option></select></label>}
      </div>
      <div className="guideline-tip"><ShieldCheck size={18}/><div><b>Recommended</b><p>Document edge cases, label definitions, occlusion rules, minimum object size and difficult scenes.</p></div></div>
    </section>}

    {tab === "Workflow" && <section className="panel config-panel"><div className="config-panel-head"><div><h2>Annotation workflow</h2><p>Control how tasks move from annotation to quality review.</p></div><CheckSquare size={20}/></div><div className="workflow-settings"><SettingToggle title="Require QA review" text="Every submitted task enters the QA Review queue before approval." checked={config.requireQa} onChange={v=>onUpdateConfig({requireQa:v})}/><SettingToggle title="Allow annotators to submit" text="Annotators can submit completed tasks directly for review." checked={config.allowAnnotatorSubmit} onChange={v=>onUpdateConfig({allowAnnotatorSubmit:v})}/><SettingToggle title="Auto-save annotations" text="Persist annotation changes locally while the task is being edited." checked={config.autoSave} onChange={v=>onUpdateConfig({autoSave:v})}/></div><div className="workflow-grid"><label><span>DEFAULT REVIEWER</span><select value={config.defaultReviewer||""} onChange={e=>onUpdateConfig({defaultReviewer:e.target.value})}>{reviewers.map(r=><option key={r} value={r}>{r || "No default reviewer"}</option>)}</select></label><label><span>MAX TASKS / ANNOTATOR</span><input type="number" min="1" max="1000" value={config.maxTasksPerAnnotator||10} onChange={e=>onUpdateConfig({maxTasksPerAnnotator:Number(e.target.value)||1})}/></label></div><div className="workflow-stages"><span>WORKFLOW</span><div><b>Pending</b><i>→</i><b>In Progress</b><i>→</i><b>Submitted</b><i>→</i><b>QA Review</b><i>→</i><b>Approved</b></div></div></section>}
    {tab === "Automation" && <WorkflowAutomationPanel groupId={configProject} config={config} groupTasks={(flatProjects.filter(p=>p.groupId===configProject).map(p=>p.id))} allTasks={tasks} teamMembers={teamMembers} onCreateRule={onCreateRule} onUpdateRule={onUpdateRule} onDeleteRule={onDeleteRule} onAddSuggestedRule={onAddSuggestedRule}/>}
    {tab === "SLA" && <section className="panel config-panel">
      <div className="config-panel-head"><div><h2>SLA & Deadlines</h2><p>Set turnaround targets for annotators and reviewers, and how long a breach waits before escalating.</p></div><Calendar size={20}/></div>
      <div className="workflow-grid">
        <label><span>ANNOTATOR SLA (HOURS)</span><input type="number" min="1" value={config.annotatorSlaHours ?? 24} onChange={e=>onUpdateConfig({annotatorSlaHours:Math.max(1,Number(e.target.value)||1)})}/><small className="field-hint">Target turnaround for a task from assignment to submission.</small></label>
        <label><span>REVIEWER SLA (HOURS)</span><input type="number" min="1" value={config.reviewerSlaHours ?? 12} onChange={e=>onUpdateConfig({reviewerSlaHours:Math.max(1,Number(e.target.value)||1)})}/><small className="field-hint">Target turnaround for QA review after submission.</small></label>
        <label><span>ESCALATE AFTER (HOURS PAST SLA)</span><input type="number" min="1" value={config.escalateAfterHours ?? 24} onChange={e=>onUpdateConfig({escalateAfterHours:Math.max(1,Number(e.target.value)||1)})}/><small className="field-hint">How long a task can stay overdue before it's automatically escalated to the project owner.</small></label>
      </div>
      <div className="config-empty small"><Calendar size={22}/><p>Individual task due dates can be set from the Deadlines dashboard. Project-level due dates are set when editing a project.</p></div>
    </section>}
    {tab === "QA Scorecard" && <QaScorecardConfigTab groupId={configProject} config={config} qaReviews={qaReviews} onUpdateConfig={onUpdateConfig} onCreateCriterion={onCreateCriterion} onUpdateCriterion={onUpdateCriterion} onDeleteCriterion={onDeleteCriterion} onCreateErrorCategory={onCreateErrorCategory} onUpdateErrorCategory={onUpdateErrorCategory} onDeleteErrorCategory={onDeleteErrorCategory} onAddCalibration={onAddCalibration} onDeleteCalibration={onDeleteCalibration} groupTasks={flatProjects.filter(p=>p.groupId===configProject).map(p=>p.id)} allTasks={tasks}/>}
    {message && <div className="workspace-toast"><CheckCircle2 size={17}/>{message}</div>}
    {labelEditorOpen && <LabelEditorModal editing={!!editingLabelId} form={labelForm} setForm={setLabelForm} onClose={()=>{setLabelEditorOpen(false); setLabelSchemaError("");}} onSave={onSaveLabel} error={labelSchemaError} allLabels={config.labels} editingLabelId={editingLabelId} labelGroups={config.labelGroups||[]}/>} 
  </div>;
}
function SettingToggle({title,text,checked,onChange}) { return <button type="button" className={`setting-toggle ${checked?"active":""}`} onClick={()=>onChange(!checked)}><span className="toggle-copy"><b>{title}</b><small>{text}</small></span><span className="switch"><i/></span></button>; }
function buildLabelTree(labels) {
  const byParent = {};
  labels.forEach(l => { const key = l.parentId || "__root__"; (byParent[key] = byParent[key] || []).push(l); });
  return byParent;
}

function LabelTreeNode({ label, depth, byParent, usage, onEdit, onDelete, onAddChild }) {
  const children = byParent[label.id] || [];
  return <>
    <div className="schema-row taxonomy-row" style={{ paddingLeft: `${14 + depth * 22}px` }}>
      {depth > 0 && <span className="taxonomy-tree-connector">↳</span>}
      <span className="schema-color" style={{ background: label.color }}></span>
      <div className="schema-main">
        <b>{label.name}</b>
        <span>{label.type}{label.attributes?.length ? ` · ${label.attributes.length} attribute${label.attributes.length===1?"":"s"}` : ""}</span>
      </div>
      {label.shortcut && <span className="schema-shortcut taxonomy-shortcut">{label.shortcut.toUpperCase()}</span>}
      <span className="taxonomy-usage" title="Annotations using this label">{usage[label.id] || 0} used</span>
      <div className="schema-actions">
        <button onClick={() => onAddChild(label.id)} title="Add child label"><Plus size={14}/></button>
        <button onClick={() => onEdit(label)} title="Edit"><Edit3 size={15}/></button>
        <button className="danger-icon" onClick={() => onDelete(label.id)} title="Delete"><Trash2 size={15}/></button>
      </div>
    </div>
    {children.map(child => <LabelTreeNode key={child.id} label={child} depth={depth + 1} byParent={byParent} usage={usage} onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild}/>)}
  </>;
}

function TaxonomyManager({ config, onAddLabel, onEditLabel, onDeleteLabel, onCreateLabelGroup, onRenameLabelGroup, onDeleteLabelGroup, onSaveSchemaVersion, onRestoreSchemaVersion, onExportSchema, onImportSchema, labelUsageStats, previewTask }) {
  const [newGroupName, setNewGroupName] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [groupFilter, setGroupFilter] = useState("All");
  const fileInputRef = useRef(null);
  const labels = config.labels || [];
  const labelGroups = config.labelGroups || [];
  const filtered = groupFilter === "All" ? labels : labels.filter(l => (l.groupId || "Ungrouped") === groupFilter);
  const byParent = buildLabelTree(filtered);
  const roots = byParent["__root__"] || [];
  return <section className="panel config-panel labeling-interface-panel">
    <div className="config-panel-head">
      <div><h2>Label & Taxonomy Manager</h2><p>Build a hierarchy of labels, group them, attach attributes, and track how each one is used.</p></div>
      <div className="taxonomy-head-actions">
        <button className="secondary-btn" onClick={onExportSchema} title="Export label schema as JSON" aria-label="Export label schema as JSON"><Download size={15}/> Export</button>
        <button className="secondary-btn" onClick={() => fileInputRef.current?.click()} title="Import label schema JSON"><Upload size={15}/> Import</button>
        <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) onImportSchema(f); e.target.value = ""; }}/>
        <button className="primary-btn" onClick={() => onAddLabel(null)}><Plus size={16}/> Add Label</button>
      </div>
    </div>

    <div className="taxonomy-toolbar">
      <div className="schema-version-badge"><Layers size={14}/> Schema v{config.schemaVersion || 1}</div>
      <button className="ghost-btn" onClick={() => onSaveSchemaVersion()}><Save size={14}/> Save New Version</button>
      <button className="ghost-btn" onClick={() => setHistoryOpen(v => !v)}><Clock3 size={14}/> Version History ({(config.schemaHistory||[]).length})</button>
    </div>
    {historyOpen && <div className="schema-history-list">
      {(config.schemaHistory || []).length ? (config.schemaHistory || []).map((h,i) => <div className="schema-history-row" key={i}>
        <div><b>v{h.version}</b><span>{h.labelCount} label{h.labelCount===1?"":"s"} · {new Date(h.savedAt).toLocaleString()}{h.note ? ` · ${h.note}` : ""}</span></div>
        <button className="ghost-btn" onClick={() => onRestoreSchemaVersion(h)}><RotateCcw size={13}/> Restore</button>
      </div>) : <div className="config-empty small"><Clock3 size={22}/><p>No saved versions yet. Save one before making big schema changes.</p></div>}
    </div>}

    <div className="label-group-strip">
      <button className={groupFilter==="All"?"active":""} onClick={()=>setGroupFilter("All")}>All labels ({labels.length})</button>
      <button className={groupFilter==="Ungrouped"?"active":""} onClick={()=>setGroupFilter("Ungrouped")}>Ungrouped ({labels.filter(l=>!l.groupId).length})</button>
      {labelGroups.map(g => <span key={g.id} className={`label-group-chip ${groupFilter===g.id?"active":""}`}>
        <button onClick={()=>setGroupFilter(g.id)} style={{"--chip-color":g.color}}>{g.name} ({labels.filter(l=>l.groupId===g.id).length})</button>
        <button className="chip-x" title="Delete group" aria-label="Delete group" onClick={()=>onDeleteLabelGroup(g.id)}><X size={11}/></button>
      </span>)}
      <form className="new-group-form" onSubmit={e=>{e.preventDefault(); if(newGroupName.trim()){onCreateLabelGroup(newGroupName); setNewGroupName("");}}}>
        <input value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} placeholder="New label group..."/>
        <button type="submit" title="Create group" aria-label="Create group"><Plus size={14}/></button>
      </form>
    </div>

    <div className="labeling-interface-grid">
      <div className="label-schema-list taxonomy-list">
        {roots.length ? roots.map(label => <LabelTreeNode key={label.id} label={label} depth={0} byParent={byParent} usage={labelUsageStats||{}} onEdit={onEditLabel} onDelete={onDeleteLabel} onAddChild={onAddLabel}/>)
          : <div className="config-empty"><Palette size={34}/><h3>No labels configured</h3><p>Add labels to make this project annotatable.</p></div>}
      </div>
      <div className="ui-preview-panel">
        <span className="section-label">UI PREVIEW</span>
        <div className="ui-preview-image">{previewTask ? <img src={previewTask.image} alt="" loading="lazy" decoding="async"/> : <div className="ui-preview-empty"><ImageIcon size={26}/><span>No sample image yet</span></div>}</div>
        <div className="ui-preview-labels"><span className="section-label">labels</span><div className="ui-preview-label-chips">{labels.length ? labels.map(l=><span key={l.id} className="preview-chip" style={{background:`${l.color}22`,color:l.color,borderColor:`${l.color}55`}}>{l.name}{l.shortcut ? ` (${l.shortcut.toUpperCase()})` : ""}</span>) : <span className="preview-chip-empty">No labels yet</span>}</div></div>
        <div className="ui-preview-regions"><span className="section-label">usage</span><div className="taxonomy-usage-list">{labels.length ? [...labels].sort((a,b)=>(labelUsageStats?.[b.id]||0)-(labelUsageStats?.[a.id]||0)).slice(0,6).map(l=><div key={l.id} className="taxonomy-usage-row"><span className="schema-color" style={{background:l.color}}/><span>{l.name}</span><b>{labelUsageStats?.[l.id]||0}</b></div>) : <div className="ui-preview-regions-empty"><MousePointer2 size={16}/><span>Usage stats appear once annotators start working.</span></div>}</div></div>
      </div>
    </div>
  </section>;
}

const PIPELINE_STAGES = ["Created", "Assigned", "Annotating", "Submitted", "QA", "Rework", "Approved", "Completed"];
const WHEN_STATUS_OPTIONS = [
  { id: "Pending", label: "Created / Pending" },
  { id: "Submitted", label: "Submitted" },
  { id: "QA Review", label: "QA Review" },
  { id: "Rejected", label: "Rejected" },
  { id: "Changes Requested", label: "Changes Requested" },
  { id: "Approved", label: "Approved" }
];
const AUTOMATION_ACTIONS = [
  { id: "auto_assign", label: "Auto-assign to annotator", icon: Users },
  { id: "auto_route_qa", label: "Route to QA reviewer", icon: ShieldCheck },
  { id: "auto_route_rework", label: "Route back for rework", icon: RotateCcw },
  { id: "escalate", label: "Escalate", icon: AlertCircle },
  { id: "auto_complete", label: "Auto-complete task", icon: CheckCircle2 },
  { id: "notify", label: "Send notification only", icon: Bell }
];
const SUGGESTED_RULE_TEMPLATES = [
  { name: "Auto-assign new tasks", whenStatus: "Pending", afterHours: 0, action: "auto_assign", note: "", enabled: true, blurb: "Assign unassigned tasks to the least-loaded annotator the moment they're created." },
  { name: "Route submissions to QA", whenStatus: "Submitted", afterHours: 0, action: "auto_route_qa", note: "", enabled: true, blurb: "Send every submitted task to the least-loaded reviewer automatically." },
  { name: "Auto rework routing", whenStatus: "Rejected", afterHours: 0, action: "auto_route_rework", note: "", enabled: true, blurb: "Send rejected tasks straight back to their annotator and reopen them." },
  { name: "Escalate stalled QA", whenStatus: "Submitted", afterHours: 24, action: "escalate", note: "", enabled: true, blurb: "Flag the project owner if a task sits in QA for over 24 hours." },
  { name: "Auto-complete approved work", whenStatus: "Approved", afterHours: 48, action: "auto_complete", note: "", enabled: true, blurb: "Move approved tasks to Completed after 48 hours with no further action." }
];

function pipelineStageCounts(groupTasks) {
  return {
    Created: groupTasks.filter(t => t.status === "Pending" && !t.assigneeId).length,
    Assigned: groupTasks.filter(t => t.status === "Pending" && t.assigneeId).length,
    Annotating: groupTasks.filter(t => t.status === "In Progress").length,
    Submitted: groupTasks.filter(t => t.status === "Submitted").length,
    QA: groupTasks.filter(t => t.status === "QA Review").length,
    Rework: groupTasks.filter(t => ["Rejected", "Changes Requested"].includes(t.status)).length,
    Approved: groupTasks.filter(t => t.status === "Approved").length,
    Completed: groupTasks.filter(t => t.status === "Completed").length
  };
}

function WorkflowAutomationPanel({ groupId, config, groupTasks, allTasks, teamMembers, onCreateRule, onUpdateRule, onDeleteRule, onAddSuggestedRule }) {
  const rules = config.automationRules || [];
  const groupTaskSet = new Set(groupTasks);
  const scopedTasks = allTasks.filter(t => groupTaskSet.has(t.projectId));
  const counts = pipelineStageCounts(scopedTasks);
  const unusedTemplates = SUGGESTED_RULE_TEMPLATES.filter(t => !rules.some(r => r.name === t.name));

  return <section className="panel config-panel automation-panel">
    <div className="config-panel-head"><div><h2>Workflow Automation</h2><p>Automate assignment, QA routing, rework, escalation and notifications as tasks move through the pipeline.</p></div><Zap size={20}/></div>

    <div className="pipeline-diagram">
      {PIPELINE_STAGES.map((stage, i) => <React.Fragment key={stage}>
        <div className="pipeline-stage"><b>{counts[stage] || 0}</b><span>{stage}</span></div>
        {i < PIPELINE_STAGES.length - 1 && <i className="pipeline-arrow">→</i>}
      </React.Fragment>)}
    </div>

    <div className="automation-rules-head"><h3>Automation Rules ({rules.length})</h3><button className="primary-btn" onClick={() => onCreateRule(groupId)}><Plus size={15}/> New Rule</button></div>

    {rules.length ? <div className="automation-rules-list">
      {rules.map(rule => <AutomationRuleRow key={rule.id} rule={rule} teamMembers={teamMembers} onUpdate={(patch) => onUpdateRule(groupId, rule.id, patch)} onDelete={() => onDeleteRule(groupId, rule.id)}/>)}
    </div> : <div className="config-empty"><Workflow size={34}/><h3>No automation rules yet</h3><p>Add a rule manually, or start from a suggested template below.</p></div>}

    {!!unusedTemplates.length && <div className="automation-templates">
      <span className="section-label">SUGGESTED RULES</span>
      <div className="automation-template-grid">
        {unusedTemplates.map(t => <div className="automation-template-card" key={t.name}>
          <b>{t.name}</b><p>{t.blurb}</p>
          <button className="ghost-btn" onClick={() => onAddSuggestedRule(groupId, { name: t.name, enabled: t.enabled, whenStatus: t.whenStatus, afterHours: t.afterHours, action: t.action, note: t.note })}><Plus size={13}/> Add</button>
        </div>)}
      </div>
    </div>}
  </section>;
}

function AutomationRuleRow({ rule, teamMembers, onUpdate, onDelete }) {
  const ActionIcon = AUTOMATION_ACTIONS.find(a => a.id === rule.action)?.icon || Zap;
  return <div className={`automation-rule-row ${rule.enabled ? "" : "disabled"}`}>
    <button type="button" className={`switch-btn ${rule.enabled ? "on" : ""}`} onClick={() => onUpdate({ enabled: !rule.enabled })} title={rule.enabled ? "Disable rule" : "Enable rule"}><i/></button>
    <input className="rule-name-input" value={rule.name} onChange={e => onUpdate({ name: e.target.value })} placeholder="Rule name"/>
    <div className="rule-condition">
      <span>When status is</span>
      <select value={rule.whenStatus} onChange={e => onUpdate({ whenStatus: e.target.value })}>{WHEN_STATUS_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
      <input type="number" min="0" className="rule-hours-input" value={rule.afterHours || 0} onChange={e => onUpdate({ afterHours: Math.max(0, Number(e.target.value) || 0) })} title="Hours to wait before firing (0 = immediately)"/>
      <span>hr{rule.afterHours === 1 ? "" : "s"} later</span>
    </div>
    <div className="rule-action"><ActionIcon size={14}/><select value={rule.action} onChange={e => onUpdate({ action: e.target.value })}>{AUTOMATION_ACTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></div>
    {rule.action === "notify" && <input className="rule-note-input" value={rule.note || ""} onChange={e => onUpdate({ note: e.target.value })} placeholder="Notification message"/>}
    <button className="danger-icon" onClick={onDelete} title="Delete rule" aria-label="Delete rule"><Trash2 size={15}/></button>
  </div>;
}

const SEVERITY_OPTIONS = ["Minor", "Major", "Critical"];

function QaScorecardConfigTab({ groupId, config, qaReviews, onUpdateConfig, onCreateCriterion, onUpdateCriterion, onDeleteCriterion, onCreateErrorCategory, onUpdateErrorCategory, onDeleteErrorCategory, onAddCalibration, onDeleteCalibration, groupTasks, allTasks }) {
  const criteria = config.qaCriteria || [];
  const categories = config.errorCategories || [];
  const calibration = config.calibrationSet || [];
  const totalWeight = criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const groupTaskSet = new Set(groupTasks);
  const reviewableTasks = allTasks.filter(t => groupTaskSet.has(t.projectId) && qaReviews[t.id]);
  const [calTaskId, setCalTaskId] = useState("");
  const [calGold, setCalGold] = useState(90);
  const [calNotes, setCalNotes] = useState("");

  return <section className="panel config-panel qa-scorecard-config">
    <div className="config-panel-head"><div><h2>QA Scorecard</h2><p>Define weighted scoring criteria, error taxonomy, sampling rate and calibration references for this project's reviewers.</p></div><ShieldCheck size={20}/></div>

    <div className="qa-config-block">
      <div className="qa-config-block-head"><h3>Scoring Criteria <span className={`weight-total ${totalWeight===100?"ok":"warn"}`}>{totalWeight}% total</span></h3><button className="ghost-btn" onClick={() => onCreateCriterion(groupId)}><Plus size={13}/> Add Criterion</button></div>
      {criteria.length ? <div className="qa-criteria-config-list">{criteria.map(c => <div className="qa-criterion-config-row" key={c.id}>
        <input value={c.name} onChange={e => onUpdateCriterion(groupId, c.id, { name: e.target.value })}/>
        <div className="weight-input"><input type="number" min="0" max="100" value={c.weight} onChange={e => onUpdateCriterion(groupId, c.id, { weight: Math.max(0, Number(e.target.value) || 0) })}/><span>%</span></div>
        <button aria-label="Delete criterion" className="danger-icon" onClick={() => onDeleteCriterion(groupId, c.id)}><Trash2 size={14}/></button>
      </div>)}</div> : <div className="config-empty small"><ShieldCheck size={22}/><p>No criteria yet — reviewers will use a single overall score instead.</p></div>}
      {totalWeight !== 100 && !!criteria.length && <p className="field-hint weight-warning">Weights should add up to 100% — they're currently normalized automatically, but exact weights are clearer.</p>}
    </div>

    <div className="qa-config-block">
      <div className="qa-config-block-head"><h3>Error Categories</h3><button className="ghost-btn" onClick={() => onCreateErrorCategory(groupId)}><Plus size={13}/> Add Category</button></div>
      {categories.length ? <div className="qa-criteria-config-list">{categories.map(c => <div className="qa-error-config-row" key={c.id}>
        <input value={c.name} onChange={e => onUpdateErrorCategory(groupId, c.id, { name: e.target.value })}/>
        <select value={c.severity} onChange={e => onUpdateErrorCategory(groupId, c.id, { severity: e.target.value })}>{SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
        <button aria-label="Delete category" className="danger-icon" onClick={() => onDeleteErrorCategory(groupId, c.id)}><Trash2 size={14}/></button>
      </div>)}</div> : <div className="config-empty small"><AlertCircle size={22}/><p>No error categories defined yet.</p></div>}
    </div>

    <div className="qa-config-block">
      <div className="qa-config-block-head"><h3>QA Sampling</h3></div>
      <label className="sampling-slider-label"><span>Review {config.samplingRate ?? 100}% of submitted tasks</span><input type="range" min="1" max="100" value={config.samplingRate ?? 100} onChange={e => onUpdateConfig({ samplingRate: Number(e.target.value) })}/></label>
      <p className="field-hint">Tasks outside the sample are auto-approved on submission and logged as a sampling skip. Set to 100% to review everything.</p>
    </div>

    <div className="qa-config-block">
      <div className="qa-config-block-head"><h3>Calibration Set</h3></div>
      <form className="calibration-add-form" onSubmit={e => { e.preventDefault(); if (!calTaskId.trim()) return; onAddCalibration(groupId, calTaskId.trim(), calGold, calNotes); setCalTaskId(""); setCalNotes(""); }}>
        <input value={calTaskId} onChange={e => setCalTaskId(e.target.value)} placeholder="Task ID"/>
        <input type="number" min="0" max="100" value={calGold} onChange={e => setCalGold(e.target.value)} placeholder="Gold score"/>
        <input value={calNotes} onChange={e => setCalNotes(e.target.value)} placeholder="Notes (optional)" className="calibration-notes-input"/>
        <button type="submit" className="ghost-btn"><Plus size={13}/> Add</button>
      </form>
      {calibration.length ? <div className="calibration-list">{calibration.map(entry => {
        const review = qaReviews[entry.taskId];
        const drift = review && review.score !== null && review.score !== undefined ? review.score - entry.goldScore : null;
        return <div className="calibration-row" key={entry.id}>
          <div><b>{entry.taskId}</b><span>Gold: {entry.goldScore}{entry.notes ? ` · ${entry.notes}` : ""}</span></div>
          {drift !== null ? <span className={`drift-badge ${Math.abs(drift) <= 5 ? "good" : Math.abs(drift) <= 15 ? "warn" : "bad"}`}>{review.reviewer}: {review.score} ({drift > 0 ? "+" : ""}{drift})</span> : <span className="drift-badge pending">Not reviewed yet</span>}
          <button aria-label="Delete calibration entry" className="danger-icon" onClick={() => onDeleteCalibration(groupId, entry.id)}><Trash2 size={13}/></button>
        </div>;
      })}</div> : <div className="config-empty small"><Target size={22}/><p>Add a reference task with an expert "gold" score to track reviewer calibration drift.</p></div>}
      {!!reviewableTasks.length && <p className="field-hint">{reviewableTasks.length} reviewed task{reviewableTasks.length===1?"":"s"} in this project can be used as calibration references.</p>}
    </div>
  </section>;
}

function LabelEditorModal({editing,form,setForm,onClose,onSave,error,allLabels,editingLabelId,labelGroups}) {
  const parentOptions = (allLabels||[]).filter(l => l.id !== editingLabelId);
  const addAttribute = () => setForm({ ...form, attributes: [...(form.attributes||[]), { id: `attr-${Date.now()}`, name: "", type: "Text", options: "", required: false }] });
  const updateAttribute = (id, patch) => setForm({ ...form, attributes: (form.attributes||[]).map(a => a.id === id ? { ...a, ...patch } : a) });
  const removeAttribute = (id) => setForm({ ...form, attributes: (form.attributes||[]).filter(a => a.id !== id) });
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><form className="modal label-editor-modal" onSubmit={onSave}>
    <div className="modal-head"><div><span className="eyebrow">LABEL SCHEMA</span><h2>{editing?"Edit Label":"Add Label"}</h2><p>Define the label shown in the annotation workspace.</p></div><button aria-label="Close dialog" type="button" className="modal-close" onClick={onClose}><X size={18}/></button></div>
    <div className="label-editor-form">
      <label><span>LABEL NAME</span><input autoFocus required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Pedestrian"/></label>
      <label><span>GEOMETRY TYPE</span><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Rectangle</option><option>Polygon</option><option>Polyline</option><option>Keypoint</option><option>Classification</option></select></label>
      <label><span>PARENT LABEL</span><select value={form.parentId||""} onChange={e=>setForm({...form,parentId:e.target.value})}><option value="">No parent (top-level)</option>{parentOptions.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
      <label><span>LABEL GROUP</span><select value={form.groupId||""} onChange={e=>setForm({...form,groupId:e.target.value})}><option value="">Ungrouped</option>{(labelGroups||[]).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
      <label><span>KEYBOARD SHORTCUT</span><input maxLength={1} value={form.shortcut||""} onChange={e=>setForm({...form,shortcut:e.target.value.slice(0,1)})} placeholder="e.g. 1"/><small className="field-hint">Single key to select this label while annotating. V, B, P, L, K, G, R, E and Space are reserved for tools.</small></label>
      <label><span>LABEL COLOR</span><div className="color-picker-row">{labelPalette.map(c=><button type="button" key={c} className={form.color===c?"selected":""} style={{background:c}} onClick={()=>setForm({...form,color:c})}/>)}</div></label>
      <div className="attribute-editor">
        <div className="attribute-editor-head"><span>ATTRIBUTES</span><button type="button" className="ghost-btn" onClick={addAttribute}><Plus size={13}/> Add Attribute</button></div>
        {(form.attributes||[]).length ? (form.attributes||[]).map(attr => <div className="attribute-row" key={attr.id}>
          <input value={attr.name} onChange={e=>updateAttribute(attr.id,{name:e.target.value})} placeholder="Attribute name"/>
          <select value={attr.type} onChange={e=>updateAttribute(attr.id,{type:e.target.value})}>{ATTRIBUTE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>
          {attr.type === "Select" && <input value={attr.options||""} onChange={e=>updateAttribute(attr.id,{options:e.target.value})} placeholder="option1, option2, ..."/>}
          <label className="attribute-required"><input type="checkbox" checked={!!attr.required} onChange={e=>updateAttribute(attr.id,{required:e.target.checked})}/> Required</label>
          <button aria-label="Remove attribute" type="button" className="danger-icon" onClick={()=>removeAttribute(attr.id)}><Trash2 size={14}/></button>
        </div>) : <p className="attribute-empty">No attributes yet — add one for extra metadata annotators must fill in (e.g. color, occlusion, condition).</p>}
      </div>
      {error && <div className="form-error"><AlertCircle size={14}/> {error}</div>}
    </div>
    <div className="modal-foot"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button type="submit" className="primary-btn"><Save size={15}/>{editing?"Save Changes":"Add Label"}</button></div>
  </form></div>;
}

function ProjectsPage({groups,projects,teamMembers,projectConfigs,auditEvents,search,setSearch,filter,setFilter,onCreate,onEdit,onDelete,onDetails,onWorkspace,onReview,onPlanner,onTaskSettings,onCreateGroup,onEditGroup,onDeleteGroup,onDuplicateGroup,onArchiveGroup,onRestoreGroup,onOpenConfig,groupMessage,canManage,canEditProject}) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupStatusFilter, setGroupStatusFilter] = useState("Active");
  const [groupSort, setGroupSort] = useState("Name");
  const groupOf = p => p.groupId;
  const activeGroup = groups.find(g => g.id === activeCategory);
  const memberById = id => teamMembers.find(m => m.id === id);

  if (activeGroup) {
    const categoryProjects = projects.filter(p => groupOf(p) === activeGroup.id);
    const groupTaskIds = categoryProjects.map(p => p.id);
    const GroupIcon = GROUP_ICONS[activeGroup.icon] || Layers;
    const config = projectConfigs[activeGroup.id];
    const owner = memberById(activeGroup.ownerId);
    const team = (activeGroup.teamIds || []).map(memberById).filter(Boolean);
    const recentActivity = auditEvents.filter(e => groupTaskIds.includes(e.projectId)).slice(0, 5);
    const health = projectHealth(categoryProjects, recentActivity);
    return <div className="page">
      <div className="page-head category-drill-head">
        <div>
          <button className="category-back-btn" onClick={()=>setActiveCategory(null)}><ChevronDown size={15} style={{transform:"rotate(90deg)"}}/> Projects</button>
          <div className="category-drill-title"><span className="category-dot" style={{background:activeGroup.color}}/><h1>{activeGroup.name}</h1><span className="category-count-pill">{categoryProjects.length} task{categoryProjects.length===1?"":"s"}</span><span className="category-count-pill stage-pill">{activeGroup.stage || "Planning"}</span><span className={`category-count-pill health-pill health-${health.level.replace(" ","-").toLowerCase()}`}>{health.level}</span>{activeGroup.status==="Archived" && <span className="category-count-pill archived-pill">Archived</span>}</div>
          {activeGroup.description && <p className="category-drill-desc">{activeGroup.description}</p>}
        </div>
        {canEditProject(activeGroup) && <div className="category-drill-actions">
          <button className="secondary-btn" onClick={()=>onOpenConfig(activeGroup.id)}><Settings size={16}/> Configuration</button>
          <button className="primary-btn" onClick={()=>onCreate(activeGroup.id)}><Plus size={17}/> Create Task</button>
        </div>}
      </div>
      <div className="project-summary"><MiniStat label="Total Tasks" value={categoryProjects.length}/><MiniStat label="In Progress" value={categoryProjects.filter(p=>p.status==="In Progress").length}/><MiniStat label="Completed" value={categoryProjects.filter(p=>p.status==="Completed").length}/><MiniStat label="Overdue" value={health.overdue}/></div>

      <div className="project-overview-grid">
        <section className="panel overview-card">
          <div className="panel-head"><div><h2>Team</h2><p>Owner and members assigned to this project</p></div><Users size={17}/></div>
          <div className="overview-team-body">
            <div className="overview-owner-row"><span className="overview-label">OWNER</span>{owner ? <div className="overview-person"><div className="member-avatar small">{initials(owner.name)}</div><span>{owner.name}</span></div> : <span className="no-access">No owner assigned</span>}</div>
            <div className="overview-owner-row"><span className="overview-label">TEAM ({team.length})</span>{team.length ? <div className="overview-avatar-stack">{team.map(m=><div key={m.id} className="member-avatar small" title={m.name}>{initials(m.name)}</div>)}</div> : <span className="no-access">No team members assigned</span>}</div>
          </div>
        </section>
        <section className="panel overview-card">
          <div className="panel-head"><div><h2>Configuration Summary</h2><p>Workflow and labeling setup</p></div><SlidersHorizontal size={17}/></div>
          <div className="overview-summary-list">
            <div><span>Labels configured</span><b>{config?.labels?.length || 0}</b></div>
            <div><span>QA review</span><b>{config?.requireQa ? "Required" : "Optional"}</b></div>
            <div><span>Auto-save</span><b>{config?.autoSave ? "On" : "Off"}</b></div>
            <div><span>Task sampling</span><b>{config?.taskSampling || "Sequential"}</b></div>
          </div>
        </section>
        <section className="panel overview-card">
          <div className="panel-head"><div><h2>Recent Activity</h2><p>Latest events across this project's tasks</p></div><Activity size={17}/></div>
          <div className="overview-activity-list">
            {recentActivity.length ? recentActivity.map(e=><div key={e.id} className="overview-activity-row"><b>{e.action}</b><span>{e.actor} · {new Date(e.timestamp).toLocaleDateString()}</span></div>) : <span className="no-access">No activity yet</span>}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="project-filters"><div className="filter-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks..."/></div><div className="select-wrap"><ListFilter size={16}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Pending</option><option>In Progress</option><option>Completed</option></select></div></div>
        <div className="project-grid">{categoryProjects.map(p=><ProjectCard key={p.id} p={p} onEdit={()=>onEdit(p)} onDelete={()=>onDelete(p.id)} onDetails={()=>onDetails(p)} onWorkspace={()=>onWorkspace(p.id)} onReview={()=>onReview(p.id)} onPlanner={()=>onPlanner(p.id)} onSettings={()=>onTaskSettings(p.id)} canManage={canEditProject(activeGroup)}/>)}</div>
        {!categoryProjects.length && <div className="empty-state"><FolderKanban size={40}/><h3>No tasks in {activeGroup.name} yet</h3><p>Create one to get started.</p></div>}
      </section>
    </div>;
  }

  const visibleGroups = groups
    .filter(g => groupStatusFilter === "All" || (g.status || "Active") === groupStatusFilter)
    .filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()))
    .sort((a,b) => {
      if (groupSort === "Most tasks") return projects.filter(p=>groupOf(p)===b.id).length - projects.filter(p=>groupOf(p)===a.id).length;
      if (groupSort === "Newest") return (b.id > a.id ? 1 : -1);
      return a.name.localeCompare(b.name);
    });

  return <div className="page"><div className="page-head"><div><span className="eyebrow">WORKSPACE</span><h1>Projects</h1><p>Create, organize and monitor your annotation projects.</p></div>{canManage && <button className="primary-btn" onClick={onCreateGroup}><Plus size={17}/> Create Project</button>}</div>
    {groupMessage && <div className="workspace-toast"><AlertCircle size={17}/>{groupMessage}</div>}
    <div className="project-filters standalone">
      <div className="filter-search"><Search size={17}/><input value={groupSearch} onChange={e=>setGroupSearch(e.target.value)} placeholder="Search projects..."/></div>
      <div className="select-wrap"><ListFilter size={16}/><select value={groupStatusFilter} onChange={e=>setGroupStatusFilter(e.target.value)}><option>All</option><option>Active</option><option>Archived</option></select></div>
      <div className="select-wrap"><ArrowUpDown size={16}/><select value={groupSort} onChange={e=>setGroupSort(e.target.value)}><option>Name</option><option>Most tasks</option><option>Newest</option></select></div>
    </div>
    <div className="category-tile-grid">
      {visibleGroups.map(group => {
        const groupProjects = projects.filter(p => groupOf(p) === group.id);
        const count = groupProjects.length;
        const Icon = GROUP_ICONS[group.icon] || Layers;
        const owner = memberById(group.ownerId);
        const team = (group.teamIds || []).map(memberById).filter(Boolean);
        const archived = group.status === "Archived";
        const groupTaskIds = groupProjects.map(p => p.id);
        const health = projectHealth(groupProjects, auditEvents.filter(e => groupTaskIds.includes(e.projectId)));
        return <div key={group.id} className={`category-tile-wrap ${archived?"archived":""}`}>
          {archived && <span className="archived-badge">Archived</span>}
          <button className="category-tile" onClick={()=>setActiveCategory(group.id)}>
            <span className="category-tile-icon" style={{background:`${group.color}22`,color:group.color}}><Icon size={20}/></span>
            <div className="category-tile-title-row"><b>{group.name}</b>{count > 0 && <span className={`health-dot health-${health.level.replace(" ","-").toLowerCase()}`} title={`${health.level}${health.overdue?` · ${health.overdue} overdue`:""}`}/>}</div>
            <span className="category-tile-count">{count} task{count===1?"":"s"}{owner?` · Owner: ${owner.name}`:""}</span>
            {team.length > 0 && <div className="overview-avatar-stack tile-avatars">{team.slice(0,4).map(m=><div key={m.id} className="member-avatar small" title={m.name}>{initials(m.name)}</div>)}</div>}
          </button>
          {canManage && <div className="category-tile-actions">
            <button title="Duplicate project" aria-label="Duplicate project" onClick={()=>onDuplicateGroup(group.id)}><Copy size={14}/></button>
            <button title="Edit project" aria-label="Edit project" onClick={()=>onEditGroup(group)}><Edit3 size={14}/></button>
            {archived
              ? <button title="Restore project" aria-label="Restore project" onClick={()=>onRestoreGroup(group.id)}><RotateCcw size={14}/></button>
              : <button title="Archive project" aria-label="Archive project" onClick={()=>onArchiveGroup(group.id)}><Archive size={14}/></button>}
            <button title="Delete project" aria-label="Delete project" className="danger-icon" onClick={()=>onDeleteGroup(group.id)}><Trash2 size={14}/></button>
          </div>}
        </div>;
      })}
    </div>
    {!visibleGroups.length && <div className="empty-state"><FolderKanban size={40}/><h3>No projects found</h3><p>Try another search or create a new project.</p></div>}
  </div>;
}

function ProjectCard({p,onEdit,onDelete,onDetails,onWorkspace,onReview,onPlanner,onSettings,canManage}) {
  return <article className="project-card task-open-card">
    <div className="project-card-head"><div className="project-icon"><FolderKanban size={19}/></div>{canManage && <button aria-label="Edit" className="more-btn" onClick={onEdit}><Edit3 size={16}/></button>}</div>
    <div className="task-open-zone" role="button" tabIndex={0} onClick={onWorkspace} onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); onWorkspace(); } }} title="Open annotation workstation">
      <div className="project-card-title"><h3>{p.name}</h3><span>{p.client}</span></div>
      <div className="project-meta"><span>{p.annotationType}</span><span>•</span><span>{p.team}</span></div>
      <div className="card-progress"><div><b>{progressOf(p)}%</b><span>{Number(p.completedImages).toLocaleString()} / {Number(p.totalImages).toLocaleString()} images</span></div><div className="progress-track"><i style={{width:`${progressOf(p)}%`}}/></div></div>
    </div>
    <div className="task-workflow-row"><button className="workflow-btn annotate" onClick={onWorkspace}><Play size={13}/> Annotation</button><button className="workflow-btn review" onClick={onReview}><ClipboardCheck size={13}/> Review</button></div>
    <div className="project-card-foot"><StatusBadge status={p.status}/><div className="card-actions"><button onClick={onDetails}>Details</button><button className="planner-link" onClick={onPlanner}><Target size={13}/> Planner</button><button onClick={onSettings}><Settings size={13}/> Settings</button>{canManage && <button aria-label="Delete" className="danger-icon" onClick={onDelete}><Trash2 size={15}/></button>}</div></div>
  </article>;
}

const SEARCH_CATEGORY_META = [
  ["project", "Projects"], ["task", "Tasks"], ["user", "Users"], ["dataset", "Datasets"],
  ["annotation", "Annotations"], ["review", "Reviews"], ["audit", "Audit Events"], ["notification", "Notifications"]
];

function ConfirmDialog({ title, message, confirmLabel, cancelLabel, danger, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  useEffect(() => { cancelRef.current?.focus(); }, []);
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } if (e.key === "Enter") { e.stopPropagation(); onConfirm(); } }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel, onConfirm]);
  return <div className="command-backdrop confirm-backdrop" onClick={onCancel}>
    <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message" onClick={e => e.stopPropagation()}>
      <div className={`confirm-icon ${danger ? "danger" : ""}`}>{danger ? <AlertCircle size={20}/> : <CheckCircle2 size={20}/>}</div>
      <h2 id="confirm-dialog-title">{title}</h2>
      <p id="confirm-dialog-message">{message}</p>
      <div className="confirm-actions">
        <button ref={cancelRef} className="secondary-btn" onClick={onCancel}>{cancelLabel}</button>
        <button className={danger ? "danger-btn" : "primary-btn"} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  </div>;
}

function CommandPalette({ onClose, getResults, quickActions, recentItems, favoriteItems, isFavorite, onToggleFavorite, onSelect }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { const id = setTimeout(() => setDebouncedQuery(query), 150); return () => clearTimeout(id); }, [query]);

  const results = getResults(debouncedQuery);
  const sections = [];
  if (!results) {
    if (favoriteItems.length) sections.push(["Favorites", favoriteItems]);
    if (recentItems.length) sections.push(["Recent", recentItems]);
    sections.push(["Quick Actions", quickActions]);
  } else {
    SEARCH_CATEGORY_META.forEach(([key, label]) => { if (results[key]?.length) sections.push([label, results[key]]); });
    const matchedActions = quickActions.filter(a => a.title.toLowerCase().includes(query.trim().toLowerCase()));
    if (matchedActions.length) sections.push(["Quick Actions", matchedActions]);
    if (!sections.length) sections.push(["No results", []]);
  }
  const flat = sections.flatMap(([, items]) => items);

  useEffect(() => { setActiveIndex(0); }, [query]);

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(flat.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (flat[activeIndex]) onSelect(flat[activeIndex]); }
  }

  let runningIndex = -1;
  return <div className="command-backdrop" onClick={onClose}>
    <div className="command-palette" onClick={e => e.stopPropagation()}>
      <div className="command-input-row">
        <Search size={18}/>
        <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder="Search projects, tasks, users, datasets, reviews…"/>
        <button aria-label="Close search" className="command-close" onClick={onClose}><X size={16}/></button>
      </div>
      <div className="command-results">
        {sections.map(([label, items]) => <div className="command-section" key={label}>
          <span className="command-section-label">{label.toUpperCase()}</span>
          {items.length ? items.map(item => {
            runningIndex++;
            const idx = runningIndex;
            const Icon = item.icon || Star;
            return <div key={`${item.type}-${item.id}`} className={`command-row ${idx === activeIndex ? "active" : ""}`} onMouseEnter={() => setActiveIndex(idx)} onClick={() => onSelect(item)}>
              <Icon size={15}/>
              <div className="command-row-main"><b>{item.title}</b>{item.subtitle && <span>{item.subtitle}</span>}</div>
              {item.type !== "action" && <button className={`command-star ${isFavorite(item) ? "starred" : ""}`} onClick={e => { e.stopPropagation(); onToggleFavorite(item); }} title="Toggle favorite"><Star size={13}/></button>}
            </div>;
          }) : <div className="command-empty">Nothing matched "{query}"</div>}
        </div>)}
      </div>
      <div className="command-footer"><span><ChevronDown size={11} style={{transform:"rotate(180deg)"}}/><ChevronDown size={11}/> Navigate</span><span>↵ Select</span><span>Esc Close</span></div>
    </div>
  </div>;
}

function ProjectModal({form,setForm,editing,onClose,onSave}) {
  const set=(k,v)=>setForm(prev=>({...prev,[k]:v}));
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><form className="modal project-modal" onSubmit={onSave}><div className="modal-head"><div><span className="eyebrow">TASK DETAILS</span><h2>{editing?"Edit Task":"Create Task"}</h2></div><button aria-label="Close dialog" type="button" className="modal-close" onClick={onClose}><X size={19}/></button></div><div className="form-grid"><label>Task name<input required value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. momah_seg_jul_2"/></label><label>Client / organization<input required value={form.client} onChange={e=>set("client",e.target.value)} placeholder="Client name"/></label><label>Annotation type<select value={form.annotationType} onChange={e=>set("annotationType",e.target.value)}><option>Bounding Box</option><option>Polygon</option><option>Segmentation</option><option>Classification</option><option>Keypoints</option><option>Polyline</option></select></label><label>Team<select value={form.team} onChange={e=>set("team",e.target.value)}><option>Annotation Team</option><option>Road Vision Team</option><option>Segmentation Team</option><option>Infrastructure Team</option><option>Classification Team</option></select></label><label>Total images<input type="number" min="1" value={form.totalImages} onChange={e=>set("totalImages",e.target.value)}/></label><label>Completed images<input type="number" min="0" value={form.completedImages} onChange={e=>set("completedImages",e.target.value)}/></label><label>Start date<input type="date" value={form.startDate} onChange={e=>set("startDate",e.target.value)}/></label><label>Due date<input type="date" value={form.dueDate} onChange={e=>set("dueDate",e.target.value)}/></label><label>Status<select value={form.status} onChange={e=>set("status",e.target.value)}><option>Pending</option><option>In Progress</option><option>Completed</option></select></label><label className="full">Description<textarea value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Task description..."/></label></div><div className="modal-foot"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" type="submit"><Save size={16}/>{editing?"Save Changes":"Create Task"}</button></div></form></div>;
}

function GroupModal({form,setForm,editing,onClose,onSave,teamMembers}) {
  const set=(k,v)=>setForm(prev=>({...prev,[k]:v}));
  const iconChoices = Object.keys(GROUP_ICONS);
  const toggleTeam = (id) => setForm(prev => ({ ...prev, teamIds: prev.teamIds.includes(id) ? prev.teamIds.filter(x=>x!==id) : [...prev.teamIds, id] }));
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><form className="modal project-modal" onSubmit={onSave}><div className="modal-head"><div><span className="eyebrow">PROJECT</span><h2>{editing?"Edit Project":"Create Project"}</h2></div><button aria-label="Close dialog" type="button" className="modal-close" onClick={onClose}><X size={19}/></button></div><div className="form-grid"><label className="full">Project name<input required autoFocus value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Segmentation"/></label><label className="full">Description<textarea value={form.description} onChange={e=>set("description",e.target.value)} placeholder="What kind of work lives in this project?"/></label><label>Owner<select value={form.ownerId} onChange={e=>set("ownerId",e.target.value)}><option value="">No owner</option>{teamMembers.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Lifecycle stage<select value={form.stage||"Planning"} onChange={e=>set("stage",e.target.value)}>{PROJECT_STAGES.map(s=><option key={s} value={s}>{s}</option>)}</select></label><label className="full"><span>Color</span><div className="color-picker-row">{labelPalette.map(c=><button type="button" key={c} className={form.color===c?"selected":""} style={{background:c}} onClick={()=>set("color",c)}/>)}</div></label><label className="full"><span>Icon</span><div className="color-picker-row icon-picker-row">{iconChoices.map(name=>{const Icon=GROUP_ICONS[name];return <button aria-label={`Icon: ${name}`} type="button" key={name} className={`icon-choice ${form.icon===name?"selected":""}`} onClick={()=>set("icon",name)}><Icon size={16}/></button>;})}</div></label></div>
  <div className="team-project-form"><span>ASSIGNED TEAM</span><div>{teamMembers.map(m=>{const active=form.teamIds.includes(m.id);return <button type="button" key={m.id} className={`project-check ${active?"active":""}`} onClick={()=>toggleTeam(m.id)}><span>{active?<CheckCircle2 size={13}/>:<Users size={13}/>}</span><div><b>{m.name}</b><small>{m.role}</small></div></button>;})}</div></div>
  <div className="modal-foot"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" type="submit"><Save size={16}/>{editing?"Save Changes":"Create Project"}</button></div></form></div>;
}

function ProjectDetails({project,onClose,onEdit}) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal details-modal"><div className="modal-head"><div><span className="eyebrow">TASK DETAILS</span><h2>{project.name}</h2><p>{project.client}</p></div><button aria-label="Close dialog" className="modal-close" onClick={onClose}><X size={19}/></button></div><div className="detail-progress"><div className="big-progress">{progressOf(project)}%</div><div><b>Annotation progress</b><p>{Number(project.completedImages).toLocaleString()} completed · {Math.max(0,project.totalImages-project.completedImages).toLocaleString()} remaining</p><div className="progress-track"><i style={{width:`${progressOf(project)}%`}}/></div></div></div><div className="detail-grid"><Detail label="Annotation type" value={project.annotationType}/><Detail label="Team" value={project.team}/><Detail label="Start date" value={project.startDate||"—"}/><Detail label="Due date" value={project.dueDate||"—"}/><Detail label="Total images" value={Number(project.totalImages).toLocaleString()}/><Detail label="Status" value={project.status}/></div><div className="description-box"><b>Description</b><p>{project.description||"No description provided."}</p></div><div className="modal-foot"><button className="secondary-btn" onClick={onClose}>Close</button><button className="primary-btn" onClick={onEdit}><Edit3 size={16}/> Edit Task</button></div></div></div>;
}

function TaskSettingsPage({task, tab, setTab, subTab, setSubTab, onBack, onEditTask, importProps, exportProps}) {
  return <div className="page task-settings-page">
    <div className="page-head category-drill-head">
      <div>
        <button className="category-back-btn" onClick={onBack}><ChevronDown size={15} style={{transform:"rotate(90deg)"}}/> Projects</button>
        <div className="category-drill-title"><h1>{task.name}</h1><StatusBadge status={task.status}/></div>
        <p className="category-drill-desc">{task.client} · {task.annotationType}</p>
      </div>
    </div>
    <div className="config-tabs">
      <button className={tab==="General"?"active":""} onClick={()=>setTab("General")}><SlidersHorizontal size={16}/> General</button>
      <button className={tab==="Import"?"active":""} onClick={()=>setTab("Import")}><Upload size={16}/> Import &amp; Export</button>
    </div>

    {tab === "General" && <section className="panel config-panel general-settings-panel">
      <div className="config-panel-head"><div><h2>Task Details</h2><p>Basic information for this task.</p></div><button className="secondary-btn" onClick={onEditTask}><Edit3 size={15}/> Edit</button></div>
      <div className="detail-grid" style={{padding:"0 20px 20px"}}>
        <Detail label="Client" value={task.client||"—"}/>
        <Detail label="Annotation type" value={task.annotationType}/>
        <Detail label="Team" value={task.team||"—"}/>
        <Detail label="Start date" value={task.startDate||"—"}/>
        <Detail label="Due date" value={task.dueDate||"—"}/>
        <Detail label="Total images" value={Number(task.totalImages).toLocaleString()}/>
      </div>
      {task.description && <div className="description-box" style={{margin:"0 20px 20px"}}><b>Description</b><p>{task.description}</p></div>}
    </section>}

    {tab === "Import" && <section>
      <div className="import-export-subtabs">
        <button className={subTab==="Import"?"active":""} onClick={()=>setSubTab("Import")}><Upload size={14}/> Import</button>
        <button className={subTab==="Export"?"active":""} onClick={()=>setSubTab("Export")}><Download size={14}/> Export</button>
      </div>
      {subTab === "Import" && <ImportPage {...importProps}/>}
      {subTab === "Export" && <ExportPage {...exportProps}/>}
    </section>}
  </div>;
}

function ImportPage({projects,tasks,datasets,projectConfigs,importHistory,onClearHistory,importTaskId,setImportTaskId,activeDatasetId,setActiveDatasetId,listSearch,setListSearch,listStatus,setListStatus,filteredTasks,search,setSearch,status,setStatus,view,setView,onImport,onCsv,onAdvImport,onRemove,onClear,onStatus,onExport,onCreateDataset,onEditDataset,onArchiveDataset,onRestoreDataset,onDeleteDataset,onSnapshotVersion,compareVersion,setCompareVersion}) {
  const taskProjects = projects.length ? projects : [];
  const currentTask = taskProjects.find(p => p.id === importTaskId) || taskProjects[0];
  const taskDatasets = datasets.filter(d => d.projectId === currentTask?.id);
  const activeDataset = datasets.find(d => d.id === activeDatasetId && d.projectId === currentTask?.id);
  const taskIndexById = useMemo(() => Object.fromEntries(tasks.map((t,i) => [t.id, i])), [tasks]);
  const IMAGE_PAGE_SIZE = 60;
  const [imagePage, setImagePage] = useState(1);
  useEffect(() => { setImagePage(1); }, [search, status, activeDatasetId, view]);
  const imageTotalPages = Math.max(1, Math.ceil(filteredTasks.length / IMAGE_PAGE_SIZE));
  const clampedImagePage = Math.min(imagePage, imageTotalPages);
  const pagedTasks = filteredTasks.slice((clampedImagePage-1)*IMAGE_PAGE_SIZE, clampedImagePage*IMAGE_PAGE_SIZE);

  if (activeDataset) {
    const dsTasks = tasks.filter(t => t.datasetId === activeDataset.id);
    const annotated = dsTasks.filter(t => t.status === "Completed").length;
    const invalid = dsTasks.filter(t => !t.image).length;
    const pending=dsTasks.filter(t=>t.status==="Pending").length;
    const progress=dsTasks.filter(t=>t.status==="In Progress").length;
    const validation = validateDataset(dsTasks, projectConfigs?.[currentTask?.groupId]);
    const history = activeDataset.versionHistory || [];
    const compareSnapshot = history.find(h => h.version === compareVersion);
    const currentNames = new Set(dsTasks.map(t => t.name));
    const compareNames = new Set(compareSnapshot?.imageIds || []);
    const added = compareSnapshot ? [...currentNames].filter(n => !compareNames.has(n)) : [];
    const removed = compareSnapshot ? [...compareNames].filter(n => !currentNames.has(n)) : [];
    return <div className="page dataset-page">
      <div className="page-head category-drill-head"><div><button className="category-back-btn" onClick={()=>setActiveDatasetId(null)}><ChevronDown size={15} style={{transform:"rotate(90deg)"}}/> {currentTask?.name} Datasets</button><span className="eyebrow">DATASET</span><h1>{activeDataset.name}</h1><p>Version {activeDataset.version || 1} · {dsTasks.length} images{invalid?` · ${invalid} invalid`:""}</p><div className="category-drill-title" style={{marginTop:"8px"}}><span className="category-count-pill stage-pill">{activeDataset.stage || "Draft"}</span><span className={`category-count-pill health-pill ${validation.valid ? "health-healthy" : "health-at-risk"}`}>{validation.valid ? "Validated" : "Needs Attention"}</span></div></div><div className="dataset-head-actions"><button className="secondary-btn" onClick={()=>onSnapshotVersion(activeDataset.id)}><Copy size={15}/> Save as New Version</button><button className="secondary-btn" onClick={onCsv}><FileText size={15}/> CSV / JSON Guide</button><button className="secondary-btn" onClick={()=>onAdvImport(activeDataset.id)}><FileArchive size={15}/> ZIP / COCO / YOLO</button><button className="secondary-btn" onClick={onExport}><Download size={15}/> Export CSV</button><button className="primary-btn" onClick={()=>onImport(activeDataset.id)}><Upload size={16}/> Add Images</button></div></div>
      <div className="dataset-cards"><MiniStat label="Total Images" value={dsTasks.length}/><MiniStat label="Annotated" value={annotated}/><MiniStat label="Unannotated" value={dsTasks.length-annotated}/><MiniStat label="Invalid Files" value={invalid}/></div>
      {!validation.valid && <div className="validation-panel"><AlertCircle size={16}/><div><b>This dataset needs attention before it's production-ready</b><ul>{validation.issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul></div></div>}
      <section className="dataset-info panel"><div className="dataset-info-main"><div className="dataset-logo"><Database size={22}/></div><div><b className="dataset-name-input" style={{display:"block"}}>{activeDataset.name}</b><span className="dataset-description-input" style={{display:"block",color:"var(--muted)"}}>{activeDataset.description||"No description"}</span><div className="dataset-meta-line"><span>Created {new Date(activeDataset.createdAt).toLocaleDateString()}</span><span>•</span><span>{currentTask?.name}</span><span>•</span><span>Autosaved</span></div></div></div><div className="dataset-info-actions"><button className="secondary-btn" onClick={()=>onEditDataset(activeDataset)}><Edit3 size={15}/> Edit</button>{activeDataset.status==="Archived" ? <button className="secondary-btn" onClick={()=>onRestoreDataset(activeDataset.id)}><RotateCcw size={15}/> Restore</button> : <button className="secondary-btn" onClick={()=>onArchiveDataset(activeDataset.id)}><Archive size={15}/> Archive</button>}<button className="danger-outline" onClick={()=>onClear(activeDataset.id)}><Trash2 size={15}/> Clear Images</button></div></section>
      {history.length > 0 && <section className="panel version-history-panel"><div className="panel-head"><div><h2>Version History</h2><p>Compare the current image set against a saved version</p></div><Clock3 size={17}/></div>
        <div className="version-history-list">{history.slice().reverse().map(h=><div key={h.version} className={`version-row ${compareVersion===h.version?"active":""}`} onClick={()=>setCompareVersion(compareVersion===h.version?null:h.version)}><b>v{h.version}</b><span>{h.imageIds.length} images · saved {new Date(h.savedAt).toLocaleDateString()}</span>{compareVersion===h.version && <span className="version-compare-tag">Comparing</span>}</div>)}</div>
        {compareSnapshot && <div className="version-diff"><div><b>+{added.length}</b><span>added since v{compareVersion}</span>{added.length>0 && <ul>{added.slice(0,8).map(n=><li key={n}>{n}</li>)}</ul>}</div><div><b>-{removed.length}</b><span>removed since v{compareVersion}</span>{removed.length>0 && <ul>{removed.slice(0,8).map(n=><li key={n}>{n}</li>)}</ul>}</div></div>}
      </section>}
      <section className="panel task-library"><div className="task-library-head"><div><h2>Dataset Images</h2><p>Every imported image becomes an annotation task.</p></div><div className="view-toggle"><button className={view==="table"?"active":""} onClick={()=>setView("table")}><ListFilter size={14}/> List</button><button className={view==="grid"?"active":""} onClick={()=>setView("grid")}><Grid3X3 size={14}/> Grid</button></div></div>
        <div className="task-filters"><div className="filter-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search image name or ID..."/></div><div className="select-wrap"><ListFilter size={15}/><select value={status} onChange={e=>setStatus(e.target.value)}><option>All</option><option>Pending</option><option>In Progress</option><option>Completed</option></select></div><span className="result-count">Showing {filteredTasks.length} of {dsTasks.length}</span></div>
        {!filteredTasks.length ? <div className="dataset-empty"><Upload size={38}/><h3>{dsTasks.length ? "No matching images" : "This dataset is empty"}</h3><p>{dsTasks.length ? "Change the search or status filter." : "Import one or more images to create your first annotation tasks."}</p>{!dsTasks.length && <button className="primary-btn" onClick={()=>onImport(activeDataset.id)}><Upload size={15}/> Add Images</button>}</div> : view==="table" ? <div className="task-table-wrap"><table className="task-table"><thead><tr><th>IMAGE</th><th>PREVIEW</th><th>STATUS</th><th>FILE</th><th>SOURCE</th><th></th></tr></thead><tbody>{pagedTasks.map((t)=>{const originalIndex=taskIndexById[t.id] ?? -1;return <tr key={t.id}><td><b>{t.name}</b><small>{t.id}</small></td><td><img className="task-thumb" src={t.image} alt="" loading="lazy" decoding="async"/></td><td><select className="task-status-select" value={t.status} onChange={e=>onStatus(t.id,e.target.value)}><option>Pending</option><option>In Progress</option><option>Completed</option></select></td><td>{t.image ? <span className="source-pill valid-pill">Valid</span> : <span className="source-pill invalid-pill">Invalid</span>}</td><td><span className="source-pill">{t.source||"Sample"}</span></td><td><div className="task-row-actions"><button title="Open in workspace" aria-label="Open in workspace" onClick={()=>{window.dispatchEvent(new CustomEvent("annotatepro-open-task",{detail:originalIndex}));}}><Play size={14}/></button><button title="Remove" aria-label="Remove" onClick={()=>onRemove(t.id)}><Trash2 size={14}/></button></div></td></tr>})}</tbody></table></div> : <div className="task-grid">{pagedTasks.map(t=><div className="task-tile" key={t.id}><img src={t.image} alt={t.name} loading="lazy" decoding="async"/><div className="task-tile-body"><b title={t.name}>{t.name}</b><small>{t.id}</small><div><StatusBadge status={t.status}/><button aria-label="Remove image" onClick={()=>onRemove(t.id)}><Trash2 size={13}/></button></div></div></div>)}</div>}
        {filteredTasks.length > IMAGE_PAGE_SIZE && <div className="pagination-bar"><button disabled={clampedImagePage<=1} onClick={()=>setImagePage(p=>Math.max(1,p-1))}><ChevronDown size={14} style={{transform:"rotate(90deg)"}}/> Prev</button><span>Page {clampedImagePage} of {imageTotalPages} · {filteredTasks.length} images</span><button disabled={clampedImagePage>=imageTotalPages} onClick={()=>setImagePage(p=>Math.min(imageTotalPages,p+1))}>Next <ChevronDown size={14} style={{transform:"rotate(-90deg)"}}/></button></div>}
      </section>
      <div className="dataset-help"><div><ShieldCheck size={18}/><div><b>Local-first dataset storage</b><p>Uploaded images are stored in your browser as data URLs, so your imported tasks remain available after refreshing the page on the same device.</p></div></div><span>Build 17</span></div>
    </div>;
  }

  const visibleDatasets = taskDatasets
    .filter(d => listStatus === "All" || (d.status || "Active") === listStatus)
    .filter(d => d.name.toLowerCase().includes(listSearch.toLowerCase()));

  return <div className="page dataset-page">
    <div className="page-head"><div><span className="eyebrow">DATASET MANAGEMENT</span><h1>Datasets</h1><p>Every project can hold multiple datasets — organize imports by batch, version or source.</p></div><div className="dataset-head-actions"><button className="primary-btn" onClick={()=>onCreateDataset(currentTask?.id)}><Plus size={16}/> Create Dataset</button></div></div>
    <div className="dataset-cards"><MiniStat label="Datasets" value={taskDatasets.length}/><MiniStat label="Total Images" value={tasks.filter(t=>taskDatasets.some(d=>d.id===t.datasetId)).length}/><MiniStat label="Active" value={taskDatasets.filter(d=>(d.status||"Active")==="Active").length}/><MiniStat label="Archived" value={taskDatasets.filter(d=>d.status==="Archived").length}/></div>
    <div className="project-filters standalone"><div className="filter-search"><Search size={17}/><input value={listSearch} onChange={e=>setListSearch(e.target.value)} placeholder="Search datasets..."/></div><div className="select-wrap"><ListFilter size={16}/><select value={listStatus} onChange={e=>setListStatus(e.target.value)}><option>All</option><option>Active</option><option>Archived</option></select></div></div>
    <div className="dataset-grid">
      {visibleDatasets.map(ds => {
        const dsTasks = tasks.filter(t => t.datasetId === ds.id);
        const annotated = dsTasks.filter(t => t.status === "Completed").length;
        const preview = dsTasks.slice(0,4);
        const archived = ds.status === "Archived";
        const dsValidation = validateDataset(dsTasks, projectConfigs?.[currentTask?.groupId]);
        return <article key={ds.id} className={`dataset-card ${archived?"archived":""}`}>
          {archived && <span className="archived-badge">Archived</span>}
          <button className="dataset-card-main" onClick={()=>setActiveDatasetId(ds.id)}>
            <div className="dataset-card-thumbs">{preview.length ? preview.map(t=><img key={t.id} src={t.image} alt="" loading="lazy" decoding="async"/>) : <div className="dataset-card-thumb-empty"><ImageIcon size={18}/></div>}</div>
            <div className="category-tile-title-row"><b>{ds.name}</b><span className={`health-dot ${dsValidation.valid?"health-healthy":"health-at-risk"}`} title={dsValidation.valid?"Validated":dsValidation.issues.join(", ")}/></div>
            <span className="dataset-card-meta">v{ds.version || 1} · {ds.stage || "Draft"} · {dsTasks.length} images · {annotated} annotated</span>
          </button>
          <div className="category-tile-actions">
            <button title="Edit dataset" aria-label="Edit dataset" onClick={()=>onEditDataset(ds)}><Edit3 size={14}/></button>
            {archived ? <button title="Restore dataset" aria-label="Restore dataset" onClick={()=>onRestoreDataset(ds.id)}><RotateCcw size={14}/></button> : <button title="Archive dataset" aria-label="Archive dataset" onClick={()=>onArchiveDataset(ds.id)}><Archive size={14}/></button>}
            <button title="Delete dataset" aria-label="Delete dataset" className="danger-icon" onClick={()=>onDeleteDataset(ds.id)}><Trash2 size={14}/></button>
          </div>
        </article>;
      })}
    </div>
    {!visibleDatasets.length && <div className="empty-state"><Database size={40}/><h3>No datasets found</h3><p>Create a dataset to start importing images into {currentTask?.name}.</p></div>}
    <section className="panel import-history-panel">
      <div className="panel-head"><div><h2>Import History</h2><p>Recent structured imports across all datasets</p></div><div className="dataset-head-actions"><button className="secondary-btn" onClick={onCsv}><FileText size={15}/> Import CSV / JSON</button>{importHistory.length>0 && <button className="secondary-btn" onClick={onClearHistory}><Trash2 size={15}/> Clear</button>}</div></div>
      {importHistory.length ? <div className="task-table-wrap"><table className="task-table"><thead><tr><th>FILE</th><th>DATASET</th><th>IMPORTED</th><th>SKIPPED</th><th>WHEN</th></tr></thead><tbody>{importHistory.map(h=><tr key={h.id}><td><b>{h.fileName}</b></td><td>{h.datasetName}</td><td><span className="source-pill valid-pill">{h.imported}</span></td><td>{h.skipped ? <span className="source-pill invalid-pill">{h.skipped}</span> : <span className="source-pill">0</span>}</td><td>{new Date(h.at).toLocaleString()}</td></tr>)}</tbody></table></div> : <div className="dataset-empty"><FileSpreadsheet size={32}/><h3>No imports yet</h3><p>Import a CSV or JSON file to see its history here.</p></div>}
    </section>
  </div>;
}

function DatasetModal({form,setForm,editing,onClose,onSave}) {
  const set=(k,v)=>setForm(prev=>({...prev,[k]:v}));
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><form className="modal" onSubmit={onSave}><div className="modal-head"><div><span className="eyebrow">DATASET</span><h2>{editing?"Edit Dataset":"Create Dataset"}</h2></div><button aria-label="Close dialog" type="button" className="modal-close" onClick={onClose}><X size={19}/></button></div><div className="form-grid"><label className="full">Dataset name<input required autoFocus value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. July Upload Batch"/></label><label className="full">Description<textarea value={form.description} onChange={e=>set("description",e.target.value)} placeholder="What's in this batch?"/></label><label>Version<input type="number" min="1" value={form.version} onChange={e=>set("version",Number(e.target.value)||1)}/></label><label>Lifecycle stage<select value={form.stage||"Draft"} onChange={e=>set("stage",e.target.value)}>{DATASET_STAGES.map(s=><option key={s} value={s}>{s}</option>)}</select></label></div><div className="modal-foot"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" type="submit"><Save size={16}/>{editing?"Save Changes":"Create Dataset"}</button></div></form></div>;
}

function ExportPage({tasks, allTasks, annotations, qaReviews, format, setFormat, scope, setScope, project, setProject, projects, search, setSearch, history, onExport, onClearHistory, message, scopedToTask}) {
  const totalAnnotations = tasks.reduce((n,t) => n + (annotations[t.id] || []).length, 0);
  const approved = tasks.filter(t => qaReviews[t.id]?.decision === "Approved").length;
  const formats = [
    ["AnnotatePro JSON", FileJson, "Complete portable project export with tasks, annotations and QA records."],
    ["Task CSV", FileSpreadsheet, "Task-level operational report for spreadsheets and data workflows."],
    ["Annotation CSV", FileSpreadsheet, "One row per annotation with geometry and label information."],
    ["COCO JSON", FileArchive, "COCO-style dataset export for rectangle/object-detection workflows."],
    ["YOLO Manifest", FileText, "Normalized bounding-box manifest ready for YOLO conversion pipelines."]
  ];
  return <div className="page export-page">
    {!scopedToTask && <div className="page-head"><div><span className="eyebrow">DATA DELIVERY</span><h1>Export</h1><p>Package annotation data for downstream QA, reporting and machine-learning workflows.</p></div><div className="export-head-status"><span><i></i> Local export engine</span></div></div>}
    <div className="export-summary-grid">
      <MiniStat label="Tasks selected" value={tasks.length}/><MiniStat label="Annotations" value={totalAnnotations}/><MiniStat label="QA approved" value={approved}/><MiniStat label="Available tasks" value={allTasks.length}/>
    </div>
    <div className="export-layout">
      <section className="panel export-builder">
        <div className="panel-head"><div><h2>Export Builder</h2><p>Select the format and scope for this delivery.</p></div><Download size={18}/></div>
        <div className="export-body">
          <label className="export-label">FORMAT</label>
          <div className="format-grid">{formats.map(([name,Icon,desc]) => <button key={name} className={`format-card ${format===name?"active":""}`} onClick={()=>setFormat(name)}><span><Icon size={19}/></span><div><b>{name}</b><small>{desc}</small></div>{format===name && <Check size={17}/>}</button>)}</div>
          <div className="export-filter-grid">
            <div><label className="export-label">TASK SCOPE</label><div className="export-select"><Filter size={15}/><select value={scope} onChange={e=>setScope(e.target.value)}><option>All Tasks</option><option>Annotated Only</option><option>Completed Only</option><option>QA Approved</option></select></div></div>
            {!scopedToTask && <div><label className="export-label">PROJECT</label><div className="export-select"><FolderKanban size={15}/><select value={project} onChange={e=>setProject(e.target.value)}><option>All Projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div></div>}
          </div>
          <label className="export-label">TASK SEARCH</label><div className="export-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter by task name or ID..."/></div>
          <div className="export-ready"><div><b>{tasks.length} tasks ready</b><span>{totalAnnotations} annotations will be included in this export.</span></div><button className="primary-btn" onClick={onExport}><Download size={16}/> Export {format}</button></div>
          {message && <div className="export-message"><Check size={15}/>{message}</div>}
        </div>
      </section>
      <section className="panel export-history"><div className="panel-head"><div><h2>Export History</h2><p>Recent deliveries stored in this browser.</p></div><button className="icon-btn" onClick={onClearHistory} title="Clear history" aria-label="Clear history"><RefreshCw size={15}/></button></div>
        <div className="history-list">{history.length ? history.map(item=><div className="export-history-row" key={item.id}><div className="history-format"><span><Download size={14}/></span><div><b>{item.format}</b><small>{item.tasks} tasks · {item.annotations} annotations</small></div></div><div className="history-time">{new Date(item.at).toLocaleString()}</div></div>) : <div className="export-history-empty"><Download size={30}/><h3>No exports yet</h3><p>Your recent export activity will appear here.</p></div>}</div>
      </section>
    </div>
    <section className="export-info"><div className="export-info-icon"><ShieldCheck size={18}/></div><div><b>Production-ready delivery foundation</b><p>Exports are generated directly in the browser from the current task, annotation and QA state. For large production datasets, the next storage layer can move this same export engine to object storage and server-side packaging.</p></div><span>BUILD 5</span></section>
  </div>;
}

function ImportModal({onClose,onImport,step,setStep,fileName,columns,rows,mapping,setMapping,validation,error,duplicateMode,setDuplicateMode,datasets,projects,targetDatasetId,setTargetDataset,onFile,fileRef,onRun}) {
  const mapFields = [["name","Task name","Required — becomes the task's display name"],["image","Image URL","Required — http(s) link or data: URI"],["status","Status","Optional — Pending / In Progress / Completed"]];
  const preview = validation.valid.slice(0,5);
  const problems = [...validation.invalid, ...validation.duplicates].slice(0,6);
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal import-wizard-modal">
    <div className="modal-head"><div><span className="eyebrow">DATA IMPORT</span><h2>Import Tasks</h2></div><button aria-label="Close dialog" className="modal-close" onClick={onClose}><X size={19}/></button></div>
    <div className="import-steps">
      {["upload","mapping","preview"].map((s,i)=><div key={s} className={`import-step ${step===s?"active":""} ${["upload","mapping","preview"].indexOf(step)>i?"done":""}`}><span>{i+1}</span>{s==="upload"?"Upload":s==="mapping"?"Map Columns":"Preview"}</div>)}
    </div>

    {step==="upload" && <div className="import-body">
      <input ref={fileRef} type="file" accept=".csv,.json" hidden onChange={e=>{onFile(e.target.files?.[0]); e.target.value="";}}/>
      <button className="import-dropzone" onClick={()=>fileRef.current?.click()}>
        <Upload size={30}/>
        <b>Choose a CSV or JSON file</b>
        <span>Columns are detected automatically — you'll map them in the next step.</span>
      </button>
      <div className="import-format-help">
        <div><FileSpreadsheet size={16}/><div><b>CSV</b><code>name,image,status</code></div></div>
        <div><FileJson size={16}/><div><b>JSON</b><code>{`[{ "name": "...", "image": "https://..." }]`}</code></div></div>
      </div>
      <div className="guide-note"><AlertCircle size={14}/><span>Images referenced by URL are linked, not downloaded. To store image files locally, use the Add Images button on a dataset instead.</span></div>
      {error && <div className="import-error"><AlertCircle size={14}/>{error}</div>}
    </div>}

    {step==="mapping" && <div className="import-body">
      <div className="import-file-row"><FileText size={16}/><b>{fileName}</b><span>{rows.length} rows · {columns.length} columns</span></div>
      <label className="export-label">IMPORT INTO DATASET</label>
      <div className="export-select"><Database size={15}/><select value={targetDatasetId||""} onChange={e=>setTargetDataset(e.target.value)}>{datasets.map(d=>{const proj=projects.find(p=>p.id===d.projectId);return <option key={d.id} value={d.id}>{proj?`${proj.name} — `:""}{d.name}</option>;})}</select></div>
      <label className="export-label" style={{marginTop:"16px"}}>COLUMN MAPPING</label>
      <div className="import-mapping-list">{mapFields.map(([key,title,hint])=><div className="import-mapping-row" key={key}><div><b>{title}</b><small>{hint}</small></div><select value={mapping[key]||""} onChange={e=>setMapping(m=>({...m,[key]:e.target.value}))}><option value="">— not mapped —</option>{columns.map(c=><option key={c} value={c}>{c}</option>)}</select></div>)}</div>
      {error && <div className="import-error"><AlertCircle size={14}/>{error}</div>}
    </div>}

    {step==="preview" && <div className="import-body">
      <div className="import-validation-cards">
        <div className="import-valid-card"><b>{validation.valid.length}</b><span>Ready to import</span></div>
        <div className="import-dupe-card"><b>{validation.duplicates.length}</b><span>Duplicates</span></div>
        <div className="import-invalid-card"><b>{validation.invalid.length}</b><span>Invalid rows</span></div>
      </div>
      {validation.duplicates.length>0 && <div className="import-dupe-choice"><span>Duplicate handling</span><div>{["Skip","Import anyway"].map(m=><button key={m} className={duplicateMode===m?"active":""} onClick={()=>setDuplicateMode(m)}>{m}</button>)}</div></div>}
      {preview.length>0 && <><label className="export-label">PREVIEW</label><div className="import-preview-table"><table className="task-table"><thead><tr><th>ROW</th><th>NAME</th><th>IMAGE</th><th>STATUS</th></tr></thead><tbody>{preview.map(p=><tr key={p.row}><td>{p.row}</td><td><b>{p.name}</b></td><td className="import-url-cell">{p.image}</td><td>{p.status}</td></tr>)}</tbody></table>{validation.valid.length>5 && <div className="rework-more">+ {validation.valid.length-5} more rows</div>}</div></>}
      {problems.length>0 && <><label className="export-label" style={{marginTop:"14px"}}>ISSUES</label><div className="import-problem-list">{problems.map((p,i)=><div key={i}><span className="source-pill invalid-pill">Row {p.row}</span><b>{p.name||"(no name)"}</b><small>{p.reason}</small></div>)}</div></>}
      {error && <div className="import-error"><AlertCircle size={14}/>{error}</div>}
    </div>}

    <div className="modal-foot">
      {step!=="upload" && <button className="secondary-btn" onClick={()=>setStep(step==="preview"?"mapping":"upload")}>Back</button>}
      <button className="secondary-btn" onClick={onImport}><Upload size={15}/> Image Upload Instead</button>
      {step==="mapping" && <button className="primary-btn" disabled={!mapping.name||!mapping.image} onClick={()=>setStep("preview")}>Continue</button>}
      {step==="preview" && <button className="primary-btn" onClick={onRun}><Check size={16}/> Import {duplicateMode==="Import anyway"?validation.valid.length+validation.duplicates.length:validation.valid.length} tasks</button>}
    </div>
  </div></div>;
}

function AdvancedImportModal({onClose,step,setStep,kind,fileName,parsed,mapping,setMapping,error,progress,running,datasets,projects,projectConfigs,targetDatasetId,setTargetDataset,onFile,fileRef,onRun}) {
  const kindLabel = kind === "coco" ? "COCO" : kind === "yolo" ? "YOLO" : "Image ZIP";
  const targetDataset = datasets.find(d => d.id === targetDatasetId);
  const groupId = projects.find(p => p.id === targetDataset?.projectId)?.groupId;
  const existingLabels = projectConfigs?.[groupId]?.labels || [];
  const annotationCount = parsed ? Object.values(parsed.annotationsByImageName || {}).reduce((n,a)=>n+a.length,0) : 0;

  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal import-wizard-modal">
    <div className="modal-head"><div><span className="eyebrow">DATA IMPORT</span><h2>Import ZIP / COCO / YOLO</h2></div><button aria-label="Close dialog" className="modal-close" onClick={onClose}><X size={19}/></button></div>
    <div className="import-steps">
      {["upload","mapping","preview"].map((s,i)=><div key={s} className={`import-step ${step===s?"active":""} ${["upload","mapping","preview"].indexOf(step)>i?"done":""}`}><span>{i+1}</span>{s==="upload"?"Upload":s==="mapping"?"Map Labels":"Preview"}</div>)}
    </div>

    {step==="upload" && <div className="import-body">
      <input ref={fileRef} type="file" accept=".zip,.json" hidden onChange={e=>{onFile(e.target.files?.[0]); e.target.value="";}}/>
      <button className="import-dropzone" onClick={()=>fileRef.current?.click()}>
        <Upload size={30}/>
        <b>Choose a .zip or COCO .json file</b>
        <span>Plain image zips, YOLO exports (images/ + labels/ + classes.txt), and COCO exports (images + annotations.json) are all detected automatically.</span>
      </button>
      <div className="import-format-help">
        <div><FileArchive size={16}/><div><b>ZIP of images</b><code>photo1.jpg, photo2.jpg, ...</code></div></div>
        <div><FileArchive size={16}/><div><b>YOLO</b><code>images/*.jpg + labels/*.txt + classes.txt</code></div></div>
        <div><FileJson size={16}/><div><b>COCO</b><code>images[] + annotations[] + categories[]</code></div></div>
      </div>
      {error && <div className="import-error"><AlertCircle size={14}/>{error}</div>}
    </div>}

    {step==="mapping" && parsed && <div className="import-body">
      <div className="import-file-row"><FileArchive size={16}/><b>{fileName}</b><span>{kindLabel} · {parsed.images.length} images · {annotationCount} annotations</span></div>
      <label className="export-label">IMPORT INTO DATASET</label>
      <div className="export-select"><Database size={15}/><select value={targetDatasetId||""} onChange={e=>setTargetDataset(e.target.value)}>{datasets.map(d=>{const proj=projects.find(p=>p.id===d.projectId);return <option key={d.id} value={d.id}>{proj?`${proj.name} — `:""}{d.name}</option>;})}</select></div>
      <label className="export-label" style={{marginTop:"16px"}}>LABEL MAPPING — {parsed.classes.length} classes found</label>
      <div className="import-mapping-list">{parsed.classes.map(c=><div className="import-mapping-row" key={c.id}><div><b>{c.name}</b><small>Detected class</small></div><select value={mapping[c.id]||"__new__"} onChange={e=>setMapping(m=>({...m,[c.id]:e.target.value}))}><option value="__new__">+ Create new label "{c.name}"</option>{existingLabels.map(l=><option key={l.id} value={l.id}>Map to "{l.name}"</option>)}</select></div>)}</div>
      {error && <div className="import-error"><AlertCircle size={14}/>{error}</div>}
    </div>}

    {step==="preview" && parsed && <div className="import-body">
      <label className="export-label">IMPORT INTO DATASET</label>
      <div className="export-select"><Database size={15}/><select value={targetDatasetId||""} onChange={e=>setTargetDataset(e.target.value)}>{datasets.map(d=>{const proj=projects.find(p=>p.id===d.projectId);return <option key={d.id} value={d.id}>{proj?`${proj.name} — `:""}{d.name}</option>;})}</select></div>
      <div className="import-validation-cards" style={{marginTop:"14px"}}>
        <div className="import-valid-card"><b>{parsed.images.length}</b><span>Images found</span></div>
        <div className="import-valid-card"><b>{annotationCount}</b><span>Annotations</span></div>
        <div className="import-valid-card"><b>{parsed.classes.length}</b><span>Classes</span></div>
      </div>
      {running && <div className="import-progress"><div className="import-progress-bar"><i style={{width:`${progress.total?Math.round(progress.done/progress.total*100):0}%`}}/></div><span>Uploading {progress.done} / {progress.total}...</span></div>}
      {error && <div className="import-error"><AlertCircle size={14}/>{error}</div>}
    </div>}

    <div className="modal-foot">
      {step!=="upload" && !running && <button className="secondary-btn" onClick={()=>setStep(step==="preview" && (kind==="coco"||kind==="yolo") ?"mapping":"upload")}>Back</button>}
      {step==="mapping" && <button className="primary-btn" onClick={()=>setStep("preview")}>Continue</button>}
      {step==="preview" && <button className="primary-btn" disabled={running} onClick={onRun}><Check size={16}/> {running?"Importing...":`Import ${parsed?.images.length||0} images`}</button>}
    </div>
  </div></div>;
}

function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand"><div className="brand-mark"><Grid3X3 size={22}/></div><div><strong>AnnotatePro</strong><span>Annotation Platform</span></div></div>
        <form onSubmit={handleLogin} className="auth-form">
          <h1>Welcome back</h1><p>Sign in to your workspace.</p>
          <label>Email<input type="email" required autoFocus value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"/></label>
          <label>Password<div className="auth-password-field"><input type={showPassword?"text":"password"} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}</button></div></label>
          {error && <div className="auth-error"><AlertCircle size={14}/>{error}</div>}
          <button className="primary-btn auth-submit" disabled={loading} type="submit">{loading ? "Signing in..." : "Sign in"}</button>
          <p className="auth-footnote">Don't have an account? Ask your admin to invite you — accounts are created from inside the app, not from this screen.</p>
        </form>
      </div>
    </div>
  );
}

function UpdatePasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpdate(e) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onDone();
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand"><div className="brand-mark"><Grid3X3 size={22}/></div><div><strong>AnnotatePro</strong><span>Annotation Platform</span></div></div>
        <form onSubmit={handleUpdate} className="auth-form">
          <h1>Set a new password</h1><p>Choose a new password for your account.</p>
          <label>New password<input type="password" required minLength={6} autoFocus value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
          {error && <div className="auth-error"><AlertCircle size={14}/>{error}</div>}
          <button className="primary-btn auth-submit" disabled={loading} type="submit">{loading ? "Updating..." : "Update password"}</button>
        </form>
      </div>
    </div>
  );
}

function Shortcuts({onClose}) {
  const rows=[["V","Select"],["B","Bounding Box"],["P","Polygon"],["L","Line"],["R","Brush"],["E","Eraser"],["Space","Pan"],["Delete","Delete selected"],["Ctrl + Z","Undo"],["Ctrl + Shift + Z","Redo"],["Ctrl + C","Copy selected"],["Ctrl + V","Paste"],["Ctrl + D","Duplicate selected"],["Ctrl + A","Select all"],["Shift + Click","Add / remove from selection"],["Drag on empty canvas","Marquee select"],["Alt + Click vertex","Delete vertex"],["+ / -","Zoom"],["← / →","Previous / next task"]];
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal shortcuts-modal"><div className="modal-head"><div><span className="eyebrow">WORKSPACE</span><h2>Keyboard shortcuts</h2></div><button aria-label="Close dialog" className="modal-close" onClick={onClose}><X size={19}/></button></div><div className="shortcut-list">{rows.map(r=><div key={r[0]}><kbd>{r[0]}</kbd><span>{r[1]}</span></div>)}</div></div></div>;
}


function QAReviews({ tasks, queue, stats, selectedTask, selectedAnnotations, selectedReview, search, setSearch, filter, setFilter, score, setScore, reason, setReason, comment, setComment, onSelect, onReview, message, reviews, canReview }) {
  const [activeTab, setActiveTab] = useState("queue");
  const reasons = ["Incorrect label", "Missing annotation", "Wrong geometry", "Low quality / unclear", "Duplicate annotation", "Other"];
  return (
    <div className="page qa-page">
      <div className="page-head">
        <div><span className="eyebrow">QUALITY CONTROL</span><h1>QA & Reviews</h1><p>Inspect submitted annotations, score quality, and send precise feedback to annotators.</p></div>
        <div className="qa-head-actions"><span className="qa-live"><i></i> Review queue live</span></div>
      </div>
      <div className="stats-grid qa-stats">
        <StatCard icon={Clock3} label="Pending Reviews" value={stats.pending} meta={`${stats.reviewed} reviewed`} />
        <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} meta="Accepted tasks" />
        <StatCard icon={AlertCircle} label="Rejected" value={stats.rejected} meta={`${stats.changes} changes requested`} />
        <StatCard icon={ShieldCheck} label="Average QA Score" value={stats.reviewed ? `${stats.average}%` : "—"} meta="Across reviewed tasks" />
      </div>
      <div className="qa-tabs">
        <button className={activeTab==="queue"?"active":""} onClick={()=>setActiveTab("queue")}><ClipboardCheck size={16}/> Review Queue</button>
        <button className={activeTab==="history"?"active":""} onClick={()=>setActiveTab("history")}><Clock3 size={16}/> Review History</button>
      </div>
      {activeTab === "queue" ? <div className="qa-layout">
        <section className="panel qa-queue-panel">
          <div className="panel-header">
            <div><h2>Review Queue</h2><p>{queue.length} task{queue.length===1?"":"s"} matching your filters</p></div>
            <div className="qa-filter-row">
              <div className="table-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks..." /></div>
              <select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Pending Review</option><option>Approved</option><option>Rejected</option><option>Changes Requested</option></select>
            </div>
          </div>
          <div className="qa-queue">
            {queue.length ? queue.map(task => {
              const review = reviews[task.id];
              return <button key={task.id} className={`qa-task-row ${selectedTask?.id===task.id?"selected":""}`} onClick={()=>onSelect(task.id)}>
                <div className="qa-thumb"><img src={task.image} alt="" loading="lazy" decoding="async" /></div>
                <div className="qa-task-main"><b>{task.name}</b><span>{task.id} · {review?.reviewer || "Awaiting QA"}</span></div>
                <div className="qa-task-count"><strong>{review?.annotationCount ?? "—"}</strong><span>objects</span></div>
                <StatusBadge status={review?.decision || "Pending Review"} />
                <ChevronDown size={16} className="qa-row-arrow"/>
              </button>
            }) : <div className="qa-empty"><ClipboardCheck size={34}/><h3>No review tasks</h3><p>Submit a completed task from the Annotation Workspace to send it into QA.</p></div>}
          </div>
        </section>
        <section className="panel qa-review-panel">
          {selectedTask ? <>
            <div className="qa-review-head"><div><span className="eyebrow">ANNOTATION INSPECTION</span><h2>{selectedTask.name}</h2><p>{selectedTask.id} · {selectedAnnotations.length} annotation{selectedAnnotations.length===1?"":"s"}</p></div><StatusBadge status={selectedReview?.decision || "Pending Review"} /></div>
            <div className="qa-image-stage">
              <img src={selectedTask.image} alt={selectedTask.name} loading="lazy" decoding="async" />
              {selectedAnnotations.slice(0,30).map((a,i) => a.type==="rectangle"
                ? <div key={a.id} className="qa-box" style={{left:`${a.x}%`,top:`${a.y}%`,width:`${a.w}%`,height:`${a.h}%`,borderColor:a.color}}><span>{i+1}</span></div>
                : a.points?.length ? <div key={a.id} className="qa-point-mark" style={{left:`${a.points[0].x}%`,top:`${a.points[0].y}%`,borderColor:a.color}}><span>{i+1}</span></div> : null)}
              {!selectedAnnotations.length && <div className="qa-no-annotations"><AlertCircle size={18}/> No annotations saved on this task</div>}
            </div>
            <div className="qa-review-meta"><div><span>ANNOTATIONS</span><b>{selectedAnnotations.length}</b></div><div><span>STATUS</span><b>{selectedReview?.decision || "Pending Review"}</b></div><div><span>REVIEWER</span><b>{selectedReview?.reviewer || "Unassigned"}</b></div></div>
            <div className="qa-section"><div className="qa-section-head"><div><h3>Quality score</h3><p>Rate the overall annotation quality.</p></div><strong>{score}%</strong></div><input className="qa-score-range" type="range" min="0" max="100" value={score} onChange={e=>setScore(Number(e.target.value))}/><div className="score-scale"><span>0 Poor</span><span>50 Average</span><span>100 Excellent</span></div></div>
            <div className="qa-section"><h3>Review decision</h3>{canReview ? <div className="decision-grid"><button className="decision approve" onClick={()=>onReview("Approved")}><CheckCircle2 size={17}/><span><b>Approve</b><small>Annotation is ready</small></span></button><button className="decision changes" onClick={()=>onReview("Changes Requested")}><Edit3 size={17}/><span><b>Request Changes</b><small>Send back to annotator</small></span></button><button className="decision reject" onClick={()=>onReview("Rejected")}><AlertCircle size={17}/><span><b>Reject</b><small>Fails quality criteria</small></span></button></div> : <p className="no-access">Only Reviewers, Team Leads and Admins can submit QA decisions.</p>}</div>
            <div className="qa-section"><h3>Feedback</h3><select className="qa-select" value={reason} onChange={e=>setReason(e.target.value)}>{reasons.map(r=><option key={r}>{r}</option>)}</select><textarea className="qa-comment" value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add reviewer comments or correction instructions..." /></div>
            {selectedReview?.history?.length ? <div className="qa-history-mini"><h3>Latest review activity</h3><div><span>{new Date(selectedReview.reviewedAt).toLocaleString()}</span><b>{selectedReview.reviewer}</b><strong>{selectedReview.decision}</strong></div></div> : null}
          </> : <div className="qa-empty full"><ClipboardCheck size={40}/><h3>Select a task to review</h3><p>Choose a task from the review queue.</p></div>}
        </section>
      </div> : <section className="panel qa-history-panel">
        <div className="panel-header"><div><h2>Review History</h2><p>Decisions and reviewer activity stored in this browser.</p></div></div>
        <div className="history-table">
          {tasks.filter(task => reviews[task.id]).map(task => {
            const r = reviews[task.id];
            return <div className="history-row" key={task.id}>
              <div className="history-task"><b>{task.name}</b><span>{task.id}</span></div>
              <strong>{r.score}%</strong><StatusBadge status={r.decision}/><span>{r.reviewer}</span>
              <span>{new Date(r.reviewedAt).toLocaleString()}</span>
              <button className="text-btn" onClick={()=>{onSelect(task.id);setActiveTab("queue")}}>Review</button>
            </div>;
          })}
          {!tasks.some(task => reviews[task.id]) && <div className="qa-empty"><Clock3 size={34}/><h3>No review history yet</h3><p>Approve, reject, or request changes on a task to create the first QA record.</p></div>}
        </div>
      </section>}
      {message && <div className="workspace-toast"><CheckCircle2 size={17}/>{message}</div>}
    </div>
  );
}
function AnalyticsPage({ projects, tasks, annotations, qaReviews, auditEvents, range, setRange, project, setProject, onExport }) {
  const visibleTasks = useMemo(() => {
    if (project === "All Projects") return tasks;
    const projectName = projects.find(p => p.id === project)?.name;
    return tasks.filter(t => !projectName || t.projectName === projectName || t.projectId === project);
  }, [tasks, projects, project]);

  const visibleTaskIds = useMemo(() => new Set(visibleTasks.map(t => t.id)), [visibleTasks]);
  const totalAnnotations = visibleTasks.reduce((sum, t) => sum + (annotations[t.id]?.length || 0), 0);
  const reviewed = visibleTasks.map(t => qaReviews[t.id]).filter(Boolean);
  const approved = reviewed.filter(r => r.decision === "Approved").length;
  const rejected = reviewed.filter(r => r.decision === "Rejected").length;
  const changes = reviewed.filter(r => r.decision === "Changes Requested").length;
  const scoredReviews = reviewed.filter(r => r.score !== null && r.score !== undefined);
  const averageQA = scoredReviews.length ? Math.round(scoredReviews.reduce((sum, r) => sum + Number(r.score || 0), 0) / scoredReviews.length) : null;
  const completedTasks = visibleTasks.filter(t => ["Completed", "Submitted", "QA Review", "Approved", "Rejected"].includes(t.status)).length;
  const completionRate = visibleTasks.length ? Math.round((completedTasks / visibleTasks.length) * 100) : 0;
  const annotatedTasks = visibleTasks.filter(t => (annotations[t.id] || []).length > 0).length;
  const annotationCoverage = visibleTasks.length ? Math.round((annotatedTasks / visibleTasks.length) * 100) : 0;

  // Real activity trend, bucketed from the audit log rather than simulated —
  // scoped to whichever project is selected, across the chosen time window.
  const relevantEvents = useMemo(() => {
    const actionable = ["Annotation Saved", "Task Submitted", "QA Approved", "QA Rejected"];
    return (auditEvents || []).filter(e => actionable.includes(e.action) && (project === "All Projects" || visibleTaskIds.has(e.taskId)));
  }, [auditEvents, project, visibleTaskIds]);

  const trend = useMemo(() => {
    const now = Date.now();
    const bucketMs = range === "24 hours" ? 3 * 3600000 : range === "30 days" ? 7 * 86400000 : 86400000;
    return Array.from({ length: 8 }, (_, i) => 7 - i).map(stepsAgo => {
      const end = now - stepsAgo * bucketMs;
      const start = end - bucketMs;
      return relevantEvents.filter(e => { const t = new Date(e.timestamp).getTime(); return t >= start && t < end; }).length;
    });
  }, [relevantEvents, range]);
  const maxTrend = Math.max(1, ...trend);
  const trendTotal = trend.reduce((a, b) => a + b, 0);
  const trendFirstHalf = trend.slice(0, 4).reduce((a, b) => a + b, 0);
  const trendSecondHalf = trend.slice(4).reduce((a, b) => a + b, 0);
  const trendChangePct = trendFirstHalf ? Math.round(((trendSecondHalf - trendFirstHalf) / trendFirstHalf) * 100) : null;

  const projectQuality = (p) => {
    const scored = tasks.filter(t => t.projectId === p.id).map(t => qaReviews[t.id]).filter(r => r && r.score !== null && r.score !== undefined);
    return scored.length ? Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length) : null;
  };
  const teamRows = projects.slice(0, 5).map((p) => {
    const projectTasks = tasks.filter(t => t.projectId === p.id);
    return { name: p.team || "Annotation Team", project: p.name, tasks: projectTasks.length, quality: projectQuality(p), progress: progressOf(p) };
  });

  return <div className="page analytics-page">
    <div className="page-head">
      <div><span className="eyebrow">PERFORMANCE INTELLIGENCE</span><h1>Analytics</h1><p>Monitor annotation productivity, quality, workload and project performance.</p></div>
      <div className="analytics-controls"><select value={range} onChange={e=>setRange(e.target.value)}><option>24 hours</option><option>7 days</option><option>30 days</option></select><select value={project} onChange={e=>setProject(e.target.value)}><option>All Projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
    </div>

    <div className="stats-grid analytics-stats">
      <StatCard icon={TrendingUp} label="Recent Activity" value={trendTotal} meta={trendChangePct===null?`${totalAnnotations} annotations recorded`:`${trendChangePct>=0?"+":""}${trendChangePct}% vs earlier in period`} />
      <StatCard icon={CheckCircle2} label="Task Completion" value={`${completionRate}%`} meta={`${completedTasks} completed workflow tasks`} />
      <StatCard icon={ShieldCheck} label="QA Quality" value={averageQA===null ? "—" : `${averageQA}%`} meta={`${approved} approved · ${rejected} rejected`} />
      <StatCard icon={Target} label="Annotation Coverage" value={`${annotationCoverage}%`} meta={`${annotatedTasks} tasks annotated`} />
    </div>

    <div className="analytics-grid-top">
      <section className="panel analytics-chart-panel">
        <div className="panel-head"><div><h2>Annotation Activity</h2><p>Real annotation, submission and review events for the selected period</p></div><span className="chart-value">{totalAnnotations} <small>objects</small></span></div>
        <div className="trend-chart"><div className="chart-y"><span>{maxTrend}</span><span>{Math.round(maxTrend*0.75)}</span><span>{Math.round(maxTrend*0.5)}</span><span>{Math.round(maxTrend*0.25)}</span><span>0</span></div><div className="chart-bars">{trend.map((v,i)=><div className="chart-bar-wrap" key={i}><div className="chart-bar" style={{height:`${v?Math.max(8,(v/maxTrend)*100):3}%`}}></div><span>{range === "24 hours" ? `${(i+1)*3}h` : range === "30 days" ? `W${i+1}` : `D${i+1}`}</span></div>)}</div></div>
      </section>
      <section className="panel quality-panel">
        <div className="panel-head"><div><h2>QA Distribution</h2><p>Current review decisions</p></div><ClipboardCheck size={17}/></div>
        <div className="quality-ring"><div><strong>{averageQA===null ? "—" : `${averageQA}%`}</strong><span>avg score</span></div></div>
        <div className="quality-legend"><div><i className="approved-dot"></i><span>Approved</span><b>{approved}</b></div><div><i className="changes-dot"></i><span>Changes requested</span><b>{changes}</b></div><div><i className="rejected-dot"></i><span>Rejected</span><b>{rejected}</b></div></div>
      </section>
    </div>

    <div className="analytics-grid-bottom">
      <section className="panel analytics-table-panel"><div className="panel-head"><div><h2>Project Performance</h2><p>Progress and delivery health across projects</p></div><button className="text-btn" onClick={()=>onExport({production:true,team:true,qa:true,sla:true,forecast:true}, project==="All Projects"?"All":project, range==="24 hours"?1:range==="30 days"?30:7)}>Export report →</button></div><div className="table-wrap"><table className="analytics-table"><thead><tr><th>PROJECT</th><th>TEAM</th><th>PROGRESS</th><th>QUALITY</th><th>HEALTH</th></tr></thead><tbody>{projects.map(p=>{const q=projectQuality(p); return <tr key={p.id}><td><b>{p.name}</b><small>{Number(p.totalImages||0).toLocaleString()} images</small></td><td>{p.team}</td><td><div className="table-progress"><span><i style={{width:`${progressOf(p)}%`}}></i></span><b>{progressOf(p)}%</b></div></td><td><strong className="quality-number">{q===null?"—":`${q}%`}</strong></td><td><span className={`health-pill ${progressOf(p) >= 70 ? "healthy" : progressOf(p) >= 40 ? "watch" : "risk"}`}><i></i>{progressOf(p) >= 70 ? "On track" : progressOf(p) >= 40 ? "Watch" : "At risk"}</span></td></tr>;})}</tbody></table></div></section>
      <section className="panel team-performance"><div className="panel-head"><div><h2>Team Performance</h2><p>Workload and quality snapshot</p></div><Users size={17}/></div><div className="team-list">{teamRows.length ? teamRows.map(row=><div className="team-row" key={row.project}><div className="team-avatar">{row.name.charAt(0)}</div><div className="team-main"><b>{row.name}</b><span>{row.project}</span><div className="team-meter"><i style={{width:`${Math.min(100, row.progress)}%`}}></i></div></div><div className="team-metrics"><strong>{row.quality===null?"—":`${row.quality}%`}</strong><span>{row.tasks} tasks</span></div></div>) : <div className="analytics-empty">No team data available.</div>}</div></section>
    </div>

    <div className="analytics-insight"><div className="insight-icon"><Zap size={17}/></div><div><b>Performance insight</b><p>{scoredReviews.length ? `The workspace is averaging ${averageQA}% QA quality. ${changes} task${changes === 1 ? " has" : "s have"} requested changes and should be prioritized for correction.` : "Complete a few QA reviews to unlock quality trends, rejection analysis and actionable performance insights."}</p></div><span>LIVE</span></div>
  </div>;
}

function TeamPage({members, allMembers, projects, tasks, stats, search, setSearch, roleFilter, setRoleFilter, statusFilter, setStatusFilter, onCreate, onEdit, onToggleStatus, onDelete, onAssign, message, modalOpen, setModalOpen, editing, form, setForm, onSave, onInvite, onSendReset, accountActionStatus, isAdmin}) {
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id || null);
  const selectedMember = allMembers.find(m => m.id === selectedMemberId) || members[0] || allMembers[0];
  const assignedTasks = selectedMember ? tasks.filter(t => t.assigneeId === selectedMember.id) : [];
  const workload = selectedMember ? Math.min(100, Math.round((assignedTasks.length / Math.max(1, selectedMember.capacity || 1)) * 100)) : 0;
  const avgQuality = allMembers.length ? Math.round(allMembers.reduce((s,m) => s + Number(m.qaScore || 0), 0) / allMembers.length) : 0;
  const initials = (name = "?") => name.split(" ").map(x => x[0]).join("").slice(0,2).toUpperCase();
  const projectName = id => projects.find(p => p.id === id)?.name || "Unassigned";
  const availableTasks = selectedMember ? tasks.filter(t => (selectedMember.projects || []).includes(t.projectId) && !t.assigneeId).slice(0, 12) : [];

  return <div className="page team-page">
    <div className="page-head">
      <div><span className="eyebrow">WORKFORCE MANAGEMENT</span><h1>Team</h1><p>Manage annotators, reviewers, assignments, workload and permissions.</p></div>
      <button className="primary-btn" onClick={onCreate}><UserPlus size={16}/> Add Member</button>
    </div>

    <div className="stats-grid team-stats">
      <StatCard icon={Users} label="Active Members" value={stats.active} meta={`${allMembers.length} total in workspace`} />
      <StatCard icon={Target} label="Active Annotators" value={stats.annotators} meta="Annotation production" />
      <StatCard icon={ClipboardCheck} label="Reviewers" value={stats.reviewers} meta="QA review capacity" />
      <StatCard icon={BriefcaseBusiness} label="Assigned Tasks" value={stats.assigned} meta={`${avgQuality}% average team quality`} />
    </div>

    <div className="team-layout">
      <section className="panel team-members-panel">
        <div className="panel-head"><div><h2>Team Members</h2><p>Roles, projects and current availability</p></div><span className="team-count">{members.length} shown</span></div>
        <div className="team-toolbar">
          <div className="team-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search members..." /></div>
          <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}><option>All Roles</option><option>Team Lead</option><option>Reviewer</option><option>Annotator</option></select>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All Status</option><option>Active</option><option>Inactive</option></select>
        </div>
        <div className="member-list">
          {members.length ? members.map(member => {
            const memberTasks = tasks.filter(t => t.assigneeId === member.id).length;
            const load = Math.min(100, Math.round((memberTasks / Math.max(1, member.capacity || 1)) * 100));
            return <button className={`member-row ${selectedMember?.id === member.id ? "selected" : ""}`} key={member.id} onClick={() => setSelectedMemberId(member.id)}>
              <div className="member-avatar">{initials(member.name)}</div>
              <div className="member-info"><b>{member.name}</b><span>{member.email}</span><div className="member-tags"><em className={`role-pill ${member.role.toLowerCase().replaceAll(" ", "-")}`}>{member.role}</em><em className={`member-status ${member.status.toLowerCase()}`}><i></i>{member.status}</em></div></div>
              <div className="member-load"><b>{memberTasks}</b><span>tasks</span><div className="load-track"><i style={{width:`${load}%`}}></i></div></div>
              <ChevronDown size={15} className="member-chevron" />
            </button>;
          }) : <div className="team-empty"><Users size={30}/><h3>No members found</h3><p>Try another search or filter.</p></div>}
        </div>
      </section>

      <section className="panel team-detail-panel">
        {selectedMember ? <>
          <div className="team-detail-head"><div className="detail-profile"><div className="detail-avatar">{initials(selectedMember.name)}</div><div><h2>{selectedMember.name}</h2><p>{selectedMember.email}</p><div className="member-tags"><em className="role-pill">{selectedMember.role}</em><em className={`member-status ${selectedMember.status.toLowerCase()}`}><i></i>{selectedMember.status}</em></div></div></div><div className="detail-actions"><button className="secondary-btn" onClick={()=>onEdit(selectedMember)}><Edit3 size={14}/> Edit</button><button className="icon-btn" title={selectedMember.status === "Active" ? "Deactivate" : "Activate"} aria-label={selectedMember.status === "Active" ? "Deactivate" : "Activate"} onClick={()=>onToggleStatus(selectedMember)}>{selectedMember.status === "Active" ? <Pause size={15}/> : <Play size={15}/>}</button><button className="icon-btn danger" title="Remove member" aria-label="Remove member" onClick={()=>onDelete(selectedMember)}><Trash2 size={15}/></button></div></div>
          <div className="detail-metrics"><div><span>Assigned</span><b>{assignedTasks.length}</b></div><div><span>Capacity</span><b>{selectedMember.capacity || 0}</b></div><div><span>Workload</span><b>{workload}%</b></div><div><span>QA Score</span><b>{selectedMember.qaScore ? `${selectedMember.qaScore}%` : "—"}</b></div></div>
          <div className="team-detail-section"><div className="section-title"><div><h3>Project Access</h3><p>Projects this member can work on</p></div><ShieldCheck size={16}/></div><div className="project-access-list">{(selectedMember.projects || []).length ? selectedMember.projects.map(id=><div key={id}><FolderKanban size={14}/><span>{projectName(id)}</span><Check size={14}/></div>) : <div className="no-access">No projects assigned.</div>}</div></div>
          <div className="team-detail-section"><div className="section-title"><div><h3>Current Assignments</h3><p>Tasks currently allocated to this member</p></div><span>{assignedTasks.length}</span></div>{assignedTasks.length ? <div className="assignment-list">{assignedTasks.map(task=><div className="assignment-row" key={task.id}><div className="assignment-thumb">{task.image ? <img src={task.image} alt="" loading="lazy" decoding="async"/> : <ImageIcon size={15}/>}</div><div><b>{task.name}</b><span>{projectName(task.projectId)}</span></div><StatusBadge status={task.status}/><button className="icon-btn" onClick={()=>onAssign(task.id, "")} title="Unassign"><X size={14}/></button></div>)}</div> : <div className="team-empty compact"><ClipboardCheck size={25}/><p>No tasks assigned yet.</p></div>}</div>
          {isAdmin ? <div className="team-detail-section"><div className="section-title"><div><h3>Account Access</h3><p>Login account for this member (separate from their roster entry above)</p></div><LogOut size={16} style={{transform:"scaleX(-1)"}}/></div>
            <div className="account-access-row">
              <span>{selectedMember.email || "No email on file"}</span>
              <div className="account-access-actions">
                <button className="secondary-btn" disabled={!selectedMember.email || accountActionStatus.loading} onClick={()=>onInvite(selectedMember.email, selectedMember.name)}><UserPlus size={14}/> Invite to sign in</button>
                <button className="secondary-btn" disabled={!selectedMember.email || accountActionStatus.loading} onClick={()=>onSendReset(selectedMember.email)}><RotateCcw size={14}/> Send password reset</button>
              </div>
            </div>
            {accountActionStatus.forEmail === selectedMember.email && accountActionStatus.message && <div className={`account-access-note ${accountActionStatus.error ? "error" : "ok"}`}>{accountActionStatus.error ? <AlertCircle size={13}/> : <CheckCircle2 size={13}/>}{accountActionStatus.message}</div>}
            <p className="account-access-hint">Admin-only action. Manage roles from Settings → Roles & Access.</p>
          </div> : null}
          <div className="team-detail-section"><div className="section-title"><div><h3>Assign Unallocated Work</h3><p>Open tasks from the member's project access</p></div><Target size={16}/></div>{availableTasks.length ? <div className="assignable-list">{availableTasks.map(task=><div className="assignable-row" key={task.id}><div><b>{task.name}</b><span>{projectName(task.projectId)}</span></div><button className="secondary-btn" onClick={()=>onAssign(task.id, selectedMember.id)}><Plus size={13}/> Assign</button></div>)}</div> : <div className="no-access">No unallocated tasks available for this member.</div>}</div>
        </> : <div className="team-empty"><Users size={40}/><h3>Select a team member</h3><p>Choose a member to view workload and assignments.</p></div>}
      </section>
    </div>
    {message && <div className="workspace-toast"><CheckCircle2 size={17}/>{message}</div>}
    {modalOpen && <TeamMemberModal editing={editing} form={form} setForm={setForm} projects={projects} onClose={()=>setModalOpen(false)} onSave={onSave} />}
  </div>;
}

function TeamMemberModal({editing, form, setForm, projects, onClose, onSave}) {
  const toggleProject = id => setForm(prev => ({...prev, projects: prev.projects.includes(id) ? prev.projects.filter(x=>x!==id) : [...prev.projects, id]}));
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal team-modal"><div className="modal-head"><div><span className="eyebrow">TEAM MANAGEMENT</span><h2>{editing ? "Edit Team Member" : "Add Team Member"}</h2><p>Set role, availability, capacity and project access.</p></div><button aria-label="Close" className="icon-btn" onClick={onClose}><X size={17}/></button></div><form onSubmit={onSave}><div className="team-form-grid"><label><span>FULL NAME</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Rahul Kumar" autoFocus required/></label><label><span>EMAIL</span><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@company.com" required/></label><label><span>ROLE</span><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option>Annotator</option><option>Reviewer</option><option>Team Lead</option></select></label><label><span>STATUS</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Active</option><option>Inactive</option></select></label><label><span>TASK CAPACITY</span><input type="number" min="0" max="100" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/></label></div><div className="team-project-form"><span>PROJECT ACCESS</span><div>{projects.map(p=><button type="button" key={p.id} className={form.projects.includes(p.id)?"project-check active":"project-check"} onClick={()=>toggleProject(p.id)}><span>{form.projects.includes(p.id)?<Check size={13}/>:<span/>}</span><div><b>{p.name}</b><small>{p.client}</small></div></button>)}</div></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button type="submit" className="primary-btn"><Save size={14}/>{editing ? "Save Changes" : "Add Member"}</button></div></form></div></div>;
}

function WorkloadPage({projects,rows,summary,tasks,project,setProject,projectOptions,role,setRole,capacityMode,setCapacityMode,settings,setSettings,onBalance,onCapacity,message,onOpenPlanner}) {
  const projectName = id => projects.find(p => p.id === id)?.name || "All Projects";
  const statusForLoad = load => load > 100 ? "Overloaded" : load >= 80 ? "High load" : load >= 50 ? "Healthy" : "Available";
  const statusClass = load => load > 100 ? "overloaded" : load >= 80 ? "high" : load >= 50 ? "healthy" : "available";
  return <div className="page workload-page">
    <div className="page-head workload-head"><div><span className="eyebrow">WORKFORCE OPERATIONS</span><h1>Workload & Capacity</h1><p>Monitor team capacity, balance queues and prevent annotation bottlenecks.</p></div><div className="page-head-actions"><button className="secondary-btn" onClick={onOpenPlanner}><Target size={15}/> Task Planner</button><button className="primary-btn" onClick={onBalance}><Zap size={15}/> Auto Balance</button></div></div>
    <div className="workload-controls panel"><div className="workload-control"><span>PROJECT</span><select value={project} onChange={e=>setProject(e.target.value)}>{projectOptions.map(id=><option key={id} value={id}>{projectName(id)}</option>)}</select></div><div className="workload-control"><span>ROLE</span><select value={role} onChange={e=>setRole(e.target.value)}><option>Annotator</option><option>Reviewer</option><option>All Roles</option></select></div><div className="workload-control"><span>CAPACITY VIEW</span><div className="segmented-control"><button className={capacityMode==="Daily"?"active":""} onClick={()=>setCapacityMode("Daily")}>Daily</button><button className={capacityMode==="Weekly"?"active":""} onClick={()=>setCapacityMode("Weekly")}>Weekly</button></div></div><div className="workload-settings"><label><span>Default {capacityMode.toLowerCase()} capacity</span><input type="number" min="1" value={capacityMode==="Daily"?settings.defaultDailyCapacity:settings.defaultWeeklyCapacity} onChange={e=>setSettings(prev=>({...prev,[capacityMode==="Daily"?"defaultDailyCapacity":"defaultWeeklyCapacity"]:Math.max(1,Number(e.target.value)||1)}))}/><b>tasks</b></label></div></div>
    <div className="stats-grid workload-stats"><StatCard icon={Users} label="Active Members" value={summary.active} meta="Available workforce"/><StatCard icon={ClipboardCheck} label="Assigned Tasks" value={summary.assigned} meta="Current allocation"/><StatCard icon={AlertCircle} label="Unassigned" value={summary.unassigned} meta="Needs allocation"/><StatCard icon={Activity} label="Utilization" value={`${summary.utilization}%`} meta="Across visible capacity"/><StatCard icon={AlertCircle} label="Overloaded" value={summary.overloaded} meta="Above capacity"/></div>
    <section className="panel workload-panel"><div className="section-header"><div><h2>Team Capacity</h2><p>Live workload based on assigned tasks and each member's capacity.</p></div><span className="workload-project-chip">{projectName(project)}</span></div><div className="workload-table-wrap"><table className="workload-table"><thead><tr><th>MEMBER</th><th>ROLE</th><th>PROJECT ACCESS</th><th>ASSIGNED</th><th>CAPACITY</th><th>LOAD</th><th>PROGRESS</th><th>CAPACITY</th></tr></thead><tbody>{rows.length ? rows.map(r=><tr key={r.member.id}><td><div className="workload-member"><div className="user-avatar small">{r.member.name?.charAt(0)||"?"}</div><div><b>{r.member.name}</b><span>{r.member.email}</span></div></div></td><td><span className="role-pill">{r.member.role}</span></td><td><span className="project-access">{r.member.projects?.length || 0} project{r.member.projects?.length===1?"":"s"}</span></td><td><strong>{r.assigned}</strong><small>{r.inProgress} active · {r.submitted} review · {r.completed} done</small></td><td><strong>{r.capacity}</strong><small>{capacityMode.toLowerCase()} target</small></td><td><span className={`load-pill ${statusClass((r.assigned/r.capacity)*100)}`}>{Math.round((r.assigned/r.capacity)*100)}%</span><small>{statusForLoad((r.assigned/r.capacity)*100)}</small></td><td><div className="workload-progress"><span><i style={{width:`${Math.min(100,Math.round((r.assigned/r.capacity)*100))}%`}}/></span><b>{Math.min(100,Math.round((r.assigned/r.capacity)*100))}%</b></div></td><td><input className="capacity-input" type="number" min="1" value={r.capacity} onChange={e=>onCapacity(r.member.id,e.target.value)}/></td></tr>) : <tr><td colSpan="8" className="workload-empty">No active members match this view.</td></tr>}</tbody></table></div></section>
    <section className="workload-bottom-grid"><div className="panel workload-panel compact"><div className="section-header"><div><h2>Queue Health</h2><p>Tasks that need attention.</p></div></div><div className="queue-health-grid"><MiniStat label="Unassigned" value={summary.unassigned}/><MiniStat label="Pending" value={tasks.filter(t=>(project==="All Projects"||t.projectId===project)&&t.status==="Pending").length}/><MiniStat label="In Progress" value={tasks.filter(t=>(project==="All Projects"||t.projectId===project)&&t.status==="In Progress").length}/><MiniStat label="QA Review" value={tasks.filter(t=>(project==="All Projects"||t.projectId===project)&&["Submitted","QA Review"].includes(t.status)).length}/></div><div className="queue-health-note"><ShieldCheck size={16}/><span>Keep individual load below <b>100%</b> to reduce queue risk.</span></div></div><div className="panel workload-panel compact"><div className="section-header"><div><h2>Capacity Guide</h2><p>Recommended operating bands.</p></div></div><div className="capacity-guide"><div><span className="guide-dot available"></span><b>0–49%</b><small>Available</small></div><div><span className="guide-dot healthy"></span><b>50–79%</b><small>Healthy</small></div><div><span className="guide-dot high"></span><b>80–100%</b><small>High load</small></div><div><span className="guide-dot overloaded"></span><b>&gt;100%</b><small>Overloaded</small></div></div><p className="workload-tip"><Zap size={14}/> Auto Balance distributes pending unassigned tasks to the least-loaded eligible annotators.</p></div></section>
    {message && <div className="workload-toast"><CheckCircle2 size={16}/>{message}</div>}
  </div>;
}

function OperationsPage({projects,tasks,teamMembers,qaReviews,exportHistory,search,setSearch,filter,setFilter,project,setProject,showUnread,setShowUnread,readMap,setReadMap}) {
  const projectName = id => projects.find(p=>p.id===id)?.name || "Unknown Project";
  const rows = useMemo(() => {
    const events = [];
    tasks.forEach(t => {
      const p = t.projectId || "";
      const assigned = t.assignee || t.annotator || t.assignedTo;
      if (assigned) events.push({id:`task-assign-${t.id}`,type:"Assignment",icon:Users,title:"Task assigned",text:`${t.fileName || t.name || t.id} is assigned to ${assigned}.`,project:p,task:t.id,status:t.status || "Pending",time:t.updatedAt || t.createdAt || new Date().toISOString()});
      if (["Submitted","QA Review"].includes(t.status)) events.push({id:`task-review-${t.id}`,type:"QA",icon:ClipboardCheck,title:"Task awaiting review",text:`${t.fileName || t.name || t.id} is ready for QA review.`,project:p,task:t.id,status:t.status,time:t.updatedAt || new Date().toISOString()});
      if (t.status === "Changes Requested" || t.status === "Rejected") events.push({id:`task-rework-${t.id}`,type:"Rework",icon:RotateCcw,title:"Rework required",text:`${t.fileName || t.name || t.id} needs annotation changes.`,project:p,task:t.id,status:t.status,time:t.updatedAt || new Date().toISOString()});
      if (t.status === "Approved" || t.status === "Completed") events.push({id:`task-done-${t.id}`,type:"Completion",icon:CheckCircle2,title:"Task completed",text:`${t.fileName || t.name || t.id} is ${t.status.toLowerCase()}.`,project:p,task:t.id,status:t.status,time:t.updatedAt || new Date().toISOString()});
      if (!assigned && t.status === "Pending") events.push({id:`task-unassigned-${t.id}`,type:"Alert",icon:AlertCircle,title:"Unassigned task",text:`${t.fileName || t.name || t.id} is waiting for assignment.`,project:p,task:t.id,status:t.status,time:t.updatedAt || new Date().toISOString()});
    });
    Object.entries(qaReviews || {}).forEach(([taskId, review]) => {
      const t = tasks.find(x=>x.id===taskId); events.push({id:`qa-record-${taskId}`,type:"QA",icon:ShieldCheck,title:`QA ${review.decision || "review"}`,text:`${t?.fileName || taskId} received a quality review${review.score != null ? ` with score ${review.score}%` : ""}.`,project:t?.projectId || "",task:taskId,status:review.decision || "Reviewed",time:review.updatedAt || review.timestamp || new Date().toISOString()});
    });
    (exportHistory || []).slice(0,30).forEach((h,i)=>events.push({id:`export-${h.id || i}`,type:"Export",icon:Download,title:"Export completed",text:`${h.format || "Dataset"} export created with ${h.taskCount ?? h.tasks ?? 0} tasks.`,project:h.projectId || "",task:"",status:"Completed",time:h.timestamp || new Date().toISOString()}));
    teamMembers.forEach(m=>{ if(m.status==="Inactive") events.push({id:`member-${m.id}`,type:"Team",icon:Users,title:"Inactive team member",text:`${m.name} is currently inactive and cannot receive new work.`,project:"",task:"",status:"Inactive",time:new Date().toISOString()}); });
    return events.sort((a,b)=>new Date(b.time)-new Date(a.time));
  },[tasks,qaReviews,exportHistory,teamMembers,projects]);
  const filtered = rows.filter(r=>{
    const q=search.trim().toLowerCase();
    const matchQ=!q || `${r.title} ${r.text} ${r.task} ${projectName(r.project)}`.toLowerCase().includes(q);
    const matchF=filter==="All" || r.type===filter;
    const matchP=project==="All Projects" || r.project===project;
    const matchU=!showUnread || !readMap[r.id];
    return matchQ&&matchF&&matchP&&matchU;
  });
  const unread=rows.filter(r=>!readMap[r.id]).length;
  const alertCount=rows.filter(r=>["Alert","Rework"].includes(r.type)).length;
  const markAll=()=>setReadMap(prev=>Object.fromEntries(rows.map(r=>[r.id,true]).map(([k,v])=>[k,v])));
  const markRead=id=>setReadMap(prev=>({...prev,[id]:true}));
  const clearRead=()=>setReadMap(prev=>Object.fromEntries(Object.entries(prev).filter(([,v])=>!v)));
  const relative=t=>{const d=Date.now()-new Date(t).getTime();if(!Number.isFinite(d))return "Recently";const m=Math.floor(d/60000);if(m<1)return "Just now";if(m<60)return `${m}m ago`;const h=Math.floor(m/60);if(h<24)return `${h}h ago`;return `${Math.floor(h/24)}d ago`;};
  return <div className="page operations-page">
    <div className="page-head operations-head"><div><span className="eyebrow">OPERATIONS CONTROL CENTER</span><h1>Operations & Activity</h1><p>Monitor assignments, QA events, rework and delivery activity across every project.</p></div><div className="page-head-actions"><button className="secondary-btn" onClick={markAll}><Check size={15}/> Mark all read</button></div></div>
    <div className="stats-grid operations-stats"><StatCard icon={Bell} label="Unread" value={unread} meta="New operational events"/><StatCard icon={AlertCircle} label="Alerts & Rework" value={alertCount} meta="Needs attention"/><StatCard icon={Activity} label="Total Events" value={rows.length} meta="Current activity stream"/><StatCard icon={Users} label="Team Members" value={teamMembers.filter(m=>m.status==="Active").length} meta="Active workforce"/></div>
    <section className="panel operations-panel"><div className="operations-toolbar"><div className="operations-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search activity, task or project..."/></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Assignment</option><option>QA</option><option>Rework</option><option>Completion</option><option>Alert</option><option>Export</option><option>Team</option></select><select value={project} onChange={e=>setProject(e.target.value)}><option>All Projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><label className="operations-unread"><input type="checkbox" checked={showUnread} onChange={e=>setShowUnread(e.target.checked)}/> Unread only</label></div></section>
    <div className="operations-grid"><section className="panel operations-feed"><div className="section-header"><div><h2>Activity Feed</h2><p>Latest events generated from your shared project, task, QA and team data.</p></div><span className="operations-count">{filtered.length} events</span></div><div className="operations-list">{filtered.length ? filtered.map(r=>{const Icon=r.icon;const unreadRow=!readMap[r.id];return <button key={r.id} className={`operation-row ${unreadRow?"unread":""}`} onClick={()=>markRead(r.id)}><span className={`operation-icon ${r.type.toLowerCase()}`}><Icon size={15}/></span><span className="operation-body"><b>{r.title}</b><em>{r.text}</em><small>{r.task ? `${r.task} · ` : ""}{r.project ? projectName(r.project) : r.type}</small></span><time>{relative(r.time)}</time>{unreadRow&&<i className="unread-dot"/>}</button>}) : <div className="operations-empty"><Activity size={30}/><b>No activity matches your filters</b><span>Try another project, event type or search term.</span></div>}</div></section>
      <aside className="operations-side"><section className="panel operations-alerts"><div className="section-header"><div><h2>Needs Attention</h2><p>Operational risks detected from current data.</p></div></div><div className="attention-list">{rows.filter(r=>["Alert","Rework"].includes(r.type)).slice(0,8).map(r=>{const Icon=r.icon;return <div className="attention-item" key={r.id}><span><Icon size={14}/></span><div><b>{r.title}</b><small>{r.text}</small></div></div>})}{!rows.some(r=>["Alert","Rework"].includes(r.type))&&<div className="attention-empty"><CheckCircle2 size={18}/> No critical operational alerts</div>}</div></section><section className="panel operations-read"><div className="section-header"><div><h2>Read State</h2><p>Control your activity inbox.</p></div></div><div className="read-actions"><button onClick={markAll}>Mark all read <Check size={13}/></button><button onClick={clearRead}>Reset read state <RefreshCw size={13}/></button></div><div className="read-note"><Eye size={14}/><span>Click any activity item to mark it as read. Read state is saved locally on this device.</span></div></section></aside>
    </div>
  </div>;
}

function DeadlinesPage({ overview, projects, teamMembers, onSetTaskDueDate, onEscalate, onOpenTask }) {
  const { overdue, dueToday, dueWeek, agingBuckets, slaCompliance, measured, upcomingProjects } = overview;
  const maxAging = Math.max(1, ...agingBuckets.map(b => b.count));
  const projectName = id => projects.find(p => p.id === id)?.name || "—";
  const memberName = id => teamMembers.find(m => m.id === id)?.name || "Unassigned";
  return <div className="page deadlines-page">
    <div className="page-head"><div><span className="eyebrow">SLA & DEADLINE MANAGEMENT</span><h1>Deadlines</h1><p>Track project and task deadlines, SLA compliance, aging and escalations across your workspace.</p></div></div>

    <div className="stats-grid deadlines-stats">
      <StatCard icon={AlertCircle} label="Overdue Tasks" value={overdue.length} meta="Past their SLA or due date"/>
      <StatCard icon={Clock3} label="Due Today" value={dueToday.length} meta="Within the next 24 hours"/>
      <StatCard icon={Calendar} label="Due This Week" value={dueWeek.length} meta="Within the next 7 days"/>
      <StatCard icon={ShieldCheck} label="SLA Compliance" value={slaCompliance === null ? "—" : `${slaCompliance}%`} meta={measured ? `${measured} reviewed task${measured===1?"":"s"} measured` : "No reviewed tasks yet"}/>
    </div>

    <div className="deadlines-grid-top">
      <section className="panel analytics-chart-panel">
        <div className="panel-head"><div><h2>Aging Report</h2><p>How long open tasks have sat in their current stage</p></div></div>
        <div className="trend-chart"><div className="chart-y"><span>{maxAging}</span><span>{Math.round(maxAging*0.75)}</span><span>{Math.round(maxAging*0.5)}</span><span>{Math.round(maxAging*0.25)}</span><span>0</span></div><div className="chart-bars">{agingBuckets.map(b=><div className="chart-bar-wrap" key={b.label}><div className="chart-bar" style={{height:`${Math.max(6,(b.count/maxAging)*100)}%`}}></div><span>{b.label}</span></div>)}</div></div>
      </section>
      <section className="panel deadlines-upcoming-panel">
        <div className="panel-head"><div><h2>Upcoming Project Deadlines</h2><p>Sorted by soonest due date</p></div></div>
        <div className="upcoming-deadlines-list">
          {upcomingProjects.length ? upcomingProjects.slice(0,6).map(u => <div className="upcoming-deadline-row" key={u.project.id}>
            <div><b>{u.project.name}</b><span>{new Date(u.project.dueDate).toLocaleDateString()}</span></div>
            <div className="upcoming-progress"><div className="progress-track"><i style={{width:`${u.progress}%`}}/></div><small>{u.progress}%</small></div>
            <span className={`days-left-badge ${u.daysLeft<0?"overdue":u.daysLeft<=3?"soon":""}`}>{u.daysLeft<0?`${Math.abs(u.daysLeft)}d overdue`:`${u.daysLeft}d left`}</span>
          </div>) : <div className="config-empty small"><Calendar size={22}/><p>No project deadlines set yet — add a due date from Project Configuration.</p></div>}
        </div>
      </section>
    </div>

    <section className="panel deadlines-overdue-panel">
      <div className="panel-head"><div><h2>Overdue Tasks ({overdue.length})</h2><p>Ranked by how far past their SLA or due date they are</p></div></div>
      {overdue.length ? <div className="overdue-task-list">
        {overdue.slice(0,25).map(r => <div className="overdue-task-row" key={r.task.id}>
          <div className="overdue-task-main"><b>{r.task.name}</b><span>{projectName(r.task.projectId)} · {memberName(r.task.assigneeId)} · {r.task.status}</span></div>
          <span className="overdue-hours-badge">{r.overdueHours.toFixed(1)}h overdue</span>
          <input type="date" className="due-date-input" value={r.task.dueDate ? r.task.dueDate.slice(0,10) : ""} onChange={e=>onSetTaskDueDate(r.task.id, e.target.value ? new Date(e.target.value).toISOString() : null)}/>
          <button className="ghost-btn" onClick={()=>onOpenTask(r.task)}><Play size={13}/> Open</button>
          <button className="ghost-btn" onClick={()=>onEscalate(r.task)}><AlertCircle size={13}/> Escalate</button>
        </div>)}
      </div> : <div className="config-empty"><CheckCircle2 size={34}/><h3>Nothing overdue</h3><p>All open tasks are within their SLA and due-date targets.</p></div>}
    </section>
  </div>;
}


function QaQualityPage({ analytics, projectGroups }) {
  const { scored, weeks, annotatorStats, reviewerStats, agreementRate, multiReviewedCount, errorTally, calibrationRows } = analytics;
  const avgScore = scored.length ? Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length) : null;
  const totalErrors = errorTally.reduce((s, e) => s + e.count, 0);
  const groupName = id => projectGroups.find(g => g.id === id)?.name || "";
  return <div className="page qa-quality-page">
    <div className="page-head"><div><span className="eyebrow">ADVANCED QA & QUALITY SCORING</span><h1>QA & Quality</h1><p>Scorecards, error trends, calibration and quality rankings across every reviewed task.</p></div></div>

    <div className="stats-grid">
      <StatCard icon={ShieldCheck} label="Reviews Scored" value={scored.length} meta="Tasks with a recorded QA score"/>
      <StatCard icon={TrendingUp} label="Average Score" value={avgScore===null?"—":`${avgScore}%`} meta="Across all scored reviews"/>
      <StatCard icon={Users} label="Reviewer Agreement" value={agreementRate===null?"—":`${agreementRate}%`} meta={multiReviewedCount ? `${multiReviewedCount} task${multiReviewedCount===1?"":"s"} reviewed more than once` : "No repeat reviews yet"}/>
      <StatCard icon={AlertCircle} label="Errors Logged" value={totalErrors} meta={`${errorTally.length} categor${errorTally.length===1?"y":"ies"} in use`}/>
    </div>

    <div className="deadlines-grid-top">
      <section className="panel analytics-chart-panel">
        <div className="panel-head"><div><h2>Quality Trend</h2><p>Average QA score by week (last 8 weeks)</p></div></div>
        <div className="trend-chart"><div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart-bars">{weeks.map((w,i)=><div className="chart-bar-wrap" key={i}><div className="chart-bar" style={{height:`${w.avg?Math.max(6,w.avg):3}%`}} title={w.avg!==null?`${w.avg}% (${w.count} review${w.count===1?"":"s"})`:"No reviews"}></div><span>{w.label}</span></div>)}</div></div>
      </section>
      <section className="panel deadlines-upcoming-panel">
        <div className="panel-head"><div><h2>Error Categories</h2><p>Most frequently logged QA errors</p></div></div>
        {errorTally.length ? <div className="error-tally-list">{errorTally.slice(0,8).map(e => <div className="error-tally-row" key={e.name}><span className={`sev-dot sev-${(e.severity||"Minor").toLowerCase()}`}/><b>{e.name}</b><span className="error-tally-count">{e.count}</span></div>)}</div> : <div className="config-empty small"><AlertCircle size={22}/><p>No errors logged yet — they're tagged from the QA Scorecard during review.</p></div>}
      </section>
    </div>

    <div className="deadlines-grid-top">
      <section className="panel">
        <div className="panel-head"><div><h2>Annotator Quality Ranking</h2><p>Average QA score across each annotator's reviewed tasks</p></div></div>
        {annotatorStats.length ? <div className="ranking-list">{annotatorStats.map((a,i) => <div className="ranking-row" key={a.member.id}><span className="rank-number">{i+1}</span><div className="ranking-main"><b>{a.member.name}</b><span>{a.reviewCount} reviewed · {a.errorCount} error{a.errorCount===1?"":"s"}</span></div><span className="ranking-score">{a.avgScore===null?"—":`${a.avgScore}%`}</span><span className="ranking-approval">{a.approvalRate===null?"—":`${a.approvalRate}% approved`}</span></div>)}</div> : <div className="config-empty small"><Users size={22}/><p>No reviewed tasks yet.</p></div>}
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Reviewer Performance</h2><p>Throughput, scoring tendency and turnaround per reviewer</p></div></div>
        {reviewerStats.length ? <div className="ranking-list">{reviewerStats.map((r,i) => <div className="ranking-row" key={r.name}><span className="rank-number">{i+1}</span><div className="ranking-main"><b>{r.name}</b><span>{r.reviewCount} review{r.reviewCount===1?"":"s"} · {r.rejectionRate===null?"—":`${r.rejectionRate}% rejected`}</span></div><span className="ranking-score">{r.avgScoreGiven===null?"—":`${r.avgScoreGiven}%`}</span><span className="ranking-approval">{r.avgTurnaroundHours===null?"—":`${r.avgTurnaroundHours.toFixed(1)}h avg`}</span></div>)}</div> : <div className="config-empty small"><ShieldCheck size={22}/><p>No reviews recorded yet.</p></div>}
      </section>
    </div>

    <section className="panel">
      <div className="panel-head"><div><h2>Calibration Drift</h2><p>How reviewed scores compare to gold-standard references, across every project</p></div></div>
      {calibrationRows.length ? <div className="calibration-list">{calibrationRows.map(row => <div className="calibration-row" key={row.entry.id}>
        <div><b>{row.entry.taskId}</b><span>{groupName(row.group.id)} · Gold: {row.entry.goldScore}</span></div>
        {row.drift !== null ? <span className={`drift-badge ${Math.abs(row.drift)<=5?"good":Math.abs(row.drift)<=15?"warn":"bad"}`}>{row.review.reviewer}: {row.review.score} ({row.drift>0?"+":""}{row.drift})</span> : <span className="drift-badge pending">Not reviewed yet</span>}
      </div>)}</div> : <div className="config-empty small"><Target size={22}/><p>Add calibration references from each project's Configuration → QA Scorecard tab.</p></div>}
    </section>
  </div>;
}

function ReportsPage({ reporting, quality, deadlines, projects, onExport }) {
  const [sections, setSections] = useState({ production: true, team: true, qa: true, sla: true, forecast: true });
  const [reportProject, setReportProject] = useState("All");
  const [reportRange, setReportRange] = useState(30);
  const recentDays = reporting.throughputDays.slice(-14);
  const maxDay = Math.max(1, ...recentDays.map(d => d.count));
  const toggleSection = (key) => setSections(prev => ({ ...prev, [key]: !prev[key] }));

  return <div className="page reports-page">
    <div className="page-head"><div><span className="eyebrow">ADVANCED ANALYTICS & REPORTING</span><h1>Reports</h1><p>Production, team, QA, SLA and forecasting analytics in one place, with exportable custom reports.</p></div></div>

    <div className="stats-grid">
      <StatCard icon={TrendingUp} label="Throughput (7d)" value={reporting.last7} meta={reporting.throughputTrendPct===null?"vs prior week: —":`${reporting.throughputTrendPct>=0?"+":""}${reporting.throughputTrendPct}% vs prior week`}/>
      <StatCard icon={CheckCircle2} label="Accuracy Rate" value={reporting.accuracyRate===null?"—":`${reporting.accuracyRate}%`} meta="Approved of all reviewed decisions"/>
      <StatCard icon={ShieldCheck} label="First-Pass Yield" value={reporting.firstPassYield===null?"—":`${reporting.firstPassYield}%`} meta="Approved with no rework cycle"/>
      <StatCard icon={RotateCcw} label="Rework Rate" value={reporting.reworkRate===null?"—":`${reporting.reworkRate}%`} meta={`${reporting.reworkedCount} of ${reporting.reviewedCount} reviewed tasks`}/>
    </div>

    <div className="deadlines-grid-top">
      <section className="panel analytics-chart-panel">
        <div className="panel-head"><div><h2>Throughput</h2><p>Tasks completed per day (last 14 days)</p></div><span className="chart-value">{reporting.dailyVelocity.toFixed(1)} <small>/day avg</small></span></div>
        <div className="trend-chart"><div className="chart-y"><span>{maxDay}</span><span>{Math.round(maxDay*0.5)}</span><span>0</span></div><div className="chart-bars">{recentDays.map((d,i)=><div className="chart-bar-wrap" key={i}><div className="chart-bar" style={{height:`${Math.max(4,(d.count/maxDay)*100)}%`}} title={`${d.count} on ${d.label}`}></div><span>{d.label}</span></div>)}</div></div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Production</h2><p>Overall volume across the workspace</p></div></div>
        <div className="production-stat-list">
          <div className="production-stat-row"><span>Total Images</span><b>{reporting.totalImages.toLocaleString()}</b></div>
          <div className="production-stat-row"><span>Processed</span><b>{reporting.processedImages.toLocaleString()}</b></div>
          <div className="production-stat-row"><span>Total Annotations</span><b>{reporting.totalAnnotationsCount.toLocaleString()}</b></div>
          <div className="production-stat-row"><span>Avg Annotations / Task</span><b>{reporting.avgAnnotationsPerTask.toFixed(1)}</b></div>
          <div className="production-stat-row"><span>SLA Compliance</span><b>{deadlines.slaCompliance===null?"—":`${deadlines.slaCompliance}%`}</b></div>
          <div className="production-stat-row"><span>Reviewer Agreement</span><b>{quality.agreementRate===null?"—":`${quality.agreementRate}%`}</b></div>
        </div>
      </section>
    </div>

    <section className="panel">
      <div className="panel-head"><div><h2>Team Utilization</h2><p>Active workload against each member's capacity</p></div></div>
      {reporting.teamUtilization.length ? <div className="utilization-list">{reporting.teamUtilization.map(u => <div className="utilization-row" key={u.member.id}>
        <div className="utilization-main"><b>{u.member.name}</b><span>{u.member.role} · {u.assigned}/{u.capacity} tasks</span></div>
        <div className="utilization-track"><i className={u.utilization>=100?"over":u.utilization>=75?"high":""} style={{width:`${Math.min(100,u.utilization)}%`}}/></div>
        <span className="utilization-pct">{u.utilization}%</span>
      </div>)}</div> : <div className="config-empty small"><Users size={22}/><p>No active team members yet.</p></div>}
    </section>

    <section className="panel">
      <div className="panel-head"><div><h2>Forecasting</h2><p>Projected completion based on each project's last 7 days of velocity</p></div></div>
      {reporting.forecasts.length ? <div className="table-wrap"><table className="analytics-table"><thead><tr><th>PROJECT</th><th>REMAINING</th><th>VELOCITY /DAY</th><th>DAYS LEFT</th><th>PROJECTED DATE</th></tr></thead><tbody>{reporting.forecasts.map(f => <tr key={f.project.id}><td><b>{f.project.name}</b></td><td>{f.remaining.toLocaleString()}</td><td>{f.velocity.toFixed(1)}</td><td>{f.daysLeft??"—"}</td><td>{f.projectedDate?f.projectedDate.toLocaleDateString():<span className="forecast-stalled">No recent progress</span>}</td></tr>)}</tbody></table></div> : <div className="config-empty small"><Target size={22}/><p>All projects are complete or have no images yet.</p></div>}
    </section>

    <section className="panel report-builder-panel">
      <div className="panel-head"><div><h2>Custom Report</h2><p>Pick what to include and export a CSV snapshot</p></div><FileText size={18}/></div>
      <div className="report-builder-controls">
        <label><span>PROJECT</span><select value={reportProject} onChange={e=>setReportProject(e.target.value)}><option value="All">All Projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label><span>RANGE</span><select value={reportRange} onChange={e=>setReportRange(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label>
      </div>
      <div className="report-section-toggles">
        {[["production","Production"],["team","Team Utilization"],["qa","QA & Quality"],["sla","SLA & Deadlines"],["forecast","Forecasting"]].map(([key,label]) => <label key={key} className="report-toggle-chip"><input type="checkbox" checked={sections[key]} onChange={()=>toggleSection(key)}/> {label}</label>)}
      </div>
      <button className="primary-btn" onClick={()=>onExport(sections, reportProject, reportRange)}><Download size={16}/> Generate CSV Report</button>
    </section>
  </div>;
}

function SimplePage({title,subtitle,icon:Icon,stats}) {
  return <div className="page"><div className="page-head"><div><span className="eyebrow">ANNOTATEPRO</span><h1>{title}</h1><p>{subtitle}</p></div></div><div className="stats-grid">{stats.map((s,i)=><StatCard key={s} icon={[Activity,Target,ShieldCheck,TrendingUp][i%4]} label={s.split(" ").slice(1).join(" ")} value={s.split(" ")[0]} meta="Workspace metric"/>)}</div><section className="panel placeholder-large"><Icon size={42}/><h2>{title} module</h2><p>This module is connected to the AnnotatePro application shell. The full operational workflow will use the same shared project and task data.</p></section></div>;
}

function StatCard({icon:Icon,label,value,meta}){return <div className="stat-card"><div className="stat-icon"><Icon size={19}/></div><div><span>{label}</span><strong>{value}</strong><small><TrendingUp size={12}/> {meta}</small></div></div>}
function MiniStat({label,value}){return <div className="mini-stat"><span>{label}</span><b>{value}</b></div>}
function StatusBadge({status}){const cls=status==="Completed"||status==="Approved"?"completed":status==="In Progress"||status==="QA Review"||status==="Submitted"?"progressing":status==="Rejected"?"rejected":status==="Changes Requested"?"changes":"pending";return <span className={`status-badge ${cls}`}><i></i>{status}</span>}
function ActivityRow({icon:Icon,title,text,time}){return <div className="activity-row"><div className="activity-icon"><Icon size={16}/></div><div><b>{title}</b><span>{text}</span></div><time>{time}</time></div>}
function Quick({icon:Icon,title,onClick}){return <button className="quick-action" onClick={onClick}><span><Icon size={17}/></span><b>{title}</b><em>→</em></button>}
function Detail({label,value}){return <div className="detail-box"><span>{label}</span><b>{value}</b></div>}


function SettingsPage({ settings, tab, setTab, onUpdate, onReset, message, migrationStatus, migrationRunning, onRunMigration, verifyStatus, verifying, onVerify, lastMigratedAt, migrationDomains, migrationSingletons, imageMigration, onMigrateImages, base64ImageCount, userName, userEmail, userInitial, onSignOut, isAdmin, roleProfiles, rolesLoading, onLoadRoles, onUpdateRole,
  apiTokens, onGenerateToken, onRevokeToken, onDeleteToken, webhooks, onCreateWebhook, onUpdateWebhook, onDeleteWebhook, onTestWebhook, projects, projectGroups, onImportMlPredictions, onExportProjectJson,
  errorLogEntries, onRefreshErrorLog, onClearErrorLog, onExportBackup, onRestoreBackup, onSignOutAllDevices, onRunHealthCheck }) {
  const tabs = [
    ["Workspace", SlidersHorizontal, "Workspace"],
    ["Annotation", Grid3X3, "Annotation"],
    ["Notifications", Bell, "Notifications"],
    ["Preferences", Settings, "Preferences"],
    ...(isAdmin ? [["Roles & Access", Users, "Roles"], ["Integrations", Zap, "Integrations"], ["Security", ShieldCheck, "Security"], ["Diagnostics", CheckSquare, "Diagnostics"], ["Cloud Migration", Database, "Cloud"]] : [])
  ];
  const Toggle = ({ label, description, value, onChange }) => (
    <label className="settings-toggle-row">
      <span><b>{label}</b><small>{description}</small></span>
      <button type="button" className={`toggle-switch ${value ? "on" : ""}`} aria-pressed={value} onClick={() => onChange(!value)}><span /></button>
    </label>
  );
  return (
    <div className="settings-page">
      <div className="page-heading settings-heading">
        <div><span className="eyebrow">ADMINISTRATION</span><h1>Settings</h1><p>Control workspace behavior, annotation preferences, notifications and user experience.</p></div>
        <div className="settings-status"><CheckCircle2 size={16}/>{message || "Changes save automatically"}</div>
      </div>
      <div className="settings-layout">
        <aside className="settings-nav panel">
          {tabs.map(([label, Icon, key]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}><Icon size={17}/><span>{label}</span><ChevronDown size={14}/></button>)}
          <div className="settings-nav-note"><ShieldCheck size={16}/><span><b>Team Lead access</b><small>Workspace settings are stored locally for this deployment.</small></span></div>
        </aside>
        <section className="settings-content">
          {tab === "Workspace" && <div className="settings-card panel">
            <div className="settings-card-title"><div><h2>Workspace</h2><p>Define the active workspace identity and regional defaults.</p></div><SlidersHorizontal size={20}/></div>
            <div className="settings-grid">
              <label><span>Workspace name</span><input value={settings.workspaceName} onChange={e => onUpdate({workspaceName:e.target.value})}/></label>
              <label><span>Timezone</span><select value={settings.timezone} onChange={e => onUpdate({timezone:e.target.value})}><option value="Asia/Kolkata">Asia/Kolkata (IST)</option><option value="UTC">UTC</option><option value="America/New_York">America/New York</option><option value="Europe/London">Europe/London</option></select></label>
              <label><span>Theme</span><select value={settings.theme} onChange={e => onUpdate({theme:e.target.value})}><option>System</option><option>Light</option><option>Dark</option></select></label>
              <label><span>Default landing page</span><select value={settings.defaultPage} onChange={e => onUpdate({defaultPage:e.target.value})}><option>Dashboard</option><option>Projects</option><option>Task Planner</option><option>Annotation Workspace</option></select></label>
            </div>
            <div className="settings-section"><h3>Workspace behavior</h3><Toggle label="Compact mode" description="Use tighter spacing across operational tables and queues." value={settings.compactMode} onChange={v=>onUpdate({compactMode:v})}/><Toggle label="Keyboard shortcuts" description="Enable annotation workspace hotkeys and navigation shortcuts." value={settings.keyboardShortcuts} onChange={v=>onUpdate({keyboardShortcuts:v})}/></div>
          </div>}
          {tab === "Annotation" && <div className="settings-card panel">
            <div className="settings-card-title"><div><h2>Annotation preferences</h2><p>Set defaults for saving, submission and object visibility.</p></div><Grid3X3 size={20}/></div>
            <Toggle label="Auto-save annotations" description="Automatically save annotation changes while working." value={settings.autosave} onChange={v=>onUpdate({autosave:v})}/>
            <label className="settings-range"><span><b>Auto-save interval</b><small>Save every {settings.autosaveInterval} seconds.</small></span><input type="range" min="5" max="60" step="5" value={settings.autosaveInterval} onChange={e=>onUpdate({autosaveInterval:Number(e.target.value)})}/><strong>{settings.autosaveInterval}s</strong></label>
            <Toggle label="Confirm task submission" description="Ask for confirmation before moving a task into Submitted status." value={settings.confirmSubmit} onChange={v=>onUpdate({confirmSubmit:v})}/>
            <Toggle label="Show object IDs" description="Display object numbers in the regions panel and canvas overlays." value={settings.showObjectIds} onChange={v=>onUpdate({showObjectIds:v})}/>
            <div className="settings-info"><CheckSquare size={18}/><div><b>Recommended production setup</b><span>Keep auto-save and submission confirmation enabled for high-volume annotation workflows.</span></div></div>
          </div>}
          {tab === "Notifications" && <div className="settings-card panel">
            <div className="settings-card-title"><div><h2>Notification preferences</h2><p>Choose which operational events should generate alerts.</p></div><Bell size={20}/></div>
            <Toggle label="Task assignments" description="Notify when tasks are assigned or reassigned to a team member." value={settings.emailAssignments} onChange={v=>onUpdate({emailAssignments:v})}/>
            <Toggle label="QA decisions" description="Notify when a task is approved, rejected or changes are requested." value={settings.emailQa} onChange={v=>onUpdate({emailQa:v})}/>
            <Toggle label="Rework alerts" description="Notify when submitted work is returned for correction." value={settings.emailRework} onChange={v=>onUpdate({emailRework:v})}/>
            <div className="settings-info"><Bell size={18}/><div><b>In-app notifications remain active</b><span>These preferences control notification categories; the notification center keeps the full activity history.</span></div></div>
          </div>}
          {tab === "Preferences" && <div className="settings-card panel">
            <div className="settings-card-title"><div><h2>User preferences</h2><p>Personal interface defaults for the current operator.</p></div><Settings size={20}/></div>
            <div className="settings-profile"><div className="settings-avatar">{userInitial}</div><div><b>{userName}</b><span>{userEmail}</span></div><button className="secondary-btn" onClick={onSignOut}><LogOut size={14}/> Sign out</button></div>
            <div className="settings-shortcuts"><h3>Workspace shortcuts</h3><div><kbd>V</kbd><span>Select</span><kbd>B</kbd><span>Bounding Box</span><kbd>P</kbd><span>Polygon</span><kbd>Space</kbd><span>Pan canvas</span><kbd>Ctrl</kbd><span>+</span><kbd>Z</kbd><span>Undo</span></div></div>
            <div className="settings-danger"><div><h3>Restore default settings</h3><p>Reset only AnnotatePro settings. Projects, tasks, annotations, team and audit data are not deleted.</p></div><button className="btn secondary" onClick={onReset}><RotateCcw size={15}/> Restore defaults</button></div>
          </div>}
          {tab === "Roles" && isAdmin && <RolesAccessPanel profiles={roleProfiles} loading={rolesLoading} onLoad={onLoadRoles} onUpdateRole={onUpdateRole} currentUserEmail={userEmail}/>}
          {tab === "Integrations" && isAdmin && <IntegrationsSettingsTab apiTokens={apiTokens} onGenerateToken={onGenerateToken} onRevokeToken={onRevokeToken} onDeleteToken={onDeleteToken} webhooks={webhooks} onCreateWebhook={onCreateWebhook} onUpdateWebhook={onUpdateWebhook} onDeleteWebhook={onDeleteWebhook} onTestWebhook={onTestWebhook} projects={projects} projectGroups={projectGroups} onImportMlPredictions={onImportMlPredictions} onExportProjectJson={onExportProjectJson} />}
          {tab === "Security" && isAdmin && <SecurityPanel errorLogEntries={errorLogEntries} onRefreshErrorLog={onRefreshErrorLog} onClearErrorLog={onClearErrorLog} onExportBackup={onExportBackup} onRestoreBackup={onRestoreBackup} onSignOutAllDevices={onSignOutAllDevices} settings={settings} onUpdate={onUpdate} />}
          {tab === "Diagnostics" && isAdmin && <DiagnosticsPanel onRunHealthCheck={onRunHealthCheck} />}
          {tab === "Cloud" && isAdmin && <CloudMigrationPanel migrationStatus={migrationStatus} migrationRunning={migrationRunning} onRunMigration={onRunMigration} verifyStatus={verifyStatus} verifying={verifying} onVerify={onVerify} lastMigratedAt={lastMigratedAt} migrationDomains={migrationDomains} migrationSingletons={migrationSingletons} imageMigration={imageMigration} onMigrateImages={onMigrateImages} base64ImageCount={base64ImageCount} />}
        </section>
      </div>
    </div>
  );
}

function RolesAccessPanel({profiles, loading, onLoad, onUpdateRole, currentUserEmail}) {
  useEffect(() => { onLoad(); }, []);
  const roleOptions = ["Admin", "Team Lead", "Reviewer", "Annotator"];
  return <div className="settings-card panel roles-access-panel">
    <div className="settings-card-title"><div><h2>Roles & Access</h2><p>Who can sign in, and what they're allowed to do. Only Admins can see this page.</p></div><Users size={20}/></div>
    {loading ? <div className="dataset-empty"><RefreshCw size={28} className="mig-spin"/><h3>Loading accounts...</h3></div> :
      <div className="roles-list">
        {profiles.map(p => <div className="roles-row" key={p.id}>
          <div className="member-avatar small">{initials(p.full_name || p.id)}</div>
          <div className="roles-row-main"><b>{p.full_name || "Unnamed"}</b><span>{p.email || p.id}{p.email === currentUserEmail ? " (you)" : ""}</span></div>
          <select value={p.role} onChange={e=>onUpdateRole(p.id, e.target.value)}>
            {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>)}
        {!profiles.length && <div className="no-access">No accounts yet — invite your first user from the Team page.</div>}
      </div>
    }
    <div className="guide-note"><ShieldCheck size={14}/><span>Admin can do everything. Team Lead can manage projects, datasets, team and configuration. Reviewer can approve/reject QA. Annotator can work on tasks and annotations only.</span></div>
  </div>;
}

const WEBHOOK_EVENT_TYPES = [
  { id: "task.submitted", label: "Task Submitted" },
  { id: "qa.approved", label: "QA Approved" },
  { id: "qa.rejected", label: "QA Rejected" },
  { id: "task.escalated", label: "Task Escalated" },
  { id: "sla.breach", label: "SLA Breach" }
];

function IntegrationsSettingsTab({ apiTokens, onGenerateToken, onRevokeToken, onDeleteToken, webhooks, onCreateWebhook, onUpdateWebhook, onDeleteWebhook, onTestWebhook, projects, projectGroups, onImportMlPredictions, onExportProjectJson }) {
  const [newTokenName, setNewTokenName] = useState("");
  const [revealedToken, setRevealedToken] = useState(null);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState([]);
  const [mlProjectId, setMlProjectId] = useState(projects[0]?.id || "");
  const [mlResult, setMlResult] = useState(null);
  const [mlError, setMlError] = useState("");
  const mlFileRef = useRef(null);
  const [exportProjectId, setExportProjectId] = useState(projects[0]?.id || "");

  function toggleNewWebhookEvent(id) { setNewWebhookEvents(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]); }
  function handleMlFile(file) {
    if (!file) return;
    setMlError(""); setMlResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) throw new Error("Expected a JSON array");
        const project = projects.find(p => p.id === mlProjectId);
        const groupId = project?.groupId;
        if (!groupId) throw new Error("Select a target project first");
        const result = onImportMlPredictions(groupId, mlProjectId, parsed);
        setMlResult(result);
      } catch (err) {
        setMlError(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  return <div className="settings-card panel integrations-tab">
    <div className="settings-card-title"><div><h2>Integrations</h2><p>API access, outbound webhooks, model prediction import and data export.</p></div><Zap size={20}/></div>

    <div className="integrations-block">
      <div className="integrations-block-head"><h3>API Tokens</h3></div>
      <p className="field-hint">Tokens authenticate external tools reading your Supabase data directly. Generating a token here creates the record; enforcing it requires a one-time database function — see note below.</p>
      <form className="token-create-form" onSubmit={e => { e.preventDefault(); if (!newTokenName.trim()) return; const t = onGenerateToken(newTokenName, ["read"]); setRevealedToken(t.token); setNewTokenName(""); }}>
        <input value={newTokenName} onChange={e => setNewTokenName(e.target.value)} placeholder="Token name (e.g. Zapier integration)"/>
        <button type="submit" className="ghost-btn"><Plus size={13}/> Generate Token</button>
      </form>
      {revealedToken && <div className="token-reveal"><code>{revealedToken}</code><button className="ghost-btn" onClick={() => { navigator.clipboard?.writeText(revealedToken); }}><Copy size={12}/> Copy</button><button aria-label="Dismiss" className="chip-x" onClick={() => setRevealedToken(null)}><X size={12}/></button></div>}
      {apiTokens.length ? <div className="token-list">{apiTokens.map(t => <div className={`token-row ${t.revoked?"revoked":""}`} key={t.id}>
        <div><b>{t.name}</b><span>{t.token.slice(0,10)}••••••••• · {new Date(t.createdAt).toLocaleDateString()}</span></div>
        <span className={`token-status ${t.revoked?"revoked":"active"}`}>{t.revoked?"Revoked":"Active"}</span>
        {!t.revoked && <button className="ghost-btn" onClick={()=>onRevokeToken(t.id)}>Revoke</button>}
        <button aria-label="Delete token" className="danger-icon" onClick={()=>onDeleteToken(t.id)}><Trash2 size={14}/></button>
      </div>)}</div> : <div className="config-empty small"><Zap size={22}/><p>No API tokens yet.</p></div>}
    </div>

    <div className="integrations-block">
      <div className="integrations-block-head"><h3>Webhooks</h3></div>
      <p className="field-hint">Fires a POST request with a JSON payload to the URL you provide when a selected event happens — works with Slack Incoming Webhooks, Zapier, Make, or any endpoint that accepts JSON.</p>
      <form className="webhook-create-form" onSubmit={e => { e.preventDefault(); if (!newWebhookUrl.trim()) return; onCreateWebhook({ name: newWebhookName, url: newWebhookUrl.trim(), events: newWebhookEvents }); setNewWebhookName(""); setNewWebhookUrl(""); setNewWebhookEvents([]); }}>
        <input value={newWebhookName} onChange={e => setNewWebhookName(e.target.value)} placeholder="Webhook name"/>
        <input value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)} placeholder="https://hooks.example.com/..." className="webhook-url-input"/>
        <div className="webhook-event-toggles">{WEBHOOK_EVENT_TYPES.map(ev => <label key={ev.id} className="report-toggle-chip"><input type="checkbox" checked={newWebhookEvents.includes(ev.id)} onChange={()=>toggleNewWebhookEvent(ev.id)}/> {ev.label}</label>)}</div>
        <button type="submit" className="ghost-btn"><Plus size={13}/> Add Webhook</button>
      </form>
      {webhooks.length ? <div className="webhook-list">{webhooks.map(w => <div className="webhook-row" key={w.id}>
        <button type="button" className={`switch-btn ${w.enabled?"on":""}`} onClick={()=>onUpdateWebhook(w.id,{enabled:!w.enabled})}><i/></button>
        <div className="webhook-main"><b>{w.name}</b><span>{w.url}</span><div className="webhook-events">{(w.events||[]).map(e=><span key={e} className="webhook-event-tag">{WEBHOOK_EVENT_TYPES.find(x=>x.id===e)?.label || e}</span>)}</div></div>
        <span className={`token-status ${w.lastStatus==="Success"||w.lastStatus==="Success (test)"?"active":w.lastStatus?"revoked":""}`}>{w.lastStatus || "Not triggered yet"}</span>
        <button className="ghost-btn" onClick={()=>onTestWebhook(w.id)}>Test</button>
        <button aria-label="Delete webhook" className="danger-icon" onClick={()=>onDeleteWebhook(w.id)}><Trash2 size={14}/></button>
      </div>)}</div> : <div className="config-empty small"><Zap size={22}/><p>No webhooks configured yet.</p></div>}
    </div>

    <div className="integrations-block">
      <div className="integrations-block-head"><h3>ML Prediction Import</h3></div>
      <p className="field-hint">Import model predictions as pre-annotations on existing tasks. Expected JSON: <code>{"[{fileName, predictions:[{label, confidence, bbox:[x,y,w,h]}]}]"}</code> — bbox values are percent of image width/height, matching filenames to existing task names in the selected project.</p>
      <div className="ml-import-row">
        <select value={mlProjectId} onChange={e=>setMlProjectId(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <button className="ghost-btn" onClick={()=>mlFileRef.current?.click()}><Upload size={13}/> Choose JSON File</button>
        <input ref={mlFileRef} type="file" accept="application/json" style={{display:"none"}} onChange={e=>{ const f=e.target.files?.[0]; if(f) handleMlFile(f); e.target.value=""; }}/>
      </div>
      {mlError && <div className="form-error"><AlertCircle size={14}/> {mlError}</div>}
      {mlResult && <div className="ml-import-result"><CheckCircle2 size={14}/> {mlResult.importedAnnotations} prediction{mlResult.importedAnnotations===1?"":"s"} imported across {mlResult.matchedTasks} task{mlResult.matchedTasks===1?"":"s"}{mlResult.unmatched.length ? ` · ${mlResult.unmatched.length} filename${mlResult.unmatched.length===1?"":"s"} unmatched` : ""}</div>}
    </div>

    <div className="integrations-block">
      <div className="integrations-block-head"><h3>Data Export</h3></div>
      <p className="field-hint">CSV exports are available throughout the app (Tasks, Reports, Label Schema). For a full machine-readable snapshot of one project — tasks, annotations and QA reviews — export as JSON here.</p>
      <div className="ml-import-row">
        <select value={exportProjectId} onChange={e=>setExportProjectId(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <button className="ghost-btn" onClick={()=>onExportProjectJson(exportProjectId)}><Download size={13}/> Export Project JSON</button>
      </div>
    </div>

    <div className="integrations-block">
      <div className="integrations-block-head"><h3>Database setup</h3></div>
      <p className="field-hint">Tokens and webhooks sync to Supabase once these tables exist (safe to add anytime — everything above already works locally without them):</p>
      <pre className="sql-snippet">{`create table api_tokens (id text primary key, name text, token text, scopes jsonb, created_by text, created_at timestamptz, revoked boolean default false);
create table webhooks (id text primary key, name text, url text, events jsonb, enabled boolean default true, created_at timestamptz);`}</pre>
    </div>
  </div>;
}

const REGRESSION_TEST_PLAN = `# AnnotatePro — Regression Test Plan (Build 43)

Manual checklist to walk through before a release. Each area lists the core paths to verify by hand — this complements the automated Health Check on the Diagnostics tab, which only checks data integrity, not UI behavior.

## Projects
- [ ] Create, edit, archive, restore, duplicate, and delete a project group
- [ ] Create, edit, and delete a project within a group
- [ ] Project card progress bar matches completed/total images
- [ ] Deleting a project with tasks shows the cascade-delete warning and actually removes those tasks

## Datasets
- [ ] Create a dataset, add images, snapshot a version
- [ ] Archive/restore a dataset
- [ ] Deleting a dataset with images is blocked with a clear message
- [ ] Clearing a dataset removes its tasks, annotations, and QA reviews (not just the tasks)

## Import
- [ ] Import images via drag-and-drop and file picker
- [ ] Advanced Import: COCO JSON with images zip
- [ ] Advanced Import: YOLO format with images zip
- [ ] Class-to-label mapping screen shows all detected classes and lets you map or create labels
- [ ] Import progress and final summary (imported / skipped / errors) are accurate

## Tasks
- [ ] Task Planner: filter, sort, bulk-assign, bulk priority/queue changes
- [ ] Assigning a task moves it from Pending to In Progress
- [ ] Task deadlines (SLA-derived and custom) display correctly
- [ ] Removing a single task cleans up its annotations and QA review

## Annotation
- [ ] Bounding box, polygon, polyline, keypoint, brush/eraser tools all draw and save correctly
- [ ] Undo/redo, copy/paste, multi-select, lock/hide all work
- [ ] Label picker shows AI-suggested badges for frequently-used labels
- [ ] Save and Submit transition task status correctly
- [ ] AI-assisted: pending model predictions show dashed outline + confidence, Accept/Reject and Accept All/Reject All work
- [ ] Editing an accepted model prediction flags it as "corrected"

## Video
- [ ] **Not implemented in this build.** No video upload, playback, or frame-by-frame annotation exists yet — remove this row once it's built, or flag it as a known gap if this checklist is used before then.

## QA
- [ ] Review mode shows Accept/Reject instead of Skip/Submit
- [ ] QA Scorecard: weighted criteria sliders compute the overall score correctly
- [ ] Error tagging: log an error, confirm it appears in the QA & Quality error breakdown
- [ ] Sampling: with sampling rate < 100%, confirm some submissions auto-approve and log a sampling-skip audit entry
- [ ] Calibration: add a gold-score reference, confirm drift is computed after review

## Team
- [ ] Add, edit, deactivate, and delete a team member
- [ ] Deleting a member clears their assignee AND reviewer references on tasks (not just assignee)
- [ ] Role changes take effect (Admin-only tabs disappear for non-admins)
- [ ] Duplicate email addresses are flagged (Diagnostics → Health Check)

## Workload
- [ ] Workload page reflects real assigned/capacity numbers
- [ ] Auto Balance assigns tasks to the least-loaded eligible member
- [ ] Zero-capacity active members are flagged (Diagnostics → Health Check)

## Notifications
- [ ] Notifications generate on assignment, QA decision, rework, escalation
- [ ] Mark-as-read, mark-all-read, delete, and clear-all all work
- [ ] Notification filters (type) work correctly

## Audit
- [ ] Every major action (create/edit/delete/assign/review/escalate) produces an audit entry
- [ ] Audit Trail search and filters work
- [ ] Audit log caps at 2000 entries without crashing (Diagnostics → Health Check)

## Export
- [ ] CSV export (Tasks, Reports) downloads and opens correctly
- [ ] Label schema JSON export/import round-trips without data loss
- [ ] Full project JSON export includes tasks, annotations, and QA reviews
- [ ] Full workspace backup export/restore (Settings → Security) round-trips correctly

## Authentication
- [ ] Sign in, sign out, password reset all work
- [ ] Session survives a page refresh
- [ ] Idle timeout signs the user out after the configured period (Settings → Security)
- [ ] "Sign out of all devices" invalidates other active sessions

## Permissions
- [ ] Non-admin users cannot see Roles & Access, Integrations, Security, Diagnostics, or Cloud Migration tabs
- [ ] Non-admin users cannot edit projects if role is below Team Lead
- [ ] Verify RLS policies actually block a non-authenticated request at the database level (not just the UI) — see Settings → Security

## Cloud Storage
- [ ] New image uploads go to Supabase Storage, not inline base64
- [ ] Image migration tool converts remaining base64 images
- [ ] Cross-device sync: an edit on one device appears on another after hydration/realtime (see Settings → Cloud Migration)
`;

function DiagnosticsPanel({ onRunHealthCheck }) {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  function handleRun() {
    setRunning(true);
    setTimeout(() => { setResults(onRunHealthCheck()); setRunning(false); }, 150);
  }
  function downloadTestPlan() {
    const blob = new Blob([REGRESSION_TEST_PLAN], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "annotatepro-regression-test-plan.md"; a.click();
  }

  const failCount = results?.filter(r => r.status === "fail").length || 0;
  const warnCount = results?.filter(r => r.status === "warn").length || 0;
  const passCount = results?.filter(r => r.status === "pass").length || 0;
  const grouped = results ? results.reduce((acc, r) => { (acc[r.area] = acc[r.area] || []).push(r); return acc; }, {}) : {};

  return <div className="settings-card panel diagnostics-panel">
    <div className="settings-card-title"><div><h2>Testing & Regression</h2><p>An automated data-integrity check across live app state, plus a manual test plan for everything a script can't verify (UI behavior, drawing tools, imports).</p></div><CheckSquare size={20}/></div>

    <div className="integrations-block">
      <div className="integrations-block-head"><h3>Health Check</h3></div>
      <p className="field-hint">Scans current projects, tasks, annotations, QA reviews, team, and settings for broken references and inconsistent data — the kind of thing that causes confusing counts elsewhere in the app.</p>
      <button className="primary-btn" onClick={handleRun} disabled={running}>{running ? <RefreshCw size={15} className="mig-spin"/> : <CheckSquare size={15}/>} {running ? "Running..." : "Run Health Check"}</button>
      {results && <div className="health-check-results">
        <div className="health-check-summary"><span className="hc-pass">{passCount} passing</span>{warnCount>0 && <span className="hc-warn">{warnCount} warning{warnCount===1?"":"s"}</span>}{failCount>0 && <span className="hc-fail">{failCount} failing</span>}</div>
        {Object.entries(grouped).map(([area, items]) => <div className="health-check-group" key={area}>
          <span className="section-label">{area.toUpperCase()}</span>
          {items.map(r => <div className={`health-check-row hc-${r.status}`} key={r.id}>
            {r.status === "pass" ? <CheckCircle2 size={14}/> : r.status === "warn" ? <AlertCircle size={14}/> : <X size={14}/>}
            <div><b>{r.label}</b><span>{r.detail}</span></div>
          </div>)}
        </div>)}
      </div>}
    </div>

    <div className="integrations-block">
      <div className="integrations-block-head"><h3>Manual Regression Test Plan</h3></div>
      <p className="field-hint">Data integrity is only part of the picture — drawing tools, imports, and auth flows need a human to click through them. Download a checklist covering all 15 areas.</p>
      <button className="ghost-btn" onClick={downloadTestPlan}><Download size={13}/> Download Test Plan (.md)</button>
      <p className="field-hint" style={{marginTop:10}}><b>Known gap:</b> the checklist includes a "Video" section flagged as not implemented — there's no video upload, playback, or frame annotation in the app yet.</p>
    </div>

    <div className="integrations-block">
      <div className="integrations-block-head"><h3>Performance & Scalability (Build 44)</h3></div>
      <p className="field-hint">What shipped in code: lazy-loaded thumbnails throughout, pagination on the Import image list, Audit Trail, and Notifications (so those stay fast regardless of size), a precomputed label lookup + <code>React.memo</code> on the annotation canvas shapes (previously doing a linear search per shape on every render), a fixed O(n²) row-lookup in the dataset image table, a debounced command-palette search, and automatic image downscaling (max 1920px, quality 0.85) before new uploads reach Supabase Storage — proportional only, so percent-based annotation coordinates stay valid.</p>
      <p className="field-hint">What needs your Supabase project directly — indexes speed up exactly the columns this app filters/joins on constantly:</p>
      <pre className="sql-snippet">{`create index if not exists idx_tasks_project_id on tasks(project_id);
create index if not exists idx_tasks_dataset_id on tasks(dataset_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_assignee_id on tasks(assignee_id);
create index if not exists idx_tasks_reviewer_id on tasks(reviewer_id);
create index if not exists idx_projects_group_id on projects(group_id);
create index if not exists idx_datasets_project_id on datasets(project_id);
create index if not exists idx_qa_reviews_task_id on qa_reviews(task_id);
create index if not exists idx_audit_events_task_id on audit_events(task_id);
create index if not exists idx_audit_events_project_id on audit_events(project_id);
create index if not exists idx_notifications_task_id on notifications(task_id);`}</pre>
      <p className="field-hint"><b>Known ceiling, not fixed here:</b> the Build 30.1 cloud hydration does <code>select("*")</code> with no row limit — fine up to a few thousand tasks, but a workspace with tens of thousands would load everything into memory on every session start. Fixing that properly means paginating the hydration query and reworking every page that currently assumes <code>tasks</code> is the complete in-memory array (Task Planner, Workload, Analytics, Reports all filter/aggregate over the full array). That's real architectural work, not a safe drop-in change — worth its own build if your task counts are heading that direction.</p>
    </div>
  </div>;
}

function SecurityPanel({ errorLogEntries, onRefreshErrorLog, onClearErrorLog, onExportBackup, onRestoreBackup, onSignOutAllDevices, settings, onUpdate }) {
  const restoreRef = useRef(null);
  const [restoreMessage, setRestoreMessage] = useState(null);

  return <div className="settings-card panel security-panel">
    <div className="settings-card-title"><div><h2>Security & Production Hardening</h2><p>Session security, error monitoring, backups, and a plain-language audit of what's protected client-side versus what needs verifying in Supabase.</p></div><ShieldCheck size={20}/></div>

    <div className="integrations-block">
      <div className="integrations-block-head"><h3>Session Security</h3></div>
      <label className="sampling-slider-label"><span>Auto sign-out after {settings.sessionIdleMinutes || 0} minute{settings.sessionIdleMinutes===1?"":"s"} of inactivity (0 = disabled)</span><input type="range" min="0" max="120" step="5" value={settings.sessionIdleMinutes ?? 30} onChange={e=>onUpdate({sessionIdleMinutes:Number(e.target.value)})}/></label>
      <p className="field-hint">Checked every 30 seconds. When it fires, the current session is signed out and the person needs to log back in.</p>
      <button className="ghost-btn" onClick={onSignOutAllDevices}><LogOut size={13}/> Sign out of all devices</button>
      <p className="field-hint">Invalidates every active session for this account everywhere it's logged in — use if a device may have been compromised.</p>
    </div>

    <div className="integrations-block">
      <div className="integrations-block-head"><h3>Error Monitoring</h3></div>
      <p className="field-hint">A global error boundary now catches render crashes (showing a recovery screen instead of a blank page), and uncaught errors/rejections are captured automatically — even if the app itself has crashed, since capture writes straight to local storage rather than relying on React state.</p>
      <div className="ml-import-row"><button className="ghost-btn" onClick={onRefreshErrorLog}><RefreshCw size={13}/> Refresh</button><button className="danger-icon-btn" onClick={onClearErrorLog}><Trash2 size={13}/> Clear log</button></div>
      {errorLogEntries.length ? <div className="error-log-list">{errorLogEntries.slice(0,15).map(e => <div className="error-log-row" key={e.id}>
        <div><b>{e.message}</b><span>{e.context} · {new Date(e.timestamp).toLocaleString()}</span></div>
        <span className={`token-status ${e.synced?"active":""}`}>{e.synced?"Synced":"Local only"}</span>
      </div>)}</div> : <div className="config-empty small"><CheckCircle2 size={22}/><p>No errors captured. That's a good sign.</p></div>}
    </div>

    <div className="integrations-block">
      <div className="integrations-block-head"><h3>Backup & Recovery</h3></div>
      <p className="field-hint">Export a full JSON snapshot of the entire workspace (projects, tasks, annotations, QA reviews, team, configs). Restoring replaces local data and prompts you to re-run Migration to push it to the cloud.</p>
      <div className="ml-import-row">
        <button className="ghost-btn" onClick={onExportBackup}><Download size={13}/> Export Full Backup</button>
        <button className="ghost-btn" onClick={()=>restoreRef.current?.click()}><Upload size={13}/> Restore from Backup</button>
        <input ref={restoreRef} type="file" accept="application/json" style={{display:"none"}} onChange={e=>{ const f=e.target.files?.[0]; if(f) onRestoreBackup(f, setRestoreMessage); e.target.value=""; }}/>
      </div>
      {restoreMessage && <div className={restoreMessage.ok ? "ml-import-result" : "form-error"}>{restoreMessage.ok ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>} {restoreMessage.message}</div>}
      <p className="field-hint">This covers app-level data loss. True disaster recovery (point-in-time restore, daily snapshots) is a Supabase project setting — see below.</p>
    </div>

    <div className="integrations-block">
      <div className="integrations-block-head"><h3>Permission Audit</h3></div>
      <p className="field-hint">Roles enforced in this UI: <b>Admin</b> (Roles & Access, Integrations, Security, Cloud Migration tabs, and account-level actions on Team members) and <b>Team Lead</b> (project/config editing, alongside Admin). Both gates are checked in two places — hidden from navigation and re-checked at render — but this is still a UX convenience, not a security boundary.</p>
      <div className="form-error" style={{background:"#fff7ed",borderColor:"#fed7aa",color:"#c2410c"}}><AlertCircle size={14}/> Client-side role checks can be bypassed by anyone calling Supabase directly (e.g. from the browser console). The only real boundary is Row Level Security on each table — verify every table below actually has RLS enabled and policies matching these roles, not just that the UI hides the button.</div>
    </div>

    <div className="integrations-block">
      <div className="integrations-block-head"><h3>Row Level Security — verify these exist</h3></div>
      <p className="field-hint">Run this in the Supabase SQL Editor to see which of your tables don't have RLS enabled yet — anything returned here is currently readable/writable by any authenticated (or even anonymous, depending on your anon key policy) request:</p>
      <pre className="sql-snippet">{`select tablename from pg_tables
where schemaname = 'public' and rowsecurity = false;`}</pre>
      <p className="field-hint">A reasonable starting policy per table — authenticated users can read/write, nothing else can:</p>
      <pre className="sql-snippet">{`alter table tasks enable row level security;
create policy "authenticated read/write" on tasks
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
-- repeat for: project_groups, projects, datasets, team_members,
-- qa_reviews, notifications, audit_events, api_tokens, webhooks, error_logs`}</pre>
    </div>

    <div className="integrations-block">
      <div className="integrations-block-head"><h3>Secure File Access</h3></div>
      <p className="field-hint">Task images currently use <code>getPublicUrl()</code> against the <code>task-images</code> storage bucket — meaning if that bucket is set to public, anyone with an image URL can view it without being logged in. This wasn't changed in this build because switching to signed URLs safely requires storing the storage <i>path</i> instead of a resolved URL and re-signing it on every view (signed URLs expire) — a data-model change worth doing deliberately rather than as part of a hardening pass that could break every existing image. Two options, in order of effort:</p>
      <pre className="sql-snippet">{`-- Quick mitigation: require auth to read the bucket, keep public URLs disabled
update storage.buckets set public = false where id = 'task-images';
create policy "authenticated read" on storage.objects
  for select using (bucket_id = 'task-images' and auth.role() = 'authenticated');`}</pre>
      <p className="field-hint">Note: making the bucket private will break every image already stored with a public URL until the app is updated to resolve signed URLs on demand — plan this as its own build rather than flipping it here.</p>
    </div>

    <div className="integrations-block">
      <div className="integrations-block-head"><h3>Rate Limiting</h3></div>
      <p className="field-hint">Outbound webhooks are now throttled client-side (max ~1 delivery per webhook every 2 seconds) so a bulk action — like approving 50 tasks at once — can't flood an external endpoint. That's a UX/cost safeguard, not real protection: a client-side limit can't stop someone from calling your Supabase API directly. Real rate limiting has to sit in front of Supabase — either its built-in Auth rate limits (Dashboard → Authentication → Rate Limits) or a Postgres/Edge Function fronting writes for high-volume tables.</p>
    </div>
  </div>;
}

function CloudMigrationPanel({migrationStatus,migrationRunning,onRunMigration,verifyStatus,verifying,onVerify,lastMigratedAt,migrationDomains,migrationSingletons,imageMigration,onMigrateImages,base64ImageCount}) {
  const domains = migrationDomains();
  const singletons = migrationSingletons();
  const all = [...domains, ...singletons];
  const localCounts = Object.fromEntries(domains.map(d => [d.key, d.rows().length]));
  const hasRun = Object.keys(migrationStatus).length > 0;
  const stateIcon = (state) => state === "done" ? <CheckCircle2 size={15} className="mig-ok"/> : state === "error" ? <AlertCircle size={15} className="mig-err"/> : state === "running" ? <RefreshCw size={15} className="mig-spin"/> : <Clock3 size={15} className="mig-pending"/>;
  return <div className="settings-card panel cloud-migration-panel">
    <div className="settings-card-title"><div><h2>Cloud Migration</h2><p>Copy your browser data into Supabase. Your local data is never deleted by this — it stays as an automatic backup.</p></div><Database size={20}/></div>

    <div className="cloud-detected-grid">
      {domains.map(d => <div key={d.key} className="cloud-detected-card"><b>{localCounts[d.key]}</b><span>{d.label}</span></div>)}
    </div>

    <div className="cloud-migration-actions">
      <button className="primary-btn" disabled={migrationRunning} onClick={onRunMigration}>
        {migrationRunning ? <RefreshCw size={16} className="mig-spin"/> : <Upload size={16}/>}
        {migrationRunning ? "Migrating..." : "Migrate to Cloud"}
      </button>
      <button className="secondary-btn" disabled={verifying || !hasRun} onClick={onVerify}><ShieldCheck size={15}/> {verifying ? "Verifying..." : "Verify migration"}</button>
      {lastMigratedAt && <span className="cloud-last-run">Last migrated {new Date(lastMigratedAt).toLocaleString()}</span>}
    </div>

    {hasRun && <div className="cloud-status-list">
      {all.map(d => {
        const s = migrationStatus[d.key] || { state: "pending" };
        return <div key={d.key} className={`cloud-status-row state-${s.state}`}>
          {stateIcon(s.state)}
          <span className="cloud-status-label">{d.label}</span>
          <span className="cloud-status-detail">{s.state === "done" ? `${s.count} row${s.count===1?"":"s"} synced` : s.state === "error" ? s.error : s.state === "running" ? "Syncing..." : "Waiting"}</span>
        </div>;
      })}
    </div>}

    {Object.keys(verifyStatus).length > 0 && <div className="cloud-verify-list">
      <h3>Verification</h3>
      {domains.map(d => {
        const v = verifyStatus[d.key];
        if (!v) return null;
        return <div key={d.key} className={`cloud-verify-row ${v.match ? "ok" : "mismatch"}`}>
          <span>{d.label}</span>
          <span>{v.error ? v.error : `Local ${v.local} · Cloud ${v.cloud}`}</span>
          {v.match ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>}
        </div>;
      })}
    </div>}

    <div className="cloud-storage-section">
      <h3>Cloud Storage — Images</h3>
      <p>New uploads (Build 23 onward) already go straight to Supabase Storage instead of being embedded as base64. This converts any images imported before that change.</p>
      {base64ImageCount > 0 ? <>
        <div className="cloud-migration-actions">
          <button className="secondary-btn" disabled={imageMigration.running} onClick={onMigrateImages}>
            {imageMigration.running ? <RefreshCw size={15} className="mig-spin"/> : <Upload size={15}/>}
            {imageMigration.running ? `Uploading ${imageMigration.done}/${imageMigration.total}...` : `Migrate ${base64ImageCount} local image${base64ImageCount===1?"":"s"} to Storage`}
          </button>
        </div>
        {imageMigration.complete && !imageMigration.running && <div className="cloud-status-row state-done"><CheckCircle2 size={15} className="mig-ok"/><span className="cloud-status-label">Image migration</span><span className="cloud-status-detail">{imageMigration.done} uploaded{imageMigration.failed ? `, ${imageMigration.failed} failed` : ""}</span></div>}
      </> : <div className="cloud-status-row state-done"><CheckCircle2 size={15} className="mig-ok"/><span className="cloud-status-label">All images already in Cloud Storage</span></div>}
    </div>

    <div className="guide-note"><ShieldCheck size={14}/><span>This uses upsert, so re-running the migration is always safe — existing cloud rows just get refreshed with your latest local data instead of duplicated.</span></div>
  </div>;
}

function AppWithErrorBoundary() {
  return <ErrorBoundary><App/></ErrorBoundary>;
}

export default AppWithErrorBoundary;



function AuditTrailPage({events,projects,tasks,teamMembers,search,setSearch,filter,setFilter,project,setProject,user,setUser,task,setTask,date,setDate,selectedTask,setSelectedTask,onClear,onSeed}) {
  const actions=["All Actions",...Array.from(new Set(events.map(e=>e.action))).sort()];
  const users=["All Users",...Array.from(new Set(events.map(e=>e.actor).filter(Boolean))).sort()];
  const projectName=id=>projects.find(p=>p.id===id)?.name||"General";
  const taskName=id=>tasks.find(t=>t.id===id)?.name||id||"—";
  const dayStart=days=>Date.now()-days*86400000;
  const visible=events.filter(e=>{
    const hay=`${e.action} ${e.actor} ${e.details} ${projectName(e.projectId)} ${taskName(e.taskId)}`.toLowerCase();
    const dateOk=date==="All Time"||(date==="Today"&&new Date(e.timestamp)>=new Date(new Date().setHours(0,0,0,0)))||(date==="7 Days"&&new Date(e.timestamp).getTime()>=dayStart(7))||(date==="30 Days"&&new Date(e.timestamp).getTime()>=dayStart(30));
    return (!search||hay.includes(search.toLowerCase()))&&(filter==="All Actions"||e.action===filter)&&(project==="All Projects"||e.projectId===project)&&(user==="All Users"||e.actor===user)&&(!task||taskName(e.taskId).toLowerCase().includes(task.toLowerCase())||(e.taskId||"").toLowerCase().includes(task.toLowerCase()))&&dateOk;
  }).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search, filter, project, user, date, task]);
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageItems = visible.slice((clampedPage-1)*PAGE_SIZE, clampedPage*PAGE_SIZE);
  const selected=selectedTask?visible.filter(e=>e.taskId===selectedTask):[];
  const actionIcon=a=>a.includes("QA")||a.includes("Approved")?ClipboardCheck:a.includes("Assign")?Users:a.includes("Export")?Download:a.includes("Project")?FolderKanban:a.includes("Saved")?Save:a.includes("Submitted")?CheckCircle2:Activity;
  const downloadAudit=()=>{ const rows=[["Timestamp","Action","Actor","Role","Project","Task","Details"],...visible.map(e=>[e.timestamp,e.action,e.actor,e.actorRole,projectName(e.projectId),taskName(e.taskId),e.details])]; const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n"); const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`annotatepro-audit-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url); };
  const taskGroups=Array.from(new Set(visible.map(e=>e.taskId).filter(Boolean))).slice(0,12);
  return <div className="page audit-page">
    <div className="page-head"><div><span className="eyebrow">GOVERNANCE & TRACEABILITY</span><h1>Audit Trail</h1><p>Track who changed what, when it happened, and how each task moved through production.</p></div><div className="page-head-actions"><button className="secondary-btn" onClick={downloadAudit}><Download size={15}/> Export CSV</button><button className="danger-btn" onClick={onClear}><Trash2 size={15}/> Clear Log</button></div></div>
    <div className="stats-grid audit-stats"><StatCard icon={Activity} label="Events" value={events.length} meta="Recorded actions"/><StatCard icon={Users} label="Contributors" value={new Set(events.map(e=>e.actor)).size} meta="Unique actors"/><StatCard icon={FileText} label="Tasks Tracked" value={new Set(events.map(e=>e.taskId).filter(Boolean)).size} meta="With history"/><StatCard icon={ShieldCheck} label="QA Events" value={events.filter(e=>e.action.includes("QA")||e.action.includes("Approved")||e.action.includes("Rejected")).length} meta="Review decisions"/></div>
    <section className="panel audit-toolbar"><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search task, user, project or action..."/></div><select value={filter} onChange={e=>setFilter(e.target.value)}>{actions.map(a=><option key={a}>{a}</option>)}</select><select value={project} onChange={e=>setProject(e.target.value)}><option>All Projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><select value={user} onChange={e=>setUser(e.target.value)}>{users.map(u=><option key={u}>{u}</option>)}</select><select value={date} onChange={e=>setDate(e.target.value)}><option>All Time</option><option>Today</option><option>7 Days</option><option>30 Days</option></select><input value={task} onChange={e=>setTask(e.target.value)} placeholder="Task ID / name"/></section>
    <div className="audit-grid"><section className="panel audit-list"><div className="section-header"><div><h2>Activity Timeline</h2><p>{visible.length} events match the current filters{totalPages>1?` · page ${clampedPage} of ${totalPages}`:""}.</p></div></div>{pageItems.length?pageItems.map(e=>{const Icon=actionIcon(e.action);return <button className={`audit-row ${selectedTask===e.taskId&&e.taskId?"active":""}`} key={e.id} onClick={()=>e.taskId&&setSelectedTask(e.taskId)}><span className="audit-icon"><Icon size={16}/></span><span className="audit-body"><strong>{e.action}</strong><em>{e.details}</em><small>{e.actor} · {e.actorRole} · {projectName(e.projectId)}{e.taskId?` · ${taskName(e.taskId)}`:""}</small></span><time>{new Date(e.timestamp).toLocaleString()}</time></button>}) : <div className="empty-state"><Activity size={30}/><h3>No audit events</h3><p>Try changing the filters or generate a fresh activity snapshot.</p><button className="secondary-btn" onClick={onSeed}><RefreshCw size={14}/> Rebuild baseline</button></div>}
      {totalPages>1 && <div className="pagination-bar"><button disabled={clampedPage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}><ChevronDown size={14} style={{transform:"rotate(90deg)"}}/> Prev</button><span>Page {clampedPage} of {totalPages}</span><button disabled={clampedPage>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next <ChevronDown size={14} style={{transform:"rotate(-90deg)"}}/></button></div>}
      </section>
      <aside className="audit-side"><section className="panel"><div className="section-header"><div><h2>Task History</h2><p>{selectedTask?taskName(selectedTask):"Select a task from the timeline."}</p></div></div>{selectedTask?<div className="task-history">{selected.map(e=>{const Icon=actionIcon(e.action);return <div className="history-item" key={e.id}><span><Icon size={14}/></span><div><b>{e.action}</b><small>{e.details}</small><em>{e.actor} · {new Date(e.timestamp).toLocaleString()}</em></div></div>})}</div>:<div className="task-history-empty"><HistoryIcon/><span>Click a task event to inspect its complete history.</span></div>}</section><section className="panel"><div className="section-header"><div><h2>Tracked Tasks</h2><p>Quick task history access.</p></div></div><div className="audit-task-chips">{taskGroups.length?taskGroups.map(id=><button key={id} className={selectedTask===id?"active":""} onClick={()=>setSelectedTask(id)}>{taskName(id)}</button>):<span>No tasks in view</span>}</div></section></aside></div>
  </div>;
}
function HistoryIcon(){return <Clock3 size={30}/>}

function NotificationsPage({notifications,setNotifications,filter,setFilter,search,setSearch,tasks,projects,teamMembers}) {
  const projectName = id => projects.find(p=>p.id===id)?.name || "General";
  const memberName = id => teamMembers.find(m=>m.id===id)?.name || "System";
  const typeOptions = ["All","Assignment","QA","Rework","Target","Project","System"];
  const ensureSeed = () => {
    if (notifications.length) return;
    const now=Date.now();
    const seed=[
      {id:`n-${now}-1`,type:"Assignment",title:"Task assignment updated",message:"New annotation tasks are ready for the team.",projectId:tasks[0]?.projectId||projects[0]?.id,taskId:tasks[0]?.id,createdAt:new Date(now-8*60000).toISOString(),read:false},
      {id:`n-${now}-2`,type:"QA",title:"QA review pending",message:"Submitted work is waiting for reviewer attention.",projectId:tasks[2]?.projectId||projects[0]?.id,taskId:tasks[2]?.id,createdAt:new Date(now-32*60000).toISOString(),read:false},
      {id:`n-${now}-3`,type:"Target",title:"Daily target reminder",message:"Review team capacity and remaining targets for today.",createdAt:new Date(now-90*60000).toISOString(),read:true}
    ]; setNotifications(seed);
  };
  useEffect(ensureSeed,[]);
  const visible=notifications.filter(n=>(filter==="All"||n.type===filter)&&(`${n.title} ${n.message} ${projectName(n.projectId)}`.toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const NOTIF_PAGE_SIZE = 40;
  const [notifPage, setNotifPage] = useState(1);
  useEffect(() => { setNotifPage(1); }, [filter, search]);
  const notifTotalPages = Math.max(1, Math.ceil(visible.length / NOTIF_PAGE_SIZE));
  const clampedNotifPage = Math.min(notifPage, notifTotalPages);
  const pagedNotifications = visible.slice((clampedNotifPage-1)*NOTIF_PAGE_SIZE, clampedNotifPage*NOTIF_PAGE_SIZE);
  const unread=notifications.filter(n=>!n.read).length;
  const markRead=id=>setNotifications(prev=>prev.map(n=>n.id===id?{...n,read:true}:n));
  const markAll=()=>setNotifications(prev=>prev.map(n=>({...n,read:true})));
  const remove=id=>setNotifications(prev=>prev.filter(n=>n.id!==id));
  const clearAll=()=>setNotifications([]);
  const iconFor=t=>t==="QA"?ClipboardCheck:t==="Rework"?RotateCcw:t==="Assignment"?Users:t==="Target"?Target:t==="Project"?FolderKanban:Bell;
  return <div className="page notifications-page">
    <div className="page-head"><div><span className="eyebrow">NOTIFICATION CENTER</span><h1>Notifications & Alerts</h1><p>Stay on top of assignments, QA, rework, targets and project activity.</p></div><div className="page-head-actions"><button className="secondary-btn" onClick={markAll}><Check size={15}/> Mark all read</button><button className="danger-btn" onClick={clearAll}><Trash2 size={15}/> Clear all</button></div></div>
    <div className="stats-grid notifications-stats"><StatCard icon={Bell} label="Unread" value={unread} meta="Requires attention"/><StatCard icon={AlertCircle} label="Alerts" value={notifications.filter(n=>n.type==="Rework"||n.type==="QA").length} meta="QA & rework"/><StatCard icon={Users} label="Assignments" value={notifications.filter(n=>n.type==="Assignment").length} meta="Team activity"/><StatCard icon={Target} label="Targets" value={notifications.filter(n=>n.type==="Target").length} meta="Capacity reminders"/></div>
    <div className="panel notification-toolbar"><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search notifications..."/></div><div className="notification-filters">{typeOptions.map(t=><button key={t} className={filter===t?"active":""} onClick={()=>setFilter(t)}>{t}</button>)}</div></div>
    <div className="notification-list panel">{visible.length===0?<div className="empty-state"><Bell size={30}/><h3>No notifications</h3><p>Your notification center is clear.</p></div>:pagedNotifications.map(n=>{const Icon=iconFor(n.type);return <div key={n.id} className={`notification-row ${n.read?"read":"unread"}`}><div className="notification-icon"><Icon size={18}/></div><div className="notification-main"><div className="notification-title"><strong>{n.title}</strong>{!n.read&&<span className="unread-dot"/>}</div><p>{n.message}</p><div className="notification-meta"><span>{n.type}</span>{n.projectId&&<span>{projectName(n.projectId)}</span>}{n.taskId&&<span>{n.taskId}</span>}<span>{new Date(n.createdAt).toLocaleString()}</span></div></div><div className="notification-actions">{!n.read&&<button className="secondary-btn small-btn" onClick={()=>markRead(n.id)}><Check size={14}/> Read</button>}<button className="icon-btn" onClick={()=>remove(n.id)} title="Delete notification"><Trash2 size={16}/></button></div></div>})}</div>
    {visible.length > NOTIF_PAGE_SIZE && <div className="pagination-bar"><button disabled={clampedNotifPage<=1} onClick={()=>setNotifPage(p=>Math.max(1,p-1))}><ChevronDown size={14} style={{transform:"rotate(90deg)"}}/> Prev</button><span>Page {clampedNotifPage} of {notifTotalPages} · {visible.length} notifications</span><button disabled={clampedNotifPage>=notifTotalPages} onClick={()=>setNotifPage(p=>Math.min(notifTotalPages,p+1))}>Next <ChevronDown size={14} style={{transform:"rotate(-90deg)"}}/></button></div>}
  </div>;
}
