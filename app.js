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