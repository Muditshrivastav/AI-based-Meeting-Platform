import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography } from '@mui/material';
import { AuthContext } from '../contexts/AuthContext';
import { generateRoomId } from '../utils/generateRoomId';

export default function Lobby() {
    const navigate = useNavigate();
    const { userData } = useContext(AuthContext);

    const createRoom = () => {
        const code = generateRoomId();
        navigate(`/join?code=${code}`);
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f2f7ff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2, bgcolor: '#ffffff', boxShadow: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Web-RTC Lobby</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button onClick={() => navigate('/home')}>Home</Button>
                    <Button onClick={() => navigate('/profile')}>Profile</Button>
                    <Button color="error" onClick={() => { localStorage.removeItem('token'); navigate('/auth') }}>
                        Logout
                    </Button>
                </Box>
            </Box>
            <Paper sx={{ width: '100%', maxWidth: 1040, p: 4, mx: 'auto', mt: 4 }} elevation={4}>
                <Typography variant="h3" component="h1" gutterBottom>
                    Welcome to your Lobby
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                    {userData?.name ? `Hi ${userData.name},` : 'Start your session and join your next meeting quickly.'}
                    {' '}In the lobby, you can create a new meeting room or jump into an existing one.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                    <Paper sx={{ flex: 1, p: 3, bgcolor: '#ffffff' }} elevation={2}>
                        <Typography variant="h5" sx={{ mb: 2 }}>Create a new meeting</Typography>
                        <Typography variant="body2" sx={{ mb: 3 }}>
                            Generate a fresh meeting code, then invite your participants to join.
                        </Typography>
                        <Button variant="contained" size="large" onClick={createRoom}>
                            Create Meeting Room
                        </Button>
                    </Paper>
                    <Paper sx={{ flex: 1, p: 3, bgcolor: '#ffffff' }} elevation={2}>
                        <Typography variant="h5" sx={{ mb: 2 }}>Join an existing meeting</Typography>
                        <Typography variant="body2" sx={{ mb: 3 }}>
                            Already have a code? Go to the join page and enter your meeting ID.
                        </Typography>
                        <Button variant="outlined" size="large" onClick={() => navigate('/join')}>
                            Go to Join Meeting
                        </Button>
                    </Paper>
                </Box>
            </Paper>
        </Box>
    );
}
