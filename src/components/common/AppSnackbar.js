import React from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';

const AppSnackbar = ({ open, message, severity, onClose }) => (
    <Snackbar open={open} autoHideDuration={4000} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} TransitionComponent={Slide}>
        <Alert onClose={onClose} severity={severity} variant="filled" sx={{ width: '100%' }}>{message}</Alert>
    </Snackbar>
);

export default AppSnackbar;