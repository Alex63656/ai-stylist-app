import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateHairstyleRoute(req, res) {
  try {
    // Получаем userId из Telegram middleware
    const userId = req.telegramUser?.id || 'dev-user-123';
    const { userPhoto, referencePhoto, prompt } = req.body;

    if (!userPhoto) {
      return res.status(400).json({ error: 'Фото обязательно' });
    }

    // Проверка кредитов
    const userCredits = await getUserCredits(userId);
    if (userCredits <= 0) {
      return res.status(403).json({ 
        error: 'Недостаточно кредитов',
        creditsLeft: 0
      });
    }

    // Подготовка промпта
    const fullPrompt = buildPrompt(prompt, !!referencePhoto);
    
    // Подготовка изображений
    const parts = [
      { text: fullPrompt },
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: userPhoto // base64 строка без prefix
        }
      }
    ];

    if (referencePhoto) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: referencePhoto
        }
      });
    }

    console.log(`🎨 Generating hairstyle for user ${userId}...`);

    // Генерация через Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    });

    // Извлечение результата
    const response = await result.response;
    
    // Gemini 2.0 Flash может возвращать изображение в base64
    // или текстовое описание
    const candidates = response.candidates;
    let generatedImage = null;

    if (candidates && candidates.length > 0) {
      const content = candidates[0].content;
      
      // Проверяем наличие изображения
      if (content.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            generatedImage = part.inlineData.data;
            break;
          }
        }
      }
      
      // Если изображения нет, используем оригинальное фото как fallback
      if (!generatedImage) {
        console.warn('⚠️ Gemini не вернул изображение, используем оригинал');
        generatedImage = userPhoto;
      }
    } else {
      throw new Error('Пустой ответ от Gemini API');
    }

    // Уменьшаем кредиты
    await decrementUserCredits(userId);

    // Сохранение в историю
    await saveToHistory(userId, {
      selfieImage: userPhoto.substring(0, 100),
      generatedImage,
      prompt,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Generation successful for user ${userId}`);

    res.json({
      success: true,
      image: generatedImage,
      creditsLeft: userCredits - 1,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Generation error:', error);
    res.status(500).json({
      error: error.message || 'Ошибка при генерации изображения',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

function buildPrompt(userPrompt, hasReference) {
  const basePrompt = `Ты профессиональный виртуальный стилист. Твоя задача - наложить причёску на фотографию человека, сохраняя естественность.`;
  
  if (hasReference) {
    return `${basePrompt}\n\nИспользуй стиль и причёску со второго фото как референс. ${userPrompt || ''}`;
  }
  
  return `${basePrompt}\n\n${userPrompt || 'Создай стильную современную причёску'}`;
}

// Mock функции для работы с кредитами
const userCreditsMap = new Map();

export async function getUserCredits(userId) {
  if (!userCreditsMap.has(userId)) {
    userCreditsMap.set(userId, 10);
  }
  return userCreditsMap.get(userId);
}

async function decrementUserCredits(userId) {
  const current = await getUserCredits(userId);
  userCreditsMap.set(userId, Math.max(0, current - 1));
}

// Mock функция для истории
export const userHistoryMap = new Map();

async function saveToHistory(userId, data) {
  if (!userHistoryMap.has(userId)) {
    userHistoryMap.set(userId, []);
  }
  const history = userHistoryMap.get(userId);
  history.unshift(data);
  if (history.length > 50) {
    history.pop();
  }
}
