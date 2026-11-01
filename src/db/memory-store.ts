import { getTableName } from "drizzle-orm";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

type TableName = "users" | "documents" | "runs" | "agent_events" | "analyses" | "medicine_cache";

interface StoreData {
  users: any[];
  documents: any[];
  runs: any[];
  agent_events: any[];
  analyses: any[];
  medicine_cache: any[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db-store.json");

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

function loadInitialData(): StoreData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (!parsed.users) parsed.users = [];
      if (parsed.users.length === 0) {
        parsed.users.push({
          id: "usr-demo-1",
          name: "Ramesh Kumar",
          email: "ramesh@aarogyacare.ai",
          phone: "9876543210",
          age: 54,
          gender: "Male",
          patientId: "AC-54892",
          password: "password123",
          createdAt: new Date().toISOString(),
        });
      }
      return parsed;
    }
  } catch (err) {
    console.warn("Failed to load local db-store.json, creating new store", err);
  }
  return {
    users: [
      {
        id: "usr-demo-1",
        name: "Ramesh Kumar",
        email: "ramesh@aarogyacare.ai",
        phone: "9876543210",
        age: 54,
        gender: "Male",
        patientId: "AC-54892",
        password: "password123",
        createdAt: new Date().toISOString(),
      },
    ],
    documents: [],
    runs: [],
    agent_events: [],
    analyses: [],
    medicine_cache: [],
  };
}

let globalStore: StoreData = (globalThis as any).__aarogyaStore || loadInitialData();
if (!globalStore.users || globalStore.users.length === 0) {
  globalStore.users = [
    {
      id: "usr-demo-1",
      name: "Ramesh Kumar",
      email: "ramesh@aarogyacare.ai",
      phone: "9876543210",
      age: 54,
      gender: "Male",
      patientId: "AC-54892",
      password: "password123",
      createdAt: new Date().toISOString(),
    },
  ];
}
(globalThis as any).__aarogyaStore = globalStore;

function persistStore() {
  try {
    ensureDirectoryExistence(DATA_FILE);
    fs.writeFileSync(DATA_FILE, JSON.stringify(globalStore, null, 2), "utf-8");
  } catch (err) {
    // Ignore write issues in read-only / serverless environments
  }
}

function findBinaryConditions(sqlObj: any): Array<{ col: string; op: string; val: any }> {
  const result: Array<{ col: string; op: string; val: any }> = [];
  if (!sqlObj || typeof sqlObj !== "object") return result;

  const chunks = sqlObj.queryChunks;
  if (!chunks || !Array.isArray(chunks)) return result;

  for (let i = 0; i < chunks.length; i++) {
    const item = chunks[i];
    if (item && item.queryChunks) {
      result.push(...findBinaryConditions(item));
    } else if (item && typeof item === "object" && item.name && chunks[i + 2] && chunks[i + 2].value !== undefined) {
      const col = item.name;
      const opChunk = chunks[i + 1];
      const op = opChunk && opChunk.value ? opChunk.value.join("").trim() : "=";
      const val = chunks[i + 2].value;
      result.push({ col, op, val });
    }
  }
  return result;
}

function matchesConditions(cond: any, row: Record<string, any>): boolean {
  if (!cond) return true;
  const list = findBinaryConditions(cond);
  for (const { col, op, val } of list) {
    // Check camelCase and snake_case
    const camel = col.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const actual = row[col] !== undefined ? row[col] : row[camel];

    if (op === "=" && actual !== val) return false;
    if (op === ">" && !(actual > val)) return false;
    if (op === ">=" && !(actual >= val)) return false;
    if (op === "<" && !(actual < val)) return false;
    if (op === "<=" && !(actual <= val)) return false;
    if (op === "!=" && actual === val) return false;
  }
  return true;
}

export class MemoryDb {
  select(fields?: any) {
    let sourceTable: TableName | null = null;
    let joins: Array<{ table: TableName; on: any }> = [];
    let whereCond: any = null;
    let orderDesc = false;
    let orderCol: string | null = null;
    let limitCount: number | null = null;

    const query = {
      from(table: any) {
        sourceTable = getTableName(table) as TableName;
        return query;
      },
      leftJoin(table: any, on: any) {
        joins.push({ table: getTableName(table) as TableName, on });
        return query;
      },
      where(cond: any) {
        whereCond = cond;
        return query;
      },
      orderBy(...orderDefs: any[]) {
        if (orderDefs.length > 0) {
          const ord = orderDefs[0];
          // Check if desc
          if (ord?.queryChunks) {
            const chunks = ord.queryChunks;
            const str = JSON.stringify(chunks);
            orderDesc = str.includes("desc");
            for (const ch of chunks) {
              if (ch && ch.name) orderCol = ch.name;
            }
          }
        }
        return query;
      },
      limit(n: number) {
        limitCount = n;
        return query;
      },
      then(resolve: (value: any) => void) {
        return Promise.resolve(this.exec()).then(resolve);
      },
      exec() {
        if (!sourceTable || !globalStore[sourceTable]) return [];
        let rows = [...(globalStore[sourceTable] || [])];

        // Apply where filter
        if (whereCond) {
          rows = rows.filter((r) => matchesConditions(whereCond, r));
        }

        // Apply joins
        let joinedRows = rows.map((r) => ({ ...r }));
        for (const j of joins) {
          const rightTableRows = globalStore[j.table] || [];
          joinedRows = joinedRows.map((leftRow) => {
            // Find right match based on j.on
            const conds = findBinaryConditions(j.on);
            const matchedRight = rightTableRows.find((rightRow) => {
              for (const c of conds) {
                const leftVal = leftRow[c.col] ?? leftRow[c.col.replace(/_([a-z])/g, (_, x) => x.toUpperCase())];
                const rightVal = rightRow[c.col] ?? rightRow[c.col.replace(/_([a-z])/g, (_, x) => x.toUpperCase())];
                if (leftVal !== undefined && rightVal !== undefined && leftVal === rightVal) {
                  return true;
                }
              }
              // Fallback match: if runs.documentId === documents.id or analyses.runId === runs.id
              if (j.table === "documents" && leftRow.documentId === rightRow.id) return true;
              if (j.table === "analyses" && rightRow.runId === leftRow.id) return true;
              return false;
            });

            // Map fields into shape
            if (fields && typeof fields === "object") {
              const res: any = {};
              for (const [key, fieldDef] of Object.entries(fields)) {
                const colName = (fieldDef as any)?.name;
                const colTable = (fieldDef as any)?.table ? getTableName((fieldDef as any).table) : null;
                if (colTable === j.table && matchedRight) {
                  res[key] = matchedRight[colName] ?? matchedRight[key];
                } else if (leftRow[colName] !== undefined) {
                  res[key] = leftRow[colName];
                } else if (leftRow[key] !== undefined) {
                  res[key] = leftRow[key];
                }
              }
              return { ...leftRow, ...(matchedRight ? { [`__${j.table}`]: matchedRight } : {}), ...res };
            }

            return { ...leftRow, ...(matchedRight || {}) };
          });
        }

        // If fields selector was provided
        if (fields && typeof fields === "object" && joins.length > 0) {
          joinedRows = joinedRows.map((jr) => {
            const out: any = {};
            for (const [key, fieldDef] of Object.entries(fields)) {
              const colName = (fieldDef as any)?.name || key;
              const colTable = (fieldDef as any)?.table ? getTableName((fieldDef as any).table) : null;
              if (colTable && jr[`__${colTable}`]) {
                out[key] = jr[`__${colTable}`][colName] ?? jr[`__${colTable}`][key];
              } else {
                out[key] = jr[key] !== undefined ? jr[key] : jr[colName];
              }
            }
            return out;
          });
        }

        // Sorting
        if (orderCol) {
          const col = orderCol;
          const camel = col.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
          joinedRows.sort((a, b) => {
            const va = a[camel] ?? a[col];
            const vb = b[camel] ?? b[col];
            if (va < vb) return orderDesc ? 1 : -1;
            if (va > vb) return orderDesc ? -1 : 1;
            return 0;
          });
        }

        // Limit
        if (limitCount !== null) {
          joinedRows = joinedRows.slice(0, limitCount);
        }

        return joinedRows;
      },
    };

    return query;
  }

  insert(table: any) {
    const tableName = getTableName(table) as TableName;
    return {
      values(vals: any) {
        const rowsToInsert = Array.isArray(vals) ? vals : [vals];
        const inserted: any[] = [];

        if (!globalStore[tableName]) {
          globalStore[tableName] = [];
        }

        for (const item of rowsToInsert) {
          const newRow = {
            id: item.id || (tableName === "agent_events" || tableName === "medicine_cache" ? (globalStore[tableName].length + 1) : randomUUID()),
            ...item,
            createdAt: item.createdAt || new Date(),
            ts: item.ts || new Date(),
          };
          globalStore[tableName].push(newRow);
          inserted.push(newRow);
        }

        persistStore();

        return {
          returning() {
            return Promise.resolve(inserted);
          },
          then(resolve: (value: any) => void) {
            return Promise.resolve(inserted).then(resolve);
          },
        };
      },
    };
  }

  update(table: any) {
    const tableName = getTableName(table) as TableName;
    let setValues: any = {};
    return {
      set(vals: any) {
        setValues = vals;
        return {
          where(cond: any) {
            const tableData = globalStore[tableName] || [];
            const updated: any[] = [];
            for (let i = 0; i < tableData.length; i++) {
              if (matchesConditions(cond, tableData[i])) {
                tableData[i] = { ...tableData[i], ...setValues };
                updated.push(tableData[i]);
              }
            }
            persistStore();
            return {
              returning() {
                return Promise.resolve(updated);
              },
              then(resolve: (value: any) => void) {
                return Promise.resolve(updated).then(resolve);
              },
            };
          },
        };
      },
    };
  }

  async execute(_sqlQuery: any) {
    return { rows: [{ ok: 1 }] };
  }
}

export const memoryDb = new MemoryDb();
