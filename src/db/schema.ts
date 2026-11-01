import {
  pgTable,
  text,
  uuid,
  integer,
  serial,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AnalysisPayload, AgentKey, AgentStatus } from "@/lib/medical/types";

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  age: integer("age"),
  gender: text("gender"),
  password: text("password").notNull(),
  patientId: text("patient_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  patientName: text("patient_name"),
  patientAge: integer("patient_age"),
  kind: text("kind").notNull(), // 'image' | 'pdf' | 'sample' | 'text'
  title: text("title").notNull(),
  filename: text("filename"),
  mime: text("mime"),
  size: integer("size"),
  storagePath: text("storage_path"),
  base64: text("base64"),
  textContent: text("text_content"),
  imageSrc: text("image_src"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const runs = pgTable("runs", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("queued"), // queued | running | completed | failed
  mode: text("mode").notNull().default("demo"), // live | demo | text | pdf
  title: text("title").notNull(),
  summaryLine: text("summary_line"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const agentEvents = pgTable(
  "agent_events",
  {
    id: serial("id").primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    agent: text("agent").$type<AgentKey>().notNull(),
    agentName: text("agent_name").notNull(),
    status: text("status").$type<AgentStatus>().notNull().default("info"),
    message: text("message").notNull(),
    payload: jsonb("payload"),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("agent_events_run_idx").on(t.runId, t.id)],
);

export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    rawText: text("raw_text"),
    payload: jsonb("payload").$type<AnalysisPayload>(),
    medCount: integer("med_count").notNull().default(0),
    conditionCount: integer("condition_count").notNull().default(0),
    interactionCount: integer("interaction_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("analyses_run_idx").on(t.runId)],
);

export const medicineCache = pgTable(
  "medicine_cache",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    source: text("source").notNull().default("rxnav+fda"),
    data: jsonb("data"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("medicine_cache_name_idx").on(t.name)],
);
