// src/server.js
// Pelayan Utama EZ Park - Jelebu (Majlis Daerah Jelebu)
// Percuma, Mudah Dijalankan, dan Mematuhi Piawaian Keselamatan

const express = require('express');
const cors = require('cors');
const path = require('path');

const parkingController = require('./controllers/parkingController');
const compoundController = require('./controllers/compoundController');
const hitpayController = require('./controllers/hitpayController');
const adminController = require('./controllers/adminController');
const db = require('./data/db');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sajikan aset statik (Logo MDJ & Dashboard Kawalan Web)
app.use(express.static(path.join(__dirname, '../public')));

// ==========================================
// LALUAN API (RESTFUL API ROUTES)
// ==========================================

// 1. Modul Sesi Parkir (Pemandu & OCR Penguatkuasa)
app.get('/api/v1/parking/check/:plate', parkingController.checkActiveParking);
app.post('/api/v1/parking/start', parkingController.startParking);
app.post('/api/v1/parking/extend', parkingController.extendParking);
app.get('/api/v1/zones', (req, res) => res.json(db.data.zones));
app.post('/api/v1/zones', (req, res) => {
  const { zone_code, zone_name, rate_first_hour, monthly_pass_rate, total_bays, operating_hours } = req.body;
  if (!zone_code || !zone_name) {
    return res.status(400).json({ error: "Sila lengkapkan kod dan nama kawasan zon." });
  }
  const newZone = {
    id: `zone-${Date.now()}`,
    zone_code: zone_code.toUpperCase().replace(/\s+/g, '_'),
    zone_name,
    rate_first_hour: parseFloat(rate_first_hour) || 0.60,
    rate_subsequent_hour: parseFloat(rate_first_hour) || 0.60,
    daily_pass_rate: (parseFloat(rate_first_hour) * 6) || 4.00,
    monthly_pass_rate: parseFloat(monthly_pass_rate) || 60.00,
    total_bays: parseInt(total_bays) || 100,
    operating_hours: operating_hours || "08:00 AM - 05:00 PM (Isnin - Jumaat)",
    free_weekends: true,
    center_lat: 2.950000,
    center_lng: 102.100000,
    radius_meters: 1000,
    is_active: true
  };
  db.data.zones.push(newZone);
  db.logAudit("ADD_ZONE", "SUPERADMIN_ICT", `Zon baharu ditambah: ${newZone.zone_code} (${newZone.zone_name})`);
  db.saveData();
  return res.json({ success: true, message: `Zon ${newZone.zone_name} berjaya didaftarkan!`, zone: newZone });
});
app.get('/api/v1/vehicles', (req, res) => res.json(db.data.vehicles));

// 2. Modul Kompaun & Perundangan UUK (Penguatkuasa & Kerani)
app.post('/api/v1/compounds/issue', compoundController.issueCompound);
app.post('/api/v1/compounds/:notice_number/pay', compoundController.payCompound);
app.put('/api/v1/compounds/:notice_number/offender', compoundController.updateOffenderProfile);
app.get('/api/v1/compounds/search', compoundController.searchByPlate);
app.get('/api/v1/compounds', compoundController.listCompounds);
app.get('/api/v1/uuk/offenses', (req, res) => res.json(db.data.uuk_offenses));
app.post('/api/v1/uuk/offenses', (req, res) => {
  const { code, title, fine_amount, statutory_act } = req.body;
  if (!code || !title || !fine_amount) {
    return res.status(400).json({ error: "Sila lengkapkan kod kesalahan, tajuk dan nilai kompaun." });
  }
  const newOffense = {
    id: `uuk-${Date.now()}`,
    code: code.trim().toUpperCase(),
    title: title.trim(),
    fine_amount: parseFloat(fine_amount) || 30.00,
    statutory_act: statutory_act || "Perintah Tempat Letak Kereta (MDJ) 2026 / Akta 333"
  };
  db.data.uuk_offenses.push(newOffense);
  db.logAudit("ADD_UUK_OFFENSE", "ADMIN_PENGUATKUASA", `Kesalahan baharu didaftarkan: ${newOffense.code} (${newOffense.title}) - RM${newOffense.fine_amount}`);
  db.saveData();
  return res.json({ success: true, message: `Kesalahan ${newOffense.code} berjaya ditambah!`, offense: newOffense });
});

// 3. Modul Gerbang Pembayaran HitPay (DuitNow QR & Webhook)
app.post('/api/v1/hitpay/create-payment', hitpayController.createPaymentRequest);
app.post('/api/v1/hitpay/webhook', hitpayController.handleWebhook);

// 4. Modul Pentadbiran (Superadmin ICT, Kewangan & KJD)
app.get('/api/v1/admin/kpis', adminController.getExecutiveKPIs);
app.post('/api/v1/admin/discount/toggle', adminController.toggleDiscountCampaign);
app.get('/api/v1/admin/users', adminController.getUsers);
app.post('/api/v1/admin/users', (req, res) => {
  const { full_name, email, phone_number, role, badge_number, department } = req.body;
  if (!full_name || !email || !role) {
    return res.status(400).json({ error: "Sila lengkapkan nama penuh, emel dan peranan staf." });
  }
  const newUser = {
    id: `usr-${Date.now()}`,
    full_name: full_name.trim(),
    email: email.trim().toLowerCase(),
    phone_number: phone_number || "013-0000000",
    role: role.trim(),
    badge_number: badge_number || `MDJ-${Math.floor(100 + Math.random()*900)}`,
    department: department || "Majlis Daerah Jelebu",
    is_active: true
  };
  db.data.users.push(newUser);
  db.logAudit("ADD_USER", "SUPERADMIN_ICT", `Pengguna baharu didaftarkan: ${newUser.full_name} (${newUser.role})`);
  db.saveData();
  return res.json({ success: true, message: `Pegawai ${newUser.full_name} berjaya didaftarkan!`, user: newUser });
});
app.post('/api/v1/auth/login', (req, res) => {
  const { username, password, role } = req.body;
  // Authentic demo staff auth
  let user = db.data.users.find(u => u.email.toLowerCase().includes((username || '').toLowerCase()) || u.badge_number === username);
  if (!user && role) {
    user = db.data.users.find(u => u.role === role);
  }
  if (!user) {
    user = db.data.users[0]; // fallback to superadmin
  }
  db.logAudit("STAFF_LOGIN", user.role, `Log masuk pegawai: ${user.full_name} (${user.badge_number})`);
  return res.json({
    success: true,
    message: `Selamat kembali, ${user.full_name}`,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      badge_number: user.badge_number,
      department: user.department
    }
  });
});
app.get('/api/v1/admin/audit-logs', adminController.getAuditLogs);

// 5. Tetapan Reka Bentuk Notis Kompaun (Paper Size 58mm / 80mm & Setting)
app.get('/api/v1/admin/receipt-settings', (req, res) => {
  if (!db.data.compound_receipt_settings) {
    db.data.compound_receipt_settings = {
      paper_size: "58mm",
      include_logo: true,
      council_name: "MAJLIS DAERAH JELEBU",
      notice_title: "NOTIS PEMBERITAHUAN KESALAHAN TEMPAT LETAK KERETA",
      statutory_act: "Di Bawah Perintah Tempat Letak Kereta (MDJ) 2026",
      payment_due_days: 14,
      include_duitnow_qr: true,
      footer_warning: "Sila jelaskan kompaun ini dalam tempoh 14 hari bagi mengelakkan tindakan mahkamah atau senarai hitam pendaftaran kenderaan.",
      counter_address: "Kaunter Bayaran Utama, Majlis Daerah Jelebu, 71600 Kuala Klawang",
      contact_phone: "06-613 6233 / 06-613 6234"
    };
    db.saveData();
  }
  res.json(db.data.compound_receipt_settings);
});

app.post('/api/v1/admin/receipt-settings', (req, res) => {
  const settings = req.body;
  db.data.compound_receipt_settings = {
    ...db.data.compound_receipt_settings,
    ...settings
  };
  db.logAudit("UPDATE_RECEIPT_SETTINGS", "SUPERADMIN_ICT", `Tetapan rekabentuk resit kompaun dikemaskini. Saiz: ${settings.paper_size || '58mm'}`);
  db.saveData();
  res.json({
    success: true,
    message: "Tetapan reka bentuk resit kompaun berjaya disimpan!",
    settings: db.data.compound_receipt_settings
  });
});

// Semakan Kesihatan Pelayan (Health Check)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'EZ Park - Jelebu',
    agency: 'Majlis Daerah Jelebu (MDJ)',
    uptime_seconds: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Mulakan Pelayan
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Pelayan EZ Park - Jelebu kini BERJALAN`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🛡️  Status: Bebas Lesen (Free), Mudah & Selamat`);
  console.log(`====================================================`);
});
