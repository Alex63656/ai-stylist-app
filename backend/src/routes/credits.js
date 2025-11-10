import { getUserCredits } from './generate.js';

export async function creditsRoute(req, res) {
  try {
    const userId = req.telegramUser.id;
    const credits = await getUserCredits(userId);
    
    res.json({
      success: true,
      credits,
      userId,
      isPro: false // Для будущей PRO версии
    });
  } catch (error) {
    console.error('Credits check error:', error);
    res.status(500).json({ error: 'Ошибка получения кредитов' });
  }
}
