import React, { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, CircularProgress, FormControlLabel, Switch, Typography, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

import { api } from '../../api/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/common/PageHeader';

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 0,
  '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(0,0,0,0.04)', fontWeight: 'bold' },
}));

const BranchManagement = ({ showSnackbar }) => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchBranches = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getBranches();
            setBranches(data);
        } catch (error) {
            showSnackbar("Failed to fetch branches.", 'error');
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    const BranchModal = ({ onClose, onSave }) => {
        const [name, setName] = useState('');
        const [isMain, setIsMain] = useState(false);
        const [isSaving, setIsSaving] = useState(false);
        const handleSubmit = async (e) => {
            e.preventDefault();
            if (!name.trim()) return showSnackbar("Branch name cannot be empty.", "warning");
            setIsSaving(true);
            try {
                await api.addBranch({ name, is_main_branch: isMain });
                onSave();
            } catch (error) {
                showSnackbar(`Failed to save branch: ${error.response?.data?.message || error.message}`, 'error');
            } finally {
                setIsSaving(false);
            }
        };
        return (
            <Dialog open onClose={onClose} fullWidth maxWidth="sm">
                <DialogTitle fontWeight="bold">Add New Branch</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" label="Branch Name *" fullWidth value={name} onChange={e => setName(e.target.value)} required sx={{ mt: 1 }} />
                    <FormControlLabel control={<Switch checked={isMain} onChange={e => setIsMain(e.target.checked)} />} label="Set as Main Branch" sx={{ mt: 1 }} />
                    <Typography variant="caption" color="text.secondary">If you set this as the main branch, any other branch currently set as main will be updated.</Typography>
                </DialogContent>
                <DialogActions sx={{ p: '0 24px 16px', pb: 2 }}><Button onClick={onClose}>Cancel</Button><Button onClick={handleSubmit} variant="contained" disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : 'Save Branch'}</Button></DialogActions>
            </Dialog>
        );
    };

    const columns = [
        { field: 'name', headerName: 'Branch Name', flex: 1 },
        { field: 'is_main_branch', headerName: 'Status', width: 150, renderCell: params => params.value ? <Chip label="Main Branch" color="primary" size="small" /> : null }
    ];

    return (
        <Box>
            {isModalOpen && <BranchModal onClose={() => setIsModalOpen(false)} onSave={() => { setIsModalOpen(false); fetchBranches(); showSnackbar('Branch added!', 'success'); }} />}
            <PageHeader title="Branch Management"><Button variant="contained" startIcon={<Add />} onClick={() => setIsModalOpen(true)}>Add Branch</Button></PageHeader>
            <Paper sx={{ height: '75vh', width: '100%' }}>
                {loading ? <LoadingSpinner /> : <StyledDataGrid rows={branches} columns={columns} getRowId={(row) => row.id} />}
            </Paper>
        </Box>
    );
};

export default BranchManagement;