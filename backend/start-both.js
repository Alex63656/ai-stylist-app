// backend/start-both.js
import { spawn } from 'child_process';

// Запускаем backend API
const api = spawn('node', ['src/index.js'], { stdio: 'inherit' });

// Задержка 2 сек перед запуском бота
setTimeout(() => {
    console.log('⏳ Запуск Telegram-бота через 2 секунды...');
    spawn('node', ['bot.js'], { stdio: 'inherit' });
}, 2000);

process.on('SIGINT', () => {
    api.kill();
    process.exit();
});
