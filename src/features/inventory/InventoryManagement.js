import React, { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, CircularProgress, Typography, Chip } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { styled } from '@mui/material/styles';

import { api } from '../../api/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/common/PageHeader';

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 0,
  '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(0,0,0,0.04)', fontWeight: 'bold' },
}));

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
            showSnackbar("Failed to fetch inventory", "error");
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const StockModal = ({ item, onClose, onSave }) => {
        const [newStock, setNewStock] = useState(item?.stock_quantity || 0);
        const [isSaving, setIsSaving] = useState(false);
        const handleSubmit = async (e) => {
            e.preventDefault();
            setIsSaving(true);
            try {
                await api.updateInventory(item.product_id, newStock);
                onSave();
            } catch (error) {
                showSnackbar(`Failed to update stock: ${error.response?.data?.message}`, 'error');
            } finally {
                setIsSaving(false);
            }
        };
        return (
            <Dialog open onClose={onClose}>
                <DialogTitle fontWeight="bold">Update Stock for {item.name}</DialogTitle>
                <DialogContent>
                    <Typography>Current Stock: <strong>{item.stock_quantity}</strong></Typography>
                    <TextField autoFocus margin="dense" label="New Stock Quantity" type="number" fullWidth value={newStock} onChange={e => setNewStock(parseInt(e.target.value, 10) || 0)} required InputProps={{ inputProps: { min: 0 } }} />
                </DialogContent>
                <DialogActions sx={{ p: '0 24px 16px', pb: 2 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : 'Update Stock'}</Button>
                </DialogActions>
            </Dialog>
        );
    };

    const columns = [
        { field: 'name', headerName: 'Product Name', flex: 1, minWidth: 250 },
        { field: 'category', headerName: 'Category', width: 150 },
        { field: 'partner_name', headerName: 'Partner', width: 150 },
        { field: 'stock_quantity', headerName: 'Current Stock', type: 'number', width: 150 },
        { field: 'status', headerName: 'Status', width: 150, renderCell: (params) => <Chip label={params.value} color={{ 'In Stock': 'success', 'Low Stock': 'warning', 'Out of Stock': 'error' }[params.value]} size="small" /> },
        { field: 'actions', headerName: 'Actions', width: 150, sortable: false, renderCell: (params) => <Button variant="outlined" size="small" onClick={() => setEditingItem(params.row)}>Update Stock</Button> }
    ];

    return (
        <Box>
            {editingItem && <StockModal item={editingItem} onClose={() => setEditingItem(null)} onSave={() => { setEditingItem(null); fetchInventory(); showSnackbar("Stock updated!", "success"); }} />}
            <PageHeader title="Inventory Management" />
            <Paper sx={{ height: '75vh', width: '100%' }}>
                {loading ? <LoadingSpinner /> : <StyledDataGrid rows={inventory} columns={columns} getRowId={(row) => row.product_id} components={{ Toolbar: GridToolbar }} />}
            </Paper>
        </Box>
    );
};

export default InventoryManagement;