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

client.on("messageCreate", async (message) => {
	const matches = [TWITTER_REGEX, PIXIV_REGEX].flatMap((regex) => [...message.content.matchAll(regex)]);
	for (const match of matches) {
		const { service, id } = match.groups!;
		if (await exists(`./storage/${service}/${id}.png`)) {
			await message.reply(`${HTTP_BASE}/storage/${service}/${id}.png`);
		} else {
			const processing = await message.reply(`Processing ${service} ${id}`);
			try {
				await snap(match[0], service, id, 1440, 2);
				await processing.edit(`${HTTP_BASE}/storage/${service}/${id}.png`);
			} catch (e) {
				await processing.edit(`Failed to process ${service} ${id}`);
			}
		}
	}
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isChatInputCommand()) return;
	interaction.deferReply();

	const url = interaction.options.getString("url")!;
	const theme = interaction.options.getString("theme");
	const width = interaction.options.getInteger("width");
	const scale = interaction.options.getInteger("scale");

	if (!PIXIV_REGEX.test(url) && !TWITTER_REGEX.test(url)) {
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

	const { service, id } = [TWITTER_REGEX, PIXIV_REGEX].find((regex) => regex.test(url))!.exec(url)!.groups!;
	if (await exists(`./storage/${service}/${id}.png`)) {
		await interaction.reply(`${HTTP_BASE}/storage/${service}/${id}.png`);
	} else {
		try {
			await snap(url, service, id, width ?? 1440, scale ?? 2);
			await interaction.reply(`${HTTP_BASE}/storage/${service}/${id}.png`);
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
