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
          data: userPhoto
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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192
      }
    });

    const response = await result.response;
    const candidates = response.candidates;
    let generatedImage = null;

    if (candidates && candidates.length > 0) {
      const content = candidates[0].content;

      if (content.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            generatedImage = part.inlineData.data;
            break;
          }
        }
      }

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
  /* ОСНОВНОЙ Промпт (английский) - более строгий и чёткий */
  const basePrompt = `You are an expert AI virtual hairstylist.
Your primary task is to **modify an original photo** of a person to apply a new hairstyle.

**INPUTS:**
1.  **Original Photo (Source):** The photo of the person who needs a hairstyle change.
2.  **Reference Photo (Reference):** The image showing the **target hairstyle** (its shape, color, texture, and length).

**YOUR TASK:**
1.  Analyze the **hairstyle** (shape, color, texture) from the **Reference Photo**.
2.  Analyze the **person** (face shape, features, skin tone, lighting) from the **Original Photo**.
3.  Generate a new, photorealistic image where the person from the **Original Photo** now has the hairstyle from the **Reference Photo**.

**CRITICAL REQUIREMENTS:**
-   **PRESERVE IDENTITY:** The person's identity, facial structure, expression, and features (eyes, nose, mouth) must remain **PERFECTLY UNCHANGED**.
-   **CHANGE ONLY THE HAIR:** The only thing you must fundamentally change is the hairstyle.
-   **SEAMLESS INTEGRATION:** The new hairstyle must be naturally integrated onto the person's head, matching the lighting, shadows, and skin tone of the **Original Photo**.
-   **DO NOT COPY THE FACE:** You must not swap the source face with the reference face. The reference is **ONLY FOR THE HAIRSTYLE**.
-   **FORBIDDEN: DO NOT RETURN THE ORIGINAL.** It is **STRICTLY FORBIDDEN** to return the original image without changes. The output **MUST** show a new hairstyle.
-   **Format:** Single, high-quality, photorealistic portrait (head and shoulders).
-   **Resolution:** 512x512 or higher.`;

  // Сценарий 1: Есть Референс
  if (hasReference) {
    let finalPrompt = `${basePrompt}\n\n**STYLE INSTRUCTIONS:**\n- Your primary goal is to apply the hairstyle from the **Reference Photo**.`;
    if (userPrompt) {
      finalPrompt += `\n- Additional user requests: ${userPrompt}`;
    }
    return `${finalPrompt}\n\nGenerate the image now.`;
  }

  // Сценарий 2: Нет Референса, но есть текстовое описание
  if (userPrompt) {
    return `${basePrompt}\n\n**STYLE INSTRUCTIONS:**\n- No reference photo was provided. Generate the hairstyle based on this description: ${userPrompt}\n\nGenerate the image now.`;
  }

  // Сценарий 3: Запасной вариант
  return `${basePrompt}\n\n**STYLE INSTRUCTIONS:**\n- No reference or description was provided. Generate a modern, stylish, professional haircut.\n\nGenerate the image now.`;
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
