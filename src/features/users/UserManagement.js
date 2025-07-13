import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Grid, Box, Paper, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions,
    CircularProgress, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch, Chip, IconButton,
    FormGroup, FormHelperText, Typography
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Add, Edit, Delete, AdminPanelSettings as LimitsIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

import { api } from '../../api/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 0,
  '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(0,0,0,0.04)', fontWeight: 'bold' },
}));

// --- UPDATED UserModal with Granular Permissions ---
const UserModal = ({ user: editingUser, onClose, onSave, branches, roles, permissions, showSnackbar, currentUser }) => {
    const [formData, setFormData] = useState({
        username: editingUser?.username || '',
        password: '',
        role_id: '',
        branch_id: editingUser?.branch_id || '',
        is_active: editingUser ? editingUser.is_active : true,
        selectedPermissions: new Set()
    });
    const [isSaving, setIsSaving] = useState(false);
    const [selectedRoleName, setSelectedRoleName] = useState('');

    const availableRoles = useMemo(() => {
        if (currentUser.role === 'Super Admin') return roles.filter(r => r.name === 'Admin');
        if (currentUser.role === 'Admin') return roles.filter(r => r.name === 'Sub-Admin' || r.name === 'Agent');
        return [];
    }, [roles, currentUser]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'role_id') {
            const role = roles.find(r => r.id === value);
            setSelectedRoleName(role ? role.name : '');
        }
    };

    const handlePermissionChange = (permissionId) => {
        setFormData(prev => {
            const newSelection = new Set(prev.selectedPermissions);
            if (newSelection.has(permissionId)) {
                newSelection.delete(permissionId);
            } else {
                newSelection.add(permissionId);
            }
            return { ...prev, selectedPermissions: newSelection };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!editingUser && !formData.password) return showSnackbar("Password is required for new users.", "warning");
        if (!formData.role_id) return showSnackbar("A role is required.", "warning");

        setIsSaving(true);
        const payload = {
            ...formData,
            permissions: Array.from(formData.selectedPermissions)
        };
        delete payload.selectedPermissions; // Clean up payload

        try {
            if (editingUser) {
                await api.updateUser(editingUser.id, payload);
            } else {
                await api.addUser(payload);
            }
            onSave();
        } catch (error) {
            showSnackbar(`Failed to save user: ${error.response?.data?.message || 'An error occurred.'}`, "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle fontWeight="bold">{editingUser ? `Edit ${editingUser.username}` : 'Add New User'}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12}><TextField name="username" label="Username" fullWidth value={formData.username} onChange={handleChange} required autoFocus disabled={!!editingUser} /></Grid>
                    {!editingUser && <Grid item xs={12}><TextField name="password" label="Password" type="password" fullWidth value={formData.password} onChange={handleChange} required /></Grid>}
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel id="role-select-label">Role</InputLabel>
                            <Select labelId="role-select-label" name="role_id" value={formData.role_id} label="Role" onChange={handleChange}>
                                {availableRoles.map(r => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Branch</InputLabel>
                            <Select name="branch_id" value={formData.branch_id} label="Branch" onChange={handleChange}>
                                {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    
                    {selectedRoleName === 'Sub-Admin' && (
                        <Grid item xs={12}>
                            <Typography variant="h6" sx={{ mb: 1, mt: 2 }}>Permissions</Typography>
                            <FormHelperText sx={{mb: 1}}>Select the features this Sub-Admin can access.</FormHelperText>
                            <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflowY: 'auto' }}>
                                <FormGroup>
                                    {permissions.map(perm => (
                                        <FormControlLabel
                                            key={perm.id}
                                            control={<Switch checked={formData.selectedPermissions.has(perm.id)} onChange={() => handlePermissionChange(perm.id)} />}
                                            label={perm.description}
                                        />
                                    ))}
                                </FormGroup>
                            </Paper>
                        </Grid>
                    )}

                    {editingUser && <Grid item xs={12}><FormControlLabel control={<Switch name="is_active" checked={formData.is_active} onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))} />} label="Account Active" /></Grid>}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={isSaving}>
                    {isSaving ? <CircularProgress size={24} /> : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};


// Other components (LimitsModal) remain the same...

const UserManagement = ({ user, showSnackbar }) => {
    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]); // <-- NEW: State for permissions
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [deletingUser, setDeletingUser] = useState(null);
    const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);
    const [selectedUserForLimits, setSelectedUserForLimits] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch all necessary data in parallel
            const [usersData, branchesData, rolesData, permissionsData] = await Promise.all([
                api.getUsers(),
                api.getBranches(),
                api.getRoles(),
                api.getPermissions() // <-- Fetch permissions
            ]);
            setUsers(usersData);
            setBranches(branchesData);
            setRoles(rolesData);
            setPermissions(permissionsData); // <-- Store permissions
        } catch (error) {
            showSnackbar("Failed to fetch user data.", "error");
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleConfirmDelete = async () => {
        if (!deletingUser) return;
        try {
            await api.deleteUser(deletingUser.id);
            showSnackbar("User deleted.", 'success');
            fetchData();
        } catch (error) {
            showSnackbar("Failed to delete user.", 'error');
        } finally {
            setDeletingUser(null);
        }
    };

    const columns = [
        { field: 'username', headerName: 'Username', flex: 1 },
        { field: 'role', headerName: 'Role', width: 120, renderCell: params => <Chip label={params.value} color={params.value === 'Admin' ? 'primary' : 'default'} size="small" /> },
        { field: 'branch_name', headerName: 'Branch', width: 200 },
        { field: 'is_active', headerName: 'Status', width: 120, renderCell: params => <Chip label={params.value ? 'Active' : 'Disabled'} color={params.value ? 'success' : 'error'} size="small" /> },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            sortable: false,
            renderCell: params => (
                <>
                    {user.role === 'Super Admin' && params.row.role === 'Admin' && (
                         <IconButton title="Set Account Limits" onClick={() => { setSelectedUserForLimits(params.row); setIsLimitsModalOpen(true); }}>
                            <LimitsIcon />
                        </IconButton>
                    )}
                    <IconButton title="Edit User" onClick={() => { setEditingUser(params.row); setIsModalOpen(true); }}>
                        <Edit />
                    </IconButton>
                    <IconButton title="Delete User" color="error" onClick={() => setDeletingUser(params.row)}>
                        <Delete />
                    </IconButton>
                </>
            )
        }
    ];

    return (
        <Box>
            {isLimitsModalOpen && <LimitsModal user={selectedUserForLimits} showSnackbar={showSnackbar} onClose={() => setIsLimitsModalOpen(false)} />}
            {isModalOpen && <UserModal user={editingUser} roles={roles} branches={branches} permissions={permissions} showSnackbar={showSnackbar} currentUser={user} onClose={() => {setIsModalOpen(false); setEditingUser(null);}} onSave={() => { setIsModalOpen(false); setEditingUser(null); fetchData(); showSnackbar("User saved!", "success"); }} />}
            <ConfirmDialog open={!!deletingUser} title="Delete User" message={`Are you sure you want to delete "${deletingUser?.username}"?`} onConfirm={handleConfirmDelete} onCancel={() => setDeletingUser(null)} />
            <PageHeader title="User Management">
                <Button variant="contained" startIcon={<Add />} onClick={() => { setEditingUser(null); setIsModalOpen(true); }}>Add User</Button>
            </PageHeader>
            <Paper sx={{ height: '75vh', width: '100%' }}>
                {loading ? <LoadingSpinner /> : <StyledDataGrid rows={users} columns={columns} getRowId={(row) => row.id} components={{ Toolbar: GridToolbar }} />}
            </Paper>
        </Box>
    );
};

// --- Note: LimitsModal component is unchanged and can be copied from previous versions if needed ---
const LimitsModal = ({ user: limitsUser, onClose, showSnackbar }) => {
    const [limits, setLimits] = useState({ max_agents: 5, max_admins: 1 });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if(limitsUser) {
            setLimits({ max_agents: limitsUser.max_agents || 5, max_admins: limitsUser.max_admins || 1 });
        }
    }, [limitsUser]);

    const handleSaveLimits = async () => {
        setIsSaving(true);
        try {
            await api.setUserLimits(limitsUser.id, limits);
            showSnackbar("User limits saved successfully!", "success");
            onClose();
        } catch (error) {
            showSnackbar("Failed to save limits.", "error");
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Dialog open onClose={onClose}>
            <DialogTitle>Set Limits for {limitsUser?.username}</DialogTitle>
            <DialogContent>
                <TextField margin="dense" label="Max Agent Accounts" type="number" fullWidth value={limits.max_agents} onChange={e => setLimits(l => ({...l, max_agents: parseInt(e.target.value) || 0}))} />
                <TextField margin="dense" label="Max Sub-Admin Accounts" type="number" fullWidth value={limits.max_admins} onChange={e => setLimits(l => ({...l, max_admins: parseInt(e.target.value) || 0}))} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSaveLimits} disabled={isSaving}>{isSaving ? <CircularProgress size={24}/> : 'Save Limits'}</Button>
            </DialogActions>
        </Dialog>
    )
};


export default UserManagement;