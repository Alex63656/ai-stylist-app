import { userHistoryMap } from './generate.js';

export async function historyRoute(req, res) {
  try {
    const userId = req.telegramUser.id;
    const history = userHistoryMap.get(userId) || [];
    
    // Возвращаем только последние 20 для производительности
    const recentHistory = history.slice(0, 20).map(item => ({
      image: item.generatedImage,
      prompt: item.prompt,
      timestamp: item.timestamp
    }));
    
    res.json({
      success: true,
      history: recentHistory,
      total: history.length
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Ошибка получения истории' });
  }
}
