import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import Home from "@/pages/Home";
import Booking from "@/pages/Booking";
import Payment from "@/pages/Payment";
import Tracking from "@/pages/Tracking";
import Bookings from "@/pages/Bookings";
import Profile from "@/pages/Profile";
import TrackRedirect from "@/pages/TrackRedirect";
import Login from "@/pages/Login";
import { AuthProvider } from "@/auth/AuthContext";
import RequireAuth from "@/auth/RequireAuth";

export default function App() {
  return (
    <div className="min-h-screen bg-stone-50">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/book/:serviceId" element={<RequireAuth><Booking /></RequireAuth>} />
            <Route path="/pay/:bookingId" element={<RequireAuth><Payment /></RequireAuth>} />
            <Route path="/track/:bookingId" element={<RequireAuth><Tracking /></RequireAuth>} />
            <Route path="/track" element={<RequireAuth><TrackRedirect /></RequireAuth>} />
            <Route path="/bookings" element={<RequireAuth><Bookings /></RequireAuth>} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
          <BottomNav />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
