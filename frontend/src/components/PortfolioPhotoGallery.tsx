import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { 
  Loader2, Plus, Camera, Trash2, Upload, ExternalLink,
  Star, Image as ImageIcon
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  useGetPortfolioPhotosQuery,
  useUploadPortfolioPhotoMutation,
  useDeletePortfolioPhotoMutation,
  PortfolioPhoto,
  PortfolioPhotoUploadRequest
} from '../store/api/yelpApi';

interface PortfolioPhotoGalleryProps {
  programId: string;
  projectId: string;
}

const PortfolioPhotoGallery: React.FC<PortfolioPhotoGalleryProps> = ({
  programId,
  projectId
}) => {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadData, setUploadData] = useState<PortfolioPhotoUploadRequest>({
    photo_url: '',
    biz_photo_id: '',
    is_before_photo: false,
    caption: '',
  });
  const [uploadMethod, setUploadMethod] = useState<'url' | 'biz_photo'>('url');

  const { 
    data: photos = [], 
    isLoading, 
    error,
    refetch 
  } = useGetPortfolioPhotosQuery({
    program_id: programId,
    project_id: projectId,
  });

  const [uploadPhoto, { isLoading: isUploading }] = useUploadPortfolioPhotoMutation();
  const [deletePhoto, { isLoading: isDeleting }] = useDeletePortfolioPhotoMutation();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (uploadMethod === 'url' && !uploadData.photo_url?.trim()) {
      toast({
        title: 'Помилка валідації',
        description: 'URL фото є обов\'язковим',
        variant: 'destructive',
      });
      return;
    }

    if (uploadMethod === 'biz_photo' && !uploadData.biz_photo_id?.trim()) {
      toast({
        title: 'Помилка валідації',
        description: 'ID бізнес-фото є обов\'язковим',
        variant: 'destructive',
      });
      return;
    }

    if (!uploadData.caption.trim()) {
      toast({
        title: 'Помилка валідації',
        description: 'Підпис до фото є обов\'язковим',
        variant: 'destructive',
      });
      return;
    }

    const payload: PortfolioPhotoUploadRequest = {
      is_before_photo: uploadData.is_before_photo,
      caption: uploadData.caption,
    };

    if (uploadMethod === 'url') {
      payload.photo_url = uploadData.photo_url;
    } else {
      payload.biz_photo_id = uploadData.biz_photo_id;
    }

    try {
      const result = await uploadPhoto({
        program_id: programId,
        project_id: projectId,
        data: payload,
      }).unwrap();

      toast({
        title: 'Фото завантажено',
        description: `Фото ${result.photo_id} успішно додано до проєкту`,
      });

      // Reset form
      setUploadData({
        photo_url: '',
        biz_photo_id: '',
        is_before_photo: false,
        caption: '',
      });
      setShowUploadDialog(false);
      
      // Refresh photos
      refetch();
    } catch (error: any) {
      console.error('❌ Upload photo error:', error);
      toast({
        title: 'Помилка завантаження',
        description: error.data?.detail || 'Не вдалося завантажити фото',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (photo: PortfolioPhoto) => {
    if (!confirm(`Ви впевнені, що хочете видалити фото "${photo.caption}"?`)) {
      return;
    }

    try {
      await deletePhoto({
        program_id: programId,
        project_id: projectId,
        photo_id: photo.photo_id,
      }).unwrap();

      toast({
        title: 'Фото видалено',
        description: 'Фото успішно видалено з проєкту',
      });

      refetch();
    } catch (error: any) {
      console.error('❌ Delete photo error:', error);
      toast({
        title: 'Помилка видалення',
        description: error.data?.detail || 'Не вдалося видалити фото',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Завантаження фотогалереї...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-semibold text-red-600">Помилка завантаження</h3>
        <p className="text-gray-600 mt-2">Не вдалося завантажити фотогалерею</p>
        <Button onClick={() => refetch()} className="mt-4">
          Спробувати знову
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Фотогалерея проєкту
          </h3>
          <p className="text-sm text-gray-600">
            {photos.length} фото у галереї
          </p>
        </div>

        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Додати фото
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Завантажити фото</DialogTitle>
              <DialogDescription>
                Додайте нове фото до проєкту портфоліо
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <Label>Спосіб завантаження</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={uploadMethod === 'url'}
                      onChange={() => setUploadMethod('url')}
                    />
                    Зовнішній URL
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={uploadMethod === 'biz_photo'}
                      onChange={() => setUploadMethod('biz_photo')}
                    />
                    Бізнес-фото Yelp
                  </label>
                </div>
              </div>

              {uploadMethod === 'url' ? (
                <div>
                  <Label htmlFor="photo_url">URL фото</Label>
                  <Input
                    id="photo_url"
                    type="url"
                    value={uploadData.photo_url}
                    onChange={(e) => setUploadData(prev => ({ 
                      ...prev, 
                      photo_url: e.target.value,
                      biz_photo_id: '' 
                    }))}
                    placeholder="https://example.com/photo.jpg"
                    required
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="biz_photo_id">ID бізнес-фото</Label>
                  <Input
                    id="biz_photo_id"
                    value={uploadData.biz_photo_id}
                    onChange={(e) => setUploadData(prev => ({ 
                      ...prev, 
                      biz_photo_id: e.target.value,
                      photo_url: '' 
                    }))}
                    placeholder="WavvLdfdP6g8aZTtbBQHTw"
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="caption">Підпис</Label>
                <Textarea
                  id="caption"
                  value={uploadData.caption}
                  onChange={(e) => setUploadData(prev => ({ 
                    ...prev, 
                    caption: e.target.value 
                  }))}
                  placeholder="Опис фото"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_before"
                  checked={uploadData.is_before_photo}
                  onCheckedChange={(checked) => setUploadData(prev => ({ 
                    ...prev, 
                    is_before_photo: checked 
                  }))}
                />
                <Label htmlFor="is_before">Це фото "До" робіт</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowUploadDialog(false)}
                >
                  Скасувати
                </Button>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Завантажити
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {photos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ImageIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Фотогалерея порожня</h3>
            <p className="text-gray-600 mb-4">
              Ще немає жодного фото в цьому проєкті
            </p>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Додати перше фото
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <Card key={photo.photo_id} className="overflow-hidden">
              <div className="relative aspect-video bg-gray-100">
                {photo.photo_url ? (
                  <img
                    src={photo.photo_url}
                    alt={photo.caption}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                
                <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-200">
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">
                      {photo.biz_photo_id ? `Бізнес-фото: ${photo.biz_photo_id}` : 'Фото недоступне'}
                    </p>
                  </div>
                </div>

                {photo.is_cover_photo && (
                  <Badge className="absolute top-2 left-2 bg-yellow-500">
                    <Star className="w-3 h-3 mr-1" />
                    Обкладинка
                  </Badge>
                )}

                {photo.is_before_photo && (
                  <Badge className="absolute top-2 right-2 bg-blue-500">
                    До
                  </Badge>
                )}

                <div className="absolute bottom-2 right-2 flex gap-1">
                  {photo.photo_url && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      onClick={() => window.open(photo.photo_url, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDelete(photo)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>

              <CardContent className="p-3">
                <p className="text-sm text-gray-700 line-clamp-2">
                  {photo.caption}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortfolioPhotoGallery;
