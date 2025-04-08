// Файл config.js загружается отдельно в manifest.json для background

chrome.runtime.onInstalled.addListener(() => {
  console.log('HeadHunter Platform Import extension installed');
  // Логируем URL API для проверки правильности загрузки конфигурации
  console.log('Configured API URL:', chrome.runtime.getURL('config.js'));
});

// Здесь можно добавить обработку сообщений от content скрипта
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'IMPORT_CANDIDATE') {
    // Обработка импорта кандидата
    sendResponse({ success: true });
  }
}); 