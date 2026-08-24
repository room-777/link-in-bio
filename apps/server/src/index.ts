import { authController } from "@controllers/auth.controller";
import { billingController } from "@controllers/billing.controller";
import { healthController } from "@controllers/health.controller";
import { pageItemsController } from "@controllers/page-items.controller";
import { pagesController } from "@controllers/pages.controller";
import { appFactory } from "@core/app-factory";
import {
	isItemMediaKey,
	isProfileImageCropKey,
	isProfileImageKey,
	isProfileImageStagingKey,
} from "@core/r2";
import { createDatabaseClient } from "@db/index";
import { pages } from "@db/schema";
import { errorHandler } from "@middlewares/error-handler.middleware";
import { notFoundHandler } from "@middlewares/not-found.middleware";
import { lte } from "drizzle-orm";
import { deleteOwnedPage } from "./services/page.service";
import { reconcileUserPageLifecycle } from "./services/page-lifecycle.service";

const app = appFactory
	.createApp()
	.notFound(notFoundHandler)
	.onError(errorHandler)
	.route("/auth", authController)
	.route("/billing", billingController)
	.route("/pages", pagesController)
	.route("/pages", pageItemsController)
	.route("/", healthController);

export type AppType = typeof app;

export const queue = async (
	batch: MessageBatch<{
		objectKey: string;
	}>,
	env: CloudflareBindings,
) => {
	await Promise.all(
		batch.messages.map(
			async (message) => {
				if (
					isItemMediaKey(
						message.body.objectKey,
					) ||
					isProfileImageKey(
						message.body.objectKey,
					) ||
					isProfileImageCropKey(
						message.body.objectKey,
					) ||
					isProfileImageStagingKey(
						message.body.objectKey,
					)
				) {
					await env.IMAGES.delete(
						message.body.objectKey,
					);
				}
			},
		),
	);
};

const ITEM_MEDIA_ORPHAN_AGE_MS =
	24 * 60 * 60 * 1000;

export const scheduled = async (
	_controller: ScheduledController,
	env: CloudflareBindings,
) => {
	const db = createDatabaseClient(env);
	const now = new Date();
	const scheduledPages =
		await db.query.pages.findMany({
			where: lte(
				pages.deletionScheduledAt,
				now,
			),
			columns: {
				userId: true,
				handle: true,
			},
		});
	const userIds = new Set(
		scheduledPages.map(
			(page) => page.userId,
		),
	);
	for (const userId of userIds)
		await reconcileUserPageLifecycle({
			db,
			userId,
			now,
		});
	for (const page of scheduledPages) {
		try {
			await deleteOwnedPage({
				env,
				db,
				userId: page.userId,
				handle: page.handle,
				queue:
					env.ITEM_MEDIA_DELETE_QUEUE,
			});
		} catch (error) {
			console.error(
				"[page] scheduled cleanup failed",
				error,
			);
		}
	}
	const referencedKeys =
		new Set<string>();
	const items =
		await db.query.pageItems.findMany({
			columns: {
				type: true,
				data: true,
			},
		});
	for (const item of items) {
		if (
			item.type === "media" &&
			typeof item.data.objectKey ===
				"string" &&
			isItemMediaKey(
				item.data.objectKey,
			)
		)
			referencedKeys.add(
				item.data.objectKey,
			);
	}
	const referencedPages =
		await db.query.pages.findMany({
			columns: {
				image: true,
				imageSource: true,
			},
		});
	for (const page of referencedPages)
		for (const key of [
			page.image,
			page.imageSource,
		])
			if (
				key &&
				(isProfileImageKey(key) ||
					isProfileImageCropKey(key) ||
					isProfileImageStagingKey(key))
			)
				referencedKeys.add(key);

	const cutoff =
		Date.now() -
		ITEM_MEDIA_ORPHAN_AGE_MS;
	const orphanKeys: string[] = [];
	let cursor: string | undefined;
	for (;;) {
		const listed =
			await env.IMAGES.list({
				prefix: "users/",
				...(cursor ? { cursor } : {}),
			});
		for (const object of listed.objects)
			if (
				(isItemMediaKey(object.key) ||
					isProfileImageKey(
						object.key,
					) ||
					isProfileImageCropKey(
						object.key,
					) ||
					isProfileImageStagingKey(
						object.key,
					)) &&
				object.uploaded.getTime() <
					cutoff &&
				!referencedKeys.has(object.key)
			)
				orphanKeys.push(object.key);
		if (!listed.truncated) break;
		cursor = listed.cursor;
	}

	for (
		let index = 0;
		index < orphanKeys.length;
		index += 1000
	)
		await env.IMAGES.delete(
			orphanKeys.slice(
				index,
				index + 1000,
			),
		);
};

export default {
	fetch: app.fetch,
	queue,
	scheduled,
};
