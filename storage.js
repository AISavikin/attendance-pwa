// storage.js - Функции для работы с локальным хранилищем

const STORAGE_KEY = 'attendance_db';

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

// Импорт данных из файла
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

// Показать уведомление
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    notification.className = `fixed top-4 left-1/2 transform -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Автоматически скрываем через 3 секунды
    setTimeout(() => {
        notification.remove();
    }, 3000);
}