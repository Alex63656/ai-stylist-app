import { userHistoryMap } from './generate.js';

export async function historyRoute(req, res) {
  try {
    // Пока используем default_user, если нет Telegram данных
    const userId = req.telegramUser?.id || req.query.userId || 'default_user';
    const history = userHistoryMap.get(userId) || [];
    
    // Возвращаем только последние 20 для производительности
    const recentHistory = history.slice(0, 20);
    
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
