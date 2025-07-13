import React, { useState } from 'react';
import { Box, Container, Card, CardContent, Avatar, Typography, TextField, Button, Alert, CircularProgress, Fade } from '@mui/material';
import { Store } from '@mui/icons-material';
import { api } from '../../api/apiClient';

const AuthScreen = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const { token, user } = await api.login({ username, password });
            onLoginSuccess(token, user);
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check credentials or server connection.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', p: 2 }}>
            <Container component="main" maxWidth="xs">
                <Fade in timeout={800}>
                    <Card elevation={10} sx={{ borderRadius: 4, p: 2 }}>
                        <CardContent sx={{ p: 4 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Avatar sx={{ width: 80, height: 80, mb: 2, bgcolor: 'primary.main', fontSize: '2.5rem' }}>
                                    <Store />
                                </Avatar>
                                <Typography component="h1" variant="h4" gutterBottom fontWeight="bold">Bughaw Admin</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Sign in to continue</Typography>
                                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                                    <TextField margin="normal" required fullWidth id="username" label="Username" name="username" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} disabled={isLoading} />
                                    <TextField margin="normal" required fullWidth name="password" label="Password" type="password" id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                                    {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
                                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2, py: 1.5 }} disabled={isLoading}>
                                        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                                    </Button>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Fade>
            </Container>
        </Box>
    );
};

export default AuthScreen;