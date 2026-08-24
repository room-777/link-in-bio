import {
  type ProfileImageCompleteRequest,
  type ProfileImageCrop,
  type ProfileImageUploadRequest,
  profileImageCompleteResponseSchema,
  profileImageUploadResponseSchema,
} from "@grabbin/api";
import * as v from "valibot";

const fullCrop: ProfileImageCrop = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
};

function centeredCrop(width: number, height: number): ProfileImageCrop {
  if (width === height) return fullCrop;
  if (width > height) {
    const cropWidth = (height / width) * 100;
    return { x: (100 - cropWidth) / 2, y: 0, width: cropWidth, height: 100 };
  }
  const cropHeight = (width / height) * 100;
  return { x: 0, y: (100 - cropHeight) / 2, width: 100, height: cropHeight };
}

async function parseResponse<T>(
  response: Response,
  schema: v.GenericSchema<T>,
) {
  if (!response.ok) {
    throw new Error(`Image upload failed with status ${response.status}.`);
  }
  return v.parse(schema, await response.json());
}

export async function uploadPageImage(
  handle: string,
  file: File,
  crop?: ProfileImageCrop,
) {
  const request: ProfileImageUploadRequest = {
    contentType: file.type,
    size: file.size,
  };
  const upload = await parseResponse<
    v.InferOutput<typeof profileImageUploadResponseSchema>
  >(
    await fetch(`/api/pages/${encodeURIComponent(handle)}/image-upload`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    }),
    profileImageUploadResponseSchema,
  );

  const uploadResponse = await fetch(upload.source.uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": upload.source.contentType,
      ...(upload.source.cacheControl
        ? { "cache-control": upload.source.cacheControl }
        : {}),
    },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error(`R2 upload failed with status ${uploadResponse.status}.`);
  }

  const image =
    crop ??
    (await new Promise<ProfileImageCrop>((resolve) => {
      const previewUrl = URL.createObjectURL(file);
      const preview = new Image();
      preview.onload = () => {
        URL.revokeObjectURL(previewUrl);
        resolve(centeredCrop(preview.naturalWidth, preview.naturalHeight));
      };
      preview.onerror = () => {
        URL.revokeObjectURL(previewUrl);
        resolve(fullCrop);
      };
      preview.src = previewUrl;
    }));
  const completeRequest: ProfileImageCompleteRequest = {
    sourceObjectKey: upload.source.objectKey,
    crop: image,
    expectedImage: upload.expectedImage,
  };

  return parseResponse<
    v.InferOutput<typeof profileImageCompleteResponseSchema>
  >(
    await fetch(
      `/api/pages/${encodeURIComponent(handle)}/image-upload/complete`,
      {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(completeRequest),
      },
    ),
    profileImageCompleteResponseSchema,
  );
}

export function getClientImageUrl(
  image: string | null,
  updatedAt: string,
  publicBaseUrl: string | null,
) {
  if (!image) return null;
  if (/^(?:https?:\/\/|blob:|data:|\/)/.test(image)) return image;
  if (!publicBaseUrl) return null;
  return `${publicBaseUrl.replace(/\/+$/, "")}/${image
    .split("/")
    .map(encodeURIComponent)
    .join("/")}?v=${encodeURIComponent(updatedAt)}`;
}
