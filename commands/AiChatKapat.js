const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-chat-kapat')
    .setDescription('AI chat özelliğini kapat')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'Bu komutu kullanmak için yönetici yetkisine sahip olmalısınız.', ephemeral: true });
    }

    interaction.client.db.delete(`aiChannel_${interaction.guild.id}`);
    await interaction.reply('AI chat özelliği kapatıldı.');
  },
};
