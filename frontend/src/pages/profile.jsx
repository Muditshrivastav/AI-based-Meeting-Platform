import React, { useContext, useEffect, useState } from 'react';
import withAuth from '../utils/withAuth';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import VideoCallIcon from '@mui/icons-material/VideoCall';

function Profile() {
    const { getUserProfile, updateUserProfile } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [about, setAbout] = useState('');
    const [profilePhoto, setProfilePhoto] = useState('');
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
                setProfilePhoto(profile.profilePhoto || localStorage.getItem(`profilePhoto:${profile.username}`) || localStorage.getItem('profilePhoto:current') || '');
            } catch (err) {
                setError('Unable to load profile');
            }
        };

        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const compressProfilePhoto = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => {
                const image = new Image();
                image.onerror = reject;
                image.onload = () => {
                    const canvasSize = 240;
                    const canvas = document.createElement('canvas');
                    canvas.width = canvasSize;
                    canvas.height = canvasSize;
                    const context = canvas.getContext('2d');
                    const sourceSize = Math.min(image.width, image.height);
                    const sourceX = (image.width - sourceSize) / 2;
                    const sourceY = (image.height - sourceSize) / 2;

                    context.fillStyle = '#f8fbff';
                    context.fillRect(0, 0, canvasSize, canvasSize);
                    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, canvasSize, canvasSize);

                    let quality = 0.82;
                    let compressed = canvas.toDataURL('image/jpeg', quality);

                    while (compressed.length > 35000 && quality > 0.35) {
                        quality -= 0.08;
                        compressed = canvas.toDataURL('image/jpeg', quality);
                    }

                    resolve(compressed);
                };
                image.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handlePhotoChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please choose a valid image file.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Please choose an image smaller than 5 MB.');
            return;
        }

        try {
            const compressedPhoto = await compressProfilePhoto(file);
            setProfilePhoto(compressedPhoto);
            if (username) {
                localStorage.setItem(`profilePhoto:${username}`, compressedPhoto);
            }
            localStorage.setItem('profilePhoto:current', compressedPhoto);
            setError('');
            setMessage('Photo ready. Click Save profile to update it.');
        } catch (err) {
            setError('Unable to read this image. Please try another photo.');
            setMessage('');
        }
    };

    const handleSave = async () => {
        try {
            await updateUserProfile({ name, about, profilePhoto });
            if (username) {
                if (profilePhoto) {
                    localStorage.setItem(`profilePhoto:${username}`, profilePhoto);
                    localStorage.setItem('profilePhoto:current', profilePhoto);
                } else {
                    localStorage.removeItem(`profilePhoto:${username}`);
                    localStorage.removeItem('profilePhoto:current');
                }
            }
            setMessage('Profile saved successfully');
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save profile. Please restart the backend if this keeps happening.');
            setMessage('');
        }
    };

    const initials = (name || username || 'U')
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

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

            <Box sx={{ maxWidth: 1120, mx: 'auto', px: { xs: 2.5, md: 5 }, py: { xs: 5, md: 8 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.85fr 1.15fr' }, gap: { xs: 4, md: 6 }, alignItems: 'start' }}>
                <Paper elevation={0} sx={{ borderRadius: 6, p: { xs: 3, md: 4 }, bgcolor: '#f8fbff', border: '1px solid #e8eaed', textAlign: 'center' }}>
                    <Chip label="Meeting identity" sx={{ mb: 3, bgcolor: '#e8f0fe', color: '#1967d2', fontWeight: 700 }} />
                    <Box sx={{ position: 'relative', width: 180, height: 180, mx: 'auto', mb: 2 }}>
                        <Avatar src={profilePhoto} sx={{ width: 180, height: 180, bgcolor: '#1a73e8', fontSize: 54, fontWeight: 800, boxShadow: '0 24px 55px rgba(26,115,232,0.25)' }}>
                            {initials}
                        </Avatar>
                        <Button component="label" variant="contained" size="small" sx={{ position: 'absolute', right: 2, bottom: 8, minWidth: 0, width: 46, height: 46, borderRadius: '50%', bgcolor: '#1a73e8' }}>
                            <PhotoCameraIcon />
                            <input hidden accept="image/*" type="file" onChange={handlePhotoChange} />
                        </Button>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {name || 'Your name'}
                    </Typography>
                    <Typography sx={{ color: '#5f6368', mb: 3 }}>
                        @{username || 'username'}
                    </Typography>
                    <Typography sx={{ color: '#5f6368', lineHeight: 1.6 }}>
                        Your photo appears in meetings when your camera is turned off.
                    </Typography>
                    {profilePhoto && (
                        <Button
                            onClick={() => {
                                setProfilePhoto('');
                                if (username) {
                                    localStorage.removeItem(`profilePhoto:${username}`);
                                }
                                localStorage.removeItem('profilePhoto:current');
                            }}
                            sx={{ mt: 2, textTransform: 'none', fontWeight: 700 }}
                        >
                            Remove photo
                        </Button>
                    )}
                </Paper>

                <Paper elevation={0} sx={{ borderRadius: 6, p: { xs: 3, md: 4 }, border: '1px solid #e8eaed', boxShadow: '0 24px 70px rgba(60,64,67,0.14)' }}>
                    <Typography variant="h3" sx={{ fontSize: { xs: 34, md: 44 }, fontWeight: 400, letterSpacing: '-0.04em', mb: 1 }}>
                        Your profile
                    </Typography>
                    <Typography sx={{ color: '#5f6368', mb: 4 }}>
                        Keep your profile updated so participants can recognize you in meetings.
                    </Typography>

                    <Stack spacing={2.5}>
                        <TextField
                            fullWidth
                            label="Full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <TextField
                            fullWidth
                            label="Username"
                            value={username}
                            disabled
                        />
                        <TextField
                            fullWidth
                            label="About you"
                            value={about}
                            multiline
                            minRows={4}
                            onChange={(e) => setAbout(e.target.value)}
                            helperText="Write a short bio or interests to show on your profile"
                        />
                    </Stack>

                    {message && <Alert severity="success" sx={{ mt: 3, borderRadius: 2 }}>{message}</Alert>}
                    {error && <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>{error}</Alert>}

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
                        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} sx={{ borderRadius: 2, px: 3, py: 1.2, bgcolor: '#1a73e8', textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}>
                            Save profile
                        </Button>
                        <Button variant="outlined" onClick={() => navigate('/home')} sx={{ borderRadius: 2, px: 3, py: 1.2, textTransform: 'none', fontWeight: 700 }}>
                            Back to home
                        </Button>
                    </Stack>
                </Paper>
            </Box>
        </Box>
    );
}

export default withAuth(Profile);
