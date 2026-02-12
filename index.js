const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, downloadContentFromMessage, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const axios = require("axios");
const http = require("http");

// --- 🌐 سيرفر سريع لبقاء البوت نشطاً ---
http.createServer((req, res) => {
    res.write("ELGRANDFT AI SYSTEM: HIGH PERFORMANCE 🚀");
    res.end();
}).listen(process.env.PORT || 3000);

// --- ⚙️ إعدادات النخبة ELGRANDFT ---
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const TARGET_NUMBER = "212633678896"; 
const ADMIN_PASSWORD = "abdessamad2014";
const DEVELOPER_INFO = "المبرمج العبقري ELGRANDFT (+212781886270)";

// --- 🧠 محرك الذكاء الاصطناعي (أكثر عقلانية وسرعة) ---
async function getAIResponse(text, imageData = null) {
    try {
        const payload = {
            model: imageData ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
            messages: [{ 
                role: "system", 
                content: `أنت نظام ذكاء اصطناعي متطور جداً، منطقي، وعقلاني. مطورك هو ${DEVELOPER_INFO}. 
                قواعدك:
                1. كن دقيقاً ومنطقياً في تحليلاتك.
                2. أجب بسرعة واختصر المفيد ما لم يُطلب منك التفصيل.
                3. عند تحليل الصور أو المعادلات، استخدم منهجاً علمياً خطوة بخطوة.
                4. إذا سألك أحد عن المطور، قدم له التحية باسم ELGRANDFT وامنحه رقم التواصل.`
            }, { 
                role: "user", 
                content: imageData ? [
                    { type: "text", text: text || "حلل هذه الصورة بعقلانية" },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageData}` } }
                ] : text 
            }],
            temperature: 0.5, // تقليل الحرارة لزيادة العقلانية والدقة
            max_tokens: 2048,
            top_p: 1
        };

        const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", payload, { 
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
            timeout: 15000 // سرعة الاستجابة أو الإلغاء
        });
        return res.data.choices[0].message.content;
    } catch (e) { 
        return "⚠️ عذراً زعيم، حدث ضغط على السيرفر، يرجى المحاولة بعد ثانية."; 
    }
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
        // محاكاة متصفح حديث جداً لضمان سرعة الربط
        browser: ["Mac OS", "Chrome", "121.0.6167.184"]
    });

    if (!sock.authState.creds.registered) {
        console.log(`⏳ جاري طلب كود الربط السريع للرقم: ${TARGET_NUMBER}...`);
        await delay(5000); 
        try {
            const code = await sock.requestPairingCode(TARGET_NUMBER);
            console.log(`\n✅ كود الربط الخاص بك: ${code}\n`);
        } catch (err) { console.log("❌ خطأ في طلب الكود."); }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        
        let text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        let imageData = null;

        // الدخول لواجهة الآدمين
        if (text === ADMIN_PASSWORD) {
            return await sock.sendMessage(from, { text: `🛡️ أهلاً زعيم ELGRANDFT. النظام يعمل بأقصى سرعة وعقلانية الآن.` });
        }

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
        const { connection } = update;
        if (connection === 'open') console.log("🚀 تم تشغيل النظام فائق السرعة!");
        if (connection === 'close') startAI();
    });
}

startAI();