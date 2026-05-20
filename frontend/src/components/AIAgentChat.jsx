import React, { useState, useRef, useEffect, useContext } from 'react';
import { 
    Box, 
    Paper, 
    IconButton, 
    Typography, 
    TextField, 
    Avatar, 
    Stack, 
    Fab, 
    Zoom,
    CircularProgress,
    Tooltip,
    Fade,
    Snackbar,
    Alert,
    Chip
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import HistoryIcon from '@mui/icons-material/History';
import EventIcon from '@mui/icons-material/Event';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import DescriptionIcon from '@mui/icons-material/Description';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import MemoryIcon from '@mui/icons-material/Psychology';
import { ThemeContext } from '../contexts/ThemeContext';
import server from '../environment';

const AGENT_THREAD_KEY = 'meetspaceAgentThreadId';

const getAgentThreadId = () => {
    let threadId = localStorage.getItem(AGENT_THREAD_KEY);
    if (!threadId) {
        threadId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(AGENT_THREAD_KEY, threadId);
    }
    return threadId;
};

export default function AIAgentChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { role: 'assistant', content: 'Hello! I\'m your MeetSpace AI Agent. I can:\n\n🗓️ Schedule & create meetings\n📋 Fetch your meeting notes\n📱 Send notes via WhatsApp\n📧 Send notes via Email\n\nI remember our conversation, so feel free to ask follow-ups! How can I help?' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [memoryActive, setMemoryActive] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const { mode } = useContext(ThemeContext);
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory]);

    const showSnackbar = (message, severity = 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleSend = async () => {
        if (!message.trim() || isLoading) return;

        const userMessage = { role: 'user', content: message };
        setChatHistory(prev => [...prev, userMessage]);
        const currentMessage = message;
        setMessage('');
        setIsLoading(true);

        try {
            const response = await fetch(`${server}/api/v1/agent/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: currentMessage,
                    token: localStorage.getItem('token'),
                    threadId: getAgentThreadId()
                })
            });

            if (response.ok) {
                const data = await response.json();
                setChatHistory(prev => [...prev, { role: 'assistant', content: data.reply }]);

                // Track memory state
                if (data.memoryActive) setMemoryActive(true);

                // Handle different action types
                if (data.action === 'NAVIGATE' && data.payload) {
                    showSnackbar('🚀 Redirecting you to the meeting...', 'success');
                    setTimeout(() => {
                        window.location.href = data.payload;
                    }, 2000);
                } else if (data.action === 'WHATSAPP' && data.payload) {
                    showSnackbar('📱 Opening WhatsApp with meeting notes...', 'success');
                    setTimeout(() => {
                        window.open(data.payload, '_blank', 'noopener,noreferrer');
                    }, 1000);
                } else if (data.action === 'EMAIL' && data.payload) {
                    showSnackbar('📧 Opening Gmail with meeting notes...', 'success');
                    setTimeout(() => {
                        window.open(data.payload, '_blank', 'noopener,noreferrer');
                    }, 1000);
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                setChatHistory(prev => [...prev, { 
                    role: 'assistant', 
                    content: `Error: ${errorData.message || 'The server encountered an issue. Please check if the backend and Ollama are running.'}` 
                }]);
            }
        } catch (error) {
            setChatHistory(prev => [...prev, { 
                role: 'assistant', 
                content: 'Connection failed. Please ensure the backend is active.' 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = async () => {
        try {
            await fetch(`${server}/api/v1/agent/reset`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: localStorage.getItem('token'), threadId: getAgentThreadId() })
            });
            if (!localStorage.getItem('token')) {
                localStorage.removeItem(AGENT_THREAD_KEY);
            }
            setChatHistory([
                { role: 'assistant', content: '🔄 Memory cleared! Starting a fresh conversation.\n\nHow can I help you today?' }
            ]);
            setMemoryActive(false);
            showSnackbar('Conversation memory reset', 'info');
        } catch (e) {
            showSnackbar('Failed to reset conversation', 'error');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const quickActions = [
        { label: 'Schedule Meeting', icon: <EventIcon fontSize="small" />, prompt: 'Schedule a meeting for tomorrow at 3 PM about project discussion.' },
        { label: 'My Meetings', icon: <HistoryIcon fontSize="small" />, prompt: 'What meetings do I have scheduled?' },
        { label: 'Meeting Notes', icon: <DescriptionIcon fontSize="small" />, prompt: 'Show me my recent meeting notes.' },
        { label: 'Send via WhatsApp', icon: <WhatsAppIcon fontSize="small" />, prompt: 'Send my latest meeting notes via WhatsApp to ' },
        { label: 'Send via Email', icon: <EmailIcon fontSize="small" />, prompt: 'Send my latest meeting notes via email to ' },
    ];

    return (
        <>
            <Box sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1300 }}>
                <Zoom in={!isOpen}>
                    <Fab 
                        color="primary" 
                        aria-label="chat" 
                        onClick={() => setIsOpen(true)}
                        sx={{ 
                            width: 64, 
                            height: 64, 
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            '&:hover': {
                                transform: 'scale(1.1)',
                                background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)',
                            }
                        }}
                    >
                        <SmartToyIcon sx={{ fontSize: 32 }} />
                    </Fab>
                </Zoom>

                <Fade in={isOpen}>
                    <Paper 
                        elevation={24}
                        sx={{ 
                            position: 'absolute', 
                            bottom: 0, 
                            right: 0, 
                            width: { xs: 'calc(100vw - 64px)', sm: 420 }, 
                            height: 640, 
                            maxHeight: 'calc(100vh - 100px)',
                            borderRadius: 4, 
                            display: 'flex', 
                            flexDirection: 'column',
                            overflow: 'hidden',
                            border: 1,
                            borderColor: 'divider',
                            bgcolor: mode === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
                        }}
                    >
                        {/* Header */}
                        <Box sx={{ 
                            p: 2, 
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', 
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
                                    <SmartToyIcon />
                                </Avatar>
                                <Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>MeetSpace Agent</Typography>
                                        {memoryActive && (
                                            <Chip 
                                                icon={<MemoryIcon sx={{ fontSize: 14, color: '#a5f3fc !important' }} />}
                                                label="Memory"
                                                size="small"
                                                sx={{ 
                                                    height: 20,
                                                    fontSize: '0.65rem',
                                                    bgcolor: 'rgba(255,255,255,0.15)',
                                                    color: '#a5f3fc',
                                                    '& .MuiChip-icon': { color: '#a5f3fc' },
                                                    border: '1px solid rgba(165,243,252,0.3)'
                                                }}
                                            />
                                        )}
                                    </Stack>
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>Powered by LangGraph + Ollama</Typography>
                                </Box>
                            </Stack>
                            <Stack direction="row" spacing={0.5}>
                                <Tooltip title="Reset conversation" arrow>
                                    <IconButton size="small" onClick={handleReset} sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                                        <RestartAltIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: 'white' }}>
                                    <CloseIcon />
                                </IconButton>
                            </Stack>
                        </Box>

                        {/* Chat Body */}
                        <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {chatHistory.map((msg, index) => (
                                <Box 
                                    key={index} 
                                    sx={{ 
                                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        maxWidth: '88%',
                                    }}
                                >
                                    <Paper 
                                        sx={{ 
                                            p: 1.5, 
                                            px: 2,
                                            borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                            bgcolor: msg.role === 'user' 
                                                ? 'primary.main' 
                                                : (mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                                            color: msg.role === 'user' ? 'white' : 'text.primary',
                                            boxShadow: msg.role === 'user' ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                                            border: msg.role === 'user' ? 'none' : 1,
                                            borderColor: 'divider'
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                            {msg.content}
                                        </Typography>
                                    </Paper>
                                </Box>
                            ))}
                            {isLoading && (
                                <Box sx={{ alignSelf: 'flex-start', maxWidth: '85%', display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Paper 
                                        sx={{ 
                                            p: 1.5, 
                                            px: 2,
                                            borderRadius: '20px 20px 20px 4px',
                                            bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                            border: 1,
                                            borderColor: 'divider',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1
                                        }}
                                    >
                                        <CircularProgress size={16} color="inherit" sx={{ opacity: 0.5 }} />
                                        <Typography variant="caption" sx={{ fontStyle: 'italic', opacity: 0.7 }}>Agent is thinking...</Typography>
                                    </Paper>
                                </Box>
                            )}
                            <div ref={chatEndRef} />
                        </Box>

                        {/* Quick Actions */}
                        {!isLoading && chatHistory.length < 6 && (
                            <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                                {quickActions.map((action, i) => (
                                    <Tooltip key={i} title={action.label} arrow>
                                        <Paper 
                                            onClick={() => {
                                                setMessage(action.prompt);
                                            }}
                                            sx={{ 
                                                py: 0.5, 
                                                px: 1.2, 
                                                borderRadius: 10, 
                                                cursor: 'pointer', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: 0.5,
                                                fontSize: '0.7rem',
                                                border: 1,
                                                borderColor: 'divider',
                                                bgcolor: 'action.hover',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    bgcolor: 'primary.main',
                                                    color: 'white',
                                                    borderColor: 'primary.main',
                                                    transform: 'translateY(-1px)',
                                                    boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                                                }
                                            }}
                                        >
                                            {action.icon}
                                            {action.label}
                                        </Paper>
                                    </Tooltip>
                                ))}
                            </Box>
                        )}

                        {/* Input Area */}
                        <Box sx={{ p: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                            <TextField
                                fullWidth
                                placeholder="Ask me to schedule, share notes, or anything..."
                                variant="outlined"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isLoading}
                                InputProps={{
                                    endAdornment: (
                                        <IconButton 
                                            color="primary" 
                                            onClick={handleSend} 
                                            disabled={!message.trim() || isLoading}
                                        >
                                            <SendIcon />
                                        </IconButton>
                                    ),
                                    sx: { borderRadius: 3 }
                                }}
                                size="small"
                            />
                        </Box>
                    </Paper>
                </Fade>
            </Box>

            {/* Snackbar for action notifications */}
            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={4000} 
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert 
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%', borderRadius: 3, fontWeight: 600 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}
