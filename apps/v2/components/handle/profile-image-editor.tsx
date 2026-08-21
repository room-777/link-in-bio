"use client";

import {
  MAX_PROFILE_IMAGE_SIZE,
  type PageResponse,
  type ProfileImageCrop,
  type UpdatePageRequest,
} from "@grabbin/api";
import { CircleArrowOutUpRightIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CropIcon, TrashIcon } from "lucide-react";
import Image from "next/image";
import {
  type ChangeEvent,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  getClientImageUrl,
  uploadPageImage,
} from "@/lib/client/profile-image-api";
import { widePageLayout } from "@/lib/handle/page-layout";
import {
  getCenteredProfileImageCrop,
  getProfileImageCropImageStyle,
  isSquareProfileImageCrop,
  type ProfileImageSourceSize,
} from "@/lib/image/crop-image";
import { CropProfileImageDialog } from "./crop-profile-image-dialog";

const FULL_CROP: ProfileImageCrop = { x: 0, y: 0, width: 100, height: 100 };
const SUPPORTED_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type ProfileImageEditorProps = {
  page: PageResponse;
  imageUrl: string | null;
  imageBaseUrl: string | null;
  acceptPage: (page: PageResponse) => void;
  save: (changes: UpdatePageRequest) => Promise<PageResponse | null>;
  onErrorChange: (error: string | null) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function revealRadius(crop: ProfileImageCrop, size: number) {
  const left = (-crop.x / crop.width) * size;
  const top = (-crop.y / crop.height) * size;
  const right = left + (100 / crop.width) * size;
  const bottom = top + (100 / crop.height) * size;
  const center = size / 2;
  return Math.ceil(
    Math.hypot(
      Math.max(Math.abs(left - center), Math.abs(right - center)),
      Math.max(Math.abs(top - center), Math.abs(bottom - center)),
    ),
  );
}

export function ProfileImageEditor({
  page,
  imageUrl: initialImageUrl,
  imageBaseUrl,
  acceptPage,
  save,
  onErrorChange,
}: ProfileImageEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLButtonElement>(null);
  const sourceImageRef = useRef<HTMLImageElement>(null);
  const applyRequestRef = useRef<(() => void) | null>(null);
  const sourcePreviewRef = useRef<string | null>(null);
  const committedRef = useRef({
    image: page.image,
    imageSource: page.imageSource,
    imageCrop: page.imageCrop,
  });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    crop: ProfileImageCrop;
  } | null>(null);
  const draggedRef = useRef(false);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [imageCrop, setImageCrop] = useState<ProfileImageCrop | null>(
    page.imageCrop,
  );
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState(FULL_CROP);
  const [sourceSize, setSourceSize] = useState<ProfileImageSourceSize | null>(
    null,
  );
  const [frameSize, setFrameSize] = useState(112);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const updateSize = () =>
      setFrameSize(Math.round(frame.getBoundingClientRect().width));
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (sourcePreviewRef.current)
        URL.revokeObjectURL(sourcePreviewRef.current);
    };
  }, []);

  const syncSourceSize = useCallback(
    (image: HTMLImageElement) => {
      if (!image.naturalWidth || !image.naturalHeight) return;
      const next = { width: image.naturalWidth, height: image.naturalHeight };
      setSourceSize(next);
      if (cropOpen) {
        setCrop((current) =>
          isSquareProfileImageCrop(current, next)
            ? current
            : getCenteredProfileImageCrop(next),
        );
      }
    },
    [cropOpen],
  );

  // The image ref is replaced when a crop preview changes; re-check a cached image then.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the ref target changes with either preview URL.
  useLayoutEffect(() => {
    const image = sourceImageRef.current;
    if (image?.complete) syncSourceSize(image);
  }, [syncSourceSize, cropSourceUrl, imageUrl]);

  function clearSourcePreview() {
    if (sourcePreviewRef.current) URL.revokeObjectURL(sourcePreviewRef.current);
    sourcePreviewRef.current = null;
    setCropSourceUrl(null);
    setCropFile(null);
  }

  async function upload(
    file: File,
    nextCrop: ProfileImageCrop,
    preview: string,
  ) {
    setSaving("image");
    onErrorChange(null);
    setImageUrl(preview);
    setImageCrop(nextCrop);
    try {
      const result = await uploadPageImage(page.handle, file, nextCrop);
      committedRef.current = {
        image: result.page.image,
        imageSource: result.page.imageSource,
        imageCrop: result.page.imageCrop,
      };
      acceptPage(result.page);
      setImageCrop(result.page.imageCrop);
      setImageUrl(
        getClientImageUrl(
          result.page.image,
          result.page.updatedAt,
          imageBaseUrl,
        ),
      );
      setCropOpen(false);
      clearSourcePreview();
    } catch (caught) {
      setImageUrl(initialImageUrl);
      setImageCrop(committedRef.current.imageCrop);
      onErrorChange(
        caught instanceof Error ? caught.message : "Image upload failed.",
      );
    } finally {
      setSaving(null);
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!SUPPORTED_TYPES.has(file.type) || file.size > MAX_PROFILE_IMAGE_SIZE) {
      onErrorChange("Choose an image smaller than 5 MB.");
      return;
    }
    const preview = URL.createObjectURL(file);
    if (!imageUrl) {
      sourcePreviewRef.current = preview;
      void upload(file, FULL_CROP, preview);
      return;
    }
    clearSourcePreview();
    sourcePreviewRef.current = preview;
    setImageUrl(preview);
    setImageCrop(null);
    setCropFile(file);
    setCropSourceUrl(preview);
    setSourceSize(null);
    setCrop(FULL_CROP);
    setCropOpen(true);
    onErrorChange(null);
  }

  function openExistingCrop() {
    if (!imageUrl) return;
    setCropSourceUrl(imageUrl);
    setCropFile(null);
    setCrop(
      imageCrop ??
        (sourceSize ? getCenteredProfileImageCrop(sourceSize) : FULL_CROP),
    );
    setCropOpen(true);
    onErrorChange(null);
  }

  async function applyCrop(nextCrop: ProfileImageCrop) {
    if (!cropSourceUrl) return;
    if (cropFile) {
      await upload(cropFile, nextCrop, cropSourceUrl);
      return;
    }
    setSaving("image");
    onErrorChange(null);
    try {
      const result = await save({ imageCrop: nextCrop });
      if (!result) throw new Error("Could not crop the image.");
      committedRef.current = {
        image: result.image,
        imageSource: result.imageSource,
        imageCrop: result.imageCrop,
      };
      setImageCrop(result.imageCrop);
      setCropOpen(false);
    } catch (caught) {
      throw caught instanceof Error
        ? caught
        : new Error("Could not crop the image.");
    } finally {
      setSaving(null);
    }
  }

  async function removeImage() {
    if (saving || !page.image) return;
    setSaving("image");
    onErrorChange(null);
    try {
      const result = await save({
        image: null,
        imageSource: null,
        imageCrop: null,
      });
      if (!result) return;
      committedRef.current = {
        image: null,
        imageSource: null,
        imageCrop: null,
      };
      setImageUrl(null);
      setImageCrop(null);
    } catch (caught) {
      onErrorChange(
        caught instanceof Error
          ? caught.message
          : "Could not remove the image.",
      );
    } finally {
      setSaving(null);
    }
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (
      !cropOpen ||
      saving ||
      (event.pointerType === "mouse" && event.button !== 0)
    )
      return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      crop,
    };
    draggedRef.current = false;
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!dx && !dy) return;
    draggedRef.current = true;
    event.preventDefault();
    setCrop({
      ...drag.crop,
      x: clamp(
        drag.crop.x - (dx / Math.max(frameSize, 1)) * drag.crop.width,
        0,
        100 - drag.crop.width,
      ),
      y: clamp(
        drag.crop.y - (dy / Math.max(frameSize, 1)) * drag.crop.height,
        0,
        100 - drag.crop.height,
      ),
    });
  }

  function onPointerEnd(event: PointerEvent<HTMLButtonElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onImageClick(event: MouseEvent<HTMLButtonElement>) {
    if (cropOpen || draggedRef.current) {
      event.preventDefault();
      draggedRef.current = false;
      return;
    }
    inputRef.current?.click();
  }

  const renderedUrl = cropOpen ? cropSourceUrl : imageUrl;
  const renderedCrop = cropOpen ? crop : imageCrop;
  const cropReady = Boolean(
    renderedUrl &&
      renderedCrop &&
      (!cropOpen ||
        (sourceSize && isSquareProfileImageCrop(renderedCrop, sourceSize))),
  );
  const imageStyle =
    cropReady && renderedCrop
      ? getProfileImageCropImageStyle(renderedCrop)
      : undefined;
  const radius =
    cropReady && renderedCrop
      ? revealRadius(renderedCrop, frameSize)
      : frameSize;

  return (
    <div className="t-stagger-line t-stagger-line--1">
      <div
        className={`group/image relative isolate size-28 sm:size-32 min-[90rem]:size-46 ${cropOpen ? "z-50" : "z-0"}`}
        data-profile-image-frame="true"
      >
        <button
          ref={frameRef}
          type="button"
          aria-label="Change profile image"
          disabled={saving !== null}
          className={`relative flex size-full items-center justify-center rounded-full bg-secondary/80 text-sm font-medium text-muted-foreground/60 transition-[transform,scale,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ${cropOpen ? "cursor-grab touch-none overflow-visible" : "overflow-visible hover:bg-muted active:scale-[0.97]"}`}
          onClick={onImageClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          <div
            className={`${cropOpen ? "t-profile-image-reveal" : "overflow-hidden"} absolute inset-0 flex items-center justify-center rounded-full`}
            data-open={cropOpen && cropReady ? "true" : undefined}
            style={
              {
                "--profile-image-reveal-closed-radius": `${frameSize / 2}px`,
                "--profile-image-reveal-radius": `${radius}px`,
                "--profile-image-shadow-outset": "96px",
              } as CSSProperties
            }
          >
            {renderedUrl ? (
              imageStyle ? (
                <div
                  className={`pointer-events-none rounded-lg ${cropOpen ? "smooth-shadow-lg" : ""}`}
                  style={imageStyle}
                >
                  <Image
                    ref={sourceImageRef}
                    className="size-full rounded-lg"
                    src={renderedUrl}
                    alt={page.name ?? page.handle}
                    width={150}
                    height={150}
                    loading="eager"
                    onLoad={(event) => syncSourceSize(event.currentTarget)}
                  />
                  {cropOpen && renderedCrop ? (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-lg"
                    >
                      <span
                        className="pointer-events-none absolute rounded-full"
                        style={{
                          left: `${renderedCrop.x}%`,
                          top: `${renderedCrop.y}%`,
                          width: `${renderedCrop.width}%`,
                          height: `${renderedCrop.height}%`,
                          boxShadow: "0 0 0 9999px rgb(255 255 255 / 0.35)",
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <Image
                  ref={sourceImageRef}
                  className="size-full rounded-lg object-cover"
                  src={renderedUrl}
                  alt={page.name ?? page.handle}
                  width={150}
                  height={150}
                  loading="eager"
                  onLoad={(event) => syncSourceSize(event.currentTarget)}
                />
              )
            ) : (
              <HugeiconsIcon
                icon={CircleArrowOutUpRightIcon}
                className="text-gray-bright 2xl:size-9"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            )}
          </div>
          {renderedUrl ? (
            <span
              className={`pointer-events-none absolute inset-0 rounded-full bg-black/25 transition-opacity duration-150 ease-out ${cropOpen ? "opacity-0" : "opacity-0 group-hover/image:opacity-100"}`}
            />
          ) : null}
        </button>
        {imageUrl && !saving ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              data-profile-crop-apply="true"
              aria-label={
                cropOpen ? "Apply profile image crop" : "Crop profile image"
              }
              disabled={cropOpen && !sourceSize}
              onClick={() =>
                cropOpen ? applyRequestRef.current?.() : openExistingCrop()
              }
              className={`absolute top-0 left-0 inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-background shadow-md transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:scale-100 focus-visible:opacity-100 motion-reduce:transition-none ${widePageLayout.imageCrop} ${cropOpen ? "z-60 border-0! bg-brand-green text-white! opacity-100 hover:bg-brand-green/80" : "opacity-0 group-hover/image:scale-100 group-hover/image:opacity-100"}`}
            >
              <CropIcon className="size-5 stroke-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove profile image"
              disabled={cropOpen}
              onClick={() => void removeImage()}
              className={`absolute top-0 right-0 inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-background shadow-md transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:scale-100 focus-visible:opacity-100 motion-reduce:transition-none ${widePageLayout.imageRemove} ${cropOpen ? "invisible pointer-events-none opacity-0" : "opacity-0 group-hover/image:scale-100 group-hover/image:opacity-100"}`}
            >
              <TrashIcon className="size-5 stroke-3" />
            </Button>
          </>
        ) : null}
        {cropSourceUrl ? (
          <CropProfileImageDialog
            open={cropOpen}
            crop={crop}
            sourceSize={sourceSize}
            anchorRef={frameRef}
            applyRequestRef={applyRequestRef}
            onOpenChange={(open) => {
              setCropOpen(open);
              if (!open && cropFile) {
                setImageUrl(initialImageUrl);
                setImageCrop(committedRef.current.imageCrop);
                clearSourcePreview();
              }
            }}
            onApply={applyCrop}
            onApplyingChange={(applying) =>
              setSaving(applying ? "image" : null)
            }
          />
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleImageChange}
      />
    </div>
  );
}
