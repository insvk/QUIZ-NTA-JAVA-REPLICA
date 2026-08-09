const API_URL = window.location.origin.includes('localhost') ? 'https://kvnjg-java-quiz-nw.onrender.com' : '/api';

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedTestId = urlParams.get('testId');
    if (sharedTestId) sessionStorage.setItem('pendingTestId', sharedTestId);

    const path = window.location.pathname;
    const role = localStorage.getItem('role');

    if (path.includes('index.html') || path === '/') {
        if (role === 'ADMIN') window.location.href = 'admin.html';
        else if (role === 'STUDENT') redirectStudent();
    } else if (path.includes('admin.html')) {
        if (role !== 'ADMIN') return window.location.href = 'index.html';
        addQuestionField(); loadAdminTests(); loadAttempts(); loadUsers();
    } else if (path.includes('student.html')) {
        if (role !== 'STUDENT') return window.location.href = 'index.html';
    } else if (path.includes('quiz.html')) {
        if (!role) return window.location.href = 'index.html';
        loadExamEngine();
    }
});

// --- AUTHENTICATION ---
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
                window.location.href = 'admin.html';
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
        window.location.href = 'quiz.html';
    } else { window.location.href = 'student.html'; }
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

function logout() { localStorage.clear(); sessionStorage.clear(); window.location.href = 'index.html'; }

// --- ADMIN USER CRUD ---
async function loadUsers() {
    const res = await fetch(`${API_URL}/admin/users`);
    if (res.ok) {
        const users = await res.json();
        const container = document.getElementById('usersTableContainer');
        if (!container) return;
        if (users.length === 0) return container.innerHTML = `<p>No student accounts found.</p>`;
        let html = `<table><tr><th>Reg No</th><th>Name</th><th>Username</th><th>Action</th></tr>`;
        users.forEach(u => {
            html += `<tr><td>${u.regNo || 'N/A'}</td><td>${u.name || 'N/A'}</td><td><strong>${u.userId}</strong></td>
                <td><button onclick="deleteUser(${u.id}, '${u.userId}')" style="background:#f12711; padding:5px 10px; font-size:12px;">Delete</button></td></tr>`;
        });
        container.innerHTML = html + `</table>`;
    }
}

async function adminCreateUser() {
    const uid = document.getElementById('adminNewStudentId').value.trim();
    const name = document.getElementById('adminNewStudentName').value.trim();
    const pwd = document.getElementById('adminNewStudentPwd').value.trim();
    if (!uid || !pwd || !name) return alert("Fill all fields.");
    const res = await fetch(`${API_URL}/admin/users/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, name: name, password: pwd })
    });
    if (res.ok) { alert(`Account Created!`); loadUsers(); } else { alert(await res.text()); }
}

async function deleteUser(id, userId) {
    if (!confirm(`Delete user '${userId}'?`)) return;
    const res = await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE' });
    if (res.ok) loadUsers(); else alert(await res.text());
}

// --- ADMIN TEST CRUD ---
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
            <option value="A">Correct Answer: A</option><option value="B">Correct Answer: B</option>
            <option value="C">Correct Answer: C</option><option value="D">Correct Answer: D</option>
        </select>`;
    container.appendChild(qDiv);
}

async function createTest() {
    const title = document.getElementById('testTitle').value.trim();
    const negMark = document.getElementById('negMark').checked;
    const duration = document.getElementById('testDuration').value || 180;
    const schedule = document.getElementById('testSchedule').value; // YYYY-MM-DDTHH:mm
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
    let html = '';
    tests.forEach(t => {
        const shareUrl = `${window.location.origin}/index.html?testId=${t.id}`;
        html += `<div style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <strong>${t.title}</strong> [${t.active ? 'ACTIVE' : 'DISABLED'}] <br>
            <span style="font-size:12px">Scheduled: ${t.scheduledTime ? new Date(t.scheduledTime).toLocaleString() : 'Immediate'}</span><br>
            <button onclick="toggleTest(${t.id})" style="padding: 5px; font-size: 10px; width: auto;">Toggle Access</button>
            <button onclick="navigator.clipboard.writeText('${shareUrl}'); alert('Copied share link!');" style="padding: 5px; font-size: 10px; background: #11998e; width: auto;">Copy Link</button>
            <button onclick="deleteAdminTest(${t.id})" style="padding: 5px; font-size: 10px; background: #f12711; width: auto;">Delete Test</button>
        </div>`;
    });
    container.innerHTML = html;
}

async function toggleTest(id) { await fetch(`${API_URL}/admin/test/toggle/${id}`, { method: 'POST' }); loadAdminTests(); }
async function deleteAdminTest(id) { if(!confirm("Permanently delete this test?")) return; await fetch(`${API_URL}/admin/test/${id}`, { method: 'DELETE' }); loadAdminTests(); }

// --- STUDENT PORTAL (LIVE & UPCOMING) ---
async function loadStudentPortal() {
    const res = await fetch(`${API_URL}/student/tests`);
    if (!res.ok) return;
    const data = await res.json();
    
    const liveContainer = document.getElementById('testList');
    const upContainer = document.getElementById('upcomingTestList');
    if(!liveContainer || !upContainer) return;

    liveContainer.innerHTML = data.available.length === 0 ? '<p>No live tests available.</p>' : '';
    upContainer.innerHTML = data.upcoming.length === 0 ? '<p>No upcoming tests scheduled.</p>' : '';

    const gradients = ['linear-gradient(135deg, #fff3e0, #ffe0b2)', 'linear-gradient(135deg, #f3e5f5, #e1bee7)', 'linear-gradient(135deg, #e3f2fd, #bbdefb)'];

    data.available.forEach((t, i) => {
        liveContainer.innerHTML += `
            <div class="flash-card" style="background: ${gradients[i % gradients.length]};" onclick="startQuiz(${t.id})">
                <h4>${t.title}</h4>
                <p style="font-size: 12px; margin-top: 10px; opacity: 0.8;">Duration: ${t.durationMinutes || 180} mins</p>
                <div style="margin-top: 15px;"><span style="background: rgba(255,255,255,0.5); padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Attempt Now &#8594;</span></div>
            </div>`;
    });

    data.upcoming.forEach((t) => {
        const dateStr = new Date(t.scheduledTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        upContainer.innerHTML += `
            <div class="flash-card upcoming-card" style="background: #e9ecef;">
                <h4>${t.title}</h4>
                <p style="font-size:12px; color:#666; margin-top:10px;">Opens: <strong>${dateStr} (IST)</strong></p>
            </div>`;
    });
}
function startQuiz(testId) { localStorage.setItem('currentTestId', testId); window.location.href = 'quiz.html'; }

// --- EXAM ENGINE LOGIC ---
// --- EXAM ENGINE LOGIC (NTA/JEE EXACT REPLICA) ---
let examData = null, currentQIndex = 0, examTimer = null, remainingSeconds = 0, qStates = [], qAnswers = [];

async function loadExamEngine() {
    const testId = localStorage.getItem('currentTestId');
    const res = await fetch(`${API_URL}/student/test/${testId}`);
    if (!res.ok) { alert("Exam unavailable."); return window.location.href = 'student.html'; }
    
    examData = await res.json();
    document.getElementById('examMainTitle').innerText = examData.title;
    document.getElementById('instructionContent').innerHTML = examData.instructions || "<p>No specific instructions provided.</p>";
    
    qStates = new Array(examData.questions.length).fill(0); // 0 = Not Visited
    qAnswers = new Array(examData.questions.length).fill(null);
    
    startExamTimer();
}

function startExamTimer() {
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
    document.getElementById('sectionsBar').innerHTML = sections.map((s, idx) => 
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
    
    // Change to 'Not Answered' (1) if it was 'Not Visited' (0)
    if (qStates[index] === 0) qStates[index] = 1;

    document.getElementById('qNumberDisplay').innerText = `Question ${index + 1}`;
    document.getElementById('questionText').innerHTML = q.questionText;
    document.getElementById('questionImageContainer').innerHTML = q.imageBase64 ? `<img src="${q.imageBase64}" style="max-width:100%; border-radius:8px; margin-top:15px; display:block;">` : '';
    
    ['A','B','C','D'].forEach(l => document.getElementById(`opt${l}Text`).innerText = q[`option${l}`]);
    
    document.querySelectorAll('input[name="examOpt"]').forEach(rb => { 
        rb.checked = (rb.value === qAnswers[index]); 
    });

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
    
    qStates.forEach((s, idx) => {
        let cls = 'badge-nv';
        if (s===1) { cls='badge-na'; counts.na++; } 
        else if (s===2) { cls='badge-ans'; counts.ans++; } 
        else if (s===3) { cls='badge-mr'; counts.mr++; } 
        else if (s===4) { cls='badge-amr'; counts.amr++; } 
        else counts.nv++;
        
        // Outline the currently viewed question
        let styleStr = idx === currentQIndex ? 'box-shadow: 0 0 0 2px #000;' : '';
        grid.innerHTML += `<div class="badge ${cls}" style="${styleStr}" onclick="loadQuestion(${idx})">${idx + 1}</div>`;
    });
    
    ['nv','na','ans','mr','amr'].forEach(k => document.getElementById(`count-${k}`).innerText = counts[k]);
}

function getCurrentSelection() { 
    const sel = document.querySelector('input[name="examOpt"]:checked'); 
    return sel ? sel.value : null; 
}

function saveAndNext() { 
    const ans = getCurrentSelection(); 
    if(ans){ 
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
    if(ans){ 
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
    qStates[currentQIndex] = 1; // Reverts to Not Answered
    updatePalette(); 
}

function nextQuestion() { 
    if (currentQIndex < examData.questions.length - 1) loadQuestion(currentQIndex + 1); 
    else updatePalette(); 
}

function prevQuestion() { 
    if (currentQIndex > 0) loadQuestion(currentQIndex - 1); 
}

function toggleInstructions() {
    const modal = document.getElementById('instructionsModal');
    modal.classList.toggle('hidden');
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
            document.getElementById('examMainTitle').innerText = "Exam Completed";
            document.querySelector('.jee-main-layout').innerHTML = `
                <div style="flex:1; display:flex; align-items:center; justify-content:center; background:#fff;">
                    <div style="text-align:center; padding: 50px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                        <h1 style="color: #1f2937;">Exam Submitted Successfully!</h1>
                        <h2 style="color:#01c55d; font-size: 40px; margin: 20px 0;">Score: ${result.score}</h2>
                        <p style="font-size: 16px; color: #4b5563;">Correct: <strong>${result.correctAnswers}</strong> | Wrong: <strong>${result.wrongAnswers}</strong></p>
                        <button onclick="window.location.href='student.html'" class="btn-save-next" style="margin-top:30px; font-size:16px; padding:12px 30px;">Return to Dashboard</button>
                    </div>
                </div>`;
        }
    } catch (err) { alert("Failed to submit exam due to network error."); }
}

// Ensure Admin Data loads normally
async function loadAttempts() {
    try {
        const res = await fetch(`${API_URL}/admin/attempts`);
        if (!res.ok) return;
        const attempts = await res.json();
        const table = document.getElementById('attemptsTable');
        if (!table) return;
        let html = `<table><tr><th>ID</th><th>Student</th><th>Test</th><th>Score</th><th>Correct</th><th>Wrong</th><th>Total</th></tr>`;
        attempts.forEach(a => html += `<tr><td>${a.id}</td><td>${a.studentUserId || a.studentId}</td><td>${a.testTitle}</td><td>${a.score}</td><td>${a.correctAnswers}</td><td>${a.wrongAnswers}</td><td>${a.totalQuestions}</td></tr>`);
        table.innerHTML = html + `</table>`;
    } catch (err) {}
}
function downloadXLS() { window.location.href = `${API_URL}/admin/export-excel`; }
async function loadLogs() {
    const res = await fetch(`${API_URL}/admin/logs`);
    const logs = await res.json();
    document.getElementById('logsContainer').innerHTML = logs.map(l => `<div>[${l.timestamp}] <b>${l.username}</b>: ${l.action} - ${l.details}</div>`).join('');
}