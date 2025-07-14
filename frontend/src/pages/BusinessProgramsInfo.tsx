import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetBusinessProgramsQuery } from '../store/api/yelpApi';
import BusinessProgramsView from '../components/BusinessProgramsView';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const BusinessProgramsInfo: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetBusinessProgramsQuery(businessId || '', {
    skip: !businessId,
  });

  if (!businessId) {
    return <p className="text-red-500">Business ID не указан</p>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Назад
        </Button>
        <p className="text-red-500">Ошибка загрузки данных</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Button variant="outline" onClick={() => navigate(-1)}>
        Назад
      </Button>
      <BusinessProgramsView data={data} />
    </div>
  );
};

export default BusinessProgramsInfo;
