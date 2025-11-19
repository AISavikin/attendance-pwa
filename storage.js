// storage.js - Модуль для работы с локальным хранилищем данных
// Отвечает за сохранение, загрузку и валидацию данных приложения

/**
 * КОНСТАНТЫ ХРАНИЛИЩА
 */
const STORAGE_KEY = 'attendance_db';
const BACKUP_KEY = 'attendance_backup';

/**
 * ПЕРЕМЕННЫЕ СОСТОЯНИЯ
 */
let onDataImportedCallback = null; // Колбэк для обновления UI после импорта

/**
 * УТИЛИТЫ ДЛЯ РАБОТЫ С ХРАНИЛИЩЕМ
 */

/**
 * Устанавливает колбэк для обновления UI после импорта данных
 * @param {Function} callback - Функция для вызова после импорта
 */
function setOnDataImportedStorage(callback) {
    onDataImportedCallback = callback;
}

/**
 * Сохраняет все данные приложения в localStorage
 * @param {Object} data - Данные для сохранения
 * @returns {boolean} Успешность операции
 */
function saveData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('Данные сохранены');
        return true;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        
        // Fallback: пробуем сохранить в sessionStorage
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

/**
 * Загружает все данные приложения из localStorage
 * @returns {Object} Загруженные данные или структура по умолчанию
 */
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
        data = getDefaultDataStructure();
        saveData(data);
    }
    
    return data;
}

/**
 * Возвращает структуру данных по умолчанию
 * @returns {Object} Базовая структура данных приложения
 */
function getDefaultDataStructure() {
    return {
        // Группы содержат массивы ID студентов
        groups: {
            'Выдуманная група 1': [1, 2, 3],
            'Выдуманная група 2': [4, 5, 6]
        },
        // Все студенты хранятся в одном объекте
        students: {
            1: { id: 1, name: 'Выдуманный Иван' },
            2: { id: 2, name: 'Лже Дмитрий' },
            3: { id: 3, name: 'фейковая Анна' },
            4: { id: 4, name: 'Липовый Алексей' },
            5: { id: 5, name: 'Ненастоящая Мария' },
            6: { id: 6, name: 'Ненастоящая Катя' }
        },
        attendance: {},
        schedule: [3, 5], // пн-пт по умолчанию
        nextStudentId: 7 // следующий доступный ID
    };
}


/**
 * ФУНКЦИИ ДЛЯ РАБОТЫ С ГРУППАМИ
 */

/**
 * Получает все группы
 */
function getGroups() {
    const data = loadData();
    return data.groups;
}

/**
 * Получает список названий групп
 */
function getGroupNames() {
    const data = loadData();
    return Object.keys(data.groups);
}

/**
 * Добавляет новую группу
 * @param {string} groupName - Название новой группы
 * @returns {boolean} Успешность операции
 */
function addGroup(groupName) {
    if (!groupName || groupName.trim() === '') {
        showNotification('Название группы не может быть пустым', 'error');
        return false;
    }
    
    const data = loadData();
    
    // Проверяем уникальность названия группы
    if (data.groups[groupName]) {
        showNotification('Группа с таким названием уже существует', 'error');
        return false;
    }
    
    // Добавляем новую группу с пустым массивом студентов
    data.groups[groupName] = [];
    
    if (saveData(data)) {
        showNotification(`Группа "${groupName}" добавлена`, 'success');
        return true;
    } else {
        showNotification('Ошибка при сохранении группы', 'error');
        return false;
    }
}

/**
 * Удаляет группу (только если она пустая)
 * @param {string} groupName - Название группы для удаления
 * @returns {boolean} Успешность операции
 */
function removeGroup(groupName) {
    const data = loadData();
    
    if (!data.groups[groupName]) {
        showNotification('Группа не найдена', 'error');
        return false;
    }
    
    // Проверяем, что группа пустая
    if (data.groups[groupName].length > 0) {
        showNotification('Нельзя удалить непустую группу', 'error');
        return false;
    }
    
    // Удаляем группу
    delete data.groups[groupName];
    
    if (saveData(data)) {
        showNotification(`Группа "${groupName}" удалена`, 'success');
        return true;
    } else {
        showNotification('Ошибка при удалении группы', 'error');
        return false;
    }
}

/**
 * ФУНКЦИИ ДЛЯ РАБОТЫ СО СТУДЕНТАМИ
 */

/**
 * Получает всех студентов
 */
function getAllStudents() {
    const data = loadData();
    return data.students;
}

/**
 * Получает студентов конкретной группы
 * @param {string} groupName - Название группы
 * @returns {Array} Массив студентов группы
 */
function getStudentsInGroup(groupName) {
    const data = loadData();
    const group = data.groups[groupName];
    
    if (!group) {
        return [];
    }
    
    // Возвращаем массив объектов студентов на основе ID из группы
    return group.map(studentId => data.students[studentId]).filter(Boolean);
}

/**
 * Добавляет нового студента в группу
 * @param {string} groupName - Название группы
 * @param {string} studentName - ФИО студента
 * @returns {boolean} Успешность операции
 */
function addStudent(groupName, studentName) {
    if (!studentName || studentName.trim() === '') {
        showNotification('Имя студента не может быть пустым', 'error');
        return false;
    }
    
    const data = loadData();
    
    // Проверяем существование группы
    if (!data.groups[groupName]) {
        showNotification('Группа не найдена', 'error');
        return false;
    }
    
    // Создаем нового студента
    const newStudentId = data.nextStudentId;
    const newStudent = {
        id: newStudentId,
        name: studentName.trim()
    };
    
    // Добавляем студента в общий список
    data.students[newStudentId] = newStudent;
    
    // Добавляем ID студента в группу
    data.groups[groupName].push(newStudentId);
    
    // Увеличиваем счетчик ID
    data.nextStudentId++;
    
    if (saveData(data)) {
        showNotification(`Студент "${studentName}" добавлен в группу "${groupName}"`, 'success');
        return true;
    } else {
        showNotification('Ошибка при добавлении студента', 'error');
        return false;
    }
}

/**
 * Удаляет студента (с проверкой отметок за текущий месяц)
 * @param {number} studentId - ID студента
 * @returns {boolean} Успешность операции
 */
function removeStudent(studentId) {
    const data = loadData();
    
    // Проверяем существование студента
    if (!data.students[studentId]) {
        showNotification('Студент не найден', 'error');
        return false;
    }
    
    const studentName = data.students[studentId].name;
    
    // Проверяем, есть ли отметки в текущем месяце
    if (hasAttendanceInCurrentMonth(studentId)) {
        showNotification(`Нельзя удалить студента "${studentName}" - в текущем месяце есть отметки посещаемости. Удаление возможно со следующего месяца.`, 'error');
        return false;
    }
    
    // Удаляем студента из всех групп
    for (const groupName in data.groups) {
        const group = data.groups[groupName];
        const index = group.indexOf(studentId);
        if (index !== -1) {
            group.splice(index, 1);
        }
    }
    
    // Удаляем студента из общего списка
    delete data.students[studentId];
    
    // Удаляем все записи посещаемости студента
    for (const date in data.attendance) {
        delete data.attendance[date][studentId];
        
        // Если день стал пустым, удаляем объект дня
        if (Object.keys(data.attendance[date]).length === 0) {
            delete data.attendance[date];
        }
    }
    
    if (saveData(data)) {
        showNotification(`Студент "${studentName}" удален`, 'success');
        return true;
    } else {
        showNotification('Ошибка при удалении студента', 'error');
        return false;
    }
}

/**
 * Перемещает студента в другую группу
 * @param {number} studentId - ID студента
 * @param {string} targetGroup - Название целевой группы
 * @returns {boolean} Успешность операции
 */
function moveStudent(studentId, targetGroup) {
    const data = loadData();
    
    // Проверяем существование студента
    if (!data.students[studentId]) {
        showNotification('Студент не найден', 'error');
        return false;
    }
    
    // Проверяем существование целевой группы
    if (!data.groups[targetGroup]) {
        showNotification('Целевая группа не найдена', 'error');
        return false;
    }
    
    const studentName = data.students[studentId].name;
    
    // Удаляем студента из всех текущих групп
    let wasInGroup = false;
    for (const groupName in data.groups) {
        const group = data.groups[groupName];
        const index = group.indexOf(studentId);
        if (index !== -1) {
            group.splice(index, 1);
            wasInGroup = true;
        }
    }
    
    if (!wasInGroup) {
        showNotification('Студент не найден ни в одной группе', 'error');
        return false;
    }
    
    // Добавляем студента в целевую группу
    data.groups[targetGroup].push(studentId);
    
    if (saveData(data)) {
        showNotification(`Студент "${studentName}" перемещен в группу "${targetGroup}"`, 'success');
        return true;
    } else {
        showNotification('Ошибка при перемещении студента', 'error');
        return false;
    }
}

/**
 * Обновляет данные студента
 * @param {number} studentId - ID студента
 * @param {string} newName - Новое ФИО студента
 * @returns {boolean} Успешность операции
 */
function updateStudent(studentId, newName) {
    if (!newName || newName.trim() === '') {
        showNotification('Имя студента не может быть пустым', 'error');
        return false;
    }
    
    const data = loadData();
    
    // Проверяем существование студента
    if (!data.students[studentId]) {
        showNotification('Студент не найден', 'error');
        return false;
    }
    
    const oldName = data.students[studentId].name;
    data.students[studentId].name = newName.trim();
    
    if (saveData(data)) {
        showNotification(`Студент "${oldName}" переименован в "${newName}"`, 'success');
        return true;
    } else {
        showNotification('Ошибка при обновлении студента', 'error');
        return false;
    }
}

/**
 * Проверяет, есть ли у студента отметки в текущем месяце
 * @param {number} studentId - ID студента
 * @returns {boolean} true если есть отметки в текущем месяце
 */
function hasAttendanceInCurrentMonth(studentId) {
    const data = loadData();
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    for (const date in data.attendance) {
        if (date.startsWith(currentMonth) && data.attendance[date][studentId] !== undefined) {
            return true;
        }
    }
    
    return false;
}

/**
 * Получает студента по ID
 */
function getStudentById(studentId) {
    const data = loadData();
    const student = data.students[studentId];
    
    if (!student) {
        return null;
    }
    
    // Находим группу студента
    let studentGroup = null;
    for (const groupName in data.groups) {
        if (data.groups[groupName].includes(studentId)) {
            studentGroup = groupName;
            break;
        }
    }
    
    return {
        ...student,
        group: studentGroup
    };
}


/**
 * ФУНКЦИИ ДЛЯ РАБОТЫ С РАСПИСАНИЕМ
 */

/**
 * Получает текущее расписание учебных дней
 * @returns {number[]} Массив номеров дней недели (0-воскресенье, 6-суббота)
 */
function getSchedule() {
    const data = loadData();
    return data.schedule || [1, 2, 3, 4, 5]; // По умолчанию пн-пт
}

/**
 * Сохраняет расписание учебных дней
 * @param {number[]} scheduleDays - Массив номеров дней недели
 * @returns {boolean} Успешность операции
 */
function saveSchedule(scheduleDays) {
    const data = loadData();
    data.schedule = scheduleDays;
    return saveData(data);
}

/**
 * Проверяет, является ли дата учебным днем
 * @param {string} dateString - Дата в формате YYYY-MM-DD
 * @returns {boolean} true если учебный день
 */
function isStudyDay(dateString) {
    const schedule = getSchedule();
    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0-воскресенье, 1-понедельник, etc.
    return schedule.includes(dayOfWeek);
}

/**
 * Получает название дня недели на русском
 * @param {number} dayNumber - Номер дня недели (0-6)
 * @returns {string} Название дня недели
 */
function getDayName(dayNumber) {
    const days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
    return days[dayNumber];
}

/**
 * ФУНКЦИИ ВАЛИДАЦИИ ДАННЫХ
 */

/**
 * Проверяет корректность структуры данных
 * @param {Object} data - Данные для проверки
 * @returns {boolean} true если структура корректна
 */
function isValidDataStructure(data) {
    if (!data || typeof data !== 'object') {
        console.error('Данные не являются объектом');
        return false;
    }
    
    // Проверяем наличие обязательных полей
    const requiredFields = ['groups', 'students', 'attendance', 'schedule', 'nextStudentId'];
    for (const field of requiredFields) {
        if (!(field in data)) {
            console.error(`Отсутствует обязательное поле: ${field}`);
            return false;
        }
    }
    
    // Проверяем структуру groups
    if (!data.groups || typeof data.groups !== 'object') {
        console.error('Поле groups должно быть объектом');
        return false;
    }
    
    for (const groupName in data.groups) {
        if (!Array.isArray(data.groups[groupName])) {
            console.error(`Группа "${groupName}" должна быть массивом`);
            return false;
        }
        
        // Проверяем, что в группах хранятся числа (ID студентов)
        for (const studentId of data.groups[groupName]) {
            if (typeof studentId !== 'number') {
                console.error(`В группе "${groupName}" найден нечисловой ID студента: ${studentId}`);
                return false;
            }
        }
    }
    
    // Проверяем структуру students
    if (!data.students || typeof data.students !== 'object') {
        console.error('Поле students должно быть объектом');
        return false;
    }
    
    for (const studentId in data.students) {
        const student = data.students[studentId];
        const id = parseInt(studentId);
        
        if (!student || typeof student !== 'object') {
            console.error(`Студент с ID ${studentId} должен быть объектом`);
            return false;
        }
        
        if (student.id !== id) {
            console.error(`Несоответствие ID студента: ключ ${studentId}, значение ${student.id}`);
            return false;
        }
        
        if (!student.name || typeof student.name !== 'string') {
            console.error(`Студент с ID ${studentId} должен иметь имя (строка)`);
            return false;
        }
    }
    
    // Проверяем структуру attendance
    if (!data.attendance || typeof data.attendance !== 'object') {
        console.error('Поле attendance должно быть объектом');
        return false;
    }
    
    for (const date in data.attendance) {
        const dayAttendance = data.attendance[date];
        if (typeof dayAttendance !== 'object') {
            console.error(`Посещаемость на дату ${date} должна быть объектом`);
            return false;
        }
        
        for (const studentId in dayAttendance) {
            const value = dayAttendance[studentId];
            if (value !== true && value !== false && value !== null) {
                console.error(`Неверное значение посещаемости для студента ${studentId} на дату ${date}: ${value}`);
                return false;
            }
        }
    }
    
    // Проверяем структуру schedule
    if (!Array.isArray(data.schedule)) {
        console.error('Поле schedule должно быть массивом');
        return false;
    }
    
    for (const day of data.schedule) {
        if (typeof day !== 'number' || day < 0 || day > 6) {
            console.error(`Неверный день недели в расписании: ${day}`);
            return false;
        }
    }
    
    // Проверяем nextStudentId
    if (typeof data.nextStudentId !== 'number' || data.nextStudentId < 1) {
        console.error(`Неверное значение nextStudentId: ${data.nextStudentId}`);
        return false;
    }
    
    return true;
}


/**
 * ФУНКЦИИ РЕЗЕРВНОГО КОПИРОВАНИЯ
 */

/**
 * Создает резервную копию данных
 * @returns {boolean} Успешность операции
 */
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

/**
 * Восстанавливает данные из резервной копии
 * @returns {boolean} Успешность операции
 */
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

/**
 * Удаляет резервную копию
 */
function removeBackup() {
    try {
        localStorage.removeItem(BACKUP_KEY);
    } catch (error) {
        console.error('Ошибка удаления резервной копии:', error);
    }
}

/**
 * ФУНКЦИИ ДЛЯ РАБОТЫ С ПОСЕЩАЕМОСТЬЮ
 */


function saveAttendance(date, studentId, present) {
    const data = loadData();
    
    // Проверяем существование студента
    if (!data.students[studentId]) {
        showNotification('Студент не найден', 'error');
        return false;
    }
    
    if (!data.attendance[date]) {
        data.attendance[date] = {};
    }
    
    if (present === null) {
        delete data.attendance[date][studentId];
        if (Object.keys(data.attendance[date]).length === 0) {
            delete data.attendance[date];
        }
    } else {
        data.attendance[date][studentId] = present;
    }
    
    return saveData(data);
}

function getAttendanceForDate(date) {
    const data = loadData();
    return data.attendance[date] || {};
}

function getNextStatus(studentId, date) {
    const currentAttendance = getAttendanceForDate(date);
    const currentStatus = currentAttendance[studentId];
    
    if (currentStatus === undefined || currentStatus === null) return true;
    if (currentStatus === true) return false;
    return null;
}


/**
 * ФУНКЦИИ ДЛЯ РАБОТЫ С ГРУППАМИ И СТУДЕНТАМИ
 */

/**
 * Получает все группы и студентов
 * @returns {Object} Объект с группами {groupName: [students]}
 */
function getGroups() {
    const data = loadData();
    return data.groups;
}

/**
 * Получает список названий групп
 * @returns {string[]} Массив названий групп
 */
function getGroupNames() {
    const data = loadData();
    return Object.keys(data.groups);
}

/**
 * Получает студента по ID
 * @param {number} studentId - ID студента
 * @returns {Object|null} Объект студента или null если не найден
 */


/**
 * ФУНКЦИИ ДЛЯ РАБОТЫ СО СТАТИСТИКОЙ
 */


function getStudentStatsForMonth(studentId, year, month) {
    const data = loadData();
    const stats = {
        dailyRecords: [],
        month: `${year}-${month.toString().padStart(2, '0')}`
    };
    
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
    
    stats.dailyRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    return stats;
}

function getAvailableMonthsForStudent(studentId) {
    const data = loadData();
    const monthsSet = new Set();
    
    Object.keys(data.attendance).forEach(date => {
        if (data.attendance[date][studentId] !== undefined) {
            const [year, month] = date.split('-');
            monthsSet.add(`${year}-${month}`);
        }
    });
    
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
}

/**
 * Получает общую статистику студента (все время)
 * @param {number} studentId - ID студента
 * @returns {Object} Общая статистика студента
 */
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

/**
 * ФУНКЦИИ ЭКСПОРТА И ИМПОРТА ДАННЫХ
 */

/**
 * Экспортирует данные в JSON файл
 */
function exportData() {
    const data = loadData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    showNotification('Данные экспортированы!', 'success');
}

/**
 * Импортирует данные из JSON файла
 * @param {Event} event - Событие выбора файла
 */
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
            
            removeBackup();
        }
    };
    
    reader.onerror = function() {
        showNotification('Ошибка чтения файла', 'error');
        event.target.value = '';
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Сбрасываем input
}

/**
 * ФУНКЦИИ ДЛЯ ОБЕСПЕЧЕНИЯ ЦЕЛОСТНОСТИ ДАННЫХ
 */

/**
 * Проверяет целостность данных
 * @returns {boolean} true если данные целостны
 */
function checkDataIntegrity() {
    const data = loadData();
    
    if (!isValidDataStructure(data)) {
        console.error('Обнаружено повреждение данных');
        return false;
    }
    
    // ПРОВЕРКА 1: Все студенты в группах должны существовать в объекте students
    const allStudentIds = new Set(Object.keys(data.students).map(id => parseInt(id)));
    
    for (const groupName in data.groups) {
        const groupStudentIds = data.groups[groupName];
        
        for (const studentId of groupStudentIds) {
            if (!allStudentIds.has(studentId)) {
                console.warn(`Обнаружен студент ID: ${studentId} в группе "${groupName}", которого нет в общем списке студентов`);
                // Автоматически исправляем: удаляем несуществующего студента из группы
                const index = groupStudentIds.indexOf(studentId);
                if (index !== -1) {
                    groupStudentIds.splice(index, 1);
                    console.log(`Студент ID: ${studentId} удален из группы "${groupName}"`);
                }
            }
        }
    }
    
    // ПРОВЕРКА 2: Все записи посещаемости должны ссылаться на существующих студентов
    for (const date in data.attendance) {
        for (const studentId in data.attendance[date]) {
            const id = parseInt(studentId);
            if (!allStudentIds.has(id)) {
                console.warn(`Обнаружена запись посещаемости для несуществующего студента ID: ${studentId} на дату ${date}`);
                // Автоматически исправляем: удаляем запись посещаемости
                delete data.attendance[date][studentId];
                console.log(`Запись посещаемости для студента ID: ${studentId} на дату ${date} удалена`);
            }
        }
        
        // Если день стал пустым после очистки, удаляем объект дня
        if (Object.keys(data.attendance[date]).length === 0) {
            delete data.attendance[date];
            console.log(`Пустой день ${date} удален`);
        }
    }
    
    // ПРОВЕРКА 3: nextStudentId должен быть больше максимального существующего ID
    if (data.nextStudentId) {
        const maxExistingId = Math.max(...Array.from(allStudentIds), 0);
        if (data.nextStudentId <= maxExistingId) {
            console.warn(`nextStudentId (${data.nextStudentId}) меньше или равен максимальному существующему ID (${maxExistingId})`);
            // Автоматически исправляем: устанавливаем nextStudentId на maxExistingId + 1
            data.nextStudentId = maxExistingId + 1;
            console.log(`nextStudentId установлен в ${data.nextStudentId}`);
        }
    } else {
        // Если nextStudentId отсутствует, создаем его
        const maxExistingId = Math.max(...Array.from(allStudentIds), 0);
        data.nextStudentId = maxExistingId + 1;
        console.log(`nextStudentId создан и установлен в ${data.nextStudentId}`);
    }
    
    // Сохраняем исправленные данные, если были изменения
    if (Object.keys(data).some(key => data[key] !== loadData()[key])) {
        console.log('Применены автоматические исправления целостности данных');
        saveData(data);
    }
    
    return true;
}

/**
 * УТИЛИТЫ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
 */

/**
 * Показывает уведомление пользователю
 * @param {string} message - Текст уведомления
 * @param {string} type - Тип уведомления ('info', 'success', 'error', 'warning')
 */
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

/**
 * ФУНКЦИИ ДЛЯ СИНХРОНИЗАЦИИ И КВОТЫ ХРАНЕНИЯ
 */

let isOperationInProgress = false;

/**
 * Устанавливает статус операции в процессе
 * @param {boolean} status - Статус операции
 */
function setOperationInProgress(status) {
    isOperationInProgress = status;
    sessionStorage.setItem('operationInProgress', status);
}

/**
 * Проверяет наличие незавершенных операций
 */
function checkPendingOperations() {
    const wasOperationInProgress = sessionStorage.getItem('operationInProgress') === 'true';
    if (wasOperationInProgress) {
        showNotification('Обнаружена незавершенная операция. Проверьте целостность данных.', 'warning');
        sessionStorage.removeItem('operationInProgress');
    }
}

/**
 * Настраивает синхронизацию между вкладками браузера
 */
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

/**
 * Проверяет доступное место в хранилище
 * @returns {boolean} true если места достаточно
 */
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

/**
 * Очищает старые данные (старше года)
 */
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