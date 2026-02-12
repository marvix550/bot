const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode-terminal");
const axios = require("axios");
const fs = require("fs");
const http = require("http");

// --- 🌐 سيرفر UptimeRobot ---
http.createServer((req, res) => {
    res.write("ELGRANDFT AI SYSTEM IS LIVE 🚀");
    res.end();
}).listen(3000);

// --- ⚙️ إعدادات النخبة ---
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ADMIN_NUMBER = "212781886270@s.whatsapp.net"; 
const DEVELOPER_NAME = "ELGRANDFT";
const CONTACT_INFO = "+212781886270";
const ADMIN_PASSWORD = "abdessamad2014"; // كلمة السر المطلوبة
const DB_FILE = "users_db.json";

let userDB = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : {};
function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(userDB, null, 2)); }

async function getAIResponse(text, imageData = null) {
    try {
        let payload = {
            model: imageData ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
            messages: [{ 
                role: "system", 
                content: `أنت نظام ذكاء اصطناعي خارق وشديد العقلانية. 
                - مطورك هو المبرمج العبقري ${DEVELOPER_NAME}. 
                - إذا سُئلت عن المطور، قدم رقم هاتفه ${CONTACT_INFO} ومدحه باحترافية.
                - أجب بعمق منطقي، وحلل المسائل العلمية والرياضية والصور بدقة متناهية. 
                - أسلوبك يجب أن يكون رزيناً ومفيداً جداً.` 
            }],
            temperature: 0.2 // تقليل الحرارة لزيادة العقلانية والدقة
        };
        if (imageData) {
            payload.messages.push({ role: "user", content: [{ type: "text", text: text || "حلل الصورة بدقة عقلانية" }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageData}` } }] });
        } else {
            payload.messages.push({ role: "user", content: text });
        }
        const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", payload, { headers: { "Authorization": `Bearer ${GROQ_API_KEY}` } });
        return res.data.choices[0].message.content;
    } catch (e) { return "⚠️ السيرفر مشغول حالياً بمعالجة بيانات معقدة."; }
}

async function startAI() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({ auth: state, printQRInTerminal: false, logger: require('pino')({ level: 'silent' }), browser: [DEVELOPER_NAME, "Chrome", "1.0"] });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) qrcode.generate(qr, { small: true });
        if (connection === 'open') console.log(`✅ نظام ${DEVELOPER_NAME} المتطور جاهز!`);
        if (connection === 'close') { if ((lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut) startAI(); }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();

        // 🛡️ الدخول للوحة التحكم بكلمة السر abdessamad2014
        if (text === ADMIN_PASSWORD) {
            let menu = `👑 *أهلاً بك يا زعيم ${DEVELOPER_NAME}*\n\n`;
            menu += `📊 عدد المستخدمين: ${Object.keys(userDB).length}\n`;
            menu += `📝 الأوامر:\n- *.users* لعرض القائمة\n- *.broadcast [نص]* للنشر\n\nأنت الآن في وضع التحكم الكامل.`;
            return await sock.sendMessage(from, { text: menu });
        }

        // أوامر الأدمن (تعمل فقط إذا كان الرقم هو رقمك)
        if (from === ADMIN_NUMBER) {
            if (text === ".users") {
                let list = `📊 *قائمة المشتركين:*\n\n` + Object.keys(userDB).map((u, i) => `${i+1}. ${u.split('@')[0]}`).join('\n');
                return await sock.sendMessage(from, { text: list });
            }
            if (text.startsWith(".broadcast ")) {
                const bcMsg = text.replace(".broadcast ", "");
                for (let u of Object.keys(userDB)) { await sock.sendMessage(u, { text: `📢 إعلان من المطور:\n\n${bcMsg}` }); }
                return await sock.sendMessage(from, { text: "✅ تم النشر بنجاح." });
            }
        }

        if (!userDB[from]) { userDB[from] = { authorized: true }; saveDB(); }

        // تحليل الصور
        if (msg.message.imageMessage) {
            const stream = await downloadContentFromMessage(msg.message.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
            const reply = await getAIResponse(msg.message.imageMessage.caption, buffer.toString('base64'));
            return await sock.sendMessage(from, { text: reply }, { quoted: msg });
        }

        // الرد النصي العقلاني
        if (text && !text.startsWith(".")) {
            const reply = await getAIResponse(text);
            await sock.sendMessage(from, { text: reply }, { quoted: msg });
        }
    });
}
startAI();