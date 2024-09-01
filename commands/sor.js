const { SlashCommandBuilder } = require('discord.js');
const MSIAI = require('msiai');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');  

const msiai = new MSIAI();
const tempDir = path.join(__dirname, '..', 'temp');

async function ensureTempDirExists() {
    try {
        await fs.access(tempDir);
    } catch (error) {
        await fs.mkdir(tempDir, { recursive: true });
    }
}

async function handleResponse(response, replyFunc) {
    await ensureTempDirExists();

    const replyContent = response.reply;

    if (replyContent.length > 2000) {
        const fileName = `cevap_${uuidv4()}.txt`;  
        const filePath = path.join(tempDir, fileName);

       
        await fs.writeFile(filePath, replyContent);
        console.log(`Dosya oluşturuldu: ${filePath}`);
        
       
        await replyFunc({ content: 'Yanıt çok uzun, bir dosya olarak gönderiliyor.', files: [filePath] });
        
       
        await fs.unlink(filePath);
        console.log(`Dosya silindi: ${filePath}`);
    } else {
        await replyFunc(replyContent);
    }
}

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

        try {
            const response = await msiai.chat({
                model: "gpt-4o-mini",
                prompt: soru,
                system: ""
            });

            await handleResponse(response, (content) => interaction.editReply(content));
        } catch (error) {
            console.error('Soru sorma hatası:', error);
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

            await handleResponse(response, (content) => message.reply(content));
        } catch (error) {
            console.error('Soru sorma hatası:', error);
            await message.reply('Üzgünüm, bir hata oluştu.');
        }
    },
};
