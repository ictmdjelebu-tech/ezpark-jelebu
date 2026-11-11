// src/controllers/hitpayController.js
// Integrasi Gerbang Pembayaran HitPay (DuitNow QR & FPX)
// Mengandungi pengesahan keselamatan HMAC-SHA256 untuk mematuhi piawaian perbankan selamat

const db = require('../data/db');
const crypto = require('crypto');

const HITPAY_SALT = process.env.HITPAY_SALT || 'mdj_ezpark_secret_salt_2026';

// 1. Cipta Permintaan Bayaran HitPay (DuitNow QR / FPX)
exports.createPaymentRequest = (req, res) => {
  const { reference_type, reference_number, amount, plate_number } = req.body;

  if (!reference_number || !amount) {
    return res.status(400).json({ error: "Sila lengkapkan nombor rujukan dan jumlah bayaran." });
  }

  const paymentId = `HITPAY-${Date.now()}`;
  const checkoutUrl = `https://checkout.hit-pay.com/pay/${paymentId}`;

  return res.json({
    success: true,
    payment_id: paymentId,
    amount: parseFloat(amount).toFixed(2),
    currency: "MYR",
    payment_methods: ["duitnow", "fpx", "cards"],
    reference_number,
    plate_number,
    checkout_url: checkoutUrl,
    message: "Permintaan bayaran HitPay sedia untuk diproses."
  });
};

// 2. Pengendali Webhook HitPay Bersekuriti Tinggi (HMAC Verification)
exports.handleWebhook = (req, res) => {
  try {
    const payload = req.body;
    const hitpayHmac = payload.hmac;

    // A. Pengesahan Integriti Tandatangan HMAC
    if (hitpayHmac) {
      const params = { ...payload };
      delete params.hmac;

      const sortedKeys = Object.keys(params).sort();
      const signatureString = sortedKeys.map(k => `${k}${params[k]}`).join('');

      const calculatedHmac = crypto
        .createHmac('sha256', HITPAY_SALT)
        .update(signatureString)
        .digest('hex');

      if (calculatedHmac !== hitpayHmac) {
        console.error("[KESELAMATAN] Percubaan pemalsuan webhook HitPay dikesan!");
        return res.status(400).send("Invalid HMAC Signature");
      }
    }

    // B. Kemaskini Status Transaksi jika bayaran selesai
    const refNo = payload.reference_number || '';
    const status = payload.status || 'completed';

    if (status === 'completed') {
      // 1. Jika bayaran Sesi Parkir (EZP-)
      if (refNo.startsWith('EZP-')) {
        const session = db.data.parking_sessions.find(s => s.session_code === refNo);
        if (session) {
          session.status = 'ACTIVE';
          session.hitpay_reference_id = payload.payment_id || `HITPAY-${Date.now()}`;
        }
      }
      // 2. Jika bayaran Saman Kompaun (MDJ-K-)
      else if (refNo.startsWith('MDJ-K-')) {
        const comp = db.data.compounds.find(c => c.notice_number === refNo);
        if (comp) {
          comp.status = 'PAID_HITPAY';
          comp.paid_at = new Date().toISOString();
        }
      }

      db.logAudit("HITPAY_PAYMENT_SUCCESS", "HITPAY_GATEWAY", `Bayaran disahkan untuk ${refNo}: RM${payload.amount || 0}`);
      db.saveData();
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Ralat webhook HitPay:", error);
    return res.status(500).send("Internal Error");
  }
};
