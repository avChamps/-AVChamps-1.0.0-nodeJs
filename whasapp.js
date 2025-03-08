const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js'); // Add MessageMedia import
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});


// Flag to track readiness
let isClientReady = false;

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan this QR code with your WhatsApp');
});

client.on('ready', async () => {
    console.log('WhatsApp client is ready!');
    isClientReady = true; // Set flag when ready
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
    isClientReady = false; // Reset flag on disconnect
});

// Initialize client
client.initialize();

// Utility function to wait for client readiness
async function waitForClientReady() {
    while (!isClientReady) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Poll every 100ms
    }
}

    async function sendWhatsAppMessage(events = []) {
    try {
        await waitForClientReady();

        const chats = await client.getChats();
        console.log(`Total chats fetched: ${chats.length}`);

        let groupChats = chats.filter(chat => chat.id.server === 'g.us');
        console.log(`Total group chats fetched: ${groupChats.length}`);

        const groupId = '120363182962160359@g.us'; // Replace with actual group ID

        if (groupChats.some(group => group.id._serialized === groupId)) {
            const media = await MessageMedia.fromUrl('https://avchamps.com/assets/images/events-ime.jpg');

            let eventMessage = `Hello AVCHAMP,\n\n`;
            eventMessage += `Below is the list of today's ongoing AV events, webinars, and training sessions.You are welcome to attend any event that interests you.\n\n`;

            if (events.length > 0) {
                events.forEach((event) => {
                    eventMessage += `\uD83D\uDD37 ${event.event_name.replace('.', '.\u200B')}\n`; // 🔷
                });
            } else {
                eventMessage += `No events scheduled today.\n`;
            }

            eventMessage += `\n\uD83C\uDF10 More info: https://avchamps.com ->\n\n`; // 🌐
            eventMessage += `SignIn -> Profile -> Tools -> Calendar\n\n`;
            eventMessage += `Best Regards,\nAV CHAMPS\nhttps://avchamps.com/`;

            await client.sendMessage(groupId, media, { caption: eventMessage });

            console.log(`Event message and image sent successfully to group ${groupId} in a single message!`);
        } else {
            console.log(`Group ID ${groupId} not found in your chat list. Verify the ID.`);
        }
    } catch (err) {
        console.error('Error sending WhatsApp message or image:', err);
    }
}  



// Export a wrapped version that ensures readiness and accepts events
module.exports = {
    sendWhatsAppMessage: async (events) => {
        console.log(events)
        await waitForClientReady();
        return sendWhatsAppMessage(events);
    }
};
