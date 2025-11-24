import { SlashCommandBuilder } from "discord.js";
export const snapTheme = [
	{ name: "Ocean Blue", value: "RenderOceanBlueColor" },
	{ name: "Ocean Blue Dark", value: "RenderOceanBlueDarkColor" },
	{ name: "Sunset Garden", value: "RenderSunsetGardenColor" },
	{ name: "Sunset Garden Dark", value: "RenderSunsetGardenDarkColor" },
	{ name: "Dawn Blossom", value: "RenderDawnBlossomColor" },
	{ name: "Dawn Blossom Dark", value: "RenderDawnBlossomDarkColor" },
	{ name: "Fiery Sunset", value: "RenderFierySunsetColor" },
	{ name: "Fiery Sunset Dark", value: "RenderFierySunsetDarkColor" },
	{ name: "Twilight Sky", value: "RenderTwilightSkyColor" },
	{ name: "Twilight Sky Dark", value: "RenderTwilightSkyDarkColor" },
	{ name: "Plain", value: "RenderPlainColor" },
	{ name: "Plain Dark", value: "RenderPlainDarkColor" },
	{ name: "Transparent", value: "RenderTransparent" },
	{ name: "Transparent Dark", value: "RenderTransparentDark" },
	{ name: "Transparent Shadow", value: "RenderTransparentShadow" },
	{ name: "Transparent Shadow Dark", value: "RenderTransparentShadowDark" },
	{ name: "Make It A Quote", value: "RenderMakeItAQuote" },
];

export const snapCommand = new SlashCommandBuilder()
	.setName("snap")
	.setDescription("Snap an image from Twitter or Pixiv")
	.addStringOption((option) => {
		return option.setName("url").setDescription("The URL of the Twitter or Pixiv post").setRequired(true);
	});