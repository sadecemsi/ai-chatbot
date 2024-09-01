const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(token);

async function deployCommands() {
    try {
        console.log('Slash komutları kaydediliyor...');

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );

        console.log('Slash komutları başarıyla kaydedildi!');
    } catch (error) {
        console.error('Komutları kaydederken bir hata oluştu:', error);
    }
}

client.once('ready', () => {
    console.log('Bot hazır!');
    deployCommands();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await interaction.deferReply();
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: 'Bu komutu çalıştırırken bir hata oluştu!', ephemeral: true }).catch(console.error);
        } else {
            await interaction.reply({ content: 'Bu komutu çalıştırırken bir hata oluştu!', ephemeral: true }).catch(console.error);
        }
    }
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith('!sor') || message.author.bot) return;

    const args = message.content.slice('!sor'.length).trim().split(/ +/);
    const soru = args.join(' ');

    if (!soru) {
        return message.reply('Lütfen bir soru sorun. Örnek: !sor Hava nasıl?');
    }

    const command = client.commands.get('sor');
    if (!command) return;

    try {
        await command.executeMessage(message, soru);
    } catch (error) {
        console.error(error);
        await message.reply('Bu komutu çalıştırırken bir hata oluştu!').catch(console.error);
    }
});

client.login(token);
