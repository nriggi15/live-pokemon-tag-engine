import express from 'express';
const router = express.Router();

// Home page
router.get('/', (req, res) => {
  res.render('index', { title: 'Home', page: 'index' });
});

// Dashboard / Account section
router.get('/dashboard', (req, res) => {
  res.render('dashboard', { title: 'Dashboard' });
});

// Explore page
router.get('/explore', (req, res) => {
  res.render('explore', { title: 'Explore Cards' });
});

// Tag browsing page
router.get('/tags', (req, res) => {
  res.render('tags', { title: 'Browse Tags' });
});

// Bottom Navigation Bar Test Page
router.get('/bottom-nav-test', (req, res) => {
  res.render('bottom-nav-test', { title: 'Bottom Nav Test' });
});

export default router;
