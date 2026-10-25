// =================================================================
// 1. البيانات الافتراضية وهيكل التخزين (تم تفريغ المواد الافتراضية)
// =================================================================
var defaultSubjects = []; // فارغة تماماً لتبدأ المنصة نظيفة

var subjectsList = JSON.parse(localStorage.getItem('my_app_subjects')) || defaultSubjects;
var dataStore = JSON.parse(localStorage.getItem('my_app_dataStore')) || {};
var notesStore = JSON.parse(localStorage.getItem('my_app_notesStore')) || {};

var currentSubjectId = null;

function saveAllToLocalStorage() {
    localStorage.setItem('my_app_subjects', JSON.stringify(subjectsList));
    localStorage.setItem('my_app_dataStore', JSON.stringify(dataStore));
    localStorage.setItem('my_app_notesStore', JSON.stringify(notesStore));
}

// =================================================================
// 2. إدارة الشاشات والتنقل
// =================================================================
var screens = document.querySelectorAll('.app-screen');
var menuHomeBtn = document.getElementById('menu-home-btn');
var otherMenuItems = document.querySelectorAll('.sidebar-menu .menu-item:not(#menu-home-btn)');

function showScreen(screenId) {
    screens.forEach(function(s) { s.classList.remove('active'); });
    var target = document.getElementById(screenId);
    if (target) target.classList.add('active');
}

if (menuHomeBtn) {
    menuHomeBtn.addEventListener('click', function() {
        var activeMenu = document.querySelector('.menu-item.active');
        if (activeMenu) activeMenu.classList.remove('active');
        menuHomeBtn.classList.add('active');
        showScreen('subjects-screen');
        renderSubjectsGrid();
    });
}

otherMenuItems.forEach(function(item) {
    item.addEventListener('click', function() {
        var activeMenu = document.querySelector('.menu-item.active');
        if (activeMenu) activeMenu.classList.remove('active');
        item.classList.add('active');
        var targetId = item.getAttribute('data-screen');
        showScreen(targetId);
    });
});

var backBtn = document.getElementById('back-from-detail-btn');
if (backBtn) {
    backBtn.addEventListener('click', function() {
        var activeMenu = document.querySelector('.menu-item.active');
        if (activeMenu) activeMenu.classList.remove('active');
        if (menuHomeBtn) menuHomeBtn.classList.add('active');
        showScreen('subjects-screen');
        renderSubjectsGrid();
    });
}

// =================================================================
// 3. بناء شبكة المواد وتوليد المواد ديناميكياً
// =================================================================
var subjectsGrid = document.getElementById('subjects-grid');
var addSubjectBtn = document.getElementById('add-subject-btn');

function renderSubjectsGrid() {
    if (!subjectsGrid) return;
    subjectsGrid.innerHTML = "";

    if (subjectsList.length === 0) {
        subjectsGrid.innerHTML = '<p style="color: #94a3b8; grid-column: 1/-1; text-align: center; padding: 40px 0;">لا توجد مواد دراسية مضافة بعد. اضغطي على زر "إضافة مادة جديدة" للبدء!</p>';
        return;
    }

    subjectsList.forEach(function(sub) {
        var lessons = dataStore[sub.id] || [];
        var total = lessons.length;
        var done = lessons.filter(function(l) { return l.completed; }).length;
        var percentage = total === 0 ? 0 : Math.round((done / total) * 100);

        var card = document.createElement('div');
        card.className = 'main-subject-card';
        card.innerHTML =
            '<button class="delete-subject-btn" title="حذف المادة">🗑</button>' +
            '<div class="card-icon">' + sub.icon + '</div>' +
            '<h3>' + sub.name + '</h3>' +
            '<p class="card-stats">إنجاز ' + done + ' من ' + total + ' دروس</p>' +
            '<div class="progress-bar-bg">' +
            '<div class="progress-fill" style="width: ' + percentage + '%;"></div>' +
            '</div>' +
            '<span class="pct-text">' + percentage + '%</span>';
        card.addEventListener('click', function(e) {
            if (e.target.classList.contains('delete-subject-btn')) return;
            openSubjectDetail(sub);
        });

        var deleteBtn = card.querySelector('.delete-subject-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm("هل أنتِ متأكدة من حذف مادة (" + sub.name + ") وكل دروسها وملاحظاتها؟")) {
                    subjectsList = subjectsList.filter(function(s) { return s.id !== sub.id; });
                    delete dataStore[sub.id];
                    delete notesStore[sub.id];
                    saveAllToLocalStorage();
                    renderSubjectsGrid();
                }
            });
        }

        subjectsGrid.appendChild(card);
    });
}

if (addSubjectBtn) {
    addSubjectBtn.addEventListener('click', function() {
        var name = prompt("ادخلي اسم المادة الجديدة:");
        if (!name || name.trim() === "") return;

        var icon = prompt("ادخلي رمز أو إيموجي للمادة:", "📚");
        if (!icon || icon.trim() === "") icon = "📚";

        var id = 'sub_' + Date.now();
        var newSubject = { id: id, name: name.trim(), icon: icon.trim() };

        subjectsList.push(newSubject);
        dataStore[id] = [];
        notesStore[id] = [];

        saveAllToLocalStorage();
        renderSubjectsGrid();
    });
}

// =================================================================
// 4. تفاصيل المادة (إدارة الدروس والملاحظات)
// =================================================================
function openSubjectDetail(sub) {
    currentSubjectId = sub.id;
    var titleElem = document.getElementById('detail-subject-title');
    if (titleElem) titleElem.innerText = "دروس ومحاضرات " + sub.name;
    closeViewer();
    renderDetailLessons();
    renderDetailNotes();
    showScreen('subject-detail-screen');
}

function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = url.match(regExp);
    if (match && match[2].length === 11) {
        return 'https://www.youtube.com/embed/' + match[2];
    }
    return null;
}

var addLessonBtn = document.getElementById('detail-add-lesson-btn');
if (addLessonBtn) {
    addLessonBtn.addEventListener('click', function() {
        if (!currentSubjectId) return;
        var title = prompt("ادخلي اسم أو عنوان الدرس الجديد:");
        if (title && title.trim() !== "") {
            if (!dataStore[currentSubjectId]) dataStore[currentSubjectId] = [];
            dataStore[currentSubjectId].push({
                id: Date.now(),
                title: title.trim(),
                fileUrl: null,
                fileType: null,
                completed: false
            });
            saveAllToLocalStorage();
            renderDetailLessons();
        }
    });
}

var addYtBtn = document.getElementById('detail-add-yt-btn');
if (addYtBtn) {
    addYtBtn.addEventListener('click', function() {
        if (!currentSubjectId) return;
        var title = prompt("ادخلي عنوان الفيديو/المحاضرة:");
        if (!title || title.trim() === "") return;

        var ytUrl = prompt("الصقي رابط فيديو يوتيوب هنا:");
        if (!ytUrl || ytUrl.trim() === "") return;

        var embedUrl = getYouTubeEmbedUrl(ytUrl.trim());
        if (!embedUrl) {
            alert("⚠️ الرابط غير صحيح.");
            return;
        }

        if (!dataStore[currentSubjectId]) dataStore[currentSubjectId] = [];
        dataStore[currentSubjectId].push({
            id: Date.now(),
            title: title.trim(),
            fileUrl: embedUrl,
            fileType: 'youtube',
            completed: false
        });

        saveAllToLocalStorage();
        renderDetailLessons();
    });
}
var fileInput = document.getElementById('detail-file-input');
if (fileInput) {
    fileInput.addEventListener('change', function(e) {
        if (!currentSubjectId) return;
        var files = e.target.files;
        if (files.length === 0) return;

        var file = files[0];
        var objectUrl = URL.createObjectURL ? URL.createObjectURL(file) : "";

        if (!dataStore[currentSubjectId]) dataStore[currentSubjectId] = [];
        dataStore[currentSubjectId].push({
            id: Date.now(),
            title: file.name,
            fileUrl: objectUrl,
            fileType: file.type,
            completed: false
        });

        saveAllToLocalStorage();
        renderDetailLessons();
        e.target.value = "";
    });
}

function renderDetailLessons() {
    var listContainer = document.getElementById('detail-lessons-list');
    if (!listContainer) return;
    listContainer.innerHTML = "";
    var list = dataStore[currentSubjectId] || [];
    list.forEach(function(lecture) {
        var li = document.createElement('li');
        li.className = 'internal-item';
        var isChecked = lecture.completed ? 'checked' : '';
        var icon = lecture.fileType === 'youtube' ? '▶️ ' : '🎬 ';

        li.innerHTML =
            '<div class="internal-item-left">' +
            '<input type="checkbox" class="item-checkbox" ' + isChecked + '> ' +
            '<span class="clickable-title">' + icon + lecture.title + '</span>' +
            '</div>' +
            '<button class="item-delete-btn" title="حذف">🗑</button>';

        li.querySelector('.clickable-title').addEventListener('click', function() {
            openInViewer(lecture);
        });

        li.querySelector('.item-checkbox').addEventListener('change', function(e) {
            lecture.completed = e.target.checked;
            saveAllToLocalStorage();
            renderSubjectsGrid();
        });

        li.querySelector('.item-delete-btn').addEventListener('click', function() {
            dataStore[currentSubjectId] = dataStore[currentSubjectId].filter(function(l) { return l.id !== lecture.id; });
            saveAllToLocalStorage();
            renderDetailLessons();
        });

        listContainer.appendChild(li);
    });
}

var viewerContainer = document.getElementById('viewer-container');
var viewerTitle = document.getElementById('viewer-title');
var viewerBody = document.getElementById('viewer-body');
var closeViewerBtn = document.getElementById('close-viewer-btn');

if (closeViewerBtn) {
    closeViewerBtn.addEventListener('click', closeViewer);
}

function openInViewer(lecture) {
    if (!viewerContainer || !viewerTitle || !viewerBody) return;
    viewerTitle.innerText = "👨‍💻 قيد الدراسة الآن: " + lecture.title;
    viewerBody.innerHTML = "";

    if (!lecture.fileUrl) {
        viewerBody.innerHTML = "<p style='color:#9ca3af; padding: 20px;'>⚠️ هذه المحاضرة مسجلة كعنوان فقط.</p>";
    } else if (lecture.fileType === 'youtube') {
        viewerBody.innerHTML = '<iframe src="' + lecture.fileUrl + '" style="width:100%; height:450px; border:none; border-radius:8px;" allowfullscreen></iframe>';
    } else if (lecture.fileType && lecture.fileType.includes('video')) {
        viewerBody.innerHTML = '<video src="' + lecture.fileUrl + '" controls autoplay style="width:100%; max-height:450px;"></video>';
    } else if (lecture.fileType && lecture.fileType.includes('pdf')) {
        viewerBody.innerHTML = '<iframe src="' + lecture.fileUrl + '" style="width:100%; height:500px; border:none;"></iframe>';
    }

    viewerContainer.style.display = "block";
    viewerContainer.scrollIntoView({ behavior: 'smooth' });
}

function closeViewer() {
    if (viewerContainer) viewerContainer.style.display = "none";
    if (viewerBody) viewerBody.innerHTML = "";
}

var addNoteBtn = document.getElementById('detail-add-note-btn');
if (addNoteBtn) {
    addNoteBtn.addEventListener('click', function() {
        if (!currentSubjectId) return;
        var noteText = prompt("اكتبي مذكرتكِ السريعة هنا:");
        if (noteText && noteText.trim() !== "") {
            if (!notesStore[currentSubjectId]) notesStore[currentSubjectId] = [];
            notesStore[currentSubjectId].push({ id: Date.now(), text: noteText.trim() });
            saveAllToLocalStorage();
            renderDetailNotes();
        }
    });
}

function renderDetailNotes() {
    var notesContainer = document.getElementById('detail-notes-list');
    if (!notesContainer) return;
    notesContainer.innerHTML = "";
    var list = notesStore[currentSubjectId] || [];

    if (list.length === 0) {
        notesContainer.innerHTML = '<li class="no-notes" style="color:#64748b;">لا توجد ملاحظات مدونة لهذه المادة بعد.</li>';
        return;
    }

    list.forEach(function(note) {
        var li = document.createElement('li');
        li.className = 'note-item';
        li.innerHTML = '<span>📌 ' + note.text + '</span><button class="note-delete">❌</button>';
        li.querySelector('.note-delete').addEventListener('click', function() {
            notesStore[currentSubjectId] = notesStore[currentSubjectId].filter(function(n) { return n.id !== note.id; });
            saveAllToLocalStorage();
            renderDetailNotes();
        });
        notesContainer.appendChild(li);
    });
}

// =================================================================
// 5. إدارة الجدول الدراسي الأسبوعي
// =================================================================
var daysOfWeek = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
var scheduleStore = JSON.parse(localStorage.getItem('my_app_scheduleStore')) || {
    "الأحد": [],
    "الإثنين": [],
    "الثلاثاء": [],
    "الأربعاء": [],
    "الخميس": [],
    "الجمعة": [],
    "السبت": []
};

function saveScheduleToLocalStorage() {
    localStorage.setItem('my_app_scheduleStore', JSON.stringify(scheduleStore));
}

function renderScheduleGrid() {
    var gridContainer = document.getElementById('schedule-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = "";

    daysOfWeek.forEach(function(day) {
        var dayCol = document.createElement('div');
        dayCol.className = 'day-column';

        var items = scheduleStore[day] || [];
        var itemsHtml = "";

        if (items.length === 0) {
            itemsHtml = '<p style="color:#94a3b8; font-size:12px; text-align:center; padding:10px 0;">لا توجد محاضرات</p>';
        } else {
            items.forEach(function(item, index) {
                itemsHtml +=
                    '<li class="schedule-item">' +
                    '<div class="schedule-item-info">' +
                    '<strong>' + item.subject + '</strong>' +
                    '<span>⏰ ' + item.time + '</span>' +
                    '</div>' +
                    '<button class="schedule-delete-btn" onclick="deleteScheduleItem(\'' + day + '\', ' + index + ')">🗑</button>' +
                    '</li>';
            });
        }

        dayCol.innerHTML =
            '<div class="day-header">🗓 ' + day + '</div>' +
            '<ul class="schedule-list">' + itemsHtml + '</ul>';

        gridContainer.appendChild(dayCol);
    });
}

window.deleteScheduleItem = function(day, index) {
    if (scheduleStore[day]) {
        scheduleStore[day].splice(index, 1);
        saveScheduleToLocalStorage();
        renderScheduleGrid();
    }
};

var addScheduleBtn = document.getElementById('add-schedule-btn');
if (addScheduleBtn) {
    addScheduleBtn.addEventListener('click', function() {
        var day = prompt("اختاري اليوم (الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس، الجمعة، السبت):");
        if (!day || !daysOfWeek.includes(day.trim())) {
            alert("⚠️ يرجى كتابة اسم اليوم بشكل صحيح كما هو موضح.");
            return;
        }

        var subject = prompt("اسم المادة أو المحاضرة:");
        if (!subject || subject.trim() === "") return;
        var time = prompt("الوقت (مثال: 10:00 صباحاً):", "10:00 AM");
        if (!time || time.trim() === "") time = "غير محدد";

        var dayName = day.trim();
        if (!scheduleStore[dayName]) scheduleStore[dayName] = [];

        scheduleStore[dayName].push({
            subject: subject.trim(),
            time: time.trim()
        });

        saveScheduleToLocalStorage();
        renderScheduleGrid();
    });
}

// =================================================================
// 6. المهام اليومية ومحرر الأكواد التفاعلي
// =================================================================
var todoInput = document.getElementById('todo-input');
var addTodoBtn = document.getElementById('add-todo-btn');
var todoList = document.getElementById('todo-list');

if (addTodoBtn && todoInput && todoList) {
    addTodoBtn.addEventListener('click', function() {
        var text = todoInput.value.trim();
        if (text !== "") {
            var li = document.createElement('li');
            li.className = 'todo-item-row';
            li.innerHTML = '<span>🎯 ' + text + '</span><button class="delete-task-btn" style="background:#ef4444;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">حذف 🗑</button>';
            li.querySelector('.delete-task-btn').addEventListener('click', function() { li.remove(); });
            todoList.appendChild(li);
            todoInput.value = "";
        }
    });
}

var codeTextarea = document.getElementById('code-textarea');
var consoleOutput = document.getElementById('console-output');
var runBtn = document.getElementById('run-btn');
var editorLangSelect = document.getElementById('editor-lang-select');

var defaultCodes = {
    python: '# طلب اسم المستخدم\nname = input("ما هو اسمك؟ ")\n\n# طباعة رسالة الترحيب\nprint(f"أهلاً بك يا {name}! أتمنى لك يوماً سعيداً.")',
    js: '// كود جاڤاسكريبت تفاعلي\nlet name = prompt("ما هو اسمك؟");\nconsole.log("أهلاً بك يا " + name);',
    cpp: '// كود C++ توضيحي\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World!";\n    return 0;\n}'
};

if (codeTextarea) {
    codeTextarea.value = defaultCodes.python;
}

if (editorLangSelect && codeTextarea) {
    editorLangSelect.addEventListener('change', function() {
        var lang = this.value;
        if (defaultCodes[lang]) {
            codeTextarea.value = defaultCodes[lang];
        }
    });
}

var pyodideInstance = null;
async function getPyodideEngine() {
    if (!pyodideInstance && window.loadPyodide) {
        if (consoleOutput) consoleOutput.innerText = "⏳ جاري تهيئة محرك Python لأول مرة، يرجى الانتظار ثوانٍ معدودة...";
        pyodideInstance = await loadPyodide();
        if (consoleOutput) consoleOutput.innerText = "✅ محرك Python جاهز الآن! اضغطي \"تشغيل الكود\".";
    }
    return pyodideInstance;
}

window.addEventListener('DOMContentLoaded', function() {
    getPyodideEngine();
});

if (runBtn && codeTextarea && consoleOutput) {
    runBtn.addEventListener('click', async function() {
        var code = codeTextarea.value;
        var lang = editorLangSelect ? editorLangSelect.value : 'python';

        if (lang === 'python') {
            try {
                consoleOutput.innerText = "⏳ جاري التنفيذ...\n";
                var pyodide = await getPyodideEngine();

                if (!pyodide) {
                    consoleOutput.innerText = "❌ تعذر تحميل المحرك، تأكدي من الاتصال بالإنترنت.";
                    return;
                }

                pyodide.setStdout({
                    batched: (str) => {
                        consoleOutput.innerText += str + "\n";
                    }
                });

                pyodide.setStdin({
                    stdin: () => prompt("ادخلي القيمة المطلوبة للكود (Input):")
                });

                consoleOutput.innerText = "";
                await pyodide.runPythonAsync(code);

            } catch (err) {
                consoleOutput.innerText = "❌ خطأ في كود Python:\n" + err;
            }
        } else if (lang === 'js') {
            var oldLog = console.log;
            var logs = [];
            console.log = function() {
                var args = Array.prototype.slice.call(arguments);
                logs.push(args.join(' '));
            };
            try {
                new Function(code)();
                consoleOutput.innerText = logs.length > 0 ? logs.join('\n') : "✅ تم التنفيذ بنجاح.";
            } catch (e) {
                consoleOutput.innerText = "❌ خطأ JavaScript:\n" + e.message;
            }
            console.log = oldLog;

        } else if (lang === 'cpp') {
            consoleOutput.innerText = "ℹ️ لغة C++ تتطلب خادماً خارجياً، استخدمي Python للتجارب البرمجية التفاعلية.";
        }
    });
}

// =================================================================
// 7. منطق مؤقت التركيز (البومودورو)
// =================================================================
var timeLeft = 1500;
var timerInterval = null;
var isRunning = false;
var timerDisplay = document.getElementById('timer-display');
var startBtn = document.getElementById('pomo-start-btn');
var pauseBtn = document.getElementById('pomo-pause-btn');
var resetBtn = document.getElementById('pomo-reset-btn');
var modeButtons = document.querySelectorAll('.pomo-mode-btn');

function updateTimerDisplay() {
    var minutes = Math.floor(timeLeft / 60);
    var seconds = timeLeft % 60;
    var minStr = minutes < 10 ? '0' + minutes : minutes;
    var secStr = seconds < 10 ? '0' + seconds : seconds;
    if (timerDisplay) timerDisplay.innerText = minStr + ':' + secStr;
}

modeButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
        if (isRunning) {
            clearInterval(timerInterval);
            isRunning = false;
            if (startBtn) startBtn.disabled = false;
            if (pauseBtn) pauseBtn.disabled = true;
        }
        modeButtons.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        timeLeft = parseInt(btn.getAttribute('data-time'));
        updateTimerDisplay();
    });
});

if (startBtn) {
    startBtn.addEventListener('click', function() {
        if (!isRunning) {
            isRunning = true;
            startBtn.disabled = true;
            if (pauseBtn) pauseBtn.disabled = false;

            timerInterval = setInterval(function() {
                if (timeLeft > 0) {
                    timeLeft--;
                    updateTimerDisplay();
                } else {
                    clearInterval(timerInterval);
                    isRunning = false;
                    startBtn.disabled = false;
                    if (pauseBtn) pauseBtn.disabled = true;
                    alert("⏰ انتهى الوقت! خذي استراحة الآن.");
                }
            }, 1000);
        }
    });
}

if (pauseBtn) {
    pauseBtn.addEventListener('click', function() {
        if (isRunning) {
            clearInterval(timerInterval);
            isRunning = false;
            if (startBtn) startBtn.disabled = false;
            pauseBtn.disabled = true;
        }
    });
}

if (resetBtn) {
    resetBtn.addEventListener('click', function() {
        clearInterval(timerInterval);
        isRunning = false;
        if (startBtn) startBtn.disabled = false;
        if (pauseBtn) pauseBtn.disabled = true;
        var activeMode = document.querySelector('.pomo-mode-btn.active');
        timeLeft = activeMode ? parseInt(activeMode.getAttribute('data-time')) : 1500;
        updateTimerDisplay();
    });
}

// التشغيل الابتدائي العام
renderSubjectsGrid();
renderScheduleGrid();
updateTimerDisplay();