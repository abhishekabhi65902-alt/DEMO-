import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 4173);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const useMemoryStore = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes("paste_your_neon_connection_string_here");
const memoryStudents = [];

let pool = null;

if (!useMemoryStore) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

app.use(express.json());
app.use(express.static(__dirname));

async function initializeDatabase() {
  if (useMemoryStore) {
    const demoPasswordHash = await bcrypt.hash("cclintern2026", 12);
    const demoStudent = {
      id: 1,
      name: "CCL Intern",
      email: "intern@ccl.gov.in",
      password_hash: demoPasswordHash,
      course: "Mining Engineering",
      created_at: new Date().toISOString(),
    };

    if (!memoryStudents.some((student) => student.email.toLowerCase() === demoStudent.email.toLowerCase())) {
      memoryStudents.push(demoStudent);
    }

    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      course TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const demoPasswordHash = await bcrypt.hash("cclintern2026", 12);
  await pool.query(
    `INSERT INTO students (name, email, password_hash, course)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    ["CCL Intern", "intern@ccl.gov.in", demoPasswordHash, "Mining Engineering"],
  );
}

function publicStudent(student) {
  return {
    id: student.id,
    name: student.name,
    email: student.email,
    course: student.course,
    createdAt: student.created_at || student.createdAt,
  };
}

app.post("/api/register", async (request, response) => {
  const { name, email, password, course } = request.body;
  if (!name?.trim() || !email?.trim() || !password || !course?.trim()) {
    return response.status(400).json({ message: "Name, email, password and course are required." });
  }
  if (password.length < 8) {
    return response.status(400).json({ message: "Password must be at least 8 characters." });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    if (useMemoryStore) {
      const existingStudent = memoryStudents.find((student) => student.email.toLowerCase() === normalizedEmail);
      if (existingStudent) {
        return response.status(409).json({ message: "An account with that email already exists." });
      }

      const newStudent = {
        id: memoryStudents.length ? Math.max(...memoryStudents.map((student) => Number(student.id))) + 1 : 1,
        name: name.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        course: course.trim(),
        created_at: new Date().toISOString(),
      };

      memoryStudents.push(newStudent);
      return response.status(201).json({ student: publicStudent(newStudent) });
    }

    const result = await pool.query(
      `INSERT INTO students (name, email, password_hash, course)
       VALUES ($1, LOWER($2), $3, $4)
       RETURNING id, name, email, course, created_at`,
      [name.trim(), email.trim(), passwordHash, course.trim()],
    );
    return response.status(201).json({ student: publicStudent(result.rows[0]) });
  } catch (error) {
    if (error.code === "23505") {
      return response.status(409).json({ message: "An account with that email already exists." });
    }
    console.error(error);
    return response.status(500).json({ message: "Could not create the student account." });
  }
});

app.post("/api/login", async (request, response) => {
  const { email, password } = request.body;
  if (!email?.trim() || !password) {
    return response.status(400).json({ message: "Email and password are required." });
  }

  try {
    if (useMemoryStore) {
      const student = memoryStudents.find((row) => row.email.toLowerCase() === email.trim().toLowerCase());
      const validPassword = student && await bcrypt.compare(password, student.password_hash);
      if (!validPassword) {
        return response.status(401).json({ message: "Invalid email or password." });
      }
      return response.json({ student: publicStudent(student) });
    }

    const result = await pool.query("SELECT * FROM students WHERE email = LOWER($1)", [email.trim()]);
    const student = result.rows[0];
    const validPassword = student && await bcrypt.compare(password, student.password_hash);
    if (!validPassword) {
      return response.status(401).json({ message: "Invalid email or password." });
    }
    return response.json({ student: publicStudent(student) });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: "Could not sign in right now." });
  }
});

app.get(/.*/, (request, response) => response.sendFile(path.join(__dirname, "index.html")));

initializeDatabase()
  .then(() => {
    const modeText = useMemoryStore ? " (demo memory database active)" : "";
    app.listen(port, () => console.log(`CCL InternConnect running at http://localhost:${port}${modeText}`));
  })
  .catch((error) => {
    console.error("Could not initialize the student database:", error.message);
    process.exit(1);
  });
