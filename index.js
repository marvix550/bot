const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, downloadContentFromMessage, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const axios = require("axios");
const http = require("http");
const fs = require("fs");

// --- 🌐 سيرفر Uptime لضمان نشاط البوت على Railway ---
http.createServer((req, res) => {
    res.write("ELGRANDFT FINAL SYSTEM 🚀");
    res.end();
}).listen(process.env.PORT || 3000);

// --- ⚙️ إعدادات المطور ELGRANDFT ---
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const TARGET_NUMBER = "212633678896"; 
const ADMIN_PASSWORD = "abdessamad2014";
const ACTIVATION_CODE = "FT2026"; 
const DEVELOPER_INFO = "المبرمج العبقري ELGRANDFT (+212781886270)";

let activatedUsers = new Set();

// --- 🧠 محرك الذكاء الاصطناعي العقلاني ---
async function getAIResponse(text, imageData = null) {
    try {
        const payload = {
            model: imageData ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
            messages: [{ 
                role: "system", 
                content: `أنت نظام ذكاء اصطناعي عقلاني ومنطقي جداً. مطورك هو ${DEVELOPER_INFO}. أجب بدقة واحترافية. حلل الصور والمعادلات بذكاء.`
            }, { 
                role: "user", 
                content: imageData ? [
                    { type: "text", text: text || "حلل هذه الصورة بعقلانية" },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageData}` } }
                ] : text 
            }],
            temperature: 0.5
        };
        const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", payload, { 
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } 
        });
        return res.data.choices[0].message.content;
    } catch (e) { return "⚠️ السيرفر مشغول حالياً، حاول مرة أخرى."; }
}

async function startAI() {
    // 🔥 الخطوة الحاسمة: حذف مجلد الجلسة بالكامل عند كل تشغيل فاشل لضمان كود جديد
    if (!fs.existsSync('./auth_info/creds.json')) {
        if (fs.existsSync('./auth_info')) {
            fs.rmSync('./auth_info', { recursive: true, force: true });
            console.log('🗑️ تم تنظيف الجلسة القديمة لضمان ظهور كود ربط شغال 100%.');
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger: logger,
        printQRInTerminal: false,
        // 🦊 استخدام هوية متصفح Firefox لضمان تجاوز قيود واتساب
        browser: ["Firefox", "MacOS", "120.0"] 
    });

    // 🔑 طلب كود الربط
    if (!sock.authState.creds.registered) {
        console.log(`⏳ جاري طلب كود الربط للرقم: ${TARGET_NUMBER}...`);
        await delay(10000); 
        try {
            const code = await sock.requestPairingCode(TARGET_NUMBER);
            console.log(`\n\n🔗=======================================🔗`);
            console.log(`✅ كود الربط الخاص بك هو: ${code}`);
            console.log(`🔗=======================================🔗\n\n`);
        } catch (err) { console.log("❌ فشل طلب الكود. تأكد من أن الرقم صحيح واتصال الإنترنت مستقر."); }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // 🛡️ واجهة الآدمين
        if (text === ADMIN_PASSWORD) {
            return await sock.sendMessage(from, { text: `🛡️ أهلاً زعيم ELGRANDFT.\nالنظام يعمل بأقصى سرعة.\nالمفعلون: ${activatedUsers.size}\nالمطور: +212781886270` });
        }

        // 🔑 نظام التفعيل (يطلبه البوت لأول مرة)
        if (!activatedUsers.has(from)) {
            if (text === ACTIVATION_CODE) {
                activatedUsers.add(from);
                return await sock.sendMessage(from, { text: "✅ تم تفعيلك بنجاح! كيف يمكنني مساعدتك اليوم؟" });
            } else {
                return await sock.sendMessage(from, { text: "⚠️ أهلاً بك! لاستخدام نظام ELGRANDFT، يرجى إرسال كود التفعيل: `FT2026`" });
            }
        }

        // معالجة الصور والذكاء الاصطناعي
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
        const { connection, lastDisconnect } = update;
        if (connection === 'open') console.log("🚀 النظام متصل وشغال بنجاح!");
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startAI();
        }
    });
}

startAI();