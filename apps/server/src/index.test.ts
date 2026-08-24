import {
	describe,
	expect,
	it,
} from "bun:test";
import { queue } from "./index";

describe("item media queue consumer", () => {
	it("deletes only validated item media keys", async () => {
		const deleted: string[] = [];
		await queue(
			{
				messages: [
					{
						body: {
							objectKey:
								"users/user_1/page_1/photo.png",
						},
					},
					{
						body: {
							objectKey:
								"users/user_1/profile-photo.png",
						},
					},
				],
			} as never,
			{
				IMAGES: {
					delete: async (
						key: string,
					) => {
						deleted.push(key);
					},
				},
			} as never,
		);

		expect(deleted).toEqual([
				"users/user_1/page_1/photo.png",
		]);
	});
});
