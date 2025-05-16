import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', {
    isLoggedIn: !!req.session.userId,
    role: req.session.role || 'guest',
    page: 'index'
  });
});


// Dashboard / Account section
router.get('/explore', (req, res) => {
  const isLoggedIn = !!req.session.userId;
  const role = req.session.role || 'guest';

  res.render('explore', {
    page: 'explore',
    isLoggedIn,
    role
  });
});


router.get('/leaderboards', (req, res) => {
  res.render('leaderboards', { 
    isLoggedIn: req.session.userId,
    role: req.session.role
  });
});


router.get('/dashboard', (req, res) => {
  res.render('dashboard', {
    page: 'dashboard',  // ✅ Add this
    isLoggedIn: !!req.session.userId,
    role: req.session.role || 'guest'
  });
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

//tagging-center isLoggedIn for bottom nav
router.get('/tagging-center', (req, res) => {
  const isLoggedIn = !!req.session.userId;
  const role = req.session.role || null;

  res.render('tagging-center', {
    page: 'tagging-center',
    isLoggedIn,
    role
  });
});





export default router;

