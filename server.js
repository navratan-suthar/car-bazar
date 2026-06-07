const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize database tables and seed data
async function initDB() {
  try {
    // Users table
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Owners table
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

    // Market info table
    await pool.query(`CREATE TABLE IF NOT EXISTS market_info (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      address TEXT NOT NULL,
      hours TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Cars table
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
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [defaultUsername]);
    if (userResult.rows.length === 0) {
      const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
      await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [defaultUsername, hashedPassword]);
      console.log('Default superuser created');
    }

    // Seed default market info
    const marketResult = await pool.query('SELECT * FROM market_info LIMIT 1');
    if (marketResult.rows.length === 0) {
      await pool.query(
        `INSERT INTO market_info (title, address, hours) VALUES ($1, $2, $3)`,
        [
          'APNO Car Bazar - Main Market',
          'BIKANER Road, Panch bhai chok, Near Maharana partap school',
          'Open 10:00 AM - 8:00 PM, Monday to Sunday'
        ]
      );
    }

    // Seed default left owner
    const leftOwner = await pool.query('SELECT * FROM owners WHERE position = $1', ['left']);
    if (leftOwner.rows.length === 0) {
      await pool.query(
        `INSERT INTO owners (name, contact, address, image_path, position) VALUES ($1, $2, $3, $4, $5)`,
        ['SHIVA Suthar', '+919876543210', 'PATLISHAR BARA', 'shiva.jpg', 'left']
      );
    }

    // Seed default right owner
    const rightOwner = await pool.query('SELECT * FROM owners WHERE position = $1', ['right']);
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
        { title: 'Kia Seltos 2021', description: 'Petrol • 19,000 km • Single Owner', price: '₹ 13.8 Lakh', image_path: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1200&auto=format&fit=crop', posted_date: '2 days ago', section: 'all' }
      ];

      for (const car of defaultCars) {
        await pool.query(
          'INSERT INTO cars (title, description, price, image_path, posted_date, section) VALUES ($1, $2, $3, $4, $5, $6)',
          [car.title, car.description, car.price, car.image_path, car.posted_date, car.section]
        );
      }
    }

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
    process.exit(1);
  }
}

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ─── Auth Routes ─────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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
    let result;
    if (section) {
      result = await pool.query('SELECT * FROM cars WHERE section = $1 ORDER BY created_at DESC', [section]);
    } else {
      result = await pool.query('SELECT * FROM cars ORDER BY created_at DESC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/cars/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cars WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }
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

app.put('/api/admin/owners/:id', authenticateToken, upload.single('image'), async (req, res) => {
  const { name, contact, address } = req.body;
  try {
    if (req.file) {
      // Delete old image if it's a local upload (not default)
      const ownerResult = await pool.query('SELECT image_path FROM owners WHERE id = $1', [req.params.id]);
      const owner = ownerResult.rows[0];
      if (
        owner && owner.image_path &&
        !owner.image_path.startsWith('http') &&
        owner.image_path !== 'shiva.jpg' &&
        owner.image_path !== 'bhagu.jpg'
      ) {
        const oldImagePath = path.join(__dirname, 'uploads', owner.image_path);
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      }

      await pool.query(
        'UPDATE owners SET name = $1, contact = $2, address = $3, image_path = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
        [name, contact, address, '/uploads/' + req.file.filename, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE owners SET name = $1, contact = $2, address = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        [name, contact, address, req.params.id]
      );
    }
    res.json({ message: 'Owner updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
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

app.post('/api/admin/cars', authenticateToken, upload.single('image'), async (req, res) => {
  const { title, description, price, posted_date, section } = req.body;
  const image_path = req.file ? '/uploads/' + req.file.filename : null;

  if (!title || !price) {
    return res.status(400).json({ error: 'Title and price are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO cars (title, description, price, image_path, posted_date, section) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [title, description || '', price, image_path, posted_date || 'Just now', section || 'home']
    );
    res.json({ message: 'Car created successfully', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/admin/cars/:id', authenticateToken, upload.single('image'), async (req, res) => {
  const { title, description, price, posted_date, section } = req.body;

  try {
    if (req.file) {
      // Delete old local image if present
      const carResult = await pool.query('SELECT image_path FROM cars WHERE id = $1', [req.params.id]);
      const car = carResult.rows[0];
      if (car && car.image_path && car.image_path.startsWith('/uploads/')) {
        const oldImagePath = path.join(__dirname, car.image_path);
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      }

      await pool.query(
        'UPDATE cars SET title = $1, description = $2, price = $3, posted_date = $4, section = $5, image_path = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7',
        [title, description || '', price, posted_date, section || 'home', '/uploads/' + req.file.filename, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE cars SET title = $1, description = $2, price = $3, posted_date = $4, section = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6',
        [title, description || '', price, posted_date, section || 'home', req.params.id]
      );
    }
    res.json({ message: 'Car updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/admin/cars/:id', authenticateToken, async (req, res) => {
  try {
    // Delete associated local image
    const carResult = await pool.query('SELECT image_path FROM cars WHERE id = $1', [req.params.id]);
    const car = carResult.rows[0];
    if (car && car.image_path && car.image_path.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, car.image_path);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    await pool.query('DELETE FROM cars WHERE id = $1', [req.params.id]);
    res.json({ message: 'Car deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ─── Static Pages ─────────────────────────────────────────────────────────────

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Start Server ─────────────────────────────────────────────────────────────

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
  });
});
