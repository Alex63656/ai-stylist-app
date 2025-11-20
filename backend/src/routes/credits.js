import { getUserCredits } from './generate.js';

export async function creditsRoute(req, res) {
  try {
    // Пока используем default_user, если нет Telegram данных
    const userId = req.telegramUser?.id || req.query.userId || 'default_user';
    const credits = await getUserCredits(userId);
    
    res.json({
      success: true,
      credits: credits.credits,
      userId,
      isPro: false // Для будущей PRO версии
    });
  } catch (error) {
    console.error('Credits check error:', error);
    res.status(500).json({ error: 'Ошибка получения кредитов' });
  }
}
