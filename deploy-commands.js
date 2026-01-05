const { REST, Routes } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// Read each command file
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Use your **guild ID** for fast testing
const guildId = process.env.GUILD_ID;      // put your test server ID in .env
const clientId = process.env.CLIENT_ID;    // put your bot ID in .env

(async () => {
    try {
        console.log('🔄 Registering slash commands...');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        console.log('✅ Slash commands registered!');
    } catch (error) {
        console.error(error);
    }
})();
