import React, { useContext } from 'react'
import "../App.css"
import { Link, useNavigate } from 'react-router-dom'
import { ThemeContext } from '../contexts/ThemeContext';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { IconButton } from '@mui/material';

export default function LandingPage() {
    const navigate = useNavigate();
    const { mode, toggleTheme } = useContext(ThemeContext);

    return (
        <div className='landingPageContainer'>
            <nav>
                <div className='navHeader'>
                    <h2>MeetSpace</h2>
                </div>
                <div className='navlist'>
                    <p onClick={() => navigate("/lobby")}>Join as Guest</p>
                    <p onClick={() => navigate("/auth")}>Register</p>
                    <p onClick={() => navigate("/auth")} className="loginBtn">Login</p>
                    <IconButton onClick={toggleTheme} sx={{ color: 'white' }}>
                        {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                    </IconButton>
                </div>
            </nav>

            <div className="landingMainContainer">
                <div>
                    <h1>
                        <span className="accent">Feel Connected</span><br />
                        Even When Far Apart
                    </h1>
                    <p>
                        Experience crystal-clear video meetings with built-in AI transcription 
                        and automated meeting notes. Built for teams that value productivity.
                    </p>
                    <Link to="/lobby" className="ctaButton">
                        Get Started Free
                    </Link>
                </div>
                <div>
                    <div className="imageWrapper">
                        <img src="/hero-mockup.png" alt="MeetSpace Dashboard" className="mainMockup" />
                        <img src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?q=80&w=2069&auto=format&fit=crop" alt="MeetSpace Mobile" className="secondaryMockup" />
                    </div>
                </div>
            </div>
        </div>
    )
}

