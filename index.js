const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, pino } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const axios = require("axios");
const http = require("http");

// --- سيرفر Uptime لـ Railway ---
http.createServer((req, res) => {
    res.write("ELGRANDFT BOT IS ONLINE 🚀");
    res.end();
}).listen(process.env.PORT || 3000);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEVELOPER_NUMBER = "212781886270"; // رقمك يا بطل

async function startAI() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // تم الإلغاء لتجنب التحذير
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // توليد كود الربط إذا لم يكن مسجلاً
    if (!sock.authState.creds.registered) {
        console.log("⏳ جاري توليد كود الربط الخاص بـ ELGRANDFT...");
        setTimeout(async () => {
            let code = await sock.requestPairingCode(DEVELOPER_NUMBER);
            console.log(`\n\n************************************`);
            console.log(`✅ كود الربط الخاص بك هو: ${code}`);
            console.log(`************************************\n\n`);
        }, 5000);
    }

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') console.log("✅ تم الاتصال بنجاح يا زعيم ELGRANDFT!");
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startAI();
        }
    });

    // استجابة الذكاء الاصطناعي (مبسطة للتجربة)
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (text) {
            try {
                const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "system", content: "أنت بوت مطور من قبل المبرمج ELGRANDFT رقم هاتفه 212781886270+." }, { role: "user", content: text }]
                }, { headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } });
                await sock.sendMessage(from, { text: response.data.choices[0].message.content });
            } catch (e) {
                console.log("خطأ في API");
            }
        }
    });
}

startAI();