// src/controllers/compoundController.js
const db = require('../data/db');
const crypto = require('crypto');

// 1. Pengeluaran Kompaun oleh Penguatkuasa (Bersama 3 Sudut Foto & Cop Perundangan)
exports.issueCompound = (req, res) => {
  const {
    plate_number,
    brand,
    model,
    color,
    zone_code,
    uuk_code,
    officer_badge,
    gps_lat,
    gps_lng,
    location_description
  } = req.body;

  if (!plate_number || !uuk_code) {
    return res.status(400).json({ error: "Sila lengkapkan nombor plat dan kod kesalahan UUK." });
  }

  const offense = db.data.uuk_offenses.find(o => o.code === uuk_code) || {
    code: uuk_code,
    title: "Kesalahan Tempat Letak Kereta",
    fine_amount: 30.00
  };

  const noticeNumber = `MDJ-K-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();
  const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 hari tempoh bayaran

  // Jana hash kriptografi Seksyen 90A Akta Keterangan untuk integriti bukti mahkamah
  const s90aHash = crypto
    .createHash('sha256')
    .update(`${noticeNumber}|${plate_number}|${now.toISOString()}|${gps_lat}|${gps_lng}`)
    .digest('hex');

  const newCompound = {
    id: `comp-${Date.now()}`,
    notice_number: noticeNumber,
    plate_number: plate_number.toUpperCase(),
    brand: brand || "Tidak Dinyatakan",
    model: model || "Tidak Dinyatakan",
    color: color || "Tidak Dinyatakan",
    zone_code: zone_code || "ZON_A",
    location_description: location_description || "Jalan Bandar, Kuala Klawang",
    uuk_code: offense.code,
    uuk_title: offense.title,
    fine_amount: offense.fine_amount,
    status: "UNPAID",
    officer_badge: officer_badge || "KOP-104",
    gps_lat: gps_lat || 2.938812,
    gps_lng: gps_lng || 102.071240,
    evidence_3_photos: {
      front_plate: `/uploads/evidence/${noticeNumber}_front.jpg`,
      windshield: `/uploads/evidence/${noticeNumber}_windshield.jpg`,
      rear_and_bay: `/uploads/evidence/${noticeNumber}_rear.jpg` // Sudut ke-3 belakang kereta & petak
    },
    s90a_cert_hash: s90aHash,
    issued_at: now.toISOString(),
    due_date: dueDate.toISOString(),
    offender_profile: null // Status awal: DATA TIDAK LENGKAP
  };

  db.data.compounds.unshift(newCompound);
  db.logAudit("ISSUE_COMPOUND", officer_badge || "ENFORCER", `Notis Kompaun dikeluarkan: ${noticeNumber} (${plate_number}) - ${offense.code}`);
  db.saveData();

  return res.json({
    success: true,
    message: `Notis kompaun ${noticeNumber} berjaya dijana dan sedia untuk dicetak.`,
    compound: newCompound
  });
};

// 2. Lengkapkan Maklumat Penerima Kompaun (Kerani Kaunter / Admin Saman)
exports.updateOffenderProfile = (req, res) => {
  const { notice_number } = req.params;
  const { full_name, ic_number, phone_number, mailing_address, data_source } = req.body;

  const compound = db.data.compounds.find(c => c.notice_number === notice_number);
  if (!compound) {
    return res.status(404).json({ error: "Notis kompaun tidak ditemui." });
  }

  if (!full_name || !ic_number || !mailing_address) {
    return res.status(400).json({ error: "Sila lengkapkan Nama Penuh, No. IC, dan Alamat Surat-Menyurat." });
  }

  compound.offender_profile = {
    full_name: full_name.toUpperCase(),
    ic_number: ic_number.trim(),
    phone_number: phone_number || "-",
    mailing_address: mailing_address.trim(),
    data_source: data_source || "COUNTER_PRESENCE",
    completed_at: new Date().toISOString()
  };

  db.logAudit("UPDATE_OFFENDER", "CLERK", `Maklumat penerima kompaun dikemas kini untuk notis: ${notice_number} (${full_name})`);
  db.saveData();

  return res.json({
    success: true,
    message: `Maklumat penerima bagi kompaun ${notice_number} berjaya disimpan. Rekod kini berstatus DATA LENGKAP.`,
    compound
  });
};

// 3. Carian Kompaun Mengikut Nombor Plat (Aplikasi Pemandu & Kaunter)
exports.searchByPlate = (req, res) => {
  const plate = (req.query.plate || '').toUpperCase().replace(/\s+/g, '');
  const results = db.data.compounds.filter(c => c.plate_number.replace(/\s+/g, '') === plate);

  return res.json({
    plate_number: plate,
    total_found: results.length,
    compounds: results
  });
};

// 4. Senarai Keseluruhan Kompaun (Dashboard Admin Penguatkuasa)
exports.listCompounds = (req, res) => {
  return res.json({
    total: db.data.compounds.length,
    compounds: db.data.compounds
  });
};

// 5. Pembayaran Kompaun Dalam Talian (Aplikasi Pemandu / DuitNow QR HitPay)
exports.payCompound = (req, res) => {
  const { notice_number } = req.params;
  const { payment_method } = req.body;

  const compound = db.data.compounds.find(c => c.notice_number === notice_number);
  if (!compound) {
    return res.status(404).json({ error: "Notis kompaun tidak ditemui." });
  }

  if (compound.status === 'PAID_HITPAY' || compound.status === 'PAID') {
    return res.status(400).json({ error: "Kompaun ini telah pun dijelaskan sebelum ini." });
  }

  compound.status = 'PAID_HITPAY';
  compound.paid_at = new Date().toISOString();
  compound.payment_method = payment_method || 'DUITNOW_QR_HITPAY';
  compound.hitpay_reference_id = `HITPAY-CMP-${Date.now()}`;

  db.logAudit("PAY_COMPOUND", "DRIVER_HITPAY", `Kompaun ${notice_number} (${compound.plate_number}) bernilai RM${compound.fine_amount} telah berjaya dibayar.`);
  db.saveData();

  return res.json({
    success: true,
    message: `Bayaran kompaun ${notice_number} berjaya disahkan!`,
    compound
  });
};
