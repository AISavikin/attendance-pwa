// storage.js - Синхронная версия без внешних зависимостей

const STORAGE_KEY = 'attendance_db';
const BACKUP_KEY = 'attendance_backup';

// Колбэк для обновления UI после импорта данных
let onDataImportedCallback = null;

function setOnDataImportedStorage(callback) {
    onDataImportedCallback = callback;
}

// Сохранить все данные
function saveData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('Данные сохранены');
        return true;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        // Пытаемся сохранить в sessionStorage как fallback
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            console.log('Данные сохранены в sessionStorage');
            return true;
        } catch (fallbackError) {
            console.error('Ошибка сохранения в sessionStorage:', fallbackError);
            return false;
        }
    }
}

// Загрузить все данные
function loadData() {
    let data = null;
    
    // Пытаемся загрузить из localStorage
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            data = JSON.parse(stored);
        }
    } catch (error) {
        console.error('Ошибка загрузки из localStorage:', error);
    }
    
    // Если в localStorage нет данных, пробуем sessionStorage
    if (!data) {
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY);
            if (stored) {
                data = JSON.parse(stored);
                console.log('Данные загружены из sessionStorage');
            }
        } catch (error) {
            console.error('Ошибка загрузки из sessionStorage:', error);
        }
    }
    
    // Если данных нет вообще, возвращаем структуру по умолчанию
    if (!data) {
        data = {
            groups: {
                'Группа 1': [
                    { id: 1, name: 'Иванов Иван' },
                    { id: 2, name: 'Петрова Мария' },
                    { id: 3, name: 'Сидоров Алексей' }
                ],
                'Группа 2': [
                    { id: 4, name: 'Козлова Анна' },
                    { id: 5, name: 'Николаев Дмитрий' },
                    { id: 6, name: 'Федорова Елена' }
                ]
            },
            attendance: {},
            schedule: [3, 5]
        };
        // Сохраняем структуру по умолчанию
        saveData(data);
    }
    
    return data;
}

// Получить расписание
function getSchedule() {
    const data = loadData();
    return data.schedule || [1, 2, 3, 4, 5]; // По умолчанию пн-пт
}

// Сохранить расписание
function saveSchedule(scheduleDays) {
    const data = loadData();
    data.schedule = scheduleDays;
    return saveData(data);
}

// Проверить, является ли дата учебным днем
function isStudyDay(dateString) {
    const schedule = getSchedule();
    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0-воскресенье, 1-понедельник, etc.
    return schedule.includes(dayOfWeek);
}

// Получить название дня недели на русском
function getDayName(dayNumber) {
    const days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
    return days[dayNumber];
}

// Валидация структуры данных
function isValidDataStructure(data) {
    if (!data || typeof data !== 'object') {
        return false;
    }
    
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
        const backupData = {
            data: currentData,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        localStorage.setItem(BACKUP_KEY, JSON.stringify(backupData));
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
        const backupDataStr = localStorage.getItem(BACKUP_KEY);
        if (backupDataStr) {
            const backupData = JSON.parse(backupDataStr);
            
            // Поддержка старого и нового формата резервных копий
            let dataToRestore;
            if (backupData.data && backupData.timestamp) {
                // Новый формат: {data: ..., timestamp: ..., version: ...}
                dataToRestore = backupData.data;
            } else {
                // Старый формат: просто данные
                dataToRestore = backupData;
            }
            
            if (isValidDataStructure(dataToRestore)) {
                saveData(dataToRestore);
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
    } catch (error) {
        console.error('Ошибка удаления резервной копии:', error);
    }
}

// Сохранить посещаемость для даты
function saveAttendance(date, studentId, present) {
    const data = loadData();
    
    // Создаем объект для даты если его нет
    if (!data.attendance[date]) {
        data.attendance[date] = {};
    }
    
    if (present === null) {
        // 🗑️ УДАЛЯЕМ запись когда статус "не отмечено"
        delete data.attendance[date][studentId];
        
        // Если день стал пустым - удаляем и объект дня
        if (Object.keys(data.attendance[date]).length === 0) {
            delete data.attendance[date];
        }
    } else {
        // ✅ СОХРАНЯЕМ только true или false
        data.attendance[date][studentId] = present;
    }
    
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
        dailyRecords: [],
        month: `${year}-${month.toString().padStart(2, '0')}`
    };
    
    // Собираем только записи посещаемости
    Object.entries(data.attendance).forEach(([date, dayAttendance]) => {
        const recordYear = date.split('-')[0];
        const recordMonth = date.split('-')[1];
        
        if (recordYear === year.toString() && recordMonth === month.toString().padStart(2, '0')) {
            if (dayAttendance[studentId] !== undefined) {
                stats.dailyRecords.push({
                    date: date,
                    present: dayAttendance[studentId]
                });
            }
        }
    });
    
    // Сортируем записи по дате (новые сначала)
    stats.dailyRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    
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
                
                // Вызываем колбэк для обновления UI
                if (onDataImportedCallback) {
                    onDataImportedCallback();
                }
                
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
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notificationContainer.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
        if (notificationContainer.children.length === 0) {
            notificationContainer.remove();
        }
    }, 5000);
}


let isOperationInProgress = false;

function setOperationInProgress(status) {
    isOperationInProgress = status;
    // Сохранять в sessionStorage для восстановления после перезагрузки
    sessionStorage.setItem('operationInProgress', status);
}

function checkPendingOperations() {
    const wasOperationInProgress = sessionStorage.getItem('operationInProgress') === 'true';
    if (wasOperationInProgress) {
        showNotification('Обнаружена незавершенная операция. Проверьте целостность данных.', 'warning');
        sessionStorage.removeItem('operationInProgress');
    }
}


function setupCrossTabSync() {
    window.addEventListener('storage', function(e) {
        if (e.key === STORAGE_KEY && e.newValue !== e.oldValue) {
            showNotification('Данные обновлены в другой вкладке', 'info');
            if (onDataImportedCallback) {
                onDataImportedCallback();
            }
        }
    });
}


function checkStorageQuota() {
    try {
        const data = JSON.stringify(loadData());
        if (data.length > 4.5 * 1024 * 1024) { // 4.5MB предупреждение
            showNotification('Мало места в хранилище. Рекомендуется экспорт старых данных.', 'warning');
            return false;
        }
        return true;
    } catch (e) {
        showNotification('Ошибка проверки хранилища', 'error');
        return false;
    }
}

function cleanupOldData() {
    const data = loadData();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    Object.keys(data.attendance).forEach(date => {
        if (new Date(date) < oneYearAgo) {
            delete data.attendance[date];
        }
    });
    
    saveData(data);

}