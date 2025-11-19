// backend/src/routes/generate.js
// Полностью рабочая версия под gemini-2.5-flash-image (ноябрь 2025)

import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Только POST" });
  }

  try {
    const { faceImage, styleImage, prompt, user } = req.body;

    if (!faceImage || !user?.id) {
      return res.status(400).json({ error: "Нет фото или пользователя" });
    }

    const userId = user.id.toString();

    // === ПРОМПТ ===
    let fullPrompt = "Измени только волосы и причёску на этом человеке. ";
    if (prompt && prompt.trim()) {
      fullPrompt += prompt.trim() + ". ";
    } else {
      fullPrompt += "Сделай очень красивую современную причёску 2025 года. ";
    }
    if (styleImage) {
      fullPrompt += "Причёска должна быть точно как на втором фото. ";
    }
    fullPrompt += "Максимально реалистично, высокое качество 8K, как профессиональное фото из салона. Не меняй лицо, глаза, одежду, фон и освещение.";

    // === МОДЕЛЬ gemini-2.5-flash-image ===
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        responseMimeType: "image/png",
      },
    });

    // === Фото лица ===
    const facePath = path.join(process.cwd(), "public", "uploads", faceImage);
    const faceBase64 = Buffer.from(fs.readFileSync(facePath)).toString("base64");

    const imageParts = [
      {
        inlineData: {
          data: faceBase64,
          mimeType: "image/jpeg",
        },
      },
    ];

    // === Фото-пример (если есть) ===
    if (styleImage) {
      const stylePath = path.join(process.cwd(), "public", "uploads", styleImage);
      const styleBase64 = Buffer.from(fs.readFileSync(stylePath)).toString("base64");
      imageParts.push({
        inlineData: {
          data: styleBase64,
          mimeType: "image/jpeg",
        },
      });
    }

    // === Генерация ===
    const result = await model.generateContent([fullPrompt, ...imageParts]);
    const response = await result.response;

    const generatedBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!generatedBase64) {
      return res.status(500).json({ error: "Gemini не отдал картинку" });
    }

    // === Сохраняем картинку ===
    const filename = `${uuidv4()}.png`;
    const filepath = path.join(process.cwd(), "public/generated", filename);
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, Buffer.from(generatedBase64, "base64"));

    // === Отдаём результат (кредиты временно НЕ списываем) ===
    res.json({
      success: true,
      imageUrl: `https://web-production-38699.up.railway.app/generated/${filename}`,
    });

  } catch (error) {
    console.error("Ошибка генерации:", error.message);
    res.status(500).json({ 
      error: "Не получилось сгенерировать", 
      details: error.message 
    });
  }
}
