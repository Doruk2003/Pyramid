-- ============================================================
-- Migration: Satış Belge Akışı ve Bakiye Takibi
-- Tarih: 2026-04-28
-- Açıklama: Teklif -> Sipariş -> Fatura akışında miktar takibi 
--           ve referans bağları için gerekli kolonlar.
-- ============================================================

-- 1) Teklif Satırlarına 'Sipariş Edilen Miktar', depo ve indirimler ekle
ALTER TABLE quote_lines 
ADD COLUMN IF NOT EXISTS ordered_quantity NUMERIC(18,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id),
ADD COLUMN IF NOT EXISTS discount_rate1 NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_rate2 NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_rate3 NUMERIC(5,2) DEFAULT 0;

-- 2) Sipariş Satırlarına 'Faturalanan', 'Sevk Edilen', 'Kaynak Satır', depo ve indirimler ekle
ALTER TABLE order_lines 
ADD COLUMN IF NOT EXISTS invoiced_quantity NUMERIC(18,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipped_quantity NUMERIC(18,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS source_line_id UUID, -- quote_line_id
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id),
ADD COLUMN IF NOT EXISTS discount_rate1 NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_rate2 NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_rate3 NUMERIC(5,2) DEFAULT 0;

-- 3) Teklif ve Sipariş Başlıklarına Proje desteği ekle
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id),
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('sale', 'purchase')) DEFAULT 'sale';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id),
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('sale', 'purchase')) DEFAULT 'sale';

-- 4) Faturalara 'Kaynak Belgeler' bilgisi ekle (Toplu seçim desteği için)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS source_type TEXT, -- 'quote', 'order'
ADD COLUMN IF NOT EXISTS source_ids UUID[]; -- Bağlı olan teklif/sipariş ID listesi

-- 5) Fatura Satırlarına 'Kaynak Satır' bilgisi ekle
ALTER TABLE invoice_lines
ADD COLUMN IF NOT EXISTS source_line_id UUID; -- order_line_id veya quote_line_id

-- 5) Sipariş Durumlarına 'Kısmi Faturalandı' ekle
-- Not: Postgres'te ENUM güncellemek biraz zahmetlidir, CHECK CONSTRAINT varsa daha kolaydır.
-- Mevcut 'orders' tablosu CHECK constraint kullanıyor.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('draft', 'confirmed', 'processing', 'shipped', 'delivered', 'partially_invoiced', 'cancelled', 'completed'));

-- 6) Teklif Durumlarına 'Kısmi Sipariş Alındı' ekle
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check 
CHECK (status IN ('draft', 'sent', 'accepted', 'partially_converted', 'rejected', 'expired', 'converted'));
