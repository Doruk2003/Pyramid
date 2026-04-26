-- Kategori İskonto Tipi sütununu ekle (Seçim Yok: 0, İskonto 1: 1, vb.)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS category_discount int2 DEFAULT 0;

-- Eğer mevcut ürünlerde NULL olanlar varsa 0 olarak güncelle
UPDATE public.products
SET category_discount = 0
WHERE category_discount IS NULL;
