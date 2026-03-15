import { supabase } from './supabaseClient';

const PRODUCTS_TABLE = 'products';
const CATEGORIES_TABLE = 'categories';
const BRANDS_TABLE = 'brands';
const TYPES_TABLE = 'types';
const CURRENCIES_TABLE = 'currencies';

async function fetchAll(table, orderBy = 'name') {
    const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending: true });

    if (error) {
        console.warn(`Supabase fetch error (${table}):`, error.message);
        return [];
    }

    return data ?? [];
}

async function insertRow(table, row) {
    const { data, error } = await supabase.from(table).insert(row).select('*').single();

    if (error) {
        console.warn(`Supabase insert error (${table}):`, error.message);
        return null;
    }

    return data ?? null;
}

async function updateRow(table, id, row) {
    const { data, error } = await supabase.from(table).update(row).eq('id', id).select('*').single();

    if (error) {
        console.warn(`Supabase update error (${table}):`, error.message);
        return null;
    }

    return data ?? null;
}

async function deleteRow(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
        console.warn(`Supabase delete error (${table}):`, error.message);
        return false;
    }

    return true;
}

export const ProductService = {
    getProductsMini() {
        return fetchAll(PRODUCTS_TABLE, 'name').then((data) => data.slice(0, 5));
    },

    getProductsSmall() {
        return fetchAll(PRODUCTS_TABLE, 'name').then((data) => data.slice(0, 10));
    },

    getProducts() {
        return fetchAll(PRODUCTS_TABLE, 'name');
    },

    createProduct(product) {
        return insertRow(PRODUCTS_TABLE, product);
    },

    updateProduct(id, product) {
        return updateRow(PRODUCTS_TABLE, id, product);
    },

    deleteProduct(id) {
        return deleteRow(PRODUCTS_TABLE, id);
    },

    getProductsWithOrdersSmall() {
        return fetchAll(PRODUCTS_TABLE, 'name').then((data) => data.slice(0, 10));
    },

    getProductsWithOrders() {
        return fetchAll(PRODUCTS_TABLE, 'name');
    },

    getCategories() {
        return fetchAll(CATEGORIES_TABLE);
    },

    createCategory(category) {
        return insertRow(CATEGORIES_TABLE, category);
    },

    getBrands() {
        return fetchAll(BRANDS_TABLE);
    },

    createBrand(brand) {
        return insertRow(BRANDS_TABLE, brand);
    },

    getTypes() {
        return fetchAll(TYPES_TABLE);
    },

    createType(type) {
        return insertRow(TYPES_TABLE, type);
    },

    getCurrencies() {
        return fetchAll(CURRENCIES_TABLE, 'code');
    },

    createCurrency(currency) {
        return insertRow(CURRENCIES_TABLE, currency);
    }
};
