export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest';
export type ProjectRole = 'owner' | 'manager' | 'contributor' | 'viewer';
export type ProjectVisibility = 'public_in_workspace' | 'private';
export type ProjectHealth = 'on_track' | 'at_risk' | 'off_track';
export type TaskStatus = 'todo' | 'in_progress' | 'ready_for_review' | 'completed' | 'blocked';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  initials: string;
  role: string; // Job title e.g. "Senior Frontend Engineer"
  status?: 'online' | 'busy' | 'away' | 'offline';
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  logoUrl?: string;
  planName?: string;
  membersCount: number;
  projectsCount: number;
}

export interface Space {
  id: string;
  workspaceId: string;
  name: string;
  icon?: string;
  color?: string;
  folders?: Folder[];
  projects?: ProjectSummary[];
}

export interface Folder {
  id: string;
  spaceId: string;
  name: string;
  projects: ProjectSummary[];
}

export interface ProjectSummary {
  id: string;
  key: string; // e.g. "WEB", "MOB"
  name: string;
  spaceId: string;
  folderId?: string;
  health: ProjectHealth;
  progressPercent: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  pendingReviews: number;
  targetDate: string;
  members: UserProfile[];
  lead: UserProfile;
}

export interface Task {
  id: string;
  taskNumber: number;
  projectId: string;
  projectKey: string;
  projectName: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assignees: UserProfile[];
  estimatedHours?: number;
  loggedHours?: number;
  storyPoints?: number;
  reviewRequired: boolean;
  isBlocked?: boolean;
  blockReason?: string;
  subtaskCount: number;
  completedSubtasks: number;
  commentsCount: number;
}

export interface ReviewRequest {
  id: string;
  taskId: string;
  taskTitle: string;
  projectKey: string;
  projectName: string;
  submitter: UserProfile;
  reviewer: UserProfile;
  submittedAt: string;
  state: 'pending' | 'approved' | 'changes_requested';
  submissionNote?: string;
}

export interface TeamMemberWorkload {
  user: UserProfile;
  assignedTasksCount: number;
  capacityHours: number;
  assignedHours: number;
  overdueTasksCount: number;
}

export interface ActivityItem {
  id: string;
  actor: UserProfile;
  action: 'created_task' | 'updated_status' | 'submitted_review' | 'approved_review' | 'commented' | 'created_project';
  targetTitle: string;
  targetType: 'task' | 'project' | 'review' | 'document';
  targetUrl: string;
  timestamp: string;
  projectName: string;
}

export interface ExecutiveKpiData {
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  pendingApprovals: number;
  overallVelocity: number; // tasks completed per week
  weeklyProgressTrend: { day: string; completed: number; created: number }[];
}

