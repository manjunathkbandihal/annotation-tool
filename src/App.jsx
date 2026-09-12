import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertCircle, BarChart3, Bell, Calendar, CheckCircle2, ChevronDown,
  ClipboardCheck, Clock3, Copy, Database, Download, Edit3, Eye, FileText,
  FolderKanban, Grid3X3, Image as ImageIcon, LayoutDashboard, ListFilter, Menu,
  Minus, MoreHorizontal, Move, MousePointer2, PanelRight, Pause, Play, Plus,
  Redo2, RotateCcw, Save, Search, Settings, ShieldCheck, Square, Target, Trash2,
  TrendingUp, Undo2, Upload, Users, X, ZoomIn, ZoomOut
} from "lucide-react";
import "./App.css";

const PROJECTS_KEY = "annotatepro_projects_v2";
const TASKS_KEY = "annotatepro_tasks_v1";

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
  { id: "task-001", name: "road_scene_001.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=85" },
  { id: "task-002", name: "road_scene_002.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=1600&q=85" },
  { id: "task-003", name: "road_scene_003.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1600&q=85" },
  { id: "task-004", name: "street_scene_004.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1600&q=85" },
  { id: "task-005", name: "street_scene_005.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=85" },
  { id: "task-006", name: "traffic_scene_006.jpg", status: "Pending", image: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1600&q=85" }
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
  const [showShortcuts, setShowShortcuts] = useState(false);
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
    setTasks(prev => prev.map((t, i) => i === selectedTaskIndex ? { ...t, status: "Completed" } : t));
    setWorkspaceMessage("Task submitted");
    setTimeout(() => setWorkspaceMessage(""), 1800);
  }

  function importImages(files) {
    const next = Array.from(files || []).map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      name: file.name,
      status: "Pending",
      image: URL.createObjectURL(file)
    }));
    if (!next.length) return;
    setTasks(prev => [...prev, ...next]);
    setSelectedTaskIndex(tasks.length);
    setImageUploadOpen(false);
    navigate("Annotation Workspace");
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
        {activePage === "Team" && <SimplePage title="Team" subtitle="Manage annotators, reviewers and workload." icon={Users} stats={["28 Members", "22 Annotators", "6 Reviewers"]} />}
        {activePage === "QA & Reviews" && <SimplePage title="QA & Reviews" subtitle="Review submitted annotations and manage quality." icon={ClipboardCheck} stats={["7 Pending Reviews", "96.8% Quality", "3 Rejected"]} />}
        {activePage === "Analytics" && <SimplePage title="Analytics" subtitle="Monitor productivity, quality and project performance." icon={BarChart3} stats={["1,248 Completed", "96.8% Quality", "84% Productivity"]} />}
        {activePage === "Import Data" && <ImportPage onImport={() => imageInputRef.current?.click()} onCsv={() => setImportOpen(true)} />}
        {activePage === "Export" && <ExportPage tasks={tasks} annotations={annotationsByTask} />}
        {activePage === "Settings" && <SimplePage title="Settings" subtitle="Configure workspace and annotation preferences." icon={Settings} stats={["Autosave On", "Shortcuts On", "Local Storage"]} />}

        <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={e => importImages(e.target.files)} />
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

function ImportPage({onImport,onCsv}) {
  return <div className="page"><div className="page-head"><div><span className="eyebrow">DATASET</span><h1>Import Data</h1><p>Add images and task data to your annotation workspace.</p></div></div><div className="import-grid"><div className="import-card" onClick={onImport}><div className="import-icon"><Upload size={22}/></div><h3>Import Images</h3><p>Upload JPG, PNG, WEBP and other image files. Multiple files are supported.</p><button className="primary-btn">Choose Images</button></div><div className="import-card" onClick={onCsv}><div className="import-icon"><FileText size={22}/></div><h3>Import Task Data</h3><p>Prepare CSV or JSON task records for bulk annotation workflows.</p><button className="secondary-btn">Open Import Guide</button></div><div className="import-card"><div className="import-icon"><Database size={22}/></div><h3>Dataset Structure</h3><p>Each imported image becomes a task with a status, annotation collection and review state.</p><button className="secondary-btn">View Structure</button></div></div></div>;
}

function ExportPage({tasks,annotations}) {
  function exportJson(){const blob=new Blob([JSON.stringify({tasks,annotations},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="annotatepro-export.json";a.click();}
  return <div className="page"><div className="page-head"><div><span className="eyebrow">DATASET</span><h1>Export</h1><p>Export tasks and annotations from this workspace.</p></div></div><div className="export-card"><div className="export-icon"><Download size={24}/></div><div><h2>AnnotatePro JSON</h2><p>Exports task metadata and all saved annotations in a portable JSON structure.</p><div className="export-stats"><span><b>{tasks.length}</b> Tasks</span><span><b>{Object.values(annotations).flat().length}</b> Annotations</span></div></div><button className="primary-btn" onClick={exportJson}><Download size={16}/> Export JSON</button></div></div>;
}

function ImportModal({onClose,onImport}) {
  return <div className="modal-backdrop"><div className="modal small-modal"><div className="modal-head"><div><span className="eyebrow">IMPORT</span><h2>Task Data</h2></div><button className="modal-close" onClick={onClose}><X size={19}/></button></div><div className="guide"><FileText size={30}/><h3>CSV / JSON task import</h3><p>The next data-import build will map external task records directly into the queue. For now, use the image importer to create real tasks immediately.</p><div className="code-sample">{"{ \"data\": { \"image\": \"image-url\" } }"}</div></div><div className="modal-foot"><button className="secondary-btn" onClick={onClose}>Close</button><button className="primary-btn" onClick={onImport}><Upload size={16}/> Import Images</button></div></div></div>;
}

function Shortcuts({onClose}) {
  const rows=[["V","Select"],["B","Bounding Box"],["P","Polygon"],["L","Line"],["Space","Pan"],["Delete","Delete selected"],["Ctrl + Z","Undo"],["Ctrl + Shift + Z","Redo"],["+ / -","Zoom"],["← / →","Previous / next task"]];
  return <div className="modal-backdrop"><div className="modal shortcuts-modal"><div className="modal-head"><div><span className="eyebrow">WORKSPACE</span><h2>Keyboard shortcuts</h2></div><button className="modal-close" onClick={onClose}><X size={19}/></button></div><div className="shortcut-list">{rows.map(r=><div key={r[0]}><kbd>{r[0]}</kbd><span>{r[1]}</span></div>)}</div></div></div>;
}

function SimplePage({title,subtitle,icon:Icon,stats}) {
  return <div className="page"><div className="page-head"><div><span className="eyebrow">ANNOTATEPRO</span><h1>{title}</h1><p>{subtitle}</p></div></div><div className="stats-grid">{stats.map((s,i)=><StatCard key={s} icon={[Activity,Target,ShieldCheck,TrendingUp][i%4]} label={s.split(" ").slice(1).join(" ")} value={s.split(" ")[0]} meta="Workspace metric"/></div><section className="panel placeholder-large"><Icon size={42}/><h2>{title} module</h2><p>This module is connected to the AnnotatePro application shell. The full operational workflow will use the same shared project and task data.</p></section></div>;
}

function StatCard({icon:Icon,label,value,meta}){return <div className="stat-card"><div className="stat-icon"><Icon size={19}/></div><div><span>{label}</span><strong>{value}</strong><small><TrendingUp size={12}/> {meta}</small></div></div>}
function MiniStat({label,value}){return <div className="mini-stat"><span>{label}</span><b>{value}</b></div>}
function StatusBadge({status}){const cls=status==="Completed"?"completed":status==="In Progress"?"progressing":"pending";return <span className={`status-badge ${cls}`}><i></i>{status}</span>}
function ActivityRow({icon:Icon,title,text,time}){return <div className="activity-row"><div className="activity-icon"><Icon size={16}/></div><div><b>{title}</b><span>{text}</span></div><time>{time}</time></div>}
function Quick({icon:Icon,title,onClick}){return <button className="quick-action" onClick={onClick}><span><Icon size={17}/></span><b>{title}</b><em>→</em></button>}
function Detail({label,value}){return <div className="detail-box"><span>{label}</span><b>{value}</b></div>}

export default App;
