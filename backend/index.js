const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
require('dotenv').config();
const db = require('./models'); // imports sequelize instance + models
const { authenticate, authorize } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

// Sync models with DB
db.sequelize.sync({ force: true }) // { force: true } drops tables first, { alter: true } updates tables
  .then(() => console.log('✅ Database & tables synced'))
  .catch(err => console.error('❌ Error syncing DB:', err));

// Default route
app.get('/', (req, res) => {
  res.send('Hello from Express + MySQL + Sequelize 🚀');
});

// Example: create a user
app.post('/users', async (req, res) => {
  try {
    const user = await db.User.create(req.body);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Example: get all ratings with user and store info
app.get('/ratings', async (req, res) => {
  try {
    const ratings = await db.Rating.findAll({
      include: [db.User, db.Store]
    });
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Signup for normal users
app.post('/auth/signup', [
  body('name').isLength({ min: 20, max: 60 }).withMessage('Name must be between 20 and 60 characters'),
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 8, max: 16 }).matches(/^(?=.*[A-Z])(?=.*[!@#$%^&*])/).withMessage('Password must be 8-16 characters with at least one uppercase letter and one special character'),
  body('address').optional().isLength({ max: 400 }).withMessage('Address must be less than 400 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, password, address } = req.body;
    const user = await db.User.create({ name, email, password, address, role: 'normal' });
    res.status(201).json({ message: 'User created successfully', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Login for all users
app.post('/auth/login', [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    const user = await db.User.findOne({ where: { email } });
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update password for all users
app.put('/auth/password', authenticate, [
  body('oldPassword').notEmpty().withMessage('Old password is required'),
  body('newPassword').isLength({ min: 8, max: 16 }).matches(/^(?=.*[A-Z])(?=.*[!@#$%^&*])/).withMessage('New password must be 8-16 characters with at least one uppercase letter and one special character')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { oldPassword, newPassword } = req.body;
    const user = await db.User.findByPk(req.user.id);
    if (!(await user.checkPassword(oldPassword))) {
      return res.status(400).json({ error: 'Old password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get stores for normal users
app.get('/stores', authenticate, authorize('normal'), async (req, res) => {
  try {
    const { name, address } = req.query;
    const where = {};
    if (name) where.name = { [db.Sequelize.Op.like]: `%${name}%` };
    if (address) where.address = { [db.Sequelize.Op.like]: `%${address}%` };

    const stores = await db.Store.findAll({
      where,
      include: [{
        model: db.Rating,
        attributes: []
      }],
      attributes: {
        include: [
          [db.Sequelize.fn('AVG', db.Sequelize.col('Ratings.rating')), 'overallRating']
        ]
      },
      group: ['Store.id']
    });

    // For each store, get user's rating
    const storesWithUserRating = await Promise.all(stores.map(async (store) => {
      const userRating = await db.Rating.findOne({
        where: { userId: req.user.id, storeId: store.id }
      });
      return {
        id: store.id,
        name: store.name,
        address: store.address,
        overallRating: store.dataValues.overallRating ? parseFloat(store.dataValues.overallRating).toFixed(1) : null,
        userRating: userRating ? userRating.rating : null
      };
    }));

    res.json(storesWithUserRating);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit or update rating for normal users
app.post('/ratings', authenticate, authorize('normal'), [
  body('storeId').isInt().withMessage('Store ID must be an integer'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { storeId, rating } = req.body;
    const userId = req.user.id;

    // Check if store exists
    const store = await db.Store.findByPk(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Upsert rating
    const [ratingInstance, created] = await db.Rating.upsert({
      userId,
      storeId,
      rating
    });

    res.json({ message: created ? 'Rating submitted' : 'Rating updated', rating: ratingInstance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Add user
app.post('/admin/users', authenticate, authorize('admin'), [
  body('name').isLength({ min: 20, max: 60 }).withMessage('Name must be between 20 and 60 characters'),
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 8, max: 16 }).matches(/^(?=.*[A-Z])(?=.*[!@#$%^&*])/).withMessage('Password must be 8-16 characters with at least one uppercase letter and one special character'),
  body('address').optional().isLength({ max: 400 }).withMessage('Address must be less than 400 characters'),
  body('role').isIn(['admin', 'normal', 'store_owner']).withMessage('Invalid role')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, password, address, role } = req.body;
    const user = await db.User.create({ name, email, password, address, role });
    res.status(201).json({ message: 'User created successfully', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Admin: Add store
app.post('/admin/stores', authenticate, authorize('admin'), [
  body('name').isLength({ min: 1, max: 60 }).withMessage('Name must be between 1 and 60 characters'),
  body('email').isEmail().withMessage('Invalid email'),
  body('address').optional().isLength({ max: 400 }).withMessage('Address must be less than 400 characters'),
  body('ownerId').optional().isInt().withMessage('Owner ID must be an integer')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, address, ownerId } = req.body;
    if (ownerId) {
      const owner = await db.User.findByPk(ownerId);
      if (!owner || owner.role !== 'store_owner') {
        return res.status(400).json({ error: 'Invalid owner ID' });
      }
    }
    const store = await db.Store.create({ name, email, address, ownerId });
    res.status(201).json({ message: 'Store created successfully', store });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Admin: Dashboard
app.get('/admin/dashboard', authenticate, authorize('admin'), async (req, res) => {
  try {
    const totalUsers = await db.User.count();
    const totalStores = await db.Store.count();
    const totalRatings = await db.Rating.count();
    res.json({ totalUsers, totalStores, totalRatings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: List users
app.get('/admin/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, email, address, role, sortBy = 'name', order = 'ASC' } = req.query;
    const where = {};
    if (name) where.name = { [db.Sequelize.Op.like]: `%${name}%` };
    if (email) where.email = { [db.Sequelize.Op.like]: `%${email}%` };
    if (address) where.address = { [db.Sequelize.Op.like]: `%${address}%` };
    if (role) where.role = role;

    const users = await db.User.findAll({
      where,
      order: [[sortBy, order.toUpperCase()]]
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: List stores
app.get('/admin/stores', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, email, address, sortBy = 'name', order = 'ASC' } = req.query;
    const where = {};
    if (name) where.name = { [db.Sequelize.Op.like]: `%${name}%` };
    if (email) where.email = { [db.Sequelize.Op.like]: `%${email}%` };
    if (address) where.address = { [db.Sequelize.Op.like]: `%${address}%` };

    const stores = await db.Store.findAll({
      where,
      include: [{
        model: db.Rating,
        attributes: []
      }],
      attributes: {
        include: [
          [db.Sequelize.fn('AVG', db.Sequelize.col('Ratings.rating')), 'rating']
        ]
      },
      group: ['Store.id'],
      order: [[sortBy, order.toUpperCase()]]
    });

    const storesWithRating = stores.map(store => ({
      id: store.id,
      name: store.name,
      email: store.email,
      address: store.address,
      rating: store.dataValues.rating ? parseFloat(store.dataValues.rating).toFixed(1) : null
    }));

    res.json(storesWithRating);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get user details
app.get('/admin/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await db.User.findByPk(userId, {
      include: [{
        model: db.Store,
        include: [{
          model: db.Rating,
          attributes: []
        }],
        attributes: {
          include: [
            [db.Sequelize.fn('AVG', db.Sequelize.col('Ratings.rating')), 'rating']
          ]
        }
      }]
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let response = {
      id: user.id,
      name: user.name,
      email: user.email,
      address: user.address,
      role: user.role
    };

    if (user.role === 'store_owner' && user.Stores.length > 0) {
      const store = user.Stores[0]; // Assuming one store per owner
      response.rating = store.dataValues.rating ? parseFloat(store.dataValues.rating).toFixed(1) : null;
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Store Owner: Dashboard
app.get('/store-owner/dashboard', authenticate, authorize('store_owner'), async (req, res) => {
  try {
    const store = await db.Store.findOne({
      where: { ownerId: req.user.id },
      include: [{
        model: db.Rating,
        include: [db.User]
      }]
    });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const ratings = store.Ratings.map(rating => ({
      id: rating.id,
      user: {
        id: rating.User.id,
        name: rating.User.name,
        email: rating.User.email
      },
      rating: rating.rating
    }));

    const averageRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1) : null;

    res.json({
      store: {
        id: store.id,
        name: store.name,
        email: store.email,
        address: store.address
      },
      ratings,
      averageRating
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
