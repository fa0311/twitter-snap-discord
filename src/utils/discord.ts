import { type ChatInputCommandInteraction, type Message, MessageFlags } from "discord.js";

type MessageOption = {
	content: string;
};

export const createMessageChain = (message: Message) => {
	let msg: Message | undefined;
	const reply = async (content: MessageOption) => {
		if (msg) {
			await msg.edit(content);
		} else {
			msg = await message.reply(content);
		}
	};
	return { reply };
};

type InteractionOption = {
	content: string;
	ephemeral?: boolean;
};

export const createIntractionChain = (interaction: ChatInputCommandInteraction) => {
	let edited = false;
	const reply = async (content: InteractionOption) => {
		if (edited) {
			await interaction.editReply(content);
		} else {
			if (content.ephemeral) {
				await interaction.reply({ content: content.content, flags: [MessageFlags.Ephemeral] });
			} else {
				await interaction.reply({ content: content.content });
			}
			edited = true;
		}
	};

	const deferReply = async () => {
		await interaction.deferReply();
		edited = true;
	};
	return { reply, deferReply };
};
