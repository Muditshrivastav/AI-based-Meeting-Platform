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
import { AuthContext } from '../contexts/AuthContext';

function HomeComponent() {
    const navigate = useNavigate();
    const { userData } = useContext(AuthContext);
    const [meetingCode, setMeetingCode] = useState('');
    const previewParticipants = [
        {
            name: 'You',
            photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80'
        },
        {
            name: 'Asha',
            photo: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80'
        },
        {
            name: 'Rohan',
            photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80'
        },
        {
            name: 'Team',
            photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=600&q=80'
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
        <Box sx={{ minHeight: '100vh', bgcolor: '#fff', color: '#202124' }}>
            <Box sx={{ height: 72, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: { xs: 2, md: 5 }, borderBottom: '1px solid #e8eaed', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#1a73e8', width: 40, height: 40 }}>
                        <VideoCallIcon />
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
                        MeetSpace
                    </Typography>
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

            <Box sx={{ maxWidth: 1180, mx: 'auto', px: { xs: 2.5, md: 5 }, py: { xs: 6, md: 10 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 0.9fr' }, gap: { xs: 6, md: 8 }, alignItems: 'center' }}>
                <Box>
                    <Chip label={userData?.name ? `Welcome, ${userData.name}` : 'Secure video meetings'} sx={{ mb: 3, bgcolor: '#e8f0fe', color: '#1967d2', fontWeight: 600 }} />
                    <Typography variant="h2" sx={{ fontSize: { xs: 38, md: 56 }, lineHeight: 1.08, fontWeight: 400, letterSpacing: '-0.04em', mb: 2 }}>
                        Video meetings for everyone.
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#5f6368', maxWidth: 560, fontWeight: 400, lineHeight: 1.6, mb: 4 }}>
                        Create a meeting link instantly, share it with your team, or join with a meeting code.
                    </Typography>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<VideoCallIcon />}
                            onClick={createRoom}
                            sx={{ borderRadius: 2, px: 3, py: 1.4, bgcolor: '#1a73e8', textTransform: 'none', fontWeight: 700, boxShadow: 'none', '&:hover': { bgcolor: '#1558b0', boxShadow: '0 2px 8px rgba(26,115,232,0.25)' } }}
                        >
                            New meeting
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            startIcon={<EventAvailableIcon />}
                            onClick={() => navigate('/schedule')}
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
                            InputProps={{ startAdornment: <KeyboardIcon sx={{ color: '#5f6368', mr: 1 }} /> }}
                            sx={{ minWidth: { xs: '100%', sm: 250 }, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                        />
                        <Button onClick={joinRoom} sx={{ textTransform: 'none', fontWeight: 700, color: '#1a73e8' }}>
                            Join
                        </Button>
                    </Stack>

                    <Divider sx={{ my: 4, maxWidth: 580 }} />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ color: '#5f6368' }}>
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

                <Paper elevation={0} sx={{ position: 'relative', minHeight: 420, borderRadius: 6, overflow: 'hidden', bgcolor: '#f8fbff', border: '1px solid #e8eaed', p: 3 }}>
                    <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 25% 20%, #d2e3fc 0, transparent 32%), radial-gradient(circle at 80% 20%, #e6f4ea 0, transparent 28%), radial-gradient(circle at 70% 80%, #fce8e6 0, transparent 28%)' }} />
                    <Paper elevation={0} sx={{ position: 'relative', height: 260, borderRadius: 5, bgcolor: '#202124', p: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, boxShadow: '0 24px 60px rgba(60,64,67,0.22)' }}>
                        {previewParticipants.map((participant) => (
                            <Box key={participant.name} sx={{ borderRadius: 3, backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.62), rgba(0,0,0,0.05)), url(${participant.photo})`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-end', p: 1.5, color: '#fff', minHeight: 110 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, textShadow: '0 1px 6px rgba(0,0,0,0.45)' }}>{participant.name}</Typography>
                            </Box>
                        ))}
                    </Paper>
                    <Paper elevation={0} sx={{ position: 'relative', mt: -3, mx: 'auto', width: 'fit-content', borderRadius: 10, px: 2.5, py: 1.2, display: 'flex', gap: 1.5, alignItems: 'center', bgcolor: '#fff', boxShadow: '0 12px 32px rgba(60,64,67,0.18)' }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#34a853' }} />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>Ready to meet</Typography>
                    </Paper>
                    <Typography variant="h5" sx={{ position: 'relative', mt: 5, textAlign: 'center', fontWeight: 500 }}>
                        Get a link you can share
                    </Typography>
                    <Typography sx={{ position: 'relative', mt: 1, textAlign: 'center', color: '#5f6368' }}>
                        Click <strong>New meeting</strong> to create a room and invite others.
                    </Typography>
                </Paper>
            </Box>
        </Box>
    )
}

export default withAuth(HomeComponent)
