/**
 * Task Pulse - High Reliability & Dynamic To-Do List Application
 */

(function () {
    "use strict";

    // --- State Management ---
    let state = {
        tasks: [],
        filter: "all",
        searchQuery: ""
    };

    const STORAGE_KEY = "task_pulse_tasks_v2";

    // --- DOM Selectors ---
    const taskInput = document.getElementById("taskInput");
    const prioritySelect = document.getElementById("prioritySelect");
    const addTaskBtn = document.getElementById("addTaskBtn");
    const inputError = document.getElementById("inputError");
    
    const searchInput = document.getElementById("searchInput");
    const filterButtons = document.querySelectorAll(".filter-btn");
    
    const taskList = document.getElementById("taskList");
    const emptyState = document.getElementById("emptyState");
    
    const progressBarFill = document.getElementById("progressBarFill");
    const progressPercent = document.getElementById("progressPercent");
    const dateBadge = document.getElementById("dateBadge");
    
    const countAll = document.getElementById("countAll");
    const countActive = document.getElementById("countActive");
    const countCompleted = document.getElementById("countCompleted");
    const statsSummary = document.getElementById("statsSummary");
    const clearCompletedBtn = document.getElementById("clearCompletedBtn");

    // --- Initialize Application ---
    function init() {
        displayCurrentDate();
        loadTasks();
        bindEvents();
        render();
    }

    // --- Display Today's Date ---
    function displayCurrentDate() {
        if (!dateBadge) return;
        const options = { weekday: "short", month: "short", day: "numeric" };
        const today = new Date();
        dateBadge.textContent = today.toLocaleDateString("en-US", options);
    }

    // --- Event Listeners ---
    function bindEvents() {
        // Add task handlers
        addTaskBtn.addEventListener("click", handleAddTask);
        taskInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                handleAddTask();
            }
            if (inputError && !inputError.hidden) {
                inputError.hidden = true;
            }
        });

        // Search handler
        searchInput.addEventListener("input", (e) => {
            state.searchQuery = e.target.value.toLowerCase().trim();
            render();
        });

        // Filter tabs handler
        filterButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                filterButtons.forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                state.filter = btn.dataset.filter;
                render();
            });
        });

        // Clear completed tasks
        clearCompletedBtn.addEventListener("click", () => {
            state.tasks = state.tasks.filter((t) => !t.completed);
            saveTasks();
            render();
        });
    }

    // --- Handle New Task Creation ---
    function handleAddTask() {
        const text = taskInput.value.trim();
        const priority = prioritySelect.value;

        if (!text) {
            if (inputError) inputError.hidden = false;
            taskInput.focus();
            return;
        }

        if (inputError) inputError.hidden = true;

        const newTask = {
            id: generateId(),
            text: text,
            priority: priority, // 'high', 'medium', 'low'
            completed: false,
            createdAt: Date.now()
        };

        state.tasks.unshift(newTask);
        saveTasks();
        
        taskInput.value = "";
        taskInput.focus();
        render();
    }

    // --- Task Actions: Toggle, Delete, Edit ---
    function toggleTask(id) {
        state.tasks = state.tasks.map((task) => {
            if (task.id === id) {
                return { ...task, completed: !task.completed };
            }
            return task;
        });
        saveTasks();
        render();
    }

    function deleteTask(id) {
        state.tasks = state.tasks.filter((task) => task.id !== id);
        saveTasks();
        render();
    }

    function updateTaskText(id, newText) {
        const trimmed = newText.trim();
        if (!trimmed) {
            deleteTask(id);
            return;
        }

        state.tasks = state.tasks.map((task) => {
            if (task.id === id) {
                return { ...task, text: trimmed };
            }
            return task;
        });
        saveTasks();
        render();
    }

    // --- Main Render Function ---
    function render() {
        // Filter tasks according to selected tab and search term
        const filteredTasks = getFilteredTasks();

        // Sort tasks: Non-completed first, then by Priority weight (high > medium > low), then recent
        const sortedTasks = sortTasks(filteredTasks);

        // Render Task List DOM
        renderTaskList(sortedTasks);

        // Update Statistics Counters & Progress Bar
        updateStats();
    }

    function getFilteredTasks() {
        return state.tasks.filter((task) => {
            const matchesFilter =
                state.filter === "all" ||
                (state.filter === "active" && !task.completed) ||
                (state.filter === "completed" && task.completed);

            const matchesSearch =
                !state.searchQuery ||
                task.text.toLowerCase().includes(state.searchQuery);

            return matchesFilter && matchesSearch;
        });
    }

    function sortTasks(tasks) {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return [...tasks].sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
            if (pDiff !== 0) return pDiff;
            return b.createdAt - a.createdAt;
        });
    }

    function renderTaskList(tasks) {
        taskList.innerHTML = "";

        if (tasks.length === 0) {
            emptyState.style.display = "flex";
        } else {
            emptyState.style.display = "none";
            tasks.forEach((task) => {
                const li = createTaskNode(task);
                taskList.appendChild(li);
            });
        }
    }

    // --- Construct Single Task DOM Node ---
    function createTaskNode(task) {
        const li = document.createElement("li");
        li.className = `task-item ${task.completed ? "completed" : ""}`;
        li.dataset.id = task.id;

        // Custom Checkbox
        const checkbox = document.createElement("button");
        checkbox.className = "custom-checkbox";
        checkbox.title = task.completed ? "Mark as active" : "Mark as completed";
        checkbox.innerHTML = `
            <svg class="checkbox-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
        checkbox.addEventListener("click", () => toggleTask(task.id));

        // Task Content Wrapper
        const contentWrapper = document.createElement("div");
        contentWrapper.className = "task-content";

        const textSpan = document.createElement("span");
        textSpan.className = "task-text";
        textSpan.textContent = task.text;

        // Double click to edit task
        textSpan.addEventListener("dblclick", () => enableInlineEdit(contentWrapper, task));

        contentWrapper.appendChild(textSpan);

        // Priority Grading Badge
        const priorityBadge = document.createElement("span");
        priorityBadge.className = `priority-badge ${task.priority}`;
        priorityBadge.textContent = task.priority;

        // Action Buttons (Edit, Delete)
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "item-actions";

        // Edit Button
        const editBtn = document.createElement("button");
        editBtn.className = "btn-icon edit";
        editBtn.title = "Edit task";
        editBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
        `;
        editBtn.addEventListener("click", () => enableInlineEdit(contentWrapper, task));

        // Delete Button
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn-icon delete";
        deleteBtn.title = "Delete task";
        deleteBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        `;
        deleteBtn.addEventListener("click", () => deleteTask(task.id));

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);

        // Assemble Item
        li.appendChild(checkbox);
        li.appendChild(contentWrapper);
        li.appendChild(priorityBadge);
        li.appendChild(actionsDiv);

        return li;
    }

    // Inline Edit Mode Functionality
    function enableInlineEdit(container, task) {
        container.innerHTML = "";
        const editInput = document.createElement("input");
        editInput.type = "text";
        editInput.className = "edit-input";
        editInput.value = task.text;

        const saveEdit = () => {
            updateTaskText(task.id, editInput.value);
        };

        editInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                saveEdit();
            } else if (e.key === "Escape") {
                render();
            }
        });

        editInput.addEventListener("blur", saveEdit);

        container.appendChild(editInput);
        editInput.focus();
        editInput.select();
    }

    // --- Update Metrics & Progress Bar ---
    function updateStats() {
        const total = state.tasks.length;
        const active = state.tasks.filter((t) => !t.completed).length;
        const completed = state.tasks.filter((t) => t.completed).length;

        // Badge Counters
        countAll.textContent = total;
        countActive.textContent = active;
        countCompleted.textContent = completed;

        // Stats summary text
        statsSummary.textContent = `${active} item${active === 1 ? "" : "s"} remaining`;

        // Progress bar percentage
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
        progressBarFill.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
    }

    // --- Storage Layer ---
    function saveTasks() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
        } catch (e) {
            console.error("Failed to save tasks to local storage:", e);
        }
    }

    function loadTasks() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                state.tasks = JSON.parse(raw);
            } else {
                // Pre-populate with clean sample tasks if empty for demo
                state.tasks = [
                    { id: generateId(), text: "Design modern gradient UI layout", priority: "high", completed: true, createdAt: Date.now() - 3000 },
                    { id: generateId(), text: "Setup task priority grading system", priority: "medium", completed: false, createdAt: Date.now() - 2000 },
                    { id: generateId(), text: "Review spacing and mobile responsiveness", priority: "low", completed: false, createdAt: Date.now() - 1000 }
                ];
                saveTasks();
            }
        } catch (e) {
            console.error("Failed to parse local storage tasks:", e);
            state.tasks = [];
        }
    }

    // --- Helper Utility: Unique ID Generator ---
    function generateId() {
        return "task_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
    }

    // Launch application when DOM ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
