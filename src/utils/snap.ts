import { getSnapAppRender } from "twitter-snap";
import { exists } from "./exists.js";
import simpleCache from "./simpleCache.js";

export type FontOptions = Awaited<ReturnType<ReturnType<typeof getSnapAppRender>["getFont"]>>;
export type Session = Awaited<ReturnType<ReturnType<typeof getSnapAppRender>["login"]>>;
export type SnapApp = Awaited<ReturnType<typeof getSnapAppRender>>;

const sessionCache = simpleCache<[Session, FontOptions]>();

export const snap = async (url: string, service: string, id: string, width: number, scale: number, theme: string) => {
	const [session, font] = await sessionCache(service, async () => {
		const client = getSnapAppRender({ url: url });
		const font = await client.getFont();
		const session = await client.login({ sessionType: "file", cookiesFile: "cookies.json" });
		return [session, font] as const;
	});
	const client = getSnapAppRender({ url: url });
	const render = await client.getRender({ limit: 1, session });
	await client.run(render, async (run) => {
		const output = await run({
			theme,
			font,
			width,
			scale,
			ffmpegTimeout: 60,
			output: `storage/${service}/${id}/output.{if-type:png:mp4:json:}`,
		});

		if (!(await exists(`./storage/${service}/${id}/output.png`))) {
			const low = await run({
				theme,
				font,
				width: 650,
				scale: 1,
				output: `storage/${service}/${id}/low.png`,
			});
			await low.file.tempCleanup();
		}
	});
};
