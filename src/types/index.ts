export type Project = {
  id: string;
  name: string;
  description: string;
  goal: string;
  notes: string;
  icon: string;
  color: string;
  tags: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
};
export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  notes: string;
  status: string;
  priority: string;
  preferredApp: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};
export type Asset = {
  id: string;
  projectId: string;
  taskId: string | null;
  title: string;
  type: string;
  content: string;
  url: string;
  fileId: string | null;
  sourceApp: string;
  activityId: string | null;
  prompt: string;
  notes: string;
  createdAt: string;
};
export type StoredFile = {
  id: string;
  projectId: string;
  name: string;
  mime: string;
  size: number;
  path: string;
  createdAt: string;
};
export type Activity = {
  id: string;
  projectId: string;
  taskId: string | null;
  provider: string;
  mode: string;
  status: string;
  context: string;
  result: string;
  createdAt: string;
};
export type Session = {
  id: string;
  projectId: string;
  taskId: string | null;
  provider: string;
  context: string;
  createdAt: string;
};
export type Message = {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: string;
};
export type ProviderId =
  "chatgpt" | "deepseek" | "qwen" | "lovart" | "jimeng" | "openclaw";
export type Connection = {
  id: ProviderId;
  name: string;
  description: string;
  url: string;
  modes: string[];
  status: string;
  configured: boolean;
  capabilities: string[];
  baseUrl: string;
  model: string;
  transport: string;
  toolName: string;
  argumentTemplate: string;
  lastTest: string;
  error: string;
};
export type Snapshot = {
  projects: Project[];
  tasks: Task[];
  assets: Asset[];
  files: StoredFile[];
  activities: Activity[];
  sessions: Session[];
  messages: Message[];
  connections: Connection[];
  storage: string;
};
export type ContextOptions = {
  description: boolean;
  goal: boolean;
  notes: boolean;
  task: boolean;
  assets: boolean;
  files: boolean;
};
