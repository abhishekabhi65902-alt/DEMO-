const SESSION_KEY = "cclInternSession";

const authView = document.querySelector("#authView");
const dashboardView = document.querySelector("#dashboardView");
const authForm = document.querySelector("#authForm");
const formMessage = document.querySelector("#formMessage");
const formTitle = document.querySelector("#formTitle");
const formSubtitle = document.querySelector("#formSubtitle");
const submitText = document.querySelector("#submitText");
const passwordInput = document.querySelector("#password");
const togglePassword = document.querySelector("#togglePassword");
const demoFill = document.querySelector("#demoFill");
const welcomeName = document.querySelector("#welcomeName");
const trackName = document.querySelector("#trackName");
let currentMode = "login";

function showMessage(message, isSuccess = false) {
  formMessage.textContent = message;
  formMessage.style.color = isSuccess ? "#4d8c64" : "#ef8a68";
}

function setMode(mode) {
  currentMode = mode;
  document.body.classList.toggle("register-mode", mode === "register");
  document.querySelectorAll(".mode-btn").forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  formTitle.textContent = mode === "login" ? "Welcome back" : "Join InternConnect";
  formSubtitle.textContent = mode === "login" ? "Sign in to continue your internship journey." : "Create your student account in a few seconds.";
  submitText.textContent = mode === "login" ? "Enter InternConnect" : "Create student account";
  formMessage.textContent = "";
  authForm.reset();
}

function showDashboard(student) {
  authView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  welcomeName.textContent = `Good morning, ${student.name.split(" ")[0]}`;
  trackName.textContent = student.course ? student.course.split(" ")[0] : "Mining";
}

function showAuth() {
  dashboardView.classList.add("hidden");
  authView.classList.remove("hidden");
  setMode("login");
}

document.querySelectorAll(".mode-btn").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));

togglePassword.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  togglePassword.textContent = isPassword ? "Hide" : "Show";
});

demoFill.addEventListener("click", () => {
  document.querySelector("#email").value = "intern@ccl.gov.in";
  passwordInput.value = "cclintern2026";
  showMessage("Demo access filled. Press Enter InternConnect.", true);
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(authForm);
  const email = formData.get("email").trim().toLowerCase();
  const password = formData.get("password");

  if (!email || !password) {
    showMessage("Please enter your college email and password.");
    return;
  }

  const endpoint = currentMode === "register" ? "/api/register" : "/api/login";
  const payload = { email, password };
  if (currentMode === "register") {
    payload.name = formData.get("studentName").trim();
    payload.course = formData.get("course").trim();
    if (!payload.name || !payload.course) {
      showMessage("Please complete your name and course details.");
      return;
    }
  }

  const submitButton = authForm.querySelector(".primary-button");
  submitButton.disabled = true;
  submitText.textContent = currentMode === "register" ? "Creating account..." : "Signing in...";
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      showMessage(result.message || "Something went wrong. Please try again.");
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(result.student));
    showDashboard(result.student);
  } catch {
    showMessage("The server is unavailable. Start the Node server and try again.");
  } finally {
    submitButton.disabled = false;
    submitText.textContent = currentMode === "register" ? "Create student account" : "Enter InternConnect";
  }
});

document.querySelector("#logoutButton").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  showAuth();
});

const savedSession = localStorage.getItem(SESSION_KEY);
if (savedSession) {
  try {
    showDashboard(JSON.parse(savedSession));
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
}
