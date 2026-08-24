import {
	describe,
	expect,
	it,
} from "bun:test";
import {
	createItemMediaKey,
	createProfileImageCropKey,
	createProfileImageKey,
	createProfileImageStagingKey,
	getItemMediaUrl,
	getProfileImageDisplayContentType,
	getPublicR2ObjectUrl,
	isItemMediaKey,
	isProfileImageCropKey,
	isProfileImageKey,
	isProfileImageStagingKey,
	MAX_ITEM_MEDIA_SIZE,
	sanitizeMediaFilename,
	validateItemMediaUpload,
} from "@core/r2";

describe("profile image R2 boundaries", () => {
	it("scopes profile images to the owner and page", () => {
		const key = createProfileImageKey(
			"user_1",
			"page_1",
			"image/png",
		);
		expect(key).toMatch(
			/^users\/user_1\/page_1\/profile\/[a-f0-9-]+\.png$/,
		);
		expect(
			key && isProfileImageKey(key),
		).toBe(true);
		expect(
			isProfileImageKey(
				"users/profile/legacy.png",
			),
		).toBe(false);
	});

	it("derives the crop key from the source UUID", () => {
		const sourceKey =
			"users/user_1/page_1/profile/source-id.jpg";

		expect(
			createProfileImageCropKey(
				"user_1",
				"page_1",
				sourceKey,
			),
		).toBe(
			"users/user_1/page_1/profile/source-id-crop.webp",
		);
		expect(
			createProfileImageCropKey(
				"user_1",
				"page_1",
				sourceKey,
				"image/jpeg",
			),
		).toBe(
			"users/user_1/page_1/profile/source-id-crop.jpg",
		);
		expect(
			isProfileImageCropKey(
				"users/user_1/page_1/profile/source-id-crop.webp",
			),
		).toBe(true);
		expect(
			getProfileImageDisplayContentType(
				"users/user_1/page_1/profile/source-id-crop.jpg",
			),
		).toBe("image/jpeg");
		expect(
			getProfileImageDisplayContentType(
				"users/user_1/page_1/profile/source-id-crop.webp",
			),
		).toBe("image/webp");
		const stagingKey =
			createProfileImageStagingKey(
				"user_1",
				"page_1",
				sourceKey,
			);
		expect(stagingKey).toMatch(
			/^users\/user_1\/page_1\/profile\/source-id-crop\.upload-[a-f0-9-]+\.webp$/,
		);
		expect(
			stagingKey &&
				isProfileImageStagingKey(
					stagingKey,
				),
		).toBe(true);
	});
});

describe("item media R2 boundaries", () => {
	it("rejects traversal and keeps the key within the owner item prefix", () => {
		expect(
			sanitizeMediaFilename(
				"../secret.png",
			),
		).toBeNull();
		expect(
			createItemMediaKey({
				userId: "user_1",
				pageId: "page_1",
				filename: "profile photo.png",
			}),
		).toBe(
			"users/user_1/page_1/profile-photo.png",
		);
		expect(
			isItemMediaKey(
				"users/other/page_1/file.png",
			),
		).toBe(true);
		expect(
			isItemMediaKey(
				"users/user_1/../private/file.png",
			),
		).toBe(false);
	});

	it("enforces media MIME and size limits", () => {
		expect(
			validateItemMediaUpload({
				contentType: "image/png",
				size: 1,
			}),
		).toBe(true);
		expect(
			validateItemMediaUpload({
				contentType: "text/html",
				size: 1,
			}),
		).toBe(false);
		expect(
			validateItemMediaUpload({
				contentType: "video/mp4",
				size: MAX_ITEM_MEDIA_SIZE + 1,
			}),
		).toBe(false);
	});

	it("maps valid object keys to the configured public URL", () => {
		expect(
			getItemMediaUrl(
				"https://cdn.example.com/",
				"users/user_1/page_1/file name.png",
			),
		).toBe(
			"https://cdn.example.com/users/user_1/page_1/file%20name.png",
		);
	});

	it("maps trusted public assets without applying item-media restrictions", () => {
		expect(
			getPublicR2ObjectUrl(
				"https://cdn.example.com/",
				"assets/link-provider-icon/buy-me-a-coffee.svg",
			),
		).toBe(
			"https://cdn.example.com/assets/link-provider-icon/buy-me-a-coffee.svg",
		);
	});
});
