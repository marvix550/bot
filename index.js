const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const pino = require("pino");
const axios = require("axios");
const http = require("http");

// --- 🌐 سيرفر Uptime لـ Railway ---
http.createServer((req, res) => {
    res.write("ELGRANDFT AI SYSTEM IS ACTIVE 🚀");
    res.end();
}).listen(process.env.PORT || 3000);

// --- ⚙️ إعدادات المطور ELGRANDFT ---
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const TARGET_NUMBER = "212633678896"; 
const DEVELOPER_INFO = "المبرمج العبقري ELGRANDFT (+212781886270)";

// --- 🧠 محرك الذكاء الاصطناعي ---
async function getAIResponse(text, imageData = null) {
    try {
        let payload = {
            model: imageData ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
            messages: [{ 
                role: "system", 
                content: `أنت نظام ذكاء اصطناعي خارق. مطورك هو ${DEVELOPER_INFO}. أجب بذكاء، وحلل الصور والمعادلات بدقة. إذا سُئلت عن المطور امدحه كثيراً.`
            }],
            temperature: 0.6
        };
        if (imageData) {
            payload.messages.push({ role: "user", content: [{ type: "text", text: text || "حلل هذه الصورة" }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageData}` } }] });
        } else {
            payload.messages.push({ role: "user", content: text });
        }
        const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", payload, { 
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } 
        });
        return res.data.choices[0].message.content;
    } catch (e) { return "⚠️ عذراً زعيم، تأكد من إضافة GROQ_API_KEY في إعدادات Railway."; }
}

async function startAI() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const logger = pino.default ? pino.default({ level: 'silent' }) : pino({ level: 'silent' });

    const sock = makeWASocket({
        auth: state,
        logger: logger,
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // كود الربط إذا لم تكن مسجلاً
    if (!sock.authState.creds.registered) {
        await delay(5000);
        try {
            const code = await sock.requestPairingCode(TARGET_NUMBER);
            console.log(`✅ كود الربط الخاص بك: ${code}`);
        } catch (err) {
            console.log("خطأ في طلب الكود");
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        
        let text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        let imageData = null;

        if (msg.message.imageMessage) {
            const stream = await downloadContentFromMessage(msg.message.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            imageData = buffer.toString('base64');
            text = msg.message.imageMessage.caption || "";
        }

        if (text || imageData) {
            const reply = await getAIResponse(text, imageData);
            await sock.sendMessage(from, { text: reply }, { quoted: msg });
        }
    });

    sock.ev.on('connection.update', (update) => {
        if (update.connection === 'open') console.log("🚀 البوت متصل وجاهز للعمل!");
        if (update.connection === 'close') startAI();
    });
}

startAI();