import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

// --- MATERIAL-UI IMPORTS ---
import {
    Alert, Box, AppBar, Button, Card, CardContent, CardHeader, CircularProgress, Container,
    Dialog, DialogActions, DialogContent, DialogTitle, Drawer, Grid, IconButton,
    List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Select, MenuItem, FormControl, InputLabel,
    Snackbar, TextField, Toolbar, Typography, Avatar, Divider, Fade, Slide,
    Stack, Chip, InputAdornment, alpha, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Collapse, CardMedia, FormControlLabel
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
    Dashboard, PointOfSale, Inventory, Receipt, People, LocalOffer, ShoppingCart,
    Menu as MenuIcon, TrendingUp, ShoppingBag,
    Search, Add, Edit, Delete,
    Store, StarBorder, AddCircleOutline, RemoveCircleOutline, Image as ImageIcon, Print
} from '@mui/icons-material';

Chart.register(...registerables);

// --- ENHANCED THEME ---
const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#1976d2' },
        secondary: { main: '#f50057' },
        background: { default: '#f8fafc', paper: '#ffffff' },
        text: { primary: '#1a202c', secondary: '#718096' },
        grey: { 50: '#f9fafb', 100: '#f7fafc', 200: '#edf2f7', 300: '#e2e8f0', 400: '#cbd5e0', 500: '#a0aec0', 600: '#718096', 700: '#4a5568', 800: '#2d3748', 900: '#1a202c' },
    },
    typography: { fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    shape: { borderRadius: 12 },
    components: {
        MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, borderRadius: 8, padding: '8px 16px', boxShadow: 'none' } } },
        MuiCard: { styleOverrides: { root: { borderRadius: 16, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)', border: '1px solid #e2e8f0' } } },
        MuiPaper: { styleOverrides: { root: { borderRadius: 12, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)' } } },
        MuiDrawer: { styleOverrides: { paper: { borderRight: '1px solid #e2e8f0', backgroundColor: '#ffffff' } } },
        MuiListItemButton: { styleOverrides: { root: { borderRadius: 8, margin: '0 8px', '&.Mui-selected': { backgroundColor: alpha('#1976d2', 0.08), '&:hover': { backgroundColor: alpha('#1976d2', 0.12) } } } } },
        MuiTextField: { styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 8 } } } },
        MuiChip: { styleOverrides: { root: { borderRadius: 6, fontWeight: 500 } } },
    },
});

// --- API SETUP ---
const API_BASE_URL = 'http://localhost:5000';
const api = {
    request: async (endpoint, options = {}) => {
        const token = localStorage.getItem('bughaw_token');
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        try {
            const response = await fetch(`${API_BASE_URL}/api${endpoint}`, { ...options, headers });
            if (options.body instanceof FormData) {
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({ message: 'An unknown error occurred during file upload.' }));
                    throw new Error(errData.message);
                }
                return response.json();
            }
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'An unknown server error occurred.');
            return data;
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            throw error;
        }
    },
    login: (credentials) => api.request('/login', { method: 'POST', body: JSON.stringify(credentials) }),
    changePassword: (passwordData) => api.request('/users/change-password', { method: 'PUT', body: JSON.stringify(passwordData) }),
    getUsers: () => api.request('/users'),
    addUser: (userData) => api.request('/users/register', { method: 'POST', body: JSON.stringify(userData) }),
    updateUser: (userId, userData) => api.request(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(userData) }),
    deleteUser: (userId) => api.request(`/users/${userId}`, { method: 'DELETE' }),
    getProducts: () => api.request('/products'),
    addProduct: (formData) => api.request('/products', { method: 'POST', body: formData, headers: {} }),
    updateProduct: (productId, formData) => api.request(`/products/${productId}`, { method: 'PUT', body: formData, headers: {} }),
    deleteProduct: (productId) => api.request(`/products/${productId}`, { method: 'DELETE' }),
    getInventory: () => api.request('/inventory'),
    updateStock: (productId, newStock) => api.request(`/inventory/${productId}`, { method: 'PUT', body: JSON.stringify({ newStock }) }),
    getOrders: () => api.request('/orders'),
    getOrderDetails: (orderId) => api.request(`/orders/${orderId}`),
    createOrder: (orderData) => api.request('/orders', { method: 'POST', body: JSON.stringify(orderData) }),
    updateOrderStatus: (orderId, status) => api.request(`/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    applyDiscountToOrder: (orderId, discountId) => api.request(`/orders/${orderId}/apply-discount`, { method: 'PUT', body: JSON.stringify({ discount_id: discountId }) }),
    getDiscounts: () => api.request('/discounts'),
    addDiscount: (discountData) => api.request('/discounts', { method: 'POST', body: JSON.stringify(discountData) }),
    getSalesSummary: () => api.request('/sales/summary'),
};

// --- HELPER COMPONENTS ---
const LoadingSpinner = () => <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4, height: '100%' }}><CircularProgress /></Box>;

const AppSnackbar = ({ open, message, severity, onClose }) => (
    <Snackbar open={open} autoHideDuration={4000} onClose={onClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} TransitionComponent={Slide}>
        <Alert onClose={onClose} severity={severity} variant="filled" sx={{ width: '100%', borderRadius: 2, fontWeight: 500 }}>{message}</Alert>
    </Snackbar>
);

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel }) => (
    <Dialog open={open} onClose={onCancel}>
        <DialogTitle fontWeight="bold">{title}</DialogTitle>
        <DialogContent><Typography>{message}</Typography></DialogContent>
        <DialogActions sx={{ p: '0 24px 16px' }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button onClick={onConfirm} color="error" variant="contained">Confirm</Button>
        </DialogActions>
    </Dialog>
);

// --- AUTHENTICATION SCREEN ---
const AuthScreen = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await api.login({ username, password });
            onLoginSuccess(response.token, response.user);
        } catch (err) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', p: 2 }}>
            <Container component="main" maxWidth="sm">
                <Fade in timeout={800}>
                    <Card elevation={0} sx={{ maxWidth: 400, mx: 'auto', borderRadius: 4 }}>
                        <CardContent sx={{ p: 4 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Avatar sx={{ width: 80, height: 80, mb: 2, bgcolor: 'primary.main', fontSize: '2rem' }}><Store /></Avatar>
                                <Typography component="h1" variant="h4" gutterBottom fontWeight="bold">Bughaw Admin</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Welcome back! Please sign in.</Typography>
                                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                                    <TextField margin="normal" required fullWidth id="username" label="Username" name="username" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} disabled={isLoading} />
                                    <TextField margin="normal" required fullWidth name="password" label="Password" type="password" id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                                    {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
                                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2, py: 1.5 }} disabled={isLoading}>
                                        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                                    </Button>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Fade>
            </Container>
        </Box>
    );
};

// --- SALES DASHBOARD ---
const SalesDashboard = () => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                const data = await api.getSalesSummary();
                setSummary(data);
            } catch (error) {
                setError("Failed to fetch sales summary. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (summary?.dailySales && chartRef.current) {
            if (chartInstance.current) chartInstance.current.destroy();
            const ctx = chartRef.current.getContext('2d');
            chartInstance.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: summary.dailySales.labels,
                    datasets: [{
                        label: 'Sales (PHP)',
                        data: summary.dailySales.data,
                        backgroundColor: alpha(theme.palette.primary.main, 0.6),
                        borderColor: theme.palette.primary.main,
                        borderWidth: 1,
                        borderRadius: 5,
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
            });
        }
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [summary]);

    if (loading) return <LoadingSpinner />;
    if (error) return <Alert severity="error">{error}</Alert>;

    const metricCards = [
        { title: 'Total Revenue (Last 7 Days)', value: `₱${parseFloat(summary?.summary?.totalRevenue || 0).toFixed(2)}`, icon: <TrendingUp color="success" sx={{ fontSize: 40 }} /> },
        { title: 'Total Orders (Last 7 Days)', value: summary?.summary?.totalOrders || 0, icon: <ShoppingBag color="info" sx={{ fontSize: 40 }} /> },
        { title: 'Top Product', value: summary?.topProducts[0]?.name || 'N/A', icon: <StarBorder color="warning" sx={{ fontSize: 40 }} /> },
    ];

    return (
        <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">Dashboard</Typography>
            <Grid container spacing={3}>
                {metricCards.map((card, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card>
                            <CardContent>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar sx={{ bgcolor: (theme) => alpha(theme.palette[card.icon.props.color].main, 0.1) }}>{card.icon}</Avatar>
                                    <Box>
                                        <Typography variant="h5" fontWeight="bold">{card.value}</Typography>
                                        <Typography variant="body2" color="text.secondary">{card.title}</Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
                <Grid item xs={12}>
                    <Card>
                        <CardHeader title="Weekly Sales Performance" />
                        <CardContent>
                            <Box sx={{ height: 400 }}><canvas ref={chartRef}></canvas></Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

// --- POINT OF SALE ---
const PointOfSaleScreen = ({ showSnackbar }) => {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [customerName, setCustomerName] = useState('Walk-in');
    const [officialReceiptId, setOfficialReceiptId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [productsLoading, setProductsLoading] = useState(true);

    const fetchProducts = useCallback(async () => {
        setProductsLoading(true);
        try {
            const data = await api.getProducts();
            setProducts(data);
        } catch (error) {
            showSnackbar('Failed to fetch products: ' + error.message, 'error');
        } finally {
            setProductsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const filteredProducts = useMemo(() =>
        products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [products, searchTerm]
    );

    const addToCart = (productToAdd) => {
        setCart(currentCart => {
            const existingItem = currentCart.find(item => item.id === productToAdd.id);
            if (existingItem) {
                if (existingItem.quantity >= productToAdd.stock) {
                    showSnackbar(`Stock limit reached for ${productToAdd.name}.`, 'warning');
                    return currentCart;
                }
                return currentCart.map(item => item.id === productToAdd.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            if (productToAdd.stock > 0) {
                return [...currentCart, { ...productToAdd, quantity: 1 }];
            }
            showSnackbar(`${productToAdd.name} is out of stock.`, 'info');
            return currentCart;
        });
    };

    const updateQuantity = (productId, amount) => {
        setCart(currentCart => currentCart.map(item => {
            if (item.id === productId) {
                const newQuantity = item.quantity + amount;
                const product = products.find(p => p.id === productId);
                if (product && newQuantity > product.stock) {
                    showSnackbar(`Stock limit reached for ${item.name}.`, 'warning');
                    return item;
                }
                return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
            }
            return item;
        }).filter(Boolean));
    };

    const finalTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    const handleCompleteSale = async () => {
        if (cart.length === 0) { showSnackbar("Cart is empty.", 'warning'); return; }
        if (!officialReceiptId) { showSnackbar("Please enter the Official Receipt ID.", 'warning'); return; }

        setIsLoading(true);
        try {
            await api.createOrder({ cart, customerName, officialReceiptNo: officialReceiptId, source: 'pos' });
            showSnackbar("Sale completed successfully!", 'success');
            setCart([]);
            setCustomerName('Walk-in');
            setOfficialReceiptId('');
            fetchProducts();
        } catch (error) {
            showSnackbar(`Sale failed: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">Point of Sale</Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} md={7} lg={8}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 4, height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
                        <TextField fullWidth placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ mb: 2 }} />
                        {productsLoading ? <LoadingSpinner /> : (
                            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                                <Grid container spacing={2}>
                                    {filteredProducts.map(product => (
                                        <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                                            <Card onClick={() => product.stock > 0 && addToCart(product)} sx={{ cursor: product.stock > 0 ? 'pointer' : 'not-allowed', position: 'relative', opacity: product.stock === 0 ? 0.6 : 1 }}>
                                                {product.stock === 0 && <Chip label="Out of Stock" color="error" size="small" sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }} />}
                                                <CardMedia component="img" height="140" image={`${API_BASE_URL}${product.image_url}`} alt={product.name} onError={(e) => e.target.src = 'https://placehold.co/200x140?text=No+Image'} />
                                                <CardContent sx={{ p: 1.5 }}>
                                                    <Typography gutterBottom variant="body2" component="div" noWrap fontWeight="500">{product.name}</Typography>
                                                    <Typography variant="body2" color="text.secondary">Stock: {product.stock}</Typography>
                                                    <Typography variant="h6" color="primary" fontWeight="bold">₱{product.price.toFixed(2)}</Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        )}
                    </Paper>
                </Grid>
                <Grid item xs={12} md={5} lg={4}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 4, height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h5" gutterBottom fontWeight="bold">Current Sale</Typography>
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', my: 2 }}>
                            {cart.length === 0 ? (
                                <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'text.secondary' }}>
                                    <ShoppingCart sx={{ fontSize: 60, mb: 1 }} />
                                    <Typography>Your cart is empty</Typography>
                                </Box>
                            ) : cart.map(item => (
                                <Card key={item.id} variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 1, mb: 1 }}>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography fontWeight="500">{item.name}</Typography>
                                        <Typography variant="body2" color="text.secondary">₱{item.price.toFixed(2)}</Typography>
                                    </Box>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <IconButton size="small" onClick={() => updateQuantity(item.id, -1)}><RemoveCircleOutline /></IconButton>
                                        <Typography>{item.quantity}</Typography>
                                        <IconButton size="small" onClick={() => updateQuantity(item.id, 1)}><AddCircleOutline /></IconButton>
                                    </Stack>
                                    <Typography sx={{ width: 80, textAlign: 'right', fontWeight: 'bold' }}>₱{(item.price * item.quantity).toFixed(2)}</Typography>
                                </Card>
                            ))}
                        </Box>
                        <Divider />
                        <Box sx={{ pt: 2 }}>
                            <TextField fullWidth label="Official Receipt ID *" value={officialReceiptId} onChange={e => setOfficialReceiptId(e.target.value)} sx={{ mb: 2 }} />
                            <TextField fullWidth label="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} sx={{ mb: 2 }} />
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ my: 2 }}>
                                <Typography variant="h5" fontWeight="bold">Total:</Typography>
                                <Typography variant="h5" fontWeight="bold" color="primary">₱{finalTotal.toFixed(2)}</Typography>
                            </Stack>
                            <Button fullWidth variant="contained" size="large" onClick={handleCompleteSale} disabled={isLoading || cart.length === 0}>
                                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Complete Sale'}
                            </Button>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

// --- PRODUCT MANAGEMENT ---
const ProductManagement = ({ showSnackbar }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [deletingProduct, setDeletingProduct] = useState(null);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getProducts();
            setProducts(data);
        } catch (error) {
            showSnackbar("Failed to fetch products: " + error.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const handleAddProduct = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingProduct) return;
        try {
            await api.deleteProduct(deletingProduct.id);
            showSnackbar("Product deleted successfully.", 'success');
            fetchProducts();
        } catch (error) {
            showSnackbar(`Failed to delete product: ${error.message}`, 'error');
        } finally {
            setDeletingProduct(null);
        }
    };

    const ProductModal = ({ product, onClose, onSave }) => {
        const [name, setName] = useState(product?.name || '');
        const [description, setDescription] = useState(product?.description || '');
        const [price, setPrice] = useState(product?.price || '');
        const [image, setImage] = useState(null);
        const [isSaving, setIsSaving] = useState(false);
        const [modalError, setModalError] = useState('');

        const handleSubmit = async (e) => {
            e.preventDefault();
            setIsSaving(true);
            setModalError('');
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);
            formData.append('price', price);
            if (image) formData.append('image', image);

            try {
                if (product) {
                    await api.updateProduct(product.id, formData);
                } else {
                    await api.addProduct(formData);
                }
                onSave();
            } catch (error) {
                setModalError(`Failed to save product: ${error.message}`);
            } finally {
                setIsSaving(false);
            }
        };

        return (
            <Dialog open onClose={onClose} fullWidth maxWidth="sm">
                <DialogTitle fontWeight="bold">{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                <DialogContent>
                    {modalError && <Alert severity="error" sx={{ mb: 2 }}>{modalError}</Alert>}
                    <TextField autoFocus margin="dense" label="Name *" fullWidth value={name} onChange={e => setName(e.target.value)} required />
                    <TextField margin="dense" label="Description" fullWidth multiline rows={4} value={description} onChange={e => setDescription(e.target.value)} />
                    <TextField margin="dense" label="Price (₱) *" fullWidth type="number" inputProps={{ step: "0.01" }} value={price} onChange={e => setPrice(e.target.value)} required />
                    <Button variant="outlined" component="label" startIcon={<ImageIcon />} sx={{ mt: 2 }}>
                        Upload Image
                        <input type="file" hidden onChange={e => setImage(e.target.files[0])} accept="image/*" />
                    </Button>
                    {image && <Typography variant="body2" sx={{ mt: 1 }}>{image.name}</Typography>}
                </DialogContent>
                <DialogActions sx={{ p: '0 24px 16px' }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" disabled={isSaving}>
                        {isSaving ? <CircularProgress size={24} /> : 'Save Product'}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };

    return (
        <Box>
            {isModalOpen && <ProductModal product={editingProduct} onClose={() => setIsModalOpen(false)} onSave={() => { setIsModalOpen(false); fetchProducts(); showSnackbar(`Product ${editingProduct ? 'updated' : 'added'} successfully!`, 'success'); }} />}
            <ConfirmDialog open={!!deletingProduct} title="Delete Product" message={`Are you sure you want to delete "${deletingProduct?.name}"? This action cannot be undone.`} onConfirm={handleConfirmDelete} onCancel={() => setDeletingProduct(null)} />
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" fontWeight="bold">Product Management</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={handleAddProduct}>Add Product</Button>
            </Stack>
            <Paper elevation={0} sx={{ borderRadius: 4 }}>
                {loading ? <LoadingSpinner /> : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Image</TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Price</TableCell>
                                    <TableCell>Stock</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {products.map(p => (
                                    <TableRow key={p.id} hover>
                                        <TableCell><Avatar variant="rounded" src={`${API_BASE_URL}${p.image_url}`} alt={p.name} sx={{ width: 56, height: 56 }} /></TableCell>
                                        <TableCell sx={{ fontWeight: '500' }}>{p.name}</TableCell>
                                        <TableCell>₱{p.price.toFixed(2)}</TableCell>
                                        <TableCell>{p.stock}</TableCell>
                                        <TableCell>
                                            <IconButton size="small" onClick={() => handleEditProduct(p)}><Edit /></IconButton>
                                            <IconButton size="small" color="error" onClick={() => setDeletingProduct(p)}><Delete /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
};

// --- INVENTORY MANAGEMENT ---
const InventoryManagement = ({ showSnackbar }) => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);

    const fetchInventory = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getInventory();
            setInventory(data);
        } catch (error) {
            showSnackbar("Failed to fetch inventory: " + error.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => { fetchInventory(); }, [fetchInventory]);

    const StockModal = ({ item, onClose, onSave }) => {
        const [newStock, setNewStock] = useState(item?.stock_quantity || 0);
        const [isSaving, setIsSaving] = useState(false);

        const handleSubmit = async (e) => {
            e.preventDefault();
            setIsSaving(true);
            try {
                await api.updateStock(item.product_id, newStock);
                onSave();
            } catch (error) {
                showSnackbar(`Failed to update stock: ${error.message}`, 'error');
            } finally {
                setIsSaving(false);
            }
        };

        return (
            <Dialog open onClose={onClose}>
                <DialogTitle fontWeight="bold">Update Stock for {item.name}</DialogTitle>
                <DialogContent>
                    <Typography>Current Stock: <strong>{item.stock_quantity}</strong></Typography>
                    <TextField autoFocus margin="dense" label="New Stock Quantity" type="number" fullWidth value={newStock} onChange={e => setNewStock(parseInt(e.target.value, 10))} required min="0" />
                </DialogContent>
                <DialogActions sx={{ p: '0 24px 16px' }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" disabled={isSaving}>
                        {isSaving ? <CircularProgress size={24} /> : 'Update Stock'}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };

    const getStatusChip = (status) => {
        const colorMap = { 'In Stock': 'success', 'Low Stock': 'warning', 'Out of Stock': 'error' };
        return <Chip label={status} color={colorMap[status]} size="small" />;
    };

    return (
        <Box>
            {editingItem && <StockModal item={editingItem} onClose={() => setEditingItem(null)} onSave={() => { setEditingItem(null); fetchInventory(); showSnackbar('Stock updated successfully!', 'success'); }} />}
            <Typography variant="h4" gutterBottom fontWeight="bold">Inventory</Typography>
            <Paper elevation={0} sx={{ borderRadius: 4 }}>
                {loading ? <LoadingSpinner /> : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Product Name</TableCell>
                                    <TableCell>Current Stock</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {inventory.map(item => (
                                    <TableRow key={item.product_id} hover>
                                        <TableCell sx={{ fontWeight: '500' }}>{item.name}</TableCell>
                                        <TableCell>{item.stock_quantity}</TableCell>
                                        <TableCell>{getStatusChip(item.status)}</TableCell>
                                        <TableCell>
                                            <Button variant="outlined" size="small" onClick={() => setEditingItem(item)}>Update Stock</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
};

// --- ORDER MANAGEMENT ---
const OrderManagement = ({ showSnackbar }) => {
    const [orders, setOrders] = useState([]);
    const [discounts, setDiscounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [viewingReceipt, setViewingReceipt] = useState(null);
    const [selectedDiscountId, setSelectedDiscountId] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersData, discountsData] = await Promise.all([api.getOrders(), api.getDiscounts()]);
            setOrders(ordersData);
            setDiscounts(discountsData);
        } catch (error) {
            showSnackbar("Failed to fetch data: " + error.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const toggleOrderDetails = async (orderId) => {
        const isCurrentlyExpanded = expandedOrderId === orderId;
        setExpandedOrderId(isCurrentlyExpanded ? null : orderId);
        if (!isCurrentlyExpanded) {
            const order = orders.find(o => o.id === orderId);
            setSelectedDiscountId(order.discount_id || '');
            if (!order.items) {
                try {
                    const details = await api.getOrderDetails(orderId);
                    setOrders(current => current.map(o => o.id === orderId ? { ...o, ...details } : o));
                } catch (error) {
                    showSnackbar('Failed to fetch order details.', 'error');
                }
            }
        }
    };

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await api.updateOrderStatus(orderId, newStatus);
            setOrders(current => current.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            showSnackbar("Order status updated!", 'success');
        } catch (error) {
            showSnackbar(`Failed to update status: ${error.message}`, 'error');
            fetchData();
        }
    };

    const handleApplyDiscount = async (orderId) => {
        if (!selectedDiscountId) { showSnackbar("Please select a discount.", 'warning'); return; }
        try {
            await api.applyDiscountToOrder(orderId, selectedDiscountId);
            showSnackbar("Discount applied successfully!", 'success');
            fetchData();
        } catch (error) {
            showSnackbar(`Failed to apply discount: ${error.message}`, 'error');
        }
    };
    
    const handleViewReceipt = async (e, order) => {
        e.stopPropagation();
        try {
            const details = await api.getOrderDetails(order.id);
            setViewingReceipt({ ...order, ...details });
        } catch (err) {
            showSnackbar("Could not load receipt details.", 'error');
        }
    };

    const ReceiptModal = ({ order, onClose }) => {
        const receiptRef = useRef();
        const handlePrint = () => {
            const printContent = receiptRef.current.innerHTML;
            const printWindow = window.open('', '', 'height=600,width=800');
            printWindow.document.write('<html><head><title>Print Receipt</title><style>body{font-family: "Courier New", monospace; margin: 20px; font-size: 12px;} .receipt{text-align: center; max-width: 300px; margin: auto;} table{width: 100%; border-collapse: collapse; margin-top: 15px;} th, td{text-align: left; padding: 4px; border-bottom: 1px dotted #555;} .receipt-totals{text-align: right; margin-top: 15px;} .receipt-footer{margin-top: 20px; font-style: italic;}</style></head><body>');
            printWindow.document.write(printContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        };
        const subtotal = (order.items || []).reduce((acc, item) => acc + (item.price_per_unit * item.quantity), 0);
        return (
            <Dialog open onClose={onClose}>
                <DialogTitle>Receipt for Order #{order.id}</DialogTitle>
                <DialogContent>
                    <Box ref={receiptRef} className="receipt">
                        <Typography variant="h6" component="h3">Bughaw Multi-line Corp.</Typography>
                        <Typography>Official Receipt</Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography><strong>Order ID:</strong> {order.id}</Typography>
                        <Typography><strong>O.R. No.:</strong> {order.official_receipt_no || 'N/A'}</Typography>
                        <Typography><strong>Date:</strong> {new Date(order.order_date).toLocaleString()}</Typography>
                        <Typography><strong>Cashier:</strong> {order.agent_name}</Typography>
                        <Typography><strong>Customer:</strong> {order.customer_name || 'Walk-in'}</Typography>
                        <Table size="small" sx={{ my: 2 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Item</TableCell><TableCell>Qty</TableCell><TableCell>Price</TableCell><TableCell>Total</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(order.items || []).map((item, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{item.name}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>₱{parseFloat(item.price_per_unit).toFixed(2)}</TableCell><TableCell>₱{(item.quantity * item.price_per_unit).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Box className="receipt-totals">
                            <Typography><strong>Subtotal:</strong> ₱{subtotal.toFixed(2)}</Typography>
                            <Typography><strong>Discount:</strong> -₱{parseFloat(order.discount || 0).toFixed(2)}</Typography>
                            <Typography variant="h6"><strong>Total:</strong> ₱{parseFloat(order.total_amount).toFixed(2)}</Typography>
                        </Box>
                        <Typography className="receipt-footer" sx={{ mt: 2 }}>Thank you for your purchase!</Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Close</Button>
                    <Button onClick={handlePrint} variant="contained" startIcon={<Print />}>Print</Button>
                </DialogActions>
            </Dialog>
        );
    };

    return (
        <Box>
            {viewingReceipt && <ReceiptModal order={viewingReceipt} onClose={() => setViewingReceipt(null)} />}
            <Typography variant="h4" gutterBottom fontWeight="bold">Order Management</Typography>
            <Paper elevation={0} sx={{ borderRadius: 4 }}>
                {loading ? <LoadingSpinner /> : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Order ID</TableCell><TableCell>Agent</TableCell><TableCell>Source</TableCell><TableCell>Total</TableCell><TableCell>Date</TableCell><TableCell>Status</TableCell><TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {orders.map(order => (
                                    <React.Fragment key={order.id}>
                                        <TableRow hover onClick={() => toggleOrderDetails(order.id)} sx={{ cursor: 'pointer' }}>
                                            <TableCell>#{order.id}</TableCell>
                                            <TableCell>{order.agent_name}</TableCell>
                                            <TableCell><Chip label={order.source} size="small" /></TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>₱{order.total_amount.toFixed(2)}</TableCell>
                                            <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                                    <Select value={order.status} onChange={(e) => handleStatusChange(order.id, e.target.value)} onClick={e => e.stopPropagation()}>
                                                        {['Pending', 'Received', 'For Printing', 'For Payment', 'For Delivery', 'Delivered', 'Cancelled'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                                    </Select>
                                                </FormControl>
                                            </TableCell>
                                            <TableCell><Button size="small" variant="outlined" onClick={(e) => handleViewReceipt(e, order)}>View Receipt</Button></TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                                                <Collapse in={expandedOrderId === order.id} timeout="auto" unmountOnExit>
                                                    <Box sx={{ margin: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                                                        {orders.find(o => o.id === order.id)?.items ? (
                                                            <>
                                                                <Typography variant="h6" gutterBottom>Details for Order #{order.id}</Typography>
                                                                <List dense>
                                                                    {orders.find(o => o.id === order.id).items.map((item, i) => <ListItem key={i}>{item.quantity}x {item.name} @ ₱{parseFloat(item.price_per_unit).toFixed(2)}</ListItem>)}
                                                                </List>
                                                                <Divider sx={{ my: 2 }} />
                                                                <Typography variant="subtitle1" gutterBottom>Apply Discount</Typography>
                                                                <Typography variant="body2">Current Discount: ₱{parseFloat(order.discount || 0).toFixed(2)}</Typography>
                                                                <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                                                                    <FormControl fullWidth size="small">
                                                                        <InputLabel>Discount</InputLabel>
                                                                        <Select value={selectedDiscountId} label="Discount" onChange={e => setSelectedDiscountId(e.target.value)}>
                                                                            <MenuItem value=""><em>None</em></MenuItem>
                                                                            {discounts.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                                                                        </Select>
                                                                    </FormControl>
                                                                    <Button variant="contained" onClick={() => handleApplyDiscount(order.id)}>Apply</Button>
                                                                </Stack>
                                                            </>
                                                        ) : <LoadingSpinner />}
                                                    </Box>
                                                </Collapse>
                                            </TableCell>
                                        </TableRow>
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
};

// --- DISCOUNT MANAGEMENT ---
const DiscountManagement = ({ showSnackbar }) => {
    const [discounts, setDiscounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchDiscounts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getDiscounts();
            setDiscounts(data);
        } catch (error) {
            showSnackbar("Failed to fetch discounts: " + error.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => { fetchDiscounts(); }, [fetchDiscounts]);

    const DiscountModal = ({ onClose, onSave }) => {
        const [name, setName] = useState('');
        const [type, setType] = useState('PERCENTAGE');
        const [value, setValue] = useState('');
        const [isSaving, setIsSaving] = useState(false);
        const [modalError, setModalError] = useState('');

        const handleSubmit = async (e) => {
            e.preventDefault();
            setIsSaving(true);
            setModalError('');
            try {
                await api.addDiscount({ name, type, value: parseFloat(value) });
                onSave();
            } catch (error) {
                setModalError(`Failed to save discount: ${error.message}`);
            } finally {
                setIsSaving(false);
            }
        };

        return (
            <Dialog open onClose={onClose} fullWidth maxWidth="sm">
                <DialogTitle fontWeight="bold">Add New Discount</DialogTitle>
                <DialogContent>
                    {modalError && <Alert severity="error" sx={{ mb: 2 }}>{modalError}</Alert>}
                    <TextField autoFocus margin="dense" label="Discount Name *" fullWidth value={name} onChange={e => setName(e.target.value)} required />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Discount Type *</InputLabel>
                        <Select value={type} label="Discount Type *" onChange={e => setType(e.target.value)}>
                            <MenuItem value="PERCENTAGE">Percentage (%)</MenuItem>
                            <MenuItem value="FIXED_AMOUNT">Fixed Amount (₱)</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField margin="dense" label="Value *" fullWidth type="number" value={value} onChange={e => setValue(e.target.value)} required />
                </DialogContent>
                <DialogActions sx={{ p: '0 24px 16px' }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" disabled={isSaving}>
                        {isSaving ? <CircularProgress size={24} /> : 'Save Discount'}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };

    return (
        <Box>
            {isModalOpen && <DiscountModal onClose={() => setIsModalOpen(false)} onSave={() => { setIsModalOpen(false); fetchDiscounts(); showSnackbar('Discount added successfully!', 'success'); }} />}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" fontWeight="bold">Discount Management</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => setIsModalOpen(true)}>Add Discount</Button>
            </Stack>
            <Paper elevation={0} sx={{ borderRadius: 4 }}>
                {loading ? <LoadingSpinner /> : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell><TableCell>Type</TableCell><TableCell>Value</TableCell><TableCell>Status</TableCell><TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {discounts.map(d => (
                                    <TableRow key={d.id} hover>
                                        <TableCell sx={{ fontWeight: '500' }}>{d.name}</TableCell>
                                        <TableCell>{d.type}</TableCell>
                                        <TableCell>{d.type === 'PERCENTAGE' ? `${d.value}%` : `₱${d.value}`}</TableCell>
                                        <TableCell><Chip label={d.is_active ? 'Active' : 'Inactive'} color={d.is_active ? 'success' : 'default'} size="small" /></TableCell>
                                        <TableCell>
                                            <Button size="small" disabled>Edit</Button>
                                            <Button size="small" color="error" disabled>Delete</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
};

// --- USER MANAGEMENT ---
const UserManagement = ({ showSnackbar }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [deletingUser, setDeletingUser] = useState(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (error) {
            showSnackbar("Failed to fetch users: " + error.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleConfirmDelete = async () => {
        if (!deletingUser) return;
        try {
            await api.deleteUser(deletingUser.id);
            showSnackbar("User deleted successfully.", 'success');
            fetchUsers();
        } catch (error) {
            showSnackbar(`Failed to delete user: ${error.message}`, 'error');
        } finally {
            setDeletingUser(null);
        }
    };

    const UserModal = ({ user, onClose, onSave }) => {
        const [username, setUsername] = useState('');
        const [password, setPassword] = useState('');
        const [role, setRole] = useState(user?.role || 'Agent');
        const [permissions, setPermissions] = useState(user?.permissions || []);
        const [isSaving, setIsSaving] = useState(false);
        const [modalError, setModalError] = useState('');
        const allPermissions = useMemo(() => ['pos', 'dashboard', 'products', 'inventory', 'orders', 'discounts'], []);

        const handlePermissionChange = (p) => setPermissions(current => current.includes(p) ? current.filter(i => i !== p) : [...current, p]);

        const handleSubmit = async (e) => {
            e.preventDefault();
            setIsSaving(true);
            setModalError('');
            try {
                if (user) {
                    await api.updateUser(user.id, { role, permissions });
                } else {
                    if (!password) { setModalError('Password is required for new users.'); setIsSaving(false); return; }
                    await api.addUser({ username, password, role });
                }
                onSave();
            } catch (error) {
                setModalError(`Failed to save user: ${error.message}`);
            } finally {
                setIsSaving(false);
            }
        };

        return (
            <Dialog open onClose={onClose} fullWidth maxWidth="sm">
                <DialogTitle fontWeight="bold">{user ? `Edit ${user.username}` : 'Add New User'}</DialogTitle>
                <DialogContent>
                    {modalError && <Alert severity="error" sx={{ mb: 2 }}>{modalError}</Alert>}
                    {!user && (
                        <>
                            <TextField autoFocus margin="dense" label="Username" fullWidth value={username} onChange={e => setUsername(e.target.value)} required />
                            <TextField margin="dense" label="Password" type="password" fullWidth value={password} onChange={e => setPassword(e.target.value)} required />
                        </>
                    )}
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Role</InputLabel>
                        <Select value={role} label="Role" onChange={e => setRole(e.target.value)}>
                            <MenuItem value="Agent">Agent</MenuItem>
                            <MenuItem value="Admin">Admin</MenuItem>
                        </Select>
                    </FormControl>
                    {user && (
                        <Box mt={2}>
                            <Typography>Permissions</Typography>
                            <Grid container>
                                {allPermissions.map(p => (
                                    <Grid item xs={6} key={p}>
                                        <FormControlLabel control={<Button size="small" variant={permissions.includes(p) ? 'contained' : 'outlined'} onClick={() => handlePermissionChange(p)} sx={{mr:1, mb:1}}>{p}</Button>} label="" />
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: '0 24px 16px' }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" disabled={isSaving}>
                        {isSaving ? <CircularProgress size={24} /> : (user ? 'Update User' : 'Create User')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };

    return (
        <Box>
            {isModalOpen && <UserModal user={editingUser} onClose={() => setIsModalOpen(false)} onSave={() => { setIsModalOpen(false); fetchUsers(); showSnackbar(`User ${editingUser ? 'updated' : 'added'} successfully!`, 'success'); }} />}
            <ConfirmDialog open={!!deletingUser} title="Delete User" message={`Are you sure you want to delete user "${deletingUser?.username}"?`} onConfirm={handleConfirmDelete} onCancel={() => setDeletingUser(null)} />
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" fontWeight="bold">User Management</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => { setEditingUser(null); setIsModalOpen(true); }}>Add User</Button>
            </Stack>
            <Paper elevation={0} sx={{ borderRadius: 4 }}>
                {loading ? <LoadingSpinner /> : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Username</TableCell><TableCell>Role</TableCell><TableCell>Permissions</TableCell><TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.map(user => (
                                    <TableRow key={user.id} hover>
                                        <TableCell sx={{ fontWeight: '500' }}>{user.username}</TableCell>
                                        <TableCell><Chip label={user.role} color={user.role === 'Admin' ? 'primary' : 'default'} size="small" /></TableCell>
                                        <TableCell><Box sx={{display:'flex', flexWrap:'wrap', gap:0.5}}>{user.permissions.map(p => <Chip key={p} label={p} size="small" variant="outlined" />)}</Box></TableCell>
                                        <TableCell>
                                            <IconButton size="small" onClick={() => { setEditingUser(user); setIsModalOpen(true); }}><Edit /></IconButton>
                                            <IconButton size="small" color="error" onClick={() => setDeletingUser(user)}><Delete /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
};

// --- CHANGE PASSWORD MODAL ---
const ChangePasswordModal = ({ open, onClose, showSnackbar }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) { setError("New passwords do not match."); return; }
        if (newPassword.length < 6) { setError("New password must be at least 6 characters long."); return; }
        setIsSaving(true);
        try {
            const result = await api.changePassword({ currentPassword, newPassword });
            showSnackbar(result.message, 'success');
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle fontWeight="bold">Change Password</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <TextField margin="dense" label="Current Password" type="password" fullWidth value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                <TextField margin="dense" label="New Password" type="password" fullWidth value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                <TextField margin="dense" label="Confirm New Password" type="password" fullWidth value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </DialogContent>
            <DialogActions sx={{ p: '0 24px 16px' }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={isSaving}>
                    {isSaving ? <CircularProgress size={24} /> : 'Update Password'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// --- MAIN LAYOUT & APP ---
const drawerWidth = 300;

const MainLayout = ({ user, onLogout, showSnackbar }) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activeView, setActiveView] = useState('sales');
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

    const navItems = useMemo(() => [
        { id: 'sales', label: 'Dashboard', icon: <Dashboard />, permission: 'dashboard' },
        { id: 'pos', label: 'Point of Sale', icon: <PointOfSale />, permission: 'pos' },
        { id: 'products', label: 'Products', icon: <Inventory />, permission: 'products' },
        { id: 'inventory', label: 'Inventory', icon: <ShoppingBag />, permission: 'inventory' },
        { id: 'orders', label: 'Orders', icon: <Receipt />, permission: 'orders' },
        { id: 'discounts', label: 'Discounts', icon: <LocalOffer />, permission: 'discounts' },
        { id: 'users', label: 'Users', icon: <People />, role: 'Super Admin' },
    ], []);

    const hasAccess = useCallback((item) => {
        if (user.role === 'Super Admin') return true;
        if (item.role) return user.role === item.role;
        if (item.permission) return user.permissions?.includes(item.permission);
        return false;
    }, [user]);

    useEffect(() => {
        const firstAccessibleView = navItems.find(hasAccess);
        if (firstAccessibleView && !hasAccess(navItems.find(item => item.id === activeView))) {
            setActiveView(firstAccessibleView.id);
        }
    }, [user, activeView, navItems, hasAccess]);

    const renderView = () => {
        const props = { showSnackbar };
        switch (activeView) {
            case 'sales': return <SalesDashboard {...props} />;
            case 'pos': return <PointOfSaleScreen {...props} />;
            case 'products': return <ProductManagement {...props} />;
            case 'inventory': return <InventoryManagement {...props} />;
            case 'orders': return <OrderManagement {...props} />;
            case 'discounts': return <DiscountManagement {...props} />;
            case 'users': return <UserManagement {...props} />;
            default: return hasAccess(navItems[0]) ? <SalesDashboard {...props} /> : <Typography>You do not have permission to view any pages.</Typography>;
        }
    };

    const drawerContent = (
        <div>
            <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}><Store /></Avatar>
                <Typography variant="h6" noWrap component="div" fontWeight="bold">Bughaw</Typography>
            </Toolbar>
            <Divider />
            <List>
                {navItems.filter(hasAccess).map((item) => (
                    <ListItem key={item.id} disablePadding>
                        <ListItemButton selected={activeView === item.id} onClick={() => { setActiveView(item.id); if(mobileOpen) handleDrawerToggle(); }}>
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.label} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Box sx={{ p: 1, position: 'absolute', bottom: 0, width: '93%' }}>
                <Divider sx={{ mb: 2 }} />
                <Typography>Welcome, <strong>{user.username}</strong></Typography>
                <Typography variant="body2" color="text.secondary">{user.role}</Typography>
                <Stack direction="row" spacing={1} mt={1}>
                    <Button fullWidth variant="outlined" size="small" onClick={() => setIsPasswordModalOpen(true)}>Password</Button>
                    <Button fullWidth variant="contained" size="small" color="error" onClick={onLogout}>Logout</Button>
                </Stack>
            </Box>
        </div>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <ChangePasswordModal open={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} showSnackbar={showSnackbar} />
            <AppBar position="fixed" sx={{ width: { sm: `calc(100% - ${drawerWidth}px)` }, ml: { sm: `${drawerWidth}px` }, bgcolor: 'background.paper', color: 'text.primary', boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Toolbar>
                    <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}><MenuIcon /></IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>{navItems.find(i => i.id === activeView)?.label}</Typography>
                </Toolbar>
            </AppBar>
            <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
                <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}>
                    {drawerContent}
                </Drawer>
                <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }} open>
                    {drawerContent}
                </Drawer>
            </Box>
            <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, bgcolor: 'background.default', minHeight: '100vh' }}>
                <Toolbar />
                {renderView()}
            </Box>
        </Box>
    );
};

function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('bughaw_user') || 'null');
        const storedToken = localStorage.getItem('bughaw_token');
        if (storedUser && storedToken) {
            setUser(storedUser);
            setToken(storedToken);
        }
        setIsAuthReady(true);
    }, []);

    const handleLoginSuccess = (newToken, newUser) => {
        localStorage.setItem('bughaw_token', newToken);
        localStorage.setItem('bughaw_user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    };

    const handleLogout = () => {
        localStorage.removeItem('bughaw_token');
        localStorage.removeItem('bughaw_user');
        setToken(null);
        setUser(null);
    };

    const showSnackbar = (message, severity = 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar({ ...snackbar, open: false });
    };

    if (!isAuthReady) {
        return <ThemeProvider theme={theme}><LoadingSpinner /></ThemeProvider>;
    }

    return (
        <ThemeProvider theme={theme}>
            <AppSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={handleSnackbarClose} />
            {!token || !user ? (
                <AuthScreen onLoginSuccess={handleLoginSuccess} />
            ) : (
                <MainLayout user={user} onLogout={handleLogout} showSnackbar={showSnackbar} />
            )}
        </ThemeProvider>
    );
}

export default App;