import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Client } from "pg";

const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/u;
const SUPABASE_DATABASE_HOST_PATTERN =
  /^db\.(?<projectRef>[a-z0-9]{20})\.supabase\.co$/u;
const SUPABASE_API_HOST_PATTERN =
  /^(?<projectRef>[a-z0-9]{20})\.supabase\.co$/u;
const AUTH_USERS_PAGE_SIZE = 1000;
const STORAGE_EMPTY_LIMIT = 200_000;
const TARGET_SCHEMA = "public";

interface ClearArguments {
  confirmProjectRef?: string;
  dryRun: boolean;
}

interface DatabaseTable {
  name: string;
  schema: string;
}

interface StorageBucket {
  id: string;
  objectCount: string;
}

interface AuthSummary {
  userCount: string;
}

export const parseClearArguments = (arguments_: string[]): ClearArguments => {
  let confirmProjectRef: string | undefined;
  let dryRun = false;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];

    if (argument === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (argument === "--confirm-project-ref") {
      confirmProjectRef = arguments_[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return { confirmProjectRef, dryRun };
};

export const getSupabaseProjectRef = (databaseUrl: string): string => {
  const url = new URL(databaseUrl);
  const match = SUPABASE_DATABASE_HOST_PATTERN.exec(url.hostname);

  const projectRef = match?.groups?.projectRef;

  if (!projectRef) {
    throw new Error(
      "DATABASE_DIRECT_URL must use a direct Supabase host such as db.<project-ref>.supabase.co"
    );
  }

  return projectRef;
};

export const getSupabaseApiProjectRef = (supabaseUrl: string): string => {
  const url = new URL(supabaseUrl);
  const match = SUPABASE_API_HOST_PATTERN.exec(url.hostname);
  const projectRef = match?.groups?.projectRef;

  if (!projectRef) {
    throw new Error(
      "SUPABASE_URL must use a project URL such as https://<project-ref>.supabase.co"
    );
  }

  return projectRef;
};

const quoteIdentifier = (identifier: string): string =>
  `"${identifier.replaceAll('"', '""')}"`;

const listTables = async (client: Client): Promise<DatabaseTable[]> => {
  const result = await client.query<DatabaseTable>(
    `select n.nspname as schema, c.relname as name
       from pg_catalog.pg_class c
       join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = $1
        and c.relkind in ('r', 'p')
        and not exists (
          select 1
            from pg_catalog.pg_inherits i
           where i.inhrelid = c.oid
        )
      order by n.nspname, c.relname`,
    [TARGET_SCHEMA]
  );

  return result.rows;
};

const listStorageBuckets = async (client: Client): Promise<StorageBucket[]> => {
  const result = await client.query<StorageBucket>(
    `select b.id, count(o.id)::text as "objectCount"
       from storage.buckets b
       left join storage.objects o on o.bucket_id = b.id
      group by b.id
      order by b.id`
  );

  return result.rows;
};

const getAuthSummary = async (client: Client): Promise<AuthSummary> => {
  const result = await client.query<AuthSummary>(
    'select count(*)::text as "userCount" from auth.users'
  );

  return result.rows[0] ?? { userCount: "0" };
};

const formatTableName = (table: DatabaseTable): string =>
  `${quoteIdentifier(table.schema)}.${quoteIdentifier(table.name)}`;

const printUsage = (): void => {
  process.stdout.write(
    [
      "Delete every row from every table in the public schema while preserving the schema.",
      "",
      "Preview:",
      "  bun run db:clear -- --dry-run",
      "",
      "Delete:",
      "  bun run db:clear -- --confirm-project-ref <project-ref>",
      "",
      "The project ref must match DATABASE_DIRECT_URL.",
      "All public tables, Storage objects, and Supabase Auth users are cleared.",
      "Database schemas and Storage bucket definitions are preserved.",
      "",
    ].join("\n")
  );
};

const createStorageClient = (
  supabaseUrl: string,
  secretKey: string
): SupabaseClient =>
  createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

const verifyStorageAccess = async (
  storageClient: SupabaseClient,
  buckets: StorageBucket[]
): Promise<void> => {
  const { data, error } = await storageClient.storage.listBuckets();

  if (error) {
    throw new Error(`Unable to list Storage buckets: ${error.message}`);
  }

  const accessibleBucketIds = new Set(data.map((bucket) => bucket.id));
  const inaccessibleBucket = buckets.find(
    (bucket) => !accessibleBucketIds.has(bucket.id)
  );

  if (inaccessibleBucket) {
    throw new Error(
      `Storage bucket ${inaccessibleBucket.id} is not accessible with SUPABASE_SECRET_KEY`
    );
  }
};

const listAuthUserIds = async (
  serviceClient: SupabaseClient
): Promise<string[]> => {
  const userIds: string[] = [];
  let page = 1;

  while (true) {
    const {
      data: { users },
      error,
    } = await serviceClient.auth.admin.listUsers({
      page,
      perPage: AUTH_USERS_PAGE_SIZE,
    });

    if (error) {
      throw new Error(`Unable to list Supabase Auth users: ${error.message}`);
    }

    userIds.push(...users.map((user) => user.id));

    if (users.length < AUTH_USERS_PAGE_SIZE) {
      return userIds;
    }

    page += 1;
  }
};

const emptyStorageBuckets = async (
  storageClient: SupabaseClient,
  buckets: StorageBucket[]
): Promise<void> => {
  for (const bucket of buckets) {
    const { error } = await storageClient.storage.emptyBucket(bucket.id);

    if (error) {
      throw new Error(
        `Public table data was cleared, but Storage bucket ${bucket.id} could not be emptied: ${error.message}`
      );
    }

    process.stdout.write(`Emptied Storage bucket ${bucket.id}.\n`);
  }
};

const deleteAuthUsers = async (
  serviceClient: SupabaseClient,
  userIds: string[]
): Promise<void> => {
  for (const userId of userIds) {
    const { error } = await serviceClient.auth.admin.deleteUser(userId);

    if (error) {
      throw new Error(
        `Public table and Storage data were cleared, but Supabase Auth user ${userId} could not be deleted: ${error.message}`
      );
    }
  }

  process.stdout.write(`Deleted ${userIds.length} Supabase Auth users.\n`);
};

const clearProjectData = async (): Promise<void> => {
  const { confirmProjectRef, dryRun } = parseClearArguments(Bun.argv.slice(2));
  const databaseUrl = process.env.DATABASE_DIRECT_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!databaseUrl) {
    throw new Error("DATABASE_DIRECT_URL is required");
  }

  const projectRef = getSupabaseProjectRef(databaseUrl);

  if (supabaseUrl && getSupabaseApiProjectRef(supabaseUrl) !== projectRef) {
    throw new Error(
      "SUPABASE_URL and DATABASE_DIRECT_URL target different Supabase projects"
    );
  }

  if (!dryRun) {
    if (!confirmProjectRef || !PROJECT_REF_PATTERN.test(confirmProjectRef)) {
      printUsage();
      throw new Error("A valid --confirm-project-ref is required");
    }

    if (confirmProjectRef !== projectRef) {
      throw new Error(
        `Confirmation project ref does not match the target (${projectRef})`
      );
    }
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    const tables = await listTables(client);
    const buckets = await listStorageBuckets(client);
    const authSummary = await getAuthSummary(client);

    process.stdout.write(
      `Target: Supabase project ${projectRef}, database ${client.database}, schema ${TARGET_SCHEMA}\n`
    );

    process.stdout.write(
      `${dryRun ? "Would clear" : "Clearing"} ${tables.length} tables:\n${tables
        .map((table) => `  - ${table.schema}.${table.name}`)
        .join("\n")}\n`
    );
    process.stdout.write(
      `${dryRun ? "Would empty" : "Emptying"} ${buckets.length} Storage buckets:\n${buckets
        .map(
          (bucket) =>
            `  - ${bucket.id} (${bucket.objectCount} object${bucket.objectCount === "1" ? "" : "s"})`
        )
        .join("\n")}\n`
    );
    process.stdout.write(
      `${dryRun ? "Would delete" : "Deleting"} ${authSummary.userCount} Supabase Auth users.\n`
    );

    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL is required to empty Storage buckets");
    }

    if (!secretKey) {
      throw new Error(
        "SUPABASE_SECRET_KEY is required to empty Storage buckets"
      );
    }

    const oversizedBucket = buckets.find(
      (bucket) => Number(bucket.objectCount) > STORAGE_EMPTY_LIMIT
    );

    if (oversizedBucket) {
      throw new Error(
        `Storage bucket ${oversizedBucket.id} has more than ${STORAGE_EMPTY_LIMIT} objects; empty it with the Supabase S3 API before running this command`
      );
    }

    const serviceClient = createStorageClient(supabaseUrl, secretKey);
    await verifyStorageAccess(serviceClient, buckets);
    const authUserIds = await listAuthUserIds(serviceClient);

    if (authUserIds.length !== Number(authSummary.userCount)) {
      throw new Error(
        "Supabase Auth API and database returned different user counts; retry after project activity has stopped"
      );
    }

    if (dryRun) {
      process.stdout.write("Storage and Auth admin access verified.\n");
      return;
    }

    if (tables.length > 0) {
      const tableList = tables.map(formatTableName).join(", ");

      await client.query("begin");
      try {
        await client.query(
          "select pg_catalog.pg_advisory_xact_lock(hashtext($1))",
          ["avin:clear-public-data"]
        );
        await client.query(`truncate table ${tableList} restart identity`);
        await client.query("commit");
      } catch (error: unknown) {
        await client.query("rollback");
        throw error;
      }
    }

    await emptyStorageBuckets(serviceClient, buckets);
    await deleteAuthUsers(serviceClient, authUserIds);

    const remainingObjects = await listStorageBuckets(client);
    const nonEmptyBucket = remainingObjects.find(
      (bucket) => bucket.objectCount !== "0"
    );

    if (nonEmptyBucket) {
      throw new Error(
        `Storage verification failed: bucket ${nonEmptyBucket.id} still contains ${nonEmptyBucket.objectCount} objects`
      );
    }

    const remainingAuth = await getAuthSummary(client);

    if (remainingAuth.userCount !== "0") {
      throw new Error(
        `Auth verification failed: ${remainingAuth.userCount} Supabase Auth users remain`
      );
    }

    process.stdout.write(
      `Deleted all public table data, emptied ${buckets.length} Storage buckets, and removed ${authUserIds.length} Supabase Auth users in project ${projectRef}.\n`
    );
    process.stdout.write(
      "Previously issued Supabase access tokens may remain valid until they expire.\n"
    );
  } finally {
    await client.end();
  }
};

if (import.meta.main) {
  try {
    await clearProjectData();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Database clear failed: ${message}\n`);
    process.exitCode = 1;
  }
}
