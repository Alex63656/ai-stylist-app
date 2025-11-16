import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateHairstyleRoute(req, res) {
  try {
    const userId = req.telegramUserId || 'dev-user-123';
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

    // Вызов Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
    const response = await model.generateContent(parts);
    const result = await response.response;

    // Получение изображения
    const generatedImage = result.candidates[0].content.parts[0].text ||
                          result.candidates[0].content.parts[0].inlineData?.data ||
                          userPhoto;

    // Уменьшение кредитов
    await decrementUserCredits(userId);

    // Сохранение в историю
    await saveToHistory(userId, {
      userPhoto,
      referencePhoto,
      prompt,
      generatedImage,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      image: generatedImage,
      creditsLeft: userCredits - 1
    });
  } catch (error) {
    console.error('Error generating hairstyle:', error);
    res.status(500).json({ error: 'Ошибка генерации' });
  }
}

function buildPrompt(userPrompt, hasReference) {
  const basePrompt = `You are an expert AI virtual hairstylist.

**PRIMARY GOAL (HIGHEST PRIORITY):**
Your **NUMBER ONE GOAL** is to apply the hairstyle from the **Reference Photo** to the person in the **Original Photo**. The hair MUST be visibly different from the original.

**INPUTS:**
1.  **Original Photo (Source):** Contains the person's face and identity.
2.  **Reference Photo (Reference):** Contains the **target hairstyle** (shape, color, texture).

**CRITICAL REQUIREMENTS:**
1.  **CHANGE THE HAIR:** The hairstyle from the Original Photo **MUST** be completely replaced by the hairstyle from the Reference Photo. This is your main task.
2.  **PRESERVE LIKENESS (NOT PIXELS):** The person's core facial features **(eyes, nose, mouth, and chin/jaw structure)** must be preserved. The person must remain recognizable.
3.  **PERMISSION TO OCCLUDE:** You **HAVE PERMISSION** to cover parts of the source image (like the forehead, ears, or neck) if the new hairstyle from the reference photo naturally covers them. This is NOT a violation of Requirement #2.
4.  **DO NOT MERGE FACES:** Use the Reference Photo *only* for hairstyle information. Do not copy the reference's facial features.
5.  **FINAL CHECK (MANDATORY):** Before outputting, ask yourself: "Is the hair different from the Original Photo?" If the answer is "No," you have failed. **YOU MUST NOT output the original image.**

**OUTPUT FORMAT:**
-   Single, high-quality, photorealistic portrait (head and shoulders).
-   Resolution: 512x512 or higher.`;

  if (hasReference) {
    let finalPrompt = `${basePrompt}\n\n**STYLE INSTRUCTIONS:**\n- Primary Goal: Apply the hairstyle from the **Reference Photo**.`;
    if (userPrompt) {
      finalPrompt += `\n- Additional user requests: ${userPrompt}`;
    }
    return `${finalPrompt}\n\nGenerate the image now.`;
  }

  if (userPrompt) {
    return `${basePrompt}\n\n**STYLE INSTRUCTIONS:**\n- No reference photo provided. Generate the hairstyle based on this description: ${userPrompt}\n\nGenerate the image now.`;
  }

  return `${basePrompt}\n\n**STYLE INSTRUCTIONS:**\n- No reference or description provided. Generate a modern, stylish, professional haircut.\n\nGenerate the image now.`;
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
