import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertCircle, BarChart3, Bell, Calendar, CheckCircle2, ChevronDown,
  ClipboardCheck, Clock3, Copy, Database, Download, Edit3, Eye, FileText,
  FolderKanban, Grid3X3, Image as ImageIcon, LayoutDashboard, ListFilter, Menu,
  Minus, MoreHorizontal, Move, MousePointer2, PanelRight, Pause, Play, Plus,
  Redo2, RotateCcw, Save, Search, Settings, ShieldCheck, Square, Target, Trash2,
  TrendingUp, Undo2, Upload, Users, X, ZoomIn, ZoomOut, FileArchive, FileJson, FileSpreadsheet, Check, Filter, RefreshCw, UserPlus, BriefcaseBusiness, Zap
} from "lucide-react";
import "./App.css";

const PROJECTS_KEY = "annotatepro_projects_v2";
const TASKS_KEY = "annotatepro_tasks_v1";
const DATASET_META_KEY = "annotatepro_dataset_meta_v1";

const labelPalette = [
  "#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ea580c",
  "#0891b2", "#ca8a04", "#db2777", "#4f46e5", "#65a30d"
];

const sampleProjects = [
  {
    id: "p1", name: "Road Object Detection", client: "Mobility AI",
    annotationType: "Bounding Box", totalImages: 120, completedImages: 46,
    team: "Road Vision Team", status: "In Progress", startDate: "2026-09-01",
    dueDate: "2026-09-25", description: "Vehicle and road-object detection dataset."
  },
  {
    id: "p2", name: "Pavement Segmentation", client: "Urban Mapping",
    annotationType: "Segmentation", totalImages: 80, completedImages: 29,
    team: "Segmentation Team", status: "In Progress", startDate: "2026-08-25",
    dueDate: "2026-09-20", description: "Road and pavement segmentation."
  },
  {
    id: "p3", name: "Street Infrastructure", client: "City Intelligence",
    annotationType: "Polygon", totalImages: 150, completedImages: 64,
    team: "Infrastructure Team", status: "In Progress", startDate: "2026-08-20",
    dueDate: "2026-10-05", description: "Street infrastructure object annotation."
  },
  {
    id: "p4", name: "Traffic Sign Classification", client: "DriveSafe AI",
    annotationType: "Classification", totalImages: 50, completedImages: 50,
    team: "Classification Team", status: "Completed", startDate: "2026-08-01",
    dueDate: "2026-09-10", description: "Traffic sign classification."
  }
];

const sampleTasks = [
  { id: "task-001", projectId: "p1", name: "road_scene_001.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=85" },
  { id: "task-002", projectId: "p1", name: "road_scene_002.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=1600&q=85" },
  { id: "task-003", projectId: "p2", name: "road_scene_003.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1600&q=85" },
  { id: "task-004", projectId: "p2", name: "street_scene_004.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1600&q=85" },
  { id: "task-005", projectId: "p3", name: "street_scene_005.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=85" },
  { id: "task-006", projectId: "p4", name: "traffic_scene_006.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1600&q=85" }
];

const defaultLabels = [
  { id: "car", name: "Car", color: "#2563eb", type: "Rectangle" },
  { id: "person", name: "Person", color: "#16a34a", type: "Rectangle" },
  { id: "truck", name: "Truck", color: "#dc2626", type: "Rectangle" },
  { id: "bus", name: "Bus", color: "#9333ea", type: "Rectangle" },
  { id: "traffic-sign", name: "Traffic Sign", color: "#ea580c", type: "Rectangle" }
];

const emptyProject = {
  name: "", client: "", annotationType: "Bounding Box", totalImages: 100,
  completedImages: 0, team: "Annotation Team", status: "Pending",
  startDate: "", dueDate: "", description: ""
};

function progressOf(p) {
  const total = Number(p.totalImages) || 0;
  const completed = Math.min(total, Math.max(0, Number(p.completedImages) || 0));
  return total ? Math.round((completed / total) * 100) : 0;
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [projects, setProjects] = useState(() => readStorage(PROJECTS_KEY, sampleProjects));
  const [projectSearch, setProjectSearch] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState("All");
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [projectDetails, setProjectDetails] = useState(null);

  const [tasks, setTasks] = useState(() => readStorage(TASKS_KEY, sampleTasks));
  const [datasetMeta, setDatasetMeta] = useState(() => readStorage(DATASET_META_KEY, { name: "Production Dataset", description: "AnnotatePro image dataset", created: new Date().toISOString() }));
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
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drawing, setDrawing] = useState(null);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [workspaceProject, setWorkspaceProject] = useState(projects[0]?.id || "p1");
  const [taskFilter, setTaskFilter] = useState("All");
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const [qaReviews, setQaReviews] = useState(() => readStorage("annotatepro_qa_reviews_v1", {}));
  const [qaSelectedTaskId, setQaSelectedTaskId] = useState(null);
  const [qaFilter, setQaFilter] = useState("All");
  const [qaSearch, setQaSearch] = useState("");
  const [qaScore, setQaScore] = useState(96);
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
  const [teamSearch, setTeamSearch] = useState("");
  const [teamRoleFilter, setTeamRoleFilter] = useState("All Roles");
  const [teamStatusFilter, setTeamStatusFilter] = useState("All Status");
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [teamForm, setTeamForm] = useState({ name: "", email: "", role: "Annotator", status: "Active", projects: [], capacity: 6 });
  const [teamMessage, setTeamMessage] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const panStart = useRef(null);

  useEffect(() => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(DATASET_META_KEY, JSON.stringify(datasetMeta));
  }, [datasetMeta]);

  useEffect(() => {
    localStorage.setItem("annotatepro_qa_reviews_v1", JSON.stringify(qaReviews));
  }, [qaReviews]);

  useEffect(() => {
    localStorage.setItem("annotatepro_export_history_v1", JSON.stringify(exportHistory));
  }, [exportHistory]);

  useEffect(() => {
    localStorage.setItem(TEAM_KEY, JSON.stringify(teamMembers));
  }, [teamMembers]);

  const currentTask = tasks[selectedTaskIndex] || tasks[0];
  const currentAnnotations = annotationsByTask[currentTask?.id] || [];
  const currentLabel = labels.find((l) => l.id === selectedLabel) || labels[0];

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

  function openCreateProject() {
    setEditingProjectId(null);
    setProjectForm(emptyProject);
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
      setProjects(prev => prev.map(p => p.id === editingProjectId ? { ...p, ...next } : p));
    } else {
      setProjects(prev => [...prev, { ...next, id: `p-${Date.now()}` }]);
    }
    setProjectModalOpen(false);
  }

  function deleteProject(id) {
    if (!window.confirm("Delete this project?")) return;
    setProjects(prev => prev.filter(p => p.id !== id));
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

  function selectAnnotation(id) {
    setSelectedAnnotationId(id);
    setTool("select");
  }

  function deleteSelected() {
    if (!selectedAnnotationId) return;
    const next = currentAnnotations.filter(a => a.id !== selectedAnnotationId);
    pushHistory(next);
    setSelectedAnnotationId(null);
  }

  function duplicateSelected() {
    const item = currentAnnotations.find(a => a.id === selectedAnnotationId);
    if (!item) return;
    const copy = {
      ...item,
      id: `${item.type}-${Date.now()}`,
      x: Math.min(94, item.x + 3),
      y: Math.min(94, item.y + 3),
      points: item.points?.map(p => ({ x: Math.min(96, p.x + 3), y: Math.min(96, p.y + 3) }))
    };
    pushHistory([...currentAnnotations, copy]);
    setSelectedAnnotationId(copy.id);
  }

  function updateAnnotation(id, patch) {
    updateCurrentAnnotations(currentAnnotations.map(a => a.id === id ? { ...a, ...patch } : a));
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
      setSelectedAnnotationId(hit?.id || null);
      return;
    }
    if (tool === "pan") {
      panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      e.currentTarget.setPointerCapture?.(e.pointerId);
      return;
    }
    const point = imagePoint(e);
    if (tool === "polygon" || tool === "polyline") {
      if (drawing?.type === tool) {
        const points = [...drawing.points, point];
        if (points.length >= 3 && distance(points[0], point) < 2.5 && tool === "polygon") {
          const annotation = {
            id: `${tool}-${Date.now()}`, type: tool, labelId: selectedLabel,
            color: currentLabel.color, points: points.slice(0, -1)
          };
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
    if (tool === "rectangle" || tool === "line") {
      setDrawing({ type: tool, start: point, current: point });
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
  }

  function onCanvasPointerMove(e) {
    if (tool === "pan" && panStart.current) {
      setPan({
        x: panStart.current.px + (e.clientX - panStart.current.x),
        y: panStart.current.py + (e.clientY - panStart.current.y)
      });
      return;
    }
    if (drawing && (tool === "rectangle" || tool === "line")) {
      setDrawing(prev => ({ ...prev, current: imagePoint(e) }));
    }
  }

  function onCanvasPointerUp() {
    if (tool === "pan") {
      panStart.current = null;
      return;
    }
    if (!drawing || !["rectangle", "line"].includes(tool)) return;
    const s = drawing.start;
    const c = drawing.current;
    if (Math.abs(c.x - s.x) < 1.2 || Math.abs(c.y - s.y) < 1.2) {
      setDrawing(null);
      return;
    }
    const annotation = tool === "rectangle"
      ? {
          id: `box-${Date.now()}`, type: "rectangle", labelId: selectedLabel,
          color: currentLabel.color, x: Math.min(s.x, c.x), y: Math.min(s.y, c.y),
          w: Math.abs(c.x - s.x), h: Math.abs(c.y - s.y)
        }
      : {
          id: `line-${Date.now()}`, type: "line", labelId: selectedLabel,
          color: currentLabel.color, points: [s, c]
        };
    pushHistory([...currentAnnotations, annotation]);
    setSelectedAnnotationId(annotation.id);
    setDrawing(null);
  }

  function hitTest(a, p) {
    if (a.type === "rectangle") return p.x >= a.x && p.x <= a.x + a.w && p.y >= a.y && p.y <= a.y + a.h;
    if (a.points?.length) {
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
  }

  function saveTask() {
    if (!currentTask) return;
    setTasks(prev => prev.map((t, i) => i === selectedTaskIndex ? { ...t, status: currentAnnotations.length ? "In Progress" : t.status } : t));
    setWorkspaceMessage("Task saved");
    setTimeout(() => setWorkspaceMessage(""), 1800);
  }

  function submitTask() {
    if (!currentTask) return;
    setTasks(prev => prev.map((t, i) => i === selectedTaskIndex ? { ...t, status: "Submitted" } : t));
    setWorkspaceMessage("Task submitted for QA review");
    setTimeout(() => setWorkspaceMessage(""), 1800);
  }

  async function importImages(files) {
    const selectedFiles = Array.from(files || []).filter(file => file.type.startsWith("image/"));
    if (!selectedFiles.length) return;
    const readFile = file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name, status: "Pending", image: reader.result, size: file.size,
        source: "Local upload", projectId: workspaceProject, createdAt: new Date().toISOString()
      });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
    const next = (await Promise.all(selectedFiles.map(readFile))).filter(Boolean);
    if (!next.length) return;
    const startIndex = tasks.length;
    setTasks(prev => [...prev, ...next]);
    setSelectedTaskIndex(startIndex);
    setImageUploadOpen(false);
    setDatasetToast(`${next.length} image${next.length > 1 ? "s" : ""} imported successfully`);
    setTimeout(() => setDatasetToast(""), 2200);
    navigate("Annotation Workspace");
  }

  function removeTask(id) {
    const index = tasks.findIndex(t => t.id === id);
    if (index < 0) return;
    if (!window.confirm(`Remove ${tasks[index].name} from the dataset?`)) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTaskIndex(prev => Math.max(0, Math.min(prev, tasks.length - 2)));
    setDatasetToast("Task removed");
    setTimeout(() => setDatasetToast(""), 1800);
  }

  function clearDataset() {
    if (!tasks.length) return;
    if (!window.confirm("Remove all imported tasks? Sample tasks will also be removed.")) return;
    setTasks([]);
    setSelectedTaskIndex(0);
    setAnnotationsByTask({});
    setDatasetToast("Dataset cleared");
    setTimeout(() => setDatasetToast(""), 1800);
  }

  function updateTaskStatus(id, status) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
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
      reviewer: "Manjunath",
      reviewedAt: now,
      annotationCount: qaSelectedAnnotations.length,
      history: [
        ...(qaSelectedReview?.history || []),
        { decision, score: Number(qaScore), reason: decision === "Approved" ? "" : qaReason, comment: qaComment.trim(), reviewer: "Manjunath", reviewedAt: now }
      ]
    };
    setQaReviews(prev => ({ ...prev, [qaSelectedTask.id]: review }));
    const nextStatus = decision === "Approved" ? "Approved" : decision === "Rejected" ? "Rejected" : "QA Review";
    setTasks(prev => prev.map(t => t.id === qaSelectedTask.id ? { ...t, status: nextStatus } : t));
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
      else if (e.ctrlKey && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z") { e.preventDefault(); redo(); }
      else if (e.key === "Escape") { setDrawing(null); setSelectedAnnotationId(null); }
      else if (e.key.toLowerCase() === "v") setTool("select");
      else if (e.key.toLowerCase() === "b") setTool("rectangle");
      else if (e.key.toLowerCase() === "p") setTool("polygon");
      else if (e.key.toLowerCase() === "l") setTool("line");
      else if (e.key === "+" || e.key === "=") setZoom(z => Math.min(4, +(z + 0.1).toFixed(2)));
      else if (e.key === "-") setZoom(z => Math.max(0.25, +(z - 0.1).toFixed(2)));
      else if (e.key === "ArrowRight") changeTask(1);
      else if (e.key === "ArrowLeft") changeTask(-1);
      else if (e.key === " ") { e.preventDefault(); setTool("pan"); }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });

  const datasetFilteredTasks = useMemo(() => tasks.filter(t => {
    const q = datasetSearch.toLowerCase();
    return (!q || `${t.name} ${t.id}`.toLowerCase().includes(q)) && (datasetStatus === "All" || t.status === datasetStatus);
  }), [tasks, datasetSearch, datasetStatus]);

  useEffect(() => {
    const handler = (e) => {
      const index = Number(e.detail);
      if (Number.isFinite(index)) { setSelectedTaskIndex(index); setActivePage("Annotation Workspace"); }
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
      setTeamMembers(prev => prev.map(m => m.id === editingMemberId ? { ...m, ...teamForm, name: teamForm.name.trim(), email: teamForm.email.trim(), capacity: Math.max(0, Number(teamForm.capacity) || 0) } : m));
      setTeamMessage("Team member updated successfully");
    } else {
      const member = { id: `member-${Date.now()}`, ...teamForm, name: teamForm.name.trim(), email: teamForm.email.trim(), capacity: Math.max(0, Number(teamForm.capacity) || 0), completed: 0, qaScore: 0 };
      setTeamMembers(prev => [member, ...prev]);
      setTeamMessage("Team member added successfully");
    }
    setTeamModalOpen(false);
    setTimeout(() => setTeamMessage(""), 2600);
  }

  function toggleMemberStatus(member) {
    const next = member.status === "Active" ? "Inactive" : "Active";
    setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, status: next } : m));
    setTeamMessage(`${member.name} is now ${next.toLowerCase()}`);
    setTimeout(() => setTeamMessage(""), 2600);
  }

  function deleteMember(member) {
    if (member.id === "m1") return;
    setTeamMembers(prev => prev.filter(m => m.id !== member.id));
    setTasks(prev => prev.map(t => t.assigneeId === member.id ? { ...t, assigneeId: null } : t));
    setTeamMessage(`${member.name} removed from the workspace`);
    setTimeout(() => setTeamMessage(""), 2600);
  }

  function assignTask(taskId, memberId) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigneeId: memberId || null, status: memberId && t.status === "Pending" ? "In Progress" : t.status } : t));
    const member = teamMembers.find(m => m.id === memberId);
    setTeamMessage(member ? `Task assigned to ${member.name}` : "Task assignment cleared");
    setTimeout(() => setTeamMessage(""), 2200);
  }

  const navItems = [
    ["Dashboard", LayoutDashboard], ["Projects", FolderKanban], ["Annotation Workspace", Grid3X3],
    ["Team", Users], ["QA & Reviews", ClipboardCheck], ["Analytics", BarChart3],
    ["Import Data", Upload], ["Export", Download], ["Settings", Settings]
  ];

  return (
    <div className="app-shell">
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
              {name === "QA & Reviews" && <em>7</em>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="online-status"><span></span> System operational</div>
          <div className="user-card">
            <div className="user-avatar">M</div>
            <div><b>Manjunath</b><span>Team Lead</span></div>
            <MoreHorizontal size={17} />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(v => !v)}><Menu size={21} /></button>
          <div className="breadcrumb"><span>AnnotatePro</span><b>/</b><strong>{activePage}</strong></div>
          <div className="top-actions">
            <div className="global-search"><Search size={17} /><input placeholder="Search..." /></div>
            <button className="icon-btn"><Bell size={19} /><i></i></button>
            <div className="profile-wrap">
              <button className="profile-button" onClick={() => setProfileOpen(v => !v)}><div className="tiny-avatar">M</div><span>Manjunath</span><ChevronDown size={15} /></button>
              {profileOpen && <div className="profile-menu"><b>Manjunath</b><span>Team Lead</span><hr /><button onClick={() => navigate("Settings")}><Settings size={15}/> Settings</button></div>}
            </div>
          </div>
        </header>

        {activePage === "Dashboard" && <Dashboard projects={projects} stats={dashboardStats} onCreate={openCreateProject} onNavigate={navigate} />}
        {activePage === "Projects" && <ProjectsPage projects={filteredProjects} search={projectSearch} setSearch={setProjectSearch} filter={projectStatusFilter} setFilter={setProjectStatusFilter} onCreate={openCreateProject} onEdit={openEditProject} onDelete={deleteProject} onDetails={setProjectDetails} onWorkspace={(id) => { setWorkspaceProject(id); navigate("Annotation Workspace"); }} />}
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
            onCanvasPointerUp={onCanvasPointerUp} handleImageError={handleImageError}
            onDelete={deleteSelected} onDuplicate={duplicateSelected} onUndo={undo} onRedo={redo}
            onReset={resetView} onPrevious={() => changeTask(-1)} onNext={() => changeTask(1)}
            onSave={saveTask} onSubmit={submitTask} message={workspaceMessage}
            updateAnnotation={updateAnnotation} showShortcuts={showShortcuts} setShowShortcuts={setShowShortcuts}
            onImport={() => imageInputRef.current?.click()}
            imageInputRef={imageInputRef} importImages={importImages}
            labelsSetter={setLabels}
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
        />}
        {activePage === "QA & Reviews" && <QAReviews tasks={tasks} queue={qaQueue} stats={qaStats} selectedTask={qaSelectedTask} selectedAnnotations={qaSelectedAnnotations} selectedReview={qaSelectedReview} search={qaSearch} setSearch={setQaSearch} filter={qaFilter} setFilter={setQaFilter} score={qaScore} setScore={setQaScore} reason={qaReason} setReason={setQaReason} comment={qaComment} setComment={setQaComment} onSelect={selectQaTask} onReview={completeQaReview} message={qaMessage} reviews={qaReviews} /> }
        {activePage === "Analytics" && <AnalyticsPage projects={projects} tasks={tasks} annotations={annotationsByTask} qaReviews={qaReviews} range={analyticsRange} setRange={setAnalyticsRange} project={analyticsProject} setProject={setAnalyticsProject} />}
        {activePage === "Import Data" && <ImportPage tasks={tasks} datasetMeta={datasetMeta} setDatasetMeta={setDatasetMeta} filteredTasks={datasetFilteredTasks} search={datasetSearch} setSearch={setDatasetSearch} status={datasetStatus} setStatus={setDatasetStatus} view={datasetView} setView={setDatasetView} onImport={() => imageInputRef.current?.click()} onCsv={() => setImportOpen(true)} onRemove={removeTask} onClear={clearDataset} onStatus={updateTaskStatus} onExport={exportTasksCsv} />}
        {activePage === "Export" && <ExportPage tasks={exportTasks} allTasks={tasks} annotations={annotationsByTask} qaReviews={qaReviews} format={exportFormat} setFormat={setExportFormat} scope={exportScope} setScope={setExportScope} project={exportProject} setProject={setExportProject} projects={projects} search={exportSearch} setSearch={setExportSearch} history={exportHistory} onExport={performExport} onClearHistory={clearExportHistory} message={exportMessage} />}
        {activePage === "Settings" && <SimplePage title="Settings" subtitle="Configure workspace and annotation preferences." icon={Settings} stats={["Autosave On", "Shortcuts On", "Local Storage"]} />}

        <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={e => { importImages(e.target.files); e.target.value=""; }} />
        {datasetToast && <div className="workspace-toast"><CheckCircle2 size={17}/>{datasetToast}</div>}
      </main>

      {projectModalOpen && <ProjectModal form={projectForm} setForm={setProjectForm} editing={!!editingProjectId} onClose={() => setProjectModalOpen(false)} onSave={saveProject} />}
      {projectDetails && <ProjectDetails project={projectDetails} onClose={() => setProjectDetails(null)} onEdit={() => { setProjectDetails(null); openEditProject(projectDetails); }} />}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onImport={() => { setImportOpen(false); imageInputRef.current?.click(); }} />}
    </div>
  );
}

function Dashboard({ projects, stats, onCreate, onNavigate }) {
  return (
    <div className="page">
      <div className="page-head">
        <div><span className="eyebrow">OVERVIEW</span><h1>Good afternoon, Manjunath</h1><p>Here’s what’s happening across your annotation workspace.</p></div>
        <button className="primary-btn" onClick={onCreate}><Plus size={17}/> Create Project</button>
      </div>
      <div className="stats-grid">
        <StatCard icon={FolderKanban} label="Active Projects" value={stats.active} meta="+2 this month" />
        <StatCard icon={ImageIcon} label="Images to Annotate" value={stats.remaining.toLocaleString()} meta={`${stats.completed.toLocaleString()} completed`} />
        <StatCard icon={Users} label="Team Members" value="28" meta="22 annotators" />
        <StatCard icon={ShieldCheck} label="Quality Score" value="96.8%" meta="+1.4% this week" />
      </div>
      <section className="panel">
        <div className="panel-head"><div><h2>Active Projects</h2><p>Current annotation workload</p></div><button className="text-btn" onClick={() => onNavigate("Projects")}>View all <span>→</span></button></div>
        <div className="table-wrap"><table><thead><tr><th>PROJECT</th><th>TYPE</th><th>TOTAL</th><th>PROGRESS</th><th>STATUS</th></tr></thead><tbody>
          {projects.slice(0, 5).map(p => <tr key={p.id}><td><b>{p.name}</b><small>{p.client}</small></td><td>{p.annotationType}</td><td>{Number(p.totalImages).toLocaleString()}</td><td><div className="table-progress"><span><i style={{width:`${progressOf(p)}%`}}></i></span><b>{progressOf(p)}%</b></div></td><td><StatusBadge status={p.status}/></td></tr>)}
        </tbody></table></div>
      </section>
      <div className="dashboard-bottom">
        <section className="panel"><div className="panel-head"><div><h2>Recent Activity</h2><p>Latest workspace events</p></div></div><div className="activity-list"><ActivityRow icon={CheckCircle2} title="Road Object Detection" text="Task batch completed" time="8 min ago"/><ActivityRow icon={ShieldCheck} title="QA Review" text="18 annotations approved" time="31 min ago"/><ActivityRow icon={Users} title="Team activity" text="3 annotators started work" time="1 hr ago"/><ActivityRow icon={Upload} title="Dataset import" text="120 images added" time="2 hrs ago"/></div></section>
        <section className="panel quick-panel"><div className="panel-head"><div><h2>Quick Actions</h2><p>Jump into common workflows</p></div></div><div className="quick-grid"><Quick icon={Play} title="Start Annotating" onClick={() => onNavigate("Annotation Workspace")}/><Quick icon={ClipboardCheck} title="Pending Reviews" onClick={() => onNavigate("QA & Reviews")}/><Quick icon={TrendingUp} title="View Analytics" onClick={() => onNavigate("Analytics")}/><Quick icon={Upload} title="Import Images" onClick={() => onNavigate("Import Data")}/></div></section>
      </div>
    </div>
  );
}

function Workspace({
  projects, workspaceProject, setWorkspaceProject, tasks, currentTask, selectedTaskIndex, setSelectedTaskIndex,
  filteredTasks, taskFilter, setTaskFilter, tool, setTool, labels, selectedLabel, setSelectedLabel,
  currentAnnotations, selectedAnnotationId, selectAnnotation, selectedAnnotation, drawing, zoom, setZoom, pan, setPan,
  canvasRef, imageRef, onCanvasPointerDown, onCanvasPointerMove, onCanvasPointerUp, handleImageError,
  onDelete, onDuplicate, onUndo, onRedo, onReset, onPrevious, onNext, onSave, onSubmit, message,
  updateAnnotation, showShortcuts, setShowShortcuts, onImport, imageInputRef, importImages, labelsSetter
}) {
  const tools = [
    ["select", MousePointer2, "Select", "V"], ["rectangle", Square, "Bounding Box", "B"],
    ["polygon", Grid3X3, "Polygon", "P"], ["line", Minus, "Line", "L"], ["pan", Move, "Pan", "Space"]
  ];

  return (
    <div className="workspace-page">
      <div className="workspace-top">
        <div className="workspace-project"><span>PROJECT</span><select value={workspaceProject} onChange={e => setWorkspaceProject(e.target.value)}>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="workspace-task-title"><b>{currentTask?.name || "No task loaded"}</b><span>{selectedTaskIndex + 1} / {tasks.length} tasks</span></div>
        <div className="workspace-actions"><button className="secondary-btn" onClick={onSave}><Save size={16}/> Save</button><button className="primary-btn" onClick={onSubmit}><CheckCircle2 size={16}/> Submit</button></div>
      </div>

      <div className="annotation-shell">
        <aside className="tool-panel">
          <div className="panel-section-title">TOOLS</div>
          {tools.map(([id, Icon, title, key]) => <button key={id} className={`tool-button ${tool === id ? "active" : ""}`} title={`${title} (${key})`} onClick={() => setTool(id)}><Icon size={19}/><span>{title}</span><kbd>{key}</kbd></button>)}
          <div className="tool-divider"/>
          <button className="tool-button" onClick={onUndo} disabled={!onUndo}><Undo2 size={18}/><span>Undo</span><kbd>Ctrl Z</kbd></button>
          <button className="tool-button" onClick={onRedo}><Redo2 size={18}/><span>Redo</span><kbd>Ctrl ⇧ Z</kbd></button>
          <div className="tool-divider"/>
          <button className="tool-button" onClick={() => setShowShortcuts(true)}><Target size={18}/><span>Shortcuts</span></button>
          <div className="tool-bottom"><button className="tool-button" onClick={onReset}><RotateCcw size={18}/><span>Reset View</span></button></div>
        </aside>

        <section className="canvas-area">
          <div className="canvas-toolbar">
            <div className="canvas-tool-status"><span className="tool-dot"></span>{tools.find(t => t[0] === tool)?.[2] || "Select"}<small>{currentAnnotations.length} objects</small></div>
            <div className="canvas-controls"><button onClick={() => setZoom(z => Math.max(.25, +(z-.1).toFixed(2)))}><ZoomOut size={16}/></button><b>{Math.round(zoom*100)}%</b><button onClick={() => setZoom(z => Math.min(4, +(z+.1).toFixed(2)))}><ZoomIn size={16}/></button><button onClick={onReset}>Fit</button><button onClick={() => document.documentElement.requestFullscreen?.()} title="Full screen"><Grid3X3 size={15}/></button></div>
          </div>

          <div className={`canvas-stage ${tool === "pan" ? "pan-mode" : ""}`}>
            {currentTask ? (
              <div
                ref={canvasRef}
                className="annotation-canvas"
                onPointerDown={onCanvasPointerDown}
                onPointerMove={onCanvasPointerMove}
                onPointerUp={onCanvasPointerUp}
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
              >
                <img ref={imageRef} src={currentTask.image} alt={currentTask.name} onError={handleImageError} draggable="false"/>
                <div className="annotation-overlay">
                  {currentAnnotations.map((a, index) => <AnnotationShape key={a.id} a={a} index={index} selected={a.id === selectedAnnotationId} onSelect={() => selectAnnotation(a.id)} update={updateAnnotation}/>)}
                  {drawing && <DrawingPreview drawing={drawing} color={labels.find(l=>l.id===selectedLabel)?.color || "#2563eb"}/>}
                </div>
              </div>
            ) : <div className="empty-canvas"><ImageIcon size={45}/><h3>No images yet</h3><p>Import images to start annotating.</p><button className="primary-btn" onClick={onImport}><Upload size={16}/> Import Images</button></div>}
          </div>

          <div className="canvas-bottom">
            <button onClick={onPrevious} disabled={selectedTaskIndex <= 0}>← Previous</button>
            <div className="task-counter"><b>{selectedTaskIndex + 1}</b> / {tasks.length}</div>
            <button onClick={onNext} disabled={selectedTaskIndex >= tasks.length-1}>Next →</button>
            <span className="bottom-spacer"></span><span>Scroll to zoom</span><span>Space to pan</span>
          </div>
        </section>

        <aside className="right-panel">
          <div className="right-tabs"><button className="active">Labels</button><button>Objects <em>{currentAnnotations.length}</em></button></div>
          <div className="right-content">
            <div className="right-section"><div className="right-section-head"><b>LABELS</b><button title="Import more images" onClick={onImport}><Plus size={16}/></button></div><div className="label-list">
              {labels.map(label => <button key={label.id} className={`label-item ${selectedLabel === label.id ? "selected" : ""}`} onClick={() => setSelectedLabel(label.id)}><span className="label-color" style={{background:label.color}}></span><span>{label.name}</span><kbd>{label.type === "Rectangle" ? "BOX" : label.type}</kbd></button>)}
            </div></div>
            <div className="right-section"><div className="right-section-head"><b>OBJECTS</b><span>{currentAnnotations.length}</span></div>
              {currentAnnotations.length ? <div className="object-list">{currentAnnotations.map((a,i) => { const l=labels.find(x=>x.id===a.labelId); return <button key={a.id} className={`object-item ${selectedAnnotationId===a.id?"selected":""}`} onClick={()=>selectAnnotation(a.id)}><span className="object-number" style={{background:l?.color}}>{i+1}</span><div><b>{l?.name || "Object"}</b><small>{a.type === "rectangle" ? "Bounding Box" : a.type}</small></div><Eye size={15}/></button>})}</div> : <div className="empty-objects"><Target size={25}/><p>No annotations yet</p><small>Select a label and draw on the image.</small></div>}
            </div>
            {selectedAnnotation && <div className="selected-card"><div><b>Selected object</b><span>{labels.find(l=>l.id===selectedAnnotation.labelId)?.name}</span></div><div className="selected-actions"><button onClick={onDuplicate}><Copy size={15}/> Duplicate</button><button className="danger" onClick={onDelete}><Trash2 size={15}/> Delete</button></div></div>}
          </div>
          <div className="right-footer"><div><span>Task status</span><StatusBadge status={currentTask?.status || "Pending"}/></div><div><span>Objects</span><b>{currentAnnotations.length}</b></div></div>
        </aside>
      </div>

      {message && <div className="workspace-toast"><CheckCircle2 size={17}/>{message}</div>}
      {showShortcuts && <Shortcuts onClose={() => setShowShortcuts(false)}/>}
    </div>
  );
}

function AnnotationShape({ a, index, selected, onSelect, update }) {
  const style = { "--annotation-color": a.color || "#2563eb" };
  if (a.type === "rectangle") {
    return <div className={`annotation-box ${selected ? "selected" : ""}`} style={{...style,left:`${a.x}%`,top:`${a.y}%`,width:`${a.w}%`,height:`${a.h}%`}} onPointerDown={e => {e.stopPropagation(); onSelect();}}><span>{index+1}</span><b>{a.labelId}</b>{selected && <div className="resize-handle"/>}</div>;
  }
  if (a.points?.length) {
    const points = a.points.map(p => `${p.x},${p.y}`).join(" ");
    return <svg className={`annotation-svg ${selected ? "selected" : ""}`} viewBox="0 0 100 100" preserveAspectRatio="none" onPointerDown={e=>{e.stopPropagation();onSelect();}}><polygon points={points} fill={`${a.color}22`} stroke={a.color} strokeWidth=".55"/>{selected && <circle cx={a.points[0].x} cy={a.points[0].y} r="1.2" fill={a.color}/>}</svg>;
  }
  return null;
}

function DrawingPreview({drawing,color}) {
  if (drawing.type === "rectangle") {
    const s=drawing.start,c=drawing.current;
    return <div className="drawing-box" style={{left:`${Math.min(s.x,c.x)}%`,top:`${Math.min(s.y,c.y)}%`,width:`${Math.abs(c.x-s.x)}%`,height:`${Math.abs(c.y-s.y)}%`,borderColor:color}}/>;
  }
  if (drawing.points?.length) return <svg className="annotation-svg drawing"><polyline points={drawing.points.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={color} strokeWidth=".6"/></svg>;
  return null;
}

function ProjectsPage({projects,search,setSearch,filter,setFilter,onCreate,onEdit,onDelete,onDetails,onWorkspace}) {
  return <div className="page"><div className="page-head"><div><span className="eyebrow">WORKSPACE</span><h1>Projects</h1><p>Create, organize and monitor your annotation projects.</p></div><button className="primary-btn" onClick={onCreate}><Plus size={17}/> Create Project</button></div>
    <div className="project-summary"><MiniStat label="Total Projects" value={projects.length}/><MiniStat label="In Progress" value={projects.filter(p=>p.status==="In Progress").length}/><MiniStat label="Completed" value={projects.filter(p=>p.status==="Completed").length}/><MiniStat label="Pending" value={projects.filter(p=>p.status==="Pending").length}/></div>
    <section className="panel"><div className="project-filters"><div className="filter-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects..."/></div><div className="select-wrap"><ListFilter size={16}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Pending</option><option>In Progress</option><option>Completed</option></select></div></div>
      <div className="project-grid">{projects.map(p=><ProjectCard key={p.id} p={p} onEdit={()=>onEdit(p)} onDelete={()=>onDelete(p.id)} onDetails={()=>onDetails(p)} onWorkspace={()=>onWorkspace(p.id)}/>)}</div>
      {!projects.length && <div className="empty-state"><FolderKanban size={40}/><h3>No projects found</h3><p>Try another search or create a new project.</p></div>}
    </section>
  </div>;
}

function ProjectCard({p,onEdit,onDelete,onDetails,onWorkspace}) {
  return <article className="project-card"><div className="project-card-head"><div className="project-icon"><FolderKanban size={19}/></div><button className="more-btn" onClick={onEdit}><Edit3 size={16}/></button></div><div className="project-card-title"><h3>{p.name}</h3><span>{p.client}</span></div><div className="project-meta"><span>{p.annotationType}</span><span>•</span><span>{p.team}</span></div><div className="card-progress"><div><b>{progressOf(p)}%</b><span>{Number(p.completedImages).toLocaleString()} / {Number(p.totalImages).toLocaleString()} images</span></div><div className="progress-track"><i style={{width:`${progressOf(p)}%`}}/></div></div><div className="project-card-foot"><StatusBadge status={p.status}/><div className="card-actions"><button onClick={onDetails}>Details</button><button className="start-link" onClick={onWorkspace}><Play size={13}/> Annotate</button><button className="danger-icon" onClick={onDelete}><Trash2 size={15}/></button></div></div></article>;
}

function ProjectModal({form,setForm,editing,onClose,onSave}) {
  const set=(k,v)=>setForm(prev=>({...prev,[k]:v}));
  return <div className="modal-backdrop"><form className="modal project-modal" onSubmit={onSave}><div className="modal-head"><div><span className="eyebrow">PROJECT CONFIGURATION</span><h2>{editing?"Edit Project":"Create Project"}</h2></div><button type="button" className="modal-close" onClick={onClose}><X size={19}/></button></div><div className="form-grid"><label>Project name<input required value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Vehicle Detection"/></label><label>Client / organization<input required value={form.client} onChange={e=>set("client",e.target.value)} placeholder="Client name"/></label><label>Annotation type<select value={form.annotationType} onChange={e=>set("annotationType",e.target.value)}><option>Bounding Box</option><option>Polygon</option><option>Segmentation</option><option>Classification</option><option>Keypoints</option><option>Polyline</option></select></label><label>Team<select value={form.team} onChange={e=>set("team",e.target.value)}><option>Annotation Team</option><option>Road Vision Team</option><option>Segmentation Team</option><option>Infrastructure Team</option><option>Classification Team</option></select></label><label>Total images<input type="number" min="1" value={form.totalImages} onChange={e=>set("totalImages",e.target.value)}/></label><label>Completed images<input type="number" min="0" value={form.completedImages} onChange={e=>set("completedImages",e.target.value)}/></label><label>Start date<input type="date" value={form.startDate} onChange={e=>set("startDate",e.target.value)}/></label><label>Due date<input type="date" value={form.dueDate} onChange={e=>set("dueDate",e.target.value)}/></label><label>Status<select value={form.status} onChange={e=>set("status",e.target.value)}><option>Pending</option><option>In Progress</option><option>Completed</option></select></label><label className="full">Description<textarea value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Project description..."/></label></div><div className="modal-foot"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" type="submit"><Save size={16}/>{editing?"Save Changes":"Create Project"}</button></div></form></div>;
}

function ProjectDetails({project,onClose,onEdit}) {
  return <div className="modal-backdrop"><div className="modal details-modal"><div className="modal-head"><div><span className="eyebrow">PROJECT DETAILS</span><h2>{project.name}</h2><p>{project.client}</p></div><button className="modal-close" onClick={onClose}><X size={19}/></button></div><div className="detail-progress"><div className="big-progress">{progressOf(project)}%</div><div><b>Annotation progress</b><p>{Number(project.completedImages).toLocaleString()} completed · {Math.max(0,project.totalImages-project.completedImages).toLocaleString()} remaining</p><div className="progress-track"><i style={{width:`${progressOf(project)}%`}}/></div></div></div><div className="detail-grid"><Detail label="Annotation type" value={project.annotationType}/><Detail label="Team" value={project.team}/><Detail label="Start date" value={project.startDate||"—"}/><Detail label="Due date" value={project.dueDate||"—"}/><Detail label="Total images" value={Number(project.totalImages).toLocaleString()}/><Detail label="Status" value={project.status}/></div><div className="description-box"><b>Description</b><p>{project.description||"No description provided."}</p></div><div className="modal-foot"><button className="secondary-btn" onClick={onClose}>Close</button><button className="primary-btn" onClick={onEdit}><Edit3 size={16}/> Edit Project</button></div></div></div>;
}

function ImportPage({tasks,datasetMeta,setDatasetMeta,filteredTasks,search,setSearch,status,setStatus,view,setView,onImport,onCsv,onRemove,onClear,onStatus,onExport}) {
  const pending=tasks.filter(t=>t.status==="Pending").length;
  const progress=tasks.filter(t=>t.status==="In Progress").length;
  const completed=tasks.filter(t=>t.status==="Completed").length;
  return <div className="page dataset-page">
    <div className="page-head"><div><span className="eyebrow">DATASET MANAGEMENT</span><h1>Import Data</h1><p>Build and manage the task queue that powers the annotation workspace.</p></div><div className="dataset-head-actions"><button className="secondary-btn" onClick={onExport}><Download size={15}/> Export CSV</button><button className="primary-btn" onClick={onImport}><Upload size={16}/> Import Images</button></div></div>
    <div className="dataset-cards"><MiniStat label="Total Tasks" value={tasks.length}/><MiniStat label="Pending" value={pending}/><MiniStat label="In Progress" value={progress}/><MiniStat label="Completed" value={completed}/></div>
    <section className="dataset-info panel"><div className="dataset-info-main"><div className="dataset-logo"><Database size={22}/></div><div><input className="dataset-name-input" value={datasetMeta.name} onChange={e=>setDatasetMeta(m=>({...m,name:e.target.value}))}/><input className="dataset-description-input" value={datasetMeta.description} onChange={e=>setDatasetMeta(m=>({...m,description:e.target.value}))}/><div className="dataset-meta-line"><span>Local dataset</span><span>•</span><span>{tasks.length} tasks</span><span>•</span><span>Autosaved</span></div></div></div><div className="dataset-info-actions"><button className="secondary-btn" onClick={onCsv}><FileText size={15}/> CSV / JSON Guide</button><button className="danger-outline" onClick={onClear}><Trash2 size={15}/> Clear Dataset</button></div></section>
    <section className="panel task-library"><div className="task-library-head"><div><h2>Task Library</h2><p>Every imported image becomes an annotation task.</p></div><div className="view-toggle"><button className={view==="table"?"active":""} onClick={()=>setView("table")}><ListFilter size={14}/> List</button><button className={view==="grid"?"active":""} onClick={()=>setView("grid")}><Grid3X3 size={14}/> Grid</button></div></div>
      <div className="task-filters"><div className="filter-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search task name or ID..."/></div><div className="select-wrap"><ListFilter size={15}/><select value={status} onChange={e=>setStatus(e.target.value)}><option>All</option><option>Pending</option><option>In Progress</option><option>Completed</option></select></div><span className="result-count">Showing {filteredTasks.length} of {tasks.length}</span></div>
      {!filteredTasks.length ? <div className="dataset-empty"><Upload size={38}/><h3>{tasks.length ? "No matching tasks" : "Your dataset is empty"}</h3><p>{tasks.length ? "Change the search or status filter." : "Import one or more images to create your first annotation tasks."}</p>{!tasks.length && <button className="primary-btn" onClick={onImport}><Upload size={15}/> Import Images</button>}</div> : view==="table" ? <div className="task-table-wrap"><table className="task-table"><thead><tr><th>TASK</th><th>PREVIEW</th><th>STATUS</th><th>ANNOTATIONS</th><th>SOURCE</th><th></th></tr></thead><tbody>{filteredTasks.map((t)=>{const originalIndex=tasks.findIndex(x=>x.id===t.id);return <tr key={t.id}><td><b>{t.name}</b><small>{t.id}</small></td><td><img className="task-thumb" src={t.image} alt=""/></td><td><select className="task-status-select" value={t.status} onChange={e=>onStatus(t.id,e.target.value)}><option>Pending</option><option>In Progress</option><option>Completed</option></select></td><td><span className="annotation-count">—</span></td><td><span className="source-pill">{t.source||"Sample"}</span></td><td><div className="task-row-actions"><button title="Open in workspace" onClick={()=>{window.dispatchEvent(new CustomEvent("annotatepro-open-task",{detail:originalIndex}));}}><Play size={14}/></button><button title="Remove" onClick={()=>onRemove(t.id)}><Trash2 size={14}/></button></div></td></tr>})}</tbody></table></div> : <div className="task-grid">{filteredTasks.map(t=><div className="task-tile" key={t.id}><img src={t.image} alt={t.name}/><div className="task-tile-body"><b title={t.name}>{t.name}</b><small>{t.id}</small><div><StatusBadge status={t.status}/><button onClick={()=>onRemove(t.id)}><Trash2 size={13}/></button></div></div></div>)}</div>}
    </section>
    <div className="dataset-help"><div><ShieldCheck size={18}/><div><b>Local-first dataset storage</b><p>Uploaded images are stored in your browser as data URLs, so your imported tasks remain available after refreshing the page on the same device.</p></div></div><span>Build 2</span></div>
  </div>;
}

function ExportPage({tasks, allTasks, annotations, qaReviews, format, setFormat, scope, setScope, project, setProject, projects, search, setSearch, history, onExport, onClearHistory, message}) {
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
    <div className="page-head"><div><span className="eyebrow">DATA DELIVERY</span><h1>Export</h1><p>Package annotation data for downstream QA, reporting and machine-learning workflows.</p></div><div className="export-head-status"><span><i></i> Local export engine</span></div></div>
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
            <div><label className="export-label">PROJECT</label><div className="export-select"><FolderKanban size={15}/><select value={project} onChange={e=>setProject(e.target.value)}><option>All Projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div></div>
          </div>
          <label className="export-label">TASK SEARCH</label><div className="export-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter by task name or ID..."/></div>
          <div className="export-ready"><div><b>{tasks.length} tasks ready</b><span>{totalAnnotations} annotations will be included in this export.</span></div><button className="primary-btn" onClick={onExport}><Download size={16}/> Export {format}</button></div>
          {message && <div className="export-message"><Check size={15}/>{message}</div>}
        </div>
      </section>
      <section className="panel export-history"><div className="panel-head"><div><h2>Export History</h2><p>Recent deliveries stored in this browser.</p></div><button className="icon-btn" onClick={onClearHistory} title="Clear history"><RefreshCw size={15}/></button></div>
        <div className="history-list">{history.length ? history.map(item=><div className="export-history-row" key={item.id}><div className="history-format"><span><Download size={14}/></span><div><b>{item.format}</b><small>{item.tasks} tasks · {item.annotations} annotations</small></div></div><div className="history-time">{new Date(item.at).toLocaleString()}</div></div>) : <div className="export-history-empty"><Download size={30}/><h3>No exports yet</h3><p>Your recent export activity will appear here.</p></div>}</div>
      </section>
    </div>
    <section className="export-info"><div className="export-info-icon"><ShieldCheck size={18}/></div><div><b>Production-ready delivery foundation</b><p>Exports are generated directly in the browser from the current task, annotation and QA state. For large production datasets, the next storage layer can move this same export engine to object storage and server-side packaging.</p></div><span>BUILD 5</span></section>
  </div>;
}

function ImportModal({onClose,onImport}) {
  const [format,setFormat]=useState("CSV");
  return <div className="modal-backdrop"><div className="modal small-modal"><div className="modal-head"><div><span className="eyebrow">DATA IMPORT</span><h2>Task Data</h2></div><button className="modal-close" onClick={onClose}><X size={19}/></button></div><div className="guide"><div className="import-format-tabs"><button className={format==="CSV"?"active":""} onClick={()=>setFormat("CSV")}>CSV</button><button className={format==="JSON"?"active":""} onClick={()=>setFormat("JSON")}>JSON</button></div><FileText size={30}/><h3>Structured task import</h3><p>Use this guide for the next connector-ready dataset format. Build 2 also gives you immediate bulk image importing from your device.</p><div className="code-sample">{format==="CSV" ? 'id,name,image,status\n001,car-001.jpg,https://...,Pending' : '{ "data": { "image": "https://...", "name": "task-001" } }'}</div><div className="guide-note"><AlertCircle size={14}/><span>For production datasets, image files should be uploaded through the Image Importer so they are retained locally.</span></div></div><div className="modal-foot"><button className="secondary-btn" onClick={onClose}>Close</button><button className="primary-btn" onClick={onImport}><Upload size={16}/> Import Images</button></div></div></div>;
}

function Shortcuts({onClose}) {
  const rows=[["V","Select"],["B","Bounding Box"],["P","Polygon"],["L","Line"],["Space","Pan"],["Delete","Delete selected"],["Ctrl + Z","Undo"],["Ctrl + Shift + Z","Redo"],["+ / -","Zoom"],["← / →","Previous / next task"]];
  return <div className="modal-backdrop"><div className="modal shortcuts-modal"><div className="modal-head"><div><span className="eyebrow">WORKSPACE</span><h2>Keyboard shortcuts</h2></div><button className="modal-close" onClick={onClose}><X size={19}/></button></div><div className="shortcut-list">{rows.map(r=><div key={r[0]}><kbd>{r[0]}</kbd><span>{r[1]}</span></div>)}</div></div></div>;
}


function QAReviews({ tasks, queue, stats, selectedTask, selectedAnnotations, selectedReview, search, setSearch, filter, setFilter, score, setScore, reason, setReason, comment, setComment, onSelect, onReview, message, reviews }) {
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
                <div className="qa-thumb"><img src={task.image} alt="" /></div>
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
              <img src={selectedTask.image} alt={selectedTask.name} />
              {selectedAnnotations.slice(0,30).map((a,i) => a.type==="rectangle"
                ? <div key={a.id} className="qa-box" style={{left:`${a.x}%`,top:`${a.y}%`,width:`${a.w}%`,height:`${a.h}%`,borderColor:a.color}}><span>{i+1}</span></div>
                : a.points?.length ? <div key={a.id} className="qa-point-mark" style={{left:`${a.points[0].x}%`,top:`${a.points[0].y}%`,borderColor:a.color}}><span>{i+1}</span></div> : null)}
              {!selectedAnnotations.length && <div className="qa-no-annotations"><AlertCircle size={18}/> No annotations saved on this task</div>}
            </div>
            <div className="qa-review-meta"><div><span>ANNOTATIONS</span><b>{selectedAnnotations.length}</b></div><div><span>STATUS</span><b>{selectedReview?.decision || "Pending Review"}</b></div><div><span>REVIEWER</span><b>{selectedReview?.reviewer || "Unassigned"}</b></div></div>
            <div className="qa-section"><div className="qa-section-head"><div><h3>Quality score</h3><p>Rate the overall annotation quality.</p></div><strong>{score}%</strong></div><input className="qa-score-range" type="range" min="0" max="100" value={score} onChange={e=>setScore(Number(e.target.value))}/><div className="score-scale"><span>0 Poor</span><span>50 Average</span><span>100 Excellent</span></div></div>
            <div className="qa-section"><h3>Review decision</h3><div className="decision-grid"><button className="decision approve" onClick={()=>onReview("Approved")}><CheckCircle2 size={17}/><span><b>Approve</b><small>Annotation is ready</small></span></button><button className="decision changes" onClick={()=>onReview("Changes Requested")}><Edit3 size={17}/><span><b>Request Changes</b><small>Send back to annotator</small></span></button><button className="decision reject" onClick={()=>onReview("Rejected")}><AlertCircle size={17}/><span><b>Reject</b><small>Fails quality criteria</small></span></button></div></div>
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
function AnalyticsPage({ projects, tasks, annotations, qaReviews, range, setRange, project, setProject }) {
  const visibleTasks = useMemo(() => {
    if (project === "All Projects") return tasks;
    const projectName = projects.find(p => p.id === project)?.name;
    return tasks.filter(t => !projectName || t.projectName === projectName || t.projectId === project);
  }, [tasks, projects, project]);

  const totalAnnotations = Object.values(annotations || {}).reduce((sum, list) => sum + (list?.length || 0), 0);
  const reviewed = Object.values(qaReviews || {}).filter(Boolean);
  const approved = reviewed.filter(r => r.decision === "Approved").length;
  const rejected = reviewed.filter(r => r.decision === "Rejected").length;
  const changes = reviewed.filter(r => r.decision === "Changes Requested").length;
  const averageQA = reviewed.length ? Math.round(reviewed.reduce((sum, r) => sum + Number(r.score || 0), 0) / reviewed.length) : 0;
  const completedTasks = visibleTasks.filter(t => ["Completed", "Submitted", "QA Review", "Approved", "Rejected"].includes(t.status)).length;
  const completionRate = visibleTasks.length ? Math.round((completedTasks / visibleTasks.length) * 100) : 0;
  const annotatedTasks = visibleTasks.filter(t => (annotations[t.id] || []).length > 0).length;
  const annotationCoverage = visibleTasks.length ? Math.round((annotatedTasks / visibleTasks.length) * 100) : 0;
  const productivity = Math.min(100, Math.round((totalAnnotations / Math.max(1, visibleTasks.length * 4)) * 100));

  const trend = range === "24 hours" ? [28, 34, 31, 45, 41, 56, 61, 68] : range === "30 days" ? [42, 48, 51, 57, 54, 65, 72, 81] : [35, 42, 39, 51, 48, 61, 66, 74];
  const maxTrend = Math.max(...trend);
  const teamRows = projects.slice(0, 5).map((p, index) => {
    const projectTasks = tasks.filter(t => t.projectId === p.id || t.projectName === p.name);
    const count = projectTasks.length || Math.max(1, Math.round(Number(p.completedImages || 0) / 20));
    const quality = reviewed.length ? Math.max(0, Math.min(100, averageQA + (index % 3) - 1)) : 96 - index;
    return { name: p.team || "Annotation Team", project: p.name, tasks: count, quality, progress: progressOf(p) };
  });

  return <div className="page analytics-page">
    <div className="page-head">
      <div><span className="eyebrow">PERFORMANCE INTELLIGENCE</span><h1>Analytics</h1><p>Monitor annotation productivity, quality, workload and project performance.</p></div>
      <div className="analytics-controls"><select value={range} onChange={e=>setRange(e.target.value)}><option>24 hours</option><option>7 days</option><option>30 days</option></select><select value={project} onChange={e=>setProject(e.target.value)}><option>All Projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
    </div>

    <div className="stats-grid analytics-stats">
      <StatCard icon={TrendingUp} label="Productivity" value={`${productivity}%`} meta={`${totalAnnotations} annotations recorded`} />
      <StatCard icon={CheckCircle2} label="Task Completion" value={`${completionRate}%`} meta={`${completedTasks} completed workflow tasks`} />
      <StatCard icon={ShieldCheck} label="QA Quality" value={reviewed.length ? `${averageQA}%` : "—"} meta={`${approved} approved · ${rejected} rejected`} />
      <StatCard icon={Target} label="Annotation Coverage" value={`${annotationCoverage}%`} meta={`${annotatedTasks} tasks annotated`} />
    </div>

    <div className="analytics-grid-top">
      <section className="panel analytics-chart-panel">
        <div className="panel-head"><div><h2>Annotation Productivity</h2><p>Relative output trend for the selected period</p></div><span className="chart-value">{totalAnnotations} <small>objects</small></span></div>
        <div className="trend-chart"><div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart-bars">{trend.map((v,i)=><div className="chart-bar-wrap" key={i}><div className="chart-bar" style={{height:`${Math.max(8,(v/maxTrend)*100)}%`}}></div><span>{range === "24 hours" ? `${i+1}h` : range === "30 days" ? `W${i+1}` : `D${i+1}`}</span></div>)}</div></div>
      </section>
      <section className="panel quality-panel">
        <div className="panel-head"><div><h2>QA Distribution</h2><p>Current review decisions</p></div><ClipboardCheck size={17}/></div>
        <div className="quality-ring"><div><strong>{reviewed.length ? `${averageQA}%` : "—"}</strong><span>avg score</span></div></div>
        <div className="quality-legend"><div><i className="approved-dot"></i><span>Approved</span><b>{approved}</b></div><div><i className="changes-dot"></i><span>Changes requested</span><b>{changes}</b></div><div><i className="rejected-dot"></i><span>Rejected</span><b>{rejected}</b></div></div>
      </section>
    </div>

    <div className="analytics-grid-bottom">
      <section className="panel analytics-table-panel"><div className="panel-head"><div><h2>Project Performance</h2><p>Progress and delivery health across projects</p></div><button className="text-btn">Export report →</button></div><div className="table-wrap"><table className="analytics-table"><thead><tr><th>PROJECT</th><th>TEAM</th><th>PROGRESS</th><th>QUALITY</th><th>HEALTH</th></tr></thead><tbody>{projects.map(p=><tr key={p.id}><td><b>{p.name}</b><small>{Number(p.totalImages||0).toLocaleString()} images</small></td><td>{p.team}</td><td><div className="table-progress"><span><i style={{width:`${progressOf(p)}%`}}></i></span><b>{progressOf(p)}%</b></div></td><td><strong className="quality-number">{reviewed.length ? `${Math.max(90, Math.min(100, averageQA + (p.id.charCodeAt(1) % 5) - 2))}%` : "—"}</strong></td><td><span className={`health-pill ${progressOf(p) >= 70 ? "healthy" : progressOf(p) >= 40 ? "watch" : "risk"}`}><i></i>{progressOf(p) >= 70 ? "On track" : progressOf(p) >= 40 ? "Watch" : "At risk"}</span></td></tr>)}</tbody></table></div></section>
      <section className="panel team-performance"><div className="panel-head"><div><h2>Team Performance</h2><p>Workload and quality snapshot</p></div><Users size={17}/></div><div className="team-list">{teamRows.length ? teamRows.map(row=><div className="team-row" key={row.project}><div className="team-avatar">{row.name.charAt(0)}</div><div className="team-main"><b>{row.name}</b><span>{row.project}</span><div className="team-meter"><i style={{width:`${Math.min(100, row.progress)}%`}}></i></div></div><div className="team-metrics"><strong>{row.quality}%</strong><span>{row.tasks} tasks</span></div></div>) : <div className="analytics-empty">No team data available.</div>}</div></section>
    </div>

    <div className="analytics-insight"><div className="insight-icon"><Zap size={17}/></div><div><b>Performance insight</b><p>{reviewed.length ? `The workspace is averaging ${averageQA}% QA quality. ${changes} task${changes === 1 ? " has" : "s have"} requested changes and should be prioritized for correction.` : "Complete a few QA reviews to unlock quality trends, rejection analysis and actionable performance insights."}</p></div><span>LIVE</span></div>
  </div>;
}

function TeamPage({members, allMembers, projects, tasks, stats, search, setSearch, roleFilter, setRoleFilter, statusFilter, setStatusFilter, onCreate, onEdit, onToggleStatus, onDelete, onAssign, message, modalOpen, setModalOpen, editing, form, setForm, onSave}) {
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
          <div className="team-detail-head"><div className="detail-profile"><div className="detail-avatar">{initials(selectedMember.name)}</div><div><h2>{selectedMember.name}</h2><p>{selectedMember.email}</p><div className="member-tags"><em className="role-pill">{selectedMember.role}</em><em className={`member-status ${selectedMember.status.toLowerCase()}`}><i></i>{selectedMember.status}</em></div></div></div><div className="detail-actions"><button className="secondary-btn" onClick={()=>onEdit(selectedMember)}><Edit3 size={14}/> Edit</button><button className="icon-btn" title={selectedMember.status === "Active" ? "Deactivate" : "Activate"} onClick={()=>onToggleStatus(selectedMember)}>{selectedMember.status === "Active" ? <Pause size={15}/> : <Play size={15}/>}</button><button className="icon-btn danger" title="Remove member" onClick={()=>onDelete(selectedMember)}><Trash2 size={15}/></button></div></div>
          <div className="detail-metrics"><div><span>Assigned</span><b>{assignedTasks.length}</b></div><div><span>Capacity</span><b>{selectedMember.capacity || 0}</b></div><div><span>Workload</span><b>{workload}%</b></div><div><span>QA Score</span><b>{selectedMember.qaScore ? `${selectedMember.qaScore}%` : "—"}</b></div></div>
          <div className="team-detail-section"><div className="section-title"><div><h3>Project Access</h3><p>Projects this member can work on</p></div><ShieldCheck size={16}/></div><div className="project-access-list">{(selectedMember.projects || []).length ? selectedMember.projects.map(id=><div key={id}><FolderKanban size={14}/><span>{projectName(id)}</span><Check size={14}/></div>) : <div className="no-access">No projects assigned.</div>}</div></div>
          <div className="team-detail-section"><div className="section-title"><div><h3>Current Assignments</h3><p>Tasks currently allocated to this member</p></div><span>{assignedTasks.length}</span></div>{assignedTasks.length ? <div className="assignment-list">{assignedTasks.map(task=><div className="assignment-row" key={task.id}><div className="assignment-thumb">{task.image ? <img src={task.image} alt=""/> : <ImageIcon size={15}/>}</div><div><b>{task.name}</b><span>{projectName(task.projectId)}</span></div><StatusBadge status={task.status}/><button className="icon-btn" onClick={()=>onAssign(task.id, "")} title="Unassign"><X size={14}/></button></div>)}</div> : <div className="team-empty compact"><ClipboardCheck size={25}/><p>No tasks assigned yet.</p></div>}</div>
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
  return <div className="modal-backdrop"><div className="modal team-modal"><div className="modal-head"><div><span className="eyebrow">TEAM MANAGEMENT</span><h2>{editing ? "Edit Team Member" : "Add Team Member"}</h2><p>Set role, availability, capacity and project access.</p></div><button className="icon-btn" onClick={onClose}><X size={17}/></button></div><form onSubmit={onSave}><div className="team-form-grid"><label><span>FULL NAME</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Rahul Kumar" autoFocus required/></label><label><span>EMAIL</span><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@company.com" required/></label><label><span>ROLE</span><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option>Annotator</option><option>Reviewer</option><option>Team Lead</option></select></label><label><span>STATUS</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Active</option><option>Inactive</option></select></label><label><span>TASK CAPACITY</span><input type="number" min="0" max="100" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/></label></div><div className="team-project-form"><span>PROJECT ACCESS</span><div>{projects.map(p=><button type="button" key={p.id} className={form.projects.includes(p.id)?"project-check active":"project-check"} onClick={()=>toggleProject(p.id)}><span>{form.projects.includes(p.id)?<Check size={13}/>:<span/>}</span><div><b>{p.name}</b><small>{p.client}</small></div></button>)}</div></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button type="submit" className="primary-btn"><Save size={14}/>{editing ? "Save Changes" : "Add Member"}</button></div></form></div></div>;
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

export default App;
