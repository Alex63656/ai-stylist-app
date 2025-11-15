import crypto from 'crypto';

/**
 * Middleware: валидирует Telegram WebApp или разрешает как анонимного юзера (для сайта)
 */
export function validateTelegramData(req, res, next) {
  try {
    const initData = req.headers['x-telegram-init-data'] || req.body.initData;

    // Разрешаем работу без Telegram – как обычный сайт
    if (!initData) {
      const anonymousId = req.ip || 'anonymous-' + Date.now();
      req.telegramUser = {
        id: anonymousId,
        first_name: 'Guest',
        is_anonymous: true
      };
      return next();
    }

    // Валидация Telegram Mini App
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      req.telegramUser = { id: 'no-token-' + Date.now(), first_name: 'Guest', is_anonymous: true };
      return next();
    }
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (calculatedHash !== hash) {
      req.telegramUser = { id: 'invalid-' + Date.now(), first_name: 'Guest', is_anonymous: true };
      return next();
    }
    const user = JSON.parse(params.get('user') || '{}');
    req.telegramUser = { ...user, is_anonymous: false };
    return next();
  } catch (error) {
    req.telegramUser = { id: 'error-' + Date.now(), first_name: 'Guest', is_anonymous: true };
    return next();
  }
}
