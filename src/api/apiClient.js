import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000'; // This should be in an environment variable
const apiClient = axios.create({ baseURL: `${API_BASE_URL}/api` });

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('bughaw_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
}, (error) => Promise.reject(error));

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && error.response.data.message?.includes('Token expired')) {
            localStorage.removeItem('bughaw_token');
            localStorage.removeItem('bughaw_user');
            window.location.href = '/'; // Force reload to login
        }
        return Promise.reject(error);
    }
);

// Centralized API calls
export const api = {
    login: (credentials) => apiClient.post('/login', credentials).then(res => res.data),
    getBranches: () => apiClient.get('/branches').then(res => res.data),
    addBranch: (branchData) => apiClient.post('/branches', branchData).then(res => res.data),
    getPartners: () => apiClient.get('/partners').then(res => res.data),
    addPartner: (partnerData) => apiClient.post('/partners', partnerData).then(res => res.data),
    getCustomers: () => apiClient.get('/customers').then(res => res.data),
    addCustomer: (customerData) => apiClient.post('/customers', customerData).then(res => res.data),
    getAgents: () => apiClient.get('/agents').then(res => res.data),
    checkCustomerPending: (customerId) => apiClient.get(`/customers/${customerId}/check-pending`).then(res => res.data),
    getProducts: (params) => apiClient.get('/products', { params }).then(res => res.data),
    addProduct: (formData) => apiClient.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data),
    deleteProduct: (id) => apiClient.delete(`/products/${id}`).then(res => res.data),
    toggleProductStatus: (id, isActive) => apiClient.put(`/products/${id}/toggle-status`, { isActive }).then(res => res.data),
    createOrder: (orderData) => apiClient.post('/orders', orderData).then(res => res.data),
    getUsers: () => apiClient.get('/users').then(res => res.data),
    addUser: (userData) => apiClient.post('/users/register', userData).then(res => res.data),
    updateUser: (id, userData) => apiClient.put(`/users/${id}`, userData).then(res => res.data),
    deleteUser: (id) => apiClient.delete(`/users/${id}`).then(res => res.data),
    setUserLimits: (id, limits) => apiClient.post(`/users/${id}/limits`, limits).then(res => res.data),
    getRoles: () => apiClient.get('/roles').then(res => res.data),
    getPermissions: () => apiClient.get('/permissions').then(res => res.data), // <-- NEW FUNCTION
    getDiscounts: () => apiClient.get('/discounts').then(res => res.data),
    addDiscount: (discountData) => apiClient.post('/discounts', discountData).then(res => res.data),
    addAdvancedDiscount: (discountData) => apiClient.post('/discounts/advanced', discountData).then(res => res.data),
    getInventory: () => apiClient.get('/inventory').then(res => res.data),
    updateInventory: (productId, newStock) => apiClient.put(`/inventory/${productId}`, { newStock }).then(res => res.data),
    getSalesSummary: (period) => apiClient.get(`/sales/summary?period=${period}`).then(res => res.data),
    getInactiveCustomersReport: (days) => apiClient.get(`/reports/inactive-customers?days=${days}`).then(res => res.data),
    getSalesComparisonReport: (params) => apiClient.get('/reports/sales-comparison', { params }).then(res => res.data),
    getCustomerComparisonReport: (params) => apiClient.get('/reports/customer-comparison', { params }).then(res => res.data),
    getOrders: () => apiClient.get('/orders').then(res => res.data),
    getOrderDetails: (id) => apiClient.get(`/orders/${id}`).then(res => res.data),
    updateInvoice: (id, invoiceNo) => apiClient.put(`/orders/${id}/invoice`, { invoiceNo }).then(res => res.data),
    updateOrderStatus: (orderId, data) => apiClient.put(`/orders/${orderId}/status`, data).then(res => res.data),
    getOrderHistory: () => apiClient.get('/order-history').then(res => res.data),
    getUnpaidOrders: () => apiClient.get('/accounting/unpaid').then(res => res.data),
    markOrderAsPaid: (orderId, password) => apiClient.post(`/accounting/mark-paid/${orderId}`, { password }).then(res => res.data),
    calculatePrices: (payload) => apiClient.post('/pricing/calculate', payload).then(res => res.data)
};

export const getApiBaseUrl = () => API_BASE_URL;