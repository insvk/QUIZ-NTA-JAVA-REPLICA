const API_URL = window.location.origin.includes('localhost') ? 'https://quiz-java-r217.onrender.com' : '/api';

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedTestId = urlParams.get('testId');
    if (sharedTestId) {
        sessionStorage.setItem('pendingTestId', sharedTestId);
    }

    const path = window.location.pathname;
    const role = localStorage.getItem('role');

    if (path.includes('index.html') || path === '/') {
        if (role === 'ADMIN') window.location.href = 'admin.html';
        else if (role === 'STUDENT') redirectStudent();
    } else if (path.includes('admin.html')) {
        if (role !== 'ADMIN') {
            window.location.href = 'index.html';
            return;
        }
        addQuestionField();
        loadAdminTests();
        loadAttempts();
        loadUsers();
    } else if (path.includes('student.html')) {
        if (role !== 'STUDENT') {
            window.location.href = 'index.html';
            return;
        }
        // Dynamic name display handled in student.html inline script, but we initialize portal here
        loadStudentPortal();
    } else if (path.includes('quiz.html')) {
        if (!role) {
            window.location.href = 'index.html';
            return;
        }
        loadExamEngine();
    }
});

// --- AUTHENTICATION ---
function toggleAuth() {
    document.getElementById('loginBox')?.classList.toggle('hidden');
    document.getElementById('regBox')?.classList.toggle('hidden');
}

async function login() {
    const uid = document.getElementById('userId').value.trim();
    const pwd = document.getElementById('pwd').value.trim();

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid, password: pwd })
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('role', data.role);
            localStorage.setItem('userId', data.userId);
            if (data.role === 'ADMIN') {
                window.location.href = 'admin.html';
            } else {
                localStorage.setItem('studentId', data.studentId);
                redirectStudent();
            }
        } else {
            const errText = await res.text();
            alert(`Authentication Failed:\n${errText}`);
        }
    } catch (err) {
        alert("Network Error: Could not reach the server.");
    }
}

function redirectStudent() {
    const pendingTest = sessionStorage.getItem('pendingTestId');
    if (pendingTest) {
        sessionStorage.removeItem('pendingTestId');
        localStorage.setItem('currentTestId', pendingTest);
        window.location.href = 'quiz.html';
    } else {
        window.location.href = 'student.html';
    }
}

async function register() {
    const uid = document.getElementById('regUserId').value.trim();
    const pwd = document.getElementById('regPwd').value.trim();
    const cpwd = document.getElementById('regCpwd').value.trim();

    if (!uid || !pwd) return alert("User ID and Password are required!");
    if (pwd !== cpwd) return alert("Passwords do not match!");

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid, password: pwd })
        });

        if (res.ok) {
            alert("Registration Successful! Account stored in Supabase DBMS. Please Sign In.");
            toggleAuth();
        } else {
            const err = await res.text();
            alert(`Error: ${err}`);
        }
    } catch (err) {
        alert("Network Error: Registration failed.");
    }
}

function logout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'index.html';
}

// --- USER ACCOUNT MANAGEMENT (ADMIN) ---
async function loadUsers() {
    try {
        const res = await fetch(`${API_URL}/admin/users`);
        if (res.ok) {
            const users = await res.json();
            const container = document.getElementById('usersTableContainer');
            if (!container) return;

            if (users.length === 0) {
                container.innerHTML = `<p style="padding: 10px;">No registered student accounts found.</p>`;
                return;
            }

            let html = `<table><tr><th>ID</th><th>Student User ID</th><th>Role</th><th>Action</th></tr>`;
            users.forEach(u => {
                html += `<tr>
                    <td>${u.id}</td>
                    <td><strong>${u.userId}</strong></td>
                    <td>${u.role}</td>
                    <td>
                        <button onclick="deleteUser(${u.id}, '${u.userId}')" style="padding: 5px 10px; font-size: 12px; background: linear-gradient(45deg, #f12711, #f5af19); margin: 0; width: auto;">Delete</button>
                    </td>
                </tr>`;
            });
            container.innerHTML = html + `</table>`;
        }
    } catch (err) {
        console.error("Failed to load users:", err);
    }
}

async function adminCreateUser() {
    const uid = document.getElementById('adminNewStudentId').value.trim();
    const pwd = document.getElementById('adminNewStudentPwd').value.trim();

    if (!uid || !pwd) return alert("Please fill in both User ID and Password.");

    try {
        const res = await fetch(`${API_URL}/admin/users/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid, password: pwd })
        });

        if (res.ok) {
            alert(`Student Account '${uid}' Created Successfully!`);
            document.getElementById('adminNewStudentId').value = '';
            document.getElementById('adminNewStudentPwd').value = '';
            loadUsers();
        } else {
            const err = await res.text();
            alert(`Error: ${err}`);
        }
    } catch (err) {
        alert("Failed to create user due to network error.");
    }
}

async function deleteUser(id, userId) {
    if (!confirm(`Are you sure you want to permanently delete user account '${userId}'?`)) return;

    try {
        const res = await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert(`Account '${userId}' deleted.`);
            loadUsers();
        } else {
            const err = await res.text();
            alert(`Failed to delete user: ${err}`);
        }
    } catch (err) {
        alert("Network error while deleting user.");
    }
}

// --- ADMIN TEST & LOG FUNCTIONS ---
let questionCount = 0;
function addQuestionField() {
    questionCount++;
    const container = document.getElementById('questionsBuilder');
    if (!container) return;

    const qDiv = document.createElement('div');
    qDiv.className = 'glass-card q-block';
    qDiv.style.marginBottom = '10px';
    qDiv.id = `q_block_${questionCount}`;
    qDiv.innerHTML = `
        <h5>Question ${questionCount}</h5>
        <input type="text" class="q-section" placeholder="Section Name (e.g., PHYSICS - SEC-I)" required>
        <input type="text" class="q-text" placeholder="Enter Question Text" required>
        <label style="font-size: 12px;">Add Question Image (Optional):</label>
        <input type="file" class="q-img" accept="image/*" style="margin: 5px 0;">
        <input type="text" class="q-optA" placeholder="Option A" required>
        <input type="text" class="q-optB" placeholder="Option B" required>
        <input type="text" class="q-optC" placeholder="Option C" required>
        <input type="text" class="q-optD" placeholder="Option D" required>
        <select class="q-correct">
            <option value="A">Correct Answer: Option A</option>
            <option value="B">Correct Answer: Option B</option>
            <option value="C">Correct Answer: Option C</option>
            <option value="D">Correct Answer: Option D</option>
        </select>
    `;
    container.appendChild(qDiv);
}

async function createTest() {
    const title = document.getElementById('testTitle').value.trim();
    const negMark = document.getElementById('negMark').checked;
    const duration = document.getElementById('testDuration').value || 180;
    const instructions = document.getElementById('testInstructions').value.trim();
    const blocks = document.querySelectorAll('.q-block');

    if (!title) return alert("Please enter a Test Title");

    const questions = [];
    for (let block of blocks) {
        const section = block.querySelector('.q-section').value.trim() || 'GENERAL';
        const text = block.querySelector('.q-text').value.trim();
        const optA = block.querySelector('.q-optA').value.trim();
        const optB = block.querySelector('.q-optB').value.trim();
        const optC = block.querySelector('.q-optC').value.trim();
        const optD = block.querySelector('.q-optD').value.trim();
        const correct = block.querySelector('.q-correct').value;
        const imgFile = block.querySelector('.q-img').files[0];

        if (!text || !optA || !optB || !optC || !optD) {
            return alert("All questions and 4 options must be filled out!");
        }

        let base64Img = null;
        if (imgFile) {
            base64Img = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(imgFile);
            });
        }

        questions.push({
            sectionName: section,
            questionText: text,
            imageBase64: base64Img,
            optionA: optA,
            optionB: optB,
            optionC: optC,
            optionD: optD,
            correctAnswer: correct
        });
    }

    const payload = { 
        title, 
        negativeMarkingEnabled: negMark, 
        durationMinutes: parseInt(duration),
        instructions: instructions,
        questions: questions 
    };

    try {
        const res = await fetch(`${API_URL}/admin/test/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Test Created successfully!");
            location.reload();
        } else {
            alert("Failed to create test.");
        }
    } catch (err) {
        alert("Network error during test creation.");
    }
}

async function loadAdminTests() {
    try {
        const res = await fetch(`${API_URL}/admin/tests`);
        if (!res.ok) return;
        const tests = await res.json();
        const container = document.getElementById('adminTestList');
        if (!container) return;

        let html = '';
        tests.forEach(t => {
            const shareUrl = `${window.location.origin}/index.html?testId=${t.id}`;
            html += `
                <div style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <strong>${t.title}</strong> [${t.active ? 'ACTIVE' : 'DISABLED'}]
                    <button onclick="toggleTest(${t.id})" style="padding: 5px; font-size: 10px; width: auto;">Toggle Access</button>
                    <button onclick="navigator.clipboard.writeText('${shareUrl}'); alert('Copied share link!');" style="padding: 5px; font-size: 10px; background: #11998e; width: auto;">Copy Invite Link</button>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        console.error("Failed to load admin tests:", err);
    }
}

async function toggleTest(id) {
    await fetch(`${API_URL}/admin/test/toggle/${id}`, { method: 'POST' });
    loadAdminTests();
}

async function loadAttempts() {
    try {
        const res = await fetch(`${API_URL}/admin/attempts`);
        if (!res.ok) return;
        const attempts = await res.json();
        const table = document.getElementById('attemptsTable');
        if (!table) return;

        let html = `<table><tr><th>ID</th><th>Student</th><th>Test</th><th>Score</th><th>Correct</th><th>Wrong</th><th>Total</th></tr>`;
        attempts.forEach(a => {
            html += `<tr><td>${a.id}</td><td>${a.studentUserId || a.studentId}</td><td>${a.testTitle}</td><td>${a.score}</td><td>${a.correctAnswers}</td><td>${a.wrongAnswers}</td><td>${a.totalQuestions}</td></tr>`;
        });
        table.innerHTML = html + `</table>`;
    } catch (err) {
        console.error("Failed to load attempts:", err);
    }
}

function downloadXLS() {
    window.location.href = `${API_URL}/admin/export-excel`;
}

// --- STUDENT PORTAL (NLEARN DASHBOARD UI) ---
async function loadStudentPortal() {
    try {
        const res = await fetch(`${API_URL}/student/tests`);
        if (!res.ok) return;
        const tests = await res.json();
        const container = document.getElementById('testList');
        if (!container) return;

        container.innerHTML = ''; // Clear placeholders

        const gradients = [
            'linear-gradient(135deg, #fff3e0, #ffe0b2)', 
            'linear-gradient(135deg, #f3e5f5, #e1bee7)',
            'linear-gradient(135deg, #e3f2fd, #bbdefb)'
        ];

        tests.forEach((t, index) => {
            const bgStyle = gradients[index % gradients.length];
            
            container.innerHTML += `
                <div class="flash-card" style="background: ${bgStyle};" onclick="startQuiz(${t.id})">
                    <h4>${t.title}</h4>
                    <p style="font-size: 12px; margin-top: 10px; opacity: 0.8;">
                        ${t.negativeMarkingEnabled ? 'Negative Marking: ON (-1)' : 'Negative Marking: OFF'} | Duration: ${t.durationMinutes || 180} mins
                    </p>
                    <div style="margin-top: 15px;">
                        <span style="background: rgba(255,255,255,0.5); padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                            Attempt Now &#8594;
                        </span>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Failed to load student tests:", err);
    }
}

function startQuiz(testId) {
    localStorage.setItem('currentTestId', testId);
    window.location.href = 'quiz.html';
}

// --- EXAM ENGINE LOGIC (NTA/JEE UI) ---
let examData = null;
let currentQIndex = 0;
let examTimer = null;
let remainingSeconds = 0;

// State Tracking: 0=NV, 1=NA, 2=ANS, 3=MR, 4=AMR
let qStates = []; 
let qAnswers = [];

async function loadExamEngine() {
    const testId = localStorage.getItem('currentTestId');
    const res = await fetch(`${API_URL}/student/test/${testId}`);
    if (!res.ok) {
        alert("Exam unavailable.");
        return window.location.href = 'student.html';
    }
    
    examData = await res.json();
    document.getElementById('examMainTitle').innerText = examData.title;
    
    document.getElementById('instructionContent').innerHTML = examData.instructions || "<p>No specific instructions provided.</p>";
    
    qStates = new Array(examData.questions.length).fill(0);
    qAnswers = new Array(examData.questions.length).fill(null);
    
    document.getElementById('instructionsScreen').style.display = 'block';
}

function startExamTimer() {
    document.getElementById('instructionsScreen').style.display = 'none';
    document.getElementById('examScreen').style.display = 'flex';
    
    remainingSeconds = (examData.durationMinutes || 180) * 60;
    
    examTimer = setInterval(() => {
        if(remainingSeconds <= 0) {
            clearInterval(examTimer);
            alert("Time is up! Auto-submitting...");
            submitExamFinal();
            return;
        }
        remainingSeconds--;
        const h = Math.floor(remainingSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((remainingSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (remainingSeconds % 60).toString().padStart(2, '0');
        document.getElementById('timeRemaining').innerText = `${h}:${m}:${s}`;
    }, 1000);

    buildSections();
    loadQuestion(0);
}

function buildSections() {
    const sections = [...new Set(examData.questions.map(q => q.sectionName || 'GENERAL'))];
    const bar = document.getElementById('sectionsBar');
    bar.innerHTML = sections.map((s, idx) => 
        `<div class="sec-tab ${idx===0?'active':''}" onclick="jumpToSection('${s}', this)">${s}</div>`
    ).join('');
}

function jumpToSection(secName, element) {
    document.querySelectorAll('.sec-tab').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    const idx = examData.questions.findIndex(q => (q.sectionName || 'GENERAL') === secName);
    if(idx !== -1) loadQuestion(idx);
}

function loadQuestion(index) {
    if (index < 0 || index >= examData.questions.length) return;
    currentQIndex = index;
    const q = examData.questions[index];
    
    if (qStates[index] === 0) qStates[index] = 1;

    document.getElementById('qNumberDisplay').innerText = `Question ${index + 1}`;
    document.getElementById('questionText').innerHTML = q.questionText;
    document.getElementById('questionImageContainer').innerHTML = q.imageBase64 ? `<img src="${q.imageBase64}" style="max-width:400px; display:block; margin-top:10px;">` : '';
    
    document.getElementById('optAText').innerText = q.optionA;
    document.getElementById('optBText').innerText = q.optionB;
    document.getElementById('optCText').innerText = q.optionC;
    document.getElementById('optDText').innerText = q.optionD;

    document.querySelectorAll('input[name="examOpt"]').forEach(rb => {
        rb.checked = (rb.value === qAnswers[index]);
    });

    // Auto-update section tab visually if navigating via Prev/Next buttons
    const activeSec = q.sectionName || 'GENERAL';
    document.querySelectorAll('.sec-tab').forEach(t => {
        t.classList.toggle('active', t.innerText === activeSec);
    });

    updatePalette();
}

function updatePalette() {
    const grid = document.getElementById('questionGrid');
    grid.innerHTML = '';
    
    let counts = {nv:0, na:0, ans:0, mr:0, amr:0};
    
    qStates.forEach((state, idx) => {
        let cls = 'badge-nv';
        if (state === 1) { cls = 'badge-na'; counts.na++; }
        else if (state === 2) { cls = 'badge-ans'; counts.ans++; }
        else if (state === 3) { cls = 'badge-mr'; counts.mr++; }
        else if (state === 4) { cls = 'badge-amr'; counts.amr++; }
        else counts.nv++;
        
        let styleStr = idx === currentQIndex ? 'border: 2px solid #000;' : '';
        grid.innerHTML += `<div class="badge ${cls}" style="${styleStr}" onclick="loadQuestion(${idx})">${idx + 1}</div>`;
    });
    
    document.getElementById('count-nv').innerText = counts.nv;
    document.getElementById('count-na').innerText = counts.na;
    document.getElementById('count-ans').innerText = counts.ans;
    document.getElementById('count-mr').innerText = counts.mr;
    document.getElementById('count-amr').innerText = counts.amr;
}

function getCurrentSelection() {
    const sel = document.querySelector('input[name="examOpt"]:checked');
    return sel ? sel.value : null;
}

function saveAndNext() {
    const ans = getCurrentSelection();
    if(ans) {
        qAnswers[currentQIndex] = ans;
        qStates[currentQIndex] = 2; // Answered
    } else {
        qAnswers[currentQIndex] = null;
        qStates[currentQIndex] = 1; // Not Answered
    }
    nextQuestion();
}

function saveAndMark() {
    const ans = getCurrentSelection();
    if(ans) {
        qAnswers[currentQIndex] = ans;
        qStates[currentQIndex] = 4; // Answered & Marked
    } else {
        qAnswers[currentQIndex] = null;
        qStates[currentQIndex] = 3; // Marked for Review
    }
    nextQuestion();
}

function clearResponse() {
    document.querySelectorAll('input[name="examOpt"]').forEach(rb => rb.checked = false);
    qAnswers[currentQIndex] = null;
    qStates[currentQIndex] = 1; // Not Answered
    updatePalette();
}

function nextQuestion() {
    if (currentQIndex < examData.questions.length - 1) loadQuestion(currentQIndex + 1);
    else updatePalette();
}

function prevQuestion() {
    if (currentQIndex > 0) loadQuestion(currentQIndex - 1);
}

async function submitExamFinal() {
    if(!confirm("Are you sure you want to submit the exam?")) return;
    clearInterval(examTimer);

    const answersMap = {};
    examData.questions.forEach((q, idx) => {
        if(qAnswers[idx]) answersMap[q.id] = qAnswers[idx];
    });

    const payload = {
        testId: examData.id,
        studentId: localStorage.getItem('studentId'),
        studentUserId: localStorage.getItem('userId'),
        answers: answersMap
    };

    try {
        const res = await fetch(`${API_URL}/student/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const result = await res.json();
            document.getElementById('examScreen').innerHTML = `
                <div style="text-align:center; padding: 50px; background: #fff; border-radius: 8px; margin: auto; max-width: 600px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h1 style="color: #333;">Exam Submitted Successfully!</h1>
                    <h2 style="color:#28a745; font-size: 36px; margin: 20px 0;">Score: ${result.score}</h2>
                    <p style="font-size: 18px; color: #555;">Correct Answers: <strong>${result.correctAnswers}</strong></p>
                    <p style="font-size: 18px; color: #555;">Wrong Answers: <strong>${result.wrongAnswers}</strong></p>
                    <button onclick="window.location.href='student.html'" class="btn-primary" style="margin-top:30px;">Return to Dashboard</button>
                </div>
            `;
        }
    } catch (err) {
        alert("Failed to submit exam due to network error.");
    }
}