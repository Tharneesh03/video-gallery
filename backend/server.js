// server.js for backend API (Express + MongoDB)
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://Tharneesh:23CSL266@videogallery.etn8x8t.mongodb.net/?retryWrites=true&w=majority&appName=VideoGallery';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

// Video Schema
const videoSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  duration: String,
  views: { type: Number, default: 0 },
  date: { type: String, default: () => new Date().toLocaleString() },
  likes: { type: Number, default: 0 },
  isLiked: { type: Boolean, default: false },
  thumbnail: String,
  videoUrl: String,
  uploader: String,
});
const Video = mongoose.model('Video', videoSchema);

// Password strength validation
function isStrongPassword(password) {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(password);
}

// Auth middleware
function auth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Signup
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'All fields required' });
  if (!isStrongPassword(password)) return res.status(400).json({ error: 'Password not strong enough' });
  const exists = await User.findOne({ username });
  if (exists) return res.status(400).json({ error: 'Username already exists' });
  const hash = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hash });
  await user.save();
  res.json({ message: 'Signup successful' });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, username });
});

// Get all videos for the logged-in user only
app.get('/api/videos', auth, async (req, res) => {
  const videos = await Video.find({ uploader: req.user.username }).sort({ _id: -1 });
  res.json(videos);
});

// Add video (metadata only)
app.post('/api/videos', auth, async (req, res) => {
  const video = new Video({ ...req.body, uploader: req.user.username });
  await video.save();
  res.json(video);
});

// Like/unlike video
app.post('/api/videos/:id/like', auth, async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ error: 'Not found' });
  video.isLiked = !video.isLiked;
  video.likes += video.isLiked ? 1 : -1;
  await video.save();
  res.json(video);
});

// Delete video
app.delete('/api/videos/:id', auth, async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ error: 'Not found' });
  if (video.uploader !== req.user.username) return res.status(403).json({ error: 'Forbidden' });
  await video.deleteOne();
  res.json({ message: 'Deleted' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));