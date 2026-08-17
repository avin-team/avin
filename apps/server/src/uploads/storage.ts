import type { ManagedObjectStore } from "@avin/api/storage";
import { PUBLIC_MEDIA_BUCKET } from "@avin/api/storage";
import { env } from "@avin/env/server";
import type { Router } from "@better-upload/server";
import { custom } from "@better-upload/server/clients";
import {
  deleteObject,
  getObjectBlob,
  putObject,
} from "@better-upload/server/helpers";

export interface ListingImageStorageRuntime {
  client: Router["client"];
  objectStore: ManagedObjectStore;
}

export const createListingImageStorage =
  (): ListingImageStorageRuntime | null => {
    const accessKeyId = env.SUPABASE_STORAGE_S3_ACCESS_KEY_ID;
    const endpoint = env.SUPABASE_STORAGE_S3_ENDPOINT;
    const region = env.SUPABASE_STORAGE_S3_REGION;
    const secretAccessKey = env.SUPABASE_STORAGE_S3_SECRET_ACCESS_KEY;

    if (!accessKeyId || !endpoint || !region || !secretAccessKey) {
      return null;
    }

    const endpointUrl = new URL(endpoint);
    const host = `${endpointUrl.host}${endpointUrl.pathname.replace(/\/$/u, "")}`;
    const client = custom({
      accessKeyId,
      forcePathStyle: true,
      host,
      region,
      secretAccessKey,
      secure: endpointUrl.protocol === "https:",
    });

    return {
      client,
      objectStore: {
        deleteObject: (key, bucket = PUBLIC_MEDIA_BUCKET) =>
          deleteObject(client, { bucket, key }),
        getObject: async (key, bucket = PUBLIC_MEDIA_BUCKET) => {
          const result = await getObjectBlob(client, { bucket, key });
          return new Uint8Array(await result.blob.arrayBuffer());
        },
        putObject: (key, body, contentType, bucket = PUBLIC_MEDIA_BUCKET) =>
          putObject(client, {
            body,
            bucket,
            contentLength: body.byteLength,
            contentType,
            key,
          }),
        supabaseUrl: env.SUPABASE_URL,
      },
    };
  };
