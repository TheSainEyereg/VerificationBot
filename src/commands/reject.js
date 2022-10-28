import { Interaction, MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { getAllVerify } from "../components/DataManager.js";
import { question, warning } from "../components/Messages.js";

export default {
	data: new SlashCommandBuilder().setName("reject").setDescription("Отклоняет заявку пользователя и блокирует его на сервере."),
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
		});

		interaction.reply({
			ephemeral: true,
			embeds: [
				question(null,"Отклонить игрока?", "Нажимая кнопку \"Отклонить\" вы отклоняете заявку и блокируете пользователю доступ к серверу!", {embed: true})
			],
			components: [
				new MessageActionRow({
					components: [
						new MessageButton({
							customId: "reject"+userId,
							label: "Отклонить",
							style: "DANGER",
							emoji: "✖"
						})
					]
				}),
			]
		});
	}
};