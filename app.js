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
        studentCard.onclick = () => toggleAttendance(student.id, studentCard);
        
        studentCard.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-medium text-gray-800">${student.name}</span>
                <div class="flex items-center">
                    <span class="text-2xl mr-2 student-status">
                        ${present === true ? '✅' : present === false ? '❌' : '⬜'}
                    </span>
                </div>
            </div>
        `;
        
        container.appendChild(studentCard);
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
    
    // Назначаем обработчики событий
    dateSelector.addEventListener('change', updateAttendanceList);
    document.getElementById('group-selector').addEventListener('change', updateAttendanceList);
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('import-file').addEventListener('change', importData);
    
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