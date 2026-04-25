import React, { useContext } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { Button, Paper, Typography, Box } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { AuthContext } from '../contexts/AuthContext';
import { generateRoomId } from '../utils/generateRoomId';

function HomeComponent() {
    let navigate = useNavigate();
    const { userData } = useContext(AuthContext);

    const createRoom = () => {
        const code = generateRoomId();
        navigate(`/join?code=${code}`);
    }

    const joinRoom = async () => {
        navigate('/join');
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f2f7ff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2, bgcolor: '#ffffff', boxShadow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>Web-RTC Lobby</Typography>
                    {userData?.name && <Typography variant="body1">Welcome, {userData.name}</Typography>}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button startIcon={<HomeIcon />} onClick={() => navigate('/home')}>
                        Home
                    </Button>
                    <Button startIcon={<AccountCircleIcon />} onClick={() => navigate('/profile')}>
                        Profile
                    </Button>
                    <Button color="error" onClick={() => { localStorage.removeItem('token'); navigate('/auth') }}>
                        Logout
                    </Button>
                </Box>
            </Box>
            <Box sx={{ px: 3, py: 4, display: 'flex', justifyContent: 'center' }}>
                <Paper sx={{ width: '100%', maxWidth: 1040, p: 4 }} elevation={4}>
                    <Typography variant="h4" gutterBottom>
                        Enter Your Lobby
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3 }}>
                        In the lobby, you can create a new meeting room or join an existing meeting. Use the navigation at the top to move between Home and Profile.
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                        <Paper sx={{ flex: 1, p: 3, bgcolor: '#fdfdfd' }} elevation={2}>
                            <Typography variant="h6" sx={{ mb: 2 }}>Create a new meeting</Typography>
                            <Typography variant="body2" sx={{ mb: 3 }}>
                                Generate a fresh meeting code and invite your participants.
                            </Typography>
                            <Button variant="contained" size="large" onClick={createRoom}>
                                Create Meeting Room
                            </Button>
                        </Paper>
                        <Paper sx={{ flex: 1, p: 3, bgcolor: '#fdfdfd' }} elevation={2}>
                            <Typography variant="h6" sx={{ mb: 2 }}>Join an existing meeting</Typography>
                            <Typography variant="body2" sx={{ mb: 3 }}>
                                Already have a code? Go to the join page and enter your meeting ID.
                            </Typography>
                            <Button variant="outlined" size="large" onClick={joinRoom}>
                                Join Meeting
                            </Button>
                        </Paper>
                    </Box>
                </Paper>
            </Box>
        </Box>
    )
}

export default withAuth(HomeComponent) 