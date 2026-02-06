// ================== SHOW LOGIN FORMS ==================
function showLoginForm(type) {
    const studentForm = document.getElementById("student-form");
    const teacherForm = document.getElementById("teacher-form");

    if (!studentForm || !teacherForm) return;

    studentForm.classList.remove("active");
    teacherForm.classList.remove("active");

    if (type === "student") {
        studentForm.classList.add("active");
    } else {
        teacherForm.classList.add("active");
    }
}

// ================== PASSWORD TOGGLE ==================
function togglePassword(id) {
    const input = document.getElementById(id);
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
}

// ================== PAGE SWITCH ==================
function showRegisterPage() {
    const login = document.getElementById("login-container");
    const register = document.getElementById("register-container");
    if (!login || !register) return;

    login.style.display = "none";
    register.style.display = "block";
}

function showLoginPage() {
    const login = document.getElementById("login-container");
    const register = document.getElementById("register-container");
    if (!login || !register) return;

    register.style.display = "none";
    login.style.display = "block";
}

// ================== STUDENT LOGIN ==================
async function studentLogin() {
    const email = document.getElementById("sEmail").value;
    const password = document.getElementById("sPass").value;

    const res = await fetch("http://localhost:3000/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.success) {
        // ✅ THESE TWO LINES ARE MANDATORY
        localStorage.setItem("studentName", data.student.name);
        localStorage.setItem("studentEmail", data.student.email);

        // ❗ DO NOT CLEAR localStorage ANYWHERE
        window.location.href = "student.html";
    } else {
        alert(data.message);
    }
}



// ================== TEACHER LOGIN ==================
async function teacherLogin() {
    try {
        const email = document.getElementById("tEmail")?.value;
        const password = document.getElementById("tPass")?.value;
        if (!email || !password) return alert("Enter credentials");

        const res = await fetch("http://localhost:3000/teacher/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (data.success) {
            localStorage.setItem("teacherName", data.teacher.name);
            localStorage.setItem("teacherEmail", data.teacher.email);
            localStorage.setItem("teacherId", data.teacher.id);

            window.location.href = "teacher.html";
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Server not responding");
    }
}

// ================== STUDENT REGISTER ==================
async function registerStudent() {
    try {
        const body = {
            name: document.getElementById("sName")?.value,
            email: document.getElementById("sRegEmail")?.value,
            password: document.getElementById("sRegPass")?.value,
            education: document.getElementById("sEducation")?.value,
            field: document.getElementById("sField")?.value
        };

        const res = await fetch("http://localhost:3000/student/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        alert("Student registered successfully");
        
    } catch (err) {
        alert("Registration failed");
    }
}

// ================== TEACHER REGISTER ==================
async function registerTeacher() {
    try {
        const body = {
            name: document.getElementById("tName")?.value,
            email: document.getElementById("tRegEmail")?.value,
            password: document.getElementById("tRegPass")?.value,
            subject: document.getElementById("tSubject")?.value
        };

        const res = await fetch("http://localhost:3000/teacher/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        alert("Teacher registered successfully");
    } catch (err) {
        alert("Registration failed");
    }
}

// ================= REGISTER TAB SWITCH =================
const tabs = document.querySelectorAll(".tab");
const forms = document.querySelectorAll(".form-container");

if (tabs.length > 0 && forms.length > 0) {
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            forms.forEach(form => form.classList.remove("active"));

            const target = tab.getAttribute("data-tab");
            const targetForm = document.getElementById(target);
            if (targetForm) targetForm.classList.add("active");
        });
    });
}


// ================= SAFE LOAD NOTES (STUDENT ONLY) =================
async function loadNotesForStudent() {
    const notesContainer = document.getElementById("notesContainer");
    const email = localStorage.getItem("studentEmail");

    if (!email) return;

    const res = await fetch(`http://localhost:3000/notes/student/${email}`);
    const data = await res.json();

    if (!data.success || data.notes.length === 0) {
        notesContainer.innerHTML = "<p>No notes available</p>";
        return;
    }

    notesContainer.innerHTML = "";
    data.notes.forEach(note => {
        const div = document.createElement("div");
        div.className = "note-card";
        div.innerHTML = `
            <h4>${note.course_name}</h4>
            <p>${note.content}</p>
            <small>By ${note.teacher_name}</small><br>
            <small>${new Date(note.created_at).toLocaleString()}</small>
        `;
        notesContainer.appendChild(div);
    });
}




// ================= LOAD ASSIGNMENTS FOR STUDENT =================
async function loadAssignments() {
    const email = localStorage.getItem("studentEmail");

    if (!email) {
        alert("Student not logged in");
        return;
    }

    const res = await fetch(
        `http://localhost:3000/assignments/student/${email}`
    );

    const data = await res.json();

    const ul = document.getElementById("assignmentList");
    ul.innerHTML = "";

    if (data.success && data.assignments.length > 0) {
        data.assignments.forEach(a => {
            const li = document.createElement("li");
            li.innerHTML = `
                <b>${a.title}</b><br>
                ${a.description || ""}<br>
                <small>Course: ${a.course_name}</small><br>
                <small>Teacher: ${a.teacher_name}</small>
                <hr>
            `;
            ul.appendChild(li);
        });
    } else {
        ul.innerHTML = "<li>No assignments available</li>";
    }
}