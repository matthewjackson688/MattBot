require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const axios = require('axios');

// --------------------
// CONFIG
// --------------------
const SHEETDB_URL = process.env.SHEETDB_URL; // e.g., 'https://sheetdb.io/api/v1/my6bx0lb6c50k'
const DONE_COLUMN = "Done"; // Tickbox column in Sheet
const TIMESTAMP_COLUMN = "Done Timestamp"; // Column to store Done timestamp

// --------------------
// Discord Client Setup
// --------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// --------------------
// Helper: Format timestamp dd/MM/yyyy HH:mm
// --------------------
function formatTimestamp(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    const day = pad(date.getUTCDate());
    const month = pad(date.getUTCMonth() + 1);
    const year = date.getUTCFullYear();
    const hours = pad(date.getUTCHours());
    const minutes = pad(date.getUTCMinutes());
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// --------------------
// Helper: Update SheetDB
// --------------------
async function updateDone(rowId, done) {
    try {
        const timestamp = done ? formatTimestamp(new Date()) : "";
        const data = {
            data: [
                { 
                    [DONE_COLUMN]: done, 
                    [TIMESTAMP_COLUMN]: timestamp
                }
            ]
        };

        // Update by unique ID column (assume column A = "ID")
        await axios.put(`${SHEETDB_URL}/ID/${rowId}`, data);
        console.log(`✅ Row ${rowId} set Done=${done} Timestamp='${timestamp}'`);
    } catch (err) {
        console.error('❌ Error updating Sheet:', err.response?.data || err.message || err);
    }
}

// --------------------
// Reaction Added
// --------------------
client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;

    try {
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();

        const embed = reaction.message.embeds[0];
        if (!embed) return;

        const rowField = embed.fields?.find(f => f.name === "🆔 Row ID");
        if (!rowField) return;

        const rowId = rowField.value;
        if (!rowId) return;

        await updateDone(rowId, true);
    } catch (err) {
        console.error('❌ Reaction add handler error:', err);
    }
});

// --------------------
// Reaction Removed
// --------------------
client.on(Events.MessageReactionRemove, async (reaction, user) => {
    if (user.bot) return;

    try {
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();

        const embed = reaction.message.embeds[0];
        if (!embed) return;

        const rowField = embed.fields?.find(f => f.name === "🆔 Row ID");
        if (!rowField) return;

        const rowId = rowField.value;
        if (!rowId) return;

        await updateDone(rowId, false);
    } catch (err) {
        console.error('❌ Reaction remove handler error:', err);
    }
});

// --------------------
// Ready Event
// --------------------
client.once(Events.ClientReady, () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// --------------------
// Login
// --------------------
client.login(process.env.DISCORD_TOKEN);
