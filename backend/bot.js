import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const BOT_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN || 'web-production-38699.up.railway.app';
const WEBHOOK_URL = `https://${BOT_DOMAIN}/webhook/telegram`;
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(token, { 
  webHook: { 
    host: '0.0.0.0', 
    port: PORT, 
    path: '/webhook/telegram' 
  } 
});

// Функция для регистрации webhook с повторными попытками
async function registerWebhook(attempt = 1, maxAttempts = 5) {
  try {
    console.log(`📡 Registering webhook (attempt ${attempt}/${maxAttempts})...`);
    console.log(`   URL: ${WEBHOOK_URL}`);
    
    // Сначала удаляем старый webhook (если есть)
    try {
      await bot.deleteWebHook();
      console.log('✅ Old webhook deleted');
    } catch (e) {
      // Игнорируем ошибку если webhook не был установлен
    }
    
    // Регистрируем новый webhook
    await bot.setWebHook(WEBHOOK_URL, {
      max_connections: 40,
      allowed_updates: ['message', 'callback_query']
    });
    
    console.log(`✅ Webhook registered successfully: ${WEBHOOK_URL}`);
    return true;
  } catch (error) {
    console.error(`❌ Webhook registration failed (attempt ${attempt}):`, error.message);
    
    if (attempt < maxAttempts) {
      const delayMs = 1000 * Math.pow(2, attempt - 1); // Exponential backoff
      console.log(`⏳ Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return registerWebhook(attempt + 1, maxAttempts);
    } else {
      console.error('❌ Failed to register webhook after all attempts');
      return false;
    }
  }
}

// Обработка /start команды
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'друг';
  
  console.log(`📨 /start from ${firstName} (${chatId})`);
  
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
              web_app: { url: `https://${BOT_DOMAIN}` }
            }
          ]
        ]
      }
    }
  ).catch(err => console.error('Error sending message:', err));
});

// Обработка входящих сообщений
bot.on('message', (msg) => {
  console.log(`💬 Message from ${msg.from.first_name}: ${msg.text}`);
});

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('🚨 Polling error:', error);
});

bot.on('webhook_error', (error) => {
  console.error('🚨 Webhook error:', error);
});

// Инициализация
async function start() {
  try {
    console.log('🤖 TG Bot for Mini App starting...');
    console.log(`   Token: ${token ? '✅ Loaded' : '❌ Missing'}`);
    console.log(`   Domain: ${BOT_DOMAIN}`);
    console.log(`   Port: ${PORT}`);
    
    // Регистрируем webhook
    const success = await registerWebhook();
    
    if (success) {
      console.log('\n✅ Bot is ready and waiting for updates via webhook!');
    } else {
      console.error('\n⚠️ Bot started but webhook registration failed');
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Запуск
start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  bot.stopPolling();
  process.exit(0);
});

export { bot };
