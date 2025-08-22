import React, { useState } from 'react';
import { 
  useGetProgramsQuery, 
  useTerminateProgramMutation,
  usePauseProgramMutation,
  useResumeProgramMutation 
} from '../store/api/yelpApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Loader2, Edit, Square, Play, Trash2, Search, X, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatErrorForToast } from '@/lib/utils';

const ProgramsList: React.FC = () => {
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [programStatus, setProgramStatus] = useState('CURRENT');
  const [searchInput, setSearchInput] = useState(''); // Те що в полі вводу
  const [activeSearch, setActiveSearch] = useState(''); // Активний пошуковий запит
  const [isSearchMode, setIsSearchMode] = useState(false); // Чи зараз режим пошуку
  
  // Звичайні програми або пошук
  const { data, isLoading, error, refetch } = useGetProgramsQuery({ 
    offset: isSearchMode ? 0 : offset, 
    limit: isSearchMode ? 40 : limit, // Максимум 40 записів для пошуку
    program_status: isSearchMode ? 'ALL' : programStatus 
  });
  
  // Фільтруємо програми за активним пошуковим запитом
  const allPrograms = data?.programs || [];
  const programs = isSearchMode && activeSearch
    ? allPrograms.filter(program => 
        program.program_id?.toLowerCase().includes(activeSearch.toLowerCase()) ||
        program.program_type?.toLowerCase().includes(activeSearch.toLowerCase()) ||
        program.yelp_business_id?.toLowerCase().includes(activeSearch.toLowerCase())
      )
    : allPrograms;

  // Функція для запуску пошуку
  const handleSearch = () => {
    if (searchInput.trim()) {
      setActiveSearch(searchInput.trim());
      setIsSearchMode(true);
      setOffset(0);
    }
  };

  // Функція для очищення пошуку
  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
    setIsSearchMode(false);
    setOffset(0);
  };

  // Обробка Enter в полі пошуку
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  const navigate = useNavigate();
  const [terminateProgram] = useTerminateProgramMutation();
  const [pauseProgram] = usePauseProgramMutation();
  const [resumeProgram] = useResumeProgramMutation();
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

  const handleAction = async (
    action: () => Promise<any>, 
    programId: string, 
    successMessage: string,
    actionName: string
  ) => {
    setLoadingActions(prev => ({ ...prev, [`${programId}-${actionName}`]: true }));
    try {
      await action();
      toast({
        title: successMessage,
        description: `Program ID: ${programId}`,
      });
      refetch(); // Обновляем список программ
    } catch (error: any) {
      const { title, description } = formatErrorForToast(error);
      toast({
        title,
        description,
        variant: 'destructive',
      });
    } finally {
      setLoadingActions(prev => ({ ...prev, [`${programId}-${actionName}`]: false }));
    }
  };

  const handleEdit = (programId: string) => {
    navigate(`/edit/${programId}`);
  };

  const handleTerminate = (programId: string) => {
    handleAction(
      () => terminateProgram(programId).unwrap(),
      programId,
      "Программа завершается",
      "terminate"
    );
  };

  const handlePause = (programId: string) => {
    handleAction(
      () => pauseProgram(programId).unwrap(),
      programId,
      "Программа приостановлена",
      "pause"
    );
  };

  const handleResume = (programId: string) => {
    handleAction(
      () => resumeProgram(programId).unwrap(),
      programId,
      "Программа возобновлена",
      "resume"
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <p className="text-red-500">Ошибка загрузки программ</p>
          <p className="text-sm text-gray-600 mt-2">
            {error && 'status' in error && `HTTP ${error.status}: ${error.data?.error?.message || 'Неизвестная ошибка'}`}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Рекламные программы</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Управление программами через Yelp Advertising API
          </p>
        </div>
        <Button onClick={() => navigate('/create')}>Создать программу</Button>
      </div>

      {/* Пошук */}
      <div className="bg-blue-50 p-4 rounded">
        <div className="flex gap-2 items-center">
          <Search className="h-4 w-4 text-gray-500" />
          <Input
            placeholder="Введите Program ID, тип программы или Business ID для поиска..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={!searchInput.trim() || isLoading}
            className="whitespace-nowrap"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Search className="h-4 w-4 mr-1" />
            )}
            Искать
          </Button>
          {isSearchMode && (
            <Button
              variant="outline"
              onClick={handleClearSearch}
              className="whitespace-nowrap"
            >
              <X className="h-4 w-4 mr-1" />
              Очистить
            </Button>
          )}
        </div>
        {isSearchMode && (
          <div className="mt-2 flex flex-col gap-1">
            <p className="text-sm text-blue-700 font-medium">
              🔍 Поиск по всем статусам: "{activeSearch}"
            </p>
            <p className="text-sm text-gray-600">
              Найдено: {programs.length} программ из {allPrograms.length} (первые 40 программ)
            </p>
            <p className="text-xs text-amber-600">
              ⚠️ Поиск ограничен первыми 40 программами Yelp API. Если не нашли нужную программу, уточните запрос.
            </p>
          </div>
        )}
      </div>

      {/* Фільтри та пагінація */}
      {!isSearchMode && (
        <div className="flex justify-between items-center bg-gray-50 p-4 rounded">
          <div className="flex gap-4 items-center">
            <div>
              <label className="text-sm font-medium">Статус:</label>
              <select 
                value={programStatus} 
                onChange={(e) => {
                  setProgramStatus(e.target.value);
                  setOffset(0); // Сброс к первой странице
                }}
                className="ml-2 border rounded px-2 py-1"
              >
                <option value="CURRENT">CURRENT</option>
                <option value="PAST">PAST</option>
                <option value="FUTURE">FUTURE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="ALL">ALL</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">На странице:</label>
              <select 
                value={limit} 
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setOffset(0); // Сброс к первой странице
                }}
                className="ml-2 border rounded px-2 py-1"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          
          {data?.total_count && (
            <div className="text-sm text-gray-600">
              Показано: {allPrograms.length} из {data.total_count}
            </div>
          )}
        </div>
      )}

      {programs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {isSearchMode 
                ? `Программы по запросу "${activeSearch}" не найдены среди всех ${allPrograms.length} программ. Попробуйте изменить поисковый запрос.`
                : `Нет программ со статусом "${programStatus}". Попробуйте изменить фильтр или создать новую программу.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Список программ */}
          <div className="grid gap-4">
            {programs.map((program, index) => (
              <Card key={program.program_id || `program-${index}`}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span className="text-lg">
                      {program.program_type} Program
                    </span>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        program.program_status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        program.program_status === 'INACTIVE' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {program.program_status}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        program.program_pause_status === 'NOT_PAUSED' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {program.program_pause_status}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Program ID:</strong>
                        <p className="font-mono text-xs break-all">{program.program_id}</p>
                      </div>
                      <div>
                        <strong>Business ID:</strong>
                        <p className="font-mono text-xs break-all">{program.yelp_business_id || 'N/A'}</p>
                      </div>
                      <div>
                        <strong>Dates:</strong>
                        <p>{program.start_date} - {program.end_date}</p>
                      </div>
                      {program.program_metrics && (
                        <div>
                          <strong>Budget:</strong>
                          <p>{program.program_metrics.budget} {program.program_metrics.currency}</p>
                        </div>
                      )}
                    </div>

                    {program.program_metrics && (
                      <div className="border-t pt-3">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <strong>Auto Bid:</strong>
                            <p>{program.program_metrics.is_autobid ? 'Yes' : 'No'}</p>
                          </div>
                          <div>
                            <strong>Max Bid:</strong>
                            <p>{program.program_metrics.max_bid || 'N/A'}</p>
                          </div>
                          <div>
                            <strong>Fee Period:</strong>
                            <p>{program.program_metrics.fee_period}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-3">
                      {/* EDIT - редагувати програму */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleEdit(program.program_id)}
                        disabled={!program.program_id}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Редактировать
                      </Button>

                      {/* TERMINATE - завершити програму */}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleTerminate(program.program_id)}
                        disabled={
                          loadingActions[`${program.program_id}-terminate`] ||
                          !program.program_id ||
                          program.program_status === 'INACTIVE' || 
                          program.program_status === 'TERMINATED' ||
                          program.program_status === 'EXPIRED'
                        }
                      >
                        {loadingActions[`${program.program_id}-terminate`] ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-1" />
                        )}
                        {program.program_status === 'INACTIVE' || program.program_status === 'TERMINATED' || program.program_status === 'EXPIRED' ? 
                          'Неактивна' : 'Завершить'
                        }
                      </Button>

                      {/* PAUSE/RESUME - пауза/відновлення програми */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => 
                          program.program_pause_status === 'PAUSED' ? 
                            handleResume(program.program_id) : 
                            handlePause(program.program_id)
                        }
                        disabled={
                          loadingActions[`${program.program_id}-pause`] ||
                          loadingActions[`${program.program_id}-resume`] ||
                          !program.program_id ||
                          program.program_status === 'TERMINATED'
                        }
                      >
                        {(loadingActions[`${program.program_id}-pause`] || 
                          loadingActions[`${program.program_id}-resume`]) ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : program.program_pause_status === 'PAUSED' ? (
                          <Play className="w-4 h-4 mr-1" />
                        ) : (
                          <Square className="w-4 h-4 mr-1" />
                        )}
                        {program.program_pause_status === 'PAUSED' ? 'Возобновить' : 'Приостановить'}
                      </Button>

                      {/* INFO - переглянути інформацію про програму */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/program-info/${program.program_id}`)}
                        disabled={!program.program_id}
                      >
                        Подробности
                      </Button>

                      {/* FEATURES - Функції програми */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/program-features/${program.program_id}`)}
                        disabled={!program.program_id}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Функции
                      </Button>

                      {/* STATUS - Переглянути статус */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/program-status/${program.program_id}`)}
                        disabled={!program.program_id}
                      >
                        Статус программы
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Пагинация - только если не в режиме поиска */}
          {!isSearchMode && (
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded">
              <Button
                variant="outline"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
              >
                Предыдущая страница
              </Button>
              
              <span className="text-sm text-gray-600">
                Страница {Math.floor(offset / limit) + 1}
                {data?.total_count && ` из ${Math.ceil(data.total_count / limit)}`}
              </span>
              
              <Button
                variant="outline"
                onClick={() => setOffset(offset + limit)}
                disabled={programs.length < limit}
              >
                Следующая страница
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgramsList;