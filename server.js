// server.js - EZ Park Jelebu (Majlis Daerah Jelebu)
// Serasi dengan Render Cloud

const path = require('path');
const fs = require('fs');
const Module = require('module');

// 1. Modul Pintar: Selesaikan require secara automatik (Sama ada di root atau subfolder)
const originalRequire = Module.prototype.require;
Module.prototype.require = function(requestPath) {
  if (requestPath === '../data/db' || requestPath === './data/db') {
    try {
      return originalRequire.call(this, requestPath);
    } catch(e) {
      return originalRequire.call(this, path.join(__dirname, 'db.js'));
    }
  }
  if (requestPath.startsWith('./controllers/')) {
    try {
      return originalRequire.call(this, requestPath);
    } catch(e) {
      const flatName = requestPath.replace('./controllers/', '');
      return originalRequire.call(this, path.join(__dirname, flatName));
    }
  }
  return originalRequire.call(this, requestPath);
};

const express = require('express');
const cors = require('cors');

// Pengawal (Controllers)
const parkingController = require('./controllers/parkingController');
const compoundController = require('./controllers/compoundController');
const hitpayController = require('./controllers/hitpayController');
const adminController = require('./controllers/adminController');
const db = require('./data/db');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sajikan fail statik (HTML & Logo)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

function findHtmlFile(candidates) {
  for (const c of candidates) {
    const full = path.join(__dirname, c);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

// Laluan Aplikasi Pemandu (Driver App)
app.get(['/driver', '/driver/'], (req, res) => {
  const file = findHtmlFile(['public/driver/index.html', 'driver.html', 'index (1).html', 'driver/index.html']);
  if (file) return res.sendFile(file);
  return res.status(404).send("Aplikasi Pemandu tidak ditemui.");
});

// Laluan Aplikasi Penguatkuasa (Enforcer App)
app.get(['/enforcer', '/enforcer/'], (req, res) => {
  const file = findHtmlFile(['public/enforcer/index.html', 'enforcer.html', 'index (3).html', 'enforcer/index.html']);
  if (file) return res.sendFile(file);
  return res.status(404).send("Aplikasi Penguatkuasa tidak ditemui.");
});

// Laluan Utama (Dashboard MDJ)
app.get('/', (req, res) => {
  const file = findHtmlFile(['public/index.html', 'index.html']);
  if (file) return res.sendFile(file);
  return res.status(404).send("Papan Pemuka tidak ditemui.");
});

// ==========================================
// RESTFUL API ROUTES
// ==========================================
app.get('/api/v1/parking/check/:plate', parkingController.checkActiveParking);
app.post('/api/v1/parking/start', parkingController.startParking);
app.post('/api/v1/parking/extend', parkingController.extendParking);
app.get('/api/v1/zones', (req, res) => res.json(db.data.zones));
app.get('/api/v1/vehicles', (req, res) => res.json(db.data.vehicles));

app.post('/api/v1/compounds/issue', compoundController.issueCompound);
app.post('/api/v1/compounds/:notice_number/pay', compoundController.payCompound);
app.put('/api/v1/compounds/:notice_number/offender', compoundController.updateOffenderProfile);
app.get('/api/v1/compounds/search', compoundController.searchByPlate);
app.get('/api/v1/compounds', compoundController.listCompounds);
app.get('/api/v1/uuk/offenses', (req, res) => res.json(db.data.uuk_offenses));

app.post('/api/v1/hitpay/create-payment', hitpayController.createPaymentRequest);
app.post('/api/v1/hitpay/webhook', hitpayController.handleWebhook);

app.get('/api/v1/admin/kpis', adminController.getExecutiveKPIs);
app.post('/api/v1/admin/discount/toggle', adminController.toggleDiscountCampaign);
app.get('/api/v1/admin/users', adminController.getUsers);
app.post('/api/v1/auth/login', (req, res) => {
  const { username, password, role } = req.body;
  let user = db.data.users.find(u => u.email.toLowerCase().includes((username || '').toLowerCase()) || u.badge_number === username);
  if (!user && role) user = db.data.users.find(u => u.role === role);
  if (!user) user = db.data.users[0];
  return res.json({
    success: true,
    message: `Selamat kembali, ${user.full_name}`,
    user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, badge_number: user.badge_number, department: user.department }
  });
});
app.get('/api/v1/admin/audit-logs', adminController.getAuditLogs);
app.get('/api/v1/admin/receipt-settings', (req, res) => {
  return res.json(db.data.compound_receipt_settings || { paper_size: "58mm" });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Pelayan EZ Park - Jelebu kini BERJALAN di Port ${PORT} (Render Cloud)`);
});
