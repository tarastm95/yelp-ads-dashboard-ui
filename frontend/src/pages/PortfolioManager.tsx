import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { 
  useCreatePortfolioProjectMutation,
  useGetPortfolioProjectQuery,
  PortfolioProject
} from '../store/api/yelpApi';
import { 
  Loader2, Plus, FolderOpen, Camera, Edit, Trash2, 
  Eye, EyeOff, Calendar, DollarSign, Clock
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import PortfolioProjectEditor from '../components/PortfolioProjectEditor';
import PortfolioPhotoGallery from '../components/PortfolioPhotoGallery';

const PortfolioManager: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showProjectEditor, setShowProjectEditor] = useState(false);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);

  const [createProject, { isLoading: isCreating }] = useCreatePortfolioProjectMutation();

  if (!programId) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Program ID not found</h1>
          <p className="text-gray-600 mt-2">Cannot load portfolio without program ID</p>
        </div>
      </div>
    );
  }

  const handleCreateProject = async () => {
    try {
      const result = await createProject(programId).unwrap();
      toast({
        title: 'Project created',
        description: `New project ${result.project_id} created successfully`,
      });
      
      // Set the new project as selected and open editor
      setSelectedProject(result.project_id);
      setShowProjectEditor(true);
    } catch (error: any) {
      console.error('❌ Create project error:', error);
      toast({
        title: 'Project creation error',
        description: error.data?.detail || 'Failed to create project',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (year?: number, month?: number) => {
    if (!year) return 'Not specified';
    if (!month) return year.toString();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[month - 1]} ${year}`;
  };

  const formatCost = (cost?: string) => {
    const costMap = {
      UNDER_100: 'Under $100',
      '100_500': '$100 - $500',
      '500_1000': '$500 - $1,000',
      '1000_5000': '$1,000 - $5,000',
      '5000_PLUS': '$5,000+',
    };
    return cost ? costMap[cost as keyof typeof costMap] || cost : 'Not specified';
  };

  const formatDuration = (duration?: string) => {
    const durationMap = {
      UNDER_1_WEEK: 'Less than a week',
      '1_2_WEEKS': '1-2 weeks',
      '2_4_WEEKS': '2-4 weeks',
      '1_3_MONTHS': '1-3 months',
      '3_PLUS_MONTHS': '3+ months',
    };
    return duration ? durationMap[duration as keyof typeof durationMap] || duration : 'Not specified';
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FolderOpen className="w-8 h-8" />
              Program portfolio
            </h1>
            <p className="text-gray-600 mt-1">
              Manage portfolio projects for program {programId}
            </p>
          </div>
          
          <Button 
            onClick={handleCreateProject} 
            disabled={isCreating}
            className="flex items-center gap-2"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create project
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FolderOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Portfolio is empty</h3>
            <p className="text-gray-600 mb-4">
              There are no projects in this program's portfolio yet
            </p>
            <Button onClick={handleCreateProject} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create first project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.project_id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{project.name}</CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={project.published ? 'default' : 'secondary'}>
                        {project.published ? (
                          <><Eye className="w-3 h-3 mr-1" /> Published</>
                        ) : (
                          <><EyeOff className="w-3 h-3 mr-1" /> Draft</>
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 line-clamp-2">
                  {project.description}
                </p>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span>Cost: {formatCost(project.cost)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Duration: {formatDuration(project.duration)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span>Completed: {formatDate(project.completion_year, project.completion_month)}</span>
                  </div>
                  
                  {project.service_offerings.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">Services:</p>
                      <div className="flex flex-wrap gap-1">
                        {project.service_offerings.slice(0, 3).map((service, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                        {project.service_offerings.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{project.service_offerings.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedProject(project.project_id);
                      setShowProjectEditor(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedProject(project.project_id)}
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Project Editor Dialog */}
      {selectedProject && (
        <Dialog open={showProjectEditor} onOpenChange={setShowProjectEditor}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit project</DialogTitle>
              <DialogDescription>
                Configure portfolio project details
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Project details</TabsTrigger>
                <TabsTrigger value="photos">Photo gallery</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="mt-6">
                <PortfolioProjectEditor
                  programId={programId}
                  projectId={selectedProject}
                  onClose={() => {
                    setShowProjectEditor(false);
                    setSelectedProject(null);
                  }}
                  onSuccess={() => {
                    // Refresh projects list if we had one
                  }}
                />
              </TabsContent>
              
              <TabsContent value="photos" className="mt-6">
                <PortfolioPhotoGallery
                  programId={programId}
                  projectId={selectedProject}
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PortfolioManager;
