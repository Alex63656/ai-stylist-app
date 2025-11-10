import crypto from 'crypto';

/**
 * Валидация данных от Telegram Mini App
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramData(req, res, next) {
  try {
    const initData = req.headers['x-telegram-init-data'] || req.body.initData;
    
    if (!initData) {
      // В режиме разработки пропускаем валидацию
      if (process.env.NODE_ENV === 'development') {
        req.telegramUser = { id: 'dev-user-123', first_name: 'Dev' };
        return next();
      }
      return res.status(401).json({ error: 'Unauthorized: No Telegram data' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Парсинг initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    // Создание data-check-string
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Вычисление секретного ключа
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Вычисление хэша
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Проверка хэша
    if (calculatedHash !== hash) {
      return res.status(401).json({ error: 'Unauthorized: Invalid hash' });
    }

    // Парсинг данных пользователя
    const user = JSON.parse(params.get('user') || '{}');
    req.telegramUser = user;

    next();
  } catch (error) {
    console.error('Telegram validation error:', error);
    res.status(401).json({ error: 'Unauthorized: Validation failed' });
  }
}
