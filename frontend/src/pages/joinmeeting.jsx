import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Chip, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddLinkIcon from '@mui/icons-material/AddLink';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import { AuthContext } from '../contexts/AuthContext';
import { generateRoomId } from '../utils/generateRoomId';

export default function JoinMeeting() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [meetingCode, setMeetingCode] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const { addToUserHistory, userData } = useContext(AuthContext);

    useEffect(() => {
        const code = searchParams.get('code');
        if (code) {
            setMeetingCode(code);
            setInfo('Your host meeting code is ready. Share it with guests, then start the meeting.');
        }
    }, [searchParams]);

    const handleCreate = () => {
        const code = generateRoomId();
        setMeetingCode(code);
        setInfo('Host meeting code created. Share this code with guests, then start the meeting.');
        setError('');
    };

    const handleJoin = async () => {
        const code = meetingCode.trim();
        if (!code) {
            setError('Please create or enter a meeting code before starting.');
            return;
        }
        try {
            if (localStorage.getItem('token')) {
                await addToUserHistory(code);
            }
            navigate(`/meeting/${code}`);
        } catch (err) {
            setError('Unable to save meeting history, but you can still join.');
            navigate(`/meeting/${code}`);
        }
    };

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
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/home')} sx={{ textTransform: 'none', fontWeight: 700 }}>
                    Back to home
                </Button>
            </Box>

            <Box sx={{ maxWidth: 1120, mx: 'auto', px: { xs: 2.5, md: 5 }, py: { xs: 5, md: 8 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.95fr 1.05fr' }, gap: { xs: 4, md: 7 }, alignItems: 'center' }}>
                <Box>
                    <Chip label={userData?.name ? `Host: ${userData.name}` : 'Host a secure room'} sx={{ mb: 3, bgcolor: '#e8f0fe', color: '#1967d2', fontWeight: 600 }} />
                    <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 50 }, lineHeight: 1.12, fontWeight: 400, letterSpacing: '-0.04em', mb: 2 }}>
                        Create a meeting room for your guests.
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#5f6368', maxWidth: 520, fontWeight: 400, lineHeight: 1.6 }}>
                        Generate a host code, share it with others, and start the meeting when you are ready.
                    </Typography>

                    <Stack spacing={2.2} sx={{ mt: 4, color: '#5f6368' }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <VerifiedUserOutlinedIcon color="success" />
                            <Typography>Your code keeps each meeting room separate.</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <GroupsOutlinedIcon color="primary" />
                            <Typography>Guests can paste the same code on the Home page to join.</Typography>
                        </Stack>
                    </Stack>
                </Box>

                <Paper elevation={0} sx={{ borderRadius: 6, border: '1px solid #e8eaed', boxShadow: '0 24px 70px rgba(60,64,67,0.16)', overflow: 'hidden' }}>
                    <Box sx={{ bgcolor: '#f8fbff', p: { xs: 3, md: 4 }, borderBottom: '1px solid #e8eaed' }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ bgcolor: '#e8f0fe', color: '#1a73e8' }}>
                                <KeyboardIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                    Host meeting code
                                </Typography>
                                <Typography sx={{ color: '#5f6368' }}>
                                    Create a fresh code or use your own code for this meeting.
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>

                    <Box sx={{ p: { xs: 3, md: 4 } }}>
                        <TextField
                            fullWidth
                            label="Meeting code"
                            placeholder="Example: ABCD-1234"
                            value={meetingCode}
                            onChange={(e) => {
                                setMeetingCode(e.target.value.toUpperCase().trim());
                                setError('');
                                setInfo('');
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleJoin();
                                }
                            }}
                            InputProps={{ startAdornment: <KeyboardIcon sx={{ color: '#5f6368', mr: 1 }} /> }}
                            sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />

                        {info && <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>{info}</Alert>}
                        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<VideoCallIcon />}
                                onClick={handleJoin}
                                sx={{ borderRadius: 2, px: 3, py: 1.2, bgcolor: '#1a73e8', textTransform: 'none', fontWeight: 700, boxShadow: 'none', '&:hover': { bgcolor: '#1558b0' } }}
                            >
                                Start meeting
                            </Button>
                            <Button
                                variant="outlined"
                                size="large"
                                startIcon={<AddLinkIcon />}
                                onClick={handleCreate}
                                sx={{ borderRadius: 2, px: 3, py: 1.2, textTransform: 'none', fontWeight: 700 }}
                            >
                                Create new code
                            </Button>
                        </Stack>

                        <Divider sx={{ my: 3 }} />

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                            <Button variant="text" onClick={() => navigate('/lobby')} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                Back to Lobby
                            </Button>
                            <Button variant="text" onClick={() => navigate('/home')} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                My Dashboard
                            </Button>
                        </Stack>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
