// src/data/db.js
// Pangkalan Data Tempatan Berprestasi Tinggi untuk EZ Park - Jelebu
// Percuma (Tanpa kos lesen), Mudah (Zero-config), dan Selamat (In-Memory + Auto-Save JSON)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, 'ezpark_database.json');

// Struktur Data Asal Berwarta MDJ (Pre-seeded Data)
const initialData = {
  users: [
    {
      id: "usr-000",
      full_name: "Insp. Rosli bin Daud",
      email: "rosli.enforce@mdj.gov.my",
      phone_number: "019-2244881",
      role: "ENFORCEMENT_CHIEF",
      badge_number: "KOP-001",
      department: "Jabatan Penguatkuasaan & Keselamatan",
      is_active: true
    },
    {
      id: "usr-001",
      full_name: "Azlan bin Baharom",
      email: "azlan.ict@mdj.gov.my",
      phone_number: "019-3382910",
      role: "SUPERADMIN_ICT",
      badge_number: "ICT-01",
      department: "Bahagian Teknologi Maklumat",
      is_active: true
    },
    {
      id: "usr-002",
      full_name: "Zulkifli bin Ismail",
      email: "zulkifli.op@mdj.gov.my",
      phone_number: "013-4491022",
      role: "ENFORCEMENT_OFFICER",
      badge_number: "KOP-104",
      department: "Unit Operasi Penguatkuasaan",
      is_active: true
    },
    {
      id: "usr-003",
      full_name: "Siti Norhaliza binti Ramli",
      email: "norhaliza.saman@mdj.gov.my",
      phone_number: "017-8891230",
      role: "ENFORCEMENT_CLERK",
      badge_number: "ADM-012",
      department: "Kaunter Penguatkuasaan & Saman",
      is_active: true
    },
    {
      id: "usr-004",
      full_name: "Faridah binti Mansor",
      email: "faridah.kew@mdj.gov.my",
      phone_number: "012-7719283",
      role: "FINANCE_OFFICER",
      badge_number: "KEW-004",
      department: "Bahagian Perakaunan & Kewangan",
      is_active: true
    },
    {
      id: "usr-005",
      full_name: "Dato' Haji Kamaruddin bin Othman",
      email: "kjd@mdj.gov.my",
      phone_number: "019-2211990",
      role: "HEAD_OF_DEPARTMENT",
      badge_number: "KJD-01",
      department: "Pejabat Yang Dipertua MDJ",
      is_active: true
    }
  ],

  zones: [
    {
      id: "zone-a",
      zone_code: "ZON_A",
      zone_name: "Zon A - Pekan Kuala Klawang",
      rate_first_hour: 0.60,
      rate_subsequent_hour: 0.60,
      daily_pass_rate: 4.00,
      monthly_pass_rate: 60.00,
      total_bays: 420,
      operating_hours: "08:00 AM - 05:00 PM (Isnin - Jumaat)",
      free_weekends: true,
      center_lat: 2.938812,
      center_lng: 102.071240,
      radius_meters: 1500,
      is_active: true
    },
    {
      id: "zone-b",
      zone_code: "ZON_B",
      zone_name: "Zon B - Simpang Pertang & Titi",
      rate_first_hour: 0.40,
      rate_subsequent_hour: 0.40,
      daily_pass_rate: 3.00,
      monthly_pass_rate: 45.00,
      total_bays: 280,
      operating_hours: "08:00 AM - 05:00 PM (Isnin - Jumaat)",
      free_weekends: true,
      center_lat: 2.962104,
      center_lng: 102.215890,
      radius_meters: 1200,
      is_active: true
    },
    {
      id: "zone-khas",
      zone_code: "ZON_KHAS",
      zone_name: "Zon Khas - Hospital Jelebu & Stesen Bas",
      rate_first_hour: 0.80,
      rate_subsequent_hour: 0.80,
      daily_pass_rate: 6.00,
      monthly_pass_rate: 80.00,
      total_bays: 150,
      operating_hours: "Setiap Hari (Termasuk Hujung Minggu)",
      free_weekends: false,
      center_lat: 2.941098,
      center_lng: 102.083110,
      radius_meters: 800,
      is_active: true
    }
  ],

  uuk_offenses: [
    {
      id: "uuk-5",
      code: "UUK 5",
      title: "Meletak kenderaan tanpa membayar caj parkir sah",
      fine_amount: 30.00,
      statutory_act: "Perintah Tempat Letak Kereta (MDJ) 2026 / Akta 333"
    },
    {
      id: "uuk-8",
      code: "UUK 8",
      title: "Meletak kenderaan di luar garisan petak yang ditandakan",
      fine_amount: 50.00,
      statutory_act: "Perintah Tempat Letak Kereta (MDJ) 2026 / Akta 333"
    },
    {
      id: "uuk-10",
      code: "UUK 10",
      title: "Meletak kenderaan secara melintang atau melawan arah lalu lintas",
      fine_amount: 50.00,
      statutory_act: "Perintah Tempat Letak Kereta (MDJ) 2026 / Akta 333"
    },
    {
      id: "uuk-12",
      code: "UUK 12",
      title: "Meletak kenderaan di petak khas OKU tanpa pelekat sah",
      fine_amount: 100.00,
      statutory_act: "Perintah Tempat Letak Kereta (MDJ) 2026 / Akta 333"
    },
    {
      id: "uuk-15",
      code: "UUK 15",
      title: "Menghalang pili bomba, petak bomba atau laluan kecemasan",
      fine_amount: 100.00,
      statutory_act: "Perintah Tempat Letak Kereta (MDJ) 2026 / Akta 333"
    }
  ],

  vehicles: [
    {
      id: "veh-001",
      plate_number: "NDJ 8821",
      brand: "Proton",
      model: "Persona",
      color: "Hitam",
      vehicle_type: "Saloon",
      driver_name: "Pemandu Contoh MDJ"
    },
    {
      id: "veh-002",
      plate_number: "NDB 4210",
      brand: "Perodua",
      model: "Myvi",
      color: "Putih",
      vehicle_type: "Hatchback",
      driver_name: "Pemandu Contoh 2"
    }
  ],

  parking_sessions: [
    {
      id: "ses-101",
      session_code: "EZP-20261111-8891",
      plate_number: "NDJ 8821",
      zone_code: "ZON_A",
      start_time: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minit lepas
      end_time: new Date(Date.now() + 45 * 60 * 1000).toISOString(),   // baki 45 minit
      duration_minutes: 60,
      total_amount: 0.60,
      status: "ACTIVE",
      hitpay_reference_id: "HITPAY-PAY-77102"
    }
  ],

  compounds: [
    {
      id: "comp-001",
      notice_number: "MDJ-K-2026-9921",
      plate_number: "WYY 4091",
      brand: "Toyota",
      model: "Vios",
      color: "Perak",
      zone_code: "ZON_A",
      location_description: "Jalan Dato' Ombi, Petak No. 14, Pekan Kuala Klawang",
      uuk_code: "UUK 5",
      fine_amount: 30.00,
      status: "UNPAID",
      officer_id: "usr-002",
      officer_badge: "KOP-104",
      gps_lat: 2.938812,
      gps_lng: 102.071240,
      evidence_3_photos: {
        front_plate: "/uploads/evidence/9921_front.jpg",
        windshield: "/uploads/evidence/9921_windshield.jpg",
        rear_and_bay: "/uploads/evidence/9921_rear.jpg" // Sudut ke-3 belakang kereta & petak
      },
      s90a_cert_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      issued_at: "2026-11-11T10:25:00.000Z",
      due_date: "2026-11-25T10:25:00.000Z",
      offender_profile: null // Belum lengkap (hanya no plat di cermin)
    },
    {
      id: "comp-002",
      notice_number: "MDJ-K-2026-9880",
      plate_number: "NDJ 5512",
      brand: "Proton",
      model: "Saga",
      color: "Merah",
      zone_code: "ZON_B",
      location_description: "Pekan Titi, Petak No. 04",
      uuk_code: "UUK 8",
      fine_amount: 50.00,
      status: "PAID_HITPAY",
      officer_id: "usr-002",
      officer_badge: "KOP-104",
      gps_lat: 2.962104,
      gps_lng: 102.215890,
      evidence_3_photos: {
        front_plate: "/uploads/evidence/9880_front.jpg",
        windshield: "/uploads/evidence/9880_windshield.jpg",
        rear_and_bay: "/uploads/evidence/9880_rear.jpg"
      },
      s90a_cert_hash: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
      issued_at: "2026-11-10T14:15:00.000Z",
      due_date: "2026-11-24T14:15:00.000Z",
      offender_profile: {
        full_name: "MOHD FAIZAL BIN ABDULLAH",
        ic_number: "840512-05-5231",
        phone_number: "013-6821902",
        mailing_address: "No. 14, Taman Jelebu Indah, 71600 Kuala Klawang, Negeri Sembilan",
        data_source: "COUNTER_PRESENCE",
        completed_at: "2026-11-10T16:00:00.000Z"
      }
    }
  ],

  discount_campaign: {
    campaign_name: "Kempen Diskaun Awal Kompaun MDJ",
    is_enabled: false, // Dikekalkan FALSE mengikut arahan pengguna (perlu kelulusan KJD)
    phase1_hours: 24,
    phase1_percent: 70,
    phase2_days: 14,
    phase2_percent: 50,
    approval_reference: "MDJ/KJD/MESY-BIL.4/2026",
    updated_at: new Date().toISOString()
  },

  compound_receipt_settings: {
    paper_size: "58mm", // 58mm (standard poket) atau 80mm
    include_logo: true,
    council_name: "MAJLIS DAERAH JELEBU",
    notice_title: "NOTIS PEMBERITAHUAN KESALAHAN TEMPAT LETAK KERETA",
    statutory_act: "Di Bawah Perintah Tempat Letak Kereta (MDJ) 2026",
    payment_due_days: 14,
    include_duitnow_qr: true,
    footer_warning: "Sila jelaskan kompaun ini dalam tempoh 14 hari bagi mengelakkan tindakan mahkamah atau senarai hitam pendaftaran kenderaan.",
    counter_address: "Kaunter Bayaran Utama, Majlis Daerah Jelebu, 71600 Kuala Klawang",
    contact_phone: "06-613 6233 / 06-613 6234"
  },

  hitpay_transactions: [
    {
      id: "hit-001",
      transaction_id: "STL-HITPAY-88219",
      date: "2026-11-10",
      total_transactions: 640,
      parking_collection: 3840.00,
      compound_collection: 1200.00,
      gateway_fee: 50.40,
      net_amount: 4989.60,
      status: "SETTLED"
    }
  ],

  audit_logs: [
    {
      id: 1,
      action: "SYSTEM_INITIALIZE",
      user: "SYSTEM",
      details: "Sistem EZ Park - Jelebu dimulakan dengan konfigurasi warta MDJ.",
      timestamp: new Date().toISOString()
    }
  ]
};

// Pengurusan Muat Turun & Simpanan Data Tempatan
class DatabaseService {
  constructor() {
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed.users.find(u => u.email === 'rosli.enforce@mdj.gov.my')) {
          parsed.users.unshift(initialData.users[0]);
          fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf8');
        }
        return parsed;
      }
    } catch (e) {
      console.warn("Memulakan semula fail pangkalan data EZ Park...");
    }
    this.saveData(initialData);
    return initialData;
  }

  saveData(data = this.data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error("Ralat menyimpan pangkalan data:", e);
    }
  }

  logAudit(action, user, details) {
    const entry = {
      id: this.data.audit_logs.length + 1,
      action,
      user,
      details,
      timestamp: new Date().toISOString()
    };
    this.data.audit_logs.unshift(entry);
    this.saveData();
  }
}

const db = new DatabaseService();
module.exports = db;
