// src/controllers/parkingController.js
const db = require('../data/db');
const crypto = require('crypto');

exports.checkActiveParking = (req, res) => {
  const plate = (req.params.plate || '').toUpperCase().replace(/\s+/g, '');
  const now = new Date();

  // Cari sesi aktif yang sepadan dengan nombor plat
  const activeSession = db.data.parking_sessions.find(session => {
    const sessionPlate = session.plate_number.replace(/\s+/g, '');
    const endTime = new Date(session.end_time);
    return sessionPlate === plate && session.status === 'ACTIVE' && endTime > now;
  });

  if (activeSession) {
    const endTime = new Date(activeSession.end_time);
    const remainingMinutes = Math.max(0, Math.round((endTime - now) / 60000));

    return res.json({
      status: 'VALID',
      is_valid: true,
      plate_number: activeSession.plate_number,
      zone_code: activeSession.zone_code,
      remaining_minutes: remainingMinutes,
      expires_at: activeSession.end_time,
      session_code: activeSession.session_code,
      message: `PARKING SAH: Baki masa ${remainingMinutes} minit.`
    });
  }

  // Jika tiada rekod atau telah tamat
  return res.json({
    status: 'EXPIRED_OR_NONE',
    is_valid: false,
    plate_number: plate,
    message: `TIADA BAYARAN SAH: Tiada rekod sesi aktif untuk kenderaan ${plate}.`
  });
};

exports.startParking = (req, res) => {
  const { plate_number, zone_code, duration_minutes, brand, model, color } = req.body;

  if (!plate_number || !zone_code || !duration_minutes) {
    return res.status(400).json({ error: "Sila lengkapkan no plat, zon, dan tempoh masa." });
  }

  const zone = db.data.zones.find(z => z.zone_code === zone_code);
  if (!zone) {
    return res.status(404).json({ error: "Zon letak kereta tidak sah." });
  }

  // Kiraan kadar bayaran
  const hours = duration_minutes / 60;
  const totalAmount = Math.max(0.30, +(hours * zone.rate_first_hour).toFixed(2));

  const sessionCode = `EZP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  const now = new Date();
  const endTime = new Date(now.getTime() + duration_minutes * 60000);

  const newSession = {
    id: `ses-${Date.now()}`,
    session_code: sessionCode,
    plate_number: plate_number.toUpperCase(),
    zone_code: zone.zone_code,
    start_time: now.toISOString(),
    end_time: endTime.toISOString(),
    duration_minutes: +duration_minutes,
    total_amount: totalAmount,
    status: "ACTIVE", // Auto aktif selepas pengesahan bayaran
    hitpay_reference_id: `HITPAY-SIM-${Date.now()}`
  };

  db.data.parking_sessions.unshift(newSession);

  // Simpan kenderaan jika baru
  const existingVeh = db.data.vehicles.find(v => v.plate_number === newSession.plate_number);
  if (!existingVeh && brand) {
    db.data.vehicles.push({
      id: `veh-${Date.now()}`,
      plate_number: newSession.plate_number,
      brand: brand || "Lain-lain",
      model: model || "Standard",
      color: color || "Tidak Dinyatakan",
      vehicle_type: "Saloon"
    });
  }

  db.logAudit("START_PARKING", "DRIVER", `Sesi parkir dimulakan: ${sessionCode} (${newSession.plate_number}) - RM${totalAmount}`);
  db.saveData();

  return res.json({
    success: true,
    message: "Sesi parkir berjaya diaktifkan!",
    session: newSession
  });
};

exports.extendParking = (req, res) => {
  const { session_code, additional_minutes } = req.body;
  const session = db.data.parking_sessions.find(s => s.session_code === session_code);

  if (!session) {
    return res.status(404).json({ error: "Sesi parkir tidak dijumpai." });
  }

  const currentEnd = new Date(session.end_time);
  const newEnd = new Date(currentEnd.getTime() + additional_minutes * 60000);
  session.end_time = newEnd.toISOString();
  session.duration_minutes += +additional_minutes;

  db.logAudit("EXTEND_PARKING", "DRIVER", `Sesi ${session_code} dilanjutkan sebanyak ${additional_minutes} minit.`);
  db.saveData();

  return res.json({
    success: true,
    message: `Masa parkir berjaya dilanjutkan sehingga ${newEnd.toLocaleTimeString()}!`,
    session
  });
};
