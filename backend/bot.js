import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const WEB_APP_URL = 'https://web-production-38699.up.railway.app';
const WEBHOOK_URL = `${process.env.RAILWAY_STATIC_URL || 'https://web-production-38699.up.railway.app'}/webhook/telegram`;

const bot = new TelegramBot(token, { webhook: { host: '0.0.0.0', port: process.env.PORT || 8080, path: '/webhook/telegram' } });

// Установка webhook
async function setWebhook() {
  try {
    await bot.setWebHook(WEBHOOK_URL);
    console.log(`✅ Webhook установлен: ${WEBHOOK_URL}`);
  } catch (error) {
    console.error('❌ Ошибка установки webhook:', error.message);
  }
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'друг';
  
  bot.sendMessage(
    chatId,
    `👋 Привет, ${firstName}!\n\n` +
    `🎨 Добро пожаловать в AI Stylist — виртуальный стилист по прическам!\n\n` +
    `Нажми на кнопку ниже, чтобы открыть приложение:`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🚀 Перейти в приложение',
              web_app: { url: WEB_APP_URL }
            }
          ]
        ]
      }
    }
  );
});

// Обработка webhook обновлений (приходят через POST от Telegram)
bot.on('message', (msg) => {
  console.log(`📨 Сообщение от ${msg.from.first_name}: ${msg.text}`);
});

// Инициализация
setWebhook();

console.log('🤖 TG-бот для Mini App ЗАПУЩЕН (webhook mode)');
