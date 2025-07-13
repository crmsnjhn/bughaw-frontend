import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    Grid, Box, Paper, Button, Dialog, DialogTitle, DialogContent, TextField, Autocomplete, DialogActions,
    CircularProgress, Typography, FormControl, InputLabel, Select, MenuItem,
    Stack, Card, CardContent, Chip, IconButton, Divider, Alert
} from '@mui/material';
import { Delete, PersonAdd, Save, Block, Print, Receipt } from '@mui/icons-material';
import { api, getApiBaseUrl } from '../../api/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const PointOfSaleScreen = ({ showSnackbar, user }) => {
    // --- Refs for Keyboard Navigation ---
    const customerAutocompleteRef = useRef(null);
    const productSearchRef = useRef(null);
    const cashReceivedRef = useRef(null);

    // --- State Declarations ---
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [discounts, setDiscounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const API_BASE_URL = getApiBaseUrl();
    const [customerPending, setCustomerPending] = useState(null);

    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerDetails, setCustomerDetails] = useState({ id: null, name: '', address: '', contact_number_1: '', price_level_id: '' });

    const [cart, setCart] = useState([]);
    const [rawCart, setRawCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCalculating, setIsCalculating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentType, setPaymentType] = useState('COD');
    const [cashReceived, setCashReceived] = useState(0);
    const [justAddedProductId, setJustAddedProductId] = useState(null);
    const [modalStep, setModalStep] = useState('closed');

    // --- Data Fetching ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [customersData, productsData, discountsData] = await Promise.all([
                    api.getCustomers(), api.getProducts({ pageSize: 10000 }), api.getDiscounts()
                ]);
                setCustomers(customersData);
                setProducts(productsData.rows.map(p => ({ ...p, price: Number(p.price) })));
                setDiscounts(discountsData);
            } catch (err) {
                showSnackbar("Failed to load POS data.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [showSnackbar]);

    // --- Price Calculation ---
    const calculatePrices = useCallback(async () => {
        if (rawCart.length === 0) { setCart([]); return; }
        setIsCalculating(true);
        try {
            const pricedCart = await api.calculatePrices({ cart: rawCart, customer_id: customerDetails.id });
            setCart(pricedCart);
        } catch (error) {
            showSnackbar("Could not calculate prices.", "error");
        } finally {
            setIsCalculating(false);
        }
    }, [rawCart, customerDetails.id, showSnackbar]);

    useEffect(() => {
        const timer = setTimeout(() => { calculatePrices(); }, 300);
        return () => clearTimeout(timer);
    }, [rawCart, calculatePrices]);

    // --- Event Handlers ---
    const handleCustomerSelect = async (event, value) => {
        setSelectedCustomer(value);
        setCustomerPending(null);
        if (value) {
            try {
                const pendingStatus = await api.checkCustomerPending(value.id);
                if (pendingStatus.has_pending) {
                    setCustomerPending(pendingStatus.order_info);
                    showSnackbar(`Customer has a pending payment for Order #: ${pendingStatus.order_info.invoice_no}`, "warning");
                }
            } catch { showSnackbar("Could not verify customer payment status.", "error"); }
            const priceLevel = (user.role === 'Admin' && !user.is_main_branch) ? '' : (value.price_level_id || '');
            setCustomerDetails({ id: value.id, name: value.name, address: value.address || '', contact_number_1: value.contact_number_1 || '', price_level_id: priceLevel });
            // Move focus to product search
            setTimeout(() => productSearchRef.current?.focus(), 100);
        } else {
            handleClearCustomer();
        }
    };

    const handleCustomerDetailChange = (e) => setCustomerDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleClearCustomer = () => {
        setSelectedCustomer(null);
        setCustomerDetails({ id: null, name: '', address: '', contact_number_1: '', price_level_id: '' });
        setCustomerPending(null);
        setTimeout(() => customerAutocompleteRef.current?.focus(), 100);
    };

    const addToCart = (productToAdd) => {
        if (!productToAdd || typeof productToAdd !== 'object') return;
        if (productToAdd.stock <= 0) return showSnackbar(`${productToAdd.name} is out of stock.`, 'warning');
        setJustAddedProductId(productToAdd.id);
        setTimeout(() => setJustAddedProductId(null), 500);
        setRawCart(currentCart => {
            const existingItem = currentCart.find(item => item.id === productToAdd.id);
            if (existingItem) {
                if (existingItem.quantity >= productToAdd.stock) {
                    showSnackbar(`Cannot add more ${productToAdd.name}. Stock limit reached.`, 'warning');
                    return currentCart;
                }
                return currentCart.map(item => item.id === productToAdd.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...currentCart, { ...productToAdd, quantity: 1, discount: 0 }];
        });
        setSearchTerm('');
        // Clear the input and return focus
        if (productSearchRef.current) {
            const input = productSearchRef.current.querySelector('input');
            if (input) {
                input.value = '';
                input.focus();
            }
        }
    };

    const updateCartItem = (productId, field, value) => {
        setRawCart(currentCart => currentCart.map(item => {
            if (item.id === productId) {
                const newQuantity = field === 'quantity' ? parseInt(value) || 1 : item.quantity;
                if (newQuantity > item.stock) {
                    showSnackbar(`Quantity cannot exceed stock (${item.stock}).`, 'warning');
                    return { ...item, quantity: item.stock };
                }
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const removeFromCart = (productId) => setRawCart(currentCart => currentCart.filter(item => item.id !== productId));
    
    const handleCheckout = () => {
        if (!customerDetails.name) return showSnackbar("Customer name is required.", "warning");
        if (cart.length === 0) return showSnackbar("Cannot checkout with an empty cart.", "warning");
        if (customerPending && paymentType !== 'COD') return showSnackbar(`Pending payment for Order #: ${customerPending.invoice_no}. Only COD is allowed.`, "error");
        setModalStep('initial');
    };
    
    // Focus cash input when payment modal opens
    useEffect(() => {
        if (modalStep === 'initial' && paymentType === 'COD') {
            setTimeout(() => cashReceivedRef.current?.focus(), 100);
        }
    }, [modalStep, paymentType]);

    const handleCompleteSale = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                customer: customerDetails,
                cart: cart.map(item => ({ id: item.id, quantity: item.quantity, price: item.originalPrice, discount_per_unit: item.discount || 0 })),
                payment_type: paymentType, cash_received: cashReceived, source: 'pos',
            };
            await api.createOrder(payload);
            showSnackbar("Order created successfully!", "success");
            if (paymentType === 'COD') setModalStep('final_options'); else resetPosState();
        } catch (error) {
            showSnackbar(error.response?.data?.message || "Failed to create order.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const resetPosState = () => {
        handleClearCustomer();
        setRawCart([]); setCart([]); setModalStep('closed'); setPaymentType('COD'); setCashReceived(0);
    };

    const finalTotal = useMemo(() => cart.reduce((total, item) => total + (item.finalPrice * item.quantity), 0), [cart]);
    const filteredProducts = useMemo(() => searchTerm ? products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) : products.slice(0, 10), [products, searchTerm]);
    const isCheckoutDisabled = isCalculating || cart.length === 0 || !customerDetails.name || (customerPending && paymentType !== 'COD');

    if (isLoading) return <LoadingSpinner />;

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight="bold">Customer Details</Typography>
                    <Button size="small" variant="outlined" startIcon={<PersonAdd />} onClick={handleClearCustomer}>New Customer</Button>
                </Stack>
                {customerPending && (<Alert severity="warning" icon={<Block fontSize="inherit" />} sx={{ mb: 2 }}>This customer has a pending payment for Order # **{customerPending.invoice_no}**. Only COD payment is allowed.</Alert>)}
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}><Autocomplete id="customer-autocomplete" options={customers} getOptionLabel={(o) => `${o.name} (${o.customer_code})`} value={selectedCustomer} onChange={handleCustomerSelect} renderInput={(params) => <TextField {...params} label="Search Existing Customer" autoFocus inputRef={customerAutocompleteRef} />} /></Grid>
                    <Grid item xs={12} md={4}><TextField name="name" label="Customer Name *" fullWidth value={customerDetails.name} onChange={handleCustomerDetailChange} /></Grid>
                    <Grid item xs={12} md={4}><TextField name="contact_number_1" label="Contact Number" fullWidth value={customerDetails.contact_number_1} onChange={handleCustomerDetailChange} /></Grid>
                    <Grid item xs={12}><TextField name="address" label="Address" fullWidth value={customerDetails.address} onChange={handleCustomerDetailChange} /></Grid>
                    <Grid item xs={12} md={4}><FormControl fullWidth><InputLabel>Price Level</InputLabel><Select name="price_level_id" value={customerDetails.price_level_id} label="Price Level" onChange={handleCustomerDetailChange} disabled={user.role === 'Admin' && !user.is_main_branch}><MenuItem value=""><em>COD (Default)</em></MenuItem>{discounts.map((d) => (<MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>))}</Select></FormControl></Grid>
                </Grid>
            </Paper>

            <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                    <Paper sx={{ p: 2, height: 'calc(100vh - 480px)', display: 'flex', flexDirection: 'column' }}>
                        <Autocomplete freeSolo options={filteredProducts} getOptionLabel={(o) => o.name || ''} onInputChange={(e, v) => setSearchTerm(v)} onChange={(e, v) => addToCart(v)} renderInput={(params) => <TextField {...params} placeholder="Search products..." inputRef={productSearchRef} />} sx={{ mb: 2 }} />
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}><Grid container spacing={2}>
                            {filteredProducts.map(p => (<Grid item xs={12} sm={6} md={4} key={p.id}><Card onClick={() => addToCart(p)} sx={{ cursor: 'pointer', height: '100%', position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s', transform: justAddedProductId === p.id ? 'scale(1.05)' : 'scale(1)', boxShadow: justAddedProductId === p.id ? 5 : 1, }}>
                                {p.stock <= 0 && <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', bgcolor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}><Chip label="Out of Stock" color="error" /></Box>}
                                <Box component="img" src={`${API_BASE_URL}${p.image_url}`} alt={p.name} sx={{ height: 120, width: '100%', objectFit: 'cover' }} onError={(e) => e.target.src = 'https://placehold.co/200x140?text=No+Image'} />
                                <CardContent sx={{ p: 1.5 }}><Typography gutterBottom variant="body2" noWrap fontWeight="500">{p.name}</Typography><Typography variant="h6" color="primary" fontWeight="bold">₱{p.price.toFixed(2)}</Typography></CardContent>
                            </Card></Grid>))}
                        </Grid></Box>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 2, height: 'calc(100vh - 480px)', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h5" gutterBottom fontWeight="bold">Current Sale {isCalculating && <CircularProgress size={20} sx={{ ml: 1 }} />}</Typography>
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', my: 2, pr: 1 }}>
                            {cart.length === 0 ? <Typography color="text.secondary">Cart is empty.</Typography> : cart.map(item => (
                                <Card key={item.id} variant="outlined" sx={{ p: 1.5, mb: 1.5, position: 'relative' }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography fontWeight="500">{item.name}</Typography><IconButton size="small" onClick={() => removeFromCart(item.id)}><Delete color="error" /></IconButton></Stack>
                                    <Grid container spacing={1} alignItems="center" mt={0.5}>
                                        <Grid item xs={6} sm={4}><TextField label="Qty" type="number" value={item.quantity} onChange={e => updateCartItem(item.id, 'quantity', e.target.value)} /></Grid>
                                        <Grid item xs={6} sm={4}><TextField label="Discount (₱)" type="number" value={item.discount} onChange={e => updateCartItem(item.id, 'discount', e.target.value)} /></Grid>
                                        <Grid item xs={12} sm={4} sx={{ textAlign: 'right' }}>
                                            {item.appliedDiscount && <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>₱{(item.originalPrice * item.quantity).toFixed(2)}</Typography>}
                                            <Typography variant="h6">₱{(item.finalPrice * item.quantity).toFixed(2)}</Typography>
                                        </Grid>
                                    </Grid>
                                </Card>
                            ))}
                        </Box>
                        <Divider />
                        <Box sx={{ pt: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ my: 1 }}><Typography variant="h5" fontWeight="bold">Total:</Typography><Typography variant="h5" fontWeight="bold" color="primary">₱{finalTotal.toFixed(2)}</Typography></Stack>
                            <Button fullWidth variant="contained" size="large" onClick={handleCheckout} disabled={isCheckoutDisabled}>{isCalculating ? 'Calculating...' : 'Finished'}</Button>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Dialog open={modalStep !== 'closed'} onClose={() => setModalStep('closed')} fullWidth maxWidth="xs">
                {modalStep === 'initial' && (<>
                    <DialogTitle fontWeight="bold">Confirm Sale</DialogTitle>
                    <DialogContent>
                        <Typography>Final Total: <Typography component="span" variant="h4" color="primary">₱{finalTotal.toFixed(2)}</Typography></Typography>
                        <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel>Payment Type</InputLabel>
                            <Select value={paymentType} label="Payment Type" onChange={e => setPaymentType(e.target.value)}><MenuItem value="COD">Cash on Delivery (COD)</MenuItem><MenuItem value="TERMS">Payment Terms</MenuItem></Select>
                        </FormControl>
                        {paymentType === 'COD' && (<TextField inputRef={cashReceivedRef} margin="normal" label="Cash Received" type="number" fullWidth onChange={e => setCashReceived(Number(e.target.value))} onKeyPress={(e) => e.key === 'Enter' && setModalStep('change_display')}/>)}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setModalStep('closed')}>Cancel</Button>
                        {paymentType === 'COD' ? <Button onClick={() => setModalStep('change_display')} variant="contained">Next</Button> : <Button onClick={handleCompleteSale} variant="contained" color="success" startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Save />} disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Complete Sale'}</Button>}
                    </DialogActions>
                </>)}
                {modalStep === 'change_display' && (<>
                    <DialogTitle fontWeight="bold">Change Calculation</DialogTitle>
                    <DialogContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6">Total:</Typography><Typography variant="h4" gutterBottom>₱{finalTotal.toFixed(2)}</Typography>
                        <Typography variant="h6">Cash Received:</Typography><Typography variant="h4" gutterBottom>₱{cashReceived.toFixed(2)}</Typography>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6">Change:</Typography><Typography variant="h3" color="success.main" fontWeight="bold">₱{(cashReceived - finalTotal).toFixed(2)}</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setModalStep('initial')}>Back</Button>
                        <Button onClick={handleCompleteSale} variant="contained" color="success" startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Save />} disabled={isSubmitting}>{isSubmitting ? 'Confirm & Save' : 'Confirm & Save'}</Button>
                    </DialogActions>
                </>)}
                {modalStep === 'final_options' && (<>
                    <DialogTitle fontWeight="bold">Order Saved!</DialogTitle>
                    <DialogContent><Stack spacing={2}><Button fullWidth variant="outlined" startIcon={<Print />}>Print Invoice</Button><Button fullWidth variant="outlined" startIcon={<Receipt />}>Print Receipt</Button></Stack></DialogContent>
                    <DialogActions><Button onClick={() => setModalStep('initial')}>Back</Button><Button onClick={resetPosState} variant="contained">Done Order</Button></DialogActions>
                </>)}
            </Dialog>
        </Box>
    );
};

export default PointOfSaleScreen;