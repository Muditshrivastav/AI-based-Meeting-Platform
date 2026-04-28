import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import LandingPage from './pages/landing';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/home';
import History from './pages/history';
import Profile from './pages/profile';
import Lobby from './pages/lobby';
import JoinMeeting from './pages/joinmeeting';
import ScheduleMeeting from './pages/scheduleMeeting';

function App() {
  return (
    <div className="App">
      <Router>
        <AuthProvider>
          <Routes>
            <Route path='/' element={<LandingPage />} />
            <Route path='/auth' element={<Authentication />} />
            <Route path='/lobby' element={<Lobby />} />
            <Route path='/join' element={<JoinMeeting />} />
            <Route path='/schedule' element={<ScheduleMeeting />} />
            <Route path='/home' element={<HomeComponent />} />
            <Route path='/history' element={<History />} />
            <Route path='/profile' element={<Profile />} />
            <Route path='/meeting/:url' element={<VideoMeetComponent />} />
          </Routes>
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;


