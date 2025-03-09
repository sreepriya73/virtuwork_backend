const Express = require("express");
const Mongoose = require("mongoose");
const Bcrypt = require("bcrypt");
const Cors = require("cors");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const { usermodel } = require("./models/User");
const { Admin } = require("./models/Admin");
const Task = require("./models/Task");
const multer = require('multer');
const Project = require("./models/Project");
const app = Express();
const axios = require("axios");
const Redemption = require("./models/Redemption");


app.use(Cors());
app.use(Express.json());
app.use(bodyParser.json());

Mongoose.connect(
  "mongodb+srv://sreepriya:sreepriya73@cluster0.rwd5pdm.mongodb.net/virtuworkdb?retryWrites=true&w=majority&appName=Cluster0"
)
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("MongoDB connection error:", error));

const SECRET_KEY = 'VirtuworkApp'; // Match this with your sign-in JWT secret

const generateHashedPassword = async (password) => {
  const salt = await Bcrypt.genSalt(10);
  return Bcrypt.hash(password, salt);
};

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication token required" });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user; // Attach decoded user data
    next();
  });
};

// Existing Routes
app.get("/", (req, res) => {
  res.send("hello");
});

app.post("/uregister", async (req, res) => {
  try {
    let input = req.body;
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
      SECRET_KEY,
      { expiresIn: '1d' }
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
    const token = jwt.sign({ id: admin._id }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ status: "success", token });
  } catch (error) {
    console.error("Error during admin login:", error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});

app.post("/admin/register", async (req, res) => {
  const { name, emailid, password } = req.body;
  try {
    const existingAdmin = await Admin.findOne({ emailid });
    if (existingAdmin) {
      return res.status(400).json({ status: "error", message: "Email already registered!" });
    }
    const hashedPassword = await Bcrypt.hash(password, 10);
    const newAdmin = new Admin({ name, emailid, password: hashedPassword });
    await newAdmin.save();
    res.json({ status: "success", message: "Admin registered successfully!" });
  } catch (error) {
    console.error("Error during admin registration:", error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});

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

app.post("/tasks/add", authenticateToken, async (req, res) => {
  const { description, category, deadline, budget } = req.body;
  try {
    const task = new Task({
      ClientId: req.user.userId,
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
    const tasks = await Task.find()
      .populate("ClientId", "username")
      .populate("freelancerId", "username");
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks", error });
  }
});

app.delete("/tasks/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await Task.findByIdAndDelete(id);
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task", error });
  }
});

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

app.get("/tasks/accepted", async (req, res) => {
  try {
    const tasks = await Task.find({ status: "accepted" }).populate("ClientId", "username _id");
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching accepted tasks", error });
  }
});

app.put("/tasks/confirm/:id", async (req, res) => {
  try {
    const taskId = req.params.id;
    const token = req.headers.authorization?.split(' ')[1]; // Extract Bearer token
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Decode token to get freelancerId
    let freelancerId;
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      freelancerId = decoded.userId; // Matches the token structure from SignIn
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    if (!freelancerId) {
      return res.status(401).json({ message: "Freelancer ID not found in token" });
    }

    const task = await Task.findById(taskId).populate("ClientId", "username");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status !== "accepted") {
      return res.status(400).json({ message: "Task is not in accepted state" });
    }

    // Update task with freelancerId and confirmation
    task.freelancerConfirmation = "confirmed";
    task.freelancerId = freelancerId;
    await task.save();

    res.status(200).json({ message: "Task confirmed by freelancer", task });
  } catch (error) {
    console.error("Error confirming task:", error);
    res.status(500).json({ message: "Error confirming task", error: error.message });
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
    const token = req.headers.authorization?.split(' ')[1]; // Extract Bearer token
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Decode token to get freelancerId
    let freelancerId;
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      freelancerId = decoded.userId; // Matches the token structure from SignIn
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    if (!freelancerId) {
      return res.status(401).json({ message: "Freelancer ID not found in token" });
    }

    const task = await Task.findOne({ freelancerId, freelancerConfirmation: "confirmed" })
      .sort({ createdAt: -1 }) // Sort by createdAt descending (most recent first)
      .populate("ClientId", "username");

    if (!task) {
      return res.status(404).json({ message: "No confirmed tasks found for this freelancer" });
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
    res.status(500).json({ message: "Error fetching current work", error: error.message });
  }
});


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



app.post('/api/predict', async (req, res) => {
  try {
      // Extract category and skill from the request body (changed from task_description)
      const { category, skill } = req.body;

      // Validate inputs
      if (!category || !skill) {
          return res.status(400).json({ error: 'Please provide both category and skill' });
      }

      // Make request to Flask API with updated input fields
      const flaskResponse = await axios.post('http://localhost:5000/predict', {
          category,
          skill
      });

      // Send Flask API response back to the client
      res.json(flaskResponse.data);
  } catch (error) {
      console.error('Error communicating with Flask API:', error.message);
      res.status(500).json({ error: 'Failed to get prediction from Flask API' });
  }
});

// Get Confirmed Tasks for a Specific Client
app.get("/tasks/client-confirmed", authenticateToken, async (req, res) => {
  try {
    const clientId = req.user.userId; // From JWT token
    const tasks = await Task.find({
      ClientId: clientId,
      freelancerConfirmation: "confirmed",
    }).populate("ClientId", "username").populate("freelancerId", "username");

    if (!tasks.length) {
      return res.status(404).json({ message: "No confirmed tasks found for this client" });
    }

    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching client confirmed tasks:", error);
    res.status(500).json({ message: "Error fetching confirmed tasks", error: error.message });
  }
});

// Mark Task as Half Payment Done
app.get("/tasks/client-confirmed", authenticateToken, async (req, res) => {
  try {
    const clientId = req.user.userId;
    const tasks = await Task.find({ ClientId: clientId, freelancerConfirmation: "confirmed" })
      .populate("ClientId", "username")
      .populate("freelancerId", "username");
    if (!tasks.length) return res.status(404).json({ message: "No confirmed tasks found" });
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching confirmed tasks", error: error.message });
  }
});

app.put("/tasks/half-payment/:id", authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const clientId = req.user.userId;
    const task = await Task.findOne({ _id: taskId, ClientId: clientId });
    if (!task) return res.status(404).json({ message: "Task not found or you don’t own it" });
    if (task.freelancerConfirmation !== "confirmed") return res.status(400).json({ message: "Task not confirmed" });
    if (task.paymentStatus === "half paid" || task.paymentStatus === "fully paid") return res.status(400).json({ message: "Payment already processed" });

    task.paymentStatus = "half paid";
    task.halfPaidAt = new Date();
    await task.save();
    res.status(200).json({ message: "Half payment marked successfully", task });
  } catch (error) {
    res.status(500).json({ message: "Error marking half payment", error: error.message });
  }
});

app.put("/tasks/full-payment/:id", authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const clientId = req.user.userId;
    const { rating } = req.body; // Expect rating with final payment

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating (1-5) is required for final payment" });
    }

    const task = await Task.findOne({ _id: taskId, ClientId: clientId });
    if (!task) return res.status(404).json({ message: "Task not found or you don’t own it" });
    if (task.paymentStatus === "fully paid") return res.status(400).json({ message: "Payment already fully completed" });
    if (!task.submission) return res.status(400).json({ message: "Task not completed by freelancer" });

    task.paymentStatus = "fully paid";
    task.fullyPaidAt = new Date();
    task.rating = rating;
    await task.save();

    // Award reward points to freelancer (e.g., 10 points per rating star)
    const freelancer = await usermodel.findById(task.freelancerId);
    if (freelancer) {
      freelancer.rewardPoints = (freelancer.rewardPoints || 0) + (rating * 10);
      await freelancer.save();
    }

    res.status(200).json({ message: "Full payment marked successfully and freelancer rated", task });
  } catch (error) {
    res.status(500).json({ message: "Error marking full payment", error: error.message });
  }
});


app.put("/tasks/submit/:id", authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const freelancerId = req.user.userId;
    const { submission } = req.body;

    if (!submission) return res.status(400).json({ message: "Submission link is required" });

    const task = await Task.findOne({ _id: taskId, freelancerId });
    if (!task) return res.status(404).json({ message: "Task not found or not assigned to you" });
    if (task.submission) return res.status(400).json({ message: "Work already submitted" });
    if (task.paymentStatus !== "half paid") return res.status(400).json({ message: "Half payment not received" });

    task.submission = submission; // Store the link as a string
    await task.save();
    res.status(200).json({ message: "Work submitted successfully", task });
  } catch (error) {
    console.error("Error submitting work:", error);
    res.status(500).json({ message: "Error submitting work", error: error.message });
  }
});


app.post("/users/redeem-points", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { pointsToRedeem } = req.body;

    if (!pointsToRedeem || pointsToRedeem <= 0) {
      return res.status(400).json({ message: "Invalid points amount" });
    }

    const user = await usermodel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.rewardPoints < pointsToRedeem) {
      return res.status(400).json({ message: "Insufficient reward points" });
    }

    const cashValue = pointsToRedeem / 10;
    user.rewardPoints -= pointsToRedeem;
    await user.save();

    // Save redemption history (taskId optional, could be null if not tied to a specific task)
    const redemption = new Redemption({
      userId,
      pointsRedeemed: pointsToRedeem,
      cashValue,
    });
    await redemption.save();

    res.status(200).json({
      message: `Redeemed ${pointsToRedeem} points for $${cashValue}`,
      remainingPoints: user.rewardPoints
    });
  } catch (error) {
    console.error("Error redeeming points:", error);
    res.status(500).json({ message: "Error redeeming points", error: error.message });
  }
});

app.get("/redemptions", async (req, res) => {
  try {
    const redemptions = await Redemption.find()
      .populate("userId", "username") // Freelancer username
      .populate({
        path: "taskId",
        populate: [
          { path: "ClientId", select: "username" }, // Client username
          { path: "freelancerId", select: "username" } // Freelancer username (redundant but for clarity)
        ]
      });
    res.status(200).json(redemptions);
  } catch (error) {
    console.error("Error fetching redemptions:", error);
    res.status(500).json({ message: "Error fetching redemptions", error: error.message });
  }
});



const port = 3030;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});