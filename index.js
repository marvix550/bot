const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const http = require("http");

// سيرفر Uptime لضمان نشاط البوت
http.createServer((req, res) => { res.end("SYSTEM ONLINE - DEVELOPER: ELGRANDFT"); }).listen(process.env.PORT || 3000);

const TARGET_NUMBER = "212633678896";

async function startBot() {
    // 🗑️ تنظيف آلي للجلسة عند كل تشغيل جديد
    if (fs.existsSync('./auth_info')) {
        fs.rmSync('./auth_info', { recursive: true, force: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        // 🐧 هوية Ubuntu الأسطورية
        browser: ["Ubuntu", "Chrome", "110.0.5481.178"],
        connectTimeoutMs: 120000 // وقت كافٍ جداً للربط
    });

    // طلب كود الربط
    if (!sock.authState.creds.registered) {
        console.log(`⏳ جاري طلب الكود للرقم: ${TARGET_NUMBER}...`);
        await delay(10000); 
        try {
            const code = await sock.requestPairingCode(TARGET_NUMBER);
            console.log(`\n✅ الكود هو: ${code}\n`);
        } catch (err) { console.log("❌ فشل الطلب، أعد المحاولة."); }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') console.log("🚀 تم الاتصال بنجاح يا ELGRANDFT!");
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }
    });

    // الرد البسيط للتاكد من العمل
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        await sock.sendMessage(from, { text: "أهلاً! نظام ELGRANDFT يعمل بنجاح. أرسل FT2026 لتفعيل الذكاء الاصطناعي." });
    });
}

startBot();