import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
    Box, Grid, Card, CardHeader, CardContent, Stack, Typography, Button,
    FormControl, InputLabel, Select, MenuItem, Paper, CircularProgress, TextField, Autocomplete
} from '@mui/material';
import { FileDownload, Search, Assessment } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { styled } from '@mui/material/styles';
import { Chart, BarController, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

import { api } from '../../api/apiClient';
import PageHeader from '../../components/common/PageHeader';

Chart.register(BarController, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 0,
  '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(0,0,0,0.04)', fontWeight: 'bold' },
}));

const ReportManagement = ({ showSnackbar }) => {
    // State for Inactive Customer Report
    const [inactiveLoading, setInactiveLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [daysInactive, setDaysInactive] = useState(90);

    // State for Sales Comparison Report
    const [salesLoading, setSalesLoading] = useState(false);
    const [monthA, setMonthA] = useState('');
    const [monthB, setMonthB] = useState('');
    const salesChartRef = useRef(null);
    const salesChartInstance = useRef(null);
    
    // --- NEW State for Customer Comparison Report ---
    const [customers, setCustomers] = useState([]);
    const [customerLoading, setCustomerLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [custMonthA, setCustMonthA] = useState('');
    const [custMonthB, setCustMonthB] = useState('');
    const custChartRef = useRef(null);
    const custChartInstance = useRef(null);

    // Fetch customers once for the dropdown
    useEffect(() => {
        api.getCustomers().then(setCustomers).catch(() => showSnackbar("Could not load customers for reports.", "error"));
    }, [showSnackbar]);

    const generateInactiveReport = useCallback(async () => {
        setInactiveLoading(true);
        setReportData([]);
        try {
            const data = await api.getInactiveCustomersReport(daysInactive);
            setReportData(data);
            if (data.length === 0) showSnackbar("No inactive customers found for the selected period.", "info");
        } catch (error) {
            showSnackbar("Failed to generate inactive customer report.", "error");
        } finally {
            setInactiveLoading(false);
        }
    }, [daysInactive, showSnackbar]);

    const generateSalesComparison = useCallback(async () => {
        if (!monthA || !monthB) return showSnackbar("Please select two months to compare.", "warning");
        setSalesLoading(true);
        try {
            const data = await api.getSalesComparisonReport({ monthA, monthB });
            if (salesChartInstance.current) salesChartInstance.current.destroy();
            const ctx = salesChartRef.current.getContext('2d');
            salesChartInstance.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: [`Month A (${monthA})`, `Month B (${monthB})`],
                    datasets: [{
                        label: 'Total Sales (PHP)',
                        data: [data.totalSalesMonthA || 0, data.totalSalesMonthB || 0],
                        backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)'],
                        borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)'],
                        borderWidth: 1
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: value => `₱${value.toLocaleString()}` } } } }
            });
        } catch (error) {
            showSnackbar("Failed to generate sales comparison.", "error");
        } finally {
            setSalesLoading(false);
        }
    }, [monthA, monthB, showSnackbar]);

    // --- NEW Function to generate Customer Comparison Report ---
    const generateCustomerComparison = useCallback(async () => {
        if (!selectedCustomer || !custMonthA || !custMonthB) return showSnackbar("Please select a customer and two months.", "warning");
        setCustomerLoading(true);
        try {
            const data = await api.getCustomerComparisonReport({ customerId: selectedCustomer.id, monthA: custMonthA, monthB: custMonthB });
            if (custChartInstance.current) custChartInstance.current.destroy();
            const ctx = custChartRef.current.getContext('2d');
            custChartInstance.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: [`${selectedCustomer.name} (${custMonthA})`, `${selectedCustomer.name} (${custMonthB})`],
                    datasets: [{
                        label: 'Total Purchase Value (PHP)',
                        data: [data.totalSalesMonthA || 0, data.totalSalesMonthB || 0],
                        backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(153, 102, 255, 0.6)'],
                        borderColor: ['rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)'],
                        borderWidth: 1
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: value => `₱${value.toLocaleString()}` } } } }
            });
        } catch (error) {
            showSnackbar("Failed to generate customer comparison.", "error");
        } finally {
            setCustomerLoading(false);
        }
    }, [selectedCustomer, custMonthA, custMonthB, showSnackbar]);

    const exportToExcel = () => {
        if (reportData.length === 0) return showSnackbar("No data to export.", "warning");
        const worksheet = XLSX.utils.json_to_sheet(reportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inactive Customers");
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(blob, `Inactive_Customers_${daysInactive}_Days.xlsx`);
    };

    const inactiveColumns = [
        { field: 'customer_code', headerName: 'Customer Code', width: 150 },
        { field: 'name', headerName: 'Customer Name', flex: 1, minWidth: 200 },
        { field: 'agent', headerName: 'Agent', width: 150 },
        { field: 'last_purchase_date', headerName: 'Last Purchase', width: 180, renderCell: params => params.value ? new Date(params.value).toLocaleDateString() : 'N/A' },
        { field: 'last_order_no', headerName: 'Last Invoice #', width: 150, renderCell: params => params.value || 'N/A' },
    ];

    return (
        <Box>
            <PageHeader title="Report Management" />
            <Grid container spacing={3}>
                <Grid item xs={12} lg={6}>
                    <Card><CardHeader title="Inactive Customer Report" />
                        <CardContent>
                             <Stack direction={{xs: 'column', sm: 'row'}} spacing={2} alignItems="center">
                                <FormControl sx={{ minWidth: 200 }}>
                                    <InputLabel>Inactive for more than...</InputLabel>
                                    <Select value={daysInactive} label="Inactive for more than..." onChange={(e) => setDaysInactive(e.target.value)}>
                                        <MenuItem value={30}>30 Days</MenuItem><MenuItem value={60}>60 Days</MenuItem>
                                        <MenuItem value={90}>90 Days</MenuItem><MenuItem value={180}>180 Days</MenuItem>
                                    </Select>
                                </FormControl>
                                <Button variant="contained" onClick={generateInactiveReport} disabled={inactiveLoading} startIcon={inactiveLoading ? <CircularProgress size={20} color="inherit" /> : <Search />}>Generate</Button>
                                <Button variant="outlined" onClick={exportToExcel} disabled={reportData.length === 0} startIcon={<FileDownload />}>Export</Button>
                            </Stack>
                        </CardContent>
                        <Paper sx={{ height: '60vh', width: '100%', mt: 2 }}><StyledDataGrid rows={reportData} columns={inactiveColumns} getRowId={(row) => row.id} loading={inactiveLoading} hideFooter={reportData.length === 0} /></Paper>
                    </Card>
                </Grid>

                <Grid item xs={12} lg={6}>
                    <Stack spacing={3}>
                        <Card><CardHeader title="Overall Sales Comparison" />
                            <CardContent>
                                <Stack direction={{xs: 'column', sm: 'row'}} spacing={2} alignItems="center">
                                    <TextField label="Month A" type="month" value={monthA} onChange={e => setMonthA(e.target.value)} InputLabelProps={{ shrink: true }} />
                                    <TextField label="Month B" type="month" value={monthB} onChange={e => setMonthB(e.target.value)} InputLabelProps={{ shrink: true }} />
                                    <Button variant="contained" onClick={generateSalesComparison} disabled={salesLoading} startIcon={salesLoading ? <CircularProgress size={20} color="inherit" /> : <Assessment />}>Compare</Button>
                                </Stack>
                                 <Box sx={{ height: 300, mt: 3 }}><canvas ref={salesChartRef}></canvas></Box>
                            </CardContent>
                        </Card>

                        {/* --- NEW Customer Comparison Card --- */}
                        <Card><CardHeader title="Customer Purchase Comparison" />
                            <CardContent>
                                <Stack spacing={2}>
                                    <Autocomplete options={customers} getOptionLabel={(c) => c.name} value={selectedCustomer} onChange={(e, v) => setSelectedCustomer(v)} renderInput={(params) => <TextField {...params} label="Select Customer" />} />
                                    <Stack direction={{xs: 'column', sm: 'row'}} spacing={2} alignItems="center">
                                        <TextField label="Month A" type="month" fullWidth value={custMonthA} onChange={e => setCustMonthA(e.target.value)} InputLabelProps={{ shrink: true }} />
                                        <TextField label="Month B" type="month" fullWidth value={custMonthB} onChange={e => setCustMonthB(e.target.value)} InputLabelProps={{ shrink: true }} />
                                    </Stack>
                                    <Button variant="contained" onClick={generateCustomerComparison} disabled={customerLoading} startIcon={customerLoading ? <CircularProgress size={20} color="inherit" /> : <Assessment />}>Compare Customer</Button>
                                </Stack>
                                <Box sx={{ height: 300, mt: 3 }}><canvas ref={custChartRef}></canvas></Box>
                            </CardContent>
                        </Card>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ReportManagement;