const express = require('express');
const sqlite3 = require('sqlite3').verbose();
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

// Database setup
const db = new sqlite3.Database('car_bazar.db');

// Initialize database
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Owners table
  db.run(`CREATE TABLE IF NOT EXISTS owners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    address TEXT,
    image_path TEXT,
    position TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Market info table
  db.run(`CREATE TABLE IF NOT EXISTS market_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    address TEXT NOT NULL,
    hours TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Cars table
  db.run(`CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price TEXT NOT NULL,
    image_path TEXT,
    posted_date TEXT,
    section TEXT DEFAULT 'home',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Initialize default superuser
  const defaultUsername = 'navratan suthar';
  const defaultPassword = 'Ns@1212ns';
  
  db.get('SELECT * FROM users WHERE username = ?', [defaultUsername], (err, row) => {
    if (!row) {
      const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
      db.run('INSERT INTO users (username, password) VALUES (?, ?)', [defaultUsername, hashedPassword], (err) => {
        if (err) {
          console.error('Error creating default user:', err);
        } else {
          console.log('Default superuser created');
        }
      });
    }
  });

  // Initialize default market info
  db.get('SELECT * FROM market_info WHERE id = 1', (err, row) => {
    if (!row) {
      db.run(`INSERT INTO market_info (id, title, address, hours) 
              VALUES (1, 'APNO Car Bazar - Main Market', 'BIKANER Road, Panch bhai chok, Near Maharana partap school', 'Open 10:00 AM - 8:00 PM, Monday to Sunday')`);
    }
  });

  // Initialize default owners
  db.get('SELECT * FROM owners WHERE position = ?', ['left'], (err, row) => {
    if (!row) {
      db.run(`INSERT INTO owners (name, contact, address, image_path, position) 
              VALUES ('SHIVA Suthar', '+919876543210', 'PATLISHAR BARA', 'shiva.jpg', 'left')`);
    }
  });

  db.get('SELECT * FROM owners WHERE position = ?', ['right'], (err, row) => {
    if (!row) {
      db.run(`INSERT INTO owners (name, contact, address, image_path, position) 
              VALUES ('Bhagu Suthar', '+919012345678', 'PATLISHAR BARA', 'bhagu.jpg', 'right')`);
    }
  });

  // Initialize default cars
  db.get('SELECT COUNT(*) as count FROM cars', (err, row) => {
    if (row && row.count === 0) {
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

      const stmt = db.prepare('INSERT INTO cars (title, description, price, image_path, posted_date, section) VALUES (?, ?, ?, ?, ?, ?)');
      defaultCars.forEach(car => {
        stmt.run(car.title, car.description, car.price, car.image_path, car.posted_date, car.section);
      });
      stmt.finalize();
    }
  });
});

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

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: user.username });
  });
});

// Public API routes
app.get('/api/market-info', (req, res) => {
  db.get('SELECT * FROM market_info WHERE id = 1', (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(row || {});
  });
});

app.get('/api/owners', (req, res) => {
  db.all('SELECT * FROM owners ORDER BY position', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.get('/api/cars', (req, res) => {
  const { section } = req.query;
  let query = 'SELECT * FROM cars';
  let params = [];

  if (section) {
    query += ' WHERE section = ?';
    params.push(section);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.get('/api/cars/:id', (req, res) => {
  db.get('SELECT * FROM cars WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Car not found' });
    }
    res.json(row);
  });
});

// Admin routes - Market Info
app.put('/api/admin/market-info', authenticateToken, (req, res) => {
  const { title, address, hours } = req.body;

  db.run(
    'UPDATE market_info SET title = ?, address = ?, hours = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
    [title, address, hours],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Market info updated successfully' });
    }
  );
});

// Admin routes - Owners
app.get('/api/admin/owners', authenticateToken, (req, res) => {
  db.all('SELECT * FROM owners ORDER BY position', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.put('/api/admin/owners/:id', authenticateToken, upload.single('image'), (req, res) => {
  const { name, contact, address } = req.body;
  let updateQuery = 'UPDATE owners SET name = ?, contact = ?, address = ?, updated_at = CURRENT_TIMESTAMP';
  let params = [name, contact, address];

  if (req.file) {
    // Delete old image if exists
    db.get('SELECT image_path FROM owners WHERE id = ?', [req.params.id], (err, owner) => {
      if (owner && owner.image_path && !owner.image_path.startsWith('http') && owner.image_path !== 'shiva.jpg' && owner.image_path !== 'bhagu.jpg') {
        const oldImagePath = path.join(__dirname, 'uploads', owner.image_path);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    });

    updateQuery += ', image_path = ?';
    params.push('/uploads/' + req.file.filename);
  }

  updateQuery += ' WHERE id = ?';
  params.push(req.params.id);

  db.run(updateQuery, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Owner updated successfully' });
  });
});

// Admin routes - Cars
app.get('/api/admin/cars', authenticateToken, (req, res) => {
  db.all('SELECT * FROM cars ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.post('/api/admin/cars', authenticateToken, upload.single('image'), (req, res) => {
  const { title, description, price, posted_date, section } = req.body;
  const image_path = req.file ? '/uploads/' + req.file.filename : null;

  if (!title || !price) {
    return res.status(400).json({ error: 'Title and price are required' });
  }

  db.run(
    'INSERT INTO cars (title, description, price, image_path, posted_date, section) VALUES (?, ?, ?, ?, ?, ?)',
    [title, description || '', price, image_path, posted_date || 'Just now', section || 'home'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Car created successfully', id: this.lastID });
    }
  );
});

app.put('/api/admin/cars/:id', authenticateToken, upload.single('image'), (req, res) => {
  const { title, description, price, posted_date, section } = req.body;
  let updateQuery = 'UPDATE cars SET title = ?, description = ?, price = ?, posted_date = ?, section = ?, updated_at = CURRENT_TIMESTAMP';
  let params = [title, description || '', price, posted_date, section || 'home'];

  if (req.file) {
    // Delete old image if exists and is local
    db.get('SELECT image_path FROM cars WHERE id = ?', [req.params.id], (err, car) => {
      if (car && car.image_path && car.image_path.startsWith('/uploads/')) {
        const oldImagePath = path.join(__dirname, car.image_path);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    });

    updateQuery += ', image_path = ?';
    params.push('/uploads/' + req.file.filename);
  }

  updateQuery += ' WHERE id = ?';
  params.push(req.params.id);

  db.run(updateQuery, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Car updated successfully' });
  });
});

app.delete('/api/admin/cars/:id', authenticateToken, (req, res) => {
  // Delete associated image
  db.get('SELECT image_path FROM cars WHERE id = ?', [req.params.id], (err, car) => {
    if (car && car.image_path && car.image_path.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, car.image_path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    db.run('DELETE FROM cars WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Car deleted successfully' });
    });
  });
});

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
