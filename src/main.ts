import { Client, Routes } from "discord.js";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import pino from "pino";
import { getEnv } from "./env.js";
import { createIntractionChain, createMessageChain } from "./utils/discord.js";
import { createMutex } from "./utils/mutex.js";
import { TWITTER_REGEX } from "./utils/regex.js";
import { snapCommand } from "./utils/slashCommand.js";
import { createWebdavClient } from "./utils/storage.js";
import { createTwitterSnapClient, getExtByContentType } from "./utils/twitter-snap.js";

const env = await getEnv();

const log = pino({
	level: env.LOG_LEVEL,
	transport: {
		target: "pino-pretty",
		options: {
			colorize: true,
		},
	},
});

const client = new Client({ intents: ["Guilds", "GuildMessages", "MessageContent"] });
client.login(env.DISCORD_TOKEN);

const storage = createWebdavClient({
	url: env.WEBDAV_URL,
	username: env.WEBDAV_USERNAME,
	password: env.WEBDAV_PASSWORD,
	basePath: env.WEBDAV_BASE_PATH,
	baseShareUrl: env.WEBDAV_SHARE_BASE_URL,
});
const snap = await createTwitterSnapClient({
	baseurl: env.TWITTER_SNAP_API_BASEURL,
});
const mutex = createMutex(env.MUTEX_VALUE);

const syncLoop = async <T1, T2>(items: T1[], callback: (item: T1) => Promise<T2>) => {
	const res: T2[] = [];
	for (const item of items) {
		res.push(await callback(item));
	}
	return res;
};

const checkStorage = async (id: string) => {
	const existsCheck = await Promise.all(
		["png", "mp4"].map(async (ext) => {
			const path = storage.path(`${id}.${ext}`);
			const exists = await path.exists();
			return [path.url, exists] as const;
		}),
	);
	const exists = existsCheck.find(([_, exists]) => exists);
	return exists ? exists[0] : null;
};

const twitterSnap = async (param: { url: string; id: string }) => {
	const exists = await checkStorage(param.id);
	if (exists) {
		console.log(`Exists ${param.url}`);
		return exists;
	} else {
		log.info(`Processing ${param.url}`);

		const res = await snap.twitter(param.id);
		const ext = getExtByContentType(res.contentType);
		const dir = storage.path(`${param.id}.${ext}`);
		const nodeReadable = Readable.fromWeb(res.body);
		const nodeWriteStream = await dir.createWriteStream({
			headers: {
				"Content-Type": res.contentType,
				"Content-Length": res.length,
			},
		});
		await pipeline(nodeReadable, nodeWriteStream);

		return dir.url;
	}
};

client.on("error", (error) => {
	log.error({ error });
});

client.on("messageCreate", async (message) => {
	if (message.author.bot) return;
	if (!message.guild) return;
	if (!message.guild.channels.cache.find((channel) => channel.id === message.channelId)?.name.includes("twitter-snap")) return;

	const matches = [...message.content.matchAll(new RegExp(TWITTER_REGEX, "g"))];
	const chain = createMessageChain(message);
	try {
		if (matches.length > 0) {
			if (mutex.isBusy(env.MUTEX_VALUE * 10)) {
				log.warn("Server is busy");
				await chain.reply({ content: "Server is busy, please try again later." });
				return;
			}
			if (mutex.isLocked()) {
				log.warn("Request is queued");
				await chain.reply({ content: "Your request is queued, please wait..." });
			}

			await mutex.runExclusive(async () => {
				await chain.reply({ content: "Processing..." });
				const res = await syncLoop(matches, async (match) => {
					const { id } = match.groups!;
					return twitterSnap({ url: match[0], id: id! });
				});
				await chain.reply({
					content: `Snapped successfully:\n${res.join("\n")}`,
				});
			});
		}
	} catch (e) {
		log.error(e);
		await chain.reply({ content: "Failed to process the URLs." });
	}
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isChatInputCommand()) return;
	const url = interaction.options.getString("url")!;

	const chain = createIntractionChain(interaction);

	if (!new RegExp(TWITTER_REGEX, "g").test(url)) {
		await chain.reply({ content: "Invalid URL", ephemeral: true });
		return;
	}

	await chain.deferReply();
	try {
		const { id } = [...url.matchAll(new RegExp(TWITTER_REGEX, "g"))][0]!.groups!;

		if (mutex.isBusy(env.MUTEX_VALUE * 10)) {
			log.warn("Server is busy");
			await chain.reply({ content: "Server is busy, please try again later.", ephemeral: true });
			return;
		}

		const res = await mutex.runExclusive(async () => {
			return [await twitterSnap({ url: url, id: id! })];
		});

		await chain.reply({
			content: `Snapped successfully:\n${res.join("\n")}`,
		});
	} catch (e) {
		log.error(e);
		await chain.reply({ content: "Failed to process the URL.", ephemeral: true });
	}
});

client.on("clientReady", async () => {
	await client.rest.put(Routes.applicationCommands(client.user!.id!), {
		body: [snapCommand.toJSON()],
	});

	client.user!.setActivity({
		name: "Snap images from Twitter and Pixiv",
	});

	console.log("Bot is ready");
});
