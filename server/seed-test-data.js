require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function createTestData() {
  try {
    const dHash = await bcrypt.hash('doctor123', 12);
    const docRes = await pool.query(
      "INSERT INTO doctors (name, email, password_hash, clinic_name, specialization, phone) VALUES ('Test Doctor', 'doctor@test.com', $1, 'Test Clinic', 'General', '03000000000') ON CONFLICT (email) DO UPDATE SET password_hash = $1 RETURNING id",
      [dHash]
    );
    const doctorId = docRes.rows[0].id;
    console.log('Doctor created/updated:', doctorId);
    
    const pHash = await bcrypt.hash('patient123', 12);
    // Remove old patient with phone 03111111111 if exists to avoid clutter, or just update
    await pool.query("DELETE FROM patients WHERE phone = '03111111111'");
    const patRes = await pool.query(
      "INSERT INTO patients (doctor_id, display_id, name, phone, age, gender, password_hash) VALUES ($1, 'PAT-TEST', 'Test Patient', '03111111111', 30, 'Male', $2) RETURNING id",
      [doctorId, pHash]
    );
    console.log('Patient created:', patRes.rows[0].id);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
createTestData();
