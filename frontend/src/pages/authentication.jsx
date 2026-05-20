import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import GoogleIcon from '@mui/icons-material/Google';
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar } from '@mui/material';

const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export default function Authentication() {

    

    const [username, setUsername] = React.useState();
    const [password, setPassword] = React.useState();
    const [name, setName] = React.useState();
    const [error, setError] = React.useState();
    const [message, setMessage] = React.useState();


    const [formState, setFormState] = React.useState(0);
    const [isGoogleReady, setIsGoogleReady] = React.useState(Boolean(window.google?.accounts?.oauth2));
    const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

    const [open, setOpen] = React.useState(false)


    const { handleRegister, handleLogin, handleGoogleLogin } = React.useContext(AuthContext);

    React.useEffect(() => {
        if (formState !== 0 || isGoogleReady) return;

        const markReady = () => {
            if (window.google?.accounts?.oauth2) {
                setIsGoogleReady(true);
            }
        };

        if (window.google?.accounts?.oauth2) {
            setIsGoogleReady(true);
            return;
        }

        const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (existingScript) {
            existingScript.addEventListener("load", markReady, { once: true });
            return () => existingScript.removeEventListener("load", markReady);
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = markReady;
        script.onerror = () => setError("Unable to load Google sign-in. Check your internet connection.");
        document.body.appendChild(script);
    }, [formState, isGoogleReady]);

    const handleGoogleAuth = () => {
        if (!googleClientId) {
            setError("Missing REACT_APP_GOOGLE_CLIENT_ID in the frontend .env file.");
            return;
        }

        if (!window.google?.accounts?.oauth2) {
            setError("Google sign-in is still loading. Please try again in a moment.");
            return;
        }

        setIsGoogleLoading(true);
        setError("");

        const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: "openid email profile",
            callback: async (response) => {
                try {
                    if (response.error) {
                        throw new Error(response.error_description || response.error);
                    }
                    await handleGoogleLogin({ accessToken: response.access_token });
                } catch (err) {
                    const message = err.response?.data?.message || err.message || "Google login failed. Please try again.";
                    setError(message);
                } finally {
                    setIsGoogleLoading(false);
                }
            }
        });

        tokenClient.requestAccessToken({ prompt: "select_account" });
    };

    let handleAuth = async () => {
        try {
            if (formState === 0) {
                await handleLogin(username, password)
            }
            if (formState === 1) {
                const result = await handleRegister(name, username, password);
                console.log(result);
                setUsername("");
                setMessage(result);
                setOpen(true);
                setError("")
                setFormState(0)
                setPassword("")
            }
        } catch (err) {

            console.log(err);
            const message = err.response?.data?.message || err.message || "Unable to connect to the backend. Please try again.";
            setError(message);
        }
    }


    return (
        <React.Fragment>
            <Grid container component="main" sx={{ minHeight: '100vh', bgcolor: 'transparent' }} alignItems="center" justifyContent="center">
                <Grid item xs={12} sm={10} md={8} lg={5} component={Paper} elevation={6} square container alignItems="center" justifyContent="center" sx={{ minHeight: '70vh', bgcolor: 'background.paper' }}>
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: 420,
                            px: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: 4
                        }}
                    >
                        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                            <LockOutlinedIcon />
                        </Avatar>


                        <div>
                            <Button variant={formState === 0 ? "contained" : ""} onClick={() => { setFormState(0) }}>
                                Sign In
                            </Button>
                            <Button variant={formState === 1 ? "contained" : ""} onClick={() => { setFormState(1) }}>
                                Sign Up
                            </Button>
                        </div>

                        <Box component="form" noValidate sx={{ mt: 1 }}>
                            {formState === 1 ? <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="username"
                                label="Full Name"
                                name="username"
                                value={name}
                                autoFocus
                                onChange={(e) => setName(e.target.value)}
                            /> : <></>}

                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="username"
                                label="Username"
                                name="username"
                                value={username}
                                autoFocus
                                onChange={(e) => setUsername(e.target.value)}

                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                value={password}
                                type="password"
                                onChange={(e) => setPassword(e.target.value)}

                                id="password"
                            />

                            <p style={{ color: "red" }}>{error}</p>

                            <Button
                                type="button"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                                onClick={handleAuth}
                            >
                                {formState === 0 ? "Login " : "Register"}
                            </Button>

                            {formState === 0 && (
                                <>
                                    <Divider sx={{ my: 2 }}>or</Divider>
                                    <Button
                                        fullWidth
                                        type="button"
                                        variant="outlined"
                                        startIcon={<GoogleIcon />}
                                        onClick={handleGoogleAuth}
                                        disabled={isGoogleLoading}
                                        aria-label="Continue with Google"
                                        sx={{ py: 1.2, textTransform: 'none', fontWeight: 700 }}
                                    >
                                        {isGoogleLoading ? "Connecting..." : "Continue with Google"}
                                    </Button>
                                </>
                            )}

                        </Box>
                    </Box>
                </Grid>
            </Grid>

            <Snackbar

                open={open}
                autoHideDuration={4000}
                message={message}
            />

        </React.Fragment>
    );
}
