import React, { useState, useEffect, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme/theme';
import {
    Box, AppBar, Drawer, Toolbar, IconButton, Typography, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Avatar, Divider, Button, Alert
} from '@mui/material';
import {
    Dashboard, PointOfSale, Inventory, Receipt, People, LocalOffer,
    Menu as MenuIcon, History as HistoryIcon,
    AccountBalance, Assessment, AddBusiness, Domain as BranchIcon, Store
} from '@mui/icons-material';

// Import all feature components
import AuthScreen from './features/auth/AuthScreen';
import SalesDashboard from './features/dashboard/SalesDashboard';
import PointOfSaleScreen from './features/pos/PointOfSaleScreen';
import CustomerManagement from './features/customers/CustomerManagement';
import ProductManagement from './features/products/ProductManagement';
import InventoryManagement from './features/inventory/InventoryManagement';
import OrderManagement from './features/orders/OrderManagement';
import OrderHistory from './features/history/OrderHistory';
import AccountingManagement from './features/accounting/AccountingManagement';
import DiscountManagement from './features/discounts/DiscountManagement';
import ReportManagement from './features/reports/ReportManagement';
import UserManagement from './features/users/UserManagement';
import BranchManagement from './features/branch/BranchManagement';
import LoadingSpinner from './components/common/LoadingSpinner';
import AppSnackbar from './components/common/AppSnackbar';

const drawerWidth = 260;

const MainLayout = ({ user, onLogout, showSnackbar }) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activeView, setActiveView] = useState('');

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

    const allNavItems = useMemo(() => [
        { id: 'dashboard', label: 'Dashboard', icon: <Dashboard />, permission: 'view_dashboard' },
        { id: 'pos', label: 'Point of Sale', icon: <PointOfSale />, permission: 'use_pos' },
        { id: 'customers', label: 'Customers', icon: <AddBusiness />, permission: 'manage_customers' },
        { id: 'products', label: 'Products', icon: <Store />, permission: 'manage_products' },
        { id: 'inventory', label: 'Inventory', icon: <Inventory />, permission: 'manage_inventory' },
        { id: 'orders', label: 'Orders', icon: <Receipt />, permission: 'manage_orders' },
        { id: 'history', label: 'Order History', icon: <HistoryIcon />, permission: 'manage_orders' },
        { id: 'accounting', label: 'Accounting', icon: <AccountBalance />, permission: 'manage_accounting' },
        { id: 'discounts', label: 'Discounts', icon: <LocalOffer />, permission: 'manage_discounts' },
        { id: 'reports', label: 'Reports', icon: <Assessment />, permission: 'view_reports' },
        { id: 'users', label: 'User Management', icon: <People />, permission: 'manage_users' },
        { id: 'branches', label: 'Branch Management', icon: <BranchIcon />, permission: 'manage_branches' },
    ], []);

    const visibleNavItems = useMemo(() =>
        allNavItems.filter(item => user.permissions.includes(item.permission)),
        [user.permissions, allNavItems]
    );

    useEffect(() => {
        if (visibleNavItems.length > 0 && !activeView) {
            setActiveView(visibleNavItems[0].id);
        }
    }, [visibleNavItems, activeView]);

    const renderView = () => {
        const props = { showSnackbar, user };
        if (!user.permissions.includes(visibleNavItems.find(i => i.id === activeView)?.permission)) {
            return <Alert severity="error">You do not have permission to view this page.</Alert>;
        }
        
        switch (activeView) {
            case 'dashboard': return <SalesDashboard {...props} />;
            case 'pos': return <PointOfSaleScreen {...props} />;
            case 'customers': return <CustomerManagement {...props} />;
            case 'products': return <ProductManagement {...props} />;
            case 'inventory': return <InventoryManagement {...props} />;
            case 'orders': return <OrderManagement {...props} />;
            case 'history': return <OrderHistory {...props} />;
            case 'accounting': return <AccountingManagement {...props} />;
            case 'discounts': return <DiscountManagement {...props} />;
            case 'reports': return <ReportManagement {...props} />;
            case 'users': return <UserManagement {...props} />;
            case 'branches': return <BranchManagement {...props} />;
            default: return <LoadingSpinner />;
        }
    };

    const drawerContent = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 2, flexShrink: 0 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}><Store /></Avatar>
                <Typography variant="h6" noWrap component="div" fontWeight="bold">Bughaw</Typography>
            </Toolbar>
            <Divider />
            <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
                {visibleNavItems.map((item) => (
                    <ListItem key={item.id} disablePadding>
                        <ListItemButton selected={activeView === item.id} onClick={() => { setActiveView(item.id); if (mobileOpen) handleDrawerToggle(); }}>
                            <ListItemIcon sx={{ color: activeView === item.id ? 'primary.main' : 'inherit', minWidth: 40 }}>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.label} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Box sx={{ p: 2, flexShrink: 0 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography>Welcome, <strong>{user.username}</strong></Typography>
                <Typography variant="body2" color="text.secondary">{user.role} | {user.branch_name}</Typography>
                <Button fullWidth variant="outlined" color="secondary" onClick={onLogout} sx={{ mt: 2 }}>Logout</Button>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed" elevation={0} sx={{ width: { sm: `calc(100% - ${drawerWidth}px)` }, ml: { sm: `${drawerWidth}px` }, bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Toolbar>
                    <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}><MenuIcon /></IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>{visibleNavItems.find(i => i.id === activeView)?.label}</Typography>
                </Toolbar>
            </AppBar>
            <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
                <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}>{drawerContent}</Drawer>
                <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }} open>{drawerContent}</Drawer>
            </Box>
            <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, bgcolor: 'background.default', minHeight: '100vh' }}>
                <Toolbar />
                {renderView()}
            </Box>
        </Box>
    );
};

function App() {
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    useEffect(() => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('bughaw_user') || 'null');
            const storedToken = localStorage.getItem('bughaw_token');
            if (storedUser && storedToken) {
                setUser(storedUser);
            }
        } catch (error) {
            console.error("Could not parse user from localStorage", error);
            localStorage.clear();
        } finally {
            setIsAuthReady(true);
        }
    }, []);

    const handleLoginSuccess = (token, newUser) => {
        localStorage.setItem('bughaw_token', token);
        localStorage.setItem('bughaw_user', JSON.stringify(newUser));
        setUser(newUser);
    };

    const handleLogout = () => {
        localStorage.removeItem('bughaw_token');
        localStorage.removeItem('bughaw_user');
        setUser(null);
    };

    const showSnackbar = (message, severity = 'info') => setSnackbar({ open: true, message, severity });
    const handleSnackbarClose = () => setSnackbar({ ...snackbar, open: false });

    if (!isAuthReady) {
        return <ThemeProvider theme={theme}><LoadingSpinner /></ThemeProvider>;
    }

    return (
        <ThemeProvider theme={theme}>
            <AppSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={handleSnackbarClose} />
            {!user ? <AuthScreen onLoginSuccess={handleLoginSuccess} /> : <MainLayout user={user} onLogout={handleLogout} showSnackbar={showSnackbar} />}
        </ThemeProvider>
    );
}

export default App;