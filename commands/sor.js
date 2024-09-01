const { SlashCommandBuilder } = require('discord.js');
const MSIAI = require('msiai');
const fs = require('fs').promises;
const path = require('path');

const msiai = new MSIAI();

function getFileExtension(content) {
    if (content.includes('```javascript') || content.includes('```js')) {
        return 'js';
    } else if (content.includes('```python') || content.includes('```py')) {
        return 'py';
    } else {
        return 'txt';
    }
}

function extractCodeBlock(content) {
    const codeBlockRegex = /```(?:javascript|js|python|py)?\n([\s\S]*?)```/;
    const match = content.match(codeBlockRegex);
    return match ? match[1] : content;
}

async function handleResponse(response, replyFunc) {
    if (response.reply.length > 2000) {
        const fileExtension = getFileExtension(response.reply);
        const fileName = `cevap_${Date.now()}.${fileExtension}`;
        const filePath = path.join(__dirname, '..', 'temp', fileName);
        
        let fileContent = response.reply;
        if (fileExtension !== 'txt') {
            fileContent = extractCodeBlock(response.reply);
        }

        await fs.writeFile(filePath, fileContent);
        await replyFunc({ content: 'Cevap çok uzun, bir dosya olarak gönderiliyor.', files: [filePath] });
        await fs.unlink(filePath);
    } else {
        await replyFunc(response.reply);
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

            await handleResponse(response, (content) => message.reply(content));
        } catch (error) {
            console.error(error);
            await message.reply('Üzgünüm, bir hata oluştu.');
        }
    },
};
