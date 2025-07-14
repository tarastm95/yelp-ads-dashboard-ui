
import { Provider } from 'react-redux';
import { store } from './store';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from './components/Layout';
import Index from "./pages/Index";
import CreateProgram from './components/CreateProgram';
import EditProgram from './components/EditProgram';
import ProgramsList from './components/ProgramsList';
import JobStatusMonitor from './components/JobStatusMonitor';
import ProgramDetails from './pages/ProgramDetails';
import EditAdvancedProgram from './pages/EditAdvancedProgram';
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
            <Route path="edit/:programId" element={<EditProgram />} />
            <Route path="edit-advanced" element={<EditAdvancedProgram />} />
            <Route path="edit-advanced/:programId" element={<EditAdvancedProgram />} />
            <Route path="programs" element={<ProgramsList />} />
            <Route path="program/:programId" element={<ProgramDetails />} />
            <Route path="jobs" element={<JobStatusMonitor />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </Provider>
);

export default App;
