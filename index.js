const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode-terminal");
const axios = require("axios");
const fs = require("fs");
const http = require("http");
const pino = require("pino");

// --- 🌐 سيرفر Uptime لـ Railway ---
http.createServer((req, res) => {
    res.write("ELGRANDFT SYSTEM IS ACTIVE 🚀");
    res.end();
}).listen(3000);

// --- ⚙️ إعدادات المطور ELGRANDFT ---
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const ADMIN_NUMBER = "212781886270@s.whatsapp.net"; 
const DEVELOPER_NAME = "ELGRANDFT";
const CONTACT_INFO = "+212781886270";
const ADMIN_PASSWORD = "abdessamad2014"; 

async function getAIResponse(text, imageData = null) {
    try {
        let payload = {
            model: imageData ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
            messages: [{ 
                role: "system", 
                content: `أنت نظام ذكاء اصطناعي خارق وعقلاني جداً. مطورك هو المبرمج العبقري ${DEVELOPER_NAME}. إذا سُئلت عن المطور، امدحه كثيراً وقدم رقم هاتفه ${CONTACT_INFO}. أنت تحلل الصور والمعادلات بدقة.` 
            }],
            temperature: 0.2
        };
        if (imageData) {
            payload.messages.push({ role: "user", content: [{ type: "text", text: text || "حلل الصورة" }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageData}` } }] });
        } else {
            payload.messages.push({ role: "user", content: text });
        }
        const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", payload, { headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } });
        return res.data.choices[0].message.content;
    } catch (e) { return "⚠️ السيرفر مشغول حالياً."; }
}

async function startAI() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // 🔑 ميزة الربط بالرقم لتجاوز مشكلة الـ QR في Railway
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            let code = await sock.requestPairingCode("212781886270");
            console.log(`\n\n🔗=======================================🔗`);
            console.log(`\n   كود الربط الخاص بك يا زعيم هو: ${code}\n`);
            console.log(`🔗=======================================🔗\n\n`);
        }, 5000);
    }

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') console.log(`✅ نظام ${DEVELOPER_NAME} متصل الآن!`);
        if (connection === 'close') { 
            if ((lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut) startAI(); 
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();

        if (text === ADMIN_PASSWORD) return await sock.sendMessage(from, { text: `👑 أهلاً بك يا زعيم ${DEVELOPER_NAME}. البوت تحت أمرك.` });

        if (msg.message.imageMessage) {
            const stream = await downloadContentFromMessage(msg.message.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            const reply = await getAIResponse(msg.message.imageMessage.caption, buffer.toString('base64'));
            return await sock.sendMessage(from, { text: reply }, { quoted: msg });
        }

        if (text && !text.startsWith(".")) {
            const reply = await getAIResponse(text);
            await sock.sendMessage(from, { text: reply }, { quoted: msg });
        }
    });
}
startAI();