import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import RiskMap from './pages/RiskMap';
import LocationDetails from './pages/LocationDetails';
import Sensors from './pages/Sensors';
import Alerts from './pages/Alerts';
import Simulation from './pages/Simulation';

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/map" element={<RiskMap />} />
          <Route path="/location/:id" element={<LocationDetails />} />
          <Route path="/sensors" element={<Sensors />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/simulation" element={<Simulation />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;