import React, { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, CircularProgress, Typography } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { CheckCircle } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

import { api } from '../../api/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/common/PageHeader';

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 0,
  '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(0,0,0,0.04)', fontWeight: 'bold' },
}));

const AccountingManagement = ({ showSnackbar }) => {
    const [unpaidOrders, setUnpaidOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [password, setPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchUnpaid = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getUnpaidOrders();
            setUnpaidOrders(data);
        } catch (error) {
            showSnackbar("Failed to fetch unpaid orders", "error");
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchUnpaid();
    }, [fetchUnpaid]);

    const handleMarkAsPaid = async () => {
        if (!password) return showSnackbar("Password is required to confirm payment.", "warning");
        setIsSaving(true);
        try {
            const result = await api.markOrderAsPaid(selectedOrder.id, password);
            showSnackbar(result.message, "success");
            fetchUnpaid();
            setSelectedOrder(null);
            setPassword('');
        } catch (error) {
            showSnackbar(error.response?.data?.message || "Failed to mark as paid.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const columns = [
        { field: 'invoice_no', headerName: 'Invoice #', width: 150 },
        { field: 'customer_name', headerName: 'Customer', flex: 1 },
        { field: 'total_amount', headerName: 'Amount Due', type: 'number', width: 150, renderCell: params => `₱${Number(params.value).toFixed(2)}` },
        { field: 'order_date', headerName: 'Order Date', width: 180, type: 'dateTime', valueGetter: params => new Date(params.value) },
        { field: 'actions', headerName: 'Action', width: 150, sortable: false, renderCell: (params) => <Button variant="contained" color="success" size="small" startIcon={<CheckCircle />} onClick={() => setSelectedOrder(params.row)}>Mark as Paid</Button> },
    ];

    return (
        <Box>
            <PageHeader title="Accounting - Unpaid Orders" />
            <Paper sx={{ height: '75vh', width: '100%' }}>
                {loading ? <LoadingSpinner /> : <StyledDataGrid rows={unpaidOrders} columns={columns} getRowId={(row) => row.id} components={{ Toolbar: GridToolbar }} />}
            </Paper>
            <Dialog open={!!selectedOrder} onClose={() => setSelectedOrder(null)}>
                <DialogTitle fontWeight="bold">Confirm Payment</DialogTitle>
                <DialogContent>
                    <Typography>Mark order <strong>{selectedOrder?.invoice_no}</strong> for <strong>{selectedOrder?.customer_name}</strong> as paid?</Typography>
                    <Typography variant="h5" my={2} sx={{ textAlign: 'center', fontWeight: 'bold' }}>Amount: ₱{selectedOrder?.total_amount ? Number(selectedOrder.total_amount).toFixed(2) : '0.00'}</Typography>
                    <TextField autoFocus margin="dense" label="Confirm Your Password" type="password" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleMarkAsPaid()} />
                </DialogContent>
                <DialogActions sx={{ p: '0 24px 16px', pb: 2 }}><Button onClick={() => setSelectedOrder(null)}>Cancel</Button><Button onClick={handleMarkAsPaid} variant="contained" color="success" disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : 'Confirm Payment'}</Button></DialogActions>
            </Dialog>
        </Box>
    );
};

export default AccountingManagement;