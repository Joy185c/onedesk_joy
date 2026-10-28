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

export type ChannelType = 'public' | 'private' | 'dm';

export interface Channel {
  id: string;
  workspaceId: string;
  projectId?: string;
  projectName?: string;
  projectKey?: string;
  name: string;
  description?: string;
  type: ChannelType;
  topic?: string;
  isArchived: boolean;
  unreadCount?: number;
  members?: UserProfile[];
  lastMessage?: {
    body: string;
    createdAt: string;
    authorName: string;
  };
}

export interface ChatMessage {
  id: string;
  channelId: string;
  author: UserProfile;
  parentMessageId?: string;
  body: string;
  attachments?: any[];
  isPinned?: boolean;
  isEdited?: boolean;
  createdAt: string;
  reactions?: { emoji: string; count: number; userIds: string[] }[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  author: UserProfile;
  parentCommentId?: string;
  content: string;
  attachments?: any[];
  isEdited?: boolean;
  createdAt: string;
}

export type NotificationType =
  | 'mention'
  | 'assigned'
  | 'review_requested'
  | 'review_decided'
  | 'comment'
  | 'system'
  | 'invitation';

export interface AppNotification {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  workspaceSlug?: string;
  recipientId: string;
  actor?: UserProfile;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

// ------------------------------------------------------------------------------
// Phase 5: Productivity Types
// ------------------------------------------------------------------------------

export interface DocumentItem {
  id: string;
  workspaceId: string;
  projectId?: string;
  projectName?: string;
  parentDocId?: string;
  title: string;
  content: string;
  icon?: string;
  isPublished: boolean;
  author?: UserProfile;
  createdAt: string;
  updatedAt: string;
}

export type GoalStatus = 'on_track' | 'at_risk' | 'off_track' | 'completed';

export interface KeyResult {
  id: string;
  goalId: string;
  title: string;
  initialValue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
}

export interface Goal {
  id: string;
  workspaceId: string;
  projectId?: string;
  projectName?: string;
  title: string;
  description?: string;
  status: GoalStatus;
  progressPercent: number;
  targetDate?: string;
  owner?: UserProfile;
  keyResults?: KeyResult[];
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  workspaceId: string;
  projectId: string;
  projectName?: string;
  projectKey?: string;
  taskId?: string;
  taskTitle?: string;
  taskNumber?: number;
  user: UserProfile;
  durationMinutes: number;
  description?: string;
  entryDate: string;
  createdAt: string;
}

export interface Sprint {
  id: string;
  workspaceId: string;
  projectId: string;
  projectName?: string;
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  status: 'planning' | 'active' | 'completed';
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'task' | 'milestone' | 'goal' | 'sprint';
  priority?: TaskPriority;
  projectKey?: string;
  projectName?: string;
  projectId?: string;
  taskId?: string;
  status?: string;
}



