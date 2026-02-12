const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, downloadContentFromMessage, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const axios = require("axios");
const http = require("http");
const fs = require("fs");

// --- 🌐 سيرفر Uptime لضمان نشاط البوت على Railway ---
http.createServer((req, res) => {
    res.write("ELGRANDFT SYSTEM: READY TO CONNECT 🚀");
    res.end();
}).listen(process.env.PORT || 3000);

// --- ⚙️ إعدادات المطور ELGRANDFT ---
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const TARGET_NUMBER = "212633678896"; // الرقم المستهدف للربط
const ADMIN_PASSWORD = "abdessamad2014"; // كلمة سر واجهة الآدمين
const ACTIVATION_CODE = "FT2026"; // كود التفعيل للمستخدمين الجدد
const DEVELOPER_INFO = "المبرمج العبقري ELGRANDFT (+212781886270)";

let activatedUsers = new Set();

// --- 🧠 محرك الذكاء الاصطناعي العقلاني ---
async function getAIResponse(text, imageData = null) {
    try {
        const payload = {
            model: imageData ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
            messages: [{ 
                role: "system", 
                content: `أنت نظام ذكاء اصطناعي فائق الذكاء، عقلاني ومنطقي. مطورك هو ${DEVELOPER_INFO}. 
                أنت تجيب على أي سؤال، بما في ذلك المعادلات الرياضية المعقدة وتحليل الصور بدقة عالية. 
                إذا سألك أحد عن المطور، اذكر اسمه ورقمه بفخر.`
            }, { 
                role: "user", 
                content: imageData ? [
                    { type: "text", text: text || "حلل هذه الصورة بعقلانية ومنطق" },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageData}` } }
                ] : text 
            }],
            temperature: 0.4 // خفض الحرارة لزيادة الدقة والعقلانية في الإجابة
        };
        const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", payload, { 
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } 
        });
        return res.data.choices[0].message.content;
    } catch (e) { return "⚠️ عذراً يا زعيم، السيرفر يواجه ضغطاً حالياً."; }
}

async function startAI() {
    // 🔥 تدمير الجلسة القديمة برمجياً لضمان كود ربط جديد تماماً
    if (!fs.existsSync('./auth_info/creds.json')) {
        if (fs.existsSync('./auth_info')) {
            fs.rmSync('./auth_info', { recursive: true, force: true });
            console.log('🗑️ تم تنظيف مجلد auth_info لضمان استلام كود جديد.');
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
        // 🦊 استخدام متصفح Firefox لضمان أعلى نسبة نجاح في الربط
        browser: ["Firefox", "MacOS", "121.0"] 
    });

    // 🔑 طلب كود الربط للرقم +212633678896
    if (!sock.authState.creds.registered) {
        console.log(`⏳ جاري طلب كود الربط للزعيم ELGRANDFT على الرقم: ${TARGET_NUMBER}...`);
        await delay(12000); 
        try {
            const code = await sock.requestPairingCode(TARGET_NUMBER);
            console.log(`\n🔗=======================================🔗`);
            console.log(`✅ كود الربط الخاص بك هو: ${code}`);
            console.log(`🔗=======================================🔗\n`);
        } catch (err) { console.log("❌ فشل طلب الكود. يرجى التأكد من أن الرقم صحيح تماماً."); }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // 🛡️ واجهة الآدمين (التحكم الكامل)
        if (text === ADMIN_PASSWORD) {
            return await sock.sendMessage(from, { text: `🛡️ أهلاً بالمطور العبقري ELGRANDFT.\nالنظام متصل ويعمل بأقصى طاقة.\nعدد المستخدمين المفعلين: ${activatedUsers.size}\nرقم تواصلك: +212781886270` });
        }

        // 🔑 نظام التفعيل للمستخدمين (كود FT2026)
        if (!activatedUsers.has(from)) {
            if (text === ACTIVATION_CODE) {
                activatedUsers.add(from);
                return await sock.sendMessage(from, { text: "✅ تم تفعيل حسابك في نظام ELGRANDFT المتطور. أنا جاهز لمساعدتك!" });
            } else {
                return await sock.sendMessage(from, { text: "⚠️ عذراً، يجب إرسال كود التفعيل `FT2026` لاستخدام البوت." });
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
        if (connection === 'open') console.log("🚀 تم الاتصال بنجاح يا ELGRANDFT! البوت جاهز.");
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startAI();
        }
    });
}

startAI();