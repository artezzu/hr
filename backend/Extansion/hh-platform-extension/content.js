// Используем конфигурацию из внешнего файла
// CONFIG импортируется из config.js через manifest.json

// Добавляем больше логирования
console.log('HeadHunter Platform Import: Script initialized');
console.log('Current URL:', window.location.href);
console.log('Using API URL:', CONFIG.API_URL);

async function extractCandidateData() {
  // Получаем данные кандидата с обновленными селекторами
  const fullName = document.querySelector('h2[data-qa="resume-personal-name"]')?.textContent?.trim() ||
                  document.querySelector('.resume-header-name h2.bloko-header-1')?.textContent?.trim();
                  
  const phone = document.querySelector('a[data-qa="resume-contact-preferred"]')?.textContent?.trim() ||
               document.querySelector('div[data-qa="resume-contacts-phone"]')?.textContent?.trim();
               
  const position = document.querySelector('span[data-qa="resume-block-title-position"]')?.textContent?.trim() ||
                  document.querySelector('.resume-block-position .resume-block__title-text')?.textContent?.trim();

  // Обновленные селекторы для личной информации
  const birthDateText = document.querySelector('span[data-qa="resume-personal-birthday"]')?.textContent?.trim() || '';
  const birthDate = birthDateText.split('&nbsp;').join(' '); // Заменяем HTML пробелы на обычные

  // Образование
  const educationBlocks = document.querySelectorAll('.resume-block-education-item, .resume-block__education');
  let education = Array.from(educationBlocks).map(block => {
    const name = block.querySelector('.bloko-header-2, .resume-block__education-name')?.textContent?.trim() || '';
    const year = block.querySelector('.resume-block__education-year')?.textContent?.trim() || '';
    const org = block.querySelector('.resume-block__education-organization')?.textContent?.trim() || '';
    return [name, year, org].filter(Boolean).join(' - ');
  }).filter(text => text).join('; ');
  
  // Значение по умолчанию, если образование не найдено
  if (!education || education.trim() === '') {
    education = 'Не указано';
  }

  // Опыт работы
  const experienceBlocks = document.querySelectorAll('.resume-block-experience-item, .resume-block__experience');
  let experience = Array.from(experienceBlocks).map(block => {
    const company = block.querySelector('.bloko-header-2, .resume-block__company-name')?.textContent?.trim() || '';
    const position = block.querySelector('.resume-block__sub-title, .resume-block__position')?.textContent?.trim() || '';
    const duration = block.querySelector('.resume-block__experience-timeinterval')?.textContent?.trim() || '';
    return [company, position, duration].filter(Boolean).join(' - ');
  }).filter(text => text).join('; ');
  
  // Значение по умолчанию, если опыт не найден
  if (!experience || experience.trim() === '') {
    experience = 'Не указано';
  }

  // Языки
  const languageBlocks = document.querySelectorAll('.resume-block__language, .resume-block-language-item');
  let languages = Array.from(languageBlocks).map(block => {
    return block.textContent.replace(/\s+/g, ' ').trim();
  }).filter(text => text).join(', ');
  
  // Значение по умолчанию, если языки не найдены
  if (!languages || languages.trim() === '') {
    languages = 'Не указано';
  }

  // Местоположение
  const location = document.querySelector('.resume__address')?.textContent?.trim() ||
                  document.querySelector('[data-qa="resume-personal-address"]')?.textContent?.trim() ||
                  'Ташкент';

  // Гражданство
  const citizenshipElem = document.querySelector('.resume-block__citizenship, [data-qa="resume-citizenship"]');
  const citizenship = citizenshipElem ? citizenshipElem.textContent.replace('Гражданство:', '').trim() : '';

  // Получаем PDF резюме
  let pdfUrl = '';
  const resumeHash = window.location.pathname.split('/')[2].split('?')[0];
  const domain = window.location.hostname;
  
  // Определяем домен для скачивания PDF
  const baseDomain = Object.keys(CONFIG.PDF_DOMAIN_MAPPINGS).find(key => domain.includes(key));
  if (baseDomain) {
    pdfUrl = `${CONFIG.PDF_DOMAIN_MAPPINGS[baseDomain]}/resume_converter/${encodeURIComponent(fullName)}.pdf?hash=${resumeHash}&type=pdf&hhtmSource=resume&hhtmFrom=resume_search_result`;
  } else {
    // Пытаемся использовать текущий домен
    pdfUrl = `https://${domain}/resume_converter/${encodeURIComponent(fullName)}.pdf?hash=${resumeHash}&type=pdf&hhtmSource=resume&hhtmFrom=resume_search_result`;
  }
  
  console.log('PDF URL:', pdfUrl);
  console.log('Current domain:', domain);
  
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error('Не удалось загрузить PDF файл');
    }
    const resumeBlob = await response.blob();

    return {
      full_name: fullName,
      phone: phone,
      specialty: position,
      birth_date: birthDate,
      education: education,
      experience: experience,
      languages: languages,
      location: location,
      citizenship: citizenship,
      resumeBlob: resumeBlob
    };
  } catch (error) {
    console.error('Ошибка при загрузке PDF:', error);
    return {
      full_name: fullName,
      phone: phone,
      specialty: position,
      birth_date: birthDate,
      education: education,
      experience: experience,
      languages: languages,
      location: location,
      citizenship: citizenship
    };
  }
}

function createNotification(type, content) {
    const styles = CONFIG.NOTIFICATION_STYLES[type];
    const notification = document.createElement('div');
    notification.className = `import-${type}-notification`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        left: 20px;
        padding: 15px 20px;
        background-color: ${styles.backgroundColor};
        color: ${styles.textColor};
        border-left: 4px solid ${styles.borderColor};
        border-radius: 8px;
        z-index: 9998;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        max-width: 350px;
        margin-top: 60px;
        animation: slideIn 0.3s ease-out forwards;
    `;

    // Проверяем, были ли уже добавлены стили анимации
    if (!document.getElementById('notification-animations')) {
        const style = document.createElement('style');
        style.id = 'notification-animations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateY(0); opacity: 1; }
                to { transform: translateY(-20px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    if (typeof content === 'string') {
        notification.textContent = content;
    } else {
        notification.innerHTML = content;
    }

    document.body.appendChild(notification);

    // Удаляем уведомление через 10 секунд с анимацией
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 10000);

    return notification;
}

async function addImportButton() {
  if (document.querySelector('.import-candidate-button')) {
    return;
  }

  // Находим контейнер для кнопок, проверяя все возможные селекторы
  const actionsContainer = document.querySelector('[data-qa="resume-actions"]') || 
                         document.querySelector('.resume-actions') ||
                         document.querySelector('.resume-applicant-actions') ||
                         document.querySelector('.resume__main-content .bloko-columns-row');

  if (!actionsContainer) {
    console.log('Контейнер для кнопок не найден');
    return;
  }

  const button = document.createElement('button');
  button.className = 'import-candidate-button bloko-button bloko-button_kind-success';
  button.textContent = 'Добавить кандидата на платформу';
  button.style.cssText = `
    margin: 8px 8px 8px 0;
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
  `;

  // Добавляем кнопку после первой кнопки, если она есть
  const firstButton = actionsContainer.querySelector('button, .bloko-button');
  if (firstButton) {
    firstButton.after(button);
  } else {
    actionsContainer.insertBefore(button, actionsContainer.firstChild);
  }

  button.addEventListener('click', async () => {
    try {
      const candidateData = await extractCandidateData();
      
      // Проверяем, существует ли кандидат
      const checkResponse = await fetch(`${CONFIG.API_URL}/api/hh/candidates/check?full_name=${encodeURIComponent(candidateData.full_name)}&phone=${encodeURIComponent(candidateData.phone)}`);
      const checkResult = await checkResponse.json();

      if (checkResult.exists) {
        button.textContent = 'Кандидат уже добавлен';
        button.classList.remove('bloko-button_kind-success');
        button.classList.add('bloko-button_kind-warning');
        button.disabled = true;

        setTimeout(() => {
          button.textContent = 'Добавить кандидата на платформу';
          button.classList.remove('bloko-button_kind-warning');
          button.classList.add('bloko-button_kind-success');
          button.style.opacity = '1';
          button.style.cursor = 'pointer';
          button.disabled = false;
          button.onmouseover = function() {
            this.style.opacity = '0.9';
            this.style.transform = 'translateY(-1px)';
          };
          button.onmouseout = function() {
            this.style.opacity = '1';
            this.style.transform = 'translateY(0)';
          };
        }, 3000);
        return;
      }

      // Продолжаем импорт если кандидат не существует
      button.disabled = true;
      button.style.backgroundColor = CONFIG.BUTTON_STYLES.importing.backgroundColor;
      button.textContent = 'Импорт...';

      const formData = new FormData();
      
      const fullName = candidateData.full_name || 'Не указано';
      const phone = candidateData.phone || 'Не указано'; 
      const specialty = candidateData.specialty || 'Не указано';
      const birthDate = candidateData.birth_date || 'Не указано';
      const education = candidateData.education || 'Не указано';
      const experience = candidateData.experience || 'Не указано';
      const languages = candidateData.languages || 'Не указано';
      const location = candidateData.location || 'Не указано';
      const citizenship = candidateData.citizenship || 'Не указано';
      
      formData.append('full_name', fullName);
      formData.append('phone', phone);
      formData.append('specialty', specialty);
      formData.append('birth_date', birthDate);
      formData.append('education', education);
      formData.append('experience', experience);
      formData.append('languages', languages);
      formData.append('location', location);
      formData.append('citizenship', citizenship);

      if (candidateData.resumeBlob) {
        formData.append('resume', candidateData.resumeBlob, 'resume.pdf');
      }

      const response = await fetch(`${CONFIG.API_URL}/api/hh/candidates`, {
          method: 'POST',
          mode: 'cors',
          body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          if (response.status === 422 && errorJson.detail) {
            const missingFields = errorJson.detail
              .filter(item => item.type === 'missing')
              .map(item => item.loc[1])
              .join(', ');
            
            if (missingFields) {
              throw new Error(`Отсутствуют обязательные поля: ${missingFields}`);
            }
          }
        } catch (jsonError) {
          throw new Error(`Ошибка при импорте: ${response.status}`);
        }
      }

      const result = await response.json();
      
      button.textContent = 'Успешно добавлен!';
      button.classList.remove('bloko-button_kind-success');
      button.classList.add('bloko-button_kind-secondary');
      
      createNotification('success', `Кандидат ${candidateData.full_name} успешно добавлен на платформу!`);
      
      setTimeout(() => {
        button.textContent = 'Добавить кандидата на платформу';
        button.classList.remove('bloko-button_kind-secondary');
        button.classList.add('bloko-button_kind-success');
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.disabled = false;
        button.style.backgroundColor = CONFIG.BUTTON_STYLES.normal.backgroundColor;
        button.style.color = CONFIG.BUTTON_STYLES.normal.color;
      }, 3000);

    } catch (error) {
      createNotification('error', error.message || 'Не удалось импортировать кандидата');
      
      setTimeout(() => {
        button.textContent = 'Добавить кандидата на платформу';
        button.classList.remove('bloko-button_kind-secondary');
        button.classList.add('bloko-button_kind-success');
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.disabled = false;
        button.style.backgroundColor = CONFIG.BUTTON_STYLES.normal.backgroundColor;
        button.style.color = CONFIG.BUTTON_STYLES.normal.color;
      }, 3000);
    }
  });
}

// Инициализация
addImportButton();

// Добавляем отложенный запуск для случаев медленной загрузки DOM
setTimeout(addImportButton, 1500);

// Наблюдатель за изменениями DOM
let observer = null;

function startObserver() {
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver(() => {
    addImportButton();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

startObserver(); 