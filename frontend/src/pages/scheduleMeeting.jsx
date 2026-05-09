import React, { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Autocomplete, Avatar, Box, Button, Chip, Divider, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EmailIcon from '@mui/icons-material/Email';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { generateRoomId } from '../utils/generateRoomId';
import server from '../environment';


const getToday = () => new Date().toISOString().split('T')[0];

const formatDateTime = (date, time) => {
    if (!date || !time) return '';
    return new Date(`${date}T${time}`).toLocaleString([], {
        dateStyle: 'full',
        timeStyle: 'short'
    });
};

export default function ScheduleMeeting() {
    const navigate = useNavigate();
    const { userData } = useContext(AuthContext);
    const { mode, toggleTheme } = useContext(ThemeContext);
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [topic, setTopic] = useState('MeetSpace meeting');
    const [date, setDate] = useState(getToday());
    const [time, setTime] = useState('');
    const [meetingCode, setMeetingCode] = useState(generateRoomId());
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [scheduledMeetings, setScheduledMeetings] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('scheduledMeetings') || '[]');
        } catch {
            return [];
        }
    });

    const meetingLink = useMemo(() => `${window.location.origin}/meeting/${meetingCode}`, [meetingCode]);
    const scheduledAt = useMemo(() => formatDateTime(date, time), [date, time]);

    const savedContacts = useMemo(() => {
        const phones = scheduledMeetings
            .map((m) => m.guestPhone)
            .filter(Boolean);
        return [...new Set(phones)];
    }, [scheduledMeetings]);

    const saveSchedule = () => {
        const scheduledAtIso = new Date(`${date}T${time}`).toISOString();
        const schedule = {
            guestEmail,
            guestPhone,
            topic,
            date,
            time,
            meetingCode,
            meetingLink,
            scheduledAt: scheduledAtIso,
            createdAt: new Date().toISOString()
        };
        const nextMeetings = [schedule, ...scheduledMeetings].slice(0, 8);
        setScheduledMeetings(nextMeetings);
        localStorage.setItem('scheduledMeetings', JSON.stringify(nextMeetings));
        localStorage.setItem(`scheduledMeeting:${meetingCode}`, JSON.stringify(schedule));
        return schedule;
    };

    const handleSchedule = async () => {
        setError('');
        setMessage('');

        if (!guestEmail.trim()) {
            setError('Please enter the guest Gmail address.');
            return;
        }

        if (!date || !time) {
            setError('Please select a meeting date and time.');
            return;
        }

        const schedule = saveSchedule();

        try {
            const response = await fetch(`${server}/api/v1/users/schedule_meeting`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: localStorage.getItem('token'),
                    meetingCode,
                    topic,
                    guestEmail,
                    guestPhone,
                    scheduledAt: schedule.scheduledAt
                })
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Unable to save schedule on server');
            }
        } catch (err) {
            setError('Could not save this schedule on the server. Please try again before sending the invite.');
            return;
        }

        const subject = `${topic || 'MeetSpace meeting'} - ${scheduledAt}`;
        const body = [
            `Hello,`,
            ``,
            `${userData?.name || 'The host'} has scheduled a meeting with you.`,
            ``,
            `Topic: ${topic || 'MeetSpace meeting'}`,
            `Date and time: ${scheduledAt}`,
            `Meeting code: ${meetingCode}`,
            `Join link: ${meetingLink}`,
            ``,
            `Open the app, paste this code on the Home page, and click Join.`
        ].join('\n');

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(guestEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(gmailUrl, '_blank', 'noopener,noreferrer');
        setMessage('Schedule saved. Gmail compose opened with the invite ready to send.');
    };

    const handleWhatsAppInvite = async () => {
        setError('');
        setMessage('');

        if (!guestPhone.trim()) {
            setError('Please enter the guest WhatsApp number.');
            return;
        }

        if (!date || !time) {
            setError('Please select a meeting date and time.');
            return;
        }

        const schedule = saveSchedule();

        try {
            const response = await fetch(`${server}/api/v1/users/schedule_meeting`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: localStorage.getItem('token'),
                    meetingCode,
                    topic,
                    guestEmail,
                    guestPhone,
                    scheduledAt: schedule.scheduledAt
                })
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Unable to save schedule on server');
            }
        } catch (err) {
            setError('Could not save this schedule on the server. Please try again before sending the invite.');
            return;
        }

        const text = [
            `Hello! 👋`,
            ``,
            `*${userData?.name || 'The host'}* has scheduled a MeetSpace meeting with you.`,
            ``,
            `*Topic:* ${topic || 'MeetSpace meeting'}`,
            `*Date & Time:* ${scheduledAt}`,
            `*Meeting Code:* ${meetingCode}`,
            ``,
            `*Click here to join:*`,
            `${meetingLink}`,
            ``,
            `Alternatively, open the app and enter the code: *${meetingCode}*`
        ].join('\n');

        const whatsappUrl = `https://wa.me/${guestPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        setMessage('Schedule saved. WhatsApp chat opened with the invite ready to send.');
    };

    const copyInvite = async () => {
        const text = `Meeting code: ${meetingCode}\nJoin link: ${meetingLink}\nDate and time: ${scheduledAt || 'Not selected yet'}`;
        await navigator.clipboard.writeText(text);
        setMessage('Invite details copied.');
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'transparent', color: 'text.primary' }}>
            <Box sx={{ height: 72, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: { xs: 2, md: 5 }, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)', color: mode === 'dark' ? '#ffffff' : '#000000', width: 40, height: 40 }}>
                        <EventAvailableIcon />
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 500 }}>
                        Schedule Meeting
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton onClick={toggleTheme} color="inherit" sx={{ mr: 1 }}>
                        {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                    </IconButton>
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/home')} sx={{ textTransform: 'none', fontWeight: 700 }}>
                        Back to home
                    </Button>
                </Box>
            </Box>

            <Box sx={{ maxWidth: 1120, mx: 'auto', px: { xs: 2.5, md: 5 }, py: { xs: 5, md: 8 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.95fr 1.05fr' }, gap: { xs: 4, md: 7 }, alignItems: 'start' }}>
                <Box>
                    <Chip label={userData?.name ? `Organizer: ${userData.name}` : 'Organizer'} sx={{ mb: 3, bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'primary.light', color: mode === 'dark' ? '#e8eaed' : 'primary.main', fontWeight: 600 }} />
                    <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 50 }, lineHeight: 1.12, fontWeight: 400, mb: 2 }}>
                        Pick a date and send the invite.
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'text.secondary', maxWidth: 520, fontWeight: 400, lineHeight: 1.6 }}>
                        Choose when the meeting will happen, generate a room code, and open Gmail with the invite already filled in.
                    </Typography>

                    <Paper elevation={0} sx={{ mt: 4, p: 3, border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'action.hover' }}>
                        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800 }}>Meeting code</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, my: 1 }}>{meetingCode}</Typography>
                        <Typography sx={{ color: 'text.secondary', wordBreak: 'break-word' }}>{meetingLink}</Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                            <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={copyInvite} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                Copy invite
                            </Button>
                            <Button variant="text" onClick={() => setMeetingCode(generateRoomId())} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                Generate new code
                            </Button>
                        </Stack>
                    </Paper>
                </Box>

                <Paper elevation={0} sx={{ borderRadius: 3, border: 1, borderColor: 'divider', boxShadow: 3, overflow: 'hidden' }}>
                    <Box sx={{ bgcolor: 'action.hover', p: { xs: 3, md: 4 }, borderBottom: 1, borderColor: 'divider' }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)', color: mode === 'dark' ? '#ffffff' : '#000000' }}>
                                <EmailIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                    Invite Guest
                                </Typography>
                                <Typography sx={{ color: 'text.secondary' }}>
                                    Fill the details and send the invite via Gmail or WhatsApp.
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>

                    <Box sx={{ p: { xs: 3, md: 4 } }}>
                        <Stack spacing={2.2}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField label="Guest Gmail address" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value.trim())} fullWidth />
                                <Autocomplete
                                    freeSolo
                                    options={savedContacts}
                                    value={guestPhone}
                                    onInputChange={(_, newValue) => setGuestPhone((newValue || '').trim())}
                                    renderOption={(props, option) => (
                                        <li {...props} key={option}>
                                            <ContactPhoneIcon sx={{ mr: 1.2, color: 'success.main', fontSize: 20 }} />
                                            {option}
                                        </li>
                                    )}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Guest WhatsApp number"
                                            placeholder={savedContacts.length > 0 ? 'Select or type a new number' : 'e.g. 919876543210'}
                                        />
                                    )}
                                    fullWidth
                                />
                            </Stack>
                            <TextField label="Meeting topic" value={topic} onChange={(e) => setTopic(e.target.value)} fullWidth />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField label="Meeting date" type="date" value={date} onChange={(e) => setDate(e.target.value)} inputProps={{ min: getToday() }} InputLabelProps={{ shrink: true }} fullWidth />
                                <TextField label="Meeting time" type="time" value={time} onChange={(e) => setTime(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                            </Stack>
                        </Stack>

                        {scheduledAt && <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>Scheduled for {scheduledAt}</Alert>}
                        {message && <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>{message}</Alert>}
                        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
                            <Button variant="contained" size="large" startIcon={<EmailIcon />} onClick={handleSchedule} sx={{ borderRadius: 2, px: 3, py: 1.2, textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}>
                                Invite via Gmail
                            </Button>
                            <Button variant="contained" size="large" startIcon={<WhatsAppIcon />} onClick={handleWhatsAppInvite} sx={{ borderRadius: 2, px: 3, py: 1.2, textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}>
                                Invite via WhatsApp
                            </Button>
                        </Stack>

                        {scheduledMeetings.length > 0 && (
                            <>
                                <Divider sx={{ my: 3 }} />
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Recently scheduled</Typography>
                                <Stack spacing={1.5}>
                                    {scheduledMeetings.map((meeting) => (
                                        <Box key={`${meeting.meetingCode}-${meeting.createdAt}`} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                                            <Typography sx={{ fontWeight: 700 }}>{meeting.topic}</Typography>
                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{formatDateTime(meeting.date, meeting.time)}</Typography>
                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{meeting.guestEmail || meeting.guestPhone}</Typography>
                                            <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 700 }}>{meeting.meetingCode}</Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </>
                        )}
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
