// app.js - Синхронная версия с улучшенным полем даты

// Глобальные переменные для управления состоянием модального окна статистики
let currentStudentId = null;
let currentStatsMonth = null;
let availableMonths = [];

// Добавить эту функцию в app.js
function setOnDataImported(callback) {
    // Просто передаем колбэк в storage.js
    if (typeof setOnDataImportedStorage === 'function') {
        setOnDataImportedStorage(callback);
    }
}

// Функция для обновления отображения даты
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
        dateDisplay.textContent = formattedDate;
    }
}

// Основные функции приложения
function updateAttendanceList() {
    const date = document.getElementById('date-selector').value;
    const group = document.getElementById('group-selector').value;
    
    const groups = getGroups();
    const students = groups[group] || [];
    const attendance = getAttendanceForDate(date);
    
    const container = document.getElementById('students-container');
    container.innerHTML = '';
    
    if (students.length === 0) {
        container.innerHTML = '<div class="text-center text-muted">Нет студентов в группе</div>';
        return;
    }
    
    students.forEach(student => {
        const present = attendance[student.id] !== undefined ? attendance[student.id] : null;
        
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
        
        container.appendChild(studentCard);
        
        // Добавляем обработчик клика на карточку
        studentCard.addEventListener('click', (e) => {
            if (!e.target.closest('.student-status-btn')) {
                toggleAttendance(student.id, studentCard);
            }
        });
        
        // Обработчик для кнопки статистики
        const statsBtn = studentCard.querySelector('.student-status-btn');
        statsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openStudentStats(student.id);
        });
    });
}

function toggleAttendance(studentId, element) {
    const date = document.getElementById('date-selector').value;
    const present = getNextStatus(studentId, date);
    
    // Сохраняем в LocalStorage
    if (saveAttendance(date, studentId, present)) {
        // Обновляем UI
        updateStudentCard(element, present);
        
        // Виброотклик
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    } else {
        showNotification('Ошибка сохранения', 'error');
    }
}

function updateStudentCard(element, present) {
    element.classList.remove('present-true', 'present-false', 'present-null');
    element.classList.add('present-' + present);
    
    const icon = element.querySelector('.student-status');
    icon.textContent = present === true ? '✅' : present === false ? '❌' : '⬜';
}

// Функции для работы со статистикой студента
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
    
    // Обновляем селектор месяцев
    updateMonthSelector();
    
    // Заполняем модальное окно
    document.getElementById('student-stats-name').textContent = student.name; // Только имя
    
    // Обновляем статистику для выбранного месяца
    updateStudentStatsDisplay();
    
    // Показываем модальное окно
    document.getElementById('student-stats-modal').style.display = 'block';
}
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

function updateStudentStatsDisplay() {
    if (!currentStudentId || !currentStatsMonth) return;
    
    const [year, month] = currentStatsMonth.split('-');
    const stats = getStudentStatsForMonth(currentStudentId, year, month);
    const student = getStudentById(currentStudentId);
    
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


function closeStudentStats() {
    document.getElementById('student-stats-modal').style.display = 'none';
    currentStudentId = null;
    currentStatsMonth = null;
    availableMonths = [];
}

// Вспомогательные функции для форматирования
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatMonthForDisplay(monthString) {
    const [year, month] = monthString.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric'
    });
}

// Обновить список групп в селекторе
function updateGroupSelector() {
    const groupNames = getGroupNames();
    const groupSelector = document.getElementById('group-selector');
    
    // Сохраняем текущее выбранное значение
    const currentValue = groupSelector.value;
    
    // Очищаем селектор
    groupSelector.innerHTML = '';
    
    // Заполняем новыми группами
    groupNames.forEach(groupName => {
        const option = document.createElement('option');
        option.value = groupName;
        option.textContent = groupName;
        groupSelector.appendChild(option);
    });
    
    // Восстанавливаем выбранное значение, если оно еще существует
    if (groupNames.includes(currentValue)) {
        groupSelector.value = currentValue;
    } else if (groupNames.length > 0) {
        // Иначе выбираем первую группу
        groupSelector.value = groupNames[0];
    }
    
    console.log('Group selector updated with groups:', groupNames);
}

// Обработчики онлайн/оффлайн статуса
function handleOnlineStatus() {
    document.getElementById('offline-indicator').classList.add('hidden');
    showNotification('Соединение восстановлено', 'success');
}

function handleOfflineStatus() {
    document.getElementById('offline-indicator').classList.remove('hidden');
    showNotification('Работаем в оффлайн-режиме', 'info');
}

// PWA Installation
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


function setupBeforeUnload() {
    let hasUnsavedChanges = false;
    
    // Сохраняем оригинальную функцию
    const originalSaveAttendance = window.saveAttendance;
    
    // Отслеживать изменения посещаемости
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

function setupAutoBackup() {
    let changeCount = 0;
    
    // Сохраняем оригинальную функцию
    const originalSaveData = window.saveData;
    
    // Создавать резервную копию каждые 24 часа
    setInterval(() => {
        if (navigator.onLine) {
            createBackup();
            console.log('Автоматическая резервная копия создана');
        }
    }, 24 * 60 * 60 * 1000);
    
    // Переопределяем saveData для отслеживания изменений
    window.saveData = function(data) {
        changeCount++;
        
        // Создавать резервную копию после 10 изменений
        if (changeCount >= 10) {
            if (createBackup()) {
                console.log('Резервная копия создана после 10 изменений');
                changeCount = 0;
            }
        }
        
        // Вызываем оригинальную функцию
        return originalSaveData(data);
    };
    
    // Резервная копия при закрытии вкладки (если были изменения)
    window.addEventListener('beforeunload', () => {
        if (changeCount > 0) {
            createBackup();
        }
    });
    
    // Резервная копия при переходе в онлайн (если были оффлайн-изменения)
    window.addEventListener('online', () => {
        if (changeCount > 0) {
            createBackup();
            changeCount = 0;
        }
    });
}


function setupCrossTabSync() {
    // Функция уже определена в storage.js, просто вызываем ее
    if (typeof setupCrossTabSync === 'function') {
        setupCrossTabSync();
    }
}

// Инициализация приложения
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
        
        // Обновляем отображение даты
        updateDateDisplay();

        
        checkPendingOperations();
        checkStorageQuota();

        setupAutoBackup();
        setupBeforeUnload();
        
        // Устанавливаем колбэк для обновления UI после импорта данных
        setOnDataImported(() => {
            updateGroupSelector();
            updateAttendanceList();
        });
        
        // Инициализируем селектор групп
        updateGroupSelector();
        setupCrossTabSync();

        // Назначаем обработчики событий
        dateSelector.addEventListener('change', function() {
            updateDateDisplay();
            updateAttendanceList();
        });
        
        document.getElementById('group-selector').addEventListener('change', updateAttendanceList);
        document.getElementById('export-btn').addEventListener('click', exportData);
        document.getElementById('import-file').addEventListener('change', importData);
        
        // Обработчики для модального окна статистики
        document.getElementById('close-stats-modal').addEventListener('click', closeStudentStats);
        document.getElementById('close-stats-btn').addEventListener('click', closeStudentStats);
        document.getElementById('student-stats-modal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeStudentStats();
            }
        });
        
        // Обработчики для навигации по месяцам
        document.getElementById('stats-month-selector').addEventListener('change', function() {
            currentStatsMonth = this.value;
            updateStudentStatsDisplay();
        });
       
        // Закрытие модального окна по клавише Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeStudentStats();
            }
        });
        
        // Мониторинг онлайн-статуса
        window.addEventListener('online', handleOnlineStatus);
        window.addEventListener('offline', handleOfflineStatus);
        
        // Проверяем начальный статус
        if (!navigator.onLine) {
            handleOfflineStatus();
        }
        
        // Инициализируем PWA
        initializePWA();
        
        // Регистрация Service Worker
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

// В app.js добавить


// Инициализируем приложение когда DOM загружен
document.addEventListener('DOMContentLoaded', initializeApp);