const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const http = require("http");

// --- 🌐 سيرفر Uptime لضمان نشاط البوت على Railway ---
http.createServer((req, res) => {
    res.write("ELGRANDFT SYSTEM: READY AND STABLE ✅");
    res.end();
}).listen(process.env.PORT || 3000);

const TARGET_NUMBER = "212633678896"; 

async function startBot() {
    // 🗑️ تنظيف شامل للجلسة لضمان طلب كود جديد تماماً
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
        // 🐧 هوية Ubuntu التي تضمن قبول الربط
        browser: ["Ubuntu", "Chrome", "110.0.5481.178"],
        connectTimeoutMs: 120000 
    });

    // 🔑 نظام طلب الكود الذكي لتجنب الحظر (إصدار عبد الصمد)
    if (!sock.authState.creds.registered) {
        console.log(`⏳ ننتظر 30 ثانية لتهيئة السيرفر وتجنب حظر واتساب...`);
        await delay(30000); 
        try {
            const code = await sock.requestPairingCode(TARGET_NUMBER);
            console.log(`\n🔗=======================================🔗`);
            console.log(`✅ كود الربط الذهبي الخاص بك هو: ${code}`);
            console.log(`🔗=======================================🔗\n`);
        } catch (err) {
            console.log("⚠️ فشل الطلب مؤقتاً. سأعيد المحاولة تلقائياً بعد دقيقة واحدة...");
            await delay(60000);
            return startBot(); // إعادة المحاولة تلقائياً
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log("🚀 تم الاتصال بنجاح يا زعيم ELGRANDFT! البوت يعمل الآن.");
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }
    });

    // 🤖 استجابة بسيطة للتأكد من العمل
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        await sock.sendMessage(from, { text: "أهلاً! نظام ELGRANDFT يعمل بنجاح. المبرمج العبقري: +212781886270" });
    });
}

startBot();