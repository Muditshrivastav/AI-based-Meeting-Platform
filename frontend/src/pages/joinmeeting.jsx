import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
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
            setInfo('Your meeting code is ready. Click Join to enter.');
        }
    }, [searchParams]);

    const handleCreate = () => {
        const code = generateRoomId();
        setMeetingCode(code);
        setInfo('Meeting room created, paste or share the code with guests.');
        setError('');
    };

    const handleJoin = async () => {
        if (!meetingCode) {
            setError('Please enter a meeting code before joining.');
            return;
        }
        try {
            if (localStorage.getItem('token')) {
                await addToUserHistory(meetingCode);
            }
            navigate(`/${meetingCode}`);
        } catch (err) {
            setError('Unable to save meeting history, but you can still join.');
            navigate(`/${meetingCode}`);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#eef4ff', p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Paper sx={{ width: '100%', maxWidth: 700, p: 4 }} elevation={4}>
                <Typography variant="h4" gutterBottom>
                    Join Meeting
                </Typography>
                <Typography sx={{ mb: 3 }}>
                    {userData?.name ? `Welcome back, ${userData.name}.` : 'Enter a meeting code to join a room now.'}
                </Typography>
                <TextField
                    fullWidth
                    label="Meeting Code"
                    value={meetingCode}
                    onChange={(e) => {
                        setMeetingCode(e.target.value.toUpperCase().trim());
                        setError('');
                        setInfo('');
                    }}
                    sx={{ mb: 2 }}
                />
                {info && <Typography color="primary" sx={{ mb: 1 }}>{info}</Typography>}
                {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                    <Button variant="contained" onClick={handleJoin}>
                        Join Meeting
                    </Button>
                    <Button variant="outlined" onClick={handleCreate}>
                        Create New Code
                    </Button>
                </Box>
                <Typography variant="body2" sx={{ mb: 3 }}>
                    If you already have a meeting code, paste it above and click Join. Otherwise create a new code and then join.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="text" onClick={() => navigate('/lobby')}>
                        Back to Lobby
                    </Button>
                    <Button variant="text" onClick={() => navigate('/home')}>
                        My Dashboard
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
