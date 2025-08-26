import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Save, X, Plus, Trash2, Eye, CheckCircle, XCircle } from 'lucide-react';

interface YelpPortfolioProject {
  project_id: string;
  published: boolean;
}

interface YelpPortfolioData {
  projects: YelpPortfolioProject[];
}

interface YelpPortfolioEditorProps {
  data?: YelpPortfolioData;
  onSave: (data: YelpPortfolioData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const YelpPortfolioEditor: React.FC<YelpPortfolioEditorProps> = ({
  data,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [projects, setProjects] = useState<YelpPortfolioProject[]>(
    data?.projects || []
  );

  useEffect(() => {
    if (data) {
      setProjects(data.projects || []);
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty project IDs
    const validProjects = projects
      .filter(p => p.project_id.trim())
      .map(p => ({
        project_id: p.project_id.trim(),
        published: p.published
      }));

    onSave({ projects: validProjects });
  };

  const addProject = () => {
    setProjects(prev => [...prev, { project_id: '', published: true }]);
  };

  const removeProject = (index: number) => {
    setProjects(prev => prev.filter((_, i) => i !== index));
  };

  const updateProject = (index: number, field: keyof YelpPortfolioProject, value: string | boolean) => {
    setProjects(prev => prev.map((p, i) => 
      i === index ? { ...p, [field]: value } : p
    ));
  };

  const isValidProjectId = (id: string): boolean => {
    // Project ID should be alphanumeric and reasonable length
    const projectIdPattern = /^[a-zA-Z0-9_-]{3,50}$/;
    return projectIdPattern.test(id);
  };

  const toggleAllPublished = () => {
    const allPublished = projects.every(p => p.published);
    setProjects(prev => prev.map(p => ({ ...p, published: !allPublished })));
  };

  const publishedCount = projects.filter(p => p.published).length;

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Yelp Portfolio ad settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">📂 What is Yelp Portfolio:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Displays your projects/work directly in ads</li>
              <li>• Increases trust of potential clients</li>
              <li>• Showcases the quality of your services</li>
              <li>• Only published projects will appear in ads</li>
            </ul>
          </div>

          {/* Summary */}
          {projects.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    📊 Overall stats: {projects.length} project(s)
                  </p>
                  <p className="text-xs text-gray-600">
                    Published: {publishedCount} | Unpublished: {projects.length - publishedCount}
                  </p>
                </div>
                {projects.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleAllPublished}
                  >
                    {projects.every(p => p.published) ? 'Hide all' : 'Publish all'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Projects List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Portfolio projects:</Label>
              {projects.length === 0 && (
                <span className="text-sm text-gray-500">No projects</span>
              )}
            </div>

            {projects.map((project, index) => (
              <Card key={index} className="border-gray-200">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    {/* Project ID Input */}
                    <div className="flex-1">
                      <Label htmlFor={`project_id_${index}`}>Project ID *</Label>
                      <Input
                        id={`project_id_${index}`}
                        value={project.project_id}
                        onChange={(e) => updateProject(index, 'project_id', e.target.value)}
                        placeholder="project_id_from_portfolio"
                        required
                        className={`${
                          project.project_id && !isValidProjectId(project.project_id) ? 'border-red-500' : ''
                        }`}
                      />
                      {project.project_id && !isValidProjectId(project.project_id) && (
                        <p className="text-xs text-red-600 mt-1">
                          ⚠️ Project ID must contain only letters, numbers, hyphens, and underscores (3-50 characters)
                        </p>
                      )}
                    </div>

                    {/* Published Toggle */}
                    <div className="flex flex-col items-center gap-2 min-w-[120px]">
                      <Label className="text-sm">Status</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={project.published}
                          onCheckedChange={(checked) => updateProject(index, 'published', checked)}
                        />
                        <Badge 
                          variant={project.published ? "default" : "secondary"}
                          className={project.published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                        >
                          {project.published ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Published
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Hidden
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeProject(index)}
                      className="mt-6"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Project Preview */}
                  {project.project_id && isValidProjectId(project.project_id) && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Project: <code className="bg-white px-2 py-1 rounded">{project.project_id}</code></p>
                          <p className="text-xs text-gray-500">
                            {project.published ? 'Will be shown in ads' : 'Will not be shown in ads'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Navigate to portfolio manager for this project
                            const currentPath = window.location.pathname;
                            const programId = currentPath.split('/').pop();
                            window.open(`/portfolio/${programId}`, '_blank');
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Add Project Button */}
            <Button type="button" onClick={addProject} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add project to ad
            </Button>
          </div>

          {/* How to find Project ID */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">🔍 How to find project ID:</h4>
            <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside">
              <li>Go to the Portfolio section in this app</li>
              <li>Create or select an existing project</li>
              <li>Copy the project ID from the project details</li>
              <li>Paste the ID into the field above</li>
              <li>Enable "Published" to show the project in ads</li>
            </ol>
          </div>

          {/* Tips */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">💡 Tips for an effective portfolio:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Quality:</strong> Add only the best projects</li>
              <li>• <strong>Variety:</strong> Showcase different types of work</li>
              <li>• <strong>Relevance:</strong> Update your portfolio regularly</li>
              <li>• <strong>Details:</strong> Include detailed project descriptions</li>
              <li>• <strong>Photos:</strong> Use quality "before" and "after" photos</li>
            </ul>
          </div>

          {/* Performance Note */}
          {projects.length > 5 && (
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">⚡ Performance optimization:</h4>
              <p className="text-xs text-gray-600">
                You have {projects.length} project(s). We recommend showing no more than 3-5 top projects in ads for optimal performance and quality focus.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading || projects.some(p => p.project_id && !isValidProjectId(p.project_id))} 
              className="flex-1"
            >
              {isLoading ? <div className="animate-spin mr-2">⏳</div> : <Save className="w-4 h-4 mr-2" />}
              Save portfolio settings
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default YelpPortfolioEditor;
