import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function generateHairstyleRoute(req, res) {
  try {
    const { selfieImage, referenceImage, prompt, userId } = req.body;

    if (!selfieImage) {
      return res.status(400).json({ error: 'Селфи обязательно' });
    }

    // Проверка кредитов (можно добавить БД позже)
    const userCredits = await getUserCredits(userId);
    if (userCredits <= 0) {
      return res.status(403).json({ 
        error: 'Недостаточно кредитов',
        creditsLeft: 0
      });
    }

    // Подготовка промпта
    const fullPrompt = buildPrompt(prompt, !!referenceImage);
    
    // Подготовка изображений
    const parts = [
      { text: fullPrompt },
      {
        inlineData: {
          mimeType: selfieImage.mimeType || 'image/jpeg',
          data: selfieImage.data
        }
      }
    ];

    if (referenceImage) {
      parts.push({
        inlineData: {
          mimeType: referenceImage.mimeType || 'image/jpeg',
          data: referenceImage.data
        }
      });
    }

    // Генерация через Gemini
    const model = genai.models.get('gemini-2.0-flash-exp');
    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      config: {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'image/jpeg'
      }
    });

    // Извлечение результата
    const generatedImage = extractImageFromResponse(result);
    
    if (!generatedImage) {
      return res.status(500).json({ error: 'Не удалось сгенерировать изображение' });
    }

    // Уменьшаем кредиты
    await decrementUserCredits(userId);

    // Сохранение в историю (опционально)
    await saveToHistory(userId, {
      selfieImage: selfieImage.data.substring(0, 100),
      generatedImage,
      prompt,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      image: generatedImage,
      creditsLeft: userCredits - 1,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Generation error:', error);
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

function extractImageFromResponse(result) {
  try {
    // Извлекаем base64 изображение из ответа
    if (result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
      return result.candidates[0].content.parts[0].inlineData.data;
    }
    return null;
  } catch (error) {
    console.error('Error extracting image:', error);
    return null;
  }
}

// Mock функции для работы с кредитами (замените на реальную БД)
const userCreditsMap = new Map();

async function getUserCredits(userId) {
  // В продакшене - запрос к БД
  if (!userCreditsMap.has(userId)) {
    userCreditsMap.set(userId, 10); // 10 бесплатных кредитов
  }
  return userCreditsMap.get(userId);
}

async function decrementUserCredits(userId) {
  const current = await getUserCredits(userId);
  userCreditsMap.set(userId, Math.max(0, current - 1));
}

// Mock функция для истории (замените на реальную БД)
const userHistoryMap = new Map();

async function saveToHistory(userId, data) {
  if (!userHistoryMap.has(userId)) {
    userHistoryMap.set(userId, []);
  }
  const history = userHistoryMap.get(userId);
  history.unshift(data);
  // Храним только последние 50
  if (history.length > 50) {
    history.pop();
  }
}

export { getUserCredits, userHistoryMap };
