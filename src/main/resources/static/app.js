const API_URL = window.location.origin.includes('localhost') ? 'https://kvnjg-java-quiz-nw.onrender.com' : '/api';

// ==========================================
// 1. STRICT ROUTING & AUTHENTICATION LOCK
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedTestId = urlParams.get('testId');
    if (sharedTestId) sessionStorage.setItem('pendingTestId', sharedTestId);

    const path = window.location.pathname.toLowerCase();
    const role = localStorage.getItem('role');

    // 1. Protect Admin Page
    if (path.includes('admin.html')) {
        if (role !== 'ADMIN') return forceLogout();
        initAdminDashboard(); 
    } 
    // 2. Protect Student Page
    else if (path.includes('student.html')) {
        if (role !== 'STUDENT') return forceLogout();
        loadStudentPortal();
        loadStudentAttempts();
    } 
    // 3. Protect Exam Engine
    else if (path.includes('quiz.html')) {
        if (!role) return forceLogout();
        loadExamEngine();
    } 
    // 4. Default Landing (Index / Root)
    else {
        if (role === 'ADMIN') return window.location.replace('admin.html');
        if (role === 'STUDENT') return redirectStudent();
        
        // If no role, ensure they stay on the clean login screen
        document.getElementById('loginBox')?.classList.remove('hidden');
        document.getElementById('regBox')?.classList.add('hidden');
    }
});

// The Ultimate Fail-Safe Logout (Nuclear Cache Busting)
function forceLogout() {
    // Forcefully overwrite keys before clearing to ensure no ghosts remain
    localStorage.setItem('role', '');
    localStorage.setItem('userId', '');
    
    // Wipe all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Hard redirect with a timestamp to permanently break browser caching
    window.location.href = 'index.html?logout=' + new Date().getTime();
}

function logout() {
    forceLogout();
}

function toggleAuth() {
    document.getElementById('loginBox')?.classList.toggle('hidden');
    document.getElementById('regBox')?.classList.toggle('hidden');
}

function togglePwd(id) {
    const input = document.getElementById(id);
    if(input) input.type = input.type === 'password' ? 'text' : 'password';
}

async function login() {
    const uid = document.getElementById('userId')?.value.trim();
    const pwd = document.getElementById('pwd')?.value.trim();
    
    if (!uid || !pwd) return alert("Please enter your Username and Password.");

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
    } else { 
        window.location.replace('student.html'); 
    }
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

// ==========================================
// 2. SHARED SPIK THEME SIDEBAR LOGIC
// ==========================================
function toggleSidebar() { document.getElementById('sidebar')?.classList.toggle('open'); }

function switchView(viewId, element) {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId)?.classList.add('active');
    
    if(element) {
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        element.classList.add('active');
    }
    // Refresh admin dash if clicking back to Home
    if(viewId === 'view-dashboard' && localStorage.getItem('role') === 'ADMIN') initAdminDashboard();
}

function switchAdminView(viewId, element) { switchView(viewId, element); } // Alias for Admin HTML

// ==========================================
// 3. ADMIN DASHBOARD LOGIC 
// ==========================================
// --- ADMIN DASHBOARD LOGIC (ALPS DARK THEME) ---
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
            document.getElementById('statTopScorerName').innerText = `Top: ${sorted[0].studentUserId}`;
            document.getElementById('statTopScorerScore').innerText = sorted[0].score;
        }

        const logTable = document.getElementById('dashLogsTable').getElementsByTagName('tbody')[0];
        logTable.innerHTML = '';
        logs.slice().reverse().slice(0, 5).forEach(l => {
            logTable.innerHTML += `<tr><td style="color:#a1a1aa;">${new Date(l.timestamp).toLocaleDateString()}</td><td>${l.username}</td><td><span class="badge bg-purple">${l.action}</span></td></tr>`;
        });

        const testScores = {};
        attempts.forEach(a => {
            if(!testScores[a.testTitle]) testScores[a.testTitle] = { total: 0, count: 0 };
            testScores[a.testTitle].total += a.score;
            testScores[a.testTitle].count += 1;
        });

        const labels = []; const data1 = []; const data2 = [];
        Object.keys(testScores).slice(-5).forEach((title, i) => {
            labels.push(title.substring(0, 10));
            const avg = testScores[title].total / testScores[title].count;
            data1.push(avg.toFixed(0)); // Pink Bar Data
            data2.push((avg * 0.8).toFixed(0)); // Purple Bar Mock Data
        });

        if(dashChart) dashChart.destroy();
        const ctx = document.getElementById('performanceChart')?.getContext('2d');
        if(ctx) {
            dashChart = new Chart(ctx, {
                type: 'bar', // EXACT match to reference image
                data: { 
                    labels: labels.length ? labels : ['No Data'], 
                    datasets: [
                        { label: 'Q1 Target', data: data1.length ? data1 : [0], backgroundColor: '#f43f5e', barPercentage: 0.6 },
                        { label: 'Actual Score', data: data2.length ? data2 : [0], backgroundColor: '#8b5cf6', barPercentage: 0.6 }
                    ] 
                },
                options: { 
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                        y: { grid: { color: '#33333b', drawBorder: false }, ticks: { color: '#a1a1aa', font: { size: 10 } } },
                        x: { grid: { display: false }, ticks: { color: '#a1a1aa', font: { size: 10 } } }
                    },
                    plugins: { legend: { labels: { color: '#a1a1aa', boxWidth: 10 } } }
                }
            });
        }
    } catch (e) { console.log("Init dash error:", e); }
}

async function loadUsers() {
    const res = await fetch(`${API_URL}/admin/users`);
    if (res.ok) {
        const users = await res.json();
        const container = document.getElementById('usersTableContainer');
        if (!container) return;
        let html = `<table class="dark-table"><thead><tr><th>Reg No</th><th>Name</th><th>Username</th><th>Action</th></tr></thead><tbody>`;
        users.forEach(u => {
            html += `<tr><td>${u.regNo || 'N/A'}</td><td>${u.name || 'N/A'}</td><td>${u.userId}</td>
                <td><button onclick="deleteUser(${u.id}, '${u.userId}')" class="btn-dark" style="color:#f43f5e; border-color:#f43f5e;">Delete</button></td></tr>`;
        });
        container.innerHTML = html + `</tbody></table>`;
    }
}

async function loadAdminTests() {
    const res = await fetch(`${API_URL}/admin/tests`);
    if (!res.ok) return;
    const tests = await res.json();
    const container = document.getElementById('adminTestList');
    if (!container) return;
    
    let html = `<table class="dark-table"><thead><tr><th>Test Title</th><th>Status</th><th>Schedule</th><th>Links & Actions</th></tr></thead><tbody>`;
    tests.forEach(t => {
        const shareUrl = `${window.location.origin}/index.html?testId=${t.id}`;
        const badgeClass = t.active ? 'bg-green' : 'bg-red';
        const badgeText = t.active ? 'Active' : 'Offline';
        html += `<tr>
            <td>${t.title}</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td style="color:#a1a1aa;">${t.scheduledTime ? new Date(t.scheduledTime).toLocaleString() : 'Immediate'}</td>
            <td style="display:flex; gap:8px;">
                <button onclick="toggleTest(${t.id})" class="btn-dark">Toggle</button>
                <button onclick="navigator.clipboard.writeText('${shareUrl}'); alert('Copied!');" class="btn-dark" style="color:#8b5cf6; border-color:#8b5cf6;">Copy Link</button>
                <button onclick="deleteAdminTest(${t.id})" class="btn-pink">Delete</button>
            </td>
        </tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

async function loadAttempts() {
    const res = await fetch(`${API_URL}/admin/attempts`);
    if (!res.ok) return;
    const attempts = await res.json();
    const table = document.getElementById('attemptsTable');
    if (!table) return;
    let html = `<table class="dark-table"><thead><tr><th>ID</th><th>Student</th><th>Test</th><th>Score</th><th>Correct</th><th>Wrong</th><th>Total</th></tr></thead><tbody>`;
    attempts.forEach(a => html += `<tr><td>#${a.id}</td><td>${a.studentUserId || a.studentId}</td><td>${a.testTitle}</td><td><span class="badge bg-purple">${a.score}</span></td><td>${a.correctAnswers}</td><td>${a.wrongAnswers}</td><td>${a.totalQuestions}</td></tr>`);
    table.innerHTML = html + `</tbody></table>`;
}
// ==========================================
// 4. STUDENT PORTAL LOGIC (DARK THEME)
// ==========================================
async function loadStudentPortal() {
    const res = await fetch(`${API_URL}/student/tests`);
    if (!res.ok) return;
    const data = await res.json();
    
    const liveContainer = document.getElementById('liveTestsContainer');
    const upContainer = document.getElementById('upcomingTestsContainer');
    if(!liveContainer || !upContainer) return;

    liveContainer.innerHTML = data.available.length === 0 ? '<p style="color:#a1a1aa; font-size:14px; grid-column: span 2;">No live tests currently available.</p>' : '';
    upContainer.innerHTML = data.upcoming.length === 0 ? '<p style="color:#a1a1aa; font-size:14px; grid-column: span 2;">No upcoming tests scheduled.</p>' : '';

    data.available.forEach(t => {
        liveContainer.innerHTML += `
            <div class="dark-panel" style="cursor:pointer; border-color:#10b981; display:flex; flex-direction:column; align-items:flex-start; margin-bottom:0;" onclick="startQuiz(${t.id})">
                <span class="badge bg-green mb-20">LIVE NOW</span>
                <h2 style="font-size:18px; margin:0 0 10px 0; color:#fff;">${t.title}</h2>
                <p style="color:#a1a1aa; font-size:13px;">Duration: ${t.durationMinutes || 180} mins | ${t.negativeMarkingEnabled ? 'Neg Marking: -1' : 'No Neg Marking'}</p>
                <button class="btn-pink" style="margin-top:20px; width:100%;">Attempt Exam →</button>
            </div>`;
    });

    data.upcoming.forEach(t => {
        const dateStr = new Date(t.scheduledTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        upContainer.innerHTML += `
            <div class="dark-panel" style="background:#1e1e24; display:flex; flex-direction:column; align-items:flex-start; margin-bottom:0; opacity:0.7;">
                <span class="badge bg-purple mb-20">UPCOMING</span>
                <h2 style="font-size:18px; margin:0 0 10px 0; color:#c9d1d9;">${t.title}</h2>
                <p style="color:#a1a1aa; font-size:13px;">Opens: <strong style="color:#fff;">${dateStr} (IST)</strong></p>
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
        table.innerHTML = '<p style="color:#a1a1aa;">You have not completed any exams yet.</p>';
        return;
    }

    let html = `<table class="dark-table"><thead><tr><th>Test Title</th><th>Score</th><th>Correct</th><th>Wrong</th><th>Date</th></tr></thead><tbody>`;
    attempts.forEach(a => {
        html += `<tr>
            <td><strong style="color:#fff;">${a.testTitle}</strong></td>
            <td><span class="badge bg-green">${a.score}</span></td>
            <td>${a.correctAnswers}</td>
            <td>${a.wrongAnswers}</td>
            <td style="font-size:12px; color:#a1a1aa;">${new Date(a.attemptTime).toLocaleDateString()}</td>
        </tr>`;
    });
    table.innerHTML = html + `</tbody></table>`;
}
// ==========================================
// 5. EXAM ENGINE LOGIC (NTA/JEE REPLICA)
// ==========================================
let examData = null, currentQIndex = 0, examTimer = null, remainingSeconds = 0, qStates = [], qAnswers = [];

async function loadExamEngine() {
    const testId = localStorage.getItem('currentTestId');
    if(!testId) return window.location.replace('student.html');

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
        const timerDisplay = document.getElementById('timeRemaining');
        if(timerDisplay) timerDisplay.innerText = `${h}:${m}:${s}`;
    }, 1000);
    buildSections(); loadQuestion(0);
}

function buildSections() {
    const sections = [...new Set(examData.questions.map(q => q.sectionName || 'GENERAL'))];
    const secBar = document.getElementById('sectionsBar');
    if(secBar) {
        secBar.innerHTML = sections.map((s, idx) => `<div class="sec-tab ${idx===0?'active':''}" onclick="jumpToSection('${s}', this)">${s}</div>`).join('');
    }
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
    
    ['A','B','C','D'].forEach(l => {
        const opt = document.getElementById(`opt${l}Text`);
        if(opt) opt.innerText = q[`option${l}`];
    });

    document.querySelectorAll('input[name="examOpt"]').forEach(rb => { rb.checked = (rb.value === qAnswers[index]); });

    const activeSec = q.sectionName || 'GENERAL';
    document.querySelectorAll('.sec-tab').forEach(t => { t.classList.toggle('active', t.innerText === activeSec); });
    updatePalette();
}

function updatePalette() {
    const grid = document.getElementById('questionGrid'); 
    if(!grid) return;
    grid.innerHTML = '';
    let counts = {nv:0, na:0, ans:0, mr:0, amr:0};
    qStates.forEach((s, idx) => {
        let cls = 'badge-nv';
        if (s===1) { cls='badge-na'; counts.na++; } else if (s===2) { cls='badge-ans'; counts.ans++; } else if (s===3) { cls='badge-mr'; counts.mr++; } else if (s===4) { cls='badge-amr'; counts.amr++; } else counts.nv++;
        let styleStr = idx === currentQIndex ? 'box-shadow: 0 0 0 2px #000;' : '';
        grid.innerHTML += `<div class="badge ${cls}" style="${styleStr}" onclick="loadQuestion(${idx})">${idx + 1}</div>`;
    });
    ['nv','na','ans','mr','amr'].forEach(k => {
        const el = document.getElementById(`count-${k}`);
        if(el) el.innerText = counts[k];
    });
}

function getCurrentSelection() { const sel = document.querySelector('input[name="examOpt"]:checked'); return sel ? sel.value : null; }
function saveAndNext() { const ans = getCurrentSelection(); if(ans){ qAnswers[currentQIndex] = ans; qStates[currentQIndex] = 2; } else { qAnswers[currentQIndex] = null; qStates[currentQIndex] = 1; } nextQuestion(); }
function saveAndMark() { const ans = getCurrentSelection(); if(ans){ qAnswers[currentQIndex] = ans; qStates[currentQIndex] = 4; } else { qAnswers[currentQIndex] = null; qStates[currentQIndex] = 3; } nextQuestion(); }
function clearResponse() { document.querySelectorAll('input[name="examOpt"]').forEach(rb => rb.checked = false); qAnswers[currentQIndex] = null; qStates[currentQIndex] = 1; updatePalette(); }
function nextQuestion() { if (currentQIndex < examData.questions.length - 1) loadQuestion(currentQIndex + 1); else updatePalette(); }
function prevQuestion() { if (currentQIndex > 0) loadQuestion(currentQIndex - 1); }
function toggleInstructions() { document.getElementById('instructionsModal')?.classList.toggle('hidden'); }

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

// ==========================================
// 6. GOD MAXX STUDENT MANAGEMENT EXTENSIONS
// ==========================================

// ADMIN: Update Registration Sequence
async function updateRegSequence() {
    const prefix = document.getElementById('adminRegPrefix').value.trim();
    const startNumber = document.getElementById('adminRegStart').value.trim();

    if (!prefix || !startNumber) return alert("Please provide both Prefix and Starting Number.");

    try {
        const res = await fetch(`${API_URL}/admin/settings/reg-sequence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefix: prefix, startNumber: startNumber })
        });
        
        if (res.ok) {
            alert("Registration Sequence Updated Successfully! Next student will receive: " + prefix + startNumber);
            document.getElementById('adminRegPrefix').value = '';
            document.getElementById('adminRegStart').value = '';
        } else {
            alert("Failed to update sequence.");
        }
    } catch (err) { alert("Network Error: Could not reach server."); }
}

// STUDENT: Load Detailed Profile Data
async function loadProfile() {
    const studentId = localStorage.getItem('studentId');
    if (!studentId) return;

    try {
        const res = await fetch(`${API_URL}/student/profile/${studentId}`);
        if (res.ok) {
            const data = await res.json();
            
            document.getElementById('profileDetailedName').innerText = data.name.toUpperCase();
            document.getElementById('profileDetailedRegNo').innerText = "REG: " + data.regNo;
            document.getElementById('profileDetailedEmail').innerText = data.email || "Not Provided";
            document.getElementById('profileDetailedUserId').innerText = data.userId;
            
            if (data.profilePicBase64 && data.profilePicBase64.length > 50) {
                document.getElementById('profileDetailedPic').src = data.profilePicBase64;
                // Also update top nav just in case
                document.getElementById('topNavProfilePic').src = data.profilePicBase64;
            }
        }
    } catch (err) { console.log("Failed to load profile details."); }
}