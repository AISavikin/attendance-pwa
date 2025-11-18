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
    
    const groups = getGroups();
    const students = groups[group] || [];
    const attendance = getAttendanceForDate(date);
    
    const container = document.getElementById('students-container');
    container.innerHTML = '';
    
    // Показываем сообщение если в группе нет студентов
    if (students.length === 0) {
        container.innerHTML = '<div class="text-center text-muted">Нет студентов в группе</div>';
        return;
    }
    
    // Создаем карточки для каждого студента
    students.forEach(student => {
        const present = attendance[student.id] !== undefined ? attendance[student.id] : null;
        const studentCard = createStudentCard(student, present);
        container.appendChild(studentCard);
        
        // Добавляем обработчики событий для карточки
        setupStudentCardEventHandlers(studentCard, student.id);
    });
}

/**
 * Создает DOM-элемент карточки студента
 * @param {Object} student - Объект студента
 * @param {boolean|null} present - Статус присутствия
 * @returns {HTMLElement} Элемент карточки студента
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
 * @param {HTMLElement} studentCard - Элемент карточки студента
 * @param {number} studentId - ID студента
 */
function setupStudentCardEventHandlers(studentCard, studentId) {
    // Обработчик клика по карточке (отметка посещаемости)
    studentCard.addEventListener('click', (e) => {
        if (!e.target.closest('.student-status-btn')) {
            toggleAttendance(studentId, studentCard);
        }
    });
    
    // Обработчик для кнопки статистики
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
 * Открывает модальное окно настроек расписания
 */
function openScheduleSettings() {
    const schedule = getSchedule();
    const checkboxes = document.querySelectorAll('.day-checkbox');
    
    // Устанавливаем текущие значения
    checkboxes.forEach(checkbox => {
        checkbox.checked = schedule.includes(parseInt(checkbox.value));
    });
    
    document.getElementById('schedule-modal').style.display = 'block';
}

/**
 * Сохраняет настройки расписания
 */
function saveScheduleSettings() {
    const checkboxes = document.querySelectorAll('.day-checkbox:checked');
    const selectedDays = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    if (selectedDays.length === 0) {
        showNotification('Выберите хотя бы один учебный день', 'error');
        return;
    }
    
    if (saveSchedule(selectedDays)) {
        showNotification('Расписание сохранено', 'success');
        closeScheduleModal();
        updateScheduleDisplay();
    } else {
        showNotification('Ошибка сохранения расписания', 'error');
    }
}

/**
 * Закрывает модальное окно расписания
 */
function closeScheduleModal() {
    document.getElementById('schedule-modal').style.display = 'none';
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
    
    // Сохраняем текущее выбранное значение
    const currentValue = groupSelector.value;
    
    // Очищаем и заполняем селектор
    groupSelector.innerHTML = '';
    groupNames.forEach(groupName => {
        const option = document.createElement('option');
        option.value = groupName;
        option.textContent = groupName;
        groupSelector.appendChild(option);
    });
    
    // Восстанавливаем выбранное значение
    if (groupNames.includes(currentValue)) {
        groupSelector.value = currentValue;
    } else if (groupNames.length > 0) {
        groupSelector.value = groupNames[0];
    }
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
        document.getElementById('export-btn').addEventListener('click', exportData);
        document.getElementById('import-file').addEventListener('change', importData);
        
        // Модальное окно статистики
        document.getElementById('close-stats-modal').addEventListener('click', closeStudentStats);
        document.getElementById('close-stats-btn').addEventListener('click', closeStudentStats);
        document.getElementById('student-stats-modal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeStudentStats();
            }
        });
        
        // Модальное окно расписания
        document.getElementById('schedule-settings-btn').addEventListener('click', openScheduleSettings);
        document.getElementById('close-schedule-modal').addEventListener('click', closeScheduleModal);
        document.getElementById('save-schedule-btn').addEventListener('click', saveScheduleSettings);

        // Навигация по месяцам в статистике
        document.getElementById('stats-month-selector').addEventListener('change', function() {
            currentStatsMonth = this.value;
            updateStudentStatsDisplay();
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