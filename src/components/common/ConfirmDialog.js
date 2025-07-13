import React from 'react';
import { Box, Typography, Stack } from '@mui/material';

const PageHeader = ({ title, children }) => (
    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">{title}</Typography>
        <Box>{children}</Box>
    </Stack>
);

export default PageHeader;