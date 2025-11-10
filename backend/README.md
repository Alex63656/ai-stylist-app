# AI Stylist Backend API

Бэкенд API для Telegram Mini App AI Стилист.

## Установка локально

```bash
cd backend
npm install
cp .env.example .env
# Заполните .env файл вашими ключами
npm run dev
```

## API Endpoints

### POST /api/generate
Генерация причёски с помощью Gemini AI.

**Request:**
```json
{
  "selfieImage": {
    "data": "base64_string",
    "mimeType": "image/jpeg"
  },
  "referenceImage": {
    "data": "base64_string",
    "mimeType": "image/jpeg"
  },
  "prompt": "Описание причёски",
  "userId": "telegram_user_id"
}
```

**Response:**
```json
{
  "success": true,
  "image": "base64_generated_image",
  "creditsLeft": 9,
  "timestamp": "2025-11-11T00:00:00.000Z"
}
```

### GET /api/credits
Проверка остатка кредитов.

**Response:**
```json
{
  "success": true,
  "credits": 10,
  "userId": "telegram_user_id",
  "isPro": false
}
```

### GET /api/history
Получение истории генераций.

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "image": "base64_string",
      "prompt": "Промпт",
      "timestamp": "2025-11-11T00:00:00.000Z"
    }
  ],
  "total": 5
}
```

## Деплой на Railway

1. Создайте новый проект на railway.com
2. Подключите GitHub репозиторий
3. Добавьте environment variables:
   - `GEMINI_API_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `NODE_ENV=production`
   - `FRONTEND_URL` (УРЛ вашего фронтенда)
4. Railway автоматически задетектит Node.js и задеплоит

## Будущее развитие

- [ ] Добавить PostgreSQL для хранения кредитов и истории
- [ ] Добавить Redis для кэширования
- [ ] Интегрировать платежную систему (Telegram Stars/ЮКасса)
- [ ] Добавить очереди для обработки запросов
- [ ] Метрики и мониторинг
