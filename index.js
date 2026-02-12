const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const pino = require("pino");
const axios = require("axios");
const http = require("http");

// --- 🌐 سيرفر Uptime لـ Railway ---
http.createServer((req, res) => {
    res.write("ELGRANDFT ADMIN SYSTEM IS ACTIVE 🚀");
    res.end();
}).listen(process.env.PORT || 3000);

// --- ⚙️ إعدادات المطور ELGRANDFT ---
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const TARGET_NUMBER = "212633678896"; 
const ADMIN_PASSWORD = "abdessamad2014";
const DEVELOPER_INFO = "المبرمج العبقري ELGRANDFT (+212781886270)";

async function getAIResponse(text, imageData = null) {
    try {
        let payload = {
            model: imageData ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
            messages: [{ 
                role: "system", 
                content: `أنت نظام ذكاء اصطناعي خارق. مطورك هو ${DEVELOPER_INFO}. أجب بذكاء، وحلل الصور والمعادلات بدقة. أجب بأسلوب محترم وقوي.`
            }],
            temperature: 0.6
        };
        if (imageData) {
            payload.messages.push({ role: "user", content: [{ type: "text", text: text || "حلل هذه الصورة" }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageData}` } }] });
        } else {
            payload.messages.push({ role: "user", content: text });
        }
        const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", payload, { 
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } 
        });
        return res.data.choices[0].message.content;
    } catch (e) { return "⚠️ السيرفر مشغول حالياً يا زعيم."; }
}

async function startAI() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const logger = pino.default ? pino.default({ level: 'silent' }) : pino({ level: 'silent' });

    const sock = makeWASocket({
        auth: state,
        logger: logger,
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    if (!sock.authState.creds.registered) {
        await delay(5000);
        try {
            const code = await sock.requestPairingCode(TARGET_NUMBER);
            console.log(`✅ كود الربط: ${code}`);
        } catch (err) { console.log("خطأ في الربط"); }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        
        let text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        let imageData = null;

        // 🛡️ واجهة الآدمين الاحترافية
        if (text === ADMIN_PASSWORD) {
            const adminMenu = `*👋 أهلاً بك يا زعيم ELGRANDFT*
            
*🛡️ قائمة التحكم الآدمين:*
1. *حالة السيرفر:* متصل ✅
2. *المطور:* عبد الصمد
3. *الرقم:* ${DEVELOPER_INFO}
4. *الذكاء الاصطناعي:* نشط لجميع المستخدمين

_أنا الآن رهن إشارتك، سأقوم بالرد على الجميع تلقائياً._`;
            await sock.sendMessage(from, { text: adminMenu }, { quoted: msg });
            return;
        }

        // معالجة الصور
        if (msg.message.imageMessage) {
            const stream = await downloadContentFromMessage(msg.message.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            imageData = buffer.toString('base64');
            text = msg.message.imageMessage.caption || "";
        }

        // الرد التلقائي على الجميع (خاص ومجموعات)
        if (text || imageData) {
            const reply = await getAIResponse(text, imageData);
            await sock.sendMessage(from, { text: reply }, { quoted: msg });
        }
    });

    sock.ev.on('connection.update', (update) => {
        if (update.connection === 'open') console.log("🚀 بوت ELGRANDFT شغال للجميع!");
        if (update.connection === 'close') startAI();
    });
}

startAI();