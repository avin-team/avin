import { describe, expect, it } from "vitest";

import {
  getSupabaseApiProjectRef,
  getSupabaseProjectRef,
  parseClearArguments,
} from "./clear";

describe("parseClearArguments", () => {
  it("parses dry runs", () => {
    expect(parseClearArguments(["--dry-run"])).toEqual({
      confirmProjectRef: undefined,
      dryRun: true,
    });
  });

  it("parses explicit project confirmation", () => {
    expect(
      parseClearArguments(["--confirm-project-ref", "gyvlawumcrymfsfoisgr"])
    ).toEqual({
      confirmProjectRef: "gyvlawumcrymfsfoisgr",
      dryRun: false,
    });
  });

  it("rejects unknown arguments", () => {
    expect(() => parseClearArguments(["--force"])).toThrow(
      "Unknown argument: --force"
    );
  });
});

describe("getSupabaseProjectRef", () => {
  it("extracts the ref from a direct Supabase database URL", () => {
    expect(
      getSupabaseProjectRef(
        "postgresql://postgres:secret@db.gyvlawumcrymfsfoisgr.supabase.co:5432/postgres?sslmode=require"
      )
    ).toBe("gyvlawumcrymfsfoisgr");
  });

  it("rejects pooler and non-Supabase URLs", () => {
    expect(() =>
      getSupabaseProjectRef(
        "postgresql://postgres:secret@localhost:5432/postgres"
      )
    ).toThrow("DATABASE_DIRECT_URL must use a direct Supabase host");
  });
});

describe("getSupabaseApiProjectRef", () => {
  it("extracts the ref from a Supabase project URL", () => {
    expect(
      getSupabaseApiProjectRef("https://gyvlawumcrymfsfoisgr.supabase.co")
    ).toBe("gyvlawumcrymfsfoisgr");
  });

  it("rejects non-project URLs", () => {
    expect(() =>
      getSupabaseApiProjectRef("https://supabase.com/dashboard")
    ).toThrow("SUPABASE_URL must use a project URL");
  });
});
