import React, { useState, useEffect, useCallback } from 'react';
import { Grid, Box, Paper, Button, Dialog, DialogTitle, DialogContent, TextField, Autocomplete, DialogActions, CircularProgress } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Add } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

import { api } from '../../api/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/common/PageHeader';

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 0,
  '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(0,0,0,0.04)', fontWeight: 'bold' },
}));

const CustomerManagement = ({ showSnackbar }) => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [agents, setAgents] = useState([]);
    const [discounts, setDiscounts] = useState([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // This is the corrected data fetching logic. It now calls the correct endpoints.
            const [customersData, agentsData, discountsData] = await Promise.all([
                api.getCustomers(),
                api.getAgents(), // Use the new, more secure endpoint for agents
                api.getDiscounts()
            ]);
            setCustomers(customersData);
            setAgents(agentsData);
            setDiscounts(discountsData);
        } catch (error) {
            showSnackbar("Failed to fetch customer data. Please check your permissions.", 'error');
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const CustomerModal = ({ onClose, onSave }) => {
        const [formData, setFormData] = useState({ name: '', address: '', agent_id: '', contact_number_1: '', contact_number_2: '', payment_terms: 30, price_level_id: '', freight_duration: 5, credit_limit: 0 });
        const [isSaving, setIsSaving] = useState(false);

        const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        const handleAutocompleteChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value ? value.id : '' }));

        const handleSubmit = async (e) => {
            e.preventDefault();
            if (!formData.name) return showSnackbar("Customer Name is required.", "warning");
            setIsSaving(true);
            try {
                await api.addCustomer(formData);
                onSave();
            } catch (error) {
                showSnackbar(`Failed to save customer: ${error.response?.data?.message || error.message}`, 'error');
            } finally {
                setIsSaving(false);
            }
        };

        return (
            <Dialog open onClose={onClose} fullWidth maxWidth="md">
                <DialogTitle fontWeight="bold">Register New Customer</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}><TextField name="name" label="Customer Name *" fullWidth value={formData.name} onChange={handleChange} required autoFocus /></Grid>
                        <Grid item xs={12} sm={6}><Autocomplete options={agents || []} getOptionLabel={(o) => o.username} onChange={(e, v) => handleAutocompleteChange('agent_id', v)} renderInput={(params) => <TextField {...params} label="Sales Agent" />} /></Grid>
                        <Grid item xs={12}><TextField name="address" label="Address" fullWidth multiline rows={2} value={formData.address} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={6}><TextField name="contact_number_1" label="Contact No. 1" fullWidth value={formData.contact_number_1} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={6}><TextField name="contact_number_2" label="Contact No. 2" fullWidth value={formData.contact_number_2} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={4}><TextField name="payment_terms" label="Payment Terms (Days)" type="number" fullWidth value={formData.payment_terms} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={4}><TextField name="freight_duration" label="Freight (Days)" type="number" fullWidth value={formData.freight_duration} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={4}><TextField name="credit_limit" label="Credit Limit (₱)" type="number" fullWidth value={formData.credit_limit} onChange={handleChange} /></Grid>
                        <Grid item xs={12}><Autocomplete options={discounts || []} getOptionLabel={(o) => o.name} onChange={(e, v) => handleAutocompleteChange('price_level_id', v)} renderInput={(params) => <TextField {...params} label="Default Price Level" />} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: '0 24px 16px', pb: 2 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : 'Register Customer'}</Button>
                </DialogActions>
            </Dialog>
        );
    };

    const columns = [
        { field: 'customer_code', headerName: 'Code', width: 150 },
        { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
        { field: 'branch_name', headerName: 'Branch', width: 150 },
        { field: 'agent_name', headerName: 'Agent', width: 150 },
        { field: 'price_level_name', headerName: 'Price Level', width: 150 },
        { field: 'credit_limit', headerName: 'Credit Limit', width: 130, type: 'number', valueFormatter: ({ value }) => `₱${Number(value || 0).toLocaleString()}`},
        { field: 'payment_terms', headerName: 'Terms', width: 100, valueFormatter: ({ value }) => `${value} days` },
    ];

    return (
        <Box>
            {isModalOpen && <CustomerModal onClose={() => setIsModalOpen(false)} onSave={() => { setIsModalOpen(false); fetchData(); showSnackbar('Customer registered!', 'success'); }} />}
            <PageHeader title="Customer Management">
                <Button variant="contained" startIcon={<Add />} onClick={() => setIsModalOpen(true)}>Register Customer</Button>
            </PageHeader>
            <Paper sx={{ height: '75vh', width: '100%' }}>
                {loading ? <LoadingSpinner /> : <StyledDataGrid rows={customers} columns={columns} getRowId={(row) => row.id} components={{ Toolbar: GridToolbar }} />}
            </Paper>
        </Box>
    );
};

export default CustomerManagement;
