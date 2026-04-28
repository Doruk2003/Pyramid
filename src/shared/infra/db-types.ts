export interface DbProduct {
    id: string;
    company_id: string;
    code: string;
    name: string;
    description?: string;
    image?: string;
    price: number;
    inventoryStatus?: string;
    rating?: number;
    category_id?: string;
    brand_id?: string;
    type_id?: string;
    currency_id?: string;
    tax_rate?: number;
    price_unit?: string;
    min_stock?: number;
    max_stock?: number;
    barcode?: string;
    initial_stock?: number;
    status?: string;
    images?: string[];
    category_discount?: number;
    created_at: string;
    updated_at: string;
}

export interface DbAccount {
    id: string;
    company_id: string;
    code?: string;            // Cari kodu
    parent_id?: string;       // Alt hesap: üst hesabın ID'si
    account_type: 'customer' | 'supplier' | 'both';
    name: string;
    tax_number?: string;
    tax_office?: string;
    email?: string;
    phone?: string;
    address?: unknown;
    authorized_person?: string;
    authorized_gsm?: string;
    city?: string;
    district?: string;
    country?: string;
    bank_name?: string;
    account_owner?: string;
    iban?: string;
    description?: string;
    is_dealer?: boolean;
    dealer_discount1?: number;
    dealer_discount2?: number;
    dealer_discount3?: number;
    credit_limit: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface DbInvoice {
    id: string;
    company_id: string;
    invoice_type: string;
    invoice_number: string;
    account_id: string;
    warehouse_id?: string;
    project_id?: string;          // PRJ modülü entegrasyonu
    issue_date: string;
    due_date?: string;
    status: string;
    subtotal: number;
    discount_rate: number;
    discount_amount: number;
    vat_total: number;
    total: number;
    paid_amount: number;
    payment_type: string;
    currency: string;
    exchange_rate: number;
    document_category: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    invoice_lines?: DbInvoiceLine[]; // Join results
}

export interface DbInvoiceLine {
    id: string;
    invoice_id: string;
    product_id: string;
    warehouse_id?: string;
    description?: string;
    quantity: number;
    unit_price: number;
    original_price?: number;
    original_currency?: string;
    vat_rate: number;
    discount_rate1: number;
    discount_rate2: number;
    discount_rate3: number;
    line_total: number;
    created_at: string;
}

export interface DbWarehouse {
    id: string;
    company_id: string;
    name: string;
    location?: string;
    is_active: boolean;
    created_at: string;
}

export interface DbStockMovement {
    id: string;
    company_id: string;
    product_id: string;
    warehouse_id: string;
    project_id?: string;           // PRJ modülü entegrasyonu
    movement_type: string;
    quantity: number;
    unit_cost?: number;
    reference_type?: string;
    reference_id?: string;
    note?: string;
    created_by: string;
    created_at: string;
}

export interface DbUser {
    id: string;
    company_id: string;
    full_name: string;
    email: string;
    role: 'admin' | 'manager' | 'user' | 'viewer';
    is_active: boolean;
    created_at: string;
}

export interface DbExchangeRate {
    id: string;
    company_id: string;
    currency_id: string;
    rate: number;
    effective_date: string;
    notes?: string;
    created_by?: string;
    created_at: string;
    // JOIN sonucu
    currencies?: {
        code: string;
        name: string;
    };
}

export interface DbQuote {
    id: string;
    company_id: string;
    account_id: string;
    quote_number: string;
    issue_date: string;
    valid_until?: string;
    status: string;
    subtotal: number;
    vat_total: number;
    total: number;
    currency: string;
    exchange_rate: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    quote_lines?: DbQuoteLine[];
}

export interface DbQuoteLine {
    id: string;
    quote_id: string;
    product_id: string;
    description?: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
    discount_rate: number;
    line_total: number;
    sort_order: number;
    created_at: string;
}

export interface DbOrder {
    id: string;
    company_id: string;
    account_id: string;
    quote_id?: string;
    order_number: string;
    issue_date: string;
    due_date?: string;
    status: string;
    subtotal: number;
    vat_total: number;
    total: number;
    currency: string;
    exchange_rate: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    order_lines?: DbOrderLine[];
}

export interface DbOrderLine {
    id: string;
    order_id: string;
    product_id: string;
    description?: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
    discount_rate: number;
    line_total: number;
    sort_order: number;
    created_at: string;
}

export interface DbProject {
    id: string;
    company_id: string;
    code: string;
    name: string;
    location?: string;
    client_id?: string;
    status: 'planning' | 'active' | 'completed' | 'suspended';
    start_date?: string;
    end_date?: string;
    budget_material: number;
    budget_labor: number;
    budget_equipment: number;
    budget_general: number;
    description?: string;
    is_active: boolean;
    deleted_at?: string;
    created_at: string;
    updated_at: string;
    // JOIN sonucu (opsiyonel)
    accounts?: { name: string } | null;
}


export interface DbTask {
    id: string;
    company_id: string;
    user_id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date?: string;
    is_all_day: boolean;
    status: 'pending' | 'completed' | 'cancelled';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    category?: string;
    color?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}
