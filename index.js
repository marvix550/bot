const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const axios = require("axios");
const http = require("http");
const pino = require("pino");

// --- 🌐 سيرفر Uptime لـ Railway ---
http.createServer((req, res) => {
    res.write("ELGRANDFT SYSTEM IS ACTIVE 🚀");
    res.end();
}).listen(process.env.PORT || 3000);

// --- ⚙️ إعدادات المطور ELGRANDFT ---
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const DEVELOPER_NAME = "ELGRANDFT";
const CONTACT_INFO = "+212781886270";

async function getAIResponse(text) {
    try {
        const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama-3.3-70b-versatile",
            messages: [{ 
                role: "system", 
                content: `أنت ذكاء اصطناعي خارق. مطورك هو المبرمج العبقري ${DEVELOPER_NAME}. إذا سُئلت عن المطور، امدحه وقدم رقم هاتفه ${CONTACT_INFO}.` 
            }, { role: "user", content: text }],
        }, { headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } });
        return res.data.choices[0].message.content;
    } catch (e) { return "⚠️ السيرفر مشغول حالياً."; }
}

async function startAI() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    // إعداد الاتصال مع تصحيح استدعاء pino
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // 🔑 توليد كود الربط (Pairing Code)
    if (!sock.authState.creds.registered) {
        console.log("⏳ جاري طلب كود الربط لـ ELGRANDFT...");
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode("212781886270");
                console.log(`\n\n🔗=======================================🔗`);
                console.log(`\n   كود الربط الخاص بك يا زعيم هو: ${code}\n`);
                console.log(`🔗=======================================🔗\n\n`);
            } catch (err) {
                console.log("❌ فشل توليد الكود، تأكد من أن الرقم غير مرتبط مسبقاً.");
            }
        }, 10000); // انتظر 10 ثوانٍ لضمان استقرار السيرفر
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') console.log(`✅ تم الاتصال! نظام ${DEVELOPER_NAME} جاهز.`);
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startAI();
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (text) {
            const reply = await getAIResponse(text);
            await sock.sendMessage(from, { text: reply }, { quoted: msg });
        }
    });
}

startAI();