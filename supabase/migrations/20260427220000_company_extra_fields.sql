-- Şirket tablosuna eksik alanların eklenmesi
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_office text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN companies.tax_office IS 'Vergi Dairesi';
COMMENT ON COLUMN companies.phone IS 'Şirket Telefonu';
COMMENT ON COLUMN companies.email IS 'Şirket E-posta Adresi';
COMMENT ON COLUMN companies.website IS 'Şirket Web Sitesi';
COMMENT ON COLUMN companies.logo_url IS 'Şirket Logo URL';
