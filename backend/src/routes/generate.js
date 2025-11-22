// backend/src/routes/generate.js
// Исправлено: корректный промпт для Gemini 2.5 Flash Image и лучший парсинг ответа.
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
    // -- КРИТИЧЕСКИ ПРОСТОЙ И УСПЕШНЫЙ ПРОМПТ --
    let fullPrompt = "Сделай современную реалистичную прическу на этом человеке, студийное качество, не меняй черты лица.";
    if (prompt && prompt.trim()) {
      fullPrompt = prompt.trim();
    }
    if (referencePhoto) {
      fullPrompt += " Используй стиль прически с второго фото.";
    }
    //
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });
    const imageParts = [
      { inlineData: { data: userPhoto, mimeType: "image/jpeg" } },
    ];
    if (referencePhoto) {
      imageParts.push({ inlineData: { data: referencePhoto, mimeType: "image/jpeg" } });
    }
    //
    const result = await model.generateContent([fullPrompt, ...imageParts]);
    const response = await result.response;
    // Ищем изображение во всех parts
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
      return res.status(500).json({ error: "Gemini не смог сгенерировать изображение", details: response.candidates?.[0]?.finishMessage || "Проверьте квоты и фото" });
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