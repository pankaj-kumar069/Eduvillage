// ================== LOGIN FORM SWITCH ==================
function showLoginForm(type) {
    const studentForm = document.getElementById("student-form");
    const teacherForm = document.getElementById("teacher-form");
    if (!studentForm || !teacherForm) return;

    studentForm.classList.toggle("active", type === "student");
    teacherForm.classList.toggle("active", type === "teacher");
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
    const email = document.getElementById("sEmail")?.value.trim();
    const password = document.getElementById("sPass")?.value.trim();
    if (!email || !password) return alert("Enter credentials");

    try {
        const res = await fetch("/student/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (data.success) {
            localStorage.setItem("studentName", data.student.name);
            localStorage.setItem("studentEmail", data.student.email);
            window.location.href = "student.html";
        } else alert(data.message);
    } catch (err) {
        console.error(err);
        alert("Server not responding");
    }
}




// ================== LOAD STUDENT COURSES DROPDOWN ==================
async function loadStudentCourseDropdown() {
    const teacherId = localStorage.getItem("teacherId");
    const dropdown = document.getElementById("studentCourseSelect");
    dropdown.innerHTML = '<option value="">Select Course</option>';

    if (!teacherId) return;

    try {
        const res = await fetch(`/courses/teacher/${teacherId}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.courses) && data.courses.length > 0) {
            data.courses.forEach(course => {
                const option = document.createElement("option");
                option.value = course.id;
                option.textContent = course.course_name;
                dropdown.appendChild(option);
            });
        } else {
            dropdown.innerHTML = '<option value="">No courses found</option>';
        }
    } catch (err) {
        console.error("Error loading teacher courses:", err);
        dropdown.innerHTML = '<option value="">Error loading courses</option>';
    }
}

// ================== LOAD STUDENTS BY COURSE ==================
async function loadStudentsByCourse() {
    const courseId = document.getElementById("studentCourseSelect").value;
    const ul = document.getElementById("studentList");
    ul.innerHTML = "<li>Loading students...</li>";

    if (!courseId) {
        ul.innerHTML = "<li>Select a course</li>";
        return;
    }

    try {
        const res = await fetch(`/teacher/students/${courseId}`);
        const data = await res.json();

        ul.innerHTML = "";

        if (data.success && Array.isArray(data.students) && data.students.length > 0) {
            data.students.forEach(s => {
                const li = document.createElement("li");
                li.textContent = `${s.name} – ${s.email}`;
                ul.appendChild(li);
            });
        } else {
            ul.innerHTML = "<li>No students enrolled</li>";
        }
    } catch (err) {
        console.error("Error fetching students:", err);
        ul.innerHTML = "<li>Error loading students</li>";
    }
}

// ================== OPEN STUDENTS SECTION ==================
function openStudents() {
    showSection('students');
    loadStudentCourseDropdown();
}



// ================== TEACHER LOGIN ==================
async function teacherLogin() {
    const email = document.getElementById("tEmail")?.value.trim();
    const password = document.getElementById("tPass")?.value.trim();
    if (!email || !password) return alert("Enter credentials");

    try {
        const res = await fetch("/teacher/login", {
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
        } else alert(data.message);
    } catch (err) {
        console.error(err);
        alert("Server not responding");
    }
}

// ================== REGISTRATION ==================
async function registerStudent() {
    const body = {
        name: document.getElementById("sName")?.value.trim(),
        email: document.getElementById("sRegEmail")?.value.trim(),
        password: document.getElementById("sRegPass")?.value,
        education: document.getElementById("sEducation")?.value.trim(),
        field: document.getElementById("sField")?.value.trim()
    };

    try {
        const res = await fetch("/student/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        alert(data.success ? "Student registered successfully" : data.message || "Registration failed");
    } catch (err) {
        console.error(err);
        alert("Registration failed");
    }
}

async function registerTeacher() {
    const body = {
        name: document.getElementById("tName")?.value.trim(),
        email: document.getElementById("tRegEmail")?.value.trim(),
        password: document.getElementById("tRegPass")?.value,
        subject: document.getElementById("tSubject")?.value.trim()
    };

    try {
        const res = await fetch("/teacher/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        alert(data.success ? "Teacher registered successfully" : data.message || "Registration failed");
    } catch (err) {
        console.error(err);
        alert("Registration failed");
    }
}

// ================== TAB SWITCH ==================
const tabs = document.querySelectorAll(".tab");
const forms = document.querySelectorAll(".form-container");

tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        forms.forEach(form => form.classList.remove("active"));
        const target = tab.getAttribute("data-tab");
        document.getElementById(target)?.classList.add("active");
    });
});

// ================== LOAD NOTES (STUDENT ONLY) ==================
async function loadNotesForStudent() {
    const notesContainer = document.getElementById("notesContainer");
    const email = localStorage.getItem("studentEmail");
    if (!email) return;

    try {
        const res = await fetch(`/notes/student/${email}`);
        const data = await res.json();

        if (!data.success || !data.notes.length) {
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
    } catch (err) {
        console.error(err);
        notesContainer.innerHTML = "<p>Error loading notes</p>";
    }
}

// ================== LOAD ASSIGNMENTS ==================
async function loadAssignments() {
    const email = localStorage.getItem("studentEmail");
    if (!email) return alert("Student not logged in");

    try {
        const res = await fetch(`/assignments/student/${email}`);
        const data = await res.json();

        const ul = document.getElementById("assignmentList");
        ul.innerHTML = "";

        if (data.success && data.assignments.length) {
            data.assignments.forEach(a => {
                const li = document.createElement("li");
                li.innerHTML = `
                    <b>${a.title}</b><br>
                    ${a.description || ""}<br>
                    <small>Course: ${a.course_name}</small><br>
                    <small>Teacher: ${a.teacher_name}</small><hr>
                `;
                ul.appendChild(li);
            });
        } else ul.innerHTML = "<li>No assignments available</li>";
    } catch (err) {
        console.error(err);
    }
}

// ================== LOAD TEACHER COURSES ==================
async function loadTeacherCourses(dropdownId) {
    const teacherId = localStorage.getItem("teacherId");
    const select = document.getElementById(dropdownId);
    select.innerHTML = '<option value="">Select Course</option>';

    if (!teacherId) return;

    try {
        const res = await fetch(`/courses/teacher/${teacherId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.courses)) {
            data.courses.forEach(course => {
                const option = document.createElement("option");
                option.value = course.id;
                option.textContent = course.course_name;
                select.appendChild(option);
            });
        }
    } catch (err) {
        console.error("Error fetching courses:", err);
    }
}

// ================== CREATE ASSIGNMENT ==================
async function createAssignment() {
    const title = document.getElementById("assignmentTitle")?.value.trim();
    const description = document.getElementById("assignmentDesc")?.value.trim();
    const courseId = document.getElementById("assignmentCourse")?.value;
    const teacherId = localStorage.getItem("teacherId");

    if (!title || !courseId) return alert("Title and course are required");

    try {
        const res = await fetch("/assignment/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description, course_id: courseId, teacher_id: teacherId })
        });
        const data = await res.json();
        if (data.success) {
            alert("Assignment created successfully!");
            document.getElementById("assignmentTitle").value = "";
            document.getElementById("assignmentDesc").value = "";
        } else {
            alert("Error: " + (data.message || "Could not create assignment"));
        }
    } catch (err) {
        console.error(err);
        alert("Server error");
    }
}

// ================== INIT ON LOAD ==================
window.addEventListener("DOMContentLoaded", () => {
    loadTeacherCourses("assignmentCourse");
});
