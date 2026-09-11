import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Database,
  Download,
  Edit3,
  FileText,
  FolderKanban,
  Grid3X3,
  LayoutDashboard,
  ListFilter,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";

import "./App.css";

const STORAGE_KEY = "annotatepro_projects";

const initialProjects = [
  {
    id: "PRJ-001",
    name: "Road Object Detection",
    client: "Mobility AI",
    annotationType: "Bounding Box",
    totalImages: 8450,
    completedImages: 6591,
    team: "Road Vision Team",
    status: "In Progress",
    startDate: "2026-09-01",
    dueDate: "2026-09-25",
    description:
      "Bounding box annotation for vehicles, pedestrians, bicycles, motorcycles and other road objects.",
  },
  {
    id: "PRJ-002",
    name: "Pavement Segmentation",
    client: "Urban Mapping",
    annotationType: "Segmentation",
    totalImages: 5280,
    completedImages: 4858,
    team: "Segmentation Team",
    status: "In Progress",
    startDate: "2026-08-25",
    dueDate: "2026-09-20",
    description:
      "Pixel-level segmentation of pavement and road surfaces from street-level imagery.",
  },
  {
    id: "PRJ-003",
    name: "Street Infrastructure",
    client: "City Intelligence",
    annotationType: "Polygon",
    totalImages: 12600,
    completedImages: 8064,
    team: "Infrastructure Team",
    status: "In Progress",
    startDate: "2026-08-20",
    dueDate: "2026-10-05",
    description:
      "Polygon annotation for poles, fences, buildings, electrical infrastructure and street objects.",
  },
  {
    id: "PRJ-004",
    name: "Traffic Sign Classification",
    client: "DriveSafe AI",
    annotationType: "Classification",
    totalImages: 3520,
    completedImages: 3520,
    team: "Classification Team",
    status: "Completed",
    startDate: "2026-08-01",
    dueDate: "2026-09-10",
    description:
      "Classification of traffic signs according to the project's predefined label taxonomy.",
  },
  {
    id: "PRJ-005",
    name: "Pedestrian Segmentation",
    client: "Vision Labs",
    annotationType: "Segmentation",
    totalImages: 6800,
    completedImages: 0,
    team: "Annotation Team",
    status: "Pending",
    startDate: "2026-09-15",
    dueDate: "2026-10-15",
    description:
      "Segmentation annotation for pedestrians and people in urban environments.",
  },
];

const emptyProject = {
  name: "",
  client: "",
  annotationType: "Bounding Box",
  totalImages: "",
  completedImages: "",
  team: "",
  status: "Pending",
  startDate: "",
  dueDate: "",
  description: "",
};

function getProgress(project) {
  if (!project.totalImages || project.totalImages <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, Math.round((project.completedImages / project.totalImages) * 100))
  );
}

function getRemaining(project) {
  return Math.max(
    0,
    Number(project.totalImages || 0) - Number(project.completedImages || 0)
  );
}

function normalizeProject(project) {
  const totalImages = Math.max(0, Number(project.totalImages || 0));
  const completedImages = Math.min(
    totalImages,
    Math.max(0, Number(project.completedImages || 0))
  );

  let status = project.status || "Pending";

  if (completedImages === totalImages && totalImages > 0) {
    status = "Completed";
  } else if (completedImages > 0) {
    status = "In Progress";
  } else if (status === "Completed" || status === "In Progress") {
    status = "Pending";
  }

  return {
    ...project,
    totalImages,
    completedImages,
    status,
  };
}

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [projects, setProjects] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        return JSON.parse(saved);
      }

      return initialProjects;
    } catch {
      return initialProjects;
    }
  });

  const [projectSearch, setProjectSearch] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState("All");
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectForm, setProjectForm] = useState(emptyProject);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const dashboardStats = useMemo(() => {
    const activeProjects = projects.filter(
      (project) => project.status !== "Completed"
    ).length;

    const totalImages = projects.reduce(
      (sum, project) => sum + Number(project.totalImages || 0),
      0
    );

    const remainingImages = projects.reduce(
      (sum, project) => sum + getRemaining(project),
      0
    );

    const completedImages = Math.max(0, totalImages - remainingImages);

    const overallQuality = projects.length
      ? 96.8
      : 0;

    return {
      activeProjects,
      totalImages,
      completedImages,
      remainingImages,
      teamMembers: 28,
      qualityScore: overallQuality,
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const search = projectSearch.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !search ||
        project.name.toLowerCase().includes(search) ||
        project.client.toLowerCase().includes(search) ||
        project.annotationType.toLowerCase().includes(search) ||
        project.team.toLowerCase().includes(search) ||
        project.id.toLowerCase().includes(search);

      const matchesStatus =
        projectStatusFilter === "All" ||
        project.status === projectStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, projectSearch, projectStatusFilter]);

  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "projects",
      label: "Projects",
      icon: FolderKanban,
    },
    {
      id: "workspace",
      label: "Annotation Workspace",
      icon: Grid3X3,
    },
    {
      id: "team",
      label: "Team",
      icon: Users,
    },
    {
      id: "qa",
      label: "QA & Reviews",
      icon: ClipboardCheck,
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
    },
    {
      id: "import",
      label: "Import Data",
      icon: Upload,
    },
    {
      id: "export",
      label: "Export",
      icon: Download,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  function navigate(page) {
    setActivePage(page);
    setSidebarOpen(false);
    setProfileOpen(false);
  }

  function openCreateProject() {
    setEditingProjectId(null);
    setProjectForm({
      ...emptyProject,
      startDate: new Date().toISOString().split("T")[0],
    });
    setProjectModalOpen(true);
  }

  function openEditProject(project) {
    setEditingProjectId(project.id);
    setProjectForm({
      name: project.name || "",
      client: project.client || "",
      annotationType: project.annotationType || "Bounding Box",
      totalImages: project.totalImages ?? "",
      completedImages: project.completedImages ?? "",
      team: project.team || "",
      status: project.status || "Pending",
      startDate: project.startDate || "",
      dueDate: project.dueDate || "",
      description: project.description || "",
    });
    setProjectModalOpen(true);
  }

  function openProjectDetails(project) {
    setSelectedProject(project);
    setProjectDetailsOpen(true);
  }

  function closeProjectModal() {
    setProjectModalOpen(false);
    setEditingProjectId(null);
    setProjectForm(emptyProject);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setProjectForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSaveProject(event) {
    event.preventDefault();

    if (!projectForm.name.trim()) {
      alert("Please enter a project name.");
      return;
    }

    if (!projectForm.client.trim()) {
      alert("Please enter a client name.");
      return;
    }

    const totalImages = Number(projectForm.totalImages);

    if (!Number.isFinite(totalImages) || totalImages <= 0) {
      alert("Please enter a valid total number of images.");
      return;
    }

    const completedImages = Number(projectForm.completedImages || 0);

    if (
      !Number.isFinite(completedImages) ||
      completedImages < 0 ||
      completedImages > totalImages
    ) {
      alert("Completed images must be between 0 and total images.");
      return;
    }

    const project = normalizeProject({
      id:
        editingProjectId ||
        `PRJ-${String(Date.now()).slice(-6)}`,
      name: projectForm.name.trim(),
      client: projectForm.client.trim(),
      annotationType: projectForm.annotationType,
      totalImages,
      completedImages,
      team: projectForm.team.trim() || "Unassigned",
      status: projectForm.status,
      startDate: projectForm.startDate,
      dueDate: projectForm.dueDate,
      description: projectForm.description.trim(),
    });

    if (editingProjectId) {
      setProjects((current) =>
        current.map((item) =>
          item.id === editingProjectId ? project : item
        )
      );

      if (selectedProject?.id === editingProjectId) {
        setSelectedProject(project);
      }
    } else {
      setProjects((current) => [project, ...current]);
    }

    closeProjectModal();
  }

  function handleDeleteProject(project) {
    const confirmed = window.confirm(
      `Delete "${project.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setProjects((current) =>
      current.filter((item) => item.id !== project.id)
    );

    setProjectDetailsOpen(false);

    if (selectedProject?.id === project.id) {
      setSelectedProject(null);
    }
  }

  function resetProjectFilters() {
    setProjectSearch("");
    setProjectStatusFilter("All");
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Target size={21} strokeWidth={2.5} />
          </div>

          <div>
            <div className="brand-name">AnnotatePro</div>
            <div className="brand-subtitle">Annotation Platform</div>
          </div>

          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="workspace-selector">
          <div className="workspace-icon">
            <Database size={17} />
          </div>

          <div className="workspace-copy">
            <span>Workspace</span>
            <strong>Annotation Team</strong>
          </div>

          <ChevronDown size={16} />
        </div>

        <div className="sidebar-section-label">MAIN MENU</div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;

            return (
              <button
                key={item.id}
                className={`nav-item ${active ? "nav-item-active" : ""}`}
                onClick={() => navigate(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="avatar">M</div>

            <div className="user-copy">
              <strong>Manjunath</strong>
              <span>Team Lead</span>
            </div>

            <button
              className="user-menu-button"
              onClick={() => setProfileOpen((current) => !current)}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            <div className="breadcrumb">
              <span>Workspace</span>
              <span className="breadcrumb-separator">/</span>
              <strong>
                {activePage === "dashboard"
                  ? "Dashboard"
                  : navItems.find((item) => item.id === activePage)?.label ||
                    "Dashboard"}
              </strong>
            </div>
          </div>

          <div className="topbar-right">
            <div className="global-search">
              <Search size={17} />
              <input placeholder="Search..." />
              <span className="search-shortcut">⌘ K</span>
            </div>

            <button className="icon-button notification-button">
              <Bell size={19} />
              <span className="notification-dot" />
            </button>

            <div className="profile-wrapper">
              <button
                className="profile-button"
                onClick={() => setProfileOpen((current) => !current)}
              >
                <div className="avatar avatar-small">M</div>

                <div className="profile-copy">
                  <strong>Manjunath</strong>
                  <span>Team Lead</span>
                </div>

                <ChevronDown size={15} />
              </button>

              {profileOpen && (
                <div className="profile-dropdown">
                  <button onClick={() => navigate("settings")}>
                    <Settings size={16} />
                    Account Settings
                  </button>
                  <button onClick={() => navigate("dashboard")}>
                    <LayoutDashboard size={16} />
                    Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-content">
          {activePage === "dashboard" && (
            <DashboardPage
              projects={projects}
              stats={dashboardStats}
              onCreateProject={openCreateProject}
              onOpenProjects={() => navigate("projects")}
              onOpenProject={openProjectDetails}
            />
          )}

          {activePage === "projects" && (
            <ProjectsPage
              projects={projects}
              filteredProjects={filteredProjects}
              search={projectSearch}
              setSearch={setProjectSearch}
              statusFilter={projectStatusFilter}
              setStatusFilter={setProjectStatusFilter}
              onCreate={openCreateProject}
              onEdit={openEditProject}
              onDelete={handleDeleteProject}
              onView={openProjectDetails}
              onResetFilters={resetProjectFilters}
            />
          )}

          {activePage === "workspace" && (
            <PlaceholderPage
              title="Annotation Workspace"
              description="The annotation canvas will be built next."
              icon={Grid3X3}
            />
          )}

          {activePage === "team" && (
            <PlaceholderPage
              title="Team"
              description="Team management will be built after the core project flow."
              icon={Users}
            />
          )}

          {activePage === "qa" && (
            <PlaceholderPage
              title="QA & Reviews"
              description="Quality review workflows will be added in the next module."
              icon={ClipboardCheck}
            />
          )}

          {activePage === "analytics" && (
            <PlaceholderPage
              title="Analytics"
              description="Project and annotation analytics will be connected later."
              icon={BarChart3}
            />
          )}

          {activePage === "import" && (
            <PlaceholderPage
              title="Import Data"
              description="Image and dataset import tools will be added later."
              icon={Upload}
            />
          )}

          {activePage === "export" && (
            <PlaceholderPage
              title="Export"
              description="Annotation export options will be added later."
              icon={Download}
            />
          )}

          {activePage === "settings" && (
            <PlaceholderPage
              title="Settings"
              description="Workspace and application settings will be added later."
              icon={Settings}
            />
          )}
        </div>
      </main>

      {projectModalOpen && (
        <ProjectFormModal
          editing={Boolean(editingProjectId)}
          form={projectForm}
          onChange={handleFormChange}
          onClose={closeProjectModal}
          onSubmit={handleSaveProject}
        />
      )}

      {projectDetailsOpen && selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          onClose={() => setProjectDetailsOpen(false)}
          onEdit={() => {
            setProjectDetailsOpen(false);
            openEditProject(selectedProject);
          }}
          onDelete={() => handleDeleteProject(selectedProject)}
        />
      )}
    </div>
  );
}

function DashboardPage({
  projects,
  stats,
  onCreateProject,
  onOpenProjects,
  onOpenProject,
}) {
  const recentProjects = projects.slice(0, 4);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">OVERVIEW</div>
          <h1>Good evening, Manjunath</h1>
          <p>
            Here&apos;s what&apos;s happening across your annotation workspace.
          </p>
        </div>

        <button className="primary-button" onClick={onCreateProject}>
          <Plus size={18} />
          Create Project
        </button>
      </div>

      <section className="stats-grid">
        <StatCard
          icon={FolderKanban}
          label="Active Projects"
          value={stats.activeProjects}
          trend="+2 this month"
          positive
        />

        <StatCard
          icon={Database}
          label="Images to Annotate"
          value={stats.remainingImages.toLocaleString()}
          trend={`${stats.completedImages.toLocaleString()} completed`}
          positive
        />

        <StatCard
          icon={Users}
          label="Team Members"
          value={stats.teamMembers}
          trend="+4 this month"
          positive
        />

        <StatCard
          icon={ShieldCheck}
          label="Quality Score"
          value={`${stats.qualityScore}%`}
          trend="+1.4% this month"
          positive
        />
      </section>

      <section className="dashboard-grid">
        <div className="panel panel-large">
          <div className="panel-header">
            <div>
              <h2>Active Projects</h2>
              <p>Current annotation project progress</p>
            </div>

            <button className="text-button" onClick={onOpenProjects}>
              View all
            </button>
          </div>

          <div className="project-table-wrap">
            <table className="project-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Images</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {recentProjects.map((project) => {
                  const progress = getProgress(project);

                  return (
                    <tr
                      key={project.id}
                      className="table-clickable"
                      onClick={() => onOpenProject(project)}
                    >
                      <td>
                        <div className="table-project">
                          <div className="project-icon">
                            <FolderKanban size={17} />
                          </div>

                          <div>
                            <strong>{project.name}</strong>
                            <span>{project.client}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="type-badge">
                          {project.annotationType}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {project.totalImages.toLocaleString()}
                        </strong>
                      </td>

                      <td>
                        <div className="progress-cell">
                          <div className="progress-topline">
                            <span>{progress}%</span>
                            <small>
                              {getRemaining(project).toLocaleString()} left
                            </small>
                          </div>

                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td>
                        <StatusBadge status={project.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Recent Activity</h2>
              <p>Latest workspace updates</p>
            </div>

            <Activity size={18} className="panel-muted-icon" />
          </div>

          <div className="activity-list">
            <ActivityItem
              icon={CheckCircle2}
              title="Traffic Sign Classification completed"
              time="Today, 5:42 PM"
            />

            <ActivityItem
              icon={Users}
              title="4 new annotators joined"
              time="Today, 3:15 PM"
            />

            <ActivityItem
              icon={ShieldCheck}
              title="Quality score increased to 96.8%"
              time="Today, 12:40 PM"
            />

            <ActivityItem
              icon={FolderKanban}
              title="Street Infrastructure updated"
              time="Yesterday, 6:20 PM"
            />

            <ActivityItem
              icon={ClipboardCheck}
              title="23 reviews completed"
              time="Yesterday, 4:05 PM"
            />
          </div>
        </div>
      </section>

      <section className="quick-actions-section">
        <div className="section-title-row">
          <div>
            <h2>Quick Actions</h2>
            <p>Common tasks for your workspace</p>
          </div>
        </div>

        <div className="quick-actions-grid">
          <QuickAction
            icon={Zap}
            title="Start Annotating"
            description="Open your active annotation queue"
          />

          <QuickAction
            icon={ClipboardCheck}
            title="Pending Reviews"
            description="Review annotations waiting for QA"
          />

          <QuickAction
            icon={TrendingUp}
            title="View Analytics"
            description="Monitor team and project performance"
          />
        </div>
      </section>
    </>
  );
}

function ProjectsPage({
  projects,
  filteredProjects,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  onCreate,
  onEdit,
  onDelete,
  onView,
  onResetFilters,
}) {
  const totalImages = projects.reduce(
    (sum, project) => sum + Number(project.totalImages || 0),
    0
  );

  const completedImages = projects.reduce(
    (sum, project) => sum + Number(project.completedImages || 0),
    0
  );

  const remainingImages = Math.max(0, totalImages - completedImages);

  const completedProjects = projects.filter(
    (project) => project.status === "Completed"
  ).length;

  const inProgressProjects = projects.filter(
    (project) => project.status === "In Progress"
  ).length;

  return (
    <>
      <div className="page-header projects-page-header">
        <div>
          <div className="eyebrow">WORKSPACE</div>
          <h1>Projects</h1>
          <p>
            Create, manage and monitor all annotation projects from one place.
          </p>
        </div>

        <button className="primary-button" onClick={onCreate}>
          <Plus size={18} />
          Create Project
        </button>
      </div>

      <section className="project-summary-grid">
        <MiniStat
          icon={FolderKanban}
          label="Total Projects"
          value={projects.length}
        />

        <MiniStat
          icon={Activity}
          label="In Progress"
          value={inProgressProjects}
        />

        <MiniStat
          icon={CheckCircle2}
          label="Completed"
          value={completedProjects}
        />

        <MiniStat
          icon={Database}
          label="Remaining Images"
          value={remainingImages.toLocaleString()}
        />
      </section>

      <section className="panel projects-panel">
        <div className="projects-toolbar">
          <div className="projects-search">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects, clients, teams..."
            />

            {search && (
              <button
                className="clear-search"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="filter-group">
            <div className="filter-label">
              <ListFilter size={16} />
              Status
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All Projects</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Paused">Paused</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="projects-result-bar">
          <div>
            Showing <strong>{filteredProjects.length}</strong> of{" "}
            <strong>{projects.length}</strong> projects
          </div>

          {(search || statusFilter !== "All") && (
            <button className="clear-filter-button" onClick={onResetFilters}>
              Clear filters
            </button>
          )}
        </div>

        {filteredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Search size={24} />
            </div>
            <h3>No projects found</h3>
            <p>
              Try changing your search or status filter, or create a new
              project.
            </p>
            <button className="secondary-button" onClick={onResetFilters}>
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="projects-list">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onView={() => onView(project)}
                onEdit={() => onEdit(project)}
                onDelete={() => onDelete(project)}
              />
            ))}
          </div>
        )}

        <div className="projects-footer-summary">
          <div>
            <span>Total images</span>
            <strong>{totalImages.toLocaleString()}</strong>
          </div>

          <div>
            <span>Completed</span>
            <strong>{completedImages.toLocaleString()}</strong>
          </div>

          <div>
            <span>Remaining</span>
            <strong>{remainingImages.toLocaleString()}</strong>
          </div>
        </div>
      </section>
    </>
  );
}

function ProjectCard({ project, onView, onEdit, onDelete }) {
  const progress = getProgress(project);
  const remaining = getRemaining(project);

  return (
    <div className="project-card">
      <div className="project-card-main">
        <div className="project-card-icon">
          <FolderKanban size={21} />
        </div>

        <div className="project-card-content">
          <div className="project-card-title-row">
            <div>
              <button className="project-name-button" onClick={onView}>
                {project.name}
              </button>

              <div className="project-meta">
                <span>{project.id}</span>
                <span className="meta-dot">•</span>
                <span>{project.client}</span>
              </div>
            </div>

            <StatusBadge status={project.status} />
          </div>

          <div className="project-card-details">
            <div className="detail-item">
              <span>Annotation Type</span>
              <strong>{project.annotationType}</strong>
            </div>

            <div className="detail-item">
              <span>Team</span>
              <strong>{project.team}</strong>
            </div>

            <div className="detail-item">
              <span>Total Images</span>
              <strong>{project.totalImages.toLocaleString()}</strong>
            </div>

            <div className="detail-item">
              <span>Remaining</span>
              <strong>{remaining.toLocaleString()}</strong>
            </div>

            <div className="detail-item">
              <span>Due Date</span>
              <strong>
                {project.dueDate ? formatDate(project.dueDate) : "Not set"}
              </strong>
            </div>
          </div>

          <div className="project-card-progress">
            <div className="progress-topline">
              <span>Progress</span>
              <strong>{progress}%</strong>
            </div>

            <div className="progress-track progress-track-large">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="progress-bottomline">
              <span>
                {project.completedImages.toLocaleString()} completed
              </span>

              <span>{remaining.toLocaleString()} remaining</span>
            </div>
          </div>
        </div>

        <div className="project-card-actions">
          <button
            className="card-action-button"
            onClick={onEdit}
            title="Edit project"
          >
            <Edit3 size={17} />
          </button>

          <button
            className="card-action-button danger"
            onClick={onDelete}
            title="Delete project"
          >
            <Trash2 size={17} />
          </button>

          <button
            className="card-action-button"
            onClick={onView}
            title="View project"
          >
            <ChevronDown
              size={17}
              className="view-arrow-icon"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectFormModal({
  editing,
  form,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal project-form-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="eyebrow">
              {editing ? "EDIT PROJECT" : "NEW PROJECT"}
            </div>

            <h2>{editing ? "Edit Project" : "Create Project"}</h2>

            <p>
              {editing
                ? "Update project details and annotation progress."
                : "Set up a new annotation project."}
            </p>
          </div>

          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="form-field form-field-wide">
              <label>
                Project Name <span>*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="e.g. Road Object Detection"
                required
              />
            </div>

            <div className="form-field">
              <label>
                Client <span>*</span>
              </label>
              <input
                name="client"
                value={form.client}
                onChange={onChange}
                placeholder="Client or organization"
                required
              />
            </div>

            <div className="form-field">
              <label>Annotation Type</label>
              <select
                name="annotationType"
                value={form.annotationType}
                onChange={onChange}
              >
                <option>Bounding Box</option>
                <option>Segmentation</option>
                <option>Polygon</option>
                <option>Classification</option>
                <option>Keypoints</option>
                <option>Polyline</option>
                <option>Cuboid</option>
              </select>
            </div>

            <div className="form-field">
              <label>
                Total Images <span>*</span>
              </label>
              <input
                type="number"
                name="totalImages"
                min="1"
                value={form.totalImages}
                onChange={onChange}
                placeholder="10000"
                required
              />
            </div>

            <div className="form-field">
              <label>Completed Images</label>
              <input
                type="number"
                name="completedImages"
                min="0"
                value={form.completedImages}
                onChange={onChange}
                placeholder="0"
              />
            </div>

            <div className="form-field">
              <label>Assigned Team</label>
              <input
                name="team"
                value={form.team}
                onChange={onChange}
                placeholder="e.g. Annotation Team"
              />
            </div>

            <div className="form-field">
              <label>Project Status</label>
              <select
                name="status"
                value={form.status}
                onChange={onChange}
              >
                <option>Pending</option>
                <option>In Progress</option>
                <option>Paused</option>
                <option>Completed</option>
              </select>
            </div>

            <div className="form-field">
              <label>Start Date</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={onChange}
              />
            </div>

            <div className="form-field">
              <label>Due Date</label>
              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={onChange}
              />
            </div>

            <div className="form-field form-field-wide">
              <label>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                rows="4"
                placeholder="Describe the annotation project..."
              />
            </div>
          </div>

          <div className="form-help">
            <AlertCircle size={16} />
            Remaining images and progress are calculated automatically from
            total and completed images.
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button type="submit" className="primary-button">
              {editing ? (
                <>
                  <CheckCircle2 size={17} />
                  Save Changes
                </>
              ) : (
                <>
                  <Plus size={17} />
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectDetailsModal({
  project,
  onClose,
  onEdit,
  onDelete,
}) {
  const progress = getProgress(project);
  const remaining = getRemaining(project);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal project-details-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="details-heading">
            <div className="details-project-icon">
              <FolderKanban size={23} />
            </div>

            <div>
              <div className="eyebrow">{project.id}</div>
              <h2>{project.name}</h2>
              <p>{project.client}</p>
            </div>
          </div>

          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="details-status-row">
          <StatusBadge status={project.status} />

          <span className="details-type">
            {project.annotationType}
          </span>
        </div>

        <div className="details-progress-box">
          <div className="details-progress-heading">
            <div>
              <span>Overall Progress</span>
              <strong>{progress}%</strong>
            </div>

            <div className="details-progress-numbers">
              <span>
                {project.completedImages.toLocaleString()} completed
              </span>
              <span>
                {remaining.toLocaleString()} remaining
              </span>
            </div>
          </div>

          <div className="progress-track progress-track-large">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="details-grid">
          <DetailBox
            icon={Database}
            label="Total Images"
            value={project.totalImages.toLocaleString()}
          />

          <DetailBox
            icon={CheckCircle2}
            label="Completed"
            value={project.completedImages.toLocaleString()}
          />

          <DetailBox
            icon={Clock3}
            label="Remaining"
            value={remaining.toLocaleString()}
          />

          <DetailBox
            icon={Users}
            label="Assigned Team"
            value={project.team || "Unassigned"}
          />

          <DetailBox
            icon={Calendar}
            label="Start Date"
            value={project.startDate ? formatDate(project.startDate) : "Not set"}
          />

          <DetailBox
            icon={Calendar}
            label="Due Date"
            value={project.dueDate ? formatDate(project.dueDate) : "Not set"}
          />
        </div>

        <div className="details-description">
          <h3>Description</h3>
          <p>
            {project.description ||
              "No project description has been added yet."}
          </p>
        </div>

        <div className="modal-footer details-footer">
          <button className="danger-button" onClick={onDelete}>
            <Trash2 size={17} />
            Delete
          </button>

          <div className="details-footer-right">
            <button className="secondary-button" onClick={onClose}>
              Close
            </button>

            <button className="primary-button" onClick={onEdit}>
              <Edit3 size={17} />
              Edit Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailBox({ icon: Icon, label, value }) {
  return (
    <div className="detail-box">
      <div className="detail-box-icon">
        <Icon size={17} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  positive,
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className="stat-icon">
          <Icon size={19} />
        </div>

        <span className="stat-menu">
          <MoreHorizontal size={17} />
        </span>
      </div>

      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>

      <div className={`stat-trend ${positive ? "positive" : ""}`}>
        <TrendingUp size={14} />
        {trend}
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="mini-stat">
      <div className="mini-stat-icon">
        <Icon size={18} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const icon =
    status === "Completed"
      ? CheckCircle2
      : status === "Paused"
        ? AlertCircle
        : status === "In Progress"
          ? Activity
          : Clock3;

  const Icon = icon;

  return (
    <span className={`status-badge status-${status.toLowerCase().replace(/\s+/g, "-")}`}>
      <Icon size={13} />
      {status}
    </span>
  );
}

function ActivityItem({ icon: Icon, title, time }) {
  return (
    <div className="activity-item">
      <div className="activity-icon">
        <Icon size={16} />
      </div>

      <div className="activity-copy">
        <strong>{title}</strong>
        <span>{time}</span>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, description }) {
  return (
    <button className="quick-action">
      <div className="quick-action-icon">
        <Icon size={20} />
      </div>

      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <ChevronDown className="quick-action-arrow" size={17} />
    </button>
  );
}

function PlaceholderPage({ title, description, icon: Icon }) {
  return (
    <div className="placeholder-page">
      <div className="placeholder-icon">
        <Icon size={28} />
      </div>

      <div className="eyebrow">COMING NEXT</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

function formatDate(dateString) {
  if (!dateString) {
    return "Not set";
  }

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default App;