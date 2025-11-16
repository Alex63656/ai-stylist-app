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
      return res.status(403).json({ error: 'Недостаточно кредитов', creditsLeft: 0 });
    }
    // Подготовка промпта
    const fullPrompt = buildPrompt(prompt, !!referencePhoto);
    // Подготовка изображений
    const parts = [
      { text: fullPrompt },
      { inlineData: { mimeType: 'image/jpeg', data: userPhoto } }
    ];

    // -- КРИТИЧЕСКАЯ ОБРАБОТКА ОШИБКИ Gemini --
    let result;
    try {
      result = await genAI.generate(contents=parts, model='gemini-2.5-flash-image-preview');
    } catch (e) {
      console.error('Gemini API ERROR:', e);
      return res.status(500).json({ error: 'Ошибка генерации: Gemini API не отвечает', details: e && e.message });
    }
    if (!result || !result.parts) {
      console.error('ERROR: Gemini API response is undefined or missing parts property!', result);
      return res.status(500).json({ error: 'Ошибка генерации: пустой или некорректный ответ Gemini', details: result });
    }
    // Все ОК — вернуть результат
    return res.json({ images: result.parts });
  } catch (err) {
    console.error('FATAL ERROR in generateHairstyleRoute:', err);
    return res.status(500).json({ error: 'Системная ошибка генерации', details: err && err.message });
  }
}
