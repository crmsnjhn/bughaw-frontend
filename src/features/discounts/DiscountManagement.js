import React, { useState, useEffect, useCallback } from 'react';
import {
    Grid,
    Box, Paper, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, CircularProgress,
    FormControl, InputLabel, Select, MenuItem, Switch, Typography, Stack, Autocomplete, Chip, IconButton,
    List, ListItem, ListItemText, ListItemSecondaryAction, Divider
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Delete } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

import { api } from '../../api/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/common/PageHeader';

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 0,
  '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(0,0,0,0.04)', fontWeight: 'bold' },
}));

const DiscountManagement = ({ showSnackbar }) => {
    const [discounts, setDiscounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [products, setProducts] = useState([]);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [discountsData, productsResponse] = await Promise.all([
                api.getDiscounts(),
                api.getProducts({ page: 0, pageSize: 1000 })
            ]);
            setDiscounts(discountsData);
            setProducts(productsResponse.rows);
        } catch (error) {
            showSnackbar("Failed to fetch initial data", "error");
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const DiscountModal = ({ onClose, onSave }) => {
        const [formData, setFormData] = useState({ name: '', type: 'FIXED_AMOUNT', value: '' });
        const [assignments, setAssignments] = useState([]);
        const [isSaving, setIsSaving] = useState(false);

        const handleAddAssignment = (newValue) => {
            if (!newValue || typeof newValue !== 'object') return;
            const newAssignment = { type: 'product', id: newValue.id, name: newValue.name };
            if (!assignments.some(a => a.id === newAssignment.id)) {
                setAssignments(prev => [...prev, newAssignment]);
            }
        };
        
        const handleRemoveAssignment = (idToRemove) => {
            setAssignments(prev => prev.filter(a => a.id !== idToRemove));
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            setIsSaving(true);
            const payload = { ...formData, value: parseFloat(formData.value), assignments };
            try {
                await api.addAdvancedDiscount(payload);
                onSave();
            } catch (error) { 
                showSnackbar("Failed to save discount.", "error"); 
            } finally { 
                setIsSaving(false); 
            }
        };

        return (
            <Dialog open onClose={onClose} fullWidth maxWidth="md">
                <DialogTitle fontWeight="bold">Add New Discount Rule</DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={5}>
                            <Stack spacing={2}>
                                <Typography variant="h6">1. Discount Details</Typography>
                                <TextField autoFocus label="Name *" fullWidth value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} required />
                                <FormControl fullWidth>
                                    <InputLabel>Type</InputLabel>
                                    <Select value={formData.type} label="Type" onChange={e => setFormData(p => ({...p, type: e.target.value}))}>
                                        <MenuItem value="FIXED_AMOUNT">Fixed Amount (₱)</MenuItem>
                                        <MenuItem value="PERCENTAGE">Percentage (%)</MenuItem>
                                        <MenuItem value="BUY_GET" disabled>Buy X Get Y (Coming Soon)</MenuItem>
                                    </Select>
                                </FormControl>
                                <TextField label="Value *" fullWidth type="number" value={formData.value} onChange={e => setFormData(p => ({...p, value: e.target.value}))} required />
                            </Stack>
                        </Grid>
                        
                        <Grid item xs={12} md={7}>
                            <Stack spacing={2}>
                                <Typography variant="h6">2. Apply Discount To</Typography>
                                <Autocomplete
                                    // THIS IS THE FIX:
                                    options={products || []}
                                    getOptionLabel={(option) => option.name}
                                    onChange={(event, newValue) => handleAddAssignment(newValue)}
                                    renderInput={(params) => <TextField {...params} label="Search and Add a Product" />}
                                    value={null}
                                />
                                <Paper variant="outlined" sx={{ minHeight: 150, p: 1 }}>
                                    {assignments.length === 0 ? (
                                        <Typography color="text.secondary" sx={{p:1}}>No assignments added. Discount will apply to all products.</Typography>
                                    ) : (
                                        <List dense>
                                            {assignments.map(assign => (
                                                <ListItem key={assign.id} secondaryAction={
                                                    <IconButton edge="end" onClick={() => handleRemoveAssignment(assign.id)}>
                                                        <Delete />
                                                    </IconButton>
                                                }>
                                                    <ListItemText primary={assign.name} secondary={assign.type.charAt(0).toUpperCase() + assign.type.slice(1)} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    )}
                                </Paper>
                            </Stack>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" disabled={isSaving}>
                        {isSaving ? <CircularProgress size={24} /> : 'Save Discount Rule'}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };

    const columns = [
        { field: 'name', headerName: 'Name', flex: 1 },
        { field: 'type', headerName: 'Type', width: 150 },
        { 
            field: 'value', 
            headerName: 'Value', 
            width: 120, 
            valueFormatter: (params) => {
                if (!params.row) return '';
                return params.row.type === 'PERCENTAGE' ? `${params.value}%` : `₱${Number(params.value).toFixed(2)}`;
            } 
        },
        { field: 'is_active', headerName: 'Status', width: 120, renderCell: params => <Switch defaultChecked={params.value} /> }
    ];

    return (
        <Box>
            {isModalOpen && <DiscountModal onClose={() => setIsModalOpen(false)} onSave={() => { setIsModalOpen(false); fetchInitialData(); showSnackbar("Discount added!", "success"); }} />}
            <PageHeader title="Discount & Price Level Management">
                <Button variant="contained" startIcon={<Add />} onClick={() => setIsModalOpen(true)}>Add Discount Rule</Button>
            </PageHeader>
            <Paper sx={{ height: '75vh', width: '100%' }}>
                {loading ? <LoadingSpinner /> : <StyledDataGrid rows={discounts} columns={columns} getRowId={(row) => row.id} />}
            </Paper>
        </Box>
    );
};

export default DiscountManagement;