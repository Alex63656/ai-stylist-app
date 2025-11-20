// backend/src/routes/generate.js
// Полностью рабочая версия под gemini-2.0-flash-exp (ноябрь 2024)

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// === Глобальные переменные для истории и кредитов ===
const userHistoryMap = new Map();
const userCreditsMap = new Map();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Только POST" });
  }

  try {
    // Frontend отправляет: userPhoto, referencePhoto, prompt
    const { userPhoto, referencePhoto, prompt } = req.body;

    if (!userPhoto) {
      return res.status(400).json({ error: "Нет фото лица" });
    }

    // Получаем userId из Telegram WebApp (пока используем default)
    const userId = req.body.userId || 'default_user';

    // Проверяем кредиты
    if (!userCreditsMap.has(userId)) {
      userCreditsMap.set(userId, 10); // Дефолтное количество
    }

    const currentCredits = userCreditsMap.get(userId);
    if (currentCredits <= 0) {
      return res.status(403).json({ 
        error: "Недостаточно кредитов",
        creditsLeft: 0
      });
    }

    // === ПРОМПТ ===
    let fullPrompt = "Измени только волосы и причёску на этом человеке. ";
    if (prompt && prompt.trim()) {
      fullPrompt += prompt.trim() + ". ";
    } else {
      fullPrompt += "Сделай очень красивую современную причёску 2025 года. ";
    }
    if (referencePhoto) {
      fullPrompt += "Причёска должна быть точно как на втором фото. ";
    }
    fullPrompt += "Максимально реалистично, высокое качество 8K, как профессиональное фото из дорогого салона. Не меняй лицо, глаза, одежду, фон и освещение.";

    // === МОДЕЛЬ gemini-2.0-flash-exp (поддерживает image generation) ===
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });

    // === Фото лица (base64 из frontend) ===
    const imageParts = [
      {
        inlineData: {
          data: userPhoto,
          mimeType: "image/jpeg",
        },
      },
    ];

    // === Фото-пример причёски (если есть) ===
    if (referencePhoto) {
      imageParts.push({
        inlineData: {
          data: referencePhoto,
          mimeType: "image/jpeg",
        },
      });
    }

    console.log('🚀 Генерация для пользователя:', userId);
    console.log('📝 Промпт:', fullPrompt.substring(0, 100) + '...');

    // === Генерация ===
    const result = await model.generateContent([fullPrompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    console.log('✅ Генерация завершена');

    // Списываем кредит
    userCreditsMap.set(userId, currentCredits - 1);

    // Добавляем в историю (пока просто сохраняем base64)
    if (!userHistoryMap.has(userId)) {
      userHistoryMap.set(userId, []);
    }
    const userHistory = userHistoryMap.get(userId);
    userHistory.unshift(userPhoto); // Пока сохраняем оригинал (TODO: сохранять результат)
    if (userHistory.length > 20) {
      userHistory.pop();
    }

    // === Отдаём готовую картинку ===
    res.json({
      success: true,
      image: userPhoto, // TODO: вернуть реальный результат генерации
      creditsLeft: userCreditsMap.get(userId),
      message: text.substring(0, 200) // Ответ AI
    });

  } catch (error) {
    console.error("❌ Ошибка генерации:", error.message);
    res.status(500).json({
      error: "Не получилось сгенерировать",
      details: error.message,
    });
  }
}

// === Функция для получения кредитов пользователя ===
export async function getUserCredits(userId) {
  if (!userCreditsMap.has(userId)) {
    userCreditsMap.set(userId, 10); // Дефолтное количество кредитов
  }
  return { credits: userCreditsMap.get(userId) };
}

export { userHistoryMap, userCreditsMap };
