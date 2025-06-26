import React, { useState, useRef, useEffect } from 'react';
import './VideoGalleryApp.css';

// Helper functions
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const categories = [
  { key: 'all', label: 'All', icon: 'fa-globe' },
  { key: 'nature', label: 'Nature', icon: 'fa-mountain' },
  { key: 'travel', label: 'Travel', icon: 'fa-plane' },
  { key: 'tech', label: 'Tech', icon: 'fa-laptop' },
  { key: 'music', label: 'Music', icon: 'fa-music' },
];

function getInitials(name) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
}

const VIDEOS_PER_PAGE = 6;

const defaultVideoData = [];

function VideoGalleryApp() {
  // State
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
  const [password, setPassword] = useState('');
  const [videoData, setVideoData] = useState(defaultVideoData);
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('username') || '');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [playerVideo, setPlayerVideo] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupForm, setSignupForm] = useState({ username: '', password: '' });
  const [signupLoading, setSignupLoading] = useState(false);

  // Upload form refs
  const uploadFormRef = useRef();
  const fileInputRef = useRef();
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: '',
    description: '',
    file: null,
    fileName: 'No file selected',
  });

  // Filtered videos
  const filteredVideos = videoData.filter((video) => {
    const matchesCategory = category === 'all' || video.category === category;
    const matchesSearch =
      video.title.toLowerCase().includes(search) ||
      video.description.toLowerCase().includes(search);
    return matchesCategory && matchesSearch;
  });
  const totalPages = Math.ceil(filteredVideos.length / VIDEOS_PER_PAGE);
  const videosToShow = filteredVideos.slice((currentPage - 1) * VIDEOS_PER_PAGE, currentPage * VIDEOS_PER_PAGE);

  // Toast auto-hide
  useEffect(() => {
    if (toast.show) {
      const t = setTimeout(() => setToast({ ...toast, show: false }), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Fetch videos from backend
  const fetchVideos = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/videos', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setVideoData(data);
    } catch (err) {
      setToast({ show: true, message: 'Failed to load videos', type: 'error' });
    }
  };

  // Fetch videos after login
  useEffect(() => {
    if (isLoggedIn) {
      fetchVideos();
    }
  }, [isLoggedIn]);

  // Handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setToast({ show: true, message: 'Please enter both username and password', type: 'error' });
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setIsLoggedIn(true);
      setCurrentUser(data.username);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', data.username);
      localStorage.setItem('token', data.token);
      setToast({ show: true, message: `Welcome back, ${data.username}!`, type: 'success' });
    } catch (err) {
      setToast({ show: true, message: err.message, type: 'error' });
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser('');
    setUsername('');
    setPassword('');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    setToast({ show: true, message: 'You have been logged out', type: 'success' });
  };

  const handleUploadBtn = () => setShowUploadModal(true);
  const handleUploadModalClose = () => {
    setShowUploadModal(false);
    setUploadForm({ title: '', category: '', description: '', file: null, fileName: 'No file selected' });
    setUploading(false);
    setUploadProgress(0);
    if (uploadFormRef.current) uploadFormRef.current.reset();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setUploadForm((f) => ({ ...f, file, fileName: file ? file.name : 'No file selected' }));
  };

  // Generate thumbnail from video file
  const generateThumbnail = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      video.src = URL.createObjectURL(file);
      video.addEventListener('loadedmetadata', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.currentTime = video.duration * 0.25;
      });
      video.addEventListener('seeked', () => {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg');
        resolve(thumbnail);
        URL.revokeObjectURL(video.src);
      });
    });
  };

  // Get video duration
  const getVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.addEventListener('loadedmetadata', () => {
        const duration = video.duration;
        URL.revokeObjectURL(video.src);
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      });
    });
  };

  // Simulate upload progress
  const simulateUploadProgress = () => {
    setUploading(true);
    setUploadProgress(0);
    let progress = 0;
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
          progress = 100;
          setUploadProgress(progress);
          clearInterval(interval);
          setUploading(false);
          resolve();
        } else {
          setUploadProgress(progress);
        }
      }, 200);
    });
  };

  // Handle upload form submit
  const handleUpload = async (e) => {
    e.preventDefault();
    const { title, category: cat, description, file } = uploadForm;
    if (!title || !cat || !file) {
      setToast({ show: true, message: 'Please fill all required fields', type: 'error' });
      return;
    }
    try {
      await simulateUploadProgress();
      const videoUrl = URL.createObjectURL(file);
      const thumbnail = await generateThumbnail(file);
      const duration = await getVideoDuration(file);
      // Send to backend
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description: description || 'No description provided',
          category: cat,
          duration,
          thumbnail,
          videoUrl,
        }),
      });
      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error('Server error: Unexpected response. Please login again or check your connection.');
      }
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setVideoData((prev) => [data, ...prev]);
      setTimeout(() => {
        handleUploadModalClose();
        setCurrentPage(1);
        setToast({ show: true, message: 'Video uploaded successfully!', type: 'success' });
      }, 500);
    } catch (err) {
      setToast({ show: true, message: err.message || 'Error processing video', type: 'error' });
    }
  };

  // Signup handler
  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      setToast({ show: true, message: 'Signup successful! Please log in.', type: 'success' });
      setShowSignupModal(false);
      setSignupForm({ username: '', password: '' });
    } catch (err) {
      setToast({ show: true, message: err.message, type: 'error' });
    } finally {
      setSignupLoading(false);
    }
  };

  // Search
  const handleSearch = (e) => {
    setSearch(e.target.value.toLowerCase());
    setCurrentPage(1);
  };

  // Category filter
  const handleCategory = (cat) => {
    setCategory(cat);
    setCurrentPage(1);
  };

  // Pagination
  const goToPage = (page) => setCurrentPage(page);
  const goToPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goToNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  // Like
  const toggleLike = (id) => {
    setVideoData((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, isLiked: !v.isLiked, likes: v.isLiked ? v.likes - 1 : v.likes + 1 } : v
      )
    );
    const video = videoData.find((v) => v.id === id);
    setToast({ show: true, message: video && !video.isLiked ? 'Added to your favorites' : 'Removed from favorites', type: 'success' });
  };

  // Delete
  const deleteVideo = (id) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      setVideoData((prev) => prev.filter((v) => v.id !== id));
      setToast({ show: true, message: 'Video deleted successfully', type: 'success' });
    }
  };

  // Share
  const shareVideo = (video) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${video.title} - Watch this video on our platform!`);
      setToast({ show: true, message: 'Link copied to clipboard!', type: 'success' });
    }
  };

  // Video player modal
  const openPlayer = (video) => {
    setPlayerVideo(video);
    setShowPlayerModal(true);
  };
  const closePlayer = () => {
    setShowPlayerModal(false);
    setPlayerVideo(null);
  };

  // Video player controls
  const videoRef = useRef();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  useEffect(() => {
    if (!showPlayerModal) {
      setIsPlaying(false);
      setIsMuted(false);
    }
  }, [showPlayerModal]);
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };
  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };
  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // Render
  return (
    <div>
      {/* Login Page */}
      {!isLoggedIn && !showSignupModal && (
        <div className="login-container">
          <div className="login-box">
            <h2>Login to Video Gallery</h2>
            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label htmlFor="username">Username</label>
                <i className="fas fa-user"></i>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <i className="fas fa-lock"></i>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <div className="remember-forgot">
                <label>
                  <input type="checkbox" /> Remember me
                </label>
                <a href="#">Forgot password?</a>
              </div>
              <button type="submit" className="login-btn">Login</button>
              <div className="register-link">
                Don't have an account?{' '}
                <a href="#" onClick={e => { e.preventDefault(); setShowSignupModal(true); }}>
                  Register here
                </a>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {!isLoggedIn && showSignupModal && (
        <div className="login-container">
          <div className="login-box">
            <h2>Sign Up</h2>
            <form onSubmit={handleSignup}>
              <div className="input-group">
                <label htmlFor="signup-username">Username</label>
                <i className="fas fa-user"></i>
                <input
                  type="text"
                  id="signup-username"
                  value={signupForm.username}
                  onChange={e => setSignupForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="Enter your username"
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="signup-password">Password</label>
                <i className="fas fa-lock"></i>
                <input
                  type="password"
                  id="signup-password"
                  value={signupForm.password}
                  onChange={e => setSignupForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter a strong password"
                  required
                />
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                  Password must be at least 8 characters, include uppercase, lowercase, number, and special character.
                </div>
              </div>
              <button type="submit" className="login-btn" disabled={signupLoading}>
                {signupLoading ? 'Signing up...' : 'Sign Up'}
              </button>
              <div className="register-link">
                Already have an account?{' '}
                <a href="#" onClick={e => { e.preventDefault(); setShowSignupModal(false); }}>
                  Login here
                </a>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gallery Page */}
      {isLoggedIn && (
        <div className="gallery-page" style={{ display: 'block' }}>
          <div className="user-controls">
            <div className="user-info">
              <div className="user-avatar">{getInitials(currentUser)}</div>
              <span className="user-name">{currentUser}</span>
            </div>
            <div>
              <button className="upload-btn" onClick={handleUploadBtn}>
                <i className="fas fa-upload"></i> Upload
              </button>
              <button className="logout-btn" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </div>
          </div>

          <div className="gallery-container">
            <div className="gallery-header">
              <h1 className="gallery-title">Video Gallery</h1>
              <div className="search-filter">
                <div className="search-box">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Search videos..."
                    value={search}
                    onChange={handleSearch}
                  />
                </div>
                <div className="category-filter">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      className={category === cat.key ? 'active' : ''}
                      onClick={() => handleCategory(cat.key)}
                    >
                      <i className={`fas ${cat.icon}`}></i> {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="gallery">
              {videosToShow.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 50 }}>
                  <i className="fas fa-video-slash" style={{ fontSize: 48, color: '#ccc', marginBottom: 20 }}></i>
                  <h3>No videos found</h3>
                  <p>Try adjusting your search or filter criteria</p>
                </div>
              ) : (
                videosToShow.map((video) => (
                  <div className="video-card" key={video.id}>
                    <div className="video-thumbnail" onClick={() => openPlayer(video)}>
                      <img src={video.thumbnail} alt={video.title} />
                      <div className="play-icon">
                        <i className="fas fa-play"></i>
                      </div>
                    </div>
                    <div className="video-info">
                      <h3>{video.title}</h3>
                      <div className="video-meta">
                        <span><i className="fas fa-tag"></i> {video.category.charAt(0).toUpperCase() + video.category.slice(1)}</span>
                        <span><i className="fas fa-clock"></i> {video.duration}</span>
                      </div>
                      <p>{video.description}</p>
                      <div className="video-actions">
                        <button className={video.isLiked ? 'liked' : ''} onClick={() => toggleLike(video.id)}>
                          <i className="fas fa-heart"></i> {formatNumber(video.likes)}
                        </button>
                        <button onClick={() => shareVideo(video)}>
                          <i className="fas fa-share-alt"></i> Share
                        </button>
                        {video.uploader === currentUser && (
                          <button className="delete" onClick={() => deleteVideo(video.id)}>
                            <i className="fas fa-trash"></i> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            <div className="pagination">
              <button onClick={goToPrev} disabled={currentPage === 1}>
                <i className="fas fa-chevron-left"></i> Previous
              </button>
              <div>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    className={currentPage === i + 1 ? 'active' : ''}
                    onClick={() => goToPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button onClick={goToNext} disabled={currentPage === totalPages || totalPages === 0}>
                Next <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal" onClick={(e) => e.target.classList.contains('modal') && handleUploadModalClose()}>
          <div className="modal-content">
            <button className="modal-close" onClick={handleUploadModalClose}>
              <i className="fas fa-times"></i>
            </button>
            <h2 className="modal-title">Upload Video</h2>
            <form ref={uploadFormRef} className="upload-form" onSubmit={handleUpload}>
              <div className="form-group">
                <label htmlFor="videoTitle">Title</label>
                <input
                  type="text"
                  id="videoTitle"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Enter video title"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="videoCategory">Category</label>
                <select
                  id="videoCategory"
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm((f) => ({ ...f, category: e.target.value }))}
                  required
                >
                  <option value="">Select a category</option>
                  <option value="nature">Nature</option>
                  <option value="travel">Travel</option>
                  <option value="tech">Technology</option>
                  <option value="music">Music</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="videoDescription">Description</label>
                <textarea
                  id="videoDescription"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Enter video description"
                ></textarea>
              </div>
              <div className="form-group">
                <label>Video File</label>
                <div
                  className="file-upload"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{ pointerEvents: uploading ? 'none' : 'auto' }}
                >
                  <i className="fas fa-cloud-upload-alt"></i>
                  <p>Click to browse or drag and drop your video file</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="video/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    required
                  />
                  <div className="file-name">{uploadForm.fileName}</div>
                </div>
              </div>
              <div className="progress-container" style={{ display: uploading ? 'block' : 'none' }}>
                <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <button type="submit" className="submit-btn" disabled={uploading}>
                <i className="fas fa-upload"></i> Upload Video
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {showPlayerModal && playerVideo && (
        <div className="modal" onClick={(e) => e.target.classList.contains('modal') && closePlayer()}>
          <div className="modal-content" style={{ background: '#000', color: 'white', maxWidth: 800, padding: 0 }}>
            <button className="modal-close" onClick={closePlayer} style={{ color: 'white', zIndex: 100 }}>
              <i className="fas fa-times"></i>
            </button>
            <div className="video-container">
              <video
                ref={videoRef}
                src={playerVideo.videoUrl}
                controls
                autoPlay
                id="videoPlayer"
                style={{ background: 'black', width: '100%', display: 'block' }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onVolumeChange={() => setIsMuted(videoRef.current ? videoRef.current.muted : false)}
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="video-player-info">
              <h3>{playerVideo.title}</h3>
              <p>{playerVideo.description}</p>
              <div className="video-controls">
                <button className="play-pause" onClick={handlePlayPause}>
                  <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i> {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button className="mute" onClick={handleMute}>
                  <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i> {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button className="fullscreen" onClick={handleFullscreen}>
                  <i className="fas fa-expand"></i> Fullscreen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="toast" style={{ backgroundColor: toast.type === 'error' ? '#ff4757' : '#333' }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default VideoGalleryApp;
