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
            'group1': [
                { id: 1, name: 'Иванов Иван' },
                { id: 2, name: 'Петрова Мария' },
                { id: 3, name: 'Сидоров Алексей' }
            ],
            'group2': [
                { id: 4, name: 'Козлова Анна' },
                { id: 5, name: 'Николаев Дмитрий' },
                { id: 6, name: 'Федорова Елена' }
            ],
            'group3': [
                { id: 7, name: 'Васильев Павел' },
                { id: 8, name: 'Михайлова Ольга' },
                { id: 9, name: 'Алексеев Сергей' }
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

// Получить следующий статус для студента
function getNextStatus(studentId, date) {
    const currentAttendance = getAttendanceForDate(date);
    const currentStatus = currentAttendance[studentId];
    
    // Цикл: null -> true -> false -> null
    if (currentStatus === undefined || currentStatus === null) return true;
    if (currentStatus === true) return false;
    return null;
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
            if (!data.groups || !data.attendance) {
                throw new Error('Неверный формат файла');
            }
            
            if (saveData(data)) {
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