// app.js - Приложение для отметки посещаемости студентов (PWA)
// Основной файл приложения - управление UI и бизнес-логикой

/**
 * ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ УПРАВЛЕНИЯ СОСТОЯНИЕМ
 */
let currentStudentId = null;    // ID текущего студента для статистики
let currentStatsMonth = null;   // Текущий месяц для отображения статистики
let availableMonths = [];       // Доступные месяцы с данными посещаемости

/**
 * КОММУНИКАЦИЯ С МОДУЛЕМ ХРАНЕНИЯ ДАННЫХ
 */

/**
 * Устанавливает колбэк для обновления UI после импорта данных
 * @param {Function} callback - Функция для вызова после импорта
 */
function setOnDataImported(callback) {
    if (typeof setOnDataImportedStorage === 'function') {
        setOnDataImportedStorage(callback);
    }
}

/**
 * ФУНКЦИИ ДЛЯ РАБОТЫ С ДАТАМИ И ИХ ОТОБРАЖЕНИЕМ
 */

/**
 * Обновляет отображение выбранной даты с учетом учебного расписания
 */
function updateDateDisplay() {
    const dateSelector = document.getElementById('date-selector');
    const dateDisplay = document.getElementById('date-display');
    
    if (dateSelector.value) {
        const date = new Date(dateSelector.value);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            weekday: 'short'
        });
        
        // Проверяем учебный день и применяем соответствующие стили
        if (isStudyDay(dateSelector.value)) {
            dateDisplay.textContent = formattedDate;
            dateDisplay.classList.remove('non-study-day');
        } else {
            dateDisplay.textContent = formattedDate + ' (не учебный)';
            dateDisplay.classList.add('non-study-day');
        }
    }
}

/**
 * ОСНОВНЫЕ ФУНКЦИИ ПРИЛОЖЕНИЯ
 */

/**
 * Обновляет список студентов для выбранной даты и группы
 */
function updateAttendanceList() {
    const date = document.getElementById('date-selector').value;
    const group = document.getElementById('group-selector').value;
    
    const students = getStudentsInGroup(group);
    const attendance = getAttendanceForDate(date);
    
    const container = document.getElementById('students-container');
    container.innerHTML = '';
    
    if (students.length === 0) {
        container.innerHTML = '<div class="text-center text-muted">Нет студентов в группе</div>';
        return;
    }
    
    students.forEach(student => {
        const present = attendance[student.id] !== undefined ? attendance[student.id] : null;
        const studentCard = createStudentCard(student, present);
        container.appendChild(studentCard);
        
        setupStudentCardEventHandlers(studentCard, student.id);
    });
}

/**
 * Создает DOM-элемент карточки студента
 */
function createStudentCard(student, present) {
    const studentCard = document.createElement('div');
    studentCard.className = `student-card present-${present}`;
    
    studentCard.innerHTML = `
        <span class="student-name">${student.name}</span>
        <div class="student-info">
            <button class="student-status-btn" data-student-id="${student.id}">
                📊
            </button>
            <span class="student-status status-${present}">
                ${present === true ? '✅' : present === false ? '❌' : '⬜'}
            </span>
        </div>
    `;
    
    return studentCard;
}

/**
 * Настраивает обработчики событий для карточки студента
 */
function setupStudentCardEventHandlers(studentCard, studentId) {
    studentCard.addEventListener('click', (e) => {
        if (!e.target.closest('.student-status-btn')) {
            toggleAttendance(studentId, studentCard);
        }
    });
    
    const statsBtn = studentCard.querySelector('.student-status-btn');
    statsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openStudentStats(studentId);
    });
}


/**
 * ФУНКЦИИ ДЛЯ РАБОТЫ С ПОСЕЩАЕМОСТЬЮ
 */

/**
 * Переключает статус присутствия студента с проверкой учебного дня
 * @param {number} studentId - ID студента
 * @param {HTMLElement} element - Элемент карточки студента
 */
function toggleAttendance(studentId, element) {
    const date = document.getElementById('date-selector').value;
    
    // Проверяем, является ли день учебным
    if (!isStudyDay(date)) {
        showDateConfirmModal(date, studentId, element);
        return;
    }
    
    // Если учебный день - продолжаем как обычно
    proceedWithAttendance(date, studentId, element);
}

/**
 * Показывает модальное окно подтверждения для не учебного дня
 * @param {string} date - Дата в формате YYYY-MM-DD
 * @param {number} studentId - ID студента
 * @param {HTMLElement} element - Элемент карточки студента
 */
function showDateConfirmModal(date, studentId, element) {
    const dateObj = new Date(date);
    const dayName = getDayName(dateObj.getDay());
    const formattedDate = formatDate(date);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content confirm-modal">
            <div class="modal-header">
                <h2 class="modal-title">⚠️ Подтверждение</h2>
            </div>
            <div class="modal-body">
                <p>Выбранная дата <strong>${formattedDate}</strong> (${dayName}) не является учебным днем по текущему расписанию.</p>
                <p>Вы уверены, что хотите отметить посещаемость?</p>
                <div class="confirm-buttons">
                    <button id="confirm-attendance" class="btn btn-primary">Да, отметить</button>
                    <button id="cancel-attendance" class="btn btn-secondary">Отмена</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Обработчики для кнопок подтверждения
    document.getElementById('confirm-attendance').addEventListener('click', () => {
        modal.remove();
        proceedWithAttendance(date, studentId, element);
    });
    
    document.getElementById('cancel-attendance').addEventListener('click', () => {
        modal.remove();
    });
    
    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

/**
 * Основная логика отметки посещаемости
 * @param {string} date - Дата в формате YYYY-MM-DD
 * @param {number} studentId - ID студента
 * @param {HTMLElement} element - Элемент карточки студента
 */
function proceedWithAttendance(date, studentId, element) {
    const present = getNextStatus(studentId, date);
    
    if (saveAttendance(date, studentId, present)) {
        updateStudentCard(element, present);
        
        // Вибрация для тактильного отклика (если поддерживается)
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    } else {
        showNotification('Ошибка сохранения', 'error');
    }
}

/**
 * Обновляет внешний вид карточки студента
 * @param {HTMLElement} element - Элемент карточки студента
 * @param {boolean|null} present - Новый статус присутствия
 */
function updateStudentCard(element, present) {
    // Удаляем предыдущие классы статуса
    element.classList.remove('present-true', 'present-false', 'present-null');
    
    // Добавляем соответствующий класс статуса
    if (present === null) {
        element.classList.add('present-null');  // Стиль "не отмечено"
    } else if (present === true) {
        element.classList.add('present-true');  // Стиль "присутствовал"
    } else {
        element.classList.add('present-false'); // Стиль "отсутствовал"
    }
    
    // Обновляем иконку статуса
    const icon = element.querySelector('.student-status');
    icon.textContent = present === true ? '✅' : present === false ? '❌' : '⬜';
}

/**
 * ФУНКЦИИ ДЛЯ РАБОТЫ С РАСПИСАНИЕМ
 */

/**
 * Инициализирует расписание при загрузке приложения
 */
function initializeSchedule() {
    const schedule = getSchedule();
    updateScheduleDisplay();
}

/**
 * Обновляет отображение расписания в интерфейсе
 */
function updateScheduleDisplay() {
    const date = document.getElementById('date-selector').value;
    const dateDisplay = document.getElementById('date-display');
    
    if (isStudyDay(date)) {
        dateDisplay.classList.remove('non-study-day');
    } else {
        dateDisplay.classList.add('non-study-day');
    }
}
/**
 * Открывает модальное окно настроек
 */
function openSettingsModal() {
    // Загружаем текущие настройки
    loadCurrentSettings();
    
    // Показываем модальное окно
    document.getElementById('settings-modal').style.display = 'block';
}

/**
 * Закрывает модальное окно настроек
 */
function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
}

/**
 * Загружает текущие настройки в форму
 */
/**
 * Загружает текущие настройки в форму
 */
function loadCurrentSettings() {
    // Загрузка текущего расписания
    const schedule = getSchedule();
    schedule.forEach(day => {
        const checkbox = document.querySelector(`.day-checkbox[value="${day}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
    
    // Загрузка токена GitHub (если есть)
    const githubToken = localStorage.getItem('github_token');
    if (githubToken) {
        document.getElementById('github-token').value = githubToken;
        document.getElementById('github-status').innerHTML = '<span>✓</span><span>Токен GitHub настроен</span>';
        document.getElementById('github-status').className = 'status-badge status-success';
    } else {
        document.getElementById('github-status').innerHTML = '<span>⚠</span><span>Токен GitHub не настроен</span>';
        document.getElementById('github-status').className = 'status-badge status-error';
    }
}
/**
 * Сохраняет настройки расписания
 */
function saveScheduleSettings() {
    const selectedDays = Array.from(document.querySelectorAll('.day-checkbox:checked'))
        .map(cb => parseInt(cb.value));
    
    if (saveSchedule(selectedDays)) {
        showNotification('Расписание сохранено', 'success');
        updateScheduleDisplay();
    } else {
        showNotification('Ошибка сохранения расписания', 'error');
    }
}

/**
 * Создает резервную копию в GitHub (заглушка)
 */
function createGithubBackup() {
    // TODO: Реализовать логику создания бэкапа в GitHub
    showNotification('Функция создания бэкапа в GitHub в разработке', 'info');
}

/**
 * Восстанавливает из резервной копии в GitHub (заглушка)
 */
function restoreFromGithubBackup() {
    // TODO: Реализовать логику восстановления из GitHub
    showNotification('Функция восстановления из GitHub в разработке', 'info');
}

/**
 * Сохраняет настройки GitHub (заглушка)
 */
/**
 * Сохраняет настройки GitHub с проверкой валидности токена
 */
async function saveGithubSettings() {
    const tokenInput = document.getElementById('github-token');
    const token = tokenInput.value.trim();
    const statusElement = document.getElementById('github-status');
    const saveButton = document.getElementById('save-github-btn');
    
    // Сохраняем оригинальный текст кнопки
    const originalButtonText = saveButton.textContent;
    
    if (token) {
        // Показываем индикатор загрузки
        saveButton.textContent = 'Проверка...';
        saveButton.disabled = true;
        
        try {
            // Проверяем валидность токена через GitHub API
            const isValid = await validateGitHubToken(token);
            
            if (isValid) {
                // Сохраняем токен
                localStorage.setItem('github_token', token);
                
                // Обновляем статус
                statusElement.innerHTML = '<span>✓</span><span>Токен GitHub настроен и проверен</span>';
                statusElement.className = 'status-badge status-success';
                
                showNotification('Токен GitHub успешно сохранен и проверен', 'success');
                
                // TODO: Здесь можно добавить автоматическую синхронизацию при успешной настройке
                // await createGithubBackup(); // Автоматически создаем первый бэкап
                
            } else {
                // Токен невалидный
                statusElement.innerHTML = '<span>❌</span><span>Неверный токен GitHub</span>';
                statusElement.className = 'status-badge status-error';
                
                showNotification('Ошибка: Неверный токен GitHub', 'error');
                
                // Очищаем поле ввода
                tokenInput.value = '';
                localStorage.removeItem('github_token');
            }
            
        } catch (error) {
            console.error('Ошибка проверки токена GitHub:', error);
            
            statusElement.innerHTML = '<span>⚠</span><span>Ошибка проверки токена</span>';
            statusElement.className = 'status-badge status-error';
            
            showNotification('Ошибка сети при проверке токена', 'error');
        } finally {
            // Восстанавливаем кнопку
            saveButton.textContent = originalButtonText;
            saveButton.disabled = false;
        }
        
    } else {
        // Удаляем токен если поле пустое
        localStorage.removeItem('github_token');
        
        statusElement.innerHTML = '<span>⚠</span><span>Токен GitHub не настроен</span>';
        statusElement.className = 'status-badge status-error';
        
        showNotification('Токен GitHub удален', 'info');
    }
}

/**
 * Проверяет валидность токена GitHub через API
 * @param {string} token - GitHub Personal Access Token
 * @returns {Promise<boolean>} true если токен валиден
 */
async function validateGitHubToken(token) {
    try {
        const response = await fetch('https://api.github.com/user', {
            method: 'GET',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Attendance-App' // GitHub требует User-Agent
            }
        });
        
        if (response.status === 200) {
            const userData = await response.json();
            console.log('GitHub токен валиден для пользователя:', userData.login);
            return true;
        } else if (response.status === 401) {
            console.log('GitHub токен невалиден');
            return false;
        } else {
            console.log('Неожиданный статус ответа GitHub:', response.status);
            return false;
        }
        
    } catch (error) {
        console.error('Ошибка при проверке токена GitHub:', error);
        throw error; // Пробрасываем ошибку для обработки в вызывающей функции
    }
}

/**
 * Проверяет наличие и валидность сохраненного токена GitHub при загрузке приложения
 */
async function checkExistingGitHubToken() {
    const token = localStorage.getItem('github_token');
    const statusElement = document.getElementById('github-status');
    
    if (token && statusElement) {
        try {
            const isValid = await validateGitHubToken(token);
            
            if (isValid) {
                statusElement.innerHTML = '<span>✓</span><span>Токен GitHub настроен и проверен</span>';
                statusElement.className = 'status-badge status-success';
            } else {
                // Токен устарел или стал невалидным
                statusElement.innerHTML = '<span>⚠</span><span>Токен GitHub устарел</span>';
                statusElement.className = 'status-badge status-error';
                localStorage.removeItem('github_token');
            }
        } catch (error) {
            // В случае ошибки сети оставляем статус "настроен", но отмечаем что нужна проверка
            statusElement.innerHTML = '<span>⚠</span><span>Токен GitHub (требуется проверка)</span>';
            statusElement.className = 'status-badge status-error';
        }
    }
}

/**
 * Создает резервную копию данных приложения в виде GitHub Gist
 * 
 * Функция выполняет следующие шаги:
 * 1. Проверяет наличие и валидность GitHub токена
 * 2. Загружает текущие данные приложения
 * 3. Создает приватный Gist с данными
 * 4. Сохраняет ID созданного Gist для последующего обновления
 * 5. Обрабатывает различные ошибки (сеть, авторизация, квоты)
 * 
 * @returns {Promise<boolean>} true если бэкап создан успешно, false в случае ошибки
 * @throws {Error} В случае критических ошибок
 */
async function createGithubBackup() {
    const backupButton = document.getElementById('create-github-backup-btn');
    const originalButtonText = backupButton.textContent;
    
    try {
        // Проверяем наличие токена
        const token = localStorage.getItem('github_token');
        if (!token) {
            showNotification('Ошибка: GitHub токен не настроен', 'error');
            return false;
        }

        // Показываем индикатор загрузки
        backupButton.textContent = 'Создание бэкапа...';
        backupButton.disabled = true;

        // Проверяем валидность токена (быстрая проверка)
        const isValid = await validateGitHubToken(token);
        if (!isValid) {
            showNotification('Ошибка: Неверный GitHub токен', 'error');
            return false;
        }

        // Загружаем данные приложения
        const appData = loadData();
        if (!appData || Object.keys(appData).length === 0) {
            showNotification('Ошибка: Нет данных для бэкапа', 'error');
            return false;
        }

        // Подготавливаем данные для Gist
        const backupData = {
            description: `Резервная копия посещаемости от ${new Date().toLocaleString('ru-RU')}`,
            public: false,
            files: {
                'attendance-backup.json': {
                    content: JSON.stringify({
                        version: '1.0',
                        timestamp: new Date().toISOString(),
                        app: 'Attendance Tracker',
                        data: appData
                    }, null, 2)
                }
            }
        };

        // Получаем существующий Gist ID (если есть)
        const existingGistId = localStorage.getItem('github_gist_id');
        
        let response;
        if (existingGistId) {
            // Обновляем существующий Gist
            response = await updateExistingGist(token, existingGistId, backupData);
            showNotification('Резервная копия обновлена в GitHub', 'success');
        } else {
            // Создаем новый Gist
            response = await createNewGist(token, backupData);
            
            // Сохраняем ID созданного Gist для будущих обновлений
            if (response && response.id) {
                localStorage.setItem('github_gist_id', response.id);
                showNotification('Резервная копия создана в GitHub', 'success');
            }
        }

        // Логируем информацию о созданном Gist
        if (response) {
            console.log('GitHub Gist создан/обновлен:', {
                id: response.id,
                url: response.html_url,
                files: Object.keys(response.files)
            });
            
            // Показываем ссылку на Gist (опционально)
            showNotification(`Бэкап создан: ${response.html_url}`, 'success');
        }

        return true;

    } catch (error) {
        console.error('Ошибка создания GitHub бэкапа:', error);
        
        // Обрабатываем различные типы ошибок
        if (error.message.includes('401') || error.message.includes('403')) {
            showNotification('Ошибка: Недостаточно прав GitHub токена', 'error');
        } else if (error.message.includes('422')) {
            showNotification('Ошибка: Некорректные данные для Gist', 'error');
        } else if (error.message.includes('network') || !navigator.onLine) {
            showNotification('Ошибка: Нет подключения к интернету', 'error');
        } else {
            showNotification(`Ошибка создания бэкапа: ${error.message}`, 'error');
        }
        
        return false;
    } finally {
        // Восстанавливаем кнопку в любом случае
        backupButton.textContent = originalButtonText;
        backupButton.disabled = false;
    }
}

/**
 * Создает новый Gist в GitHub
 * @param {string} token - GitHub Personal Access Token
 * @param {Object} gistData - Данные для Gist
 * @returns {Promise<Object>} Ответ от GitHub API
 */
async function createNewGist(token, gistData) {
    const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Attendance-App'
        },
        body: JSON.stringify(gistData)
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Обновляет существующий Gist в GitHub
 * @param {string} token - GitHub Personal Access Token
 * @param {string} gistId - ID существующего Gist
 * @param {Object} gistData - Новые данные для Gist
 * @returns {Promise<Object>} Ответ от GitHub API
 */
async function updateExistingGist(token, gistId, gistData) {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Attendance-App'
        },
        body: JSON.stringify(gistData)
    });

    if (!response.ok) {
        // Если Gist не найден, возможно он был удален - создаем новый
        if (response.status === 404) {
            localStorage.removeItem('github_gist_id');
            return await createNewGist(token, gistData);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Проверяет существование и доступность Gist
 * @param {string} token - GitHub Personal Access Token
 * @param {string} gistId - ID Gist для проверки
 * @returns {Promise<boolean>} true если Gist существует и доступен
 */
async function checkGistExists(token, gistId) {
    try {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'GET',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Attendance-App'
            }
        });

        return response.ok;
    } catch (error) {
        console.error('Ошибка проверки Gist:', error);
        return false;
    }
}

/**
 * Получает информацию о существующем Gist
 * @returns {Promise<Object|null>} Информация о Gist или null если ошибка
 */
async function getGistInfo() {
    const token = localStorage.getItem('github_token');
    const gistId = localStorage.getItem('github_gist_id');
    
    if (!token || !gistId) {
        return null;
    }

    try {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'GET',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Attendance-App'
            }
        });

        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Ошибка получения информации о Gist:', error);
        return null;
    }
}

/**
 * Обновляет статус кнопки бэкапа на основе существующего Gist
 */
async function updateBackupButtonStatus() {
    const backupButton = document.getElementById('create-github-backup-btn');
    const gistInfo = await getGistInfo();
    
    if (gistInfo) {
        const updatedAt = new Date(gistInfo.updated_at);
        backupButton.textContent = `Обновить бэкап (${updatedAt.toLocaleDateString('ru-RU')})`;
        backupButton.title = `Последнее обновление: ${updatedAt.toLocaleString('ru-RU')}`;
    } else {
        backupButton.textContent = 'Создать резервную копию';
        backupButton.title = 'Создать новую резервную копию в GitHub';
    }
}

/**
 * Восстанавливает данные приложения из резервной копии в GitHub Gist
 * 
 * Функция выполняет следующие шаги:
 * 1. Проверяет наличие и валидность GitHub токена
 * 2. Получает список доступных Gist или использует сохраненный Gist ID
 * 3. Показывает диалог выбора бэкапа (если несколько)
 * 4. Загружает выбранный Gist и извлекает данные
 * 5. Проверяет целостность и структуру данных
 * 6. Создает резервную копию текущих данных перед восстановлением
 * 7. Восстанавливает данные и обновляет интерфейс
 * 
 * @returns {Promise<boolean>} true если восстановление прошло успешно, false в случае ошибки
 */
async function restoreFromGithubBackup() {
    const restoreButton = document.getElementById('restore-github-backup-btn');
    const originalButtonText = restoreButton.textContent;
    
    try {
        // Проверяем наличие токена
        const token = localStorage.getItem('github_token');
        if (!token) {
            showNotification('Ошибка: GitHub токен не настроен', 'error');
            return false;
        }

        // Показываем индикатор загрузки
        restoreButton.textContent = 'Поиск бэкапов...';
        restoreButton.disabled = true;

        // Получаем список доступных Gist
        const gists = await getBackupGists(token);
        if (!gists || gists.length === 0) {
            showNotification('Не найдено резервных копий в GitHub', 'warning');
            return false;
        }

        // Показываем диалог выбора бэкапа
        const selectedGist = await showGistSelectionDialog(gists);
        if (!selectedGist) {
            showNotification('Восстановление отменено', 'info');
            return false;
        }

        // Загружаем данные из выбранного Gist
        restoreButton.textContent = 'Загрузка данных...';
        const backupData = await loadGistData(token, selectedGist.id);
        
        if (!backupData) {
            showNotification('Ошибка: Не удалось загрузить данные из бэкапа', 'error');
            return false;
        }

        // Проверяем структуру данных
        if (!isValidBackupData(backupData)) {
            showNotification('Ошибка: Некорректная структура данных в бэкапе', 'error');
            return false;
        }

        // Создаем резервную копию текущих данных перед восстановлением
        if (!createBackup()) {
            showNotification('Предупреждение: Не удалось создать резервную копию текущих данных', 'warning');
        }

        // Запрашиваем подтверждение
        const confirmation = await showRestoreConfirmationDialog(backupData, selectedGist);
        if (!confirmation) {
            showNotification('Восстановление отменено', 'info');
            return false;
        }

        // Восстанавливаем данные
        restoreButton.textContent = 'Восстановление...';
        const success = await performDataRestore(backupData);
        
        if (success) {
            showNotification('Данные успешно восстановлены из GitHub', 'success');
            
            // Обновляем интерфейс
            if (onDataImportedCallback) {
                onDataImportedCallback();
            }
            
            return true;
        } else {
            showNotification('Ошибка при восстановлении данных', 'error');
            return false;
        }

    } catch (error) {
        console.error('Ошибка восстановления из GitHub бэкапа:', error);
        
        // Обрабатываем различные типы ошибок
        if (error.message.includes('401') || error.message.includes('403')) {
            showNotification('Ошибка: Недостаточно прав GitHub токена', 'error');
        } else if (error.message.includes('404')) {
            showNotification('Ошибка: Резервная копия не найдена', 'error');
        } else if (error.message.includes('network') || !navigator.onLine) {
            showNotification('Ошибка: Нет подключения к интернету', 'error');
        } else {
            showNotification(`Ошибка восстановления: ${error.message}`, 'error');
        }
        
        return false;
    } finally {
        // Восстанавливаем кнопку в любом случае
        restoreButton.textContent = originalButtonText;
        restoreButton.disabled = false;
    }
}

/**
 * Получает список Gist с резервными копиями
 * @param {string} token - GitHub Personal Access Token
 * @returns {Promise<Array>} Массив Gist с резервными копиями
 */
async function getBackupGists(token) {
    try {
        // Получаем список всех Gist пользователя
        const response = await fetch('https://api.github.com/gists', {
            method: 'GET',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Attendance-App'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const allGists = await response.json();
        
        // Фильтруем только Gist с резервными копиями нашего приложения
        const backupGists = allGists.filter(gist => {
            // Проверяем наличие файла с бэкапом
            const hasBackupFile = gist.files && gist.files['attendance-backup.json'];
            
            // Проверяем описание (опционально)
            const isBackup = gist.description && 
                (gist.description.includes('Резервная копия посещаемости') || 
                 gist.description.includes('Attendance Tracker'));
            
            return hasBackupFile && isBackup;
        });

        // Сортируем по дате обновления (новые сначала)
        return backupGists.sort((a, b) => 
            new Date(b.updated_at) - new Date(a.updated_at)
        );

    } catch (error) {
        console.error('Ошибка получения списка Gist:', error);
        throw error;
    }
}

/**
 * Показывает диалог выбора Gist для восстановления
 * @param {Array} gists - Массив доступных Gist
 * @returns {Promise<Object|null>} Выбранный Gist или null если отменено
 */
async function showGistSelectionDialog(gists) {
    return new Promise((resolve) => {
        // Создаем модальное окно выбора
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.display = 'block';
        
        const gistItems = gists.map(gist => `
            <div class="gist-item" data-gist-id="${gist.id}">
                <div class="gist-info">
                    <div class="gist-description">${gist.description || 'Без описания'}</div>
                    <div class="gist-meta">
                        Обновлен: ${new Date(gist.updated_at).toLocaleString('ru-RU')}
                    </div>
                </div>
                <button class="btn btn-primary btn-sm select-gist-btn">Выбрать</button>
            </div>
        `).join('');

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2 class="modal-title">📥 Выбор резервной копии</h2>
                    <button class="modal-close" id="close-gist-selector">✕</button>
                </div>
                <div class="modal-body">
                    <p class="form-text">Выберите резервную копию для восстановления:</p>
                    <div class="gist-list" style="max-height: 400px; overflow-y: auto;">
                        ${gistItems}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-gist-selector">Отмена</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Обработчики для выбора Gist
        modal.querySelectorAll('.select-gist-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const gistItem = this.closest('.gist-item');
                const gistId = gistItem.getAttribute('data-gist-id');
                const selectedGist = gists.find(g => g.id === gistId);
                modal.remove();
                resolve(selectedGist);
            });
        });

        // Обработчики закрытия
        modal.querySelector('#close-gist-selector').addEventListener('click', () => {
            modal.remove();
            resolve(null);
        });

        modal.querySelector('#cancel-gist-selector').addEventListener('click', () => {
            modal.remove();
            resolve(null);
        });

        // Закрытие по клику вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(null);
            }
        });
    });
}

/**
 * Загружает данные из конкретного Gist
 * @param {string} token - GitHub Personal Access Token
 * @param {string} gistId - ID Gist
 * @returns {Promise<Object|null>} Данные из бэкапа или null при ошибке
 */
async function loadGistData(token, gistId) {
    try {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'GET',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Attendance-App'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const gist = await response.json();
        const backupFile = gist.files['attendance-backup.json'];
        
        if (!backupFile || !backupFile.content) {
            throw new Error('Файл с резервной копией не найден в Gist');
        }

        return JSON.parse(backupFile.content);

    } catch (error) {
        console.error('Ошибка загрузки данных из Gist:', error);
        throw error;
    }
}

/**
 * Проверяет валидность данных из бэкапа
 * @param {Object} backupData - Данные из бэкапа
 * @returns {boolean} true если данные валидны
 */
function isValidBackupData(backupData) {
    // Проверяем базовую структуру
    if (!backupData || typeof backupData !== 'object') {
        return false;
    }

    // Проверяем наличие обязательных полей
    if (!backupData.version || !backupData.timestamp || !backupData.data) {
        return false;
    }

    // Проверяем структуру данных приложения
    return isValidDataStructure(backupData.data);
}

/**
 * Показывает диалог подтверждения восстановления
 * @param {Object} backupData - Данные из бэкапа
 * @param {Object} gist - Информация о Gist
 * @returns {Promise<boolean>} true если пользователь подтвердил
 */
async function showRestoreConfirmationDialog(backupData, gist) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.display = 'block';

        const backupDate = new Date(backupData.timestamp).toLocaleString('ru-RU');
        const gistDate = new Date(gist.updated_at).toLocaleString('ru-RU');

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 class="modal-title">⚠️ Подтверждение восстановления</h2>
                    <button class="modal-close" id="close-restore-confirm">✕</button>
                </div>
                <div class="modal-body">
                    <p>Вы уверены, что хотите восстановить данные из резервной копии?</p>
                    
                    <div class="backup-info" style="background: var(--bg-primary); padding: 1rem; border-radius: var(--radius-md); margin: 1rem 0;">
                        <p><strong>Дата создания:</strong> ${backupDate}</p>
                        <p><strong>Дата обновления в GitHub:</strong> ${gistDate}</p>
                        <p><strong>Версия:</strong> ${backupData.version}</p>
                        <p><strong>Описание:</strong> ${gist.description || 'Нет описания'}</p>
                    </div>
                    
                    <p class="form-text" style="color: var(--error-secondary);">
                        ⚠️ Внимание: Текущие данные будут полностью заменены.
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-restore">Отмена</button>
                    <button class="btn btn-primary" id="confirm-restore">Восстановить</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Обработчики
        modal.querySelector('#confirm-restore').addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });

        modal.querySelector('#cancel-restore').addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });

        modal.querySelector('#close-restore-confirm').addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        });
    });
}

/**
 * Выполняет восстановление данных
 * @param {Object} backupData - Данные из бэкапа
 * @returns {boolean} true если восстановление успешно
 */
function performDataRestore(backupData) {
    try {
        // Извлекаем данные приложения из бэкапа
        const appData = backupData.data;
        
        // Сохраняем данные
        if (saveData(appData)) {
            // Обновляем сохраненный Gist ID для будущих обновлений
            // (опционально, можно сохранить ID последнего восстановленного Gist)
            
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Ошибка при восстановлении данных:', error);
        return false;
    }
}

/**
 * Получает информацию о последнем бэкапе для отображения в интерфейсе
 */
async function updateRestoreButtonStatus() {
    const restoreButton = document.getElementById('restore-github-backup-btn');
    const token = localStorage.getItem('github_token');
    
    if (!token) {
        restoreButton.textContent = 'Восстановить из резервной копии';
        restoreButton.title = 'Требуется настройка GitHub токена';
        return;
    }

    try {
        const gists = await getBackupGists(token);
        if (gists && gists.length > 0) {
            const latestGist = gists[0];
            const updatedAt = new Date(latestGist.updated_at);
            restoreButton.textContent = `Восстановить (${gists.length} доступно)`;
            restoreButton.title = `Последний бэкап: ${updatedAt.toLocaleString('ru-RU')}`;
        } else {
            restoreButton.textContent = 'Восстановить из резервной копии';
            restoreButton.title = 'Резервные копии не найдены';
        }
    } catch (error) {
        console.error('Ошибка обновления статуса кнопки восстановления:', error);
        restoreButton.textContent = 'Восстановить из резервной копии';
        restoreButton.title = 'Ошибка проверки бэкапов';
    }
}

/**
 * Проверяет наличие и валидность сохраненного токена GitHub при загрузке приложения
 */
async function checkExistingGitHubToken() {
    const token = localStorage.getItem('github_token');
    const statusElement = document.getElementById('github-status');
    const tokenInput = document.getElementById('github-token');
    
    if (token && statusElement) {
        // Заполняем поле ввода
        if (tokenInput) {
            tokenInput.value = token;
        }
        
        try {
            const isValid = await validateGitHubToken(token);
            
            if (isValid) {
                statusElement.innerHTML = '<span>✓</span><span>Токен GitHub настроен и проверен</span>';
                statusElement.className = 'status-badge status-success';
                
                // Обновляем статус кнопок бэкапа и восстановления
                await updateBackupButtonStatus();
                await updateRestoreButtonStatus();
            } else {
                // Токен устарел или стал невалидным
                statusElement.innerHTML = '<span>⚠</span><span>Токен GitHub устарел</span>';
                statusElement.className = 'status-badge status-error';
                localStorage.removeItem('github_token');
                localStorage.removeItem('github_gist_id');
                if (tokenInput) {
                    tokenInput.value = '';
                }
            }
        } catch (error) {
            if (error.message === 'NETWORK_ERROR') {
                // В случае ошибки сети оставляем токен, но отмечаем что нужна проверка
                statusElement.innerHTML = '<span>⚠</span><span>Токен GitHub (требуется проверка)</span>';
                statusElement.className = 'status-badge status-error';
            } else {
                // Другие ошибки
                statusElement.innerHTML = '<span>❌</span><span>Ошибка проверки токена</span>';
                statusElement.className = 'status-badge status-error';
                localStorage.removeItem('github_token');
                localStorage.removeItem('github_gist_id');
                if (tokenInput) {
                    tokenInput.value = '';
                }
            }
        }
    } else if (statusElement) {
        // Токена нет
        statusElement.innerHTML = '<span>⚠</span><span>Токен GitHub не настроен</span>';
        statusElement.className = 'status-badge status-error';
    }
}
/**
 * ФУНКЦИИ ДЛЯ РАБОТЫ СО СТАТИСТИКОЙ СТУДЕНТА
 */

/**
 * Открывает модальное окно статистики студента
 * @param {number} studentId - ID студента
 */
function openStudentStats(studentId) {
    currentStudentId = studentId;
    const student = getStudentById(studentId);
    
    if (!student) {
        showNotification('Студент не найден', 'error');
        return;
    }
    
    // Получаем доступные месяцы
    availableMonths = getAvailableMonthsForStudent(studentId);
    
    if (availableMonths.length === 0) {
        showNotification('Нет данных о посещаемости для этого студента', 'info');
        return;
    }
    
    // Устанавливаем текущий месяц
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    currentStatsMonth = availableMonths.includes(currentMonth) ? currentMonth : availableMonths[0];
    
    // Обновляем UI
    updateMonthSelector();
    document.getElementById('student-stats-name').textContent = student.name;
    updateStudentStatsDisplay();
    
    // Показываем модальное окно
    document.getElementById('student-stats-modal').style.display = 'block';
}

/**
 * Обновляет селектор месяцев в модальном окне статистики
 */
function updateMonthSelector() {
    const monthSelector = document.getElementById('stats-month-selector');
    monthSelector.innerHTML = '';
    
    availableMonths.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = formatMonthForDisplay(month);
        if (month === currentStatsMonth) {
            option.selected = true;
        }
        monthSelector.appendChild(option);
    });
}

/**
 * Обновляет отображение статистики студента
 */
function updateStudentStatsDisplay() {
    if (!currentStudentId || !currentStatsMonth) return;
    
    const [year, month] = currentStatsMonth.split('-');
    const stats = getStudentStatsForMonth(currentStudentId, year, month);
    const content = document.getElementById('student-stats-content');
    
    if (stats.dailyRecords.length > 0) {
        content.innerHTML = `
            <div class="space-y-3 mt-4">
                <h4 class="font-medium text-gray-800">Записи посещаемости:</h4>
                <div class="space-y-2 max-h-60 overflow-y-auto">
                    ${stats.dailyRecords.map(record => `
                        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <span class="text-sm font-medium text-gray-700">${formatDate(record.date)}</span>
                            <span class="${record.present ? 'text-green-600' : 'text-red-600'} text-sm font-medium">
                                ${record.present ? '✅ Присутствовал' : '❌ Отсутствовал'}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        content.innerHTML = `
            <div class="text-center py-8 bg-gray-50 rounded-lg border border-gray-200 mt-4">
                <p class="text-gray-500 text-sm">Нет записей о посещаемости за этот месяц</p>
            </div>
        `;
    }
}

/**
 * Закрывает модальное окно статистики студента
 */
function closeStudentStats() {
    document.getElementById('student-stats-modal').style.display = 'none';
    currentStudentId = null;
    currentStatsMonth = null;
    availableMonths = [];
}

/**
 * ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ ГРУППАМИ И СТУДЕНТАМИ
 */

/**
 * Открывает модальное окно управления
 */
function openManageModal() {
    // Загружаем актуальные данные
    loadGroupsTab();
    loadStudentsTab();
    
    // Показываем модальное окно
    document.getElementById('manage-modal').style.display = 'block';
}

/**
 * Закрывает модальное окно управления
 */
function closeManageModal() {
    document.getElementById('manage-modal').style.display = 'none';
    // Очищаем поля ввода
    document.getElementById('new-group-name').value = '';
    document.getElementById('new-student-name').value = '';
}

/**
 * Загружает и отображает данные на вкладке групп
 */
function loadGroupsTab() {
    const groups = getGroups();
    const groupsList = document.getElementById('groups-list');
    
    groupsList.innerHTML = '';
    
    if (Object.keys(groups).length === 0) {
        groupsList.innerHTML = '<div class="text-center text-muted">Нет групп</div>';
        return;
    }
    
    Object.entries(groups).forEach(([groupName, studentIds]) => {
        const groupItem = document.createElement('div');
        groupItem.className = 'group-item';
        
        groupItem.innerHTML = `
            <div class="group-info">
                <span class="group-name">${groupName}</span>
                <span class="group-stats">${studentIds.length} студентов</span>
            </div>
            <div class="group-actions">
                <button class="btn btn-sm btn-warning delete-group-btn" data-group="${groupName}">
                    Удалить
                </button>
            </div>
        `;
        
        groupsList.appendChild(groupItem);
    });
    
    // Добавляем обработчики для кнопок удаления групп
    document.querySelectorAll('.delete-group-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const groupName = this.getAttribute('data-group');
            deleteGroup(groupName);
        });
    });
}

/**
 * Загружает и отображает данные на вкладке студентов
 */
function loadStudentsTab() {
    const allStudents = getAllStudents();
    const groups = getGroups();
    const groupNames = Object.keys(groups);
    
    // Обновляем селекторы групп
    updateGroupSelectors(groupNames);
    
    const studentsList = document.getElementById('students-list');
    studentsList.innerHTML = '';
    
    if (Object.keys(allStudents).length === 0) {
        studentsList.innerHTML = '<div class="text-center text-muted">Нет студентов</div>';
        return;
    }
    
    // Получаем всех студентов с информацией о группах
    const studentsWithGroups = [];
    for (const groupName in groups) {
        groups[groupName].forEach(studentId => {
            const student = allStudents[studentId];
            if (student) {
                studentsWithGroups.push({
                    ...student,
                    group: groupName
                });
            }
        });
    }
    
    // Сортируем студентов по имени
    studentsWithGroups.sort((a, b) => a.name.localeCompare(b.name));
    
    // Отображаем студентов
    studentsWithGroups.forEach(student => {
        const studentItem = document.createElement('div');
        studentItem.className = 'student-item';
        studentItem.setAttribute('data-student-id', student.id);
        
        studentItem.innerHTML = `
            <div class="student-info">
                <span class="student-name">${student.name}</span>
                <span class="student-group">Группа: ${student.group}</span>
            </div>
            <div class="student-actions">
                <select class="form-select move-group-select btn-sm" data-student-id="${student.id}">
                    <option value="">Переместить в...</option>
                    ${groupNames.filter(g => g !== student.group).map(group => 
                        `<option value="${group}">${group}</option>`
                    ).join('')}
                </select>
                <button class="btn btn-sm btn-warning edit-student-btn" data-student-id="${student.id}">
                    ✏️
                </button>
                <button class="btn btn-sm btn-danger delete-student-btn" data-student-id="${student.id}">
                    🗑️
                </button>
            </div>
        `;
        
        studentsList.appendChild(studentItem);
    });
    
    // Добавляем обработчики событий
    setupStudentEventHandlers();
}

/**
 * Обновляет селекторы групп в интерфейсе
 */
function updateGroupSelectors(groupNames) {
    const newStudentGroup = document.getElementById('new-student-group');
    const studentGroupFilter = document.getElementById('student-group-filter');
    
    // Очищаем и заполняем селектор для добавления студента
    newStudentGroup.innerHTML = '';
    groupNames.forEach(groupName => {
        const option = document.createElement('option');
        option.value = groupName;
        option.textContent = groupName;
        newStudentGroup.appendChild(option);
    });
    
    // Очищаем и заполняем селектор фильтра
    studentGroupFilter.innerHTML = '<option value="">Все группы</option>';
    groupNames.forEach(groupName => {
        const option = document.createElement('option');
        option.value = groupName;
        option.textContent = groupName;
        studentGroupFilter.appendChild(option);
    });
}

/**
 * Настраивает обработчики событий для студентов
 */
function setupStudentEventHandlers() {
    // Обработчик перемещения студентов
    document.querySelectorAll('.move-group-select').forEach(select => {
        select.addEventListener('change', function() {
            const studentId = parseInt(this.getAttribute('data-student-id'));
            const targetGroup = this.value;
            
            if (targetGroup && confirm('Переместить студента в выбранную группу?')) {
                if (moveStudent(studentId, targetGroup)) {
                    loadStudentsTab(); // Перезагружаем список
                    updateGroupSelector(); // Обновляем основной селектор групп
                    updateAttendanceList(); // Обновляем список посещаемости
                }
            }
            
            // Сбрасываем значение селектора
            this.value = '';
        });
    });
    
    // Обработчик редактирования студентов
    document.querySelectorAll('.edit-student-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const studentId = parseInt(this.getAttribute('data-student-id'));
            editStudent(studentId);
        });
    });
    
    // Обработчик удаления студентов
    document.querySelectorAll('.delete-student-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const studentId = parseInt(this.getAttribute('data-student-id'));
            deleteStudent(studentId);
        });
    });
    
    // Обработчик поиска студентов
    document.getElementById('student-search').addEventListener('input', filterStudents);
    
    // Обработчик фильтра по группам
    document.getElementById('student-group-filter').addEventListener('change', filterStudents);
}

/**
 * Фильтрует список студентов по имени и группе
 */
function filterStudents() {
    const searchTerm = document.getElementById('student-search').value.toLowerCase();
    const selectedGroup = document.getElementById('student-group-filter').value;
    const studentItems = document.querySelectorAll('.student-item');
    
    studentItems.forEach(item => {
        const studentName = item.querySelector('.student-name').textContent.toLowerCase();
        const studentGroup = item.querySelector('.student-group').textContent.replace('Группа: ', '');
        
        const matchesSearch = studentName.includes(searchTerm);
        const matchesGroup = !selectedGroup || studentGroup === selectedGroup;
        
        if (matchesSearch && matchesGroup) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

/**
 * Добавляет новую группу
 */
function addNewGroup() {
    const groupNameInput = document.getElementById('new-group-name');
    const groupName = groupNameInput.value.trim();
    
    if (!groupName) {
        showNotification('Введите название группы', 'error');
        return;
    }
    
    if (addGroup(groupName)) {
        groupNameInput.value = ''; // Очищаем поле ввода
        loadGroupsTab(); // Обновляем список групп
        loadStudentsTab(); // Обновляем вкладку студентов (для селекторов)
        updateGroupSelector(); // Обновляем основной селектор групп
    }
}

/**
 * Удаляет группу
 */
function deleteGroup(groupName) {
    if (!confirm(`Вы уверены, что хотите удалить группу "${groupName}"?`)) {
        return;
    }
    
    if (removeGroup(groupName)) {
        loadGroupsTab(); // Обновляем список групп
        loadStudentsTab(); // Обновляем вкладку студентов
        updateGroupSelector(); // Обновляем основной селектор групп
        updateAttendanceList(); // Обновляем список посещаемости
    }
}

/**
 * Добавляет нового студента
 */
function addNewStudent() {
    const studentNameInput = document.getElementById('new-student-name');
    const groupSelect = document.getElementById('new-student-group');
    
    const studentName = studentNameInput.value.trim();
    const groupName = groupSelect.value;
    
    if (!studentName) {
        showNotification('Введите ФИО студента', 'error');
        return;
    }
    
    if (!groupName) {
        showNotification('Выберите группу для студента', 'error');
        return;
    }
    
    if (addStudent(groupName, studentName)) {
        studentNameInput.value = ''; // Очищаем поле ввода
        loadStudentsTab(); // Обновляем список студентов
        updateAttendanceList(); // Обновляем список посещаемости
    }
}

/**
 * Редактирует студента
 */
function editStudent(studentId) {
    const student = getStudentById(studentId);
    if (!student) return;
    
    const newName = prompt('Введите новое ФИО студента:', student.name);
    
    if (newName && newName.trim() !== '' && newName !== student.name) {
        if (updateStudent(studentId, newName.trim())) {
            loadStudentsTab(); // Обновляем список студентов
            updateAttendanceList(); // Обновляем список посещаемости
        }
    }
}

/**
 * Удаляет студента
 */
function deleteStudent(studentId) {
    const student = getStudentById(studentId);
    if (!student) return;
    
    if (!confirm(`Вы уверены, что хотите удалить студента "${student.name}"?`)) {
        return;
    }
    
    if (removeStudent(studentId)) {
        loadStudentsTab(); // Обновляем список студентов
        updateGroupSelector(); // Обновляем основной селектор групп
        updateAttendanceList(); // Обновляем список посещаемости
    }
}

/**
 * Переключает вкладки в модальном окне
 */
function setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Убираем активный класс у всех кнопок и контента
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Добавляем активный класс текущей кнопке и целевому контенту
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

/**
 * ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
 */

/**
 * Форматирует дату для отображения
 * @param {string} dateString - Дата в формате YYYY-MM-DD
 * @returns {string} Отформатированная дата
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Форматирует месяц для отображения
 * @param {string} monthString - Месяц в формате YYYY-MM
 * @returns {string} Отформатированное название месяца
 */
function formatMonthForDisplay(monthString) {
    const [year, month] = monthString.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric'
    });
}

/**
 * Обновляет список групп в селекторе
 */
function updateGroupSelector() {
    const groupNames = getGroupNames();
    const groupSelector = document.getElementById('group-selector');
    
    const currentValue = groupSelector.value;
    groupSelector.innerHTML = '';
    
    groupNames.forEach(groupName => {
        const option = document.createElement('option');
        option.value = groupName;
        option.textContent = groupName;
        groupSelector.appendChild(option);
    });
    
    if (groupNames.includes(currentValue)) {
        groupSelector.value = currentValue;
    } else if (groupNames.length > 0) {
        groupSelector.value = groupNames[0];
    }
    
    console.log('Group selector updated with groups:', groupNames);
}


/**
 * ФУНКЦИИ ДЛЯ РАБОТЫ С PWA И ОФФЛАЙН-РЕЖИМОМ
 */

/**
 * Обработчики онлайн/оффлайн статуса
 */
function handleOnlineStatus() {
    document.getElementById('offline-indicator').classList.add('hidden');
}

function handleOfflineStatus() {
    document.getElementById('offline-indicator').classList.remove('hidden');
}

/**
 * Инициализирует PWA функциональность
 */
function initializePWA() {
    let deferredPrompt;
    const installButton = document.getElementById('installButton');

    if (!installButton) {
        console.log('Кнопка установки не найдена в DOM');
        return;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('✅ beforeinstallprompt event fired');
        e.preventDefault();
        deferredPrompt = e;
        installButton.classList.remove('hidden');
    });

    installButton.addEventListener('click', async () => {
        console.log('🔄 Install button clicked');
        
        if (deferredPrompt) {
            console.log('🚀 Showing install prompt');
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response: ${outcome}`);
            deferredPrompt = null;
            installButton.classList.add('hidden');
        } else {
            console.log('❌ No deferred prompt available');
            showNotification('Для установки используйте иконку в адресной строке браузера', 'info');
        }
    });

    window.addEventListener('appinstalled', () => {
        console.log('🎉 PWA was installed');
        if (installButton) {
            installButton.classList.add('hidden');
        }
    });
}

/**
 * ФУНКЦИИ ДЛЯ РЕЗЕРВНОГО КОПИРОВАНИЯ И ЦЕЛОСТНОСТИ ДАННЫХ
 */

/**
 * Настраивает предупреждение о несохраненных изменениях
 */
function setupBeforeUnload() {
    let hasUnsavedChanges = false;
    
    const originalSaveAttendance = window.saveAttendance;
    
    window.saveAttendance = function(date, studentId, present) {
        hasUnsavedChanges = true;
        const result = originalSaveAttendance(date, studentId, present);
        
        // Сбрасываем флаг после успешного сохранения
        if (result) {
            setTimeout(() => {
                hasUnsavedChanges = false;
            }, 100);
        }
        
        return result;
    };
    
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите уйти?';
            return e.returnValue;
        }
    });
}

/**
 * Настраивает автоматическое резервное копирование
 */
function setupAutoBackup() {
    let changeCount = 0;
    const originalSaveData = window.saveData;
    
    // Создавать резервную копию каждые 24 часа
    setInterval(() => {
        if (navigator.onLine) {
            createBackup();
            console.log('Автоматическая резервная копия создана');
        }
    }, 24 * 60 * 60 * 1000);
    
    // Отслеживаем изменения для инкрементного бэкапа
    window.saveData = function(data) {
        changeCount++;
        
        // Создавать резервную копию после 10 изменений
        if (changeCount >= 10) {
            if (createBackup()) {
                console.log('Резервная копия создана после 10 изменений');
                changeCount = 0;
            }
        }
        
        return originalSaveData(data);
    };
    
    // Резервная копия при закрытии вкладки
    window.addEventListener('beforeunload', () => {
        if (changeCount > 0) {
            createBackup();
        }
    });
    
    // Резервная копия при переходе в онлайн
    window.addEventListener('online', () => {
        if (changeCount > 0) {
            createBackup();
            changeCount = 0;
        }
    });
}

/**
 * ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
 */

/**
 * Основная функция инициализации приложения
 */
function initializeApp() {
    try {
        // Скрываем индикатор загрузки
        const loadingOverlay = document.getElementById('app-loading');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }

        // Устанавливаем сегодняшнюю дату по умолчанию
        const dateSelector = document.getElementById('date-selector');
        const today = new Date().toISOString().split('T')[0];
        dateSelector.value = today;
        
        // Инициализируем основные компоненты
        updateDateDisplay();
        initializeSchedule();
        
        // Настраиваем системы безопасности и бэкапа
        checkPendingOperations();
        checkStorageQuota();
        setupAutoBackup();
        setupBeforeUnload();
        
        // Устанавливаем колбэк для обновления UI после импорта данных
        setOnDataImported(() => {
            updateGroupSelector();
            updateAttendanceList();
        });
        
        // Инициализируем UI компоненты
        updateGroupSelector();
        
        // Настраиваем синхронизацию между вкладками
        if (typeof setupCrossTabSync === 'function') {
            setupCrossTabSync();
        }

        // НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
        
        // Основные элементы управления
        dateSelector.addEventListener('change', function() {
            updateDateDisplay();
            updateScheduleDisplay();
            updateAttendanceList();
        });
        
        document.getElementById('group-selector').addEventListener('change', updateAttendanceList);
        
        // Модальное окно статистики
        document.getElementById('close-stats-modal').addEventListener('click', closeStudentStats);
        document.getElementById('close-stats-btn').addEventListener('click', closeStudentStats);
        document.getElementById('student-stats-modal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeStudentStats();
            }
        });
        

        // Модальное окно настроек
        document.getElementById('export-data-btn').addEventListener('click', exportData); 
        document.getElementById('schedule-settings-btn').addEventListener('click', openSettingsModal);
        document.getElementById('close-settings-modal').addEventListener('click', closeSettingsModal);
        document.getElementById('close-settings-btn').addEventListener('click', closeSettingsModal);
        document.getElementById('settings-modal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeSettingsModal();
            }
        });

        // Кнопки в модальном окне настроек
        document.getElementById('save-schedule-btn').addEventListener('click', saveScheduleSettings);
        document.getElementById('import-file-settings').addEventListener('change', importData); // ← ИЗМЕНИТЬ ID
        document.getElementById('save-schedule-btn').addEventListener('click', saveScheduleSettings);
        document.getElementById('create-github-backup-btn').addEventListener('click', createGithubBackup);
document.getElementById('restore-github-backup-btn').addEventListener('click', restoreFromGithubBackup);        document.getElementById('save-github-btn').addEventListener('click', saveGithubSettings);
       
        // Навигация по месяцам в статистике
        document.getElementById('stats-month-selector').addEventListener('change', function() {
            currentStatsMonth = this.value;
            updateStudentStatsDisplay();
        });

        // Кнопка открытия модального окна управления
        document.getElementById('manage-groups-btn').addEventListener('click', openManageModal);
        
        // Кнопки закрытия модального окна управления
        document.getElementById('close-manage-modal').addEventListener('click', closeManageModal);
        document.getElementById('close-manage-modal-btn').addEventListener('click', closeManageModal);
        
        // Закрытие по клику вне модального окна
        document.getElementById('manage-modal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeManageModal();
            }
        });
        
        // Обработчики для вкладок
        setupTabSwitching();
        
        // Кнопки добавления
        document.getElementById('add-group-btn').addEventListener('click', addNewGroup);
        document.getElementById('add-student-btn').addEventListener('click', addNewStudent);
        
        // Обработка Enter в полях ввода
        document.getElementById('new-group-name').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addNewGroup();
            }
        });
        
        document.getElementById('new-student-name').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addNewStudent();
            }
        });
       
        // Глобальные обработчики
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeStudentStats();
            }
        });
        
        // Мониторинг онлайн-статуса
        window.addEventListener('online', handleOnlineStatus);
        window.addEventListener('offline', handleOfflineStatus);
        
        // Проверяем начальный статус подключения
        if (!navigator.onLine) {
            handleOfflineStatus();
        }
        
        // Инициализируем PWA
        initializePWA();
        
        // Регистрация Service Worker для оффлайн-работы
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                    showNotification('Оффлайн-режим недоступен', 'error');
                });
        }
        
        // Проверяем целостность данных при загрузке
        if (!checkDataIntegrity()) {
            console.warn('Обнаружены проблемы с целостностью данных');
        }
        
        // Загружаем начальные данные
        updateAttendanceList();
        
        console.log('Приложение инициализировано');
        
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        showNotification('Ошибка загрузки приложения', 'error');
    }
}

// Инициализируем приложение когда DOM загружен
document.addEventListener('DOMContentLoaded', initializeApp);