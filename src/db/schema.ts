import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const projects = sqliteTable("projects", {
  id: text().primaryKey(),
  name: text().notNull(),
  description: text().notNull().default(""),
  goal: text().notNull().default(""),
  notes: text().notNull().default(""),
  icon: text().notNull().default("folder"),
  color: text().notNull().default("green"),
  tags: text().notNull().default(""),
  status: text().notNull().default("active"),
  createdAt: text().notNull(),
  updatedAt: text().notNull(),
  lastOpenedAt: text().notNull(),
});
export const tasks = sqliteTable("tasks", {
  id: text().primaryKey(),
  projectId: text()
    .notNull()
    .references(() => projects.id),
  title: text().notNull(),
  description: text().notNull().default(""),
  notes: text().notNull().default(""),
  status: text().notNull().default("todo"),
  priority: text().notNull().default("medium"),
  preferredApp: text().notNull().default("chatgpt"),
  createdAt: text().notNull(),
  updatedAt: text().notNull(),
  completedAt: text(),
});
export const files = sqliteTable("files", {
  id: text().primaryKey(),
  projectId: text()
    .notNull()
    .references(() => projects.id),
  name: text().notNull(),
  mime: text().notNull(),
  size: integer().notNull(),
  path: text().notNull(),
  createdAt: text().notNull(),
});
export const activities = sqliteTable("ai_activities", {
  id: text().primaryKey(),
  projectId: text()
    .notNull()
    .references(() => projects.id),
  taskId: text().references(() => tasks.id),
  provider: text().notNull(),
  mode: text().notNull(),
  status: text().notNull(),
  context: text().notNull(),
  result: text().notNull().default(""),
  createdAt: text().notNull(),
});
export const assets = sqliteTable("assets", {
  id: text().primaryKey(),
  projectId: text()
    .notNull()
    .references(() => projects.id),
  taskId: text().references(() => tasks.id),
  title: text().notNull(),
  type: text().notNull().default("Text"),
  content: text().notNull().default(""),
  url: text().notNull().default(""),
  fileId: text().references(() => files.id),
  sourceApp: text().notNull().default("manual"),
  activityId: text().references(() => activities.id),
  prompt: text().notNull().default(""),
  notes: text().notNull().default(""),
  createdAt: text().notNull(),
});
export const sessions = sqliteTable("ai_sessions", {
  id: text().primaryKey(),
  projectId: text()
    .notNull()
    .references(() => projects.id),
  taskId: text().references(() => tasks.id),
  provider: text().notNull(),
  context: text().notNull(),
  createdAt: text().notNull(),
});
export const messages = sqliteTable("ai_messages", {
  id: text().primaryKey(),
  sessionId: text()
    .notNull()
    .references(() => sessions.id),
  role: text().notNull(),
  content: text().notNull(),
  createdAt: text().notNull(),
});
export const settings = sqliteTable("connector_settings", {
  id: text().primaryKey(),
  value: text().notNull(),
});
