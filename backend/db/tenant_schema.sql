CREATE TABLE __SCHEMA__.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aadhaar varchar(12) NOT NULL,
  full_name text NOT NULL,
  phone text,
  date_of_birth date,
  blood_group text,
  patient_type text,
  gender text,
  department text, -- for ABAC, patient_department
  created_at timestamptz DEFAULT now()
);

CREATE TABLE __SCHEMA__.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES __SCHEMA__.patients(id),
  diagnosis text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE __SCHEMA__.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES __SCHEMA__.patients(id),
  doctor_id uuid NOT NULL, -- public.users.id
  diagnosis TEXT,
  notes TEXT,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE __SCHEMA__.prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES __SCHEMA__.prescriptions(id) ON DELETE CASCADE,
  medicine_name text NOT NULL,
  dosage text,
  frequency text,
  duration text,
  instructions text
);
