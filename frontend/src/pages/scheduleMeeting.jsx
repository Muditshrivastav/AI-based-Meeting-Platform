import React, { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Chip, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EmailIcon from '@mui/icons-material/Email';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import { AuthContext } from '../contexts/AuthContext';
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
    const [guestEmail, setGuestEmail] = useState('');
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

    const saveSchedule = () => {
        const scheduledAtIso = new Date(`${date}T${time}`).toISOString();
        const schedule = {
            guestEmail,
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

    const copyInvite = async () => {
        const text = `Meeting code: ${meetingCode}\nJoin link: ${meetingLink}\nDate and time: ${scheduledAt || 'Not selected yet'}`;
        await navigator.clipboard.writeText(text);
        setMessage('Invite details copied.');
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#fff', color: '#202124' }}>
            <Box sx={{ height: 72, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: { xs: 2, md: 5 }, borderBottom: '1px solid #e8eaed', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#1a73e8', width: 40, height: 40 }}>
                        <EventAvailableIcon />
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 500 }}>
                        Schedule Meeting
                    </Typography>
                </Box>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/home')} sx={{ textTransform: 'none', fontWeight: 700 }}>
                    Back to home
                </Button>
            </Box>

            <Box sx={{ maxWidth: 1120, mx: 'auto', px: { xs: 2.5, md: 5 }, py: { xs: 5, md: 8 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.95fr 1.05fr' }, gap: { xs: 4, md: 7 }, alignItems: 'start' }}>
                <Box>
                    <Chip label={userData?.name ? `Organizer: ${userData.name}` : 'Organizer'} sx={{ mb: 3, bgcolor: '#e8f0fe', color: '#1967d2', fontWeight: 600 }} />
                    <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 50 }, lineHeight: 1.12, fontWeight: 400, mb: 2 }}>
                        Pick a date and send the invite.
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#5f6368', maxWidth: 520, fontWeight: 400, lineHeight: 1.6 }}>
                        Choose when the meeting will happen, generate a room code, and open Gmail with the invite already filled in.
                    </Typography>

                    <Paper elevation={0} sx={{ mt: 4, p: 3, border: '1px solid #e8eaed', borderRadius: 3, bgcolor: '#f8fbff' }}>
                        <Typography variant="overline" sx={{ color: '#5f6368', fontWeight: 800 }}>Meeting code</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, my: 1 }}>{meetingCode}</Typography>
                        <Typography sx={{ color: '#5f6368', wordBreak: 'break-word' }}>{meetingLink}</Typography>
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

                <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e8eaed', boxShadow: '0 24px 70px rgba(60,64,67,0.14)', overflow: 'hidden' }}>
                    <Box sx={{ bgcolor: '#f8fbff', p: { xs: 3, md: 4 }, borderBottom: '1px solid #e8eaed' }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ bgcolor: '#e8f0fe', color: '#1a73e8' }}>
                                <EmailIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                    Gmail invite
                                </Typography>
                                <Typography sx={{ color: '#5f6368' }}>
                                    Fill the details and send the invite from Gmail.
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>

                    <Box sx={{ p: { xs: 3, md: 4 } }}>
                        <Stack spacing={2.2}>
                            <TextField label="Guest Gmail address" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value.trim())} fullWidth />
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
                            <Button variant="contained" size="large" startIcon={<EmailIcon />} onClick={handleSchedule} sx={{ borderRadius: 2, px: 3, py: 1.2, bgcolor: '#1a73e8', textTransform: 'none', fontWeight: 700, boxShadow: 'none', '&:hover': { bgcolor: '#1558b0' } }}>
                                Schedule and open Gmail
                            </Button>
                            <Button variant="outlined" size="large" startIcon={<VideoCallIcon />} onClick={() => navigate(`/meeting/${meetingCode}`)} sx={{ borderRadius: 2, px: 3, py: 1.2, textTransform: 'none', fontWeight: 700 }}>
                                Test link
                            </Button>
                        </Stack>

                        {scheduledMeetings.length > 0 && (
                            <>
                                <Divider sx={{ my: 3 }} />
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Recently scheduled</Typography>
                                <Stack spacing={1.5}>
                                    {scheduledMeetings.map((meeting) => (
                                        <Box key={`${meeting.meetingCode}-${meeting.createdAt}`} sx={{ border: '1px solid #e8eaed', borderRadius: 2, p: 1.5 }}>
                                            <Typography sx={{ fontWeight: 700 }}>{meeting.topic}</Typography>
                                            <Typography variant="body2" sx={{ color: '#5f6368' }}>{formatDateTime(meeting.date, meeting.time)} • {meeting.guestEmail}</Typography>
                                            <Typography variant="body2" sx={{ color: '#1a73e8', fontWeight: 700 }}>{meeting.meetingCode}</Typography>
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
