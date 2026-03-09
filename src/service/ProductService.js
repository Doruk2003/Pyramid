import { supabase } from './supabase';

export const ProductService = {
    // Tüm ürünleri getir
    async getProducts() {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching products:', error);
            return [];
        }
        return data;
    },

    // Yeni ürün ekle
    async createProduct(product) {
        const { data, error } = await supabase
            .from('products')
            .insert([product])
            .select();

        if (error) {
            console.error('Error creating product:', error);
            throw error;
        }
        return data[0];
    },

    // Ürün güncelle
    async updateProduct(id, updates) {
        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating product:', error);
            throw error;
        }
        return data[0];
    },

    // Ürün sil
    async deleteProduct(id) {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }
};
