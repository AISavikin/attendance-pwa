// storage.js - Функции для работы с локальным хранилищем

const STORAGE_KEY = 'attendance_db';
const BACKUP_KEY = 'attendance_backup';

// Сохранить все данные
function saveData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('Данные сохранены:', data);
        return true;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        return false;
    }
}

// Загрузить все данные
function loadData() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    }
    
    // Возвращаем структуру по умолчанию если данных нет
    return {
        groups: {
            'Выдуманная група 1': [
                { id: 1, name: 'Выдуманный Иван' },
                { id: 2, name: 'Ненастоящая Мария' },
                { id: 3, name: 'Липовый Алексей' }
            ],
            'Выдуманная група 2': [
                { id: 4, name: 'фейковая Анна' },
                { id: 5, name: 'Лже Дмитрий' },
                { id: 6, name: 'Федорова Елена' }
            ]
        },
        attendance: {} // { "2024-01-15": { "1": true, "2": false, ... } }
    };
}

// Валидация структуры данных
function isValidDataStructure(data) {
    if (!data || typeof data !== 'object') {
        return false;
    }
    
    // Проверяем наличие обязательных полей
    if (!data.groups || typeof data.groups !== 'object') {
        return false;
    }
    
    if (!data.attendance || typeof data.attendance !== 'object') {
        return false;
    }
    
    // Проверяем структуру групп
    for (const groupName in data.groups) {
        if (!Array.isArray(data.groups[groupName])) {
            return false;
        }
        
        // Проверяем структуру студентов в группе
        for (const student of data.groups[groupName]) {
            if (!student.id || !student.name || typeof student.id !== 'number' || typeof student.name !== 'string') {
                return false;
            }
        }
    }
    
    // Проверяем структуру посещаемости
    for (const date in data.attendance) {
        const dayAttendance = data.attendance[date];
        if (typeof dayAttendance !== 'object') {
            return false;
        }
        
        // Проверяем, что значения - boolean или null
        for (const studentId in dayAttendance) {
            const value = dayAttendance[studentId];
            if (value !== true && value !== false && value !== null) {
                return false;
            }
        }
    }
    
    return true;
}

// Создать резервную копию
function createBackup() {
    try {
        const currentData = loadData();
        localStorage.setItem(BACKUP_KEY, JSON.stringify(currentData));
        console.log('Резервная копия создана');
        return true;
    } catch (error) {
        console.error('Ошибка создания резервной копии:', error);
        return false;
    }
}

// Восстановить из резервной копии
function restoreFromBackup() {
    try {
        const backupData = localStorage.getItem(BACKUP_KEY);
        if (backupData) {
            const data = JSON.parse(backupData);
            if (isValidDataStructure(data)) {
                saveData(data);
                console.log('Данные восстановлены из резервной копии');
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Ошибка восстановления из резервной копии:', error);
        return false;
    }
}

// Удалить резервную копию
function removeBackup() {
    try {
        localStorage.removeItem(BACKUP_KEY);
        console.log('Резервная копия удалена');
    } catch (error) {
        console.error('Ошибка удаления резервной копии:', error);
    }
}

// Сохранить посещаемость для даты
function saveAttendance(date, studentId, present) {
    const data = loadData();
    
    if (!data.attendance[date]) {
        data.attendance[date] = {};
    }
    
    data.attendance[date][studentId] = present;
    return saveData(data);
}

// Получить посещаемость для даты
function getAttendanceForDate(date) {
    const data = loadData();
    return data.attendance[date] || {};
}

// Получить список групп
function getGroups() {
    const data = loadData();
    return data.groups;
}

// Получить список названий групп
function getGroupNames() {
    const data = loadData();
    return Object.keys(data.groups);
}

// Получить следующий статус для студента
function getNextStatus(studentId, date) {
    const currentAttendance = getAttendanceForDate(date);
    const currentStatus = currentAttendance[studentId];
    
    // Цикл: null -> true -> false -> null
    if (currentStatus === undefined || currentStatus === null) return true;
    if (currentStatus === true) return false;
    return null;
}

// Получить статистику студента за конкретный месяц
function getStudentStatsForMonth(studentId, year, month) {
    const data = loadData();
    const stats = {
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        attendanceRate: 0,
        dailyRecords: [],
        month: `${year}-${month.toString().padStart(2, '0')}`
    };
    
    // Собираем записи посещаемости для студента за указанный месяц
    Object.entries(data.attendance).forEach(([date, dayAttendance]) => {
        const recordYear = date.split('-')[0];
        const recordMonth = date.split('-')[1];
        
        if (recordYear === year.toString() && recordMonth === month.toString().padStart(2, '0')) {
            if (dayAttendance[studentId] !== undefined) {
                stats.totalDays++;
                
                if (dayAttendance[studentId] === true) {
                    stats.presentDays++;
                } else if (dayAttendance[studentId] === false) {
                    stats.absentDays++;
                }
                
                // Добавляем запись за день
                stats.dailyRecords.push({
                    date: date,
                    present: dayAttendance[studentId]
                });
            }
        }
    });
    
    // Сортируем записи по дате (новые сначала)
    stats.dailyRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Рассчитываем процент посещаемости
    if (stats.totalDays > 0) {
        stats.attendanceRate = Math.round((stats.presentDays / stats.totalDays) * 100);
    }
    
    return stats;
}

// Получить список месяцев, для которых есть данные о студенте
function getAvailableMonthsForStudent(studentId) {
    const data = loadData();
    const monthsSet = new Set();
    
    Object.keys(data.attendance).forEach(date => {
        if (data.attendance[date][studentId] !== undefined) {
            const [year, month] = date.split('-');
            monthsSet.add(`${year}-${month}`);
        }
    });
    
    // Преобразуем в массив и сортируем по убыванию (новые месяцы first)
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
}

// Получить студента по ID
function getStudentById(studentId) {
    const data = loadData();
    
    for (const groupName in data.groups) {
        const student = data.groups[groupName].find(s => s.id === studentId);
        if (student) {
            return {
                ...student,
                group: groupName
            };
        }
    }
    
    return null;
}

// Получить общую статистику студента (все время)
function getStudentStats(studentId) {
    const data = loadData();
    const stats = {
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        attendanceRate: 0,
        recentRecords: []
    };
    
    // Собираем все записи посещаемости для студента
    Object.entries(data.attendance).forEach(([date, dayAttendance]) => {
        if (dayAttendance[studentId] !== undefined) {
            stats.totalDays++;
            
            if (dayAttendance[studentId] === true) {
                stats.presentDays++;
            } else if (dayAttendance[studentId] === false) {
                stats.absentDays++;
            }
            
            // Добавляем в последние записи (максимум 10)
            if (stats.recentRecords.length < 10) {
                stats.recentRecords.push({
                    date: date,
                    present: dayAttendance[studentId]
                });
            }
        }
    });
    
    // Сортируем последние записи по дате (новые сначала)
    stats.recentRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Рассчитываем процент посещаемости
    if (stats.totalDays > 0) {
        stats.attendanceRate = Math.round((stats.presentDays / stats.totalDays) * 100);
    }
    
    return stats;
}

// Экспорт данных для скачивания
function exportData() {
    const data = loadData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    // Показываем уведомление
    showNotification('Данные экспортированы!', 'success');
}

// Импорт данных из файла (УЛУЧШЕННАЯ ВЕРСИЯ)
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Проверяем тип файла
    if (!file.name.endsWith('.json')) {
        showNotification('Ошибка: файл должен быть в формате JSON', 'error');
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // СОЗДАЕМ РЕЗЕРВНУЮ КОПИЮ ПЕРЕД ИМПОРТОМ
            if (!createBackup()) {
                showNotification('Ошибка: не удалось создать резервную копию', 'error');
                return;
            }
            
            // ПРОВЕРЯЕМ СТРУКТУРУ ДАННЫХ
            if (!isValidDataStructure(importedData)) {
                throw new Error('Неверная структура данных в файле');
            }
            
            // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: есть ли хотя бы одна группа с студентами
            const groupNames = Object.keys(importedData.groups);
            if (groupNames.length === 0) {
                throw new Error('В файле нет ни одной группы');
            }
            
            let hasStudents = false;
            for (const groupName of groupNames) {
                if (importedData.groups[groupName].length > 0) {
                    hasStudents = true;
                    break;
                }
            }
            
            if (!hasStudents) {
                throw new Error('В файле нет ни одного студента');
            }
            
            // ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ - СОХРАНЯЕМ ДАННЫЕ
            if (saveData(importedData)) {
                removeBackup(); // Удаляем резервную копию при успешном импорте
                updateGroupSelector();
                updateAttendanceList();
                showNotification('Данные успешно импортированы!', 'success');
            } else {
                throw new Error('Ошибка при сохранении данных');
            }
            
        } catch (error) {
            console.error('Ошибка импорта:', error);
            
            // ВОССТАНАВЛИВАЕМ ДАННЫЕ ИЗ РЕЗЕРВНОЙ КОПИИ
            if (restoreFromBackup()) {
                showNotification(`Ошибка импорта: ${error.message}. Данные восстановлены из резервной копии.`, 'error');
            } else {
                showNotification(`Критическая ошибка импорта: ${error.message}. Не удалось восстановить данные.`, 'error');
            }
            
            // Все равно удаляем резервную копию чтобы не занимать место
            removeBackup();
        }
    };
    
    reader.onerror = function() {
        showNotification('Ошибка чтения файла', 'error');
        event.target.value = '';
    };
    
    reader.readAsText(file);
    
    // Сбрасываем input чтобы можно было загрузить тот же файл снова
    event.target.value = '';
}

// Проверить целостность данных
function checkDataIntegrity() {
    const data = loadData();
    
    if (!isValidDataStructure(data)) {
        console.error('Обнаружено повреждение данных');
        return false;
    }
    
    // Проверяем, что все ID студентов в attendance существуют в группах
    const allStudentIds = new Set();
    for (const groupName in data.groups) {
        data.groups[groupName].forEach(student => {
            allStudentIds.add(student.id);
        });
    }
    
    for (const date in data.attendance) {
        for (const studentId in data.attendance[date]) {
            const id = parseInt(studentId);
            if (!allStudentIds.has(id)) {
                console.warn(`Обнаружена запись посещаемости для несуществующего студента ID: ${studentId} на дату ${date}`);
                // Можно автоматически очистить такие записи
                // delete data.attendance[date][studentId];
            }
        }
    }
    
    return true;
}

// Показать уведомление
function showNotification(message, type = 'info') {
    // Создаем или находим контейнер для уведомлений
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2';
        document.body.appendChild(notificationContainer);
    }
    
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 
                   type === 'error' ? 'bg-red-500' : 
                   'bg-blue-500';
    
    notification.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-300`;
    notification.textContent = message;
    
    notificationContainer.appendChild(notification);
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            notification.remove();
            // Удаляем контейнер если уведомлений больше нет
            if (notificationContainer.children.length === 0) {
                notificationContainer.remove();
            }
        }, 300);
    }, 5000);
}