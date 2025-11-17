import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Store for user generation history
export const userHistoryMap = new Map();
export async function getUserCredits(userId) { return 5; }

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
      return res.status(403).json({ error: 'Недостаточно кредитов', creditsLeft: 0 });
    }
    // Подготовка промпта
        const fullPrompt = prompt; // Simple prompt without building
    // Подготовка изображений
      // Подготовка текстового промпта для генерации
  const textPrompt = `Придумай интересное описание новой прически на основе этого запроса: "${fullPrompt}"
  Ответь кратким, но креативным описанием (2-3 предложения) на русском языке.`;

 // Использование vision модели для обработки и описания
 const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });
 
 // Подготовка контента с изображением
 const imagePart = { inlineData: { data: userPhoto.split(',')[1], mimeType: 'image/jpeg' } };
 const textPart = { text: `Опиши эту прическу и предложи улучшения на основе запроса: "${fullPrompt}"` };
 
 const result = await model.generateContent([imagePart, textPart]);
 const generatedText = result.response.text();  
  // Возвращаем сгенерированное описание вместо изображения
  return res.json({
    success: true,
    description: generatedText,
    message: 'Описание прически успешно сгенерировано'
  });

} catch (e) {
  console.error('Gemini API ERROR:', e);
  return res.status(500).json({ error: 'Ошибка генерации', details: e.message });

  }
  }
