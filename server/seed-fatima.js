require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedFatimaMalik() {
  try {
    console.log('Seeding Fatima Malik test scenario...');
    
    // 1. Create 3 Doctors
    const dHash = await bcrypt.hash('doctor123', 12);
    
    const docsData = [
      { name: 'Ali Khan', email: 'ali@test.com', clinic: 'City Care Clinic', spec: 'Cardiologist', phone: '03000000001' },
      { name: 'Sarah Ahmed', email: 'sarah@test.com', clinic: 'Family Health Center', spec: 'General Physician', phone: '03000000002' },
      { name: 'Zainab Tariq', email: 'zainab@test.com', clinic: 'Skin & Care', spec: 'Dermatologist', phone: '03000000003' }
    ];
    
    const doctorIds = [];
    for (const d of docsData) {
      // Clear out any existing if we are re-running
      await pool.query('DELETE FROM doctors WHERE email = $1', [d.email]);
      
      const res = await pool.query(
        `INSERT INTO doctors (name, email, password_hash, clinic_name, specialization, phone) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [d.name, d.email, dHash, d.clinic, d.spec, d.phone]
      );
      doctorIds.push(res.rows[0].id);
    }
    console.log('Created 3 doctors.');

    // 2. Create Patient "Fatima Malik" for all 3 doctors (same phone)
    const fatimaPhone = '03001231234';
    const pHash = await bcrypt.hash('fatima123', 12);
    
    // Clear old data for this phone just in case
    await pool.query('DELETE FROM patients WHERE phone = $1', [fatimaPhone]);

    const patientIds = [];
    for (let i = 0; i < 3; i++) {
      const res = await pool.query(
        `INSERT INTO patients (doctor_id, display_id, name, phone, age, gender, address, password_hash) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [doctorIds[i], `FM-${100+i}`, 'Fatima Malik', fatimaPhone, 28, 'Female', 'Lahore, Pakistan', pHash]
      );
      patientIds.push(res.rows[0].id);
    }
    console.log('Created Fatima Malik linked to 3 doctors.');

    // 3. Create Prescriptions (one from each doctor)
    // Doctor 1 (Cardiologist)
    let rx1 = await pool.query(
      `INSERT INTO prescriptions (doctor_id, patient_id, diagnosis, status, lab_tests) 
       VALUES ($1, $2, 'Mild Hypertension', 'issued', 'Lipid Profile, ECG') RETURNING id`,
      [doctorIds[0], patientIds[0]]
    );
    
    // Doctor 2 (General Physician)
    let rx2 = await pool.query(
      `INSERT INTO prescriptions (doctor_id, patient_id, diagnosis, status, next_visit_date) 
       VALUES ($1, $2, 'Viral Fever', 'dispensed', CURRENT_DATE + INTERVAL '7 days') RETURNING id`,
      [doctorIds[1], patientIds[1]]
    );

    // Doctor 3 (Dermatologist)
    let rx3 = await pool.query(
      `INSERT INTO prescriptions (doctor_id, patient_id, diagnosis, status) 
       VALUES ($1, $2, 'Acne Vulgaris', 'issued') RETURNING id`,
      [doctorIds[2], patientIds[2]]
    );
    console.log('Created 3 prescriptions.');

    // 4. Create Chat Messages with 2 Doctors (Dr. Ali and Dr. Sarah)
    const chats = [
      // Chat with Dr. Ali (Cardiologist)
      { pId: patientIds[0], dId: doctorIds[0], sender: 'patient', msg: 'Hello Dr. Ali, I took the ECG test today.' },
      { pId: patientIds[0], dId: doctorIds[0], sender: 'doctor', msg: 'Great! Please bring the reports tomorrow.' },
      
      // Chat with Dr. Sarah (General Physician)
      { pId: patientIds[1], dId: doctorIds[1], sender: 'doctor', msg: 'Hi Fatima, how is your fever today?' },
      { pId: patientIds[1], dId: doctorIds[1], sender: 'patient', msg: 'Much better, doctor. The medicine is helping.' },
      { pId: patientIds[1], dId: doctorIds[1], sender: 'patient', msg: 'Should I continue the antibiotics?' },
      { pId: patientIds[1], dId: doctorIds[1], sender: 'doctor', msg: 'Yes, complete the 5-day course.', unread: true }
    ];

    for (const c of chats) {
      await pool.query(
        `INSERT INTO chat_messages (patient_id, doctor_id, sender_type, message, is_read) 
         VALUES ($1, $2, $3, $4, $5)`,
        [c.pId, c.dId, c.sender, c.msg, !(c.unread === true)]
      );
    }
    console.log('Created chat messages with 2 doctors.');

    console.log('\\n\\n--- SUCCESS ---');
    console.log('Patient Login:');
    console.log('Phone: 03001231234');
    console.log('Password: fatima123');
    
  } catch(e) {
    console.error('Error seeding data:', e);
  } finally {
    process.exit(0);
  }
}

seedFatimaMalik();
