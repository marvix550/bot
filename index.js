const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require("@whiskeysockets/baileys");
const pino = require("pino");
const http = require("http");

// --- 🌐 سيرفر Uptime لضمان استمرار البوت على Railway ---
http.createServer((req, res) => {
    res.write("ELGRANDFT SYSTEM IS ONLINE 🚀");
    res.end();
}).listen(process.env.PORT || 3000);

// --- ⚙️ إعدادات المطور ELGRANDFT ---
const TARGET_NUMBER = "212633678896"; // الرقم الجديد للربط
const DEVELOPER_INFO = "ELGRANDFT (+212781886270)";

async function startAI() {
    // استخدام مجلد auth_info لحفظ الجلسة
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    // حل مشكلة TypeError: pino is not a function
    const logger = pino.default ? pino.default({ level: 'silent' }) : pino({ level: 'silent' });

    const sock = makeWASocket({
        auth: state,
        logger: logger,
        printQRInTerminal: false, 
        browser: ["Ubuntu", "Chrome", "20.0.04"] // ضروري جداً لقبول كود الربط
    });

    // 🔑 طلب كود الربط (Pairing Code) إذا لم يكن مسجلاً
    if (!sock.authState.creds.registered) {
        console.log(`⏳ جاري طلب كود الربط للرقم: ${TARGET_NUMBER}...`);
        await delay(10000); // انتظار لضمان استقرار الاتصال قبل الطلب
        try {
            const code = await sock.requestPairingCode(TARGET_NUMBER);
            console.log(`\n\n🔗=======================================🔗`);
            console.log(`✅ كود الربط الخاص بك يا زعيم هو: ${code}`);
            console.log(`🔗=======================================🔗\n\n`);
        } catch (err) {
            console.log("❌ فشل طلب الكود. تأكد من حذف مجلد auth_info في Railway وإعادة التشغيل.");
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log(`🎊 تم الاتصال بنجاح! نظام المطور ${DEVELOPER_INFO} يعمل الآن.`);
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startAI();
        }
    });

    // استجابة تجريبية
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (text === "فحص") {
            await sock.sendMessage(from, { text: "البوت يعمل بنجاح تحت إشراف ELGRANDFT! ✅" });
        }
    });
}

startAI();