const API_URL = window.location.origin.includes('localhost') ? 'https://quiz-java-r217.onrender.com/' : '/api';

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedTestId = urlParams.get('testId');
    if (sharedTestId) {
        sessionStorage.setItem('pendingTestId', sharedTestId);
    }

    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        if (localStorage.getItem('role') === 'ADMIN') window.location.href = 'admin.html';
        else if (localStorage.getItem('role') === 'STUDENT') redirectStudent();
    } else if (window.location.pathname.includes('admin.html')) {
        if (localStorage.getItem('role') !== 'ADMIN') window.location.href = 'index.html';
        addQuestionField();
        loadAdminTests();
        loadAttempts();
    } else if (window.location.pathname.includes('student.html')) {
        if (localStorage.getItem('role') !== 'STUDENT') window.location.href = 'index.html';
        document.getElementById('welcomeText').innerText = `Welcome, ${localStorage.getItem('userId')}`;
        loadStudentPortal();
    } else if (window.location.pathname.includes('quiz.html')) {
        if (!localStorage.getItem('role')) window.location.href = 'index.html';
        loadQuiz();
    }
});

function toggleAuth() {
    document.getElementById('loginBox').classList.toggle('hidden');
    document.getElementById('regBox').classList.toggle('hidden');
}

async function login() {
    const uid = document.getElementById('userId').value;
    const pwd = document.getElementById('pwd').value;

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
        alert("Authentication Failed. Invalid Credentials.");
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
    const uid = document.getElementById('regUserId').value;
    const pwd = document.getElementById('regPwd').value;
    const cpwd = document.getElementById('regCpwd').value;

    if (pwd !== cpwd) return alert("Passwords do not match!");

    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, password: pwd })
    });

    if (res.ok) {
        alert("Registration Successful! Please Sign In.");
        toggleAuth();
    } else {
        const err = await res.text();
        alert(`Error: ${err}`);
    }
}

function logout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'index.html';
}

// ADMIN FUNCTIONS
let questionCount = 0;
function addQuestionField() {
    questionCount++;
    const container = document.getElementById('questionsBuilder');
    const qDiv = document.createElement('div');
    qDiv.className = 'glass-card q-block';
    qDiv.style.marginBottom = '10px';
    qDiv.id = `q_block_${questionCount}`;
    qDiv.innerHTML = `
        <h5>Question ${questionCount}</h5>
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
    const title = document.getElementById('testTitle').value;
    const negMark = document.getElementById('negMark').checked;
    const blocks = document.querySelectorAll('.q-block');

    if (!title) return alert("Please enter a Test Title");

    const questions = [];
    for (let block of blocks) {
        const text = block.querySelector('.q-text').value;
        const optA = block.querySelector('.q-optA').value;
        const optB = block.querySelector('.q-optB').value;
        const optC = block.querySelector('.q-optC').value;
        const optD = block.querySelector('.q-optD').value;
        const correct = block.querySelector('.q-correct').value;
        const imgFile = block.querySelector('.q-img').files[0];

        let base64Img = null;
        if (imgFile) {
            base64Img = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(imgFile);
            });
        }

        questions.push({
            questionText: text,
            imageBase64: base64Img,
            optionA: optA,
            optionB: optB,
            optionC: optC,
            optionD: optD,
            correctAnswer: correct
        });
    }

    const payload = { title, negativeMarkingEnabled: negMark, questions };

    const res = await fetch(`${API_URL}/admin/test/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert("Test Created successfully!");
        location.reload();
    }
}

async function loadAdminTests() {
    const res = await fetch(`${API_URL}/admin/tests`);
    const tests = await res.json();
    const container = document.getElementById('adminTestList');
    container.innerHTML = '';

    tests.forEach(t => {
        const shareUrl = `${window.location.origin}/index.html?testId=${t.id}`;
        container.innerHTML += `
            <div style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <strong>${t.title}</strong> [${t.active ? 'ACTIVE' : 'DISABLED'}]
                <button onclick="toggleTest(${t.id})" style="padding: 5px; font-size: 10px;">Toggle Access</button>
                <button onclick="navigator.clipboard.writeText('${shareUrl}'); alert('Copied share link!');" style="padding: 5px; font-size: 10px; background: #11998e;">Copy Invite Link</button>
            </div>
        `;
    });
}

async function toggleTest(id) {
    await fetch(`${API_URL}/admin/test/toggle/${id}`, { method: 'POST' });
    loadAdminTests();
}

async function loadAttempts() {
    const res = await fetch(`${API_URL}/admin/attempts`);
    const attempts = await res.json();
    const table = document.getElementById('attemptsTable');

    let html = `<table><tr><th>ID</th><th>Student</th><th>Test</th><th>Score</th><th>Correct</th><th>Wrong</th><th>Total</th></tr>`;
    attempts.forEach(a => {
        html += `<tr><td>${a.id}</td><td>${a.studentUserId || a.studentId}</td><td>${a.testTitle}</td><td>${a.score}</td><td>${a.correctAnswers}</td><td>${a.wrongAnswers}</td><td>${a.totalQuestions}</td></tr>`;
    });
    table.innerHTML = html + `</table>`;
}

function downloadXLS() {
    window.location.href = `${API_URL}/admin/export-excel`;
}

async function loadLogs() {
    const res = await fetch(`${API_URL}/admin/logs`);
    const logs = await res.json();
    const container = document.getElementById('logsContainer');
    container.innerHTML = logs.map(l => `<div>[${l.timestamp}] <b>${l.username}</b>: ${l.action} - ${l.details}</div>`).join('');
}

// STUDENT PORTAL & QUIZ FUNCTIONS
async function loadStudentPortal() {
    const res = await fetch(`${API_URL}/student/tests`);
    const tests = await res.json();
    const container = document.getElementById('testList');
    container.innerHTML = '';

    tests.forEach(t => {
        container.innerHTML += `
            <div class="glass-card">
                <h4>${t.title}</h4>
                <p>Scheme: +4 for Correct | ${t.negativeMarkingEnabled ? '-1 for Incorrect' : '0 for Incorrect'}</p>
                <button onclick="startQuiz(${t.id})">Start Test</button>
            </div>
        `;
    });

    const studentId = localStorage.getItem('studentId');
    const attRes = await fetch(`${API_URL}/student/attempts/${studentId}`);
    const attempts = await attRes.json();
    const attContainer = document.getElementById('pastAttempts');
    attContainer.innerHTML = '';

    attempts.forEach(a => {
        attContainer.innerHTML += `
            <div class="glass-card">
                <h4>${a.testTitle}</h4>
                <p>Score: <strong>${a.score}</strong> | Correct: ${a.correctAnswers} | Wrong: ${a.wrongAnswers}</p>
            </div>
        `;
    });
}

function startQuiz(testId) {
    localStorage.setItem('currentTestId', testId);
    window.location.href = 'quiz.html';
}

let activeTestObj = null;
async function loadQuiz() {
    const testId = localStorage.getItem('currentTestId');
    const res = await fetch(`${API_URL}/student/test/${testId}`);

    if (!res.ok) {
        alert("This assessment is either invalid or closed by Admin.");
        return window.location.href = 'student.html';
    }

    activeTestObj = await res.json();
    document.getElementById('quizTitle').innerText = activeTestObj.title;

    const container = document.getElementById('quizContainer');
    container.innerHTML = '';

    activeTestObj.questions.forEach((q, idx) => {
        container.innerHTML += `
            <div class="glass-card" style="margin-bottom: 15px;">
                <h4>Q${idx + 1}: ${q.questionText}</h4>
                ${q.imageBase64 ? `<img src="${q.imageBase64}" style="max-width: 100%; border-radius: 8px; margin: 10px 0;">` : ''}
                <label class="option-label"><input type="radio" name="q_${q.id}" value="A"> ${q.optionA}</label>
                <label class="option-label"><input type="radio" name="q_${q.id}" value="B"> ${q.optionB}</label>
                <label class="option-label"><input type="radio" name="q_${q.id}" value="C"> ${q.optionC}</label>
                <label class="option-label"><input type="radio" name="q_${q.id}" value="D"> ${q.optionD}</label>
            </div>
        `;
    });
}

async function submitExam() {
    const answers = {};
    activeTestObj.questions.forEach(q => {
        const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
        if (selected) answers[q.id] = selected.value;
    });

    const payload = {
        testId: activeTestObj.id,
        studentId: localStorage.getItem('studentId'),
        studentUserId: localStorage.getItem('userId'),
        answers
    };

    const res = await fetch(`${API_URL}/student/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        const result = await res.json();
        document.getElementById('quizContainer').innerHTML = `
            <div class="glass-card" style="text-align: center; padding: 40px;">
                <h2>Quiz Completed!</h2>
                <h3 style="font-size: 36px; color: #00f2fe;">Score: ${result.score}</h3>
                <p>Correct Answers: ${result.correctAnswers}</p>
                <p>Wrong Answers: ${result.wrongAnswers}</p>
                <button onclick="window.location.href='student.html'" style="margin-top: 20px;">Return to Dashboard</button>
            </div>
        `;
        document.getElementById('submitBtn').style.display = 'none';
    }
}