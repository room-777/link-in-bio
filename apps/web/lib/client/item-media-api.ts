import {
  type PageItemUploadCompleteResponse,
  type PageItemUploadRequest,
  type PageItemUploadResponse,
  pageItemUploadCompleteResponseSchema,
  pageItemUploadResponseSchema,
} from "@grabbin/api";
import * as v from "valibot";

async function parseResponse<T>(
  response: Response,
  schema: v.GenericSchema<T>,
) {
  if (!response.ok) {
    throw new Error(`Media upload failed with status ${response.status}.`);
  }
  return v.parse(schema, await response.json());
}

export async function uploadPageItemMedia(handle: string, file: File) {
  const request: PageItemUploadRequest = {
    filename: file.name,
    contentType: file.type,
    size: file.size,
  };
  const upload = await parseResponse<PageItemUploadResponse>(
    await fetch(`/api/pages/${encodeURIComponent(handle)}/items/upload`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    }),
    pageItemUploadResponseSchema,
  );

  const uploadResponse = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: { "content-type": file.type },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error(`R2 upload failed with status ${uploadResponse.status}.`);
  }

  return parseResponse<PageItemUploadCompleteResponse>(
    await fetch(
      `/api/pages/${encodeURIComponent(handle)}/items/upload/complete`,
      {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ objectKey: upload.objectKey }),
      },
    ),
    pageItemUploadCompleteResponseSchema,
  );
}
