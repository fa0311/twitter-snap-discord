import z from "zod";
import { parseEnv } from "./utils/env.js";

const env = parseEnv(
	z.object({
		LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

		WEBDAV_URL: z.string(),
		WEBDAV_USERNAME: z.string(),
		WEBDAV_PASSWORD: z.string(),
		WEBDAV_BASE_PATH: z.string().default("/"),
		WEBDAV_SHARE_BASE_URL: z.string(),

		TWITTER_SNAP_API_BASEURL: z.string(),

		DISCORD_TOKEN: z.string(),
		MUTEX_VALUE: z
			.string()
			.transform((val) => parseInt(val, 10))
			.default(1),
	}),
);

export const getEnv = async () => await env;
