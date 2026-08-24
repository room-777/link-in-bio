import { prettyJSON } from "hono/pretty-json";

export const prettyJsonMiddleware =
	prettyJSON();
