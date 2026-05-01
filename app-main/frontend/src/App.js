import { BrowserRouter, Routes, Route } from 'react-router-dom';
import "@/App.css";
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import { ToastProvider } from './components/Toast';

// Public Pages
import Home from './pages/Home';
import Tools from './pages/Tools';
import Pricing from './pages/Pricing';
import Blog from './pages/Blog';
import BlogDetail from './pages/BlogDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Join from './pages/Join';
import NotFound from './pages/NotFound';

// Admin Pages
import AdminRoute from './components/AdminRoute';
import ErrorBoundary from './components/ErrorBoundary';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTools from './pages/admin/AdminTools';
import AdminToolForm from './pages/admin/AdminToolForm';
import AdminClients from './pages/admin/AdminClients';
import AdminClientForm from './pages/admin/AdminClientForm';
import AdminBulkAssign from './pages/admin/AdminBulkAssign';
import AdminActivity from './pages/admin/AdminActivity';
import AdminBlog from './pages/admin/AdminBlog';
import AdminBlogForm from './pages/admin/AdminBlogForm';
import AdminContacts from './pages/admin/AdminContacts';

// Client Pages
import ClientRoute from './components/ClientRoute';
import ClientLogin from './pages/client/ClientLogin';
import ClientDashboardEnhanced from './pages/client/ClientDashboardEnhanced';
import ClientTools from './pages/client/ClientTools';
import ClientToolDetail from './pages/client/ClientToolDetail';
import ClientProfile from './pages/client/ClientProfile';

function App() {
  return (
    <ToastProvider>
      <div className="App min-h-screen bg-gradient-to-br from-[#1E1F24] to-[#24252B]">
        <BrowserRouter>
          <Routes>
            {/* Public Routes with Navbar/Footer */}
            <Route path="/" element={<><Navbar /><Home /><Footer /><WhatsAppButton /></>} />
            <Route path="/tools" element={<><Navbar /><Tools /><Footer /><WhatsAppButton /></>} />
            <Route path="/pricing" element={<><Navbar /><Pricing /><Footer /><WhatsAppButton /></>} />
            <Route path="/blog" element={<><Navbar /><Blog /><Footer /><WhatsAppButton /></>} />
            <Route path="/blog/:slug" element={<><Navbar /><BlogDetail /><Footer /><WhatsAppButton /></>} />
            <Route path="/about" element={<><Navbar /><About /><Footer /><WhatsAppButton /></>} />
            <Route path="/contact" element={<><Navbar /><Contact /><Footer /><WhatsAppButton /></>} />
            <Route path="/login" element={<><Navbar /><Login /><Footer /><WhatsAppButton /></>} />
            <Route path="/join" element={<><Navbar /><Join /><Footer /><WhatsAppButton /></>} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<ErrorBoundary><AdminRoute><AdminDashboard /></AdminRoute></ErrorBoundary>} />
            <Route path="/admin/tools" element={<ErrorBoundary><AdminRoute><AdminTools /></AdminRoute></ErrorBoundary>} />
            <Route path="/admin/tools/new" element={<ErrorBoundary><AdminRoute><AdminToolForm /></AdminRoute></ErrorBoundary>} />
            <Route path="/admin/tools/:id/edit" element={<ErrorBoundary><AdminRoute><AdminToolForm /></AdminRoute></ErrorBoundary>} />
            <Route path="/admin/clients" element={<ErrorBoundary><AdminRoute><AdminClients /></AdminRoute></ErrorBoundary>} />
            <Route path="/admin/clients/new" element={<ErrorBoundary><AdminRoute><AdminClientForm /></AdminRoute></ErrorBoundary>} />
            <Route path="/admin/clients/:id/edit" element={<ErrorBoundary><AdminRoute><AdminClientForm /></AdminRoute></ErrorBoundary>} />
            <Route path="/admin/clients/:clientId/assign" element={<ErrorBoundary><AdminRoute><AdminBulkAssign /></AdminRoute></ErrorBoundary>} />
            <Route path="/admin/assign" element={<ErrorBoundary><AdminRoute><AdminBulkAssign /></AdminRoute></ErrorBoundary>} />
            <Route path="/admin/activity" element={<ErrorBoundary><AdminRoute><AdminActivity /></AdminRoute></ErrorBoundary>} />
            <Route path="/admin/blog" element={<ErrorBoundary><AdminRoute><AdminBlog /></AdminRoute></ErrorBoundary>} />
            <Route path="/admin/blog/new" element={<ErrorBoundary><AdminRoute><AdminBlogForm /></AdminRoute></ErrorBoundary>} />
            <Route path="/admin/blog/:id/edit" element={<ErrorBoundary><AdminRoute><AdminBlogForm /></AdminRoute></ErrorBoundary>} />
            <Route path="/admin/contacts" element={<ErrorBoundary><AdminRoute><AdminContacts /></AdminRoute></ErrorBoundary>} />

            {/* Client Routes */}
            <Route path="/client/login" element={<ClientLogin />} />
            <Route path="/client/dashboard" element={<ErrorBoundary><ClientRoute><ClientDashboardEnhanced /></ClientRoute></ErrorBoundary>} />
            <Route path="/client/tools" element={<ErrorBoundary><ClientRoute><ClientTools /></ClientRoute></ErrorBoundary>} />
            <Route path="/client/tools/:id" element={<ErrorBoundary><ClientRoute><ClientToolDetail /></ClientRoute></ErrorBoundary>} />
            <Route path="/client/profile" element={<ErrorBoundary><ClientRoute><ClientProfile /></ClientRoute></ErrorBoundary>} />

            {/* Catch-all 404 Route - MUST BE LAST */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ToastProvider>
  );
}

export default App;
