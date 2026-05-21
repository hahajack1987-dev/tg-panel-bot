const express = require("express");
const bodyParser = require("body-parser");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

app.use(bodyParser.json());
app.use(express.static("public"));

let interval;
let logs = [];

function log(msg) {
    const time = new Date().toLocaleTimeString();
    logs.push(`[${time}] ${msg}`);
    if (logs.length > 50) logs.shift();
}

function normalizeMessages(messages) {
    if (!messages) return [];

    if (typeof messages === "string") {
        return messages
            .split(/\n|,/)
            .map(m => m.trim())
            .filter(m => m.length > 0);
    }

    if (Array.isArray(messages)) {
        return messages
            .map(m => (m || "").toString().trim())
            .filter(m => m.length > 0);
    }

    return [];
}

app.post("/start", (req, res) => {

    const { token, chatId, messages, delay } = req.body;

    const list = normalizeMessages(messages);

    if (!token || !chatId || list.length === 0) {
        return res.json({ status: "error", message: "Eksik veri" });
    }

    const bot = new TelegramBot(token, { polling: false });

    clearInterval(interval);

    let index = 0;

    log("Bot başlatıldı");

    interval = setInterval(() => {

        const msg = list[index];

        if (msg) {
            bot.sendMessage(chatId, msg)
                .then(() => log("Gönderildi: " + msg))
                .catch(err => log("Hata: " + (err.message || err)));
        }

        index++;
        if (index >= list.length) index = 0;

    }, (delay || 3) * 1000);

    res.json({
        status: "started",
        totalMessages: list.length
    });
});

app.post("/stop", (req, res) => {
    clearInterval(interval);
    log("Bot durduruldu");
    res.json({ status: "stopped" });
});

app.get("/logs", (req, res) => {
    res.json(logs);
});

// 🔥 RENDER PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server çalışıyor: " + PORT);
});