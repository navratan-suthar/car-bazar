const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryReady =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (!cloudinaryReady) {
  console.warn('[WARNING] Cloudinary env vars not set — image uploads will fail.');
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));   // allow base64 image payloads
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon')
    ? { rejectUnauthorized: false }
    : false,
});

// Lazy DB init — runs once per cold start
let dbInitialized = false;
async function initDB() {
  if (dbInitialized) return;
  dbInitialized = true;

  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS owners (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    address TEXT,
    image_path TEXT,
    position TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS market_info (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    address TEXT NOT NULL,
    hours TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS cars (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price TEXT NOT NULL,
    image_path TEXT,
    posted_date TEXT,
    section TEXT DEFAULT 'home',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed default superuser
  const defaultUsername = 'navratan suthar';
  const defaultPassword = 'Ns@1212ns';
  const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [defaultUsername]);
  if (userResult.rows.length === 0) {
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [defaultUsername, hashedPassword]);
  }

  // Seed default market info
  const marketResult = await pool.query('SELECT id FROM market_info LIMIT 1');
  if (marketResult.rows.length === 0) {
    await pool.query(
      `INSERT INTO market_info (title, address, hours) VALUES ($1, $2, $3)`,
      [
        'APNO Car Bazar - Main Market',
        'BIKANER Road, Panch bhai chok, Near Maharana partap school',
        'Open 10:00 AM - 8:00 PM, Monday to Sunday',
      ]
    );
  }

  // Seed default owners
  const leftOwner = await pool.query('SELECT id FROM owners WHERE position = $1', ['left']);
  if (leftOwner.rows.length === 0) {
    await pool.query(
      `INSERT INTO owners (name, contact, address, image_path, position) VALUES ($1, $2, $3, $4, $5)`,
      ['SHIVA Suthar', '+919876543210', 'PATLISHAR BARA', 'shiva.jpg', 'left']
    );
  }

  const rightOwner = await pool.query('SELECT id FROM owners WHERE position = $1', ['right']);
  if (rightOwner.rows.length === 0) {
    await pool.query(
      `INSERT INTO owners (name, contact, address, image_path, position) VALUES ($1, $2, $3, $4, $5)`,
      ['Bhagu Suthar', '+919012345678', 'PATLISHAR BARA', 'bhagu.jpg', 'right']
    );
  }

  // Seed default cars
  const carsCount = await pool.query('SELECT COUNT(*) AS count FROM cars');
  if (parseInt(carsCount.rows[0].count) === 0) {
    const defaultCars = [
      { title: 'i20 asta', description: 'Diesel • new tyre • Single Owner', price: '₹ 4.5 Lakh', image_path: 'iata.png', posted_date: '2 days ago', section: 'home' },
      { title: 'Maruti Swift 2019', description: 'Diesel • new tyre • Second Owner', price: '₹ 3.2 Lakh', image_path: 'honda.png', posted_date: '5 days ago', section: 'home' },
      { title: 'Hyundai Creta 2021', description: 'Petrol • 18,000 km • Single Owner', price: '₹ 14.5 Lakh', image_path: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop', posted_date: '1 day ago', section: 'home' },
      { title: 'Toyota Innova Crysta 2018', description: 'Diesel • 76,000 km • Second Owner', price: '₹ 15.2 Lakh', image_path: 'https://images.unsplash.com/photo-1549924231-f129b911e442?q=80&w=1200&auto=format&fit=crop', posted_date: '1 week ago', section: 'all' },
      { title: 'Tata Nexon 2022', description: 'Petrol • 12,500 km • Single Owner', price: '₹ 11.0 Lakh', image_path: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=1200&auto=format&fit=crop', posted_date: '3 days ago', section: 'all' },
      { title: 'Mahindra XUV500 2017', description: 'Diesel • 89,000 km • Second Owner', price: '₹ 9.0 Lakh', image_path: 'https://images.unsplash.com/photo-1493238792000-8113da705763?q=80&w=1200&auto=format&fit=crop', posted_date: '1 week ago', section: 'all' },
      { title: 'Hyundai i20 2020', description: 'Petrol • 22,000 km • Single Owner', price: '₹ 7.9 Lakh', image_path: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?q=80&w=1200&auto=format&fit=crop', posted_date: '4 days ago', section: 'all' },
      { title: 'Maruti Baleno 2019', description: 'Petrol • 39,000 km • Single Owner', price: '₹ 6.9 Lakh', image_path: 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?q=80&w=1200&auto=format&fit=crop', posted_date: '6 days ago', section: 'all' },
      { title: 'Kia Seltos 2021', description: 'Petrol • 19,000 km • Single Owner', price: '₹ 13.8 Lakh', image_path: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1200&auto=format&fit=crop', posted_date: '2 days ago', section: 'all' },
    ];
    for (const car of defaultCars) {
      await pool.query(
        'INSERT INTO cars (title, description, price, image_path, posted_date, section) VALUES ($1, $2, $3, $4, $5, $6)',
        [car.title, car.description, car.price, car.image_path, car.posted_date, car.section]
      );
    }
  }

  console.log('Database initialized');
}

// Ensure DB is ready on every cold start
app.use(async (req, res, next) => {
  try {
    await initDB();
    next();
  } catch (err) {
    console.error('DB init error:', err);
    res.status(500).json({ error: 'Database initialization failed: ' + err.message });
  }
});

// Helper: upload base64 image string to Cloudinary
async function uploadToCloudinary(base64Data) {
  if (!base64Data) return null;
  if (!cloudinaryReady) {
    throw new Error('Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to Vercel environment variables.');
  }
  const result = await cloudinary.uploader.upload(base64Data, {
    folder: 'car-bazar',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });
  return result.secure_url;
}

// Helper: delete image from Cloudinary by stored URL
async function deleteCloudinaryImage(imageUrl) {
  try {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;
    const matches = imageUrl.match(/\/car-bazar\/([^.]+)/);
    if (matches && matches[1]) {
      await cloudinary.uploader.destroy(`car-bazar/${matches[1]}`);
    }
  } catch (err) {
    console.error('Cloudinary delete error:', err);
  }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// ─── Auth Routes ─────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ─── Public API Routes ────────────────────────────────────────────────────────

app.get('/api/market-info', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM market_info LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/owners', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM owners ORDER BY position');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/cars', async (req, res) => {
  const { section } = req.query;
  try {
    const result = section
      ? await pool.query('SELECT * FROM cars WHERE section = $1 ORDER BY created_at DESC', [section])
      : await pool.query('SELECT * FROM cars ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/cars/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cars WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Car not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ─── Admin Routes — Market Info ───────────────────────────────────────────────

app.put('/api/admin/market-info', authenticateToken, async (req, res) => {
  const { title, address, hours } = req.body;
  try {
    await pool.query(
      'UPDATE market_info SET title = $1, address = $2, hours = $3, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [title, address, hours]
    );
    res.json({ message: 'Market info updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ─── Admin Routes — Owners ────────────────────────────────────────────────────

app.get('/api/admin/owners', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM owners ORDER BY position');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Accepts JSON body: { name, contact, address, imageData? }
// imageData is a base64 data URL string (e.g. "data:image/jpeg;base64,...")
app.put('/api/admin/owners/:id', authenticateToken, async (req, res) => {
  const { name, contact, address, imageData } = req.body;
  try {
    let image_path = null;
    if (imageData) {
      // Delete old Cloudinary image
      const old = await pool.query('SELECT image_path FROM owners WHERE id = $1', [req.params.id]);
      if (old.rows[0]) await deleteCloudinaryImage(old.rows[0].image_path);
      image_path = await uploadToCloudinary(imageData);
    }

    if (image_path) {
      await pool.query(
        'UPDATE owners SET name = $1, contact = $2, address = $3, image_path = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
        [name, contact, address, image_path, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE owners SET name = $1, contact = $2, address = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        [name, contact, address, req.params.id]
      );
    }
    res.json({ message: 'Owner updated successfully' });
  } catch (err) {
    console.error('Owner update error:', err);
    res.status(500).json({ error: err.message || 'Update failed' });
  }
});

// ─── Admin Routes — Cars ──────────────────────────────────────────────────────

app.get('/api/admin/cars', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cars ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Accepts JSON body: { title, description, price, posted_date, section, imageData? }
app.post('/api/admin/cars', authenticateToken, async (req, res) => {
  const { title, description, price, posted_date, section, imageData } = req.body;
  if (!title || !price) return res.status(400).json({ error: 'Title and price are required' });
  try {
    const image_path = imageData ? await uploadToCloudinary(imageData) : null;
    const result = await pool.query(
      'INSERT INTO cars (title, description, price, image_path, posted_date, section) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [title, description || '', price, image_path, posted_date || 'Just now', section || 'home']
    );
    res.json({ message: 'Car created successfully', id: result.rows[0].id });
  } catch (err) {
    console.error('Car create error:', err);
    res.status(500).json({ error: err.message || 'Failed to create car' });
  }
});

// Accepts JSON body: { title, description, price, posted_date, section, imageData? }
app.put('/api/admin/cars/:id', authenticateToken, async (req, res) => {
  const { title, description, price, posted_date, section, imageData } = req.body;
  try {
    let image_path = null;
    if (imageData) {
      // Delete old Cloudinary image
      const old = await pool.query('SELECT image_path FROM cars WHERE id = $1', [req.params.id]);
      if (old.rows[0]) await deleteCloudinaryImage(old.rows[0].image_path);
      image_path = await uploadToCloudinary(imageData);
    }

    if (image_path) {
      await pool.query(
        'UPDATE cars SET title = $1, description = $2, price = $3, posted_date = $4, section = $5, image_path = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7',
        [title, description || '', price, posted_date, section || 'home', image_path, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE cars SET title = $1, description = $2, price = $3, posted_date = $4, section = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6',
        [title, description || '', price, posted_date, section || 'home', req.params.id]
      );
    }
    res.json({ message: 'Car updated successfully' });
  } catch (err) {
    console.error('Car update error:', err);
    res.status(500).json({ error: err.message || 'Update failed' });
  }
});

app.delete('/api/admin/cars/:id', authenticateToken, async (req, res) => {
  try {
    const carResult = await pool.query('SELECT image_path FROM cars WHERE id = $1', [req.params.id]);
    if (carResult.rows[0]) await deleteCloudinaryImage(carResult.rows[0].image_path);
    await pool.query('DELETE FROM cars WHERE id = $1', [req.params.id]);
    res.json({ message: 'Car deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ─── Static Pages ─────────────────────────────────────────────────────────────

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ─── Global error handler ─────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Start (local dev only) ───────────────────────────────────────────────────

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  initDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Admin panel: http://localhost:${PORT}/admin`);
    });
  });
}

module.exports = app;
