// backend/src/routes/generate.js
// Этот файл отвечает за генерацию новой причёски
// Мы используем ТОЛЬКО gemini-2.5-flash-image-generation, как ты и приказал

import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { getUser, deductCredits, addToHistory } from "../db/index.js"; // если имя другое — потом скажешь

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Только POST" });

  try {
    const { faceImage, styleImage, prompt, user } = req.body; // user — это объект из Telegram

    const userId = user.id.toString();

    // Проверяем кредиты
    const currentUser = await getUser(userId);
    if (!currentUser || currentUser.credits <= 0) {
      return res.status(402).json({ error: "Нет кредитов 😢 Купи ещё!" });
    }

    // Формируем промпт
    let fullPrompt = "Измени только причёску и волосы на этом человеке. ";
    if (prompt && prompt.trim() !== "") {
      fullPrompt += prompt.trim() + ". ";
    } else {
      fullPrompt += "Сделай красивую современную причёску 2025 года. ";
    }
    if (styleImage) {
      fullPrompt += "Сделай причёску точно как на втором фото. ";
    }
    fullPrompt += "Очень реалистично, высокое качество 8K, как будто человек только что вышел из дорогого салона. Не меняй лицо, глаза, одежду, фон, освещение.";

    // Модель, которую ты приказал использовать
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image-generation",
      generationConfig: {
        responseModalities: ["image"],
        responseMimeType: "image/png",
      },
    });

    // Загружаем фото лица
    const faceFile = path.join(process.cwd(), "public", "uploads", faceImage);
    const faceImagePart = {
      inlineData: {
        data: Buffer.from(fs.readFileSync(faceFile)).toString("base64"),
        mimeType: "image/jpeg",
      },
    };

    // Если есть фото-пример причёски
    let styleImagePart = [];
    if (styleImage) {
      const styleFile = path.join(process.cwd(), "public", "uploads", styleImage);
      styleImagePart = [{
        inlineData: {
          data: Buffer.from(fs.readFileSync(styleFile)).toString("base64"),
          mimeType: "image/jpeg",
        },
      }];
    }

    // Отправляем запрос в Gemini
    const result = await model.generateContent([
      fullPrompt,
      faceImagePart,
      ...styleImagePart,
    ]);

    const response = await result.response;

    // Берём готовую картинку (новый способ 2025 года)
    const base64Image = response.candidates[0].content.parts[0].inlineData.data;

        if (!base64Image) {
      return res.status(500).json({ error: "Gemini не отдал картинку" });
    }

    // Сохраняем на сервер
    const filename = `${uuidv4()}.png`;
    const filepath = path.join(process.cwd(), "public/generated", filename);
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, Buffer.from(base64Image, "base64"));

    // Списываем кредит и сохраняем в историю
    await deductCredits(userId);
    await addToHistory(userId, `/generated/${filename}`);

    // Отдаём ссылку фронтенду
    res.json({
      success: true,
      imageUrl: `https://web-production-38699.up.railway.app/generated/${filename}`,
    });

  } catch (error) {
    console.error("Ошибка в generate.js:", error.message);
    res.status(500).json({ error: "Не получилось сгенерировать", details: error.message });
  }
}
