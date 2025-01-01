import { getSnapAppRender } from "twitter-snap";
import simpleCache from "./simpleCache.js";

export type FontOptions = Awaited<ReturnType<ReturnType<typeof getSnapAppRender>["getFont"]>>;
export type Session = Awaited<ReturnType<ReturnType<typeof getSnapAppRender>["login"]>>;
export type SnapApp = Awaited<ReturnType<typeof getSnapAppRender>>;

const sessionCache = simpleCache<[SnapApp, Session, FontOptions]>();

export const snap = async (url: string, service: string, id: string, width: number, scale: number) => {
	const [client, session, font] = await sessionCache(service, async () => {
		const client = getSnapAppRender({ url: url });
		const font = await client.getFont();
		const session = await client.login({ sessionType: "file", cookiesFile: "cookies.json" });
		return [client, session, font] as const;
	});
	const render = await client.getRender({ limit: 1, session });
	await client.run(render, async (run) => {
		const output = await run({
			theme: "RenderOceanBlueColor",
			font,
			width,
			scale,
			output: `storage/${service}/${id}/output.{if-type:png:mp4:json:}`,
		});
		const low = await run({
			theme: "RenderOceanBlueColor",
			font,
			width: 650,
			scale: 1,
			output: `storage/${service}/${id}/low.png`,
		});

		await low.file.tempCleanup();
	});
};
