import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { memoryDb } from "./memory-store";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaDb?: any;
};

let activeDb: any;

if (databaseUrl && databaseUrl.trim().length > 0 && !databaseUrl.includes("placeholder")) {
  try {
    const pool =
      globalForDb.__arenaNextJsPostgresqlPool ??
      new Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 5000,
      });

    if (process.env.NODE_ENV !== "production") {
      globalForDb.__arenaNextJsPostgresqlPool = pool;
    }

    activeDb = drizzle(pool);
  } catch (err) {
    console.warn("PostgreSQL connection initialization failed, using local memory store:", err);
    activeDb = memoryDb;
  }
} else {
  activeDb = memoryDb;
}

export const db = activeDb as ReturnType<typeof drizzle>;
