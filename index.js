const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, downloadContentFromMessage, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const axios = require("axios");
const http = require("http");
const fs = require("fs");

// --- 🌐 سيرفر Uptime لضمان نشاط البوت على Railway ---
http.createServer((req, res) => {
    res.write("ELGRANDFT UBUNTU SYSTEM: STABLE MODE 🚀");
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
                content: `أنت نظام ذكاء اصطناعي عقلاني ومنطقي جداً. مطورك هو ${DEVELOPER_INFO}. أجب بدقة واحترافية على الجميع.`
            }, { 
                role: "user", 
                content: imageData ? [
                    { type: "text", text: text || "حلل الصورة" },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageData}` } }
                ] : text 
            }],
            temperature: 0.5
        };
        const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", payload, { 
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } 
        });
        return res.data.choices[0].message.content;
    } catch (e) { return "⚠️ السيرفر مشغول حالياً."; }
}

async function startAI() {
    // 🔥 تدمير شامل لأي جلسة قديمة لضمان عدم تعليق الكود الجديد
    if (fs.existsSync('./auth_info')) {
        fs.rmSync('./auth_info', { recursive: true, force: true });
        console.log('🗑️ تم تنظيف الجلسة تماماً للبدء من جديد...');
    }

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        // 🐧 بصمة Ubuntu التي نجحت معك سابقاً
        browser: ["Ubuntu", "Chrome", "110.0.5481.178"],
        // ⚙️ إعدادات لتقوية الاتصال ومنع الانقطاع أثناء الربط
        connectTimeoutMs: 100000, 
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true
    });

    // 🔑 طلب كود الربط
    if (!sock.authState.creds.registered) {
        console.log(`⏳ جاري طلب كود الربط للرقم: ${TARGET_NUMBER}...`);
        await delay(15000); 
        try {
            const code = await sock.requestPairingCode(TARGET_NUMBER);
            console.log(`\n🔗=======================================🔗`);
            console.log(`✅ كود الربط الخاص بك هو: ${code}`);
            console.log(`🔗=======================================🔗\n`);
        } catch (err) { console.log("❌ فشل طلب الكود. حاول مرة أخرى."); }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        if (text === ADMIN_PASSWORD) {
            return await sock.sendMessage(from, { text: `🛡️ أهلاً زعيم ELGRANDFT. النظام Ubuntu يعمل للجميع بنجاح ✅` });
        }

        if (!activatedUsers.has(from)) {
            if (text === ACTIVATION_CODE) {
                activatedUsers.add(from);
                return await sock.sendMessage(from, { text: "✅ تم تفعيلك! سأقوم بالرد على جميع استفساراتك الآن." });
            } else {
                return await sock.sendMessage(from, { text: "⚠️ أرسل كود التفعيل `FT2026` لكي أبدأ بالرد عليك." });
            }
        }

        let imageData = null;
        if (msg.message.imageMessage) {
            const stream = await downloadContentFromMessage(msg.message.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            imageData = buffer.toString('base64');
        }

        if (text || imageData) {
            const reply = await getAIResponse(text, imageData);
            await sock.sendMessage(from, { text: reply }, { quoted: msg });
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') console.log("🚀 تم الربط بنجاح! البوت شغال الآن.");
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startAI();
        }
    });
}

startAI();