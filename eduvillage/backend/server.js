const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");
const { Pool } = require("pg");

const app = express();
const PORT = 5432;

app.use(cors());
app.use(express.json());

/* ================= DATABASE ================= */
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

db.connect(err => {
    if (err) {
        console.log("❌ DB Error:", err);
    } else {
        console.log("✅ MySQL Connected");
    }
});

/* ================= STUDENT REGISTER ================= */
app.post("/student/register", async (req, res) => {
    let { name, email, password, education, field } = req.body;

    name = name?.trim();
    email = email?.trim().toLowerCase();
    education = education?.trim();
    field = field?.trim();

    if (!name || !email || !password || !education || !field) {
        return res.json({ success: false, message: "All fields are required" });
    }

    db.query(
        "SELECT id FROM student WHERE email = ?",
        [email],
        async (err, result) => {
            if (err) return res.json({ success: false });

            if (result.length > 0) {
                return res.json({ success: false, message: "Student already exists" });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            db.query(
                "INSERT INTO student (name, email, password, education, field) VALUES (?, ?, ?, ?, ?)",
                [name, email, hashedPassword, education, field],
                err => {
                    if (err) return res.json({ success: false });
                    res.json({ success: true });
                }
            );
        }
    );
});

/* ================= STUDENT LOGIN ================= */
app.post("/student/login", (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    db.query(
        "SELECT * FROM student WHERE email = ?",
        [email],
        async (err, result) => {
            if (err || result.length === 0) {
                return res.json({ success: false });
            }

            const match = await bcrypt.compare(password, result[0].password);
            if (!match) return res.json({ success: false });

            res.json({
                success: true,
                student: {
                    name: result[0].name,
                    email: result[0].email
                }
            });
        }
    );
});

/* ================= TEACHER REGISTER ================= */
app.post("/teacher/register", async (req, res) => {
    let { name, email, password } = req.body;

    name = name?.trim();
    email = email?.trim().toLowerCase();

    if (!name || !email || !password) {
        return res.json({ success: false, message: "All fields required" });
    }

    db.query(
        "SELECT id FROM teacher WHERE email = ?",
        [email],
        async (err, result) => {
            if (err) return res.json({ success: false });

            if (result.length > 0) {
                return res.json({ success: false, message: "Teacher already exists" });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            db.query(
                "INSERT INTO teacher (name, email, password) VALUES (?, ?, ?)",
                [name, email, hashedPassword],
                err => {
                    if (err) return res.json({ success: false });
                    res.json({ success: true });
                }
            );
        }
    );
});

/* ================= TEACHER LOGIN ================= */
app.post("/teacher/login", (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
        return res.json({ success: false, message: "Missing credentials" });
    }

    db.query(
        "SELECT * FROM teacher WHERE email = ?",
        [email],
        async (err, result) => {
            if (err || result.length === 0) {
                return res.json({ success: false, message: "Teacher not found" });
            }

            const match = await bcrypt.compare(password, result[0].password);
            if (!match) {
                return res.json({ success: false, message: "Invalid password" });
            }

            // ✅ SUCCESS RESPONSE
            res.json({
                success: true,
                teacher: {
                    id: result[0].id,
                    name: result[0].name,
                    email: result[0].email
                }
            });
        }
    );
});

/* ================= ADD COURSE ================= */
app.post("/course/add", (req, res) => {
    const { course_name, teacher_id } = req.body;

    if (!course_name || !teacher_id) {
        return res.json({
            success: false,
            message: "Missing data"
        });
    }

    // check if teacher already has a course
    db.query(
        "SELECT id FROM courses WHERE teacher_id = ?",
        [teacher_id],
        (err, result) => {
            if (err) {
                return res.json({
                    success: false,
                    message: "Database error"
                });
            }

            if (result.length > 0) {
                return res.json({
                    success: false,
                    message: "Course already added"
                });
            }

            // insert course
            db.query(
                "INSERT INTO courses (course_name, teacher_id) VALUES (?, ?)",
                [course_name, teacher_id],
                err2 => {
                    if (err2) {
                        return res.json({
                            success: false,
                            message: "Insert failed"
                        });
                    }

                    res.json({
                        success: true
                    });
                }
            );
        }
    );
});

/* ================= COURSES ================= */
app.get("/courses", (req, res) => {
    db.query("SELECT * FROM courses", (err, result) => {
        if (err) return res.json({ success: false });
        res.json({ success: true, courses: result });
    });
});
// ================= TEACHER COURSES =================
app.get("/courses/teacher/:teacherId", (req, res) => {
    const teacherId = req.params.teacherId;

    db.query(
        "SELECT * FROM courses WHERE teacher_id = ?",
        [teacherId],
        (err, result) => {
            if (err) {
                return res.json({ success: false });
            }

            res.json({
                success: true,
                courses: result
            });
        }
    );
});


/* ================= STUDENT ENROLL COURSE (USING IDs) ================= */
app.post("/student/select-course", (req, res) => {
    const { student_email, course_name } = req.body;

    if (!student_email || !course_name) {
        return res.json({ success: false, message: "Missing data" });
    }

    db.query(
        "SELECT id FROM student WHERE email = ?",
        [student_email],
        (err, studentResult) => {
            if (err || studentResult.length === 0) {
                return res.json({ success: false, message: "Student not found" });
            }

            const student_id = studentResult[0].id;

            db.query(
                "SELECT id FROM courses WHERE course_name = ?",
                [course_name],
                (err, courseResult) => {
                    if (err || courseResult.length === 0) {
                        return res.json({ success: false, message: "Course not found" });
                    }

                    const course_id = courseResult[0].id;

                    db.query(
                        "SELECT id FROM student_courses WHERE student_id = ? AND course_id = ?",
                        [student_id, course_id],
                        (err, exist) => {
                            if (exist.length > 0) {
                                return res.json({ success: false, message: "Already enrolled" });
                            }

                            db.query(
                                "INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)",
                                [student_id, course_id],
                                err => {
                                    if (err) return res.json({ success: false });
                                    res.json({ success: true });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

/* ================= GET STUDENT COURSES ================= */
app.get("/student/courses/:email", (req, res) => {
    const email = req.params.email;

    const sql = `
        SELECT c.course_name
        FROM student_courses sc
        JOIN student s ON sc.student_id = s.id
        JOIN courses c ON sc.course_id = c.id
        WHERE s.email = ?
    `;

    db.query(sql, [email], (err, result) => {
        if (err) return res.json({ success: false });
        res.json({ success: true, courses: result });
    });
});

/* ================= ASSIGNMENTS ================= */
app.post("/assignment/add", (req, res) => {
    const { title, description, course_id } = req.body;

    if (!title || !course_id) {
        return res.json({ success: false, message: "Missing data" });
    }

    const sql = `
        INSERT INTO assignments (title, description, course_id)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [title, description, course_id], err => {
        if (err) {
            console.log(err);
            return res.json({ success: false });
        }
        res.json({ success: true });
    });
});


/* ================= GET ASSIGNMENTS FOR STUDENT ================= */
app.get("/assignments/student/:email", (req, res) => {
    const email = req.params.email;

    const sql = `
        SELECT 
            a.title,
            a.description,
            c.course_name,
            t.name AS teacher_name
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN teacher t ON c.teacher_id = t.id
        JOIN student_courses sc ON sc.course_id = c.id
        JOIN student s ON sc.student_id = s.id
        WHERE s.email = ?
    `;

    db.query(sql, [email], (err, result) => {
        if (err) {
            console.log(err);
            return res.json({ success: false });
        }

        res.json({
            success: true,
            assignments: result
        });
    });
});



/* ================= NOTES ================= */



// ✅ ADD NOTE (Teacher adds note using IDs)
app.post("/notes", (req, res) => {
    const { teacher_id, course_id, content } = req.body;

    if (!teacher_id || !course_id || !content) {
        return res.json({ success: false, message: "Missing data" });
    }

    const sql = `
        INSERT INTO notes (teacher_id, course_id, content, created_at)
        VALUES (?, ?, ?, NOW())
    `;

    db.query(sql, [teacher_id, course_id, content], (err) => {
        if (err) {
            console.log("❌ Add Note Error:", err);
            return res.json({ success: false });
        }
        res.json({ success: true, message: "Note added successfully" });
    });
});


// ✅ GET NOTES FOR STUDENT (Only enrolled course notes)
app.get("/notes/student/:email", (req, res) => {
    const email = req.params.email;

    const sql = `
        SELECT 
            n.content,
            c.course_name,
            t.name AS teacher_name,
            n.created_at
        FROM notes n
        JOIN courses c ON n.course_id = c.id
        JOIN teacher t ON n.teacher_id = t.id
        JOIN student_courses sc ON sc.course_id = c.id
        JOIN student s ON sc.student_id = s.id
        WHERE s.email = ?
        ORDER BY n.created_at DESC
    `;

    db.query(sql, [email], (err, result) => {
        if (err) {
            console.log("❌ Fetch Notes Error:", err);
            return res.json({ success: false });
        }

        res.json({
            success: true,
            notes: result
        });
    });
});

/* ================= GET STUDENTS BY COURSE (FOR TEACHER) ================= */

app.get("/teacher/students/:courseId", (req, res) => {
    const courseId = req.params.courseId;

    const sql = `
        SELECT s.name, s.email
        FROM student_courses sc
        JOIN student s ON sc.student_id = s.id
        WHERE sc.course_id = ?
    `;

    db.query(sql, [courseId], (err, result) => {
        if (err) {
            console.log("❌ Fetch Students Error:", err);
            return res.json({ success: false });
        }

        console.log("📌 Students Found:", result); // 👈 ADD THIS LINE
        res.json({
            success: true,
            students: result
        });
    });
});

/* ================= LEADERBOARD ================= */
app.get("/leaderboard/:courseId", (req, res) => {
    const courseId = req.params.courseId;

    const sql = `
        SELECT s.name, s.email, r.marks
        FROM results r
        JOIN student s ON r.student_id = s.id
        WHERE r.course_id = ?
        ORDER BY r.marks DESC
    `;

    db.query(sql, [courseId], (err, result) => {
        if (err) {
            console.log("❌ Leaderboard Error:", err);
            return res.json({ success: false });
        }

        res.json({
            success: true,
            leaderboard: result
        });
    });
});




/* ================= START SERVER ================= */
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});