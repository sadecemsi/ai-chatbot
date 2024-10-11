const { Client, GatewayIntentBits, Partials, Collection, REST, Routes } = require('discord.js');
const { promises: fs } = require('fs');
const path = require('path');
const croxydb = require('croxydb');
const MSIAI = require('msiai');
const { token, apiKey } = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.commands = new Collection();
client.msiai = new MSIAI();
client.db = croxydb;

const commandsPath = path.join(__dirname, 'commands');

async function loadCommands() {
  const commandFiles = await fs.readdir(commandsPath);
  for (const file of commandFiles.filter(file => file.endsWith('.js'))) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[UYARI] ${filePath} komutunda gerekli "data" veya "execute" özelliği eksik.`);
    }
  }
}

client.once('ready', async () => {
  console.log(`${client.user.tag} olarak giriş yapıldı!`);
  
  await loadCommands();
  
  const commands = [];
  client.commands.forEach(command => {
    commands.push(command.data.toJSON());
  });

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Slash komutları yükleniyor...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash komutları başarıyla yüklendi!');
  } catch (error) {
    console.error('Slash komutları yüklenirken bir hata oluştu:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Bu komutu çalıştırırken bir hata oluştu!', ephemeral: true }).catch(console.error);
    } else {
      await interaction.followUp({ content: 'Bu komutu çalıştırırken bir hata oluştu!', ephemeral: true }).catch(console.error);
    }
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const isAIChannel = message.guild && message.channel.id === client.db.get(`aiChannel_${message.guild.id}`);

  if (isAIChannel) {
    await handleAIChat(message, client, message.guild.id);
  }
});

async function ensureTempDir() {
  const tempDir = path.join(__dirname, 'temp');
  try {
    await fs.access(tempDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(tempDir, { recursive: true });
    } else {
      throw error;
    }
  }
  return tempDir;
}

function formatCodeBlocks(content) {
  const codeBlockRegex = /```(\w+)?\n([\s\S]+?)\n```/g;
  return content.replace(codeBlockRegex, (match, lang, code) => {
    lang = lang || '';
    return `\`\`\`${lang}\n${code}\n\`\`\``;
  });
}

async function handleResponse(response, replyFunc) {
  const tempDir = await ensureTempDir();
  let formattedResponse = formatCodeBlocks(response);

  if (formattedResponse.length > 2000) {
    const filePath = path.join(tempDir, 'msi.txt');
    await fs.writeFile(filePath, formattedResponse);
    await replyFunc({ 
      content: 'Discord 2000 karakter sonrasını engelliyor bu yüzden "msi.txt" halinde gönderdim.',
      files: [filePath]
    });
    await fs.unlink(filePath);
  } else {
    const chunks = formattedResponse.match(/[\s\S]{1,2000}/g) || [];
    for (const chunk of chunks) {
      await replyFunc({ content: chunk });
    }
  }
}

async function handleAIChat(message, client, contextId) {
  const userId = message.author.id;
  const content = message.content;

  if (content.toLowerCase() === '!clear') {
    client.db.delete(`conversation_${contextId}_${userId}`);
    await message.reply('Sohbet geçmişiniz temizlendi.');
    return;
  }

  let conversation = client.db.get(`conversation_${contextId}_${userId}`) || [];
  
  const processedContent = content.replace(/```[\s\S]*?```/g, '[Code block]');
  conversation.push({ role: 'user', content: processedContent });

  let totalChars = 0;
  conversation = conversation.slice(-10).filter(msg => {
    totalChars += msg.content.length;
    return totalChars <= 2000; 
  });

  const loadingEmojiId = '1275570067450499152';
  const thinkingMessage = await message.reply(`Düşünüyorum... <a:loading:${loadingEmojiId}>`);

  try {
    const response = await client.msiai.chat({
      model: "gpt-4o-latest",
      prompt: conversation.map(msg => msg.content).join('\n'),
      system: "You are a helpful assistant. Do not provide any Discord invites or use any mentions in your responses. You can include other URLs if necessary."
    });

    await thinkingMessage.delete().catch(() => {});
    await handleResponse(response.reply, async (content) => {
      try {
        return await message.reply(content);
      } catch (error) {
        console.error('Error sending reply:', error);
        return message.channel.send(content).catch(console.error);
      }
    });

    const processedReply = response.reply.replace(/```[\s\S]*?```/g, '[Code block]');
    conversation.push({ role: 'assistant', content: processedReply });
    
    client.db.set(`conversation_${contextId}_${userId}`, conversation);
  } catch (error) {
    console.error('AI yanıt hatası:', error);
    if (error.message.includes('API key is required')) {
      await thinkingMessage.edit('API anahtarı eksik veya geçersiz. Lütfen sistem yöneticisiyle iletişime geçin.').catch(() => {});
    } else if (error.response && error.response.status === 403) {
      await thinkingMessage.edit('API isteği reddedildi. Lütfen "!clear" komutunu kullanarak sohbet geçmişini temizleyin ve tekrar deneyin.').catch(() => {});
    } else {
      await thinkingMessage.edit('Yanıt oluşturulurken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.').catch(() => {});
    }
  }
}

client.login(token);
