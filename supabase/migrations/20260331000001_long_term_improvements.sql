-- =============================================================================
-- 20260331000001_long_term_improvements.sql
-- UZUN VADELİ İYİLEŞTİRMELER
--
-- MADDE 7:  Audit Log tablosu + universal trigger (Kim, ne zaman, neyi değiştirdi?)
-- MADDE 8:  Fatura/Teklif/Sipariş numarası → PostgreSQL Sequence (eş zamanlılık güvenli)
-- MADDE 9:  exchange_rates tablosuna günlük kur değeri desteği
-- MADDE 12: leaves.days → Generated Column (start/end'den otomatik hesaplama)
-- =============================================================================


-- =============================================================================
-- MADDE 7: AUDIT LOG — Kim, ne zaman, neyi değiştirdi?
--
-- TASARIM:
--   - Tüm kritik tablolarda (products, accounts, invoices, quotes, orders, warehouses)
--     INSERT/UPDATE/DELETE işlemleri otomatik kayıt altına alınır.
--   - old_data / new_data JSONB olarak saklanır (tam geçmiş).
--   - RLS: audit_logs sadece admin ve manager tarafından okunabilir.
--   - Yazma: Sadece DB trigger üzerinden (frontend doğrudan yazamaz).
-- =============================================================================

-- audit_logs idempotent: önceki kısmi çalıştırmadan kalan tablo varsa temizle
DROP TABLE IF EXISTS audit_logs CASCADE;

CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name  TEXT        NOT NULL,
    record_id   UUID,
    action      TEXT        NOT NULL,   -- kısıtlama aşağıdaki CONSTRAINT ile tanımlandı
    changed_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    old_data    JSONB,
    new_data    JSONB,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT audit_logs_action_check CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- Index: Belirli kayıt geçmişini hızlı getir
CREATE INDEX IF NOT EXISTS idx_audit_record    ON audit_logs(record_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_table     ON audit_logs(table_name, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user      ON audit_logs(changed_by, changed_at DESC);

-- RLS: Sadece admin ve manager okuyabilir; kimse doğrudan yazamaz (trigger yazar)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_read"  ON audit_logs;
DROP POLICY IF EXISTS "audit_write" ON audit_logs;

CREATE POLICY "audit_read" ON audit_logs
    FOR SELECT TO authenticated
    USING (get_auth_user_role() IN ('admin', 'manager'));

-- INSERT sadece SECURITY DEFINER trigger fonksiyonuyla yapılabilir
-- (authenticated rolü doğrudan INSERT yapamaz)
CREATE POLICY "audit_deny_direct_write" ON audit_logs
    FOR ALL TO authenticated
    USING (false)
    WITH CHECK (false);

-- Universal audit trigger fonksiyonu
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_record_id UUID;
BEGIN
    -- Kayıt ID'sini bul (tablo 'id' UUID kolonuna sahip olmalı)
    IF TG_OP = 'DELETE' THEN
        v_record_id := (OLD.id)::UUID;
    ELSE
        v_record_id := (NEW.id)::UUID;
    END IF;

    INSERT INTO audit_logs (table_name, record_id, action, changed_by, old_data, new_data)
    VALUES (
        TG_TABLE_NAME,
        v_record_id,
        TG_OP,
        auth.uid(),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );

    RETURN NULL; -- AFTER trigger
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ları kritik tablolara ekle
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['products', 'accounts', 'invoices', 'quotes', 'orders', 'warehouses', 'stock_movements'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_audit ON %I', t);
        EXECUTE format(
            'CREATE TRIGGER trg_audit
             AFTER INSERT OR UPDATE OR DELETE ON %I
             FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger()',
            t
        );
    END LOOP;
END $$;


-- =============================================================================
-- MADDE 8: SEQUENCE-BASED BELGE NUMARASI
--
-- SORUN: Date.now() veya COUNT(*) ile üretilen numaralar eş zamanlı kullanımda
--        çakışabilir (race condition). PostgreSQL SEQUENCE atomik ve güvenlidir.
--
-- FORMAT: TK-2026-00001 (Teklif), SP-2026-00001 (Sipariş), FT-2026-00001 (Fatura)
--
-- YILLIK SIFIRLAMA: Her yıl başında sequence sıfırlanır (cron job ile).
--   Şimdilik sequence monoton artar; yıl prefix ile çakışma önlenir.
-- =============================================================================

-- Teklif numarası sequence
CREATE SEQUENCE IF NOT EXISTS seq_quote_number START 1 INCREMENT 1;

-- Sipariş numarası sequence
CREATE SEQUENCE IF NOT EXISTS seq_order_number START 1 INCREMENT 1;

-- Fatura numarası sequence
CREATE SEQUENCE IF NOT EXISTS seq_invoice_number START 1 INCREMENT 1;

-- Helper fonksiyonlar (frontend'den çağrılabilir RPC olarak kullanılabilir)
CREATE OR REPLACE FUNCTION get_next_quote_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'TK-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('seq_quote_number')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'SP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('seq_order_number')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'FT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('seq_invoice_number')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mevcut kayıt sayısına göre sequence'ları başlat (var olan kayıtlarla çakışma olmasın)
DO $$
DECLARE
    v_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM quotes;
    IF v_count > 0 THEN
        PERFORM setval('seq_quote_number', v_count);
    END IF;

    SELECT COUNT(*) INTO v_count FROM orders;
    IF v_count > 0 THEN
        PERFORM setval('seq_order_number', v_count);
    END IF;

    SELECT COUNT(*) INTO v_count FROM invoices;
    IF v_count > 0 THEN
        PERFORM setval('seq_invoice_number', v_count);
    END IF;
END $$;


-- =============================================================================
-- MADDE 9: DÖVİZ KUR TABLOSU ZENGİNLEŞTİRME
--
-- SORUN: exchange_rates tablosu sadece kod/isim tutuyor, günlük kur değeri yok.
-- ÇÖZÜM: Var olan exchange_rates yapısına rate + valid_date ekleniyor.
--        Bu sayede hem günlük kur hem de geçmiş döviz kuru sorgulanabilir.
-- =============================================================================

-- Günlük kur için valid_date kolonu (yoksa ekle)
ALTER TABLE exchange_rates
    ADD COLUMN IF NOT EXISTS valid_date DATE DEFAULT CURRENT_DATE;

-- En güncel kur sorgusunu kolaylaştırmak için index
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date
    ON exchange_rates(currency_id, valid_date DESC);

-- Belirli bir tarih için döviz kuru getiren helper fonksiyon
CREATE OR REPLACE FUNCTION get_exchange_rate(
    p_currency_code TEXT,
    p_date          DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC AS $$
DECLARE
    v_rate NUMERIC;
BEGIN
    SELECT er.rate
    INTO v_rate
    FROM exchange_rates er
    JOIN currencies c ON c.id = er.currency_id
    WHERE c.code = p_currency_code
      AND er.valid_date <= p_date
    ORDER BY er.valid_date DESC
    LIMIT 1;

    RETURN COALESCE(v_rate, 1); -- Kur bulunamazsa 1 döner (TRY)
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- =============================================================================
-- MADDE 12: leaves.days — Hesaplanan Alan Güvenliği
--
-- SORUN: days = end_date - start_date hesaplanabilir, ama stored.
--        start_date ya da end_date değişirse days tutarsız kalabilir.
--
-- ÇÖZÜM: Trigger ile days'i otomatik güncelle.
--        (PostgreSQL GENERATED ALWAYS AS stored only = immutable, bu case için
--         trigger daha uygun çünkü hafta sonu/tatil hesabına ileride izin verir)
-- =============================================================================

-- leaves tablosu var mı kontrol et
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'leaves'
    ) THEN
        -- days kolonunu nullable yap (trigger hesaplayacak)
        ALTER TABLE leaves ALTER COLUMN days DROP NOT NULL;

        -- Auto-calc trigger
        CREATE OR REPLACE FUNCTION fn_calc_leave_days()
        RETURNS TRIGGER AS $func$
        BEGIN
            -- Basit takvim günü farkı; ileride iş günü hesabına genişletilebilir
            NEW.days := (NEW.end_date - NEW.start_date) + 1;
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_calc_leave_days ON leaves;
        CREATE TRIGGER trg_calc_leave_days
            BEFORE INSERT OR UPDATE OF start_date, end_date
            ON leaves
            FOR EACH ROW
            EXECUTE FUNCTION fn_calc_leave_days();

        RAISE NOTICE 'leaves.days trigger başarıyla oluşturuldu.';
    ELSE
        RAISE NOTICE 'leaves tablosu bulunamadı, atlanıyor.';
    END IF;
END $$;


-- =============================================================================
-- DOĞRULAMA SORGULARI (Migration sonrası çalıştırın)
-- =============================================================================

-- 1) Audit log tablosu ve trigger'ları
-- SELECT event_object_table AS table_name, trigger_name FROM information_schema.triggers
-- WHERE trigger_name = 'trg_audit'
-- ORDER BY event_object_table;
-- Beklenen: 7 satır (products, accounts, invoices, quotes, orders, warehouses, stock_movements)

-- 2) Sequence'lar
-- SELECT sequence_name FROM information_schema.sequences
-- WHERE sequence_name IN ('seq_quote_number', 'seq_order_number', 'seq_invoice_number');
-- Beklenen: 3 satır

-- 3) Helper fonksiyonlar (örnek çağrı)
-- SELECT get_next_quote_number();   -- TK-2026-00001
-- SELECT get_next_order_number();   -- SP-2026-00001
-- SELECT get_next_invoice_number(); -- FT-2026-00001

-- 4) Döviz kuru helper
-- SELECT get_exchange_rate('USD');  -- Kayıt varsa USD kuru, yoksa 1
-- =============================================================================
