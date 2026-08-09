const API_URL = window.location.origin.includes('localhost') ? 'https://kvnjg-java-quiz-nw.onrender.com' : '/api';

// ==========================================
// 1. STRICT ROUTING & AUTHENTICATION
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedTestId = urlParams.get('testId');
    if (sharedTestId) sessionStorage.setItem('pendingTestId', sharedTestId);

    const path = window.location.pathname;
    const role = localStorage.getItem('role');
    const isIndex = path.includes('index.html') || path.endsWith('/');

    // Security Lock & Routing
    if (isIndex) {
        if (role === 'ADMIN') return window.location.replace('admin.html');
        if (role === 'STUDENT') return window.location.replace('student.html');
    } else if (path.includes('admin.html')) {
        if (role !== 'ADMIN') {
            localStorage.clear();
            return window.location.replace('index.html');
        }
        initAdminDashboard(); 
    } else if (path.includes('student.html')) {
        if (role !== 'STUDENT') {
            localStorage.clear();
            return window.location.replace('index.html');
        }
        loadStudentPortal();
        loadStudentAttempts();
    } else if (path.includes('quiz.html')) {
        if (!role) {
            localStorage.clear();
            return window.location.replace('index.html');
        }
        loadExamEngine();
    }
});

function toggleAuth() {
    document.getElementById('loginBox')?.classList.toggle('hidden');
    document.getElementById('regBox')?.classList.toggle('hidden');
}

function togglePwd(id) {
    const input = document.getElementById(id);
    input.type = input.type === 'password' ? 'text' : 'password';
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
                window.location.replace('admin.html');
            } else {
                localStorage.setItem('studentId', data.studentId);
                localStorage.setItem('regNo', data.regNo || '');
                localStorage.setItem('name', data.name || data.userId);
                localStorage.setItem('profilePic', data.profilePicBase64 || '');
                redirectStudent();
            }
        } else {
            const errText = await res.text();
            alert(`Authentication Failed:\n${errText}`);
        }
    } catch (err) { alert("Network Error: Could not reach the server."); }
}

function redirectStudent() {
    const pendingTest = sessionStorage.getItem('pendingTestId');
    if (pendingTest) {
        sessionStorage.removeItem('pendingTestId');
        localStorage.setItem('currentTestId', pendingTest);
        window.location.replace('quiz.html');
    } else { window.location.replace('student.html'); }
}

async function register() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const uid = document.getElementById('regUserId').value.trim();
    const pwd = document.getElementById('regPwd').value.trim();
    const cpwd = document.getElementById('regCpwd').value.trim();
    const picFile = document.getElementById('regPic').files[0];

    if (!name || !email || !uid || !pwd) return alert("All fields except Profile Pic are required!");
    if (pwd !== cpwd) return alert("Passwords do not match!");

    let base64Pic = null;
    if (picFile) {
        base64Pic = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(picFile);
        });
    }

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, userId: uid, password: pwd, profilePicBase64: base64Pic })
        });
        if (res.ok) {
            const data = await res.json();
            alert(`${data.message}`);
            toggleAuth();
        } else { alert(`Error: ${await res.text()}`); }
    } catch (err) { alert("Network Error: Registration failed."); }
}

function logout() { localStorage.clear(); sessionStorage.clear(); window.location.replace('index.html'); }

// ==========================================
// 2. SHARED SPIK THEME SIDEBAR LOGIC
// ==========================================
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function switchView(viewId, element) {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if(element) {
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        element.classList.add('active');
    }
    // Refresh admin dash if applicable
    if(viewId === 'view-dashboard' && localStorage.getItem('role') === 'ADMIN') initAdminDashboard();
}

// ==========================================
// 3. ADMIN DASHBOARD LOGIC (Unchanged Spik Logic)
// ==========================================
let dashChart = null;
async function initAdminDashboard() {
    try {
        const [testRes, attRes, logRes] = await Promise.all([
            fetch(`${API_URL}/admin/tests`), fetch(`${API_URL}/admin/attempts`), fetch(`${API_URL}/admin/logs`)
        ]);
        const tests = await testRes.json(); const attempts = await attRes.json(); const logs = await logRes.json();

        const now = new Date(); let liveCount = 0, upcomingCount = 0;
        tests.forEach(t => {
            if(t.active) {
                if(!t.scheduledTime || new Date(t.scheduledTime) <= now) liveCount++;
                else upcomingCount++;
            }
        });
        document.getElementById('statLiveTests').innerText = liveCount;
        document.getElementById('statUpcomingTests').innerText = upcomingCount;
        document.getElementById('statFinishedTests').innerText = attempts.length;

        if(attempts.length > 0) {
            const sorted = [...attempts].sort((a,b) => b.score - a.score);
            document.getElementById('statTopScorerName').innerText = sorted[0].studentUserId;
            document.getElementById('statTopScorerScore').innerText = `Score: ${sorted[0].score} (${sorted[0].testTitle})`;
        } else {
            document.getElementById('statTopScorerName').innerText = "No attempts yet";
            document.getElementById('statTopScorerScore').innerText = "-";
        }

        const logTable = document.getElementById('dashLogsTable').getElementsByTagName('tbody')[0];
        logTable.innerHTML = '';
        logs.slice().reverse().slice(0, 5).forEach(l => {
            logTable.innerHTML += `<tr><td style="font-size:12px; color:#888;">${new Date(l.timestamp).toLocaleString()}</td><td><strong>${l.username}</strong></td><td>${l.action}</td></tr>`;
        });

        const testScores = {};
        attempts.forEach(a => {
            if(!testScores[a.testTitle]) testScores[a.testTitle] = { total: 0, count: 0 };
            testScores[a.testTitle].total += a.score;
            testScores[a.testTitle].count += 1;
        });

        const labels = []; const data = [];
        Object.keys(testScores).slice(-3).forEach(title => {
            labels.push(title.substring(0, 15) + "...");
            data.push((testScores[title].total / testScores[title].count).toFixed(2));
        });

        if(dashChart) dashChart.destroy();
        const ctx = document.getElementById('performanceChart')?.getContext('2d');
        if(ctx) {
            dashChart = new Chart(ctx, {
                type: 'line',
                data: { labels: labels.length ? labels : ['No Data'], datasets: [{ label: 'Avg Score', data: data.length ? data : [0], borderColor: '#6f42c1', backgroundColor: 'rgba(111, 66, 193, 0.1)', borderWidth: 2, fill: true, tension: 0.4 }] },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    } catch (e) {}
}

async function loadUsers() {
    const res = await fetch(`${API_URL}/admin/users`);
    if (res.ok) {
        const users = await res.json();
        const container = document.getElementById('usersTableContainer');
        if (!container) return;
        if (users.length === 0) return container.innerHTML = `<p>No student accounts found.</p>`;
        let html = `<table class="clean-table"><thead><tr><th>Reg No</th><th>Name</th><th>Username</th><th>Action</th></tr></thead><tbody>`;
        users.forEach(u => {
            html += `<tr><td>${u.regNo || 'N/A'}</td><td>${u.name || 'N/A'}</td><td><strong>${u.userId}</strong></td>
                <td><button onclick="deleteUser(${u.id}, '${u.userId}')" class="btn-danger-spik">Delete</button></td></tr>`;
        });
        container.innerHTML = html + `</tbody></table>`;
    }
}

async function adminCreateUser() {
    const uid = document.getElementById('adminNewStudentId').value.trim();
    const name = document.getElementById('adminNewStudentName').value.trim();
    const pwd = document.getElementById('adminNewStudentPwd').value.trim();
    if (!uid || !pwd || !name) return alert("Fill all fields.");
    const res = await fetch(`${API_URL}/admin/users/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, name: name, password: pwd }) });
    if (res.ok) { alert(`Account Created!`); loadUsers(); } else { alert(await res.text()); }
}

async function deleteUser(id, userId) {
    if (!confirm(`Delete user '${userId}'?`)) return;
    const res = await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE' });
    if (res.ok) loadUsers(); else alert(await res.text());
}

let questionCount = 0;
function addQuestionField() {
    questionCount++;
    const container = document.getElementById('questionsBuilder');
    if (!container) return;
    const qDiv = document.createElement('div');
    qDiv.className = 'q-block';
    qDiv.id = `q_block_${questionCount}`;
    qDiv.innerHTML = `
        <h5>Question ${questionCount}</h5>
        <div class="form-grid">
            <input type="text" class="q-section spik-input" placeholder="Section Name (e.g., PHYSICS)" required>
            <input type="text" class="q-text spik-input" placeholder="Enter Question Text" required>
            <input type="text" class="q-optA spik-input" placeholder="Option A" required>
            <input type="text" class="q-optB spik-input" placeholder="Option B" required>
            <input type="text" class="q-optC spik-input" placeholder="Option C" required>
            <input type="text" class="q-optD spik-input" placeholder="Option D" required>
            <select class="q-correct spik-input">
                <option value="A">Correct Answer: A</option><option value="B">Correct Answer: B</option>
                <option value="C">Correct Answer: C</option><option value="D">Correct Answer: D</option>
            </select>
            <input type="file" class="q-img spik-input" accept="image/*">
        </div>`;
    container.appendChild(qDiv);
}

async function createTest() {
    const title = document.getElementById('testTitle').value.trim();
    const negMark = document.getElementById('negMark').checked;
    const duration = document.getElementById('testDuration').value || 180;
    const schedule = document.getElementById('testSchedule').value; 
    const instructions = document.getElementById('testInstructions').value.trim();
    const blocks = document.querySelectorAll('.q-block');
    if (!title) return alert("Enter a Test Title");

    const questions = [];
    for (let block of blocks) {
        const section = block.querySelector('.q-section').value.trim() || 'GENERAL';
        const text = block.querySelector('.q-text').value.trim();
        const opts = ['A','B','C','D'].map(l => block.querySelector(`.q-opt${l}`).value.trim());
        const correct = block.querySelector('.q-correct').value;
        const imgFile = block.querySelector('.q-img').files[0];
        if (!text || opts.some(o => !o)) return alert("All fields must be filled!");

        let base64Img = null;
        if (imgFile) base64Img = await new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(imgFile); });

        questions.push({ sectionName: section, questionText: text, imageBase64: base64Img, optionA: opts[0], optionB: opts[1], optionC: opts[2], optionD: opts[3], correctAnswer: correct });
    }

    const payload = { title, negativeMarkingEnabled: negMark, durationMinutes: parseInt(duration), instructions, scheduledTime: schedule || null, questions };
    const res = await fetch(`${API_URL}/admin/test/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { alert("Test Created!"); location.reload(); } else alert("Failed to create test.");
}

async function loadAdminTests() {
    const res = await fetch(`${API_URL}/admin/tests`);
    if (!res.ok) return;
    const tests = await res.json();
    const container = document.getElementById('adminTestList');
    if (!container) return;
    
    let html = `<table class="clean-table"><thead><tr><th>Test Title</th><th>Status</th><th>Schedule</th><th>Links & Actions</th></tr></thead><tbody>`;
    tests.forEach(t => {
        const shareUrl = `${window.location.origin}/index.html?testId=${t.id}`;
        html += `<tr>
            <td><strong>${t.title}</strong></td>
            <td><span style="padding:4px 8px; border-radius:4px; font-size:11px; background:${t.active?'#d4f7e3; color:#10b981':'#fee2e2; color:#dc2626'}">${t.active ? 'ACTIVE' : 'DISABLED'}</span></td>
            <td>${t.scheduledTime ? new Date(t.scheduledTime).toLocaleString() : 'Immediate'}</td>
            <td>
                <button onclick="toggleTest(${t.id})" class="btn-outline-spik" style="padding:4px 8px; font-size:11px;">Toggle</button>
                <button onclick="navigator.clipboard.writeText('${shareUrl}'); alert('Copied!');" class="btn-primary-spik" style="padding:4px 8px; font-size:11px;">Copy Link</button>
                <button onclick="deleteAdminTest(${t.id})" class="btn-danger-spik">Delete</button>
            </td>
        </tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

async function toggleTest(id) { await fetch(`${API_URL}/admin/test/toggle/${id}`, { method: 'POST' }); loadAdminTests(); }
async function deleteAdminTest(id) { if(!confirm("Permanently delete this test?")) return; await fetch(`${API_URL}/admin/test/${id}`, { method: 'DELETE' }); loadAdminTests(); }

async function loadAttempts() {
    const res = await fetch(`${API_URL}/admin/attempts`);
    if (!res.ok) return;
    const attempts = await res.json();
    const table = document.getElementById('attemptsTable');
    if (!table) return;
    let html = `<table class="clean-table"><thead><tr><th>ID</th><th>Student</th><th>Test</th><th>Score</th><th>Correct</th><th>Wrong</th><th>Total</th></tr></thead><tbody>`;
    attempts.forEach(a => html += `<tr><td>${a.id}</td><td><strong>${a.studentUserId || a.studentId}</strong></td><td>${a.testTitle}</td><td><strong style="color:#6f42c1">${a.score}</strong></td><td>${a.correctAnswers}</td><td>${a.wrongAnswers}</td><td>${a.totalQuestions}</td></tr>`);
    table.innerHTML = html + `</tbody></table>`;
}
function downloadXLS() { window.location.href = `${API_URL}/admin/export-excel`; }

// ==========================================
// 4. CLEAN SPIK STUDENT PORTAL
// ==========================================
async function loadStudentPortal() {
    const res = await fetch(`${API_URL}/student/tests`);
    if (!res.ok) return;
    const data = await res.json();
    
    const liveContainer = document.getElementById('liveTestsContainer');
    const upContainer = document.getElementById('upcomingTestsContainer');
    if(!liveContainer || !upContainer) return;

    liveContainer.innerHTML = data.available.length === 0 ? '<p style="color:#888;">No live tests currently available.</p>' : '';
    upContainer.innerHTML = data.upcoming.length === 0 ? '<p style="color:#888;">No upcoming tests scheduled.</p>' : '';

    data.available.forEach(t => {
        liveContainer.innerHTML += `
            <div class="stat-card purple-card" style="cursor:pointer; display:flex; flex-direction:column; align-items:flex-start;" onclick="startQuiz(${t.id})">
                <div class="stat-info">
                    <h3 style="color:#6f42c1;">LIVE NOW</h3>
                    <h2 style="font-size:18px; margin:5px 0;">${t.title}</h2>
                    <p>Duration: ${t.durationMinutes || 180} mins | ${t.negativeMarkingEnabled ? 'Neg Marking: -1' : 'No Neg Marking'}</p>
                </div>
                <button class="btn-primary-spik" style="margin-top:15px; width:100%;">Attempt Exam →</button>
            </div>`;
    });

    data.upcoming.forEach(t => {
        const dateStr = new Date(t.scheduledTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        upContainer.innerHTML += `
            <div class="stat-card" style="background:#eaedf1; display:flex; flex-direction:column; align-items:flex-start;">
                <div class="stat-info">
                    <h3 style="color:#555;">UPCOMING</h3>
                    <h2 style="font-size:18px; margin:5px 0; color:#555;">${t.title}</h2>
                    <p style="color:#555;">Opens: <strong>${dateStr} (IST)</strong></p>
                </div>
            </div>`;
    });
}

async function loadStudentAttempts() {
    const studentId = localStorage.getItem('studentId');
    const res = await fetch(`${API_URL}/student/attempts/${studentId}`);
    if (!res.ok) return;
    const attempts = await res.json();
    const table = document.getElementById('studentAttemptsTable');
    if (!table) return;

    if (attempts.length === 0) {
        table.innerHTML = '<p>You have not completed any exams yet.</p>';
        return;
    }

    let html = `<table class="clean-table"><thead><tr><th>Test Title</th><th>Score</th><th>Correct</th><th>Wrong</th><th>Date</th></tr></thead><tbody>`;
    attempts.forEach(a => {
        html += `<tr>
            <td><strong>${a.testTitle}</strong></td>
            <td><strong style="color:#10b981;">${a.score}</strong></td>
            <td>${a.correctAnswers}</td>
            <td>${a.wrongAnswers}</td>
            <td style="font-size:12px;">${new Date(a.attemptTime).toLocaleDateString()}</td>
        </tr>`;
    });
    table.innerHTML = html + `</tbody></table>`;
}

function startQuiz(testId) { localStorage.setItem('currentTestId', testId); window.location.href = 'quiz.html'; }

// ==========================================
// 5. EXAM ENGINE LOGIC (NTA/JEE REPLICA)
// ==========================================
let examData = null, currentQIndex = 0, examTimer = null, remainingSeconds = 0, qStates = [], qAnswers = [];

async function loadExamEngine() {
    const testId = localStorage.getItem('currentTestId');
    const res = await fetch(`${API_URL}/student/test/${testId}`);
    if (!res.ok) { alert("Exam unavailable."); return window.location.replace('student.html'); }
    
    examData = await res.json();
    document.getElementById('examMainTitle').innerText = examData.title;
    document.getElementById('instructionContent').innerHTML = examData.instructions || "<p>No specific instructions provided.</p>";
    
    qStates = new Array(examData.questions.length).fill(0);
    qAnswers = new Array(examData.questions.length).fill(null);
    startExamTimer();
}

function startExamTimer() {
    remainingSeconds = (examData.durationMinutes || 180) * 60;
    examTimer = setInterval(() => {
        if(remainingSeconds <= 0) { clearInterval(examTimer); alert("Time is up! Auto-submitting..."); submitExamFinal(); return; }
        remainingSeconds--;
        const h = Math.floor(remainingSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((remainingSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (remainingSeconds % 60).toString().padStart(2, '0');
        document.getElementById('timeRemaining').innerText = `${h}:${m}:${s}`;
    }, 1000);
    buildSections(); loadQuestion(0);
}

function buildSections() {
    const sections = [...new Set(examData.questions.map(q => q.sectionName || 'GENERAL'))];
    document.getElementById('sectionsBar').innerHTML = sections.map((s, idx) => `<div class="sec-tab ${idx===0?'active':''}" onclick="jumpToSection('${s}', this)">${s}</div>`).join('');
}

function jumpToSection(secName, element) {
    document.querySelectorAll('.sec-tab').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    const idx = examData.questions.findIndex(q => (q.sectionName || 'GENERAL') === secName);
    if(idx !== -1) loadQuestion(idx);
}

function loadQuestion(index) {
    if (index < 0 || index >= examData.questions.length) return;
    currentQIndex = index; const q = examData.questions[index];
    if (qStates[index] === 0) qStates[index] = 1;

    document.getElementById('qNumberDisplay').innerText = `Question ${index + 1}`;
    document.getElementById('questionText').innerHTML = q.questionText;
    document.getElementById('questionImageContainer').innerHTML = q.imageBase64 ? `<img src="${q.imageBase64}" style="max-width:100%; border-radius:8px; margin-top:15px; display:block;">` : '';
    ['A','B','C','D'].forEach(l => document.getElementById(`opt${l}Text`).innerText = q[`option${l}`]);
    document.querySelectorAll('input[name="examOpt"]').forEach(rb => { rb.checked = (rb.value === qAnswers[index]); });

    const activeSec = q.sectionName || 'GENERAL';
    document.querySelectorAll('.sec-tab').forEach(t => { t.classList.toggle('active', t.innerText === activeSec); });
    updatePalette();
}

function updatePalette() {
    const grid = document.getElementById('questionGrid'); grid.innerHTML = '';
    let counts = {nv:0, na:0, ans:0, mr:0, amr:0};
    qStates.forEach((s, idx) => {
        let cls = 'badge-nv';
        if (s===1) { cls='badge-na'; counts.na++; } else if (s===2) { cls='badge-ans'; counts.ans++; } else if (s===3) { cls='badge-mr'; counts.mr++; } else if (s===4) { cls='badge-amr'; counts.amr++; } else counts.nv++;
        let styleStr = idx === currentQIndex ? 'box-shadow: 0 0 0 2px #000;' : '';
        grid.innerHTML += `<div class="badge ${cls}" style="${styleStr}" onclick="loadQuestion(${idx})">${idx + 1}</div>`;
    });
    ['nv','na','ans','mr','amr'].forEach(k => document.getElementById(`count-${k}`).innerText = counts[k]);
}

function getCurrentSelection() { const sel = document.querySelector('input[name="examOpt"]:checked'); return sel ? sel.value : null; }
function saveAndNext() { const ans = getCurrentSelection(); if(ans){ qAnswers[currentQIndex] = ans; qStates[currentQIndex] = 2; } else { qAnswers[currentQIndex] = null; qStates[currentQIndex] = 1; } nextQuestion(); }
function saveAndMark() { const ans = getCurrentSelection(); if(ans){ qAnswers[currentQIndex] = ans; qStates[currentQIndex] = 4; } else { qAnswers[currentQIndex] = null; qStates[currentQIndex] = 3; } nextQuestion(); }
function clearResponse() { document.querySelectorAll('input[name="examOpt"]').forEach(rb => rb.checked = false); qAnswers[currentQIndex] = null; qStates[currentQIndex] = 1; updatePalette(); }
function nextQuestion() { if (currentQIndex < examData.questions.length - 1) loadQuestion(currentQIndex + 1); else updatePalette(); }
function prevQuestion() { if (currentQIndex > 0) loadQuestion(currentQIndex - 1); }
function toggleInstructions() { document.getElementById('instructionsModal').classList.toggle('hidden'); }

async function submitExamFinal() {
    if(!confirm("Are you sure you want to submit the exam?")) return;
    clearInterval(examTimer);
    const answersMap = {};
    examData.questions.forEach((q, idx) => { if(qAnswers[idx]) answersMap[q.id] = qAnswers[idx]; });
    const payload = { testId: examData.id, studentId: localStorage.getItem('studentId'), studentUserId: localStorage.getItem('userId'), answers: answersMap };
    
    try {
        const res = await fetch(`${API_URL}/student/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) {
            const result = await res.json();
            document.getElementById('examMainTitle').innerText = "Exam Completed";
            document.querySelector('.jee-main-layout').innerHTML = `
                <div style="flex:1; display:flex; align-items:center; justify-content:center; background:#fff;">
                    <div style="text-align:center; padding: 50px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                        <h1 style="color: #1f2937;">Exam Submitted Successfully!</h1>
                        <h2 style="color:#01c55d; font-size: 40px; margin: 20px 0;">Score: ${result.score}</h2>
                        <p style="font-size: 16px; color: #4b5563;">Correct: <strong>${result.correctAnswers}</strong> | Wrong: <strong>${result.wrongAnswers}</strong></p>
                        <button onclick="window.location.replace('student.html')" class="btn-save-next" style="margin-top:30px; font-size:16px; padding:12px 30px;">Return to Dashboard</button>
                    </div>
                </div>`;
        }
    } catch (err) { alert("Failed to submit exam due to network error."); }
}