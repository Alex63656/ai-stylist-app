// backend/src/routes/generate.js
// Исправлено: ищем изображение во всех parts Gemini-2.5 Flash Image!
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const userHistoryMap = new Map();
const userCreditsMap = new Map();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Только POST" });
  }

  try {
    const { userPhoto, referencePhoto, prompt } = req.body;
    if (!userPhoto) {
      return res.status(400).json({ error: "Нет фото лица" });
    }
    const userId = req.body.userId || 'default_user';
    if (!userCreditsMap.has(userId)) userCreditsMap.set(userId, 10);
    const currentCredits = userCreditsMap.get(userId);
    if (currentCredits <= 0) {
      return res.status(403).json({ error: "Недостаточно кредитов", creditsLeft: 0 });
    }
    let fullPrompt = "Измени только волосы и причёску на этом человеке. ";
    if (prompt && prompt.trim()) fullPrompt += prompt.trim() + ". ";
    else fullPrompt += "Сделай очень красивую современную причёску 2025 года. ";
    if (referencePhoto) fullPrompt += "Причёска должна быть точно как на втором фото. ";
    fullPrompt += "Максимально реалистично, высокое качество 8K, как профессиональное фото из дорогого салона. Не меняй лицо, глаза, одежду, фон и освещение.";
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });
    const imageParts = [
      { inlineData: { data: userPhoto, mimeType: "image/jpeg" } },
    ];
    if (referencePhoto) {
      imageParts.push({ inlineData: { data: referencePhoto, mimeType: "image/jpeg" } });
    }
    const result = await model.generateContent([fullPrompt, ...imageParts]);
    const response = await result.response;
    const parts = response.candidates?.[0]?.content?.parts || [];
    let generatedImageBase64 = null;
    let mimeType = 'image/png';
    for (const part of parts) {
      if (part.inlineData?.data) {
        generatedImageBase64 = part.inlineData.data;
        mimeType = part.inlineData.mimeType || mimeType;
        break;
      }
      if (part.text && part.text.length > 1000 && /^[A-Za-z0-9+/=]+$/.test(part.text.substring(0, 100))) {
        generatedImageBase64 = part.text;
        mimeType = 'image/png';
        break;
      }
    }
    if (!generatedImageBase64) {
      console.error('❌ Gemini не вернул картинку ни в одном из parts');
      console.error('Полный ответ:', JSON.stringify(response).substring(0, 2000));
      return res.status(500).json({ error: "Gemini не смог сгенерировать изображение", details: "Проверьте квоты API и правильность модели" });
    }
    userCreditsMap.set(userId, currentCredits - 1);
    if (!userHistoryMap.has(userId)) userHistoryMap.set(userId, []);
    const userHistory = userHistoryMap.get(userId);
    userHistory.unshift(generatedImageBase64);
    if (userHistory.length > 20) userHistory.pop();
    res.json({ success: true, image: generatedImageBase64, creditsLeft: userCreditsMap.get(userId), mimeType });
  } catch (error) {
    console.error("❌ Ошибка генерации:", error.message);
    res.status(500).json({ error: "Не получилось сгенерировать", details: error.message });
  }
}
export async function getUserCredits(userId) {
  if (!userCreditsMap.has(userId)) userCreditsMap.set(userId, 10);
  return { credits: userCreditsMap.get(userId) };
}
export { userHistoryMap, userCreditsMap };