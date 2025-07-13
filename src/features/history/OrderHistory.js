import React, { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Chip } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { styled } from '@mui/material/styles';

import { api } from '../../api/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/common/PageHeader';

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 0,
  '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(0,0,0,0.04)', fontWeight: 'bold' },
}));

const OrderHistory = ({ showSnackbar }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getOrderHistory();
            setHistory(data);
        } catch(error) {
            showSnackbar("Failed to fetch order history", "error");
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const columns = [
        { field: 'invoice_no', headerName: 'Invoice #', width: 150 },
        { field: 'customer_name', headerName: 'Customer', flex: 1 },
        { field: 'agent_name', headerName: 'Agent', width: 150 },
        { field: 'total_amount', headerName: 'Total', type: 'number', width: 120, renderCell: params => `₱${Number(params.value).toFixed(2)}` },
        { field: 'status', headerName: 'Status', width: 120, renderCell: params => <Chip label={params.value} color={params.value === 'Cancelled' ? 'error' : 'success'} size="small" variant="outlined" /> },
        { field: 'payment_status', headerName: 'Payment', width: 120, renderCell: params => <Chip label={params.value} color={params.value === 'Paid' ? 'success' : 'default'} size="small" /> },
        { field: 'order_date', headerName: 'Date', width: 180, type: 'dateTime', valueGetter: params => new Date(params.value) },
    ];

    return (
        <Box>
            <PageHeader title="Order History" />
            <Paper sx={{ height: '75vh', width: '100%' }}>
                {loading ? <LoadingSpinner /> : <StyledDataGrid rows={history} columns={columns} getRowId={(row) => row.id} components={{ Toolbar: GridToolbar }} />}
            </Paper>
        </Box>
    );
};

export default OrderHistory;