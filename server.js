const express = require("express");
const bodyParser = require("body-parser");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

app.use(bodyParser.json());
app.use(express.static("public"));

let spamInterval = null;
let currentBot = null;

let logs = [];

function log(msg) {

    const time = new Date().toLocaleTimeString();

    const line = `[${time}] ${msg}`;

    console.log(line);

    logs.push(line);

    if (logs.length > 100) {
        logs.shift();
    }

}

function normalizeMessages(messages) {

    if (!messages) return [];

    // textarea string ise
    if (typeof messages === "string") {

        return messages
            .split(/\n|,/)
            .map(m => m.trim())
            .filter(Boolean);

    }

    // array ise
    if (Array.isArray(messages)) {

        return messages
            .map(m => String(m).trim())
            .filter(Boolean);

    }

    return [];

}

app.post("/start", async (req, res) => {

    try {

        const {
            token,
            chatId,
            messages,
            delay
        } = req.body;

        // mesaj listesi
        const messageList = normalizeMessages(messages);

        // CHAT ID LİSTESİ
        const chatList = String(chatId)
            .split(",")
            .map(id => id.trim())
            .filter(Boolean);

        if (!token || chatList.length === 0 || messageList.length === 0) {

            return res.json({
                status: "error",
                message: "Eksik veri"
            });

        }

        // eski interval temizle
        if (spamInterval) {

            clearInterval(spamInterval);

            spamInterval = null;

        }

        // eski botu kapat
        if (currentBot) {

            try {

                currentBot.stopPolling();

            } catch {}

        }

        // yeni bot
        const bot = new TelegramBot(token, {
            polling: false
        });

        currentBot = bot;

        // token doğrula
        await bot.getMe();

        let index = 0;

        const wait = Number(delay) || 3;

        log("Bot başlatıldı");

        spamInterval = setInterval(async () => {

            try {

                const msg = messageList[index];

                // TÜM CHATLERE GÖNDER
                for (const chat of chatList) {

                    try {

                        await bot.sendMessage(chat, msg);

                        log(`Gönderildi -> ${chat}: ${msg}`);

                    } catch (err) {

                        log(`Hata -> ${chat}: ${err.message}`);

                    }

                }

                // sıradaki mesaj
                index++;

                // sona geldiyse başa dön
                if (index >= messageList.length) {

                    index = 0;

                }

            } catch (err) {

                log("Genel hata: " + err.message);

            }

        }, wait * 1000);

        res.json({
            status: "started",
            totalMessages: messageList.length,
            totalChats: chatList.length,
            delay: wait
        });

    } catch (err) {

        log("Başlatma hatası: " + err.message);

        res.json({
            status: "error",
            message: err.message
        });

    }

});

app.post("/stop", (req, res) => {

    if (spamInterval) {

        clearInterval(spamInterval);

        spamInterval = null;

    }

    log("Bot durduruldu");

    res.json({
        status: "stopped"
    });

});

app.get("/logs", (req, res) => {

    res.json({
        logs
    });

});

// test endpoint
app.get("/", (req, res) => {

    res.send("Bot aktif");

});

// Render PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log("Server çalışıyor: " + PORT);

});