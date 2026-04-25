import React, { useContext, useEffect, useState } from 'react';
import withAuth from '../utils/withAuth';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';

function Profile() {
    const { getUserProfile, updateUserProfile } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [about, setAbout] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const profile = await getUserProfile();
                setName(profile.name || '');
                setUsername(profile.username || '');
                setAbout(profile.about || '');
            } catch (err) {
                setError('Unable to load profile');
            }
        };

        loadProfile();
    }, [getUserProfile]);

    const handleSave = async () => {
        try {
            await updateUserProfile({ name, about });
            setMessage('Profile saved successfully');
            setError('');
        } catch (err) {
            setError('Failed to save profile');
            setMessage('');
        }
    };

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2, bgcolor: '#f5f5f5' }}>
            <Paper sx={{ width: '100%', maxWidth: 520, p: 4 }} elevation={3}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Your Profile
                </Typography>

                <TextField
                    fullWidth
                    label="Full Name"
                    value={name}
                    margin="normal"
                    onChange={(e) => setName(e.target.value)}
                />
                <TextField
                    fullWidth
                    label="Username"
                    value={username}
                    margin="normal"
                    disabled
                />
                <TextField
                    fullWidth
                    label="About You"
                    value={about}
                    margin="normal"
                    multiline
                    minRows={4}
                    onChange={(e) => setAbout(e.target.value)}
                    helperText="Write a short bio or interests to show on your profile"
                />

                {message && <Typography color="success.main" sx={{ mt: 1 }}>{message}</Typography>}
                {error && <Typography color="error.main" sx={{ mt: 1 }}>{error}</Typography>}

                <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
                    <Button variant="contained" onClick={handleSave}>
                        Save Profile
                    </Button>
                    <Button variant="outlined" onClick={() => navigate('/home')}>
                        Back to Home
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}

export default withAuth(Profile);
