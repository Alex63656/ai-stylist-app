// backend/src/routes/generate.js
// Полностью рабочая версия под gemini-2.5-flash-image (ноябрь 2025)

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

    // === МОДЕЛЬ GEMINI-2.5-FLASH-IMAGE (БЕЗ generationConfig!) ===
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image"
      // responseMimeType НЕ ПОДДЕРЖИВАЕТСЯ этой моделью!
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
    console.log('🎨 Модель: gemini-2.5-flash-image');

    // === Генерация ===
    const result = await model.generateContent([fullPrompt, ...imageParts]);
    const response = await result.response;

    // Получаем сгенерированное изображение в base64
    const generatedImageBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!generatedImageBase64) {
      console.error('❌ Gemini не вернул картинку');
      console.error('Полный ответ:', JSON.stringify(response, null, 2));
      return res.status(500).json({ 
        error: "Gemini не смог сгенерировать изображение",
        details: "Проверьте квоты API и правильность модели"
      });
    }

    console.log('✅ Генерация завершена! Получено', generatedImageBase64.length, 'байт изображения');

    // Списываем кредит
    userCreditsMap.set(userId, currentCredits - 1);

    // Добавляем в историю (сохраняем РЕАЛЬНЫЙ результат!)
    if (!userHistoryMap.has(userId)) {
      userHistoryMap.set(userId, []);
    }
    const userHistory = userHistoryMap.get(userId);
    userHistory.unshift(generatedImageBase64); // Сохраняем сгенерированное изображение!
    if (userHistory.length > 20) {
      userHistory.pop();
    }

    // === Отдаём СГЕНЕРИРОВАННОЕ изображение! ===
    res.json({
      success: true,
      image: generatedImageBase64, // ✅ РЕАЛЬНЫЙ результат от Gemini!
      creditsLeft: userCreditsMap.get(userId)
    });

  } catch (error) {
    console.error("❌ Ошибка генерации:", error.message);
    console.error("Полный стек:", error.stack);
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
