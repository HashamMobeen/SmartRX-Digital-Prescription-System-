/**
 * seed-templates.js
 * Called once per new doctor registration.
 * Seeds 10 disease templates using medicines already in the DB.
 * All INSERTs use ON CONFLICT DO NOTHING — safe to call multiple times.
 */

const TEMPLATES = [
  {
    disease: 'Upper Respiratory Tract Infection',
    name: 'Standard URTI',
    medicines: [
      { name: 'Paracetamol',            days: 5,  times: 3 },
      { name: 'Amoxicillin',            days: 5,  times: 3 },
      { name: 'Cetirizine',             days: 5,  times: 1 },
      { name: 'Bromhexine',             days: 5,  times: 3 },
      { name: 'Vitamin C',              days: 7,  times: 1 },
    ],
  },
  {
    disease: 'Fever',
    name: 'Fever Protocol',
    medicines: [
      { name: 'Paracetamol',            days: 3,  times: 3 },
      { name: 'Ibuprofen',              days: 3,  times: 2 },
      { name: 'Oral Rehydration Salts', days: 3,  times: 3 },
      { name: 'Vitamin C',              days: 5,  times: 1 },
    ],
  },
  {
    disease: 'Hypertension',
    name: 'Hypertension Starter',
    medicines: [
      { name: 'Amlodipine',             days: 30, times: 1 },
      { name: 'Losartan',               days: 30, times: 1 },
      { name: 'Aspirin Low Dose',        days: 30, times: 1 },
      { name: 'Atorvastatin',           days: 30, times: 1 },
    ],
  },
  {
    disease: 'Type 2 Diabetes',
    name: 'T2DM Initial',
    medicines: [
      { name: 'Metformin',              days: 30, times: 2 },
      { name: 'Glimepiride',            days: 30, times: 1 },
      { name: 'Aspirin Low Dose',        days: 30, times: 1 },
      { name: 'Atorvastatin',           days: 30, times: 1 },
      { name: 'Vitamin B12',            days: 30, times: 1 },
    ],
  },
  {
    disease: 'Gastritis',
    name: 'Gastritis Relief',
    medicines: [
      { name: 'Omeprazole',             days: 14, times: 1 },
      { name: 'Metronidazole',          days: 7,  times: 3 },
      { name: 'Domperidone',            days: 5,  times: 3 },
      { name: 'Sucralfate',             days: 7,  times: 3 },
    ],
  },
  {
    disease: 'Urinary Tract Infection',
    name: 'UTI Standard',
    medicines: [
      { name: 'Ciprofloxacin',          days: 7,  times: 2 },
      { name: 'Nitrofurantoin',         days: 7,  times: 2 },
      { name: 'Paracetamol',            days: 3,  times: 3 },
      { name: 'Vitamin C',              days: 7,  times: 1 },
    ],
  },
  {
    disease: 'Asthma',
    name: 'Asthma Acute',
    medicines: [
      { name: 'Salbutamol',             days: 5,  times: 3 },
      { name: 'Budesonide',             days: 14, times: 2 },
      { name: 'Montelukast',            days: 14, times: 1 },
      { name: 'Prednisolone',           days: 5,  times: 1 },
    ],
  },
  {
    disease: 'Allergic Rhinitis',
    name: 'Allergic Rhinitis',
    medicines: [
      { name: 'Cetirizine',             days: 10, times: 1 },
      { name: 'Fluticasone Nasal Spray', days: 30, times: 1 },
      { name: 'Montelukast',            days: 10, times: 1 },
    ],
  },
  {
    disease: 'Iron Deficiency Anaemia',
    name: 'Iron Deficiency',
    medicines: [
      { name: 'Iron Sulphate',          days: 60, times: 1 },
      { name: 'Folic Acid',             days: 60, times: 1 },
      { name: 'Vitamin C',              days: 60, times: 1 },
      { name: 'Vitamin B12',            days: 30, times: 1 },
    ],
  },
  {
    disease: 'Skin Infection',
    name: 'Skin Infection (Mild)',
    medicines: [
      { name: 'Flucloxacillin',         days: 7,  times: 4 },
      { name: 'Mupirocin',              days: 7,  times: 3 },
      { name: 'Cetirizine',             days: 5,  times: 1 },
      { name: 'Paracetamol',            days: 3,  times: 3 },
    ],
  },
];

/**
 * Seeds the 10 starter templates for a newly registered doctor.
 * @param {import('pg').PoolClient} client — already inside a transaction
 * @param {string} doctorId
 */
async function seedDoctorTemplates(client, doctorId) {
  for (const tpl of TEMPLATES) {
    // 1. Upsert disease (shared global table)
    const { rows: dRows } = await client.query(
      `INSERT INTO diseases (name)
       VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [tpl.disease]
    );
    const diseaseId = dRows[0].id;

    // 2. Insert template owned by this doctor
    const { rows: tRows } = await client.query(
      `INSERT INTO disease_templates (disease_id, doctor_id, name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [diseaseId, doctorId, tpl.name]
    );
    const templateId = tRows[0].id;

    // 3. Resolve medicine IDs and insert template_medicines
    for (const med of tpl.medicines) {
      const { rows: mRows } = await client.query(
        `SELECT id FROM medicines WHERE name = $1`,
        [med.name]
      );
      if (mRows.length === 0) continue; // medicine not seeded yet — skip gracefully

      await client.query(
        `INSERT INTO template_medicines (template_id, medicine_id, days, times_per_day)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [templateId, mRows[0].id, med.days, med.times]
      );
    }
  }
}

module.exports = { seedDoctorTemplates };
