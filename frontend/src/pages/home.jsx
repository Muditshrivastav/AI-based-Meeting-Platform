import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { Avatar, Box, Button, Chip, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import GroupsIcon from '@mui/icons-material/Groups';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import DescriptionIcon from '@mui/icons-material/Description';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { IconButton } from '@mui/material';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';

function HomeComponent() {
    const navigate = useNavigate();
    const { userData } = useContext(AuthContext);
    const { mode, toggleTheme } = useContext(ThemeContext);
    const [meetingCode, setMeetingCode] = useState('');
    const previewParticipants = [
        {
            name: 'You',
            photo: '/avatars/you.png'
        },
        {
            name: 'Asha',
            photo: '/avatars/asha.png'
        },
        {
            name: 'Rohan',
            photo: '/avatars/rohan.png'
        },
        {
            name: 'Team',
            photo: '/avatars/team.png'
        }
    ];

    const createRoom = () => {
        navigate('/join');
    }

    const getMeetingCode = (value) => {
        const input = value.trim();
        if (!input) return '';

        try {
            const url = new URL(input);
            return url.pathname.replace(/^\/+/, '').split('/')[0];
        } catch {
            return input.replace(/^\/+/, '').split('/')[0];
        }
    }

    const joinRoom = () => {
        const code = getMeetingCode(meetingCode);
        navigate(code ? `/meeting/${code}` : '/join');
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'transparent', color: 'text.primary' }}>
            <Box sx={{ height: 72, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: { xs: 2, md: 5 }, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)', color: mode === 'dark' ? '#ffffff' : '#000000', width: 40, height: 40 }}>
                        <VideoCallIcon />
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
                        MeetSpace
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton onClick={toggleTheme} color="inherit" sx={{ mr: 1 }}>
                        {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                    </IconButton>
                    <Button startIcon={<HomeIcon />} onClick={() => navigate('/home')}>
                        Home
                    </Button>
                    <Button startIcon={<DescriptionIcon />} onClick={() => navigate('/notes')}>
                        Notes
                    </Button>
                    <Button startIcon={<AccountCircleIcon />} onClick={() => navigate('/profile')}>
                        Profile
                    </Button>
                    <Button color="error" onClick={() => { localStorage.removeItem('token'); navigate('/auth') }}>
                        Logout
                    </Button>
                </Box>
            </Box>

            <Box sx={{ maxWidth: 1180, mx: 'auto', px: { xs: 2.5, md: 5 }, py: { xs: 6, md: 10 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 0.9fr' }, gap: { xs: 6, md: 8 }, alignItems: 'center' }}>
                <Box>
                    <Chip label={userData?.name ? `Welcome, ${userData.name}` : 'Secure video meetings'} sx={{ mb: 3, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e8f0fe', color: mode === 'dark' ? '#e8eaed' : '#1967d2', fontWeight: 600 }} />
                    <Typography variant="h2" sx={{ fontSize: { xs: 38, md: 56 }, lineHeight: 1.08, fontWeight: 400, letterSpacing: '-0.04em', mb: 2 }}>
                        Video meetings for everyone.
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'text.secondary', maxWidth: 560, fontWeight: 400, lineHeight: 1.6, mb: 4 }}>
                        Create a meeting link instantly, share it with your team, or join with a meeting code.
                    </Typography>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<VideoCallIcon />}
                            onClick={createRoom}
                            sx={{ borderRadius: 2, px: 3, py: 1.4, textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}
                        >
                            New meeting
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            startIcon={<EventAvailableIcon />}
                            onClick={() => navigate('/schedule')}
                            color="inherit"
                            sx={{ borderRadius: 2, px: 3, py: 1.4, textTransform: 'none', fontWeight: 700 }}
                        >
                            Schedule
                        </Button>
                        <TextField
                            value={meetingCode}
                            onChange={(e) => setMeetingCode(e.target.value.trim())}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    joinRoom();
                                }
                            }}
                            placeholder="Enter a code or link"
                            size="small"
                            InputProps={{ startAdornment: <KeyboardIcon sx={{ color: 'text.secondary', mr: 1 }} /> }}
                            sx={{ minWidth: { xs: '100%', sm: 250 }, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}
                        />
                        <Button onClick={joinRoom} color="inherit" sx={{ textTransform: 'none', fontWeight: 700 }}>
                            Join
                        </Button>
                    </Stack>

                    <Divider sx={{ my: 4, maxWidth: 580 }} />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ color: 'text.secondary' }}>
                        <Stack direction="row" spacing={1.2} alignItems="center">
                            <LockOutlinedIcon fontSize="small" color="success" />
                            <Typography variant="body2">Private meeting rooms</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1.2} alignItems="center">
                            <GroupsIcon fontSize="small" color="primary" />
                            <Typography variant="body2">Easy invite sharing</Typography>
                        </Stack>
                    </Stack>
                </Box>

                <Paper elevation={0} sx={{ position: 'relative', minHeight: 420, borderRadius: 6, overflow: 'hidden', bgcolor: 'action.hover', border: 1, borderColor: 'divider', p: 3 }}>
                    <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 25% 20%, #d2e3fc 0, transparent 32%), radial-gradient(circle at 80% 20%, #e6f4ea 0, transparent 28%), radial-gradient(circle at 70% 80%, #fce8e6 0, transparent 28%)' }} />
                    <Paper elevation={0} sx={{ position: 'relative', height: 260, borderRadius: 5, bgcolor: '#202124', p: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, boxShadow: '0 24px 60px rgba(60,64,67,0.22)' }}>
                        {previewParticipants.map((participant) => (
                            <Box key={participant.name} sx={{ borderRadius: 3, backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.62), rgba(0,0,0,0.05)), url(${participant.photo})`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-end', p: 1.5, color: '#fff', minHeight: 110 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, textShadow: '0 1px 6px rgba(0,0,0,0.45)' }}>{participant.name}</Typography>
                            </Box>
                        ))}
                    </Paper>
                    <Paper elevation={0} sx={{ position: 'relative', mt: -3, mx: 'auto', width: 'fit-content', borderRadius: 10, px: 2.5, py: 1.2, display: 'flex', gap: 1.5, alignItems: 'center', bgcolor: 'background.paper', boxShadow: '0 12px 32px rgba(60,64,67,0.18)' }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#34a853' }} />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>Ready to meet</Typography>
                    </Paper>
                    <Typography variant="h5" sx={{ position: 'relative', mt: 5, textAlign: 'center', fontWeight: 500 }}>
                        Get a link you can share
                    </Typography>
                    <Typography sx={{ position: 'relative', mt: 1, textAlign: 'center', color: 'text.secondary' }}>
                        Click <strong>New meeting</strong> to create a room and invite others.
                    </Typography>
                </Paper>
            </Box>
        </Box>
    )
}

export default withAuth(HomeComponent)
