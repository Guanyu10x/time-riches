// 全局状态管理
class AppState {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('timeRichesTasks')) || [];
        this.timeEntries = JSON.parse(localStorage.getItem('timeRichesTimeEntries')) || [];
        this.categories = JSON.parse(localStorage.getItem('timeRichesCategories')) || [
            { id: 'work', name: '工作', color: '#6366f1' },
            { id: 'study', name: '学习', color: '#8b5cf6' },
            { id: 'personal', name: '个人', color: '#10b981' },
            { id: 'health', name: '健康', color: '#f59e0b' }
        ];
        this.settings = JSON.parse(localStorage.getItem('timeRichesSettings')) || {
            theme: 'light',
            pomodoroWork: 25,
            pomodoroBreak: 5,
            pomodoroLongBreak: 15
        };
        this.currentPage = 'dashboard';
        this.timer = {
            isRunning: false,
            isPaused: false,
            timeLeft: 25 * 60, // 秒
            mode: 'work', // work, break, longBreak
            interval: null
        };
    }

    save() {
        localStorage.setItem('timeRichesTasks', JSON.stringify(this.tasks));
        localStorage.setItem('timeRichesTimeEntries', JSON.stringify(this.timeEntries));
        localStorage.setItem('timeRichesCategories', JSON.stringify(this.categories));
        localStorage.setItem('timeRichesSettings', JSON.stringify(this.settings));
    }

    addTask(task) {
        const newTask = {
            id: Date.now().toString(),
            ...task,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.tasks.push(newTask);
        this.save();
        return newTask;
    }

    updateTask(id, updates) {
        const index = this.tasks.findIndex(task => task.id === id);
        if (index !== -1) {
            this.tasks[index] = { ...this.tasks[index], ...updates, updatedAt: new Date().toISOString() };
            this.save();
            return this.tasks[index];
        }
        return null;
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.save();
    }

    addTimeEntry(entry) {
        const newEntry = {
            id: Date.now().toString(),
            ...entry,
            createdAt: new Date().toISOString()
        };
        this.timeEntries.push(newEntry);
        this.save();
        return newEntry;
    }

    getTodayTasks() {
        const today = new Date().toDateString();
        return this.tasks.filter(task => {
            if (!task.dueDate) return false;
            return new Date(task.dueDate).toDateString() === today;
        });
    }

    getTasksByStatus(status) {
        return this.tasks.filter(task => task.status === status);
    }

    getTasksByCategory(categoryId) {
        return this.tasks.filter(task => task.categoryId === categoryId);
    }

    getTimeEntriesByDate(date) {
        const targetDate = new Date(date).toDateString();
        return this.timeEntries.filter(entry => {
            const entryDate = new Date(entry.startTime).toDateString();
            return entryDate === targetDate;
        });
    }

    getTodayStats() {
        const today = new Date().toDateString();
        const todayTasks = this.getTodayTasks();
        const todayTimeEntries = this.getTimeEntriesByDate(new Date());
        
        const completedTasks = todayTasks.filter(task => task.status === 'completed').length;
        const totalTasks = todayTasks.length;
        const focusTime = todayTimeEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
        const productivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
            completedTasks,
            totalTasks,
            focusTime: Math.round(focusTime / 60 * 10) / 10, // 转换为小时，保留一位小数
            productivity
        };
    }
}

// 初始化应用
const app = new AppState();

// DOM 元素
const elements = {
    // 导航
    navLinks: document.querySelectorAll('.nav-link'),
    themeToggle: document.getElementById('themeToggle'),
    
    // 页面
    pages: document.querySelectorAll('.page'),
    
    // 番茄工作法
    timerMinutes: document.getElementById('timerMinutes'),
    timerSeconds: document.getElementById('timerSeconds'),
    timerMode: document.getElementById('timerMode'),
    startTimer: document.getElementById('startTimer'),
    pauseTimer: document.getElementById('pauseTimer'),
    resetTimer: document.getElementById('resetTimer'),
    
    // 任务
    todayTasks: document.getElementById('todayTasks'),
    allTasks: document.getElementById('allTasks'),
    taskSearch: document.getElementById('taskSearch'),
    taskFilter: document.getElementById('taskFilter'),
    addTask: document.getElementById('addTask'),
    addQuickTask: document.getElementById('addQuickTask'),
    
    // 统计
    completedTasks: document.getElementById('completedTasks'),
    focusTime: document.getElementById('focusTime'),
    productivity: document.getElementById('productivity'),
    
    // 快速操作
    quickAddTask: document.getElementById('quickAddTask'),
    quickStartTimer: document.getElementById('quickStartTimer'),
    quickViewCalendar: document.getElementById('quickViewCalendar'),
    quickViewStats: document.getElementById('quickViewStats'),
    
    // 模态框
    taskModal: document.getElementById('taskModal'),
    modalTitle: document.getElementById('modalTitle'),
    closeModal: document.getElementById('closeModal'),
    cancelTask: document.getElementById('cancelTask'),
    saveTask: document.getElementById('saveTask'),
    taskForm: document.getElementById('taskForm'),
    
    // 表单字段
    taskTitle: document.getElementById('taskTitle'),
    taskDescription: document.getElementById('taskDescription'),
    taskPriority: document.getElementById('taskPriority'),
    taskDueDate: document.getElementById('taskDueDate'),
    taskCategory: document.getElementById('taskCategory'),
    
    // 日历
    currentMonth: document.getElementById('currentMonth'),
    prevMonth: document.getElementById('prevMonth'),
    nextMonth: document.getElementById('nextMonth'),
    calendarView: document.getElementById('calendarView'),
    
    // 图表
    timeDistributionChart: document.getElementById('timeDistributionChart'),
    productivityTrendChart: document.getElementById('productivityTrendChart'),
    taskCompletionChart: document.getElementById('taskCompletionChart'),
    
    // 统计摘要
    totalTasks: document.getElementById('totalTasks'),
    totalFocusTime: document.getElementById('totalFocusTime'),
    avgProductivity: document.getElementById('avgProductivity'),
    streakDays: document.getElementById('streakDays')
};

// 工具函数
const utils = {
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return {
            minutes: mins.toString().padStart(2, '0'),
            seconds: secs.toString().padStart(2, '0')
        };
    },

    formatDate(date) {
        return new Date(date).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    formatTimeDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    },

    getPriorityColor(priority) {
        const colors = {
            low: '#10b981',
            medium: '#f59e0b',
            high: '#ef4444'
        };
        return colors[priority] || colors.medium;
    },

    getCategoryColor(categoryId) {
        const category = app.categories.find(cat => cat.id === categoryId);
        return category ? category.color : '#6366f1';
    },

    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }
};

// 页面管理
class PageManager {
    showPage(pageId) {
        // 隐藏所有页面
        elements.pages.forEach(page => page.classList.remove('active'));
        
        // 显示目标页面
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // 更新导航状态
        elements.navLinks.forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`[data-page="${pageId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        app.currentPage = pageId;
        
        // 页面特定的初始化
        this.initializePage(pageId);
    }

    initializePage(pageId) {
        switch (pageId) {
            case 'dashboard':
                this.initializeDashboard();
                break;
            case 'tasks':
                this.initializeTasks();
                break;
            case 'calendar':
                this.initializeCalendar();
                break;
            case 'analytics':
                this.initializeAnalytics();
                break;
        }
    }

    initializeDashboard() {
        this.renderTodayTasks();
        this.updateDashboardStats();
    }

    initializeTasks() {
        this.renderAllTasks();
    }

    initializeCalendar() {
        this.renderCalendar();
    }

    initializeAnalytics() {
        this.renderCharts();
        this.updateAnalyticsStats();
    }
}

// 番茄工作法管理
class PomodoroManager {
    start() {
        if (app.timer.isPaused) {
            this.resume();
        } else {
            this.reset();
            app.timer.isRunning = true;
            app.timer.isPaused = false;
        }
        
        app.timer.interval = setInterval(() => {
            this.tick();
        }, 1000);
        
        this.updateUI();
    }

    pause() {
        app.timer.isRunning = false;
        app.timer.isPaused = true;
        clearInterval(app.timer.interval);
        this.updateUI();
    }

    resume() {
        app.timer.isRunning = true;
        app.timer.isPaused = false;
        app.timer.interval = setInterval(() => {
            this.tick();
        }, 1000);
        this.updateUI();
    }

    reset() {
        app.timer.isRunning = false;
        app.timer.isPaused = false;
        clearInterval(app.timer.interval);
        
        // 根据模式设置时间
        switch (app.timer.mode) {
            case 'work':
                app.timer.timeLeft = app.settings.pomodoroWork * 60;
                break;
            case 'break':
                app.timer.timeLeft = app.settings.pomodoroBreak * 60;
                break;
            case 'longBreak':
                app.timer.timeLeft = app.settings.pomodoroLongBreak * 60;
                break;
        }
        
        this.updateUI();
    }

    tick() {
        if (app.timer.timeLeft > 0) {
            app.timer.timeLeft--;
            this.updateUI();
        } else {
            this.complete();
        }
    }

    complete() {
        clearInterval(app.timer.interval);
        app.timer.isRunning = false;
        app.timer.isPaused = false;
        
        // 播放提示音
        this.playNotification();
        
        // 记录时间条目
        this.recordTimeEntry();
        
        // 切换到下一个模式
        this.switchMode();
        
        this.updateUI();
    }

    switchMode() {
        if (app.timer.mode === 'work') {
            // 检查是否应该进入长休息
            const completedWorkSessions = app.timeEntries.filter(entry => 
                entry.type === 'pomodoro' && entry.mode === 'work'
            ).length;
            
            if (completedWorkSessions % 4 === 0) {
                app.timer.mode = 'longBreak';
            } else {
                app.timer.mode = 'break';
            }
        } else {
            app.timer.mode = 'work';
        }
        
        this.reset();
    }

    recordTimeEntry() {
        const duration = this.getModeDuration() - app.timer.timeLeft;
        app.addTimeEntry({
            type: 'pomodoro',
            mode: app.timer.mode,
            duration: duration,
            startTime: new Date(Date.now() - duration * 1000).toISOString(),
            endTime: new Date().toISOString()
        });
    }

    getModeDuration() {
        switch (app.timer.mode) {
            case 'work':
                return app.settings.pomodoroWork * 60;
            case 'break':
                return app.settings.pomodoroBreak * 60;
            case 'longBreak':
                return app.settings.pomodoroLongBreak * 60;
            default:
                return 25 * 60;
        }
    }

    playNotification() {
        // 创建音频上下文播放提示音
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('无法播放提示音:', error);
        }
    }

    updateUI() {
        const time = utils.formatTime(app.timer.timeLeft);
        elements.timerMinutes.textContent = time.minutes;
        elements.timerSeconds.textContent = time.seconds;
        
        const modeText = {
            work: '专注时间',
            break: '短休息',
            longBreak: '长休息'
        };
        elements.timerMode.textContent = modeText[app.timer.mode] || '专注时间';
        
        // 更新按钮状态
        elements.startTimer.disabled = app.timer.isRunning;
        elements.pauseTimer.disabled = !app.timer.isRunning;
        
        if (app.timer.isRunning) {
            elements.startTimer.innerHTML = '<i class="fas fa-pause"></i> 暂停';
        } else if (app.timer.isPaused) {
            elements.startTimer.innerHTML = '<i class="fas fa-play"></i> 继续';
        } else {
            elements.startTimer.innerHTML = '<i class="fas fa-play"></i> 开始';
        }
    }
}

// 任务管理
class TaskManager {
    renderTodayTasks() {
        const todayTasks = app.getTodayTasks();
        elements.todayTasks.innerHTML = '';
        
        if (todayTasks.length === 0) {
            elements.todayTasks.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-day"></i>
                    <h3>今天没有任务</h3>
                    <p>添加一些任务来开始高效的一天吧！</p>
                    <button class="btn btn-primary" onclick="taskManager.showAddTaskModal()">
                        <i class="fas fa-plus"></i> 添加任务
                    </button>
                </div>
            `;
            return;
        }
        
        todayTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            elements.todayTasks.appendChild(taskElement);
        });
    }

    renderAllTasks() {
        const tasks = app.tasks;
        const searchTerm = elements.taskSearch.value.toLowerCase();
        const statusFilter = elements.taskFilter.value;
        
        let filteredTasks = tasks;
        
        // 搜索过滤
        if (searchTerm) {
            filteredTasks = filteredTasks.filter(task => 
                task.title.toLowerCase().includes(searchTerm) ||
                (task.description && task.description.toLowerCase().includes(searchTerm))
            );
        }
        
        // 状态过滤
        if (statusFilter !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
        }
        
        elements.allTasks.innerHTML = '';
        
        if (filteredTasks.length === 0) {
            elements.allTasks.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>没有找到任务</h3>
                    <p>${searchTerm || statusFilter !== 'all' ? '尝试调整搜索条件' : '创建你的第一个任务'}</p>
                    <button class="btn btn-primary" onclick="taskManager.showAddTaskModal()">
                        <i class="fas fa-plus"></i> 添加任务
                    </button>
                </div>
            `;
            return;
        }
        
        // 按状态分组
        const groupedTasks = {
            todo: filteredTasks.filter(task => task.status === 'todo'),
            in_progress: filteredTasks.filter(task => task.status === 'in_progress'),
            completed: filteredTasks.filter(task => task.status === 'completed')
        };
        
        // 渲染每个分组
        Object.entries(groupedTasks).forEach(([status, tasks]) => {
            if (tasks.length === 0) return;
            
            const statusTitle = {
                todo: '待办',
                in_progress: '进行中',
                completed: '已完成'
            };
            
            const groupElement = document.createElement('div');
            groupElement.className = 'task-group';
            groupElement.innerHTML = `
                <h4 class="task-group-title">${statusTitle[status]} (${tasks.length})</h4>
                <div class="task-group-content"></div>
            `;
            
            const groupContent = groupElement.querySelector('.task-group-content');
            tasks.forEach(task => {
                const taskElement = this.createTaskElement(task);
                groupContent.appendChild(taskElement);
            });
            
            elements.allTasks.appendChild(groupElement);
        });
    }

    createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.status === 'completed' ? 'completed' : ''}`;
        taskElement.innerHTML = `
            <div class="task-checkbox ${task.status === 'completed' ? 'checked' : ''}" 
                 onclick="taskManager.toggleTaskStatus('${task.id}')">
                ${task.status === 'completed' ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="task-content">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                    <span class="task-priority ${task.priority}">${this.getPriorityText(task.priority)}</span>
                    <span class="task-category" style="color: ${utils.getCategoryColor(task.categoryId)}">
                        ${this.getCategoryName(task.categoryId)}
                    </span>
                    ${task.dueDate ? `<span class="task-due">截止: ${utils.formatDate(task.dueDate)}</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="btn btn-sm btn-outline" onclick="taskManager.editTask('${task.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline" onclick="taskManager.deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        return taskElement;
    }

    getPriorityText(priority) {
        const texts = {
            low: '低',
            medium: '中',
            high: '高'
        };
        return texts[priority] || '中';
    }

    getCategoryName(categoryId) {
        const category = app.categories.find(cat => cat.id === categoryId);
        return category ? category.name : '未分类';
    }

    toggleTaskStatus(taskId) {
        const task = app.tasks.find(t => t.id === taskId);
        if (task) {
            const newStatus = task.status === 'completed' ? 'todo' : 'completed';
            app.updateTask(taskId, { status: newStatus });
            this.renderTodayTasks();
            this.renderAllTasks();
            pageManager.updateDashboardStats();
        }
    }

    editTask(taskId) {
        const task = app.tasks.find(t => t.id === taskId);
        if (task) {
            this.showAddTaskModal(task);
        }
    }

    deleteTask(taskId) {
        if (confirm('确定要删除这个任务吗？')) {
            app.deleteTask(taskId);
            this.renderTodayTasks();
            this.renderAllTasks();
            pageManager.updateDashboardStats();
        }
    }

    showAddTaskModal(task = null) {
        elements.modalTitle.textContent = task ? '编辑任务' : '新建任务';
        elements.taskModal.classList.add('active');
        
        if (task) {
            elements.taskTitle.value = task.title;
            elements.taskDescription.value = task.description || '';
            elements.taskPriority.value = task.priority;
            elements.taskDueDate.value = task.dueDate ? task.dueDate.split('T')[0] : '';
            elements.taskCategory.value = task.categoryId;
        } else {
            elements.taskForm.reset();
        }
        
        // 设置当前编辑的任务ID
        elements.taskForm.dataset.taskId = task ? task.id : '';
    }

    hideAddTaskModal() {
        elements.taskModal.classList.remove('active');
        elements.taskForm.reset();
        elements.taskForm.dataset.taskId = '';
    }

    saveTask() {
        const taskData = {
            title: elements.taskTitle.value.trim(),
            description: elements.taskDescription.value.trim(),
            priority: elements.taskPriority.value,
            dueDate: elements.taskDueDate.value ? new Date(elements.taskDueDate.value).toISOString() : null,
            categoryId: elements.taskCategory.value,
            status: 'todo'
        };
        
        if (!taskData.title) {
            alert('请输入任务标题');
            return;
        }
        
        const taskId = elements.taskForm.dataset.taskId;
        if (taskId) {
            app.updateTask(taskId, taskData);
        } else {
            app.addTask(taskData);
        }
        
        this.hideAddTaskModal();
        this.renderTodayTasks();
        this.renderAllTasks();
        pageManager.updateDashboardStats();
    }
}

// 日历管理
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.view = 'month';
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        elements.currentMonth.textContent = `${year}年${month + 1}月`;
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const calendarHTML = this.generateCalendarHTML(startDate, lastDay);
        elements.calendarView.innerHTML = calendarHTML;
        
        this.attachCalendarEvents();
    }

    generateCalendarHTML(startDate, lastDay) {
        const days = ['日', '一', '二', '三', '四', '五', '六'];
        const today = new Date();
        
        let html = '<div class="calendar-header">';
        days.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        html += '</div>';
        
        html += '<div class="calendar-body">';
        
        const currentDate = new Date(startDate);
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
        
        while (currentDate <= endDate) {
            const isCurrentMonth = currentDate.getMonth() === this.currentDate.getMonth();
            const isToday = currentDate.toDateString() === today.toDateString();
            
            const dayClass = [
                'calendar-day',
                !isCurrentMonth ? 'other-month' : '',
                isToday ? 'today' : ''
            ].filter(Boolean).join(' ');
            
            const dayEvents = this.getDayEvents(currentDate);
            
            html += `
                <div class="calendar-day ${dayClass}" data-date="${currentDate.toISOString().split('T')[0]}">
                    <div class="calendar-day-number">${currentDate.getDate()}</div>
                    <div class="calendar-events">
                        ${dayEvents.map(event => `
                            <div class="calendar-event" style="background-color: ${utils.getCategoryColor(event.categoryId)}">
                                ${event.title}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        html += '</div>';
        return html;
    }

    getDayEvents(date) {
        const dateStr = date.toISOString().split('T')[0];
        return app.tasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
            return taskDate === dateStr;
        });
    }

    attachCalendarEvents() {
        const dayElements = document.querySelectorAll('.calendar-day');
        dayElements.forEach(dayElement => {
            dayElement.addEventListener('click', () => {
                const date = dayElement.dataset.date;
                this.showDayDetails(date);
            });
        });
    }

    showDayDetails(date) {
        const dayTasks = this.getDayEvents(new Date(date));
        // 这里可以实现显示某一天的任务详情的功能
        console.log(`显示 ${date} 的任务:`, dayTasks);
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    }
}

// 图表管理
class ChartManager {
    renderCharts() {
        this.renderTimeDistributionChart();
        this.renderProductivityTrendChart();
        this.renderTaskCompletionChart();
    }

    renderTimeDistributionChart() {
        const ctx = elements.timeDistributionChart.getContext('2d');
        const categoryData = this.getCategoryTimeData();
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.data,
                    backgroundColor: categoryData.colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderProductivityTrendChart() {
        const ctx = elements.productivityTrendChart.getContext('2d');
        const trendData = this.getProductivityTrendData();
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.labels,
                datasets: [{
                    label: '效率评分',
                    data: trendData.data,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    renderTaskCompletionChart() {
        const ctx = elements.taskCompletionChart.getContext('2d');
        const completionData = this.getTaskCompletionData();
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: completionData.labels,
                datasets: [{
                    label: '完成任务数',
                    data: completionData.data,
                    backgroundColor: '#10b981',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    getCategoryTimeData() {
        const categoryStats = {};
        
        app.timeEntries.forEach(entry => {
            const categoryId = entry.categoryId || 'work';
            if (!categoryStats[categoryId]) {
                categoryStats[categoryId] = 0;
            }
            categoryStats[categoryId] += entry.duration || 0;
        });
        
        const labels = [];
        const data = [];
        const colors = [];
        
        Object.entries(categoryStats).forEach(([categoryId, time]) => {
            const category = app.categories.find(cat => cat.id === categoryId);
            labels.push(category ? category.name : '未分类');
            data.push(Math.round(time / 60 * 10) / 10); // 转换为小时
            colors.push(category ? category.color : '#6366f1');
        });
        
        return { labels, data, colors };
    }

    getProductivityTrendData() {
        // 生成最近7天的效率数据
        const labels = [];
        const data = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
            
            const dayTasks = app.tasks.filter(task => {
                if (!task.dueDate) return false;
                const taskDate = new Date(task.dueDate).toDateString();
                return taskDate === date.toDateString();
            });
            
            const completedTasks = dayTasks.filter(task => task.status === 'completed').length;
            const productivity = dayTasks.length > 0 ? Math.round((completedTasks / dayTasks.length) * 100) : 0;
            data.push(productivity);
        }
        
        return { labels, data };
    }

    getTaskCompletionData() {
        // 生成最近7天的任务完成数据
        const labels = [];
        const data = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
            
            const dayTasks = app.tasks.filter(task => {
                if (!task.dueDate) return false;
                const taskDate = new Date(task.dueDate).toDateString();
                return taskDate === date.toDateString() && task.status === 'completed';
            });
            
            data.push(dayTasks.length);
        }
        
        return { labels, data };
    }
}

// 初始化管理器实例
const pageManager = new PageManager();
const pomodoroManager = new PomodoroManager();
const taskManager = new TaskManager();
const calendarManager = new CalendarManager();
const chartManager = new ChartManager();

// 事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // 初始化主题
    initializeTheme();
    
    // 导航事件
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.dataset.page;
            pageManager.showPage(pageId);
        });
    });
    
    // 主题切换
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // 番茄工作法事件
    elements.startTimer.addEventListener('click', () => {
        if (app.timer.isRunning) {
            pomodoroManager.pause();
        } else {
            pomodoroManager.start();
        }
    });
    
    elements.pauseTimer.addEventListener('click', () => pomodoroManager.pause());
    elements.resetTimer.addEventListener('click', () => pomodoroManager.reset());
    
    // 任务管理事件
    elements.addTask.addEventListener('click', () => taskManager.showAddTaskModal());
    elements.addQuickTask.addEventListener('click', () => taskManager.showAddTaskModal());
    elements.quickAddTask.addEventListener('click', () => taskManager.showAddTaskModal());
    
    elements.taskSearch.addEventListener('input', () => taskManager.renderAllTasks());
    elements.taskFilter.addEventListener('change', () => taskManager.renderAllTasks());
    
    // 模态框事件
    elements.closeModal.addEventListener('click', () => taskManager.hideAddTaskModal());
    elements.cancelTask.addEventListener('click', () => taskManager.hideAddTaskModal());
    elements.saveTask.addEventListener('click', () => taskManager.saveTask());
    
    // 日历事件
    elements.prevMonth.addEventListener('click', () => calendarManager.previousMonth());
    elements.nextMonth.addEventListener('click', () => calendarManager.nextMonth());
    
    // 快速操作事件
    elements.quickStartTimer.addEventListener('click', () => {
        pageManager.showPage('dashboard');
        pomodoroManager.start();
    });
    
    elements.quickViewCalendar.addEventListener('click', () => pageManager.showPage('calendar'));
    elements.quickViewStats.addEventListener('click', () => pageManager.showPage('analytics'));
    
    // 初始化默认页面
    pageManager.showPage('dashboard');
});

// 主题管理
function initializeTheme() {
    const savedTheme = app.settings.theme;
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    app.settings.theme = newTheme;
    app.save();
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = elements.themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// 扩展 PageManager 的方法
PageManager.prototype.updateDashboardStats = function() {
    const stats = app.getTodayStats();
    elements.completedTasks.textContent = stats.completedTasks;
    elements.focusTime.textContent = `${stats.focusTime}h`;
    elements.productivity.textContent = `${stats.productivity}%`;
};

PageManager.prototype.updateAnalyticsStats = function() {
    const totalTasks = app.tasks.length;
    const totalFocusTime = app.timeEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
    const avgProductivity = app.tasks.length > 0 ? 
        Math.round((app.tasks.filter(task => task.status === 'completed').length / app.tasks.length) * 100) : 0;
    
    elements.totalTasks.textContent = totalTasks;
    elements.totalFocusTime.textContent = utils.formatTimeDuration(totalFocusTime);
    elements.avgProductivity.textContent = `${avgProductivity}%`;
    elements.streakDays.textContent = this.calculateStreakDays();
};

PageManager.prototype.calculateStreakDays = function() {
    // 简单的连续天数计算
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const dayTasks = app.tasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate).toDateString();
            return taskDate === date.toDateString();
        });
        
        const hasCompletedTasks = dayTasks.some(task => task.status === 'completed');
        
        if (hasCompletedTasks) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }
    
    return streak;
};

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    // ESC 关闭模态框
    if (e.key === 'Escape' && elements.taskModal.classList.contains('active')) {
        taskManager.hideAddTaskModal();
    }
    
    // Ctrl/Cmd + N 新建任务
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        taskManager.showAddTaskModal();
    }
    
    // Ctrl/Cmd + K 搜索任务
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        elements.taskSearch.focus();
    }
});

// 窗口失焦时暂停计时器
window.addEventListener('blur', function() {
    if (app.timer.isRunning) {
        pomodoroManager.pause();
    }
});

// 窗口获得焦点时恢复计时器
window.addEventListener('focus', function() {
    if (app.timer.isPaused) {
        // 可以选择自动恢复或保持暂停状态
        // pomodoroManager.resume();
    }
});

// 定期保存数据
setInterval(() => {
    app.save();
}, 30000); // 每30秒保存一次

console.log('Time Riches 应用已加载完成！');
