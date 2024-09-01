const { SlashCommandBuilder } = require('discord.js');
const MSIAI = require('msiai');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const msiai = new MSIAI();

async function ensureTempDir() {
    const tempDir = path.join(__dirname, '..', 'temp');
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

function getFileExtension(language) {
    const langMap = {
        'javascript': 'js',
        'js': 'js',
        'python': 'py',
        'py': 'py',
        'java': 'java',
        'c++': 'cpp',
        'cpp': 'cpp',
        'c#': 'cs',
        'csharp': 'cs',
        'php': 'php',
        'ruby': 'rb',
        'go': 'go',
        'rust': 'rs',
        'typescript': 'ts',
        'ts': 'ts',
        'swift': 'swift',
        'kotlin': 'kt',
        'scala': 'scala',
        'html': 'html',
        'css': 'css',
        'sql': 'sql',
        'bash': 'sh',
        'powershell': 'ps1',
        'yaml': 'yml',
        'json': 'json',
        'xml': 'xml',
        'markdown': 'md',
        'md': 'md'
    };

    return langMap[language.toLowerCase()] || 'txt';
}

function extractCodeBlocks(content) {
    const codeBlockRegex = /```([\w-]*)\n([\s\S]*?)```/g;
    const codeBlocks = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
            codeBlocks.push({
                type: 'text',
                content: content.slice(lastIndex, match.index).trim()
            });
        }
        codeBlocks.push({
            type: 'code',
            language: match[1] || 'txt',
            content: match[2].trim()
        });
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
        codeBlocks.push({
            type: 'text',
            content: content.slice(lastIndex).trim()
        });
    }

    return codeBlocks;
}

async function handleResponse(response, replyFunc) {
    const tempDir = await ensureTempDir();
    const files = [];
    const languageCounters = {};
    let messageContent = '';

    const blocks = extractCodeBlocks(response.reply);

    for (const block of blocks) {
        if (block.type === 'text') {
            messageContent += block.content + '\n\n';
        } else {
            const ext = getFileExtension(block.language);
            languageCounters[ext] = (languageCounters[ext] || 0) + 1;
            
            let fileName;
            if (languageCounters[ext] === 1) {
                fileName = `main.${ext}`;
            } else {
                fileName = `main${languageCounters[ext]}.${ext}`;
            }
            
            const filePath = path.join(tempDir, fileName);
            await fs.writeFile(filePath, block.content);
            files.push(filePath);
            messageContent += `[Kod dosyası: ${fileName}]\n\n`;
        }
    }

    
    await replyFunc({ content: messageContent.trim(), files: files });

    
    for (const file of files) {
        await fs.unlink(file);
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
