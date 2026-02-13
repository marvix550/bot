const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const axios = require("axios");
const fs = require("fs");
const http = require("http");
const pino = require("pino");
const qrcode = require('qrcode-terminal');

// --- 🌐 نظام الاستجابة الإلزامي لـ Railway (حل مشكلة SIGTERM) ---
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
    res.write("ELGRANDFT AI SYSTEM: STATUS OK ✅\n");
    res.write("DEVELOPER: ELGRANDFT (+212781886270)");
    res.end();
}).listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 السيرفر نشط على المنفذ ${PORT} - استقرار 100%`);
});

// --- ⚙️ إعدادات المطور ELGRANDFT ---
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const DEVELOPER_NAME = "ELGRANDFT";
const CONTACT_INFO = "+212781886270";

async function getAIResponse(text, imageData = null) {
    try {
        let payload = {
            model: imageData ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
            messages: [{ 
                role: "system", 
                content: `أنت ذكاء اصطناعي خارق. مطورك هو العبقري ${DEVELOPER_NAME}. رقم هاتفه ${CONTACT_INFO}. أجب بدقة ذكاء خارقة.` 
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
    } catch (e) { return "⚠️ السيرفر مشغول حالياً، جرب لاحقاً."; }
}

async function startAI() {
    // استخدام مجلد ثابت للجلسة لضمان عدم تكرار QR
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log("📷 امسح كود QR للربط (نسخة Railway):");
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'open') {
            console.log(`✅ تم الاتصال بنجاح! نظام ${DEVELOPER_NAME} في الخدمة.`);
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startAI();
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();

        if (msg.message.imageMessage) {
            const stream = await downloadContentFromMessage(msg.message.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
            const reply = await getAIResponse(msg.message.imageMessage.caption, buffer.toString('base64'));
            return await sock.sendMessage(from, { text: reply }, { quoted: msg });
        }

        if (text && !text.startsWith(".")) {
            const reply = await getAIResponse(text);
            await sock.sendMessage(from, { text: reply }, { quoted: msg });
        }
    });
}

// تشغيل النظام
startAI().catch(err => console.log("خطأ في التشغيل: " + err));