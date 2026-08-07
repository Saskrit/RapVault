/**
 * Retries `prisma migrate deploy` on transient Neon/Postgres failures
 * (especially P1002 advisory-lock timeouts during Vercel builds).
 *
 * Also tries to clear a stuck Prisma advisory lock (objid 72707369) before
 * retries so a dead connection from a previous deploy does not block forever.
 */
import { spawn } from "node:child_process";
import pg from "pg";

const MAX_ATTEMPTS = Number(process.env.MIGRATE_RETRY_ATTEMPTS || 6);
const BASE_DELAY_MS = Number(process.env.MIGRATE_RETRY_BASE_MS || 8000);
const PRISMA_ADVISORY_LOCK_ID = 72707369;

const RETRYABLE =
  /P1001|P1002|P1008|P1017|timed out|timeout|ECONNRESET|ECONNREFUSED|ETIMEDOUT|connection terminated|can't reach database|advisory lock|Server has closed the connection|Can't reach database server/i;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMigrationUrl() {
  return process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "";
}

async function clearStuckAdvisoryLocks() {
  const url = getMigrationUrl();
  if (!url) return;

  const client = new pg.Client({
    connectionString: url,
    connectionTimeoutMillis: 15000,
    ssl: url.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    await client.connect();
    const result = await client.query(
      `
      SELECT pg_terminate_backend(psa.pid) AS terminated
      FROM pg_locks pl
      JOIN pg_stat_activity psa ON psa.pid = pl.pid
      WHERE pl.locktype = 'advisory'
        AND pl.objid = $1
        AND psa.pid <> pg_backend_pid()
      `,
      [PRISMA_ADVISORY_LOCK_ID],
    );
    const killed = result.rowCount || 0;
    if (killed > 0) {
      console.warn(
        `migrate-deploy-retry: cleared ${killed} stuck Prisma advisory lock session(s).`,
      );
    } else {
      console.log(
        "migrate-deploy-retry: no stuck Prisma advisory lock sessions found.",
      );
    }
  } catch (error) {
    console.warn(
      "migrate-deploy-retry: could not clear advisory locks (continuing):",
      error instanceof Error ? error.message : error,
    );
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

function runMigrateDeploy() {
  return new Promise((resolve) => {
    const child = spawn("npx", ["prisma", "migrate", "deploy"], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        output: `${stdout}\n${stderr}`,
      });
    });
  });
}

function isRetryable(output, code) {
  if (code === 0) return false;
  return RETRYABLE.test(output);
}

async function main() {
  if (!getMigrationUrl()) {
    console.error(
      "migrate-deploy-retry: DIRECT_DATABASE_URL or DATABASE_URL must be set.",
    );
    process.exit(1);
  }

  if (!process.env.DIRECT_DATABASE_URL) {
    console.warn(
      "migrate-deploy-retry: DIRECT_DATABASE_URL is not set; using DATABASE_URL. Prefer Neon’s direct (non-pooler) URL for migrations.",
    );
  } else {
    console.log(
      "migrate-deploy-retry: using DIRECT_DATABASE_URL for migrations.",
    );
  }

  // Warm / unlock before first attempt (helps Neon cold starts + stale locks).
  await clearStuckAdvisoryLocks();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(
      `\nmigrate-deploy-retry: attempt ${attempt}/${MAX_ATTEMPTS}…`,
    );

    const { code, output } = await runMigrateDeploy();

    if (code === 0) {
      console.log("migrate-deploy-retry: migrations applied successfully.");
      process.exit(0);
    }

    if (!isRetryable(output, code) || attempt === MAX_ATTEMPTS) {
      console.error(
        `migrate-deploy-retry: failed after ${attempt} attempt(s) (exit ${code}).`,
      );
      process.exit(code || 1);
    }

    await clearStuckAdvisoryLocks();

    const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
    console.warn(
      `migrate-deploy-retry: transient DB/lock error. Retrying in ${Math.round(delay / 1000)}s…`,
    );
    await sleep(delay);
  }
}

main().catch((error) => {
  console.error("migrate-deploy-retry: unexpected error", error);
  process.exit(1);
});
