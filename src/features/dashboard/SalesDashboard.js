import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chart, BarController, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Box, Grid, Card, CardContent, CardHeader, Alert, Typography, Avatar, Stack, ToggleButtonGroup, ToggleButton, alpha, Skeleton } from '@mui/material';
import { TrendingUp, ShoppingBag, StarBorder } from '@mui/icons-material';
import { api } from '../../api/apiClient';
import { theme } from '../../theme/theme';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/common/PageHeader'; // Assuming PageHeader is now a common component

Chart.register(BarController, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SalesDashboard = ({ showSnackbar }) => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('weekly');
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const fetchData = useCallback(async (currentPeriod) => {
        setLoading(true);
        try {
            // Pass the period to the API call
            const data = await api.getSalesSummary(currentPeriod);
            setSummary(data);
        } catch (err) {
            showSnackbar("Failed to fetch sales summary.", "error");
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchData(period);
    }, [period, fetchData]);

    useEffect(() => {
        if (summary?.dailySales && chartRef.current) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
            const ctx = chartRef.current.getContext('2d');
            chartInstance.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: summary.dailySales.labels,
                    datasets: [{
                        label: 'Sales (PHP)',
                        data: summary.dailySales.data,
                        backgroundColor: alpha(theme.palette.primary.main, 0.7),
                        borderColor: theme.palette.primary.main,
                        borderWidth: 1,
                        borderRadius: 5,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } },
                    plugins: { legend: { display: false } }
                }
            });
        }
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [summary]);

    // Function to get the correct title for Top Products
    const getTopProductsTitle = () => {
        switch (period) {
            case 'daily': return 'Top Products (Today)';
            case 'weekly': return 'Top Products (This Week)';
            case 'monthly': return 'Top Products (This Month)';
            default: return 'Top Products';
        }
    };
    
    const handlePeriodChange = (event, newPeriod) => {
        if (newPeriod !== null) {
            setPeriod(newPeriod);
        }
    };

    const metricCards = [
        { title: `Revenue (${period})`, value: `₱${parseFloat(summary?.summary.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <TrendingUp color="success" sx={{ fontSize: 40 }} />, loading: loading },
        { title: `Orders (${period})`, value: summary?.summary.totalOrders || 0, icon: <ShoppingBag color="info" sx={{ fontSize: 40 }} />, loading: loading },
        { title: 'Top Product', value: summary?.topProducts[0]?.name || 'N/A', icon: <StarBorder color="warning" sx={{ fontSize: 40 }} />, loading: loading },
    ];


    return (
        <Box>
            <PageHeader title="Dashboard">
                <ToggleButtonGroup color="primary" value={period} exclusive onChange={handlePeriodChange}>
                    <ToggleButton value="daily">Daily</ToggleButton>
                    <ToggleButton value="weekly">Weekly</ToggleButton>
                    <ToggleButton value="monthly">Monthly</ToggleButton>
                </ToggleButtonGroup>
            </PageHeader>
            <Grid container spacing={3}>
                {metricCards.map((card, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card>
                            <CardContent>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar sx={{ bgcolor: alpha(theme.palette[card.icon.props.color].main, 0.1), width: 56, height: 56 }}>{card.icon}</Avatar>
                                    <Box>
                                        {card.loading ? (
                                            <>
                                                <Skeleton variant="text" width={120} height={32} />
                                                <Skeleton variant="text" width={80} />
                                            </>
                                        ) : (
                                            <>
                                                <Typography variant="h5" fontWeight="bold">{card.value}</Typography>
                                                <Typography variant="body2" color="text.secondary">{card.title}</Typography>
                                            </>
                                        )}
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
                <Grid item xs={12} lg={8}>
                    <Card>
                        <CardHeader title="Sales Performance" />
                        <CardContent>
                            <Box sx={{ height: 400 }}>
                                {loading ? <Skeleton variant="rectangular" width="100%" height="100%" /> : <canvas ref={chartRef}></canvas>}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} lg={4}>
                    <Card>
                        {/* Title is now dynamic */}
                        <CardHeader title={getTopProductsTitle()} />
                        <CardContent>
                            <Stack spacing={2}>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                       <Stack direction="row" key={i} alignItems="center" spacing={2}>
                                            <Skeleton variant="circular"><Avatar /></Skeleton>
                                            <Box>
                                                <Skeleton variant="text" width={150} />
                                                <Skeleton variant="text" width={80} />
                                            </Box>
                                       </Stack>
                                    ))
                                ) : (
                                    summary?.topProducts.length > 0 ? summary.topProducts.slice(0, 10).map((p, i) => (
                                        <Stack direction="row" key={i} alignItems="center" spacing={2}>
                                            <Avatar sx={{ bgcolor: 'primary.light', color: 'white' }}>{i + 1}</Avatar>
                                            <Box><Typography fontWeight="500">{p.name}</Typography><Typography variant="body2" color="text.secondary">{p.total_quantity} units sold</Typography></Box>
                                        </Stack>
                                    )) : <Typography color="text.secondary">No sales data for this period.</Typography>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default SalesDashboard;