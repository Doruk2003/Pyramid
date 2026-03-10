import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import Crud from '@/views/pages/Crud.vue';

const toastAdd = vi.hoisted(() => vi.fn());

vi.mock('primevue/usetoast', () => ({
    useToast: () => ({
        add: toastAdd
    })
}));

const productServiceMock = vi.hoisted(() => ({
    getProducts: vi.fn().mockResolvedValue([]),
    getCategories: vi.fn().mockResolvedValue([{ id: 'cat-1', name: 'Category 1' }]),
    getBrands: vi.fn().mockResolvedValue([{ id: 'brand-1', name: 'Brand 1' }]),
    getTypes: vi.fn().mockResolvedValue([{ id: 'type-1', name: 'Type 1' }]),
    getCurrencies: vi.fn().mockResolvedValue([{ id: 'cur-usd', code: 'USD', name: 'US Dollar' }]),
    createProduct: vi.fn().mockResolvedValue({ id: 'prod-1', name: 'Test' }),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    createCategory: vi.fn(),
    createBrand: vi.fn(),
    createType: vi.fn()
}));

vi.mock('@/service/ProductService', () => ({
    ProductService: productServiceMock
}));

const stubs = {
    Toolbar: { template: '<div><slot name="start"></slot><slot name="end"></slot></div>' },
    DataTable: { template: '<div><slot name="header"></slot><slot></slot></div>' },
    Column: { template: '<div><slot></slot></div>' },
    Button: { template: '<button><slot></slot></button>' },
    Dialog: { template: '<div><slot></slot><slot name="footer"></slot></div>' },
    InputText: { template: '<input />' },
    InputNumber: { template: '<input />' },
    Select: { props: ['modelValue', 'options'], template: '<select></select>' },
    Textarea: { template: '<textarea></textarea>' },
    Tag: { template: '<span></span>' },
    FileUpload: { template: '<div></div>' },
    IconField: { template: '<div><slot></slot></div>' },
    InputIcon: { template: '<div><slot></slot></div>' },
    Toast: { template: '<div></div>' }
};

function setProduct(wrapper, value) {
    const productState = wrapper.vm.$.setupState.product;
    if (productState && typeof productState === 'object' && 'value' in productState) {
        productState.value = value;
    } else {
        wrapper.vm.$.setupState.product = value;
    }
}

describe('Crud.vue', () => {
    it('shows validation warning when required fields missing', async () => {
        const wrapper = mount(Crud, { global: { stubs } });

        const { saveProduct } = wrapper.vm.$.setupState;
        setProduct(wrapper, { name: 'Test Product' });

        await saveProduct();

        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'warn',
                detail: 'Fiyat ve döviz zorunludur'
            })
        );
    });

    it('creates product when required fields are present', async () => {
        toastAdd.mockClear();
        const wrapper = mount(Crud, { global: { stubs } });

        const { saveProduct } = wrapper.vm.$.setupState;
        setProduct(wrapper, {
            name: 'Test Product',
            price: 10,
            currency_id: 'cur-usd',
            tax_rate: 20,
            price_unit: 'pcs',
            category_id: 'cat-1',
            brand_id: 'brand-1',
            type_id: 'type-1'
        });

        await saveProduct();

        expect(productServiceMock.createProduct).toHaveBeenCalled();
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'success',
                detail: 'Ürün oluşturuldu'
            })
        );
    });
});
