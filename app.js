// app.js - Основная логика приложения

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
        container.innerHTML = '<div class="text-center text-gray-500 py-8">Нет студентов в группе</div>';
        return;
    }
    
    students.forEach(student => {
        const present = attendance[student.id] !== undefined ? attendance[student.id] : null;
        
        const studentCard = document.createElement('div');
        studentCard.className = `student-card border-2 rounded-lg p-3 present-${present}`;
        
        studentCard.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-medium text-gray-800">${student.name}</span>
                <div class="flex items-center space-x-2">
                    <button class="student-stats-btn text-gray-400 hover:text-blue-500 transition-colors" 
                            data-student-id="${student.id}">
                        📊
                    </button>
                    <span class="text-2xl student-status">
                        ${present === true ? '✅' : present === false ? '❌' : '⬜'}
                    </span>
                </div>
            </div>
        `;
        
        container.appendChild(studentCard);
        
        // Добавляем обработчик клика на карточку (для отметки посещаемости)
        studentCard.addEventListener('click', (e) => {
            // Проверяем, не кликнули ли по кнопке статистики
            if (!e.target.closest('.student-stats-btn')) {
                toggleAttendance(student.id, studentCard);
            }
        });
        
        // Добавляем обработчик для кнопки статистики
        const statsBtn = studentCard.querySelector('.student-stats-btn');
        statsBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Предотвращаем срабатывание клика по карточке
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
    const student = getStudentById(studentId);
    const stats = getStudentStats(studentId);
    
    if (!student) {
        showNotification('Студент не найден', 'error');
        return;
    }
    
    // Заполняем модальное окно
    document.getElementById('student-stats-name').textContent = `Статистика: ${student.name}`;
    
    const content = document.getElementById('student-stats-content');
    content.innerHTML = `
        <div class="space-y-4">
            <div>
                <p class="text-sm text-gray-600">Группа: ${student.group}</p>
            </div>
            
            <div class="grid grid-cols-3 gap-4 text-center">
                <div class="bg-green-50 p-3 rounded-lg">
                    <div class="text-2xl font-bold text-green-600">${stats.presentDays}</div>
                    <div class="text-sm text-green-800">Присутствовал</div>
                </div>
                <div class="bg-red-50 p-3 rounded-lg">
                    <div class="text-2xl font-bold text-red-600">${stats.absentDays}</div>
                    <div class="text-sm text-red-800">Отсутствовал</div>
                </div>
                <div class="bg-blue-50 p-3 rounded-lg">
                    <div class="text-2xl font-bold text-blue-600">${stats.attendanceRate}%</div>
                    <div class="text-sm text-blue-800">Посещаемость</div>
                </div>
            </div>
            
            ${stats.recentRecords.length > 0 ? `
                <div>
                    <h4 class="font-medium mb-2">Последние записи:</h4>
                    <div class="space-y-2 max-h-40 overflow-y-auto">
                        ${stats.recentRecords.map(record => `
                            <div class="flex justify-between items-center p-2 border-b">
                                <span>${formatDate(record.date)}</span>
                                <span class="${record.present ? 'text-green-600' : 'text-red-600'}">
                                    ${record.present ? '✅ Присутствовал' : '❌ Отсутствовал'}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : '<p class="text-gray-500 text-center">Нет записей о посещаемости</p>'}
        </div>
    `;
    
    // Показываем модальное окно
    document.getElementById('student-stats-modal').style.display = 'block';
}

function closeStudentStats() {
    document.getElementById('student-stats-modal').style.display = 'none';
}

// Вспомогательная функция для форматирования даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// PWA Installation
function initializePWA() {
    let deferredPrompt;
    const installButton = document.getElementById('installButton');

    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('✅ beforeinstallprompt event fired');
        e.preventDefault();
        deferredPrompt = e;
        installButton.style.display = 'block';
    });

    installButton.addEventListener('click', async () => {
        console.log('🔄 Install button clicked');
        
        if (deferredPrompt) {
            console.log('🚀 Showing install prompt');
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response: ${outcome}`);
            deferredPrompt = null;
            installButton.style.display = 'none';
        } else {
            console.log('❌ No deferred prompt available');
            showNotification('Для установки используйте иконку в адресной строке браузера', 'info');
        }
    });

    window.addEventListener('appinstalled', () => {
        console.log('🎉 PWA was installed');
        installButton.style.display = 'none';
    });
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Устанавливаем сегодняшнюю дату по умолчанию
    const dateSelector = document.getElementById('date-selector');
    const today = new Date().toISOString().split('T')[0];
    dateSelector.value = today;

    updateGroupSelector();
    
    // Назначаем обработчики событий
    dateSelector.addEventListener('change', updateAttendanceList);
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
    
    // Закрытие модального окна по клавише Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeStudentStats();
        }
    });
    
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
            });
    }
    
    // Загружаем начальные данные
    updateAttendanceList();
    
    console.log('Приложение инициализировано');
});


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

// Обновим функцию импорта данных
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Простая валидация структуры данных
            if (!data.groups || typeof data.groups !== 'object') {
                throw new Error('Неверный формат файла: отсутствует groups');
            }
            
            if (!data.attendance || typeof data.attendance !== 'object') {
                throw new Error('Неверный формат файла: отсутствует attendance');
            }
            
            if (saveData(data)) {
                // ОБНОВЛЯЕМ СПИСОК ГРУПП ПОСЛЕ ИМПОРТА
                updateGroupSelector();
                updateAttendanceList();
                showNotification('Данные успешно импортированы!', 'success');
            } else {
                showNotification('Ошибка при сохранении данных', 'error');
            }
        } catch (error) {
            console.error('Ошибка импорта:', error);
            showNotification('Ошибка при импорте файла: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
    
    // Сбрасываем input чтобы можно было загрузить тот же файл снова
    event.target.value = '';
}