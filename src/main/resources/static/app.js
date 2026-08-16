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
        
        document.getElementById('loginBox')?.classList.remove('hidden');
        document.getElementById('regBox')?.classList.add('hidden');
    }
});

function forceLogout() {
    localStorage.setItem('role', '');
    localStorage.setItem('userId', '');
    localStorage.clear();
    sessionStorage.clear();
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
    const picFile = document.getElementById('regPic')?.files[0];

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
// 2. SHARED SIDEBAR & VIEW SWITCHER
// ==========================================
function toggleSidebar() { document.getElementById('sidebar')?.classList.toggle('open'); }

function switchView(viewId, element) {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId)?.classList.add('active');
    
    if(element) {
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        element.classList.add('active');
    }
    if(viewId === 'view-dashboard' && localStorage.getItem('role') === 'ADMIN') initAdminDashboard();
}

function switchAdminView(viewId, element) { switchView(viewId, element); }

// ==========================================
// 3. ADMIN DASHBOARD & ADVANCED BUILDER
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
        if(document.getElementById('statLiveTests')) document.getElementById('statLiveTests').innerText = liveCount;
        if(document.getElementById('statUpcomingTests')) document.getElementById('statUpcomingTests').innerText = upcomingCount;
        if(document.getElementById('statFinishedTests')) document.getElementById('statFinishedTests').innerText = attempts.length;

        if(attempts.length > 0) {
            const sorted = [...attempts].sort((a,b) => b.score - a.score);
            if(document.getElementById('statTopScorerName')) document.getElementById('statTopScorerName').innerText = `Top: ${sorted[0].studentUserId || sorted[0].studentId}`;
            if(document.getElementById('statTopScorerScore')) document.getElementById('statTopScorerScore').innerText = sorted[0].score;
        }

        const logTable = document.getElementById('dashLogsTable')?.getElementsByTagName('tbody')[0];
        if(logTable) {
            logTable.innerHTML = '';
            logs.slice().reverse().slice(0, 8).forEach(l => {
                logTable.innerHTML += `<tr><td style="color:#a1a1aa;">${new Date(l.timestamp).toLocaleString()}</td><td>${l.username}</td><td><span class="badge bg-purple">${l.action}</span></td></tr>`;
            });
        }

        const testScores = {};
        attempts.forEach(a => {
            if(!testScores[a.testTitle]) testScores[a.testTitle] = { total: 0, count: 0 };
            testScores[a.testTitle].total += a.score;
            testScores[a.testTitle].count += 1;
        });

        const labels = []; const data1 = []; const data2 = [];
        Object.keys(testScores).slice(-5).forEach((title) => {
            labels.push(title.substring(0, 12));
            const avg = testScores[title].total / testScores[title].count;
            data1.push(avg.toFixed(0));
            data2.push((avg * 0.85).toFixed(0));
        });

        if(dashChart) dashChart.destroy();
        const ctx = document.getElementById('performanceChart')?.getContext('2d');
        if(ctx) {
            dashChart = new Chart(ctx, {
                type: 'bar',
                data: { 
                    labels: labels.length ? labels : ['No Data'], 
                    datasets: [
                        { label: 'Avg Candidate Score', data: data1.length ? data1 : [0], backgroundColor: '#f43f5e', barPercentage: 0.6 },
                        { label: 'Passing Benchmark', data: data2.length ? data2 : [0], backgroundColor: '#8b5cf6', barPercentage: 0.6 }
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

let globalUsersList = [];

async function loadUsers() {
    const res = await fetch(`${API_URL}/admin/users`);
    if (res.ok) {
        globalUsersList = await res.json();
        renderUsersTable(globalUsersList);
    }
}

function renderUsersTable(users) {
    const container = document.getElementById('usersTableContainer');
    if (document.getElementById('studentListCount')) document.getElementById('studentListCount').innerText = users.length;
    if (!container) return;
    let html = `<table class="dark-table"><thead><tr>
        <th>Reg No</th><th>Name</th><th>Username</th><th>Department/Batch</th><th>Status</th><th>Actions</th>
    </tr></thead><tbody>`;
    users.forEach(u => {
        let statusBadge = u.status === 'ARCHIVED' ? 'bg-purple' : (u.status === 'ACTIVE' ? 'bg-green' : 'bg-red');
        html += `<tr>
            <td><strong style="color:#10b981;">${u.regNo || 'N/A'}</strong></td>
            <td>${u.name || 'N/A'}</td>
            <td>${u.userId}</td>
            <td><span style="font-size:12px; color:#a1a1aa;">${u.department || '-'} / ${u.batch || '-'}</span></td>
            <td><span class="badge ${statusBadge}">${u.status || 'ACTIVE'}</span></td>
            <td style="display:flex; gap:6px;">
                <button onclick="openAdminStudentProfile(${u.id})" class="btn-dark" style="color:#38bdf8; border-color:#38bdf8; padding:4px 8px; font-size:11px;">Edit / Profile</button>
                <button onclick="deleteUser(${u.id}, '${u.userId}')" class="btn-dark" style="color:#f43f5e; border-color:#f43f5e; padding:4px 8px; font-size:11px;">Archive/Del</button>
            </td>
        </tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

async function searchStudentsAdmin() {
    const q = document.getElementById('filterStudentQuery')?.value.trim() || '';
    const dept = document.getElementById('filterStudentDept')?.value.trim() || '';
    const batch = document.getElementById('filterStudentBatch')?.value.trim() || '';
    const status = document.getElementById('filterStudentStatus')?.value || '';
    
    try {
        const res = await fetch(`${API_URL}/admin/students/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: q, department: dept, batch: batch, status: status })
        });
        if (res.ok) {
            const users = await res.json();
            renderUsersTable(users);
        }
    } catch(e) { alert("Search failed."); }
}

function clearStudentFilters() {
    if (document.getElementById('filterStudentQuery')) document.getElementById('filterStudentQuery').value = '';
    if (document.getElementById('filterStudentDept')) document.getElementById('filterStudentDept').value = '';
    if (document.getElementById('filterStudentBatch')) document.getElementById('filterStudentBatch').value = '';
    if (document.getElementById('filterStudentStatus')) document.getElementById('filterStudentStatus').value = '';
    loadUsers();
}

async function handleBulkStudentImport() {
    const raw = document.getElementById('bulkImportJson')?.value.trim();
    if (!raw) return alert("Please paste JSON array.");
    try {
        const users = JSON.parse(raw);
        if (!Array.isArray(users)) return alert("JSON must be an array.");
        
        const res = await fetch(`${API_URL}/admin/users/bulk-import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(users)
        });
        const data = await res.json();
        alert(data.message + (data.errors ? "\nErrors:\n" + data.errors.join("\n") : ""));
        document.getElementById('bulkImportJson').value = '';
        loadUsers();
    } catch(e) { alert("Invalid JSON format."); }
}

async function openAdminStudentProfile(id) {
    const u = globalUsersList.find(x => x.id === id);
    if (!u) return;

    document.getElementById('modStuId').innerText = u.id;
    document.getElementById('modStuReg').innerText = u.regNo || 'N/A';
    document.getElementById('modStuName').innerText = u.name || 'Unnamed';
    document.getElementById('modStuStatus').innerText = u.status || 'ACTIVE';
    document.getElementById('modStuBatchBadge').innerText = u.batch || 'No Batch';
    
    document.getElementById('editStuDbId').value = u.id;
    document.getElementById('editStuName').value = u.name || '';
    document.getElementById('editStuRegNo').value = u.regNo || '';
    document.getElementById('editStuEmail').value = u.email || '';
    document.getElementById('editStuPhone').value = u.phone || '';
    document.getElementById('editStuDob').value = u.dob || '';
    document.getElementById('editStuGender').value = u.gender || '';
    document.getElementById('editStuPfp').value = u.profilePicBase64 || '';
    document.getElementById('editStuPassword').value = '';
    document.getElementById('editStuDept').value = u.department || '';
    document.getElementById('editStuBatch').value = u.batch || '';
    document.getElementById('editStuSection').value = u.section || '';
    document.getElementById('editStuCourse').value = u.course || '';
    document.getElementById('editStuStatus').value = u.status || 'ACTIVE';
    
    document.getElementById('adminStudentProfileModal')?.classList.remove('hidden');
    
    // Fetch Performance
    document.getElementById('modStuPerfLoader').style.display = 'block';
    document.getElementById('modStuPerfContent').classList.add('hidden');
    try {
        const pRes = await fetch(`${API_URL}/student/performance/${id}`);
        if (pRes.ok) {
            const perf = await pRes.json();
            document.getElementById('modPerfExams').innerText = perf.totalExams;
            document.getElementById('modPerfAvg').innerText = perf.averageScore;
            document.getElementById('modPerfBest').innerText = perf.highestScore;
            
            const trend = document.getElementById('modPerfTrend');
            trend.innerHTML = '';
            if (perf.recentScores && perf.recentScores.length > 0) {
                const maxS = Math.max(10, ...perf.recentScores);
                perf.recentScores.reverse().forEach(score => {
                    let h = (score / maxS) * 100;
                    if (h > 100) h = 100; if (h < 5) h = 5;
                    trend.innerHTML += `<div style="width:20px; height:${h}%; background:#38bdf8; border-radius:2px;" title="Score: ${score}"></div>`;
                });
            } else {
                trend.innerHTML = '<span style="font-size:11px; color:#a1a1aa;">No recent exams</span>';
            }
            
            document.getElementById('modStuPerfLoader').style.display = 'none';
            document.getElementById('modStuPerfContent').classList.remove('hidden');
        }
    } catch(e) {}
}

function closeAdminStudentProfile() {
    document.getElementById('adminStudentProfileModal')?.classList.add('hidden');
}

async function saveStudentProfileChanges() {
    const id = document.getElementById('editStuDbId').value;
    const payload = {
        name: document.getElementById('editStuName').value,
        regNo: document.getElementById('editStuRegNo').value,
        email: document.getElementById('editStuEmail').value,
        phone: document.getElementById('editStuPhone').value,
        dob: document.getElementById('editStuDob').value,
        gender: document.getElementById('editStuGender').value,
        profilePicBase64: document.getElementById('editStuPfp').value,
        password: document.getElementById('editStuPassword').value,
        department: document.getElementById('editStuDept').value,
        batch: document.getElementById('editStuBatch').value,
        section: document.getElementById('editStuSection').value,
        course: document.getElementById('editStuCourse').value,
        status: document.getElementById('editStuStatus').value
    };
    
    try {
        const res = await fetch(`${API_URL}/admin/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("Profile updated successfully!");
            closeAdminStudentProfile();
            loadUsers();
        } else {
            alert("Failed to update profile.");
        }
    } catch(e) { alert("Network error."); }
}

async function loadAdminTests() {
    const res = await fetch(`${API_URL}/admin/tests`);
    if (!res.ok) return;
    const tests = await res.json();
    const container = document.getElementById('adminTestList');
    if (!container) return;
    
    let html = `<table class="dark-table"><thead><tr><th>Exam Title</th><th>Type</th><th>Status</th><th>Questions</th><th>Actions & Analytics</th></tr></thead><tbody>`;
    tests.forEach(t => {
        const shareUrl = `${window.location.origin}/index.html?testId=${t.id}`;
        const isLive = t.status === 'LIVE' || t.active;
        const badgeClass = isLive ? 'bg-green' : 'bg-red';
        const badgeText = isLive ? 'LIVE' : (t.status || 'DRAFT');
        const qCount = t.questions ? t.questions.length : 0;
        
        html += `<tr>
            <td><strong>${t.title}</strong><br><small style="color:#a1a1aa;">Code: ${t.examCode || 'N/A'}</small></td>
            <td><span class="q-badge-type">${t.examType || 'NORMAL_MCQ'}</span></td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td>${qCount} Questions</td>
            <td style="display:flex; gap:6px; flex-wrap:wrap;">
                <button onclick="openAnalyticsModal(${t.id})" class="btn-dark" style="color:#38bdf8; border-color:#38bdf8;">📊 Analytics</button>
                <button onclick="validateExamAdmin(${t.id})" class="btn-dark" style="color:#fbbf24; border-color:#fbbf24;">✓ Validate</button>
                <button onclick="reEvaluateAdmin(${t.id})" class="btn-dark" style="color:#a78bfa; border-color:#a78bfa;">🔄 Re-Score</button>
                <button onclick="toggleTest(${t.id})" class="btn-dark">${isLive ? 'Take Offline' : 'Go Live'}</button>
                <button onclick="navigator.clipboard.writeText('${shareUrl}'); alert('Invite Link Copied!');" class="btn-dark" style="color:#10b981; border-color:#10b981;">Copy Link</button>
                <button onclick="deleteAdminTest(${t.id})" class="btn-pink">Delete</button>
            </td>
        </tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

// 1-Click Preset Template Loader
async function applyExamPreset(presetId) {
    try {
        const res = await fetch(`${API_URL}/admin/exam-templates`);
        if (!res.ok) return alert("Failed to fetch templates.");
        const templates = await res.json();
        const tmpl = templates.find(t => t.id === presetId);
        if (!tmpl) return;

        document.getElementById('testTitle').value = tmpl.name;
        document.getElementById('testExamType').value = tmpl.examType;
        document.getElementById('testDuration').value = tmpl.durationMinutes;
        document.getElementById('testMaxMarks').value = tmpl.maxMarks;
        document.getElementById('testInstructions').value = tmpl.instructions.replace(/<[^>]*>?/gm, '');

        const container = document.getElementById('questionsBuilder');
        container.innerHTML = '';

        // Pre-generate sample blueprint questions
        tmpl.subjects.forEach(subj => {
            tmpl.sections.forEach(sec => {
                addQuestionField(sec.type, {
                    subject: subj,
                    sectionName: `${subj} - ${sec.name}`,
                    pos: sec.pos,
                    neg: sec.neg
                });
            });
        });

        alert(`Preset "${tmpl.name}" loaded with ${tmpl.subjects.length} subjects! Configure or add questions below.`);
    } catch(err) { alert("Error loading preset: " + err); }
}

// Dynamic Question Field Builder supporting MCQ, MSQ, NAT, Matrix Match
function addQuestionField(type = 'SINGLE_CORRECT', defaultData = {}) {
    const container = document.getElementById('questionsBuilder');
    if (!container) return;
    const qCount = container.children.length + 1;
    const qDiv = document.createElement('div');
    qDiv.className = 'q-block';
    qDiv.dataset.type = type;

    let dynamicInputs = '';

    if (type === 'SINGLE_CORRECT') {
        dynamicInputs = `
            <div class="form-grid mb-10">
                <input type="text" class="q-optA dark-input" placeholder="Option A" required>
                <input type="text" class="q-optB dark-input" placeholder="Option B" required>
                <input type="text" class="q-optC dark-input" placeholder="Option C" required>
                <input type="text" class="q-optD dark-input" placeholder="Option D" required>
            </div>
            <select class="q-correct dark-input" style="max-width:300px;">
                <option value="A">Correct Answer: Option A</option>
                <option value="B">Correct Answer: Option B</option>
                <option value="C">Correct Answer: Option C</option>
                <option value="D">Correct Answer: Option D</option>
            </select>
        `;
    } else if (type === 'MULTIPLE_CORRECT') {
        dynamicInputs = `
            <div class="form-grid mb-10">
                <input type="text" class="q-optA dark-input" placeholder="Option A">
                <input type="text" class="q-optB dark-input" placeholder="Option B">
                <input type="text" class="q-optC dark-input" placeholder="Option C">
                <input type="text" class="q-optD dark-input" placeholder="Option D">
            </div>
            <label style="color:#a1a1aa; font-size:12px;">Correct Combination (Comma-separated, e.g. A,B,D):</label>
            <input type="text" class="q-correct dark-input" placeholder="e.g. A,C" style="max-width:300px;">
        `;
    } else if (type === 'NUMERICAL') {
        dynamicInputs = `
            <div class="form-grid mb-10">
                <input type="number" step="any" class="q-correct dark-input" placeholder="Exact Correct Value (e.g. 25.5)">
                <input type="number" step="any" class="q-tolerance dark-input" placeholder="Tolerance (e.g. 0.01)" value="0.0">
                <input type="number" step="any" class="q-minVal dark-input" placeholder="Accepted Min Value (Optional)">
                <input type="number" step="any" class="q-maxVal dark-input" placeholder="Accepted Max Value (Optional)">
            </div>
        `;
    } else if (type === 'MATRIX_MATCH') {
        dynamicInputs = `
            <p style="color:#a1a1aa; font-size:12px; margin-bottom:8px;">Matrix Match Answer Key Format (e.g. <code>P:A,B; Q:C; R:D; S:A</code>):</p>
            <input type="text" class="q-correct dark-input" placeholder="P:A,B; Q:C; R:D; S:A">
        `;
    }

    qDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h5 style="margin:0; font-size:15px; color:#fff;">Q${qCount} — <span class="q-badge-type">${type}</span></h5>
            <button onclick="this.closest('.q-block').remove()" class="btn-dark" style="color:#f43f5e; padding:4px 10px; font-size:11px;">✕ Remove</button>
        </div>
        
        <div class="form-grid mb-10">
            <input type="text" class="q-subject dark-input" placeholder="Subject (e.g. Physics)" value="${defaultData.subject || 'General'}">
            <input type="text" class="q-sectionName dark-input" placeholder="Section (e.g. Section A - MCQ)" value="${defaultData.sectionName || 'Section 1'}">
        </div>

        <input type="text" class="q-text dark-input" placeholder="Enter Question Text (HTML / Math symbols supported)" style="margin-bottom: 10px;">
        <input type="file" class="q-img" accept="image/*" style="margin-bottom: 12px; display: block; color: #a1a1aa;">
        
        ${dynamicInputs}

        <div class="form-grid mt-10" style="margin-top:12px; border-top:1px dashed #3f3f46; padding-top:10px;">
            <div><label style="color:#a1a1aa; font-size:11px;">+ Marks:</label> <input type="number" step="any" class="q-posMarks dark-input" value="${defaultData.pos !== undefined ? defaultData.pos : 4.0}"></div>
            <div><label style="color:#a1a1aa; font-size:11px;">- Marks:</label> <input type="number" step="any" class="q-negMarks dark-input" value="${defaultData.neg !== undefined ? defaultData.neg : 1.0}"></div>
        </div>
    `;
    container.appendChild(qDiv);
}

async function createTest(publishNow = false) {
    const title = document.getElementById('testTitle').value.trim();
    if (!title) return alert("Please enter an Exam Title.");

    const examType = document.getElementById('testExamType').value;
    const examCode = document.getElementById('testExamCode').value.trim();
    const academicYear = document.getElementById('testAcademicYear').value.trim();
    const duration = document.getElementById('testDuration').value;
    const maxMarks = document.getElementById('testMaxMarks').value;
    const scheduleEl = document.getElementById('testSchedule');
    const scheduledTime = scheduleEl && scheduleEl.value ? scheduleEl.value : null;
    const resultVisibility = document.getElementById('testResultVisibility').value;
    const assignedStudents = document.getElementById('testAssignedStudents').value.trim();
    const assignedBatches = document.getElementById('testAssignedBatches')?.value.trim() || "";
    const assignedDepartments = document.getElementById('testAssignedDepartments')?.value.trim() || "";
    const assignedSections = document.getElementById('testAssignedSections')?.value.trim() || "";
    const instructions = document.getElementById('testInstructions').value;

    const blocks = document.querySelectorAll('.q-block');
    if (blocks.length === 0) return alert("Please add at least 1 question before saving.");

    const questions = [];
    for (let block of blocks) {
        const type = block.dataset.type || 'SINGLE_CORRECT';
        const subject = block.querySelector('.q-subject')?.value || 'General';
        const sectionName = block.querySelector('.q-sectionName')?.value || 'Section 1';
        const text = block.querySelector('.q-text')?.value || '';
        const correct = block.querySelector('.q-correct')?.value || '';
        const posMarks = parseFloat(block.querySelector('.q-posMarks')?.value || 4.0);
        const negMarks = parseFloat(block.querySelector('.q-negMarks')?.value || 1.0);
        const imgFile = block.querySelector('.q-img')?.files[0];

        let optA = block.querySelector('.q-optA')?.value || '';
        let optB = block.querySelector('.q-optB')?.value || '';
        let optC = block.querySelector('.q-optC')?.value || '';
        let optD = block.querySelector('.q-optD')?.value || '';
        let tolerance = parseFloat(block.querySelector('.q-tolerance')?.value || 0.0);
        let minVal = block.querySelector('.q-minVal') ? parseFloat(block.querySelector('.q-minVal').value) : null;
        let maxVal = block.querySelector('.q-maxVal') ? parseFloat(block.querySelector('.q-maxVal').value) : null;

        let base64Img = null;
        if (imgFile) {
            base64Img = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(imgFile);
            });
        }

        questions.push({
            questionType: type,
            subject,
            sectionName,
            questionText: text,
            imageBase64: base64Img,
            optionA: optA,
            optionB: optB,
            optionC: optC,
            optionD: optD,
            correctAnswer: correct,
            positiveMarks: posMarks,
            negativeMarks: negMarks,
            tolerance: isNaN(tolerance) ? 0.0 : tolerance,
            numericalMinVal: isNaN(minVal) ? null : minVal,
            numericalMaxVal: isNaN(maxVal) ? null : maxVal
        });
    }

    const payload = {
        title,
        examType,
        examCode,
        academicYear,
        durationMinutes: parseInt(duration) || 180,
        maxMarks: parseFloat(maxMarks) || 300.0,
        status: publishNow ? "LIVE" : "DRAFT",
        active: publishNow,
        scheduledTime: scheduledTime,
        resultVisibility: resultVisibility,
        assignedStudentIds: assignedStudents,
        assignedBatches: assignedBatches,
        assignedDepartments: assignedDepartments,
        assignedSections: assignedSections,
        instructions: instructions,
        questions: questions
    };

    try {
        const res = await fetch(`${API_URL}/admin/exam/advanced-create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert(publishNow ? "Exam Created & Published Live Successfully! 🚀" : "Exam Saved as Draft.");
            switchAdminView('view-test-manage');
            loadAdminTests();
        } else {
            alert("Failed to create exam: " + await res.text());
        }
    } catch(err) { alert("Network Error: " + err); }
}

async function validateExamAdmin(testId) {
    try {
        const res = await fetch(`${API_URL}/admin/exam/${testId}/validate`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            if (data.valid) {
                alert("✓ Pre-publish Validation Passed! No errors found. The exam is ready for live publishing.");
            } else {
                alert("❌ Validation Errors:\n" + data.errors.join("\n"));
            }
        }
    } catch (e) { alert("Validation check failed."); }
}

async function reEvaluateAdmin(testId) {
    if (!confirm("Are you sure you want to re-calculate all student scores for this exam?")) return;
    try {
        const res = await fetch(`${API_URL}/admin/exam/${testId}/re-evaluate`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            alert(`Score Recalculation Complete! ${data.count} student attempts updated.`);
            loadAttempts();
        }
    } catch (e) { alert("Re-evaluation failed."); }
}

// Exam Analytics Modal with Drop / Bonus Question controls
async function openAnalyticsModal(testId) {
    try {
        const res = await fetch(`${API_URL}/admin/exam/${testId}/analytics`);
        if (!res.ok) return alert("Failed to fetch analytics.");
        const data = await res.json();

        document.getElementById('modalTestTitle').innerText = `${data.testTitle} — Analytics`;
        
        document.getElementById('modalStatsRow').innerHTML = `
            <div class="sum-box"><h2>${data.totalCandidates}</h2><p>Candidates</p></div>
            <div class="sum-box"><h2>${data.avgScore}</h2><p>Avg Score</p></div>
            <div class="sum-box"><h2>${data.maxScore}</h2><p>Highest Score</p></div>
            <div class="sum-box"><h2>${data.avgAccuracy}%</h2><p>Avg Accuracy</p></div>
        `;

        let qHtml = `<table class="dark-table"><thead><tr><th>Q#</th><th>Subject</th><th>Type</th><th>Diff</th><th>Attempts</th><th>Correct %</th><th>Action</th></tr></thead><tbody>`;
        data.questions.forEach((q, idx) => {
            const isDropped = q.isDropped;
            const isBonus = q.isBonus;
            qHtml += `<tr>
                <td>#${idx + 1}</td>
                <td>${q.subject}</td>
                <td><span class="q-badge-type">${q.questionType}</span></td>
                <td>${q.difficulty}</td>
                <td>${q.attemptedCount}</td>
                <td><strong style="color:${q.correctPercentage >= 50 ? '#10b981' : '#f43f5e'};">${q.correctPercentage}%</strong></td>
                <td style="display:flex; gap:6px;">
                    <button onclick="toggleDropBonus(${testId}, ${q.questionId}, ${!isDropped}, false)" class="btn-dark" style="color:${isDropped ? '#10b981' : '#f43f5e'}; font-size:11px;">
                        ${isDropped ? 'Restore' : 'Drop'}
                    </button>
                    <button onclick="toggleDropBonus(${testId}, ${q.questionId}, false, ${!isBonus})" class="btn-dark" style="color:#a78bfa; font-size:11px;">
                        ${isBonus ? 'Revoke Bonus' : 'Award Bonus'}
                    </button>
                </td>
            </tr>`;
        });
        qHtml += `</tbody></table>`;
        document.getElementById('modalQuestionsTable').innerHTML = qHtml;

        document.getElementById('analyticsModal')?.classList.remove('hidden');
    } catch(e) { alert("Failed to load analytics: " + e); }
}

function closeAnalyticsModal() {
    document.getElementById('analyticsModal')?.classList.add('hidden');
}

async function toggleDropBonus(testId, qId, isDropped, isBonus) {
    try {
        const res = await fetch(`${API_URL}/admin/exam/${testId}/question/${qId}/drop-bonus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDropped, isBonus })
        });
        if (res.ok) {
            alert("Question status updated & all candidate results re-calculated!");
            openAnalyticsModal(testId);
            loadAttempts();
        }
    } catch (e) { alert("Failed to update question status."); }
}

// Bulk Question JSON Importer
async function handleBulkImport() {
    const raw = document.getElementById('jsonImportInput').value.trim();
    if (!raw) return alert("Please paste JSON array of questions.");
    try {
        const questions = JSON.parse(raw);
        if (!Array.isArray(questions)) return alert("JSON must be an array of question objects.");

        const container = document.getElementById('questionsBuilder');
        questions.forEach(q => {
            addQuestionField(q.questionType || 'SINGLE_CORRECT', {
                subject: q.subject || 'General',
                sectionName: q.sectionName || 'Section 1',
                pos: q.positiveMarks,
                neg: q.negativeMarks
            });
            // Populate last added question block
            const lastBlock = container.lastElementChild;
            if (lastBlock) {
                if (q.questionText) lastBlock.querySelector('.q-text').value = q.questionText;
                if (q.optionA) lastBlock.querySelector('.q-optA').value = q.optionA;
                if (q.optionB) lastBlock.querySelector('.q-optB').value = q.optionB;
                if (q.optionC) lastBlock.querySelector('.q-optC').value = q.optionC;
                if (q.optionD) lastBlock.querySelector('.q-optD').value = q.optionD;
                if (q.correctAnswer) lastBlock.querySelector('.q-correct').value = q.correctAnswer;
            }
        });
        alert(`Successfully imported ${questions.length} questions into builder!`);
        switchAdminView('view-test-create');
    } catch(err) { alert("Invalid JSON format: " + err); }
}

function downloadXLS() { window.location.href = `${API_URL}/admin/export-excel`; }

async function toggleTest(id) {
    await fetch(`${API_URL}/admin/test/toggle/${id}`, { method: 'POST' });
    loadAdminTests();
}

async function deleteAdminTest(id) {
    if (!confirm("Are you sure you want to delete this exam?")) return;
    await fetch(`${API_URL}/admin/test/${id}`, { method: 'DELETE' });
    loadAdminTests();
}

async function loadAttempts() {
    const res = await fetch(`${API_URL}/admin/attempts`);
    if (!res.ok) return;
    const attempts = await res.json();
    const table = document.getElementById('attemptsTable');
    if (!table) return;
    let html = `<table class="dark-table"><thead><tr><th>ID</th><th>Student</th><th>Exam Title</th><th>Score</th><th>Correct</th><th>Wrong</th><th>Accuracy</th><th>Date</th></tr></thead><tbody>`;
    attempts.forEach(a => html += `<tr><td>#${a.id}</td><td>${a.studentUserId || a.studentId}</td><td>${a.testTitle}</td><td><span class="badge bg-green">${a.score}</span></td><td>${a.correctAnswers}</td><td>${a.wrongAnswers}</td><td>${a.accuracy || 0}%</td><td>${new Date(a.attemptTime).toLocaleDateString()}</td></tr>`);
    table.innerHTML = html + `</tbody></table>`;
}

async function loadLogs() {
    const res = await fetch(`${API_URL}/admin/logs`);
    const logs = await res.json();
    const container = document.getElementById('dashLogsTable')?.getElementsByTagName('tbody')[0];
    if(container) {
        container.innerHTML = logs.slice().reverse().map(l => `<tr><td style="color:#a1a1aa;">${new Date(l.timestamp).toLocaleString()}</td><td>${l.username}</td><td><span class="badge bg-purple">${l.action}</span></td></tr>`).join('');
    }
}

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
            alert(`Sequence Updated Successfully! Next student gets: ${prefix}${startNumber}`);
        }
    } catch (err) { alert("Network Error"); }
}

async function adminCreateUser() {
    const uid = document.getElementById('adminNewStudentId').value.trim();
    const nameEl = document.getElementById('adminNewStudentName');
    const name = nameEl ? nameEl.value.trim() : uid;
    const pwd = document.getElementById('adminNewStudentPwd').value.trim();
    if (!uid || !pwd) return alert("Username and Password are required.");

    try {
        const res = await fetch(`${API_URL}/admin/users/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid, name: name, password: pwd })
        });
        if (res.ok) {
            alert("Student Account Created Successfully!");
            loadUsers();
            document.getElementById('adminNewStudentId').value = '';
            document.getElementById('adminNewStudentPwd').value = '';
            if(nameEl) nameEl.value = '';
        }
    } catch(e) { alert("Failed to create user."); }
}

async function deleteUser(id, userId) {
    if (!confirm(`Are you sure you want to delete student ${userId}?`)) return;
    try {
        const res = await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE' });
        if (res.ok) { alert("Student deleted."); loadUsers(); }
    } catch(e) { alert("Network Error"); }
}

// ==========================================
// 4. STUDENT PORTAL LOGIC
// ==========================================
async function loadStudentPortal() {
    const studentId = localStorage.getItem('studentId');
    const res = await fetch(`${API_URL}/student/tests${studentId ? '?studentId='+studentId : ''}`);
    if (!res.ok) return;
    const data = await res.json();
    
    // Performance Summary Cards (Phase 9)
    if (studentId) {
        try {
            const pRes = await fetch(`${API_URL}/student/performance/${studentId}`);
            if (pRes.ok) {
                const perf = await pRes.json();
                if(document.getElementById('sumTotalExams')) document.getElementById('sumTotalExams').innerText = perf.totalExams || 0;
                if(document.getElementById('sumAvgScore')) document.getElementById('sumAvgScore').innerText = perf.averageScore || 0;
                if(document.getElementById('sumHighScore')) document.getElementById('sumHighScore').innerText = perf.highestScore || 0;
            }
        } catch(e) {}
        
        try {
            // Load notif badge
            const nRes = await fetch(`${API_URL}/student/notifications/${studentId}`);
            if (nRes.ok) {
                const notifs = await nRes.json();
                const unread = notifs.filter(n => !n.read).length;
                const badge = document.getElementById('notifBadge');
                if(badge) {
                    badge.innerText = unread;
                    badge.style.display = unread > 0 ? 'flex' : 'none';
                }
            }
        } catch(e) {}
    }

    const liveContainer = document.getElementById('liveTestsContainer');
    const upContainer = document.getElementById('upcomingTestsContainer');
    if(!liveContainer || !upContainer) return;

    liveContainer.innerHTML = data.available.length === 0 ? '<p style="color:#a1a1aa; font-size:14px; grid-column: span 2;">No live examinations currently available.</p>' : '';
    upContainer.innerHTML = data.upcoming.length === 0 ? '<p style="color:#a1a1aa; font-size:14px; grid-column: span 2;">No upcoming examinations scheduled.</p>' : '';

    data.available.forEach(t => {
        liveContainer.innerHTML += `
            <div class="dark-panel" style="cursor:pointer; border-color:#10b981; display:flex; flex-direction:column; align-items:flex-start; margin-bottom:0;" onclick="startQuiz(${t.id})">
                <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:12px;">
                    <span class="badge bg-green">LIVE NOW</span>
                    <span class="q-badge-type">${t.examType || 'JEE MAIN'}</span>
                </div>
                <h2 style="font-size:18px; margin:0 0 8px 0; color:#fff;">${t.title}</h2>
                <p style="color:#a1a1aa; font-size:13px;">Duration: ${t.durationMinutes || 180} mins | Max Marks: ${t.maxMarks || 300}</p>
                <button class="btn-pink" style="margin-top:20px; width:100%;">Start / Resume CBT Exam →</button>
            </div>`;
    });

    data.upcoming.forEach(t => {
        const dateStr = new Date(t.scheduledTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        upContainer.innerHTML += `
            <div class="dark-panel" style="background:#1e1e24; display:flex; flex-direction:column; align-items:flex-start; margin-bottom:0; opacity:0.7;">
                <span class="badge bg-purple mb-20">UPCOMING</span>
                <h2 style="font-size:18px; margin:0 0 8px 0; color:#c9d1d9;">${t.title}</h2>
                <p style="color:#a1a1aa; font-size:13px;">Opens: <strong style="color:#fff;">${dateStr} (IST)</strong></p>
            </div>`;
    });
}

function startQuiz(testId) {
    localStorage.setItem('currentTestId', testId);
    window.location.href = 'quiz.html';
}

async function loadStudentAttempts() {
    const studentId = localStorage.getItem('studentId');
    const res = await fetch(`${API_URL}/student/attempts/${studentId}`);
    if (!res.ok) return;
    const attempts = await res.json();
    const table = document.getElementById('studentAttemptsTable');
    if (!table) return;

    if (attempts.length === 0) {
        table.innerHTML = '<p style="color:#a1a1aa;">You have not completed any examinations yet.</p>';
        return;
    }

    let html = `<table class="dark-table"><thead><tr><th>Exam Title</th><th>Score</th><th>Correct</th><th>Wrong</th><th>Accuracy</th><th>Date</th><th>Scorecard</th></tr></thead><tbody>`;
    attempts.forEach(a => {
        html += `<tr>
            <td><strong style="color:#fff;">${a.testTitle}</strong></td>
            <td><span class="badge bg-green">${a.score}</span></td>
            <td>${a.correctAnswers}</td>
            <td>${a.wrongAnswers}</td>
            <td>${a.accuracy || 0}%</td>
            <td style="font-size:12px; color:#a1a1aa;">${new Date(a.attemptTime).toLocaleDateString()}</td>
            <td><button onclick="openStudentResultModal(${a.id})" class="btn-dark" style="color:#38bdf8; border-color:#38bdf8; padding:5px 12px; font-size:11px;">View Analysis</button></td>
        </tr>`;
    });
    table.innerHTML = html + `</tbody></table>`;
}

async function openStudentResultModal(attemptId) {
    try {
        const res = await fetch(`${API_URL}/student/result/${attemptId}`);
        if (!res.ok) return alert("Failed to fetch detailed result.");
        const data = await res.json();

        document.getElementById('resModalTitle').innerText = `${data.test.title} — Detailed Scorecard`;
        
        let subjHtml = '<div style="margin-top:15px;"><h4 style="color:#fff; margin-bottom:10px;">Subject-Wise Performance</h4><div class="score-stat-grid">';
        if (data.eval && data.eval.subjectBreakdown) {
            for (let subj in data.eval.subjectBreakdown) {
                const s = data.eval.subjectBreakdown[subj];
                subjHtml += `
                    <div class="score-stat-box">
                        <p style="color:#38bdf8; font-weight:700;">${subj}</p>
                        <h3>${s.score}</h3>
                        <p>Correct: ${s.correct} | Wrong: ${s.wrong}</p>
                    </div>`;
            }
        }
        subjHtml += '</div></div>';

        document.getElementById('studentScorecardContent').innerHTML = `
            <div class="scorecard-header">
                <h2>Total Score: ${data.eval.totalScore} / ${data.test.maxMarks || 300}</h2>
                <p>Accuracy: ${data.eval.accuracy}% | Correct: ${data.eval.correctAnswers} | Incorrect: ${data.eval.wrongAnswers} | Unattempted: ${data.eval.unattempted}</p>
            </div>
            ${subjHtml}
        `;

        document.getElementById('studentResultModal')?.classList.remove('hidden');
    } catch(e) { alert("Error loading result details."); }
}

function closeStudentResultModal() {
    document.getElementById('studentResultModal')?.classList.add('hidden');
}

async function loadProfile() {
    const studentId = localStorage.getItem('studentId');
    if (!studentId) return;

    try {
        const res = await fetch(`${API_URL}/student/profile/${studentId}`);
        if (res.ok) {
            const data = await res.json();
            
            // Basic fields
            if(document.getElementById('profileDetailedName')) document.getElementById('profileDetailedName').innerText = (data.name || 'Unnamed').toUpperCase();
            if(document.getElementById('profileDetailedRegNo')) document.getElementById('profileDetailedRegNo').innerText = "REG: " + (data.regNo || 'N/A');
            if(document.getElementById('profileDetailedEmail')) document.getElementById('profileDetailedEmail').innerText = data.email || "Not Provided";
            if(document.getElementById('profileDetailedUserId')) document.getElementById('profileDetailedUserId').innerText = data.userId || "N/A";
            
            // Advanced fields (Phase 10)
            if(document.getElementById('profileDetailedBatch')) document.getElementById('profileDetailedBatch').innerText = data.batch || 'NO BATCH';
            if(document.getElementById('profileDetailedPhone')) document.getElementById('profileDetailedPhone').innerText = data.phone || 'N/A';
            if(document.getElementById('profileDetailedDob')) document.getElementById('profileDetailedDob').innerText = data.dob || 'N/A';
            if(document.getElementById('profileDetailedGender')) document.getElementById('profileDetailedGender').innerText = data.gender || 'N/A';
            if(document.getElementById('profileDetailedDept')) document.getElementById('profileDetailedDept').innerText = data.department || '-';
            if(document.getElementById('profileDetailedCourse')) document.getElementById('profileDetailedCourse').innerText = data.course || '-';
            if(document.getElementById('profileDetailedSection')) document.getElementById('profileDetailedSection').innerText = data.section || '-';
            if(document.getElementById('profileDetailedStatus')) {
                const s = document.getElementById('profileDetailedStatus');
                s.innerText = data.status || 'ACTIVE';
                s.style.color = (data.status === 'ARCHIVED' || data.status === 'SUSPENDED') ? '#f43f5e' : '#10b981';
            }
            if(document.getElementById('profileDetailedGuardian')) document.getElementById('profileDetailedGuardian').innerText = data.guardianName || 'N/A';
            if(document.getElementById('profileDetailedGuardianContact')) document.getElementById('profileDetailedGuardianContact').innerText = data.guardianContact || 'N/A';

            if (data.profilePicBase64 && data.profilePicBase64.length > 50) {
                if(document.getElementById('profileDetailedPic')) document.getElementById('profileDetailedPic').src = data.profilePicBase64;
                if(document.getElementById('topNavProfilePic')) document.getElementById('topNavProfilePic').src = data.profilePicBase64;
            }
        }
    } catch (err) {}
}

async function loadStudentNotifications() {
    const studentId = localStorage.getItem('studentId');
    if (!studentId) return;
    try {
        const res = await fetch(`${API_URL}/student/notifications/${studentId}`);
        if (res.ok) {
            const notifs = await res.json();
            const container = document.getElementById('notificationsContainer');
            if(!container) return;
            if(notifs.length === 0) {
                container.innerHTML = '<p style="color:#a1a1aa; padding:20px;">No notifications found.</p>';
                return;
            }
            let html = '';
            notifs.forEach(n => {
                const icon = n.type === 'EXAM' ? '📝' : (n.type === 'RESULT' ? '🏆' : '🔔');
                html += `
                    <div style="background:#1e1e24; border:1px solid ${n.read ? '#3f3f46' : '#38bdf8'}; border-left:4px solid ${n.read ? '#3f3f46' : '#38bdf8'}; padding:15px; margin-bottom:10px; border-radius:6px; display:flex; gap:15px; align-items:center;">
                        <div style="font-size:24px;">${icon}</div>
                        <div style="flex:1;">
                            <p style="margin:0 0 5px 0; color:#fff; font-size:14px; font-weight:${n.read ? 'normal' : 'bold'};">${n.message}</p>
                            <span style="font-size:11px; color:#a1a1aa;">${new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                        ${!n.read ? `<button onclick="markNotificationRead(${n.id})" class="btn-dark" style="font-size:11px; padding:4px 8px;">Mark Read</button>` : ''}
                    </div>
                `;
            });
            container.innerHTML = html;
        }
    } catch(e) {}
}

async function markNotificationRead(id) {
    try {
        const res = await fetch(`${API_URL}/student/notifications/${id}/read`, { method: 'POST' });
        if (res.ok) {
            loadStudentNotifications();
            loadStudentPortal(); // refresh badge
        }
    } catch(e) {}
}

// ==========================================
// 5. CBT EXAM ENGINE (JEE CBT NTA REPLICA)
// ==========================================
let examData = null, currentAttemptId = null, currentQIndex = 0, examTimer = null, remainingSeconds = 0;
let qStates = [], qAnswers = [], currentSubject = null, currentSection = null;

async function loadExamEngine() {
    const testId = localStorage.getItem('currentTestId');
    const studentId = localStorage.getItem('studentId');
    const studentUserId = localStorage.getItem('userId');
    if (!testId || !studentId) return window.location.replace('student.html');

    try {
        const res = await fetch(`${API_URL}/student/exam/${testId}/start-or-resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, studentUserId })
        });

        if (!res.ok) { alert("Exam unavailable or closed."); return window.location.replace('student.html'); }

        const cbtData = await res.json();
        examData = cbtData.test;
        currentAttemptId = cbtData.attemptId;
        remainingSeconds = cbtData.remainingSeconds > 0 ? cbtData.remainingSeconds : (examData.durationMinutes * 60);

        document.getElementById('examMainTitle').innerText = examData.title;
        document.getElementById('instructionContent').innerHTML = examData.instructions || "<p>No specific instructions provided.</p>";

        qStates = new Array(examData.questions.length).fill(0);
        qAnswers = new Array(examData.questions.length).fill(null);

        // Restore saved responses if resuming
        if (cbtData.savedAnswersJson) {
            try {
                const savedMap = JSON.parse(cbtData.savedAnswersJson);
                examData.questions.forEach((q, idx) => {
                    if (savedMap[q.id]) {
                        qAnswers[idx] = savedMap[q.id];
                        qStates[idx] = 2; // Answered
                    }
                });
            } catch(e) {}
        }

        buildSubjectAndSections();
        startExamTimer();
        loadQuestion(0);
    } catch(err) { alert("Failed to connect to CBT examination engine."); }
}

function startExamTimer() {
    examTimer = setInterval(() => {
        if(remainingSeconds <= 0) {
            clearInterval(examTimer);
            alert("⏰ Time is up! Your examination will now be automatically evaluated.");
            executeFinalSubmit();
            return;
        }
        remainingSeconds--;
        const h = Math.floor(remainingSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((remainingSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (remainingSeconds % 60).toString().padStart(2, '0');
        const timerDisplay = document.getElementById('timeRemaining');
        if(timerDisplay) timerDisplay.innerText = `${h}:${m}:${s}`;
    }, 1000);
}

function buildSubjectAndSections() {
    const subjects = [...new Set(examData.questions.map(q => q.subject || 'General'))];
    currentSubject = subjects[0];

    const subjBar = document.getElementById('subjectNavBar');
    if (subjBar) {
        subjBar.innerHTML = subjects.map((s, idx) => `
            <div class="subj-tab ${idx === 0 ? 'active' : ''}" onclick="selectSubject('${s}', this)">${s}</div>
        `).join('');
    }
    buildSectionPills();
}

function selectSubject(subjectName, element) {
    currentSubject = subjectName;
    document.querySelectorAll('.subj-tab').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    buildSectionPills();
    
    // Jump to first question of this subject
    const idx = examData.questions.findIndex(q => (q.subject || 'General') === subjectName);
    if (idx !== -1) loadQuestion(idx);
}

function buildSectionPills() {
    const sections = [...new Set(examData.questions.filter(q => (q.subject || 'General') === currentSubject).map(q => q.sectionName || 'Section 1'))];
    currentSection = sections[0];

    const secBar = document.getElementById('sectionPillsBar');
    if (secBar) {
        secBar.innerHTML = sections.map((sec, idx) => `
            <div class="sec-pill ${idx === 0 ? 'active' : ''}" onclick="selectSection('${sec}', this)">${sec}</div>
        `).join('');
    }
}

function selectSection(secName, element) {
    currentSection = secName;
    document.querySelectorAll('.sec-pill').forEach(p => p.classList.remove('active'));
    element.classList.add('active');

    const idx = examData.questions.findIndex(q => (q.subject || 'General') === currentSubject && (q.sectionName || 'Section 1') === secName);
    if (idx !== -1) loadQuestion(idx);
}

function loadQuestion(index) {
    if (index < 0 || index >= examData.questions.length) return;
    currentQIndex = index;
    const q = examData.questions[index];
    if (qStates[index] === 0) qStates[index] = 1; // Mark as Not Answered (visited)

    document.getElementById('qNumberDisplay').innerText = `Question ${index + 1}`;
    document.getElementById('qTypeDisplay').innerText = (q.questionType || 'SINGLE_CORRECT').replace('_', ' ');
    document.getElementById('qMarksDisplay').innerText = `+${q.positiveMarks || 4.0} / -${q.negativeMarks || 1.0}`;

    // Comprehension passage support
    const passBox = document.getElementById('passageContainer');
    if (passBox) {
        if (q.passageText && q.passageText.trim()) {
            passBox.style.display = 'block';
            passBox.innerHTML = `<strong>Passage:</strong><br>${q.passageText}`;
        } else {
            passBox.style.display = 'none';
        }
    }

    document.getElementById('questionText').innerHTML = q.questionText;
    document.getElementById('questionImageContainer').innerHTML = q.imageBase64 ? `<img src="${q.imageBase64}" style="max-width:100%; border-radius:8px; margin-top:15px; display:block;">` : '';

    renderAnswerInputs(q, index);

    // Sync active tabs
    const qSubj = q.subject || 'General';
    const qSec = q.sectionName || 'Section 1';
    if (currentSubject !== qSubj) {
        currentSubject = qSubj;
        document.querySelectorAll('.subj-tab').forEach(t => t.classList.toggle('active', t.innerText.toUpperCase() === qSubj.toUpperCase()));
        buildSectionPills();
    }
    document.querySelectorAll('.sec-pill').forEach(p => p.classList.toggle('active', p.innerText === qSec));

    updatePalette();
}

function renderAnswerInputs(q, index) {
    const container = document.getElementById('dynamicAnswerContainer');
    if (!container) return;
    container.innerHTML = '';
    const type = (q.questionType || 'SINGLE_CORRECT').toUpperCase();
    const currentAns = qAnswers[index] || '';

    // 1. Single Correct MCQ
    if (type === 'SINGLE_CORRECT' || type === 'ASSERTION_REASON') {
        let opts = ['A', 'B', 'C', 'D'].map(l => {
            const val = q[`option${l}`];
            if (!val) return '';
            const checked = (currentAns === l) ? 'checked' : '';
            return `<label class="jee-opt-row"><input type="radio" name="examOpt" value="${l}" ${checked}> <span><b>(${l})</b> ${val}</span></label>`;
        }).join('');
        container.innerHTML = `<div class="q-options-box">${opts}</div>`;
    }
    // 2. Multiple Correct MSQ
    else if (type === 'MULTIPLE_CORRECT' || type === 'MSQ') {
        const selectedArr = currentAns ? currentAns.split(',') : [];
        let opts = ['A', 'B', 'C', 'D'].map(l => {
            const val = q[`option${l}`];
            if (!val) return '';
            const checked = selectedArr.includes(l) ? 'checked' : '';
            return `<label class="msq-opt-row"><input type="checkbox" name="examMsqOpt" value="${l}" ${checked}> <span><b>(${l})</b> ${val}</span></label>`;
        }).join('');
        container.innerHTML = `<div class="q-options-box"><p style="color:#2563eb; font-size:12px; font-weight:600; margin-bottom:8px;">(One or more than one options may be correct)</p>${opts}</div>`;
    }
    // 3. Numerical Answer Type (NAT) with Virtual Keypad
    else if (type === 'NUMERICAL' || type === 'NAT') {
        container.innerHTML = `
            <div class="nat-container">
                <p style="font-size:12px; color:#64748b; margin-bottom:8px; font-weight:600;">ENTER NUMERICAL ANSWER USING KEYPAD:</p>
                <input type="text" id="natInput" class="nat-display" value="${currentAns}" readonly placeholder="0.0">
                <div class="keypad-grid">
                    <button class="key-btn" onclick="pressKey('1')">1</button>
                    <button class="key-btn" onclick="pressKey('2')">2</button>
                    <button class="key-btn" onclick="pressKey('3')">3</button>
                    <button class="key-btn key-backspace" onclick="pressKey('BACK')">⌫</button>
                    <button class="key-btn" onclick="pressKey('4')">4</button>
                    <button class="key-btn" onclick="pressKey('5')">5</button>
                    <button class="key-btn" onclick="pressKey('6')">6</button>
                    <button class="key-btn key-action" onclick="pressKey('CLEAR')">C</button>
                    <button class="key-btn" onclick="pressKey('7')">7</button>
                    <button class="key-btn" onclick="pressKey('8')">8</button>
                    <button class="key-btn" onclick="pressKey('9')">9</button>
                    <button class="key-btn" onclick="pressKey('-')">-</button>
                    <button class="key-btn" onclick="pressKey('.')">.</button>
                    <button class="key-btn" onclick="pressKey('0')">0</button>
                </div>
            </div>
        `;
    }
    // 4. Matrix Match
    else if (type === 'MATRIX_MATCH') {
        container.innerHTML = renderMatrixMatchInputs(currentAns);
    }
}

function renderMatrixMatchInputs(savedStr) {
    const rows = ['P', 'Q', 'R', 'S'];
    const cols = ['A', 'B', 'C', 'D'];
    const savedMap = {};
    if (savedStr) {
        savedStr.split(';').forEach(pair => {
            const parts = pair.split(':');
            if (parts.length === 2) savedMap[parts[0].trim()] = parts[1].split(',');
        });
    }

    let table = `<table class="matrix-match-table"><thead><tr><th>Row / Col</th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
    rows.forEach(r => {
        table += `<tr><td class="matrix-row-label">(${r})</td>`;
        cols.forEach(c => {
            const isChecked = savedMap[r] && savedMap[r].includes(c) ? 'checked' : '';
            table += `<td><input type="checkbox" class="matrix-checkbox" data-row="${r}" data-col="${c}" ${isChecked}></td>`;
        });
        table += `</tr>`;
    });
    table += `</tbody></table>`;
    return table;
}

function pressKey(k) {
    const display = document.getElementById('natInput');
    if (!display) return;
    if (k === 'CLEAR') {
        display.value = '';
    } else if (k === 'BACK') {
        display.value = display.value.slice(0, -1);
    } else if (k === '-') {
        if (!display.value.startsWith('-')) display.value = '-' + display.value;
        else display.value = display.value.substring(1);
    } else if (k === '.') {
        if (!display.value.includes('.')) display.value += '.';
    } else {
        display.value += k;
    }
}

function getCurrentSelection() {
    const q = examData.questions[currentQIndex];
    const type = (q.questionType || 'SINGLE_CORRECT').toUpperCase();

    if (type === 'SINGLE_CORRECT' || type === 'ASSERTION_REASON') {
        const sel = document.querySelector('input[name="examOpt"]:checked');
        return sel ? sel.value : null;
    } else if (type === 'MULTIPLE_CORRECT' || type === 'MSQ') {
        const checked = [...document.querySelectorAll('input[name="examMsqOpt"]:checked')].map(c => c.value);
        return checked.length > 0 ? checked.join(',') : null;
    } else if (type === 'NUMERICAL' || type === 'NAT') {
        const val = document.getElementById('natInput')?.value.trim();
        return val ? val : null;
    } else if (type === 'MATRIX_MATCH') {
        const rows = ['P', 'Q', 'R', 'S'];
        const map = [];
        rows.forEach(r => {
            const cols = [...document.querySelectorAll(`.matrix-checkbox[data-row="${r}"]:checked`)].map(c => c.dataset.col);
            if (cols.length > 0) map.push(`${r}:${cols.join(',')}`);
        });
        return map.length > 0 ? map.join(';') : null;
    }
    return null;
}

function saveAndNext() {
    const ans = getCurrentSelection();
    if (ans) {
        qAnswers[currentQIndex] = ans;
        qStates[currentQIndex] = 2; // Answered
    } else {
        qAnswers[currentQIndex] = null;
        qStates[currentQIndex] = 1; // Not answered
    }
    triggerAutoSave();
    nextQuestion();
}

function saveAndMark() {
    const ans = getCurrentSelection();
    if (ans) {
        qAnswers[currentQIndex] = ans;
        qStates[currentQIndex] = 4; // Answered & Marked for Review
    } else {
        qAnswers[currentQIndex] = null;
        qStates[currentQIndex] = 3; // Marked for Review
    }
    triggerAutoSave();
    nextQuestion();
}

function clearResponse() {
    document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(i => i.checked = false);
    const nat = document.getElementById('natInput');
    if (nat) nat.value = '';
    qAnswers[currentQIndex] = null;
    qStates[currentQIndex] = 1;
    triggerAutoSave();
    updatePalette();
}

function nextQuestion() {
    if (currentQIndex < examData.questions.length - 1) loadQuestion(currentQIndex + 1);
    else updatePalette();
}

function prevQuestion() {
    if (currentQIndex > 0) loadQuestion(currentQIndex - 1);
}

function updatePalette() {
    const grid = document.getElementById('questionGrid'); 
    if(!grid) return;
    grid.innerHTML = '';
    let counts = {nv:0, na:0, ans:0, mr:0, amr:0};
    qStates.forEach((s, idx) => {
        let cls = 'badge-nv';
        if (s===1) { cls='badge-na'; counts.na++; } 
        else if (s===2) { cls='badge-ans'; counts.ans++; } 
        else if (s===3) { cls='badge-mr'; counts.mr++; } 
        else if (s===4) { cls='badge-amr'; counts.amr++; } 
        else counts.nv++;
        
        let styleStr = idx === currentQIndex ? 'border: 2px solid #000; font-weight:700;' : '';
        grid.innerHTML += `<div class="badge ${cls}" style="${styleStr}" onclick="loadQuestion(${idx})">${idx + 1}</div>`;
    });
    ['nv','na','ans','mr','amr'].forEach(k => {
        const el = document.getElementById(`count-${k}`);
        if(el) el.innerText = counts[k];
    });
}

// Background Cloud Autosave
async function triggerAutoSave() {
    if (!currentAttemptId) return;
    const answersMap = {};
    examData.questions.forEach((q, idx) => { if(qAnswers[idx]) answersMap[q.id] = qAnswers[idx]; });

    try {
        const indicator = document.getElementById('autosaveIndicator');
        if (indicator) indicator.innerText = "⏳ Saving...";
        await fetch(`${API_URL}/student/exam/${currentAttemptId}/autosave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answersJson: JSON.stringify(answersMap) })
        });
        if (indicator) indicator.innerText = "☁️ Synced to Server";
    } catch(e) {}
}

function toggleInstructions() { document.getElementById('instructionsModal')?.classList.toggle('hidden'); }

// Submission Modal & Execution
function openSubmitModal() {
    let answered = 0, unanswered = 0, marked = 0;
    qStates.forEach(s => {
        if (s === 2 || s === 4) answered++;
        if (s === 1 || s === 0) unanswered++;
        if (s === 3 || s === 4) marked++;
    });

    const summaryBox = document.getElementById('submitSummaryStats');
    if (summaryBox) {
        summaryBox.innerHTML = `
            <table class="submit-summary-table">
                <tr><th>Total Questions</th><td>${examData.questions.length}</td></tr>
                <tr><th>Answered</th><td style="color:#10b981; font-weight:700;">${answered}</td></tr>
                <tr><th>Unanswered / Not Visited</th><td style="color:#ef4444; font-weight:700;">${unanswered}</td></tr>
                <tr><th>Marked for Review</th><td style="color:#8b5cf6; font-weight:700;">${marked}</td></tr>
            </table>
        `;
    }
    document.getElementById('submitSummaryModal')?.classList.remove('hidden');
}

function closeSubmitModal() {
    document.getElementById('submitSummaryModal')?.classList.add('hidden');
}

async function executeFinalSubmit() {
    closeSubmitModal();
    clearInterval(examTimer);

    const answersMap = {};
    examData.questions.forEach((q, idx) => { if(qAnswers[idx]) answersMap[q.id] = qAnswers[idx]; });

    try {
        const res = await fetch(`${API_URL}/student/exam/${currentAttemptId}/submit-final`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answersJson: JSON.stringify(answersMap) })
        });

        if (res.ok) {
            const result = await res.json();
            document.getElementById('examMainTitle').innerText = "Exam Completed";
            document.querySelector('.jee-main-layout').innerHTML = `
                <div style="flex:1; display:flex; align-items:center; justify-content:center; background:#fff;">
                    <div style="text-align:center; padding: 40px; background: #fff; border-radius: 12px; box-shadow: 0 4px 25px rgba(0,0,0,0.06); max-width:600px; width:90%;">
                        <h1 style="color: #1f2937; font-size:24px;">Examination Submitted Successfully!</h1>
                        <h2 style="color:#10b981; font-size: 42px; margin: 15px 0;">Score: ${result.score}</h2>
                        <p style="font-size: 15px; color: #4b5563;">Correct: <strong>${result.correctAnswers}</strong> | Incorrect: <strong>${result.wrongAnswers}</strong> | Accuracy: <strong>${result.accuracy}%</strong></p>
                        <button onclick="window.location.replace('student.html')" class="btn-save-next" style="margin-top:25px; font-size:15px; padding:12px 30px; border-radius:6px;">Return to Student Portal</button>
                    </div>
                </div>`;
        } else {
            alert("Submission error. Please retry.");
        }
    } catch (err) { alert("Network error during submission."); }
}