const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const http = require("http");

// سيرفر Uptime لضمان نشاط البوت ومنع توقف Railway
http.createServer((req, res) => {
    res.write("ELGRANDFT SYSTEM: STATUS OK ✅");
    res.end();
}).listen(process.env.PORT || 3000);

const TARGET_NUMBER = "212633678896";

async function startBot() {
    // تنظيف الجلسة القديمة لضمان عدم حدوث تعارض
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
        browser: ["Ubuntu", "Chrome", "110.0.5481.178"], // البصمة التي نجحت معك
        connectTimeoutMs: 120000
    });

    // طلب كود الربط
    if (!sock.authState.creds.registered) {
        console.log(`⏳ جاري طلب الكود للرقم: ${TARGET_NUMBER}...`);
        await delay(10000); 
        try {
            const code = await sock.requestPairingCode(TARGET_NUMBER);
            console.log(`\n✅ كود الربط الخاص بك هو: ${code}\n`);
        } catch (err) {
            console.log("❌ فشل طلب الكود، يرجى المحاولة لاحقاً.");
        }
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

    // نظام الرد على الجميع
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        await sock.sendMessage(from, { text: "أهلاً! نظام ELGRANDFT يعمل بنجاح. المبرمج: +212781886270" });
    });
}

startBot();