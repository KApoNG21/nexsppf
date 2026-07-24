import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve } from "node:path";
import { Pool, type PoolClient, type QueryResult } from "pg";

type QueryMeta = {
  changes: number;
  last_row_id?: number;
};

export type DatabaseResult<T = Record<string, unknown>> = {
  results: T[];
  success: true;
  meta: QueryMeta;
};

type QueryExecutor = Pick<Pool, "query"> | Pick<PoolClient, "query">;

const TABLES_WITH_NUMERIC_ID = new Set([
  "account_roles",
  "account_role_permissions",
  "admin_policies",
  "audit_logs",
  "contact_requests",
  "dealers",
  "inspection_requests",
  "maintenance_records",
  "media_assets",
  "product_series",
  "registration_exceptions",
  "serials",
  "support_requests",
  "warranties",
]);

export class ServerPreparedStatement {
  constructor(
    private readonly database: ServerDatabase,
    readonly sourceSql: string,
    readonly values: unknown[] = [],
    private readonly executor?: QueryExecutor,
  ) {}

  bind(...values: unknown[]) {
    return new ServerPreparedStatement(this.database, this.sourceSql, values, this.executor);
  }

  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    const result = await this.execute();
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    if (columnName) return (row[columnName] ?? null) as T | null;
    return row as T;
  }

  async all<T = Record<string, unknown>>(): Promise<DatabaseResult<T>> {
    const result = await this.execute();
    return toDatabaseResult<T>(result);
  }

  async run<T = Record<string, unknown>>(): Promise<DatabaseResult<T>> {
    const result = await this.execute(true);
    return toDatabaseResult<T>(result);
  }

  withExecutor(executor: QueryExecutor) {
    return new ServerPreparedStatement(this.database, this.sourceSql, this.values, executor);
  }

  private async execute(includeInsertId = false) {
    const { sql, values } = normalizeQuery(this.sourceSql, this.values, includeInsertId);
    return (this.executor ?? this.database.pool).query(sql, values);
  }
}

export class ServerDatabase {
  readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  prepare(sql: string) {
    return new ServerPreparedStatement(this, sql);
  }

  async batch(statements: ServerPreparedStatement[]) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const results: DatabaseResult[] = [];
      for (const statement of statements) {
        results.push(await statement.withExecutor(client).run());
      }
      await client.query("COMMIT");
      return results;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

type StoredObject = {
  body: Uint8Array;
  httpMetadata?: { contentType?: string };
};

type PutOptions = {
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
};

export class PrivateFileBucket {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async put(key: string, body: ReadableStream | ArrayBuffer | Uint8Array, options: PutOptions = {}) {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    const bytes = await bodyBytes(body);
    const temporaryPath = `${path}.uploading-${crypto.randomUUID()}`;
    await writeFile(temporaryPath, bytes, { mode: 0o600 });
    await rename(temporaryPath, path);
    await writeFile(
      `${path}.metadata.json`,
      JSON.stringify({
        contentType: options.httpMetadata?.contentType ?? "application/octet-stream",
        customMetadata: options.customMetadata ?? {},
      }),
      { mode: 0o600 },
    );
  }

  async get(key: string): Promise<StoredObject | null> {
    const path = this.pathFor(key);
    try {
      const [body, metadataText] = await Promise.all([
        readFile(path),
        readFile(`${path}.metadata.json`, "utf8").catch(() => "{}"),
      ]);
      const metadata = JSON.parse(metadataText) as { contentType?: string };
      return {
        body: new Uint8Array(body),
        httpMetadata: { contentType: metadata.contentType },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(key: string) {
    const path = this.pathFor(key);
    await Promise.all([
      rm(path, { force: true }),
      rm(`${path}.metadata.json`, { force: true }),
    ]);
  }

  private pathFor(key: string) {
    const portableKey = key.replaceAll("\\", "/");
    if (!portableKey || portableKey.startsWith("/") || portableKey.includes("\0")) {
      throw new Error("Invalid private object key");
    }
    const normalizedKey = normalize(portableKey);
    if (normalizedKey === ".." || normalizedKey.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)) {
      throw new Error("Invalid private object key");
    }
    const path = resolve(join(this.root, normalizedKey));
    if (path !== this.root && !path.startsWith(`${this.root}/`)) {
      throw new Error("Invalid private object key");
    }
    return path;
  }
}

let database: ServerDatabase | undefined;
let files: PrivateFileBucket | undefined;

function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for warranty operations");
  database ??= new ServerDatabase(connectionString);
  return database;
}

function getFiles() {
  const root = process.env.STORAGE_BASE_PATH ?? "/data/nexs-private";
  files ??= new PrivateFileBucket(root);
  return files;
}

export const env = {
  get DB() {
    return getDatabase();
  },
  get FILES() {
    return getFiles();
  },
};

function toDatabaseResult<T>(result: QueryResult): DatabaseResult<T> {
  const firstRow = result.rows[0] as { id?: number | string } | undefined;
  const numericId = firstRow?.id == null ? undefined : Number(firstRow.id);
  return {
    results: result.rows as T[],
    success: true,
    meta: {
      changes: result.rowCount ?? 0,
      ...(Number.isFinite(numericId) ? { last_row_id: numericId } : {}),
    },
  };
}

function normalizeQuery(sourceSql: string, values: unknown[], includeInsertId: boolean) {
  let sql = sourceSql.trim().replace(/`([^`]+)`/g, '"$1"');
  sql = sql.replace(
    /datetime\s*\(\s*'now'\s*,\s*'-1 day'\s*\)/gi,
    "CURRENT_TIMESTAMP - INTERVAL '1 day'",
  );

  const insertMatch = sql.match(/^INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/i);
  const ignoreConflict = /^INSERT\s+OR\s+IGNORE\s+/i.test(sql);
  if (ignoreConflict) sql = sql.replace(/^INSERT\s+OR\s+IGNORE\s+/i, "INSERT ");

  sql = replaceQuestionPlaceholders(sql);
  if (ignoreConflict && !/\bON\s+CONFLICT\b/i.test(sql)) sql += " ON CONFLICT DO NOTHING";
  if (
    includeInsertId &&
    insertMatch &&
    TABLES_WITH_NUMERIC_ID.has(insertMatch[1].toLowerCase()) &&
    !/\bRETURNING\b/i.test(sql)
  ) {
    sql += " RETURNING id";
  }
  return { sql, values };
}

function replaceQuestionPlaceholders(sql: string) {
  let result = "";
  let quote: "'" | '"' | null = null;
  let parameterIndex = 1;
  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];
    if (quote) {
      result += character;
      if (character === quote && next === quote) {
        result += next;
        index += 1;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      result += character;
      continue;
    }
    if (character === "?") {
      result += `$${parameterIndex}`;
      parameterIndex += 1;
      continue;
    }
    result += character;
  }
  return result;
}

async function bodyBytes(body: ReadableStream | ArrayBuffer | Uint8Array) {
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  return new Uint8Array(await new Response(body).arrayBuffer());
}
