import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Paper, FormControl, Select, MenuItem, Dialog, DialogTitle, DialogContent,
    Typography, Stack, Divider, CircularProgress, Grid, TextField, Button
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { styled } from '@mui/material/styles';

import { api } from '../../api/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/common/PageHeader';

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 0,
  '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(0,0,0,0.04)', fontWeight: 'bold' },
  '& .MuiDataGrid-row': {
    cursor: 'pointer'
  }
}));

const OrderManagement = ({ showSnackbar }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [invoiceInput, setInvoiceInput] = useState('');

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getOrders();
            setOrders(data);
        } catch(error) {
            showSnackbar("Failed to fetch active orders", "error");
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);
    
    const handleRowClick = async (params) => {
        setDetailLoading(true);
        setIsModalOpen(true);
        try {
            const details = await api.getOrderDetails(params.row.id);
            setSelectedOrder(details);
            setInvoiceInput(details.invoice_no || ''); // Set initial invoice input
        } catch (error) {
            showSnackbar("Failed to load order details", "error");
            setIsModalOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedOrder(null);
        setInvoiceInput('');
    };

    const handleSaveInvoice = async () => {
        if (!invoiceInput.trim()) {
            showSnackbar("Invoice number cannot be empty.", "warning");
            return;
        }
        try {
            await api.updateInvoice(selectedOrder.id, invoiceInput.trim());
            showSnackbar("Invoice saved successfully!", "success");
            // Update the grid locally for immediate feedback
            setOrders(prev => prev.map(o => o.id === selectedOrder.id ? {...o, invoice_no: invoiceInput.trim()} : o));
            handleCloseModal();
        } catch (error) {
            showSnackbar("Failed to save invoice.", "error");
        }
    };

    const columns = [
        { field: 'id', headerName: 'Order #', width: 100 },
        { field: 'invoice_no', headerName: 'Invoice #', width: 150 },
        { field: 'customer_name', headerName: 'Customer', flex: 1 },
        { field: 'agent_name', headerName: 'Agent', width: 150 },
        { field: 'total_amount', headerName: 'Total', type: 'number', width: 120, renderCell: params => `₱${Number(params.value).toFixed(2)}` },
        { field: 'status', headerName: 'Status', width: 180, renderCell: (params) => <FormControl fullWidth size="small" onClick={(e) => e.stopPropagation()}><Select value={params.value}>{['Pending', 'For Printing', 'For Delivery', 'Delivered', 'Cancelled'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl> },
        { field: 'order_date', headerName: 'Date', width: 180, type: 'dateTime', valueGetter: params => new Date(params.value) },
    ];

    const OrderDetailsModal = () => (
        <Dialog open={isModalOpen} onClose={handleCloseModal} fullWidth maxWidth="md">
            <DialogTitle fontWeight="bold">Order Details (Order #{selectedOrder?.id})</DialogTitle>
            <DialogContent>
                {detailLoading && <LoadingSpinner />}
                {selectedOrder && !detailLoading && (
                    <Stack spacing={3} sx={{ p: 2 }}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                             <Grid container spacing={1}>
                                <Grid item xs={6}><Typography color="text.secondary">Customer:</Typography></Grid>
                                <Grid item xs={6}><Typography>{selectedOrder.customer_name}</Typography></Grid>
                                <Grid item xs={6}><Typography color="text.secondary">Agent:</Typography></Grid>
                                <Grid item xs={6}><Typography>{selectedOrder.agent_name}</Typography></Grid>
                                <Grid item xs={6}><Typography color="text.secondary">Order Date:</Typography></Grid>
                                <Grid item xs={6}><Typography>{new Date(selectedOrder.order_date).toLocaleString()}</Typography></Grid>
                                <Grid item xs={6}><Typography color="text.secondary">Status:</Typography></Grid>
                                <Grid item xs={6}><Typography>{selectedOrder.status}</Typography></Grid>
                            </Grid>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>Items</Typography>
                            <Stack divider={<Divider />}>
                                {selectedOrder.items.map(item => (
                                    <Stack key={item.id} direction="row" justifyContent="space-between" sx={{ py: 1 }}>
                                        <Box>
                                            <Typography fontWeight="500">{item.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {item.quantity} x ₱{Number(item.price_per_unit).toFixed(2)}
                                            </Typography>
                                        </Box>
                                        <Typography fontWeight="500">
                                            ₱{(item.quantity * item.price_per_unit).toFixed(2)}
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </Paper>
                        
                        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                             <Stack spacing={2}>
                                <TextField
                                    label="Enter Invoice Number"
                                    variant="outlined"
                                    fullWidth
                                    value={invoiceInput}
                                    onChange={(e) => setInvoiceInput(e.target.value)}
                                />
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="h6">Total Amount</Typography>
                                    <Typography variant="h6">₱{Number(selectedOrder.total_amount).toFixed(2)}</Typography>
                                </Stack>
                                <Button variant="contained" onClick={handleSaveInvoice}>Save Invoice & Close</Button>
                             </Stack>
                        </Paper>
                    </Stack>
                )}
            </DialogContent>
        </Dialog>
    );

    return (
        <Box>
            <PageHeader title="Order Management (Active)" />
            <Paper sx={{ height: '75vh', width: '100%' }}>
                {loading ? <LoadingSpinner /> : <StyledDataGrid rows={orders} columns={columns} getRowId={(row) => row.id} onRowClick={handleRowClick} components={{ Toolbar: GridToolbar }} />}
            </Paper>
            <OrderDetailsModal />
        </Box>
    );
};

export default OrderManagement;