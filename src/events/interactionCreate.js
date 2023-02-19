const { InteractionType, Events } = require("discord.js");
const { critical } = require("../components/Messages");
const { endConversation } = require("../components/QuestionsManager");
const { roles } = require("../../config");


module.exports = {
	event: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.type === InteractionType.MessageComponent) {
			if (!interaction.member.roles.cache.has(roles.moderator)) return interaction.reply({
				ephemeral: true,
				embeds: [
					warning(null, "Ошибка доступа!", "Данные кнопки только для ответственных сотрудников!", {embed: true})
				]
			})
			try {
				const userId = interaction.customId.match(/[0-9]+/g)?.[0];
				const member = await interaction.guild.members.fetch(userId);
	
				if (member.roles.cache.has(roles.approved)) interaction.reply({
					ephemeral: true,
					embeds: [
						critical(null, "Вердикт уже вынесен", "Данный человек уже был верифифцирован!", {embed: true})
					]
				})
	
				if (interaction.customId.startsWith("reject")) {
					try {
						const DMChannel = await member.user.createDM();
						if (DMChannel) await critical(DMChannel, "К сожалению, ваша заявка была отклонена, всего вам хорошего!", `Модератор: \`${interaction.user.tag}\``);
					} catch (e) {}
		
					await member.ban({reason: `Заблокирован ${interaction.user.tag} через систему подачи зявок!`});
				}
				if (interaction.customId.startsWith("approve")) {
					try {
						const DMChannel = await member.user.createDM();
						if (DMChannel) await success(DMChannel, "Ваша заявка принята, добро пожаловать!");
					} catch (e) {}
		
					await member.roles.add(roles.approved);
				}
				endConversation(interaction.guild, member.user);
			} catch (e) {
				//console.error(e);
				interaction.reply({
					ephemeral: true,
					embeds: [
						critical(null, "Ошибка взаимодействия!", `Сообщение: \`${e.message}\``, {embed: true})
					]
				})
			}
		}
	
		if (interaction.type === InteractionType.ApplicationCommand) {
			const command = interaction.client.commands.get(interaction.commandName);
			if (!command) return;
			
			if (!command.allowNonMods && !interaction.member.roles.cache.has(roles.moderator)) return interaction.reply({
				ephemeral: true,
				embeds: [
					warning(null, "Нет доступа к команде!", "Данная команда только для ответственных сотрудников!", {embed: true})
				]
			})
	
			try {
				await command.execute(interaction);
			} catch (e) {
				console.error(e);
				interaction.reply({
					ephemeral: true,
					embeds: [
						critical(null, "Ошибка команды!", `Код: \`${e.message}\``, {embed: true})
					]
				})
			}
		}
	}
}