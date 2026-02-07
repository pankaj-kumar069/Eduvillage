const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
// const mysql = require("mysql2");
require("dotenv").config();
const { Pool } = require("pg");
const path = require("path");



const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: "*",
  credentials: true
}));


app.use(express.json());

/* ================= DATABASE ================= */
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});


db.connect(err => {
    if (err) {
        console.log("❌ DB Error:", err);
    } else {
        console.log("✅ MySQL Connected");
    }
});

app.use(express.static(path.join(__dirname, "public")));


app.get("/", (req, res)=>{
    res.send("Server is running");
})

/* ================= STUDENT REGISTER ================= */
app.post("/student/register", async (req, res) => {
  try {
    let { name, email, password, education, field } = req.body;

    name = name?.trim();
    email = email?.trim().toLowerCase();

    if (!name || !email || !password || !education || !field) {
      return res.json({ success: false, message: "All fields required" });
    }

    const exists = await db.query(
      "SELECT id FROM students WHERE email = $1",
      [email]
    );

    if (exists.rows.length > 0) {
      return res.json({ success: false, message: "Student already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO students (name, email, password, education, field)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, email, hashed, education, field]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("❌ STUDENT REGISTER ERROR:", err);
    res.status(500).json({ success: false });
  }
});


/* ================= STUDENT LOGIN ================= */
app.post("/student/login", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    const result = await db.query(
      "SELECT * FROM students WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({ success: false, message: "Student not found" });
    }

    const student = result.rows[0];
    const match = await bcrypt.compare(password, student.password);

    if (!match) {
      return res.json({ success: false, message: "Invalid password" });
    }

    res.json({
      success: true,
      student: {
        name: student.name,
        email: student.email
      }
    });

  } catch (err) {
    console.error("❌ STUDENT LOGIN ERROR:", err);
    res.status(500).json({ success: false });
  }
});


/* ================= TEACHER REGISTER ================= */
app.post("/teacher/register", async (req, res) => {
  try {
    let { name, email, password, subject } = req.body;

    name = name?.trim();
    email = email?.trim().toLowerCase();

    if (!name || !email || !password || !subject) {
      return res.json({ success: false, message: "All fields required" });
    }

    // check existing teacher
    const exists = await db.query(
      "SELECT id FROM teachers WHERE email = $1",
      [email]
    );

    if (exists.rows.length > 0) {
      return res.json({ success: false, message: "Teacher already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO teachers (name, email, password, subject)
       VALUES ($1, $2, $3, $4)`,
      [name, email, hashedPassword, subject]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("❌ TEACHER REGISTER ERROR:", err);
    res.status(500).json({ success: false });
  }
});


/* ================= TEACHER LOGIN ================= */
app.post("/teacher/login", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.json({ success: false, message: "Missing credentials" });
    }

    const result = await db.query(
      "SELECT * FROM teachers WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({ success: false, message: "Teacher not found" });
    }

    const teacher = result.rows[0];
    const match = await bcrypt.compare(password, teacher.password);

    if (!match) {
      return res.json({ success: false, message: "Invalid password" });
    }

    res.json({
      success: true,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email
      }
    });

  } catch (err) {
    console.error("❌ TEACHER LOGIN ERROR:", err);
    res.status(500).json({ success: false });
  }
});


/* ================= ADD COURSE (FIXED) ================= */
app.post("/course/add", async (req, res) => {
  try {
    let { course_name, teacher_id } = req.body;

    course_name = course_name?.trim();

    if (!course_name || !teacher_id) {
      return res.json({ success: false, message: "Missing data" });
    }

    // check if SAME course already exists for SAME teacher
    const exists = await db.query(
      "SELECT id FROM courses WHERE course_name = $1 AND teacher_id = $2",
      [course_name, teacher_id]
    );

    if (exists.rows.length > 0) {
      return res.json({
        success: false,
        message: "Course already exists"
      });
    }

    await db.query(
      "INSERT INTO courses (course_name, teacher_id) VALUES ($1, $2)",
      [course_name, teacher_id]
    );

    res.json({ success: true, message: "Course added successfully" });

  } catch (err) {
    console.error("❌ ADD COURSE ERROR:", err.message);
    res.status(500).json({ success: false, message: "Database error" });
  }
});


/* ================= ALL COURSES ================= */
app.get("/courses", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM courses");
    res.json({ success: true, courses: result.rows });
  } catch (err) {
    console.error("❌ FETCH COURSES ERROR:", err);
    res.json({ success: false });
  }
});

/* ================= TEACHER COURSES ================= */
app.get("/courses/teacher/:teacherId", async (req, res) => {
  try {
    const teacherId = req.params.teacherId;

    const result = await db.query(
      "SELECT * FROM courses WHERE teacher_id = $1",
      [teacherId]
    );

    res.json({
      success: true,
      courses: result.rows
    });

  } catch (err) {
    console.error("❌ TEACHER COURSES ERROR:", err);
    res.json({ success: false });
  }
});



/* ================= STUDENT ENROLL COURSE ================= */
app.post("/student/select-course", async (req, res) => {
  try {
    const { student_email, course_name } = req.body;

    if (!student_email || !course_name) {
      return res.json({ success: false, message: "Missing data" });
    }

    // get student id
    const studentResult = await db.query(
      "SELECT id FROM students WHERE email = $1",
      [student_email.toLowerCase()]
    );

    if (studentResult.rows.length === 0) {
      return res.json({ success: false, message: "Student not found" });
    }

    const student_id = studentResult.rows[0].id;

    // get course id
    const courseResult = await db.query(
      "SELECT id FROM courses WHERE course_name = $1",
      [course_name]
    );

    if (courseResult.rows.length === 0) {
      return res.json({ success: false, message: "Course not found" });
    }

    const course_id = courseResult.rows[0].id;

    // check already enrolled
    const exist = await db.query(
      "SELECT id FROM student_courses WHERE student_id = $1 AND course_id = $2",
      [student_id, course_id]
    );

    if (exist.rows.length > 0) {
      return res.json({ success: false, message: "Already enrolled" });
    }

    // enroll student
    await db.query(
      "INSERT INTO student_courses (student_id, course_id) VALUES ($1, $2)",
      [student_id, course_id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("❌ STUDENT ENROLL ERROR:", err);
    res.status(500).json({ success: false });
  }
});


/* ================= GET STUDENT COURSES ================= */
app.get("/student/courses/:email", async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();

    const result = await db.query(
      `
      SELECT c.course_name
      FROM student_courses sc
      JOIN students s ON sc.student_id = s.id
      JOIN courses c ON sc.course_id = c.id
      WHERE s.email = $1
      `,
      [email]
    );

    res.json({
      success: true,
      courses: result.rows
    });

  } catch (err) {
    console.error("❌ FETCH STUDENT COURSES ERROR:", err);
    res.json({ success: false });
  }
});


/* ================= ADD ASSIGNMENT ================= */
app.post("/assignment/add", async (req, res) => {
  try {
    const { title, description, course_id } = req.body;

    if (!title || !course_id) {
      return res.json({ success: false, message: "Missing data" });
    }

    await db.query(
      `
      INSERT INTO assignments (title, description, course_id)
      VALUES ($1, $2, $3)
      `,
      [title, description || null, course_id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("❌ ADD ASSIGNMENT ERROR:", err);
    res.status(500).json({ success: false });
  }
});


/* ================= GET ASSIGNMENTS FOR STUDENT ================= */
app.get("/assignments/student/:email", async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();

    const result = await db.query(
      `
      SELECT 
        a.title,
        a.description,
        c.course_name,
        t.name AS teacher_name
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN teachers t ON c.teacher_id = t.id
      JOIN student_courses sc ON sc.course_id = c.id
      JOIN students s ON sc.student_id = s.id
      WHERE s.email = $1
      `,
      [email]
    );

    res.json({
      success: true,
      assignments: result.rows
    });

  } catch (err) {
    console.error("❌ FETCH ASSIGNMENTS ERROR:", err);
    res.status(500).json({ success: false });
  }
});


/* ================= NOTES ================= */

/* ✅ ADD NOTE (Teacher adds note) */
app.post("/notes", async (req, res) => {
  try {
    const { teacher_id, course_id, content } = req.body;

    if (!teacher_id || !course_id || !content) {
      return res.json({ success: false, message: "Missing data" });
    }

    await db.query(
      `
      INSERT INTO notes (teacher_id, course_id, content, created_at)
      VALUES ($1, $2, $3, NOW())
      `,
      [teacher_id, course_id, content]
    );

    res.json({ success: true, message: "Note added successfully" });

  } catch (err) {
    console.error("❌ ADD NOTE ERROR:", err);
    res.status(500).json({ success: false });
  }
});


/* ✅ GET NOTES FOR STUDENT (Only enrolled courses) */
app.get("/notes/student/:email", async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();

    const result = await db.query(
      `
      SELECT 
        n.content,
        c.course_name,
        t.name AS teacher_name,
        n.created_at
      FROM notes n
      JOIN courses c ON n.course_id = c.id
      JOIN teachers t ON n.teacher_id = t.id
      JOIN student_courses sc ON sc.course_id = c.id
      JOIN students s ON sc.student_id = s.id
      WHERE s.email = $1
      ORDER BY n.created_at DESC
      `,
      [email]
    );

    res.json({
      success: true,
      notes: result.rows
    });

  } catch (err) {
    console.error("❌ FETCH NOTES ERROR:", err);
    res.status(500).json({ success: false });
  }
});


/* ================= GET STUDENTS BY COURSE (FOR TEACHER) ================= */
app.get("/teacher/students/:courseId", async (req, res) => {
  try {
    const courseId = req.params.courseId;

    const result = await db.query(
      `
      SELECT s.name, s.email
      FROM student_courses sc
      JOIN students s ON sc.student_id = s.id
      WHERE sc.course_id = $1
      `,
      [courseId]
    );

    res.json({
      success: true,
      students: result.rows
    });

  } catch (err) {
    console.error("❌ FETCH STUDENTS ERROR:", err);
    res.status(500).json({ success: false });
  }
});


/* ================= LEADERBOARD ================= */
app.get("/leaderboard/:courseId", async (req, res) => {
  try {
    const courseId = req.params.courseId;

    const result = await db.query(
      `
      SELECT s.name, s.email, r.marks
      FROM results r
      JOIN students s ON r.student_id = s.id
      WHERE r.course_id = $1
      ORDER BY r.marks DESC
      `,
      [courseId]
    );

    res.json({
      success: true,
      leaderboard: result.rows
    });

  } catch (err) {
    console.error("❌ LEADERBOARD ERROR:", err);
    res.status(500).json({ success: false });
  }
});


app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});




/* ================= START SERVER ================= */
app.listen(PORT, () => {
    console.log(`🚀 Server running at ${PORT}`);
});