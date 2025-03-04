const Express = require("express");
const Mongoose = require("mongoose");
const Bcrypt = require("bcrypt");
const Cors = require("cors");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const { usermodel } = require("./models/User");
const { Admin } = require("./models/Admin");
const Task = require("./models/Task");

const app = Express();

app.use(Cors());
app.use(Express.json());
app.use(bodyParser.json());

Mongoose.connect(
  "mongodb+srv://sreepriya:sreepriya73@cluster0.rwd5pdm.mongodb.net/virtuworkdb?retryWrites=true&w=majority&appName=Cluster0",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
)
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("MongoDB connection error:", error));

const generateHashedPassword = async (password) => {
  const salt = await Bcrypt.genSalt(10);
  return Bcrypt.hash(password, salt);
};

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Expecting "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: "Authentication token required" });
  }

  jwt.verify(token, "VirtuworkApp", (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user; // Attach decoded user data (including userId) to request
    next();
  });
};

app.get("/", (req, res) => {
  res.send("hello");
});

// User Registration Route
app.post("/uregister", async (req, res) => {
  try {
    let input = req.body;
    console.log("Received input:", input);

    if (!input.password) {
      return res.status(400).json({ status: "error", message: "Password is required." });
    }

    let hashedPassword = await generateHashedPassword(input.password);
    input.password = hashedPassword;

    let user = new usermodel(input);
    await user.save();
    res.json({ status: "success" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ status: "error", message: "Registration failed", details: error.message });
  }
});

// Sign-In Route
app.post("/signin", async (req, res) => {
  try {
    const { emailid, password } = req.body;

    if (!emailid || !password) {
      return res.status(400).json({ status: "error", message: "Email and Password are required" });
    }

    const user = await usermodel.findOne({ emailid });
    if (!user) {
      return res.status(404).json({ status: "error", message: "Email not found" });
    }

    const isPasswordValid = Bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ status: "error", message: "Incorrect password" });
    }

    const token = jwt.sign(
      { emailid: user.emailid, role: user.role, userId: user._id },
      "VirtuworkApp",
      { expiresIn: "1d" }
    );

    res.json({
      status: "success",
      token,
      userId: user._id,
      username: user.username,
      role: user.role,
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ status: "error", message: "Signin failed", details: error.message });
  }
});

// Fetch User Data by ID
app.get("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await usermodel.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin Login
app.post("/admin/login", async (req, res) => {
  const { emailid, password } = req.body;

  try {
    const admin = await Admin.findOne({ emailid });
    if (!admin) {
      return res.status(404).json({ status: "error", message: "Admin not found!" });
    }

    const isPasswordValid = await Bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ status: "error", message: "Invalid credentials!" });
    }

    const token = jwt.sign({ id: admin._id }, "yourSecretKey", { expiresIn: "1h" });
    res.json({ status: "success", token });
  } catch (error) {
    console.error("Error during admin login:", error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});

// Admin Registration
app.post("/admin/register", async (req, res) => {
  const { name, emailid, password } = req.body;

  try {
    const existingAdmin = await Admin.findOne({ emailid });
    if (existingAdmin) {
      return res.status(400).json({ status: "error", message: "Email already registered!" });
    }

    const hashedPassword = await Bcrypt.hash(password, 10);
    const newAdmin = new Admin({
      name,
      emailid,
      password: hashedPassword,
    });

    await newAdmin.save();
    res.json({ status: "success", message: "Admin registered successfully!" });
  } catch (error) {
    console.error("Error during admin registration:", error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});

// Fetch Users by Role
app.get("/users", async (req, res) => {
  try {
    const { role } = req.query;
    if (!role) {
      return res.status(400).json({ error: "Role query parameter is required" });
    }

    const freelancers = await usermodel.find({ role });
    res.status(200).json(freelancers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users", details: error.message });
  }
});

// Create Task (Protected Route)
app.post("/tasks/add", authenticateToken, async (req, res) => {
  const { description, category, deadline, budget } = req.body;

  try {
    const task = new Task({
      ClientId: req.user.userId, // Set ClientId from authenticated user
      description,
      category,
      deadline,
      budget,
    });

    await task.save();
    res.status(201).json({ message: "Task created successfully", task });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Error creating task", error: error.message });
  }
});

app.get("/tasks/all", async (req, res) => {
  try {
    const tasks = await Task.find().populate("ClientId", "username"); // Populate ClientId with username
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks", error });
  }
});

// Delete Task
app.delete("/tasks/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await Task.findByIdAndDelete(id);
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task", error });
  }
});

// Accept Task
app.put("/tasks/accept/:id", async (req, res) => {
  try {
    const taskId = req.params.id;
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { status: "accepted" },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task accepted successfully", task: updatedTask });
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get Accepted Tasks
app.get("/tasks/accepted", async (req, res) => {
  try {
    const tasks = await Task.find({ status: "accepted" }).populate("ClientId", "username");
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching accepted tasks", error });
  }
});

app.put("/tasks/confirm/:id", async (req, res) => {
  try {
    const taskId = req.params.id;
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { freelancerConfirmation: "confirmed" },
      { new: true }
    ).populate("ClientId", "username");

    if (!updatedTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task confirmed by freelancer", task: updatedTask });
  } catch (error) {
    console.error("Error confirming task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get Freelancer Confirmed Tasks
app.get("/tasks/freelancer-confirmed", async (req, res) => {
  try {
    const tasks = await Task.find({ freelancerConfirmation: "confirmed" }).populate("ClientId", "username");
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching freelancer-confirmed tasks:", error);
    res.status(500).json({ message: "Error fetching freelancer-confirmed tasks", error });
  }
});

app.get("/tasks/current-work", async (req, res) => {
  try {
    const task = await Task.findOne({ freelancerConfirmation: "confirmed" })
      .sort({ createdAt: -1 }) // Sort by createdAt descending (most recent first)
      .populate("ClientId", "username");
    
    if (!task) {
      return res.status(404).json({ message: "No confirmed tasks found" });
    }

    // Calculate progress based on time elapsed
    const now = new Date();
    const start = new Date(task.createdAt);
    const end = new Date(task.deadline);
    const totalDuration = end - start;
    const elapsedDuration = now - start;
    const progress = totalDuration > 0 ? Math.min((elapsedDuration / totalDuration) * 100, 100) : 0;

    res.status(200).json({ task, progress });
  } catch (error) {
    console.error("Error fetching current work:", error);
    res.status(500).json({ message: "Error fetching current work", error });
  }
});

// Add this to your app.js

// Submit Work (No freelancer conditions)
// Replace the existing /tasks/submit/:id endpoint in app.js
app.put("/tasks/submit/:id", async (req, res) => {
  try {
    const taskId = req.params.id;
    const { submission } = req.body;

    if (!taskId || taskId === "undefined") {
      return res.status(400).json({ message: "Task ID is required" });
    }
    if (!submission) {
      return res.status(400).json({ message: "Submission content is required" });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { submission },
      { new: true }
    ).populate("ClientId", "username");

    if (!updatedTask) return res.status(404).json({ error: "Task not found" });

    console.log("Work submitted for task:", updatedTask);
    res.status(200).json({ message: "Work submitted successfully", task: updatedTask });
  } catch (error) {
    console.error("Error submitting work:", error);
    res.status(500).json({ message: "Error submitting work", error: error.message });
  }
});

// Get Tasks with Submitted Work
app.get("/tasks/submitted", async (req, res) => {
  try {
    const tasks = await Task.find({ submission: { $ne: null } }) // Fetch tasks where submission is not null
      .populate("ClientId", "username")
      .populate("freelancerId", "username");
    console.log("Fetched submitted tasks:", tasks);
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching submitted tasks:", error);
    res.status(500).json({ message: "Error fetching submitted tasks", error });
  }
});

app.post('/api/recommend-task', async (req, res) => {
  try {
    const { skill, category } = req.body;

    if (!skill || !category) {
      return res.status(400).json({ message: 'Skill and category are required' });
    }

    // Forward request to Flask backend
    const flaskResponse = await axios.post('http://localhost:5000/recommend-task', {
      skill,
      category
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    // Return Flask's response
    res.status(200).json(flaskResponse.data);
  } catch (error) {
    console.error('Error proxying to Flask:', error.message);
    res.status(500).json({ message: 'Error getting recommendation', error: error.message });
  }
});

app.listen(3030, () => {
  console.log("Server started on port 3030");
});