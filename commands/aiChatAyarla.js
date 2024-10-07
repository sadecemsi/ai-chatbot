const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-chat-ayarla')
    .setDescription('AI chat kanalını ayarla')
    .addChannelOption(option =>
      option.setName('kanal')
        .setDescription('AI chat için kullanılacak kanal')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir.', ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'Bu komutu kullanmak için yönetici yetkisine sahip olmalısınız.', ephemeral: true });
    }

    const channel = interaction.options.getChannel('kanal');
    interaction.client.db.set(`aiChannel_${interaction.guild.id}`, channel.id);
    await interaction.reply(`AI chat kanalı ${channel} olarak ayarlandı.`);
  }, 
};
