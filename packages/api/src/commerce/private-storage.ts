import { env } from "@avin/env/server";
import { ORPCError } from "@orpc/server";

import type { ManagedObjectStore } from "../runtime/storage";
import { ORDER_FILES_BUCKET } from "../runtime/storage";

export const deleteOrderFileObject = async (
  storageKey: string,
  storage?: ManagedObjectStore
): Promise<void> => {
  if (storage) {
    await storage.deleteObject(storageKey, ORDER_FILES_BUCKET);
    return;
  }

  const response = await fetch(
    new URL(`/storage/v1/object/${ORDER_FILES_BUCKET}`, env.SUPABASE_URL),
    {
      body: JSON.stringify({ prefixes: [storageKey] }),
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SECRET_KEY,
      },
      method: "DELETE",
    }
  );
  if (!response.ok) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Không thể xóa ảnh tải lên.",
    });
  }
};

export const createSignedOrderFileUrl = async (
  storageKey: string
): Promise<{ url: string }> => {
  const objectPath = storageKey.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    new URL(
      `/storage/v1/object/sign/${ORDER_FILES_BUCKET}/${objectPath}`,
      env.SUPABASE_URL
    ),
    {
      body: JSON.stringify({ expiresIn: 600 }),
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SECRET_KEY,
      },
      method: "POST",
    }
  );
  if (!response.ok) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Không thể tạo đường dẫn mở ảnh.",
    });
  }

  const result = (await response.json()) as { signedURL?: string };
  if (!result.signedURL) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Không thể tạo đường dẫn mở ảnh.",
    });
  }
  const signedPath = result.signedURL.startsWith("/storage/v1/")
    ? result.signedURL
    : `/storage/v1${result.signedURL}`;
  return { url: new URL(signedPath, env.SUPABASE_URL).toString() };
};
