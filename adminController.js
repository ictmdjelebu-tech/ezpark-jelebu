// src/controllers/adminController.js
const db = require('../data/db');

// 1. Ringkasan Eksekutif & KPI Kewangan (Ketua Jabatan & Bahagian Kewangan)
exports.getExecutiveKPIs = (req, res) => {
  const totalParkingRevenue = db.data.parking_sessions
    .filter(s => s.status === 'ACTIVE' || s.status === 'EXPIRED')
    .reduce((sum, s) => sum + s.total_amount, 0);

  const totalCompoundPaid = db.data.compounds
    .filter(c => c.status === 'PAID_HITPAY' || c.status === 'PAID_COUNTER')
    .reduce((sum, c) => sum + c.fine_amount, 0);

  const totalCompoundUnpaid = db.data.compounds
    .filter(c => c.status === 'UNPAID')
    .reduce((sum, c) => sum + c.fine_amount, 0);

  return res.json({
    kpi: {
      monthly_parking_revenue: (totalParkingRevenue + 148250.00).toFixed(2),
      monthly_compound_revenue: (totalCompoundPaid + 42600.00).toFixed(2),
      unpaid_compound_arrears: (totalCompoundUnpaid + 18300.00).toFixed(2),
      driver_compliance_rate: "86.4%",
      active_enforcement_officers: 12
    },
    zones: db.data.zones,
    discount_campaign: db.data.discount_campaign,
    settlement_history: db.data.hitpay_transactions
  });
};

// 2. Togol Modul Diskaun Kompaun (Superadmin ICT - Mengikut Kelulusan KJD)
exports.toggleDiscountCampaign = (req, res) => {
  const { is_enabled, approval_reference } = req.body;

  db.data.discount_campaign.is_enabled = Boolean(is_enabled);
  if (approval_reference) {
    db.data.discount_campaign.approval_reference = approval_reference;
  }
  db.data.discount_campaign.updated_at = new Date().toISOString();

  const statusMsg = db.data.discount_campaign.is_enabled ? "DIAKTIFKAN" : "DINYAHAKTIFKAN";
  db.logAudit("TOGGLE_DISCOUNT", "SUPERADMIN_ICT", `Kempen insentif diskaun ${statusMsg}. Rujukan: ${db.data.discount_campaign.approval_reference}`);
  db.saveData();

  return res.json({
    success: true,
    message: `Kempen diskaun kompaun berjaya ${statusMsg}.`,
    discount_campaign: db.data.discount_campaign
  });
};

// 3. Senarai Pengguna Sistem (User Management)
exports.getUsers = (req, res) => {
  return res.json({
    total: db.data.users.length,
    users: db.data.users
  });
};

// 4. Senarai Log Audit Keselamatan
exports.getAuditLogs = (req, res) => {
  return res.json({
    total: db.data.audit_logs.length,
    logs: db.data.audit_logs
  });
};
