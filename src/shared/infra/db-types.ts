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
    created_at: string;
    updated_at: string;
}

export interface DbAccount {
    id: string;
    company_id: string;
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
    issue_date: string;
    due_date?: string;
    status: string;
    subtotal: number;
    vat_total: number;
    total: number;
    paid_amount: number;
    currency: string;
    exchange_rate: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    invoice_lines?: DbInvoiceLine[]; // Join results
}

export interface DbInvoiceLine {
    id: string;
    invoice_id: string;
    product_id: string;
    description?: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
    discount_rate: number;
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
