import { Client, EmbedBuilder, Routes } from "discord.js";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import pino from "pino";
import { getEnv } from "./env.js";
import { TWITTER_REGEX } from "./utils/regex.js";
import { snapCommand } from "./utils/slashCommand.js";
import { createWebdavClient } from "./utils/storage.js";
import { createTwitterSnapClient, getExtByContentType } from "./utils/twitter-snap.js";
import { unzip } from "./utils/zip.js";

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

const syncLoop = async <T1, T2>(items: T1[], callback: (item: T1) => Promise<T2>) => {
	const res: T2[] = [];
	for (const item of items) {
		res.push(await callback(item));
	}
	return res;
};

const twitterSnap = async (param: { url: string; id: string }): Promise<[string, string]> => {
	const existsCheck = await Promise.all(
		["png", "mp4"].map(async (ext) => {
			const path = storage.path(`${param.id}.${ext}`);
			const exists = await path.exists();
			return [path.url, exists] as const;
		}),
	);
	const exists = existsCheck.find(([_, exists]) => exists);
	if (exists) {
		return [`Cached ${param.url}`, exists[0]];
	} else {
		console.log(`Processing ${param.url}`);

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

		return [`Processed ${param.url}`, dir.url];
	}
};

client.on("messageCreate", async (message) => {
	if (message.author.bot) return;
	if (!message.guild) return;
	if (!message.guild.channels.cache.find((channel) => channel.id === message.channelId)?.name.includes("twitter-snap")) return;

	const matches = [...message.content.matchAll(new RegExp(TWITTER_REGEX, "g"))];
	try {
		if (matches.length > 0) {
			const processing = await message.reply("Processing...");

			const res = await syncLoop(matches, async (match) => {
				const { id } = match.groups!;
				return twitterSnap({ url: match[0], id: id! });
			});

			const [content, files] = unzip(res);

			await processing.edit({
				embeds: files.map((file) => new EmbedBuilder().setImage(file)),
				content: content.join("\n"),
			});
		}
	} catch (e) {
		log.error(e);
		message.reply("Failed to process the URLs.");
	}
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const url = interaction.options.getString("url")!;

	if (!new RegExp(TWITTER_REGEX, "g").test(url)) {
		await interaction.reply("Invalid URL");
		return;
	}

	await interaction.deferReply();
	try {
		const { id } = [...url.matchAll(new RegExp(TWITTER_REGEX, "g"))][0]!.groups!;

		const [content, file] = await twitterSnap({ url: url, id: id! });

		await interaction.editReply({
			embeds: [new EmbedBuilder().setImage(file)],
			content: content,
		});
	} catch (e) {
		log.error(e);
		interaction.editReply("Failed to process the URL.");
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
