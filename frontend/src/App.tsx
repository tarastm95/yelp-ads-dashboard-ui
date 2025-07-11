
import { Provider } from 'react-redux';
import { store } from './store';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from './components/Layout';
import Index from "./pages/Index";
import CreateProgram from './components/CreateProgram';
import ProgramsList from './components/ProgramsList';
import BusinessSearch from './components/BusinessSearch';
import Dashboard from './components/Dashboard';
import JobStatusMonitor from './components/JobStatusMonitor';
import CategoryManager from './components/CategoryManager';
import Login from './pages/Login';
import NotFound from "./pages/NotFound";

const App = () => (
  <Provider store={store}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Index />} />
            <Route path="create" element={<CreateProgram />} />
            <Route path="programs" element={<ProgramsList />} />
            <Route path="search" element={<BusinessSearch />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="jobs" element={<JobStatusMonitor />} />
            <Route path="categories" element={<CategoryManager />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </Provider>
);

export default App;
