require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');

/* --------------------
   Discord Client
-------------------- */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/* --------------------
   Express Webhook Server
-------------------- */
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONITORED_CHANNEL_ID = process.env.MONITORED_CHANNEL_ID;
const SHEETDB_URL = process.env.SHEETDB_URL;

/* --------------------
   Slash Commands
-------------------- */
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if (command.data && command.execute) {
            client.commands.set(command.data.name, command);
        }
    }
}

/* --------------------
   Ready
-------------------- */
client.once(Events.ClientReady, () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

/* --------------------
   Slash Command Handler
-------------------- */
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    await command.execute(interaction);
});

/* --------------------
   Message Monitor
-------------------- */
client.on(Events.MessageCreate, async message => {
    if (message.author.id === client.user.id) return;

    if (message.channel.id === MONITORED_CHANNEL_ID) {
        console.log('📩 Message in monitored channel:', {
            author: message.author.tag,
            content: message.content,
            embeds: message.embeds.length,
            timestamp: new Date().toISOString()
        });

        // Ping Guardian on any message
        await message.channel.send('<@1457521998648574083>');
    }
});

/* --------------------
   Formcord Webhook
-------------------- */
app.post('/formcord', async (req, res) => {
    try {
        console.log('📨 Formcord payload received:', req.body);

        const {
            "Game Username": username,
            "Coords": rawCoords,
            "Title": title
        } = req.body;

        if (!username) {
            return res.status(400).send('Missing username');
        }

        const coords = (rawCoords || '').replace(/[-,]/g, ':');

        const now = new Date();
        const day = now.toLocaleDateString('en-GB');
        const timeUTC = now.toISOString().slice(11, 16);

        const sheetData = {
            data: [{
                Day: day,
                "Time (UTC)": timeUTC,
                "Reservations (UTC)": '',
                Alliance: '',
                Username: username,
                Coords: coords,
                Title: title || '',
                Guardian: '',
                Done: '',
                "Set title": ''
            }]
        };

        await axios.post(SHEETDB_URL, sheetData);

        // Notify Discord channel
        const channel = await client.channels.fetch(MONITORED_CHANNEL_ID);
        await channel.send(`📋 New reservation received for **${username}** @Guardian`);

        res.status(200).send('OK');

    } catch (err) {
        console.error('❌ Webhook error:', err);
        res.status(500).send('Server error');
    }
});

/* --------------------
   Start Servers
-------------------- */
app.listen(PORT, () => {
    console.log(`🚀 Webhook server running on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
