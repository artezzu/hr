const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Создаем директорию для иконок, если её нет
const iconDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir);
}

// Функция для создания иконки
function createIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Зеленый фон
    ctx.fillStyle = '#0f9d58';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.1);
    ctx.fill();

    // Белая буква H
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.75}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', size/2, size/2);

    // Сохраняем файл
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(iconDir, `icon${size}.png`), buffer);
}

// Создаем иконки разных размеров
[16, 48, 128].forEach(size => createIcon(size)); 