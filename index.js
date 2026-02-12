const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, downloadContentFromMessage, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const axios = require("axios");
const http = require("http");
const fs = require("fs");

// --- 🌐 سيرفر Uptime لضمان نشاط البوت على Railway ---
http.createServer((req, res) => {
    res.write("ELGRANDFT SYSTEM: ULTIMATE ONLINE 🚀");
    res.end();
}).listen(process.env.PORT || 3000);

// --- ⚙️ إعدادات المطور ELGRANDFT ---
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const TARGET_NUMBER = "212633678896"; 
const ADMIN_PASSWORD = "abdessamad2014";
const ACTIVATION_CODE = "FT2026"; 
const DEVELOPER_INFO = "المبرمج العبقري ELGRANDFT (+212781886270)";

let activatedUsers = new Set();

// --- 🧠 محرك الذكاء الاصطناعي العقلاني (لحل المعادلات وتحليل الصور) ---
async function getAIResponse(text, imageData = null) {
    try {
        const payload = {
            model: imageData ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
            messages: [{ 
                role: "system", 
                content: `أنت نظام ذكاء اصطناعي فائق الذكاء، عقلاني ومنطقي. مطورك هو ${DEVELOPER_INFO}. 
                تجيب على أي سؤال، تحلل المعادلات المعقدة والصور بدقة. إذا سُئلت عن المطور امدحه واذكر رقمه +212781886270.`
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
    // 🔥 تنظيف شامل عند كل محاولة لضمان كود ربط جديد وشغال
    if (fs.existsSync('./auth_info')) {
        fs.rmSync('./auth_info', { recursive: true, force: true });
        console.log('🗑️ تم تنظيف الجلسة القديمة لضمان نجاح الرقم 212633678896...');
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
        // 🐧 بصمة Ubuntu المستقرة لضمان قبول الربط
        browser: ["Ubuntu", "Chrome", "110.0.5481.178"],
        // ⚙️ إعدادات لتقوية استجابة السيرفر للربط
        connectTimeoutMs: 120000, 
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000
    });

    // 🔑 طلب كود الربط
    if (!sock.authState.creds.registered) {
        console.log(`⏳ جاري طلب الكود للزعيم ELGRANDFT على الرقم: ${TARGET_NUMBER}...`);
        await delay(15000); 
        try {
            const code = await sock.requestPairingCode(TARGET_NUMBER);
            console.log(`\n🔗=======================================🔗`);
            console.log(`✅ كود الربط الخاص بك هو: ${code}`);
            console.log(`🔗=======================================🔗\n`);
        } catch (err) { console.log("❌ فشل طلب الكود. يرجى إعادة الرفع."); }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // 🛡️ واجهة الآدمين
        if (text === ADMIN_PASSWORD) {
            return await sock.sendMessage(from, { text: `🛡️ أهلاً بالمطور العبقري ELGRANDFT.\nالنظام يعمل بنظام Ubuntu ومستعد للرد على الجميع.\nالمطور: +212781886270` });
        }

        // 🔑 نظام التفعيل الشامل (FT2026)
        if (!activatedUsers.has(from)) {
            if (text === ACTIVATION_CODE) {
                activatedUsers.add(from);
                return await sock.sendMessage(from, { text: "✅ تم تفعيلك بنجاح في نظام ELGRANDFT! سأقوم بالرد على جميع أسئلتك الآن." });
            } else {
                return await sock.sendMessage(from, { text: "⚠️ أهلاً بك في نظام ELGRANDFT.\nلاستخدام البوت، يرجى إرسال كود التفعيل: `FT2026`" });
            }
        }

        // معالجة الصور، المعادلات، والذكاء الاصطناعي
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
        if (connection === 'open') console.log("🚀 تم الربط بنجاح يا مبرمج ELGRANDFT! البوت شغال الآن للجميع.");
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startAI();
        }
    });
}

startAI();