const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, downloadContentFromMessage, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const axios = require("axios");
const http = require("http");

// --- 🌐 سيرفر Uptime ---
http.createServer((req, res) => {
    res.write("ELGRANDFT SYSTEM ACTIVE 🚀");
    res.end();
}).listen(process.env.PORT || 3000);

// --- ⚙️ الإعدادات ---
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const TARGET_NUMBER = "212633678896"; 
const ADMIN_PASSWORD = "abdessamad2014";
const ACTIVATION_CODE = "FT2026"; // الكود المطلوب للمستخدمين الجدد
const DEVELOPER_INFO = "المبرمج العبقري ELGRANDFT (+212781886270)";

// قاعدة بيانات مؤقتة للمستخدمين المفعلين
let activatedUsers = new Set();

async function getAIResponse(text, imageData = null) {
    try {
        const payload = {
            model: imageData ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
            messages: [{ 
                role: "system", 
                content: `أنت نظام ذكاء اصطناعي عقلاني وسريع جداً. مطورك هو ${DEVELOPER_INFO}. أجب بدقة ومنطق.`
            }, { 
                role: "user", 
                content: imageData ? [{ type: "text", text: text || "حلل الصورة" }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageData}` } }] : text 
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
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger: logger,
        printQRInTerminal: false,
        browser: ["Mac OS", "Chrome", "121.0.0.0"]
    });

    if (!sock.authState.creds.registered) {
        await delay(5000);
        try {
            const code = await sock.requestPairingCode(TARGET_NUMBER);
            console.log(`✅ كود الربط: ${code}`);
        } catch (err) { console.log("خطأ في طلب الكود"); }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // 🛡️ واجهة الآدمين
        if (text === ADMIN_PASSWORD) {
            return await sock.sendMessage(from, { text: `🛡️ أهلاً زعيم ELGRANDFT.\nعدد المستخدمين المفعلين حالياً: ${activatedUsers.size}\nالنظام يعمل بكفاءة ✅` });
        }

        // 🔑 نظام التفعيل للمستخدمين الجدد
        if (!activatedUsers.has(from)) {
            if (text === ACTIVATION_CODE) {
                activatedUsers.add(from);
                return await sock.sendMessage(from, { text: "✅ تم تفعيل البوت بنجاح! أنا الآن رهن إشارتك، كيف يمكنني مساعدتك؟" });
            } else {
                return await sock.sendMessage(from, { text: "⚠️ عذراً، يجب عليك إدخال كود التفعيل أولاً لاستخدام البوت.\n\n*أرسل الكود:* `FT2026`" });
            }
        }

        // معالجة الصور والذكاء الاصطناعي للمفعلين فقط
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
        if (update.connection === 'open') console.log("🚀 نظام ELGRANDFT جاهز مع نظام التفعيل!");
        if (update.connection === 'close') startAI();
    });
}

startAI();