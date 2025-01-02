import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Client, Routes } from "discord.js";
import dotenv from "dotenv";
import { Hono } from "hono";
import { exists } from "./utils/exists.js";
import { PIXIV_REGEX, TWITTER_REGEX } from "./utils/regex.js";
import { snapCommand, snapTheme } from "./utils/slashCommand.js";
import { snap } from "./utils/snap.js";

dotenv.config();
const { DISCORD_TOKEN, HTTP_SERVER_PORT, HTTP_BASE } = process.env;
const app = new Hono();
app.get("/storage/*", serveStatic({ root: "./" }));
serve({ fetch: app.fetch, port: Number(HTTP_SERVER_PORT) });

const client = new Client({ intents: ["Guilds", "GuildMessages", "MessageContent"] });
client.login(DISCORD_TOKEN);

const check = async (service: string, id: string) => {
	if (await exists(`./storage/${service}/${id}/output.png`)) {
		return [`${HTTP_BASE}/storage/${service}/${id}/output.png`, `${HTTP_BASE}/storage/${service}/${id}/low.png`];
	}
	if (await exists(`./storage/${service}/${id}/output.mp4`)) {
		return [`${HTTP_BASE}/storage/${service}/${id}/output.mp4`, `${HTTP_BASE}/storage/${service}/${id}/low.png`];
	}
	return null;
};

const regexList = () => {
	return [TWITTER_REGEX, PIXIV_REGEX].map((regex) => new RegExp(regex, "g"));
};

client.on("messageCreate", async (message) => {
	if (message.author.bot) return;
	if (!message.guild) return;
	if (!message.guild.channels.cache.some((channel) => channel.name === "twitter-snap")) return;
	const matches = regexList().flatMap((regex) => [...message.content.matchAll(regex)]);
	if (matches.length > 0) {
		const processing = await message.reply("Processing...");

		const files = [];
		const content = [];
		for (const match of matches) {
			const { service, id } = match.groups!;
			const file = await check(service, id);
			if (file) {
				content.push(`Cached ${file[0]}`);
				files.push(file[1]);
			} else {
				try {
					console.log(`Processing ${match[0]}`);
					await snap(match[0], service, id, 1440, 2);
					const file = (await check(service, id))!;
					content.push(`Processed ${file[0]}`);
					files.push(file[1]);
				} catch (e) {
					content.push("Failed to process image");
				}
			}
		}
		await processing.edit({ files, content: content.join("\n") });
	}
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isChatInputCommand()) return;
	interaction.deferReply();

	const url = interaction.options.getString("url")!;
	const theme = interaction.options.getString("theme");
	const width = interaction.options.getInteger("width");
	const scale = interaction.options.getNumber("scale");

	if (!regexList().some((regex) => regex.test(url))) {
		await interaction.reply("Invalid URL");
		return;
	}

	if (theme && !snapTheme.some((t) => t.value === theme)) {
		await interaction.reply("Invalid theme");
		return;
	}

	if (width && width < 0 && width > 1440) {
		await interaction.reply("Width must be greater than 0");
		return;
	}

	if (scale && scale < 0 && scale > 2) {
		await interaction.reply("Scale must be greater than 0");
		return;
	}

	const { service, id } = regexList().flatMap((regex) => [...url.matchAll(regex)])[0].groups!;
	const file = await check(service, `${id}-${width}-${scale}`);

	if (file) {
		await interaction.reply({ files: [file[1]], content: `Cached ${file[0]}` });
	} else {
		try {
			console.log(`Processing ${url}`);
			await snap(url, service, `${id}-${width}-${scale}`, width ?? 1440, scale ?? 2);
			const file = (await check(service, id))!;
			await interaction.reply({ files: [file[1]], content: `Processed ${file[0]}` });
		} catch (e) {
			await interaction.reply("Failed to process image");
		}
	}
});

client.on("ready", async () => {
	await client.rest.put(Routes.applicationCommands(client.user!.id!), {
		body: [snapCommand.toJSON()],
	});

	client.user!.setActivity({
		name: "Snap images from Twitter and Pixiv",
	});

	console.log("Bot is ready");
});
