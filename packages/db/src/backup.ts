import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, mkdtemp, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

const SUPABASE_DATABASE_HOST_PATTERN =
  /^db\.(?<projectRef>[a-z0-9]{20})\.supabase\.co$/u;
const SUPABASE_API_HOST_PATTERN =
  /^(?<projectRef>[a-z0-9]{20})\.supabase\.co$/u;
const REPOSITORY_ROOT = path.resolve(import.meta.dir, "../../..");

interface BackupArguments {
  force: boolean;
  help: boolean;
  outputPath?: string;
}

const parseBackupArguments = (arguments_: string[]): BackupArguments => {
  let force = false;
  let help = false;
  let outputPath: string | undefined;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];

    if (argument === "--force") {
      force = true;
      continue;
    }

    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }

    if (argument === "--output" || argument === "-o") {
      const nextArgument = arguments_[index + 1];

      if (!nextArgument || nextArgument.startsWith("-")) {
        throw new Error(`${argument} requires a file path`);
      }

      outputPath = nextArgument;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return { force, help, outputPath };
};

const getProjectRef = (databaseUrl: URL): string => {
  const match = SUPABASE_DATABASE_HOST_PATTERN.exec(databaseUrl.hostname);
  const projectRef = match?.groups?.projectRef;

  if (!projectRef) {
    throw new Error(
      "DATABASE_DIRECT_URL must use a direct Supabase host such as db.<project-ref>.supabase.co"
    );
  }

  return projectRef;
};

const assertSameProject = (
  databaseUrl: URL,
  supabaseUrlValue: string
): string => {
  const databaseProjectRef = getProjectRef(databaseUrl);
  const supabaseUrl = new URL(supabaseUrlValue);
  const apiMatch = SUPABASE_API_HOST_PATTERN.exec(supabaseUrl.hostname);
  const apiProjectRef = apiMatch?.groups?.projectRef;

  if (!apiProjectRef) {
    throw new Error(
      "SUPABASE_URL must use a project URL such as https://<project-ref>.supabase.co"
    );
  }

  if (databaseProjectRef !== apiProjectRef) {
    throw new Error(
      "SUPABASE_URL and DATABASE_DIRECT_URL target different Supabase projects"
    );
  }

  return databaseProjectRef;
};

const formatTimestamp = (date: Date): string =>
  date.toISOString().slice(0, 19).replaceAll(/[-:]/gu, "").replace("T", "-");

const getDefaultOutputPath = (projectRef: string): string =>
  path.resolve(
    REPOSITORY_ROOT,
    "backups",
    "supabase",
    `${projectRef}-${formatTimestamp(new Date())}.sql`
  );

const resolveOutputPath = (
  outputPath: string | undefined,
  projectRef: string
): string =>
  path.resolve(REPOSITORY_ROOT, outputPath ?? getDefaultOutputPath(projectRef));

const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await stat(filePath);
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
};

const runCommand = async (
  command: string,
  arguments_: string[],
  environment: Record<string, string | undefined>
): Promise<void> => {
  const process = Bun.spawn([command, ...arguments_], {
    env: environment,
    stderr: "inherit",
    stdout: "inherit",
  });
  const exitCode = await process.exited;

  if (exitCode !== 0) {
    throw new Error(`${command} exited with status ${exitCode}`);
  }
};

const dumpWithPgDump = async (
  databaseUrl: URL,
  outputPath: string,
  password: string,
  environment: Record<string, string | undefined>
): Promise<void> => {
  const pgDump = Bun.which("pg_dump");

  if (!pgDump) {
    throw new Error("pg_dump is not available");
  }

  await runCommand(
    pgDump,
    [
      "--format=plain",
      "--file",
      outputPath,
      "--host",
      databaseUrl.hostname,
      "--port",
      databaseUrl.port || "5432",
      "--username",
      decodeURIComponent(databaseUrl.username),
      "--dbname",
      decodeURIComponent(databaseUrl.pathname.replace(/^\//u, "")),
      "--no-owner",
      "--no-privileges",
    ],
    { ...environment, PGPASSWORD: password }
  );
};

const dumpWithSupabaseCli = async (
  databaseUrl: URL,
  outputPath: string,
  password: string,
  environment: Record<string, string | undefined>
): Promise<void> => {
  const supabase = Bun.which("supabase");

  if (!supabase) {
    throw new Error("Neither pg_dump nor the Supabase CLI is available");
  }

  const safeDatabaseUrl = new URL(databaseUrl);
  safeDatabaseUrl.password = "";
  const temporaryDirectory = await mkdtemp(
    path.join(path.dirname(outputPath), ".avin-backup-")
  );
  const schemaPath = path.join(temporaryDirectory, "schema.sql");
  const dataPath = path.join(temporaryDirectory, "data.sql");
  const combinedPath = path.join(temporaryDirectory, "backup.sql");
  const commandEnvironment = { ...environment, PGPASSWORD: password };

  try {
    await runCommand(
      supabase,
      [
        "db",
        "dump",
        "--db-url",
        safeDatabaseUrl.toString(),
        "--file",
        schemaPath,
        "--yes",
      ],
      commandEnvironment
    );
    await runCommand(
      supabase,
      [
        "db",
        "dump",
        "--data-only",
        "--db-url",
        safeDatabaseUrl.toString(),
        "--file",
        dataPath,
        "--yes",
      ],
      commandEnvironment
    );

    await pipeline(
      createReadStream(schemaPath),
      createWriteStream(combinedPath)
    );
    await pipeline(
      createReadStream(dataPath),
      createWriteStream(combinedPath, { flags: "a" })
    );
    await rename(combinedPath, outputPath);
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
};

const printUsage = (): void => {
  process.stdout.write(
    [
      "Back up the Supabase database to a local plain SQL file.",
      "",
      "Default output:",
      "  backups/supabase/<project-ref>-<timestamp>.sql",
      "",
      "Usage:",
      "  bun run db:backup",
      "  bun run db:backup -- --output backups/supabase/test.sql",
      "  bun run db:backup -- --output backups/supabase/test.sql --force",
      "",
      "The output directory is ignored by git. Storage file contents are not included;",
      "the dump contains database rows, including storage.objects metadata.",
      "",
    ].join("\n")
  );
};

const backupDatabase = async (): Promise<void> => {
  const { force, help, outputPath } = parseBackupArguments(Bun.argv.slice(2));

  if (help) {
    printUsage();
    return;
  }

  const databaseUrlValue = process.env.DATABASE_DIRECT_URL;
  const supabaseUrlValue = process.env.SUPABASE_URL;

  if (!databaseUrlValue) {
    throw new Error("DATABASE_DIRECT_URL is required");
  }

  if (!supabaseUrlValue) {
    throw new Error("SUPABASE_URL is required");
  }

  const databaseUrl = new URL(databaseUrlValue);
  const projectRef = assertSameProject(databaseUrl, supabaseUrlValue);
  const password = decodeURIComponent(databaseUrl.password);
  const resolvedOutputPath = resolveOutputPath(outputPath, projectRef);

  if ((await pathExists(resolvedOutputPath)) && !force) {
    throw new Error(
      `Backup already exists at ${resolvedOutputPath}; choose another path or pass --force`
    );
  }

  await mkdir(path.dirname(resolvedOutputPath), { recursive: true });

  const environment = {
    ...process.env,
    PGSSLMODE: databaseUrl.searchParams.get("sslmode") ?? "require",
  };
  const pgDump = Bun.which("pg_dump");

  process.stdout.write(
    `Backing up Supabase project ${projectRef} to ${resolvedOutputPath}\n`
  );

  const backup = pgDump
    ? dumpWithPgDump(databaseUrl, resolvedOutputPath, password, environment)
    : dumpWithSupabaseCli(
        databaseUrl,
        resolvedOutputPath,
        password,
        environment
      );
  await backup;

  const backupStats = await stat(resolvedOutputPath);
  if (backupStats.size === 0) {
    throw new Error(
      `Backup completed but the output file is empty: ${resolvedOutputPath}`
    );
  }

  process.stdout.write(
    `Backup complete (${backupStats.size} bytes): ${resolvedOutputPath}\n`
  );
};

if (import.meta.main) {
  try {
    await backupDatabase();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Database backup failed: ${message}\n`);
    process.exitCode = 1;
  }
}
