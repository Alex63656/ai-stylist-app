import TelegramBot from "node-telegram-bot-api";

const token = process.env.TELEGRAM_BOT_TOKEN;
const WEB_APP_URL = "https://web-production-38699.up.railway.app"; // ВАШ url фронта/мини-аппы

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || '';
  bot.sendMessage(
    chatId,
    `👋 Привет, ${firstName || "друг"}!\n\n` +
      `🎨 Добро пожаловать в AI Stylist — виртуальный стилист по прическам!\n\n` +
      `Нажми на кнопку ниже, чтобы открыть приложение:`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚀 Перейти в приложение",
              web_app: { url: WEB_APP_URL },
            },
          ],
        ],
      },
    }
  );
});

console.log("🤖 TG-бот для Mini App ЗАПУЩЕН");
