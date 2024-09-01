const { SlashCommandBuilder } = require('discord.js');
const MSIAI = require('msiai');

const msiai = new MSIAI();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sor')
        .setDescription('AI\'ya bir soru sor')
        .addStringOption(option =>
            option.setName('soru')
                .setDescription('Sormak istediğiniz soru')
                .setRequired(true)),
    async execute(interaction) {
        const soru = interaction.options.getString('soru');

        await interaction.deferReply();

        try {
            const response = await msiai.chat({
                model: "gpt-4o-mini",
                prompt: soru,
                system: ""
            });

            await interaction.editReply(response.reply);
        } catch (error) {
            console.error(error);
            await interaction.editReply('Üzgünüm, bir hata oluştu.');
        }
    },
    async executeMessage(message, soru) {
        await message.channel.sendTyping();

        try {
            const response = await msiai.chat({
                model: "gpt-4o-mini",
                prompt: soru,
                system: ""
            });

            await message.reply(response.reply);
        } catch (error) {
            console.error(error);
            await message.reply('Üzgünüm, bir hata oluştu.');
        }
    },
};
