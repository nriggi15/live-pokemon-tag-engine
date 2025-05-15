import express from 'express';
const router = express.Router();

// Home page
router.get('/', (req, res) => {
  res.render('index', { title: 'Home', page: 'index' });
});

// Dashboard / Account section
router.get('/explore', (req, res) => {
  res.render('explore', { page: 'explore' });
});

router.get('/dashboard', (req, res) => {
  res.render('dashboard', { page: 'dashboard' });
});

// Tag browsing page
router.get('/tags', (req, res) => {
  res.render('tags', { title: 'Browse Tags' });
});

// Bottom Navigation Bar Test Page
router.get('/bottom-nav-test', (req, res) => {
    res.render('bottom-nav-test', {
        title: 'Bottom Nav Test',
        page: 'bottom-test',
        isLoggedIn: !!req.session.userId,
        role: req.session.role || null
    });
});



export default router;

