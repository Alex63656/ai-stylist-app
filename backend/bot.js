import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
console.log('Token loaded:', token ? 'YES (length: ' + token.length + ')' : 'NO - UNDEFINED!');

if (!token || token.trim() === '') {
  console.error('CRITICAL: TELEGRAM_BOT_TOKEN is empty or not set!');
  console.log('process.env.TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);
  process.exit(1);
}
const BOT_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN || 'web-production-38699.up.railway.app';
const WEBHOOK_URL = `https://${BOT_DOMAIN}/webhook/telegram`;

// Create bot WITHOUT webhook configuration - Express handles the webhook
const bot = new TelegramBot(token);

// Function to register webhook with retry logic
async function registerWebhook(attempt = 1, maxAttempts = 5) {
  try {
    console.log(`\uD83D\uDCE1 Registering webhook (attempt ${attempt}/${maxAttempts})...`);
    console.log(`   URL: ${WEBHOOK_URL}`);
    
    // First delete old webhook (if any)
    try {
      await bot.deleteWebHook();
      console.log('\u2705 Old webhook deleted');
    } catch (e) {
      // Ignore error if webhook wasn't set
    }
    
    // Register new webhook
    await bot.setWebHook(WEBHOOK_URL, {
      max_connections: 40,
      allowed_updates: ['message', 'callback_query']
    });
    
    console.log(`\u2705 Webhook registered successfully: ${WEBHOOK_URL}`);
    return true;
  } catch (error) {
    console.error(`\u274C Webhook registration failed (attempt ${attempt}):`, error.message);
    
    if (attempt < maxAttempts) {
      const delayMs = 1000 * Math.pow(2, attempt - 1); // Exponential backoff
      console.log(`\u23F3 Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return registerWebhook(attempt + 1, maxAttempts);
    } else {
      console.error('\u274C Failed to register webhook after all attempts');
      return false;
    }
  }
}

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'друг';
  
  console.log(`\uD83D\uDCE8 /start from ${firstName} (${chatId})`);
  
  bot.sendMessage(
    chatId,
    `\uD83D\uDC4B Привет, ${firstName}!\n\n` +
    `\uD83C\uDFA8 Добро пожаловать в AI Stylist — виртуальный стилист по прическам!\n\n` +
    `Нажми на кнопку ниже, чтобы открыть приложение:`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '\uD83D\uDE80 Перейти в приложение',
              web_app: { url: `https://${BOT_DOMAIN}` }
            }
          ]
        ]
      }
    }
  ).catch(err => console.error('Error sending message:', err));
});

// Handle incoming messages
bot.on('message', (msg) => {
  console.log(`\uD83D\uDCEC Message from ${msg.from.first_name}: ${msg.text}`);
});

// Handle errors
bot.on('polling_error', (error) => {
  console.error('\uD83D\uDEA8 Polling error:', error);
});

bot.on('webhook_error', (error) => {
  console.error('\uD83D\uDEA8 Webhook error:', error);
});

// Initialization
async function start() {
  try {
    console.log('\uD83E\uDD16 TG Bot for Mini App starting...');
    console.log(`   Token: ${token ? '\u2705 Loaded' : '\u274C Missing'}`);
    console.log(`   Domain: ${BOT_DOMAIN}`);
    
    // Register webhook
    const success = await registerWebhook();
    
    if (success) {
      console.log('\n\u2705 Bot is ready and waiting for updates via webhook!');
    } else {
      console.error('\n\u26A0\uFE0F Bot started but webhook registration failed');
    }
  } catch (error) {
    console.error('\u274C Fatal error:', error);
    process.exit(1);
  }
}

// Start bot
start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\uD83D\uDED1 Shutting down gracefully...');
  process.exit(0);
});

export { bot };
