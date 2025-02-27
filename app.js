const Express = require("express");
const Mongoose = require("mongoose");
const Bcrypt = require("bcrypt");
const Cors = require("cors");
const jwt=require("jsonwebtoken")
const bodyParser = require('body-parser');
const { usermodel } = require('./models/User');
const { Admin } = require("./models/Admin");
const Task = require('./models/Task');



const app = Express();

app.use(Cors());
app.use(Express.json());
app.use(bodyParser.json());

Mongoose.connect('mongodb+srv://sreepriya:sreepriya73@cluster0.rwd5pdm.mongodb.net/virtuworkdb?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('MongoDB connection error:', error));

const generateHashedPassword = async (password) => {
    const salt = await Bcrypt.genSalt(10);
    return Bcrypt.hash(password, salt);
};

app.get("/", (req, res) => {
    res.send("hello");
});

// User Registration Route
app.post('/uregister', async (req, res) => {
    try {
        let input = req.body;

        // Log the input to see what is being received
        console.log("Received input:", input);

        // Check if password is present
        if (!input.password) {
            return res.status(400).json({ status: 'error', message: 'Password is required.' });
        }

        let hashedPassword = await generateHashedPassword(input.password);
        input.password = hashedPassword;

        let user = new usermodel(input);
        await user.save();
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ status: 'error', message: 'Registration failed', details: error.message });
    }
});
app.post("/signin", async (req, res) => {
    try {
        const { emailid, password } = req.body;

        // Check if the input fields are provided
        if (!emailid || !password) {
            return res.status(400).json({ status: "error", message: "Email and Password are required" });
        }

        // Find the user by email
        const user = await usermodel.findOne({ emailid });
        if (!user) {
            return res.status(404).json({ status: "error", message: "Email not found" });
        }

        // Compare the provided password with the hashed password in the database
        const isPasswordValid = await Bcrypt.compareSync(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ status: "error", message: "Incorrect password" });
        }

        // Generate a JWT token
        const token = jwt.sign(
            { emailid: user.emailid, role: user.role, userId: user._id },
            "VirtuworkApp", // Replace with a secure secret key in production
            { expiresIn: "1d" }
        );

        // Respond with the token and user details
        res.json({
            status: "success",
            token,
            userId: user._id,
            username: user.username,
            role: user.role
        });
    } catch (error) {
        console.error("Signin error:", error);
        res.status(500).json({ status: "error", message: "Signin failed", details: error.message });
    }
});

// Route to fetch user data by ID
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

  app.post('/admin/login', async (req, res) => {
    const { emailid, password } = req.body;
  
    try {
      // Find admin by email
      const admin = await Admin.findOne({ emailid });
      if (!admin) {
        return res.status(404).json({ status: 'error', message: 'Admin not found!' });
      }
  
      // Validate password
      const isPasswordValid = await Bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return res.status(401).json({ status: 'error', message: 'Invalid credentials!' });
      }
  
      // Generate JWT token
      const token = jwt.sign({ id: admin._id }, 'yourSecretKey', { expiresIn: '1h' });
  
      res.json({ status: 'success', token });
    } catch (error) {
      console.error('Error during admin login:', error);
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  });

  app.post('/admin/register', async (req, res) => {
    const { name, emailid, password } = req.body;
  
    try {
      // Check if email already exists
      const existingAdmin = await Admin.findOne({ emailid });
      if (existingAdmin) {
        return res.status(400).json({ status: 'error', message: 'Email already registered!' });
      }
  
      // Hash the password
      const hashedPassword = await Bcrypt.hash(password, 10);
  
      // Create new admin
      const newAdmin = new Admin({
        name,
        emailid,
        password: hashedPassword,
      });
  
      await newAdmin.save();
      res.json({ status: 'success', message: 'Admin registered successfully!' });
    } catch (error) {
      console.error('Error during admin registration:', error);
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  });

  app.get('/users', async (req, res) => {
    try {
        const { role } = req.query;

        // Validate role query parameter
        if (!role) {
            return res.status(400).json({ error: 'Role query parameter is required' });
        }

        // Find users with the specified role
        const freelancers = await usermodel.find({ role });
        res.status(200).json(freelancers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users', details: error.message });
    }
});


 
// Create Task
app.post('/tasks/add', async (req, res) => {
  const { description, category, deadline, budget } = req.body;
  try {
    const task = new Task({ description, category, deadline, budget });
    await task.save();
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    res.status(500).json({ message: 'Error creating task', error });
  }
});

// Get All Tasks
app.get('/tasks/all', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error });
  }
});



// Delete Task
app.delete('/tasks/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await Task.findByIdAndDelete(id);
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error });
  }
});

app.put('/tasks/accept/:id', async (req, res) => {
  
  try {
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { status: 'accepted' },
      { new: true }
    );
    res.status(200).json({ message: 'Task accepted successfully', updatedTask });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error accepting task', error });
  }
});





app.listen(3030, () => {
    console.log("Server started on port 3030");
});