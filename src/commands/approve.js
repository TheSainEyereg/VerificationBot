import { Interaction, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { getAllVerify } from "../components/DataManager.js";
import { question } from "../components/Messages.js";

export default {
	data: new SlashCommandBuilder().setName("approve").setDescription("Подтверждает пользователя из этого канала."),
	/**
	 * Interaction
	 * @param {Interaction} interaction - interaction
	 */
	async execute(interaction) {
		const allVerifications = getAllVerify();
		const userId = Object.entries(allVerifications).find(e => e[1].channel == interaction.channel.id)?.[0];

		if (!userId) return interaction.reply({
			ephemeral: true,
			embeds: [
				warning(null, "Неправильное использование!", "Команда должна запускаться исключительно в канале для верификации пользователя!", {embed: true})
			]
		})

		interaction.reply({
			ephemeral: true,
			embeds: [
				question(null,"Подтвердить игрока?", "Нажимая кнопку \"Подтвердить\" вы разрешаете пользователю доступ к серверу!", {embed: true})
			],
			components: [
				new MessageActionRow({
					components: [
						new MessageButton({
							customId: "approve"+userId,
							label: "Подтвердить",
							style: "SUCCESS",
							emoji: "✔"
						})
					]
				}),
			]
		})
	}
}