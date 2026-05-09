import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';
import { 
    Box, 
    Card, 
    CardContent, 
    Typography, 
    IconButton, 
    Button, 
    Divider, 
    Stack, 
    Chip,
    Container,
    Paper
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import DescriptionIcon from '@mui/icons-material/Description';
import EmailIcon from '@mui/icons-material/Email';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import withAuth from '../utils/withAuth';

function MeetingNotes() {
    const { getHistoryOfUser } = useContext(AuthContext);
    
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                // Filter only meetings that have summaries
                setMeetings(history.filter(m => m.summary).sort((a, b) => new Date(b.date) - new Date(a.date)));
            } catch (err) {
                console.error("Failed to fetch notes", err);
            } finally {
                setLoading(false);
            }
        }
        fetchHistory();
    }, [getHistoryOfUser]);

    const downloadNote = (meeting) => {
        const element = document.createElement("a");
        const file = new Blob([
            `Meeting Notes\n`,
            `==============\n`,
            `Date: ${new Date(meeting.date).toLocaleString()}\n`,
            `Meeting Code: ${meeting.meetingCode}\n\n`,
            `Summary:\n`,
            `${meeting.summary}`
        ], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `meeting_notes_${meeting.meetingCode}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const shareViaWhatsApp = (meeting) => {
        const text = `Meeting Notes\n==============\nDate: ${new Date(meeting.date).toLocaleString()}\nMeeting Code: ${meeting.meetingCode}\n\nSummary:\n${meeting.summary}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    const shareViaEmail = (meeting) => {
        const subject = `Meeting Notes - ${meeting.meetingCode}`;
        const body = `Meeting Notes\n==============\nDate: ${new Date(meeting.date).toLocaleString()}\nMeeting Code: ${meeting.meetingCode}\n\nSummary:\n${meeting.summary}`;
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8fbff', pb: 10 }}>
            <Box sx={{ height: 72, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: { xs: 2, md: 5 }, borderBottom: '1px solid #e8eaed', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <HistoryIcon sx={{ color: '#1a73e8' }} />
                    <Typography variant="h5" sx={{ fontWeight: 500 }}>
                        Meeting Notes
                    </Typography>
                </Box>
                <IconButton onClick={() => navigate('/home')}>
                    <HomeIcon />
                </IconButton>
            </Box>

            <Container maxWidth="md" sx={{ mt: 6 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.02em' }}>
                    Your AI Generated Notes
                </Typography>
                <Typography sx={{ color: '#5f6368', mb: 4 }}>
                    Review and download summaries from your past meetings.
                </Typography>

                {loading ? (
                    <Typography>Loading your notes...</Typography>
                ) : meetings.length === 0 ? (
                    <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: '#fff', border: '1px dashed #dadce0' }}>
                        <DescriptionIcon sx={{ fontSize: 64, color: '#dadce0', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: '#3c4043', mb: 1 }}>No notes found</Typography>
                        <Typography variant="body2" sx={{ color: '#70757a' }}>
                            Complete a meeting with transcription enabled to generate AI notes.
                        </Typography>
                        <Button variant="contained" sx={{ mt: 3, borderRadius: 2, textTransform: 'none' }} onClick={() => navigate('/home')}>
                            Start a Meeting
                        </Button>
                    </Paper>
                ) : (
                    <Stack spacing={3}>
                        {meetings.map((meeting) => (
                            <Card key={meeting._id} sx={{ borderRadius: 4, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e8eaed', overflow: 'hidden' }}>
                                <Box sx={{ p: 3, bgcolor: '#fff' }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                                                Meeting: {meeting.meetingCode}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#5f6368' }}>
                                                {new Date(meeting.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                        </Box>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                            <Button 
                                                startIcon={<WhatsAppIcon />} 
                                                variant="outlined" 
                                                size="small"
                                                color="success"
                                                onClick={() => shareViaWhatsApp(meeting)}
                                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                            >
                                                WhatsApp
                                            </Button>
                                            <Button 
                                                startIcon={<EmailIcon />} 
                                                variant="outlined" 
                                                size="small"
                                                onClick={() => shareViaEmail(meeting)}
                                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                            >
                                                Email
                                            </Button>
                                            <Button 
                                                startIcon={<DownloadIcon />} 
                                                variant="outlined" 
                                                size="small"
                                                color="inherit"
                                                onClick={() => downloadNote(meeting)}
                                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                            >
                                                Download
                                            </Button>
                                        </Stack>
                                    </Stack>
                                    
                                    <Divider sx={{ mb: 2 }} />
                                    
                                    <Box sx={{ bgcolor: '#f8f9fa', p: 2.5, borderRadius: 3 }}>
                                        <Typography variant="subtitle2" sx={{ color: '#1a73e8', fontWeight: 800, mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            AI Summary
                                        </Typography>
                                        <Typography sx={{ color: '#3c4043', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                            {meeting.summary}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Card>
                        ))}
                    </Stack>
                )}
            </Container>
        </Box>
    );
}

export default withAuth(MeetingNotes);
