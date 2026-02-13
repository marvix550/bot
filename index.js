const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const http = require("http");

// --- 🌐 سيرفر Uptime لضمان نشاط البوت على Railway ---
http.createServer((req, res) => {
    res.write("ELGRANDFT SYSTEM: BREAKING LIMITS 🚀");
    res.end();
}).listen(process.env.PORT || 3000);

const TARGET_NUMBER = "212633678896"; 

async function startBot() {
    // 🗑️ تنظيف شامل للجلسة لضمان طلب كود جديد تماماً ببطاقة تعريف جديدة
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
        // 🍎 تغيير البصمة إلى MacOS لتمويه واتساب وكسر الحظر السابق
        browser: ["Mac OS", "Chrome", "121.0.6167.184"], 
        connectTimeoutMs: 120000 
    });

    // 🔑 نظام طلب الكود الذكي بانتظار طويل (إصدار كسر الحظر)
    if (!sock.authState.creds.registered) {
        console.log(`⏳ نظام كسر الحظر نشط: ننتظر دقيقة كاملة لتهدئة السيرفر...`);
        await delay(60000); 
        try {
            const code = await sock.requestPairingCode(TARGET_NUMBER);
            console.log(`\n🔗=======================================🔗`);
            console.log(`✅ كود الربط الجديد هو: ${code}`);
            console.log(`🔗=======================================🔗\n`);
        } catch (err) {
            console.log("⚠️ لا زال الحظر قائماً. اطفئ السيرفر لـ 15 دقيقة إجبارياً ثم أعد المحاولة.");
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

    // 🤖 نظام الرد التلقائي للتأكد من العمل
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        await sock.sendMessage(from, { text: "أهلاً! نظام ELGRANDFT يعمل الآن بنظام MacOS المستقر. المبرمج: +212781886270" });
    });
}

startBot();