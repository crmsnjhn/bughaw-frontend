import React, { useState, useEffect, useCallback } from 'react';
import { 
    Grid, Box, Paper, Button, Dialog, DialogTitle, DialogContent, TextField, Autocomplete, 
    DialogActions, CircularProgress, Typography, IconButton, Avatar, Stack, Chip, Switch, 
    Toolbar, InputAdornment 
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Delete, Store as PartnerIcon, Search, CloudUpload } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

import { api, getApiBaseUrl } from '../../api/apiClient';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Styled DataGrid for consistent look and feel
const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 0,
  '& .MuiDataGrid-columnHeaders': { 
      backgroundColor: 'rgba(0,0,0,0.04)', 
      fontWeight: 'bold' 
    },
  // Style for inactive rows
  '& .inactive-row': {
      backgroundColor: '#fafafa',
      color: '#9e9e9e',
      '&:hover': {
          backgroundColor: '#f0f0f0 !important',
      }
  }
}));

const ProductManagement = ({ showSnackbar }) => {
    const [products, setProducts] = useState([]);
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
    const [deletingProduct, setDeletingProduct] = useState(null);
    const API_BASE_URL = getApiBaseUrl();

    // Server-side state for pagination and filtering
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
    const [rowCount, setRowCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchDebounce, setSearchDebounce] = useState('');

    // Debounce search input to avoid excessive API calls
    useEffect(() => {
        const handler = setTimeout(() => {
            setSearchQuery(searchDebounce);
        }, 500); // 500ms delay
        return () => clearTimeout(handler);
    }, [searchDebounce]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: paginationModel.page,
                pageSize: paginationModel.pageSize,
                search: searchQuery
            };
            const response = await api.getProducts(params);
            setProducts(response.rows);
            setRowCount(response.rowCount);
        } catch (error) {
            showSnackbar("Failed to fetch products. Check permissions.", "error");
        } finally {
            setLoading(false);
        }
    }, [paginationModel, searchQuery, showSnackbar]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    // Fetch partners only once on component mount
    useEffect(() => {
        api.getPartners().then(setPartners).catch(() => showSnackbar("Could not load partners.", "error"));
    }, [showSnackbar]);


    const handleConfirmDelete = async () => {
        if (!deletingProduct) return;
        try {
            await api.deleteProduct(deletingProduct.id);
            showSnackbar("Product deleted successfully.", "success");
            fetchData();
        } catch (error) {
            showSnackbar(error.response?.data?.message || "Failed to delete product.", "error");
        } finally {
            setDeletingProduct(null);
        }
    };

    const handleStatusToggle = async (productId, currentStatus) => {
        try {
            await api.toggleProductStatus(productId, !currentStatus);
            // Optimistic UI update for instant feedback
            setProducts(prevProducts =>
                prevProducts.map(p =>
                    p.id === productId ? { ...p, is_active: !currentStatus } : p
                )
            );
        } catch (error) {
            showSnackbar("Failed to update status.", "error");
            // Revert on error if needed
            fetchData();
        }
    };

    const columns = [
        { field: 'image_url', headerName: 'Image', width: 80, sortable: false, renderCell: params => <Avatar variant="rounded" src={`${API_BASE_URL}${params.value}`} /> },
        { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
        { field: 'category', headerName: 'Category', width: 150 },
        { field: 'price', headerName: 'Price', width: 120, type: 'number', valueFormatter: ({ value }) => `₱${Number(value).toFixed(2)}` },
        { field: 'stock', headerName: 'Stock', width: 100, type: 'number' },
        {
            field: 'is_active',
            headerName: 'Status',
            width: 120,
            renderCell: params => (
                <Chip label={params.value ? 'Active' : 'Disabled'} color={params.value ? 'success' : 'error'} size="small" />
            )
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            sortable: false,
            renderCell: params => (
                <Stack direction="row" alignItems="center">
                    <Switch
                        checked={params.row.is_active}
                        onChange={() => handleStatusToggle(params.row.id, params.row.is_active)}
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <IconButton color="error" onClick={(e) => { e.stopPropagation(); setDeletingProduct(params.row); }} size="small">
                        <Delete />
                    </IconButton>
                </Stack>
            )
        }
    ];

    return (
        <Box>
            {isModalOpen && <ProductModal partners={partners} showSnackbar={showSnackbar} onClose={() => setIsModalOpen(false)} onSave={() => { setIsModalOpen(false); fetchData(); showSnackbar("Product saved!", "success"); }} />}
            {isPartnerModalOpen && <PartnerModal showSnackbar={showSnackbar} onClose={() => setIsPartnerModalOpen(false)} onSave={() => { setIsPartnerModalOpen(false); api.getPartners().then(setPartners); showSnackbar("Partner added!", "success"); }} />}
            <ConfirmDialog open={!!deletingProduct} title="Delete Product" message={`Are you sure you want to delete "${deletingProduct?.name}"? This action cannot be undone.`} onConfirm={handleConfirmDelete} onCancel={() => setDeletingProduct(null)} />
            
            <PageHeader title="Product Management">
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<PartnerIcon />} onClick={() => setIsPartnerModalOpen(true)}>Add Partner</Button>
                    <Button variant="contained" startIcon={<Add />} onClick={() => setIsModalOpen(true)}>Add Product</Button>
                </Stack>
            </PageHeader>
            
            <Paper sx={{ height: '75vh', width: '100%' }}>
                <Toolbar>
                    <TextField
                        variant="outlined"
                        size="small"
                        placeholder="Search by name or category..."
                        value={searchDebounce}
                        onChange={(e) => setSearchDebounce(e.target.value)}
                        sx={{ flexGrow: 1 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Toolbar>
                <StyledDataGrid
                    rows={products}
                    columns={columns}
                    getRowId={(row) => row.id}
                    // Use the built-in loading prop for a better UX
                    loading={loading}
                    rowCount={rowCount}
                    paginationModel={paginationModel}
                    onPaginationModelChange={setPaginationModel}
                    paginationMode="server"
                    filterMode="server"
                    // Add the getRowClassName prop to style inactive rows
                    getRowClassName={(params) => !params.row.is_active ? 'inactive-row' : ''}
                />
            </Paper>
        </Box>
    );
};

const ProductModal = ({ onClose, onSave, partners, showSnackbar }) => {
    const [formData, setFormData] = useState({ name: '', description: '', price: '', partner_id: '', category: '', unit: 'pcs' });
    const [image, setImage] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.price) return showSnackbar("Product Name and Price are required.", "warning");
        setIsSaving(true);
        const payload = new FormData();
        Object.keys(formData).forEach(key => payload.append(key, formData[key]));
        if (image) payload.append('image', image);

        try {
            await api.addProduct(payload);
            onSave();
        } catch (error) {
            showSnackbar(`Failed to save product: ${error.response?.data?.message || 'An error occurred.'}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle fontWeight="bold">Add New Product</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12}><TextField name="name" label="Name *" fullWidth value={formData.name} onChange={handleChange} required autoFocus /></Grid>
                    <Grid item xs={12}><TextField name="description" label="Description" fullWidth multiline rows={3} value={formData.description} onChange={handleChange} /></Grid>
                    <Grid item xs={6}><TextField name="price" label="Price (₱) *" fullWidth type="number" value={formData.price} onChange={handleChange} required /></Grid>
                    <Grid item xs={6}><TextField name="unit" label="Unit (e.g., pcs, box)" fullWidth value={formData.unit} onChange={handleChange} /></Grid>
                    <Grid item xs={6}><Autocomplete options={partners || []} getOptionLabel={(o) => o.name} onChange={(e, v) => setFormData(p => ({...p, partner_id: v ? v.id : ''}))} renderInput={(params) => <TextField {...params} label="Partner" />} /></Grid>
                    <Grid item xs={6}><TextField name="category" label="Category" fullWidth value={formData.category} onChange={handleChange} /></Grid>
                    <Grid item xs={12}>
                        <Button variant="outlined" component="label" startIcon={<CloudUpload />}>
                            Upload Image
                            <input type="file" hidden onChange={e => setImage(e.target.files[0])} accept="image/*" />
                        </Button>
                        {image && <Typography variant="body2" sx={{ display: 'inline', ml: 2 }}>{image.name}</Typography>}
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: '0 24px 16px', pb: 2 }}>
                <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={isSaving}>
                    {isSaving ? <CircularProgress size={24} /> : 'Save Product'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const PartnerModal = ({ onClose, onSave, showSnackbar }) => {
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return showSnackbar("Partner name cannot be empty.", "warning");
        setIsSaving(true);
        try {
            await api.addPartner({ name });
            onSave();
        } catch (err) { 
            showSnackbar('Failed to add partner.', 'error'); 
        } finally { 
            setIsSaving(false); 
        }
    };
    
    return (
        <Dialog open onClose={onClose}>
            <DialogTitle>Add New Partner</DialogTitle>
            <DialogContent>
                <TextField 
                    autoFocus 
                    label="Partner Name" 
                    fullWidth 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    sx={{ mt: 1 }} 
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isSaving}>
                    {isSaving ? <CircularProgress size={24} /> : 'Add'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ProductManagement;
