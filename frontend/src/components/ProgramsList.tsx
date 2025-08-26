import React, { useState, useEffect } from 'react';
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
import { Loader2, Edit, Square, Play, Trash2, Search, X, Settings, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatErrorForToast } from '@/lib/utils';

const ProgramsList: React.FC = () => {
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [programStatus, setProgramStatus] = useState('CURRENT');
  const [searchInput, setSearchInput] = useState(''); // Те що в полі вводу
  const [activeSearch, setActiveSearch] = useState(''); // Активний пошуковий запит
  const [isSearchMode, setIsSearchMode] = useState(false); // Чи зараз режим пошуку
  const [isChangingPage, setIsChangingPage] = useState(false); // Стан переключення сторінки
  
  // Створюємо унікальний ключ для примусового оновлення
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  
  // Стан для швидкого переходу на сторінку
  const [jumpToPage, setJumpToPage] = useState('');

  // Функція для генерації номерів сторінок з еліпсисом
  const generatePageNumbers = (currentPage: number, totalPages: number) => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7; // Максимум видимих сторінок
    
    if (totalPages <= maxVisiblePages) {
      // Якщо сторінок мало, показуємо всі
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Завжди показуємо першу сторінку
      pages.push(1);
      
      // Визначаємо діапазон навколо поточної сторінки
      let startPage = Math.max(2, currentPage - 2);
      let endPage = Math.min(totalPages - 1, currentPage + 2);
      
      // Додаємо еліпсис після першої сторінки, якщо потрібно
      if (startPage > 2) {
        pages.push('...');
      }
      
      // Додаємо сторінки навколо поточної
      for (let i = startPage; i <= endPage; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }
      
      // Додаємо еліпсис перед останньою сторінкою, якщо потрібно
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      
      // Завжди показуємо останню сторінку
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Функція для переходу на сторінку
  const goToPage = (page: number) => {
    const newOffset = (page - 1) * limit;
    setIsChangingPage(true);
    setOffset(newOffset);
    setForceRefreshKey(prev => prev + 1);
  };

  // Функція для швидкого переходу на сторінку
  const handleJumpToPage = () => {
    const pageNumber = parseInt(jumpToPage);
    const totalPages = data?.total_count ? Math.ceil(data.total_count / limit) : 1;
    
    if (pageNumber && pageNumber >= 1 && pageNumber <= totalPages) {
      goToPage(pageNumber);
      setJumpToPage('');
    }
  };
  
  // Звичайні програми або пошук
  const { data, isLoading, error, refetch } = useGetProgramsQuery({ 
    offset: isSearchMode ? 0 : offset, 
    limit: isSearchMode ? 40 : limit, // Максимум 40 записів для пошуку
    program_status: isSearchMode ? 'ALL' : programStatus,
    // Додаємо ключ для примусового оновлення
    _forceKey: forceRefreshKey
  });

  // Скидаємо стан переключення сторінки коли дані завантажилися або є помилка
  useEffect(() => {
    if (!isLoading) {
      setIsChangingPage(false);
    }
  }, [isLoading]);

  // Додатковий захист - скидаємо стан через таймаут якщо щось пішло не так
  useEffect(() => {
    if (isChangingPage) {
      const timeoutId = setTimeout(() => {
        setIsChangingPage(false);
      }, 10000); // 10 секунд максимум
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [isChangingPage]);
  
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

  // Показуємо основний лоадер тільки при першому завантаженні (не при переключенні сторінок)
  if (isLoading && !isChangingPage) {
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
                  setIsChangingPage(true);
                  setProgramStatus(e.target.value);
                  setOffset(0); // Сброс к первой странице
                  // Примусово оновлюємо дані через forceKey
                  setForceRefreshKey(prev => prev + 1);
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

          </div>
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
          {/* Показуємо лоадер замість списку під час переключення сторінки */}
          {(isLoading || isChangingPage) ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {isChangingPage ? 'Переключение страницы...' : 'Загрузка программ...'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {isChangingPage 
                    ? `Загружаем страницу ${Math.floor(offset / limit) + 1}...` 
                    : 'Пожалуйста, подождите...'
                  }
                </p>
              </div>
            </div>
          ) : (
            /* Список программ */
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
          )}

          {/* Современная пагинация с номерами страниц */}
          {!isSearchMode && !(isLoading || isChangingPage) && data?.total_count && (
            <div className="flex flex-col items-center space-y-4 bg-gray-50 p-4 rounded">
              {/* Информация о результатах и быстрая смена количества на странице */}
              <div className="flex flex-col sm:flex-row items-center justify-between w-full space-y-2 sm:space-y-0">
                <div className="text-sm text-gray-600 text-center sm:text-left">
                  Показано {programs.length} из {data.total_count} программ
                  <span className="hidden sm:inline"> (страница {Math.floor(offset / limit) + 1} из {Math.ceil(data.total_count / limit)})</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600">На странице:</span>
                  {[10, 20, 50].map((pageSize) => (
                    <Button
                      key={pageSize}
                      variant={limit === pageSize ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setIsChangingPage(true);
                        setLimit(pageSize);
                        setOffset(0);
                        setForceRefreshKey(prev => prev + 1);
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      {pageSize}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Индикатор прогресса пагинации */}
              {(() => {
                const currentPage = Math.floor(offset / limit) + 1;
                const totalPages = Math.ceil(data.total_count / limit);
                const progress = (currentPage / totalPages) * 100;
                
                if (totalPages > 1) {
                  return (
                    <div className="w-full max-w-md">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Страница {currentPage}</span>
                        <span>из {totalPages}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* Пагинация */}
              <div className="flex flex-wrap items-center justify-center gap-1">
                {(() => {
                  const currentPage = Math.floor(offset / limit) + 1;
                  const totalPages = Math.ceil(data.total_count / limit);
                  
                  if (totalPages <= 1) return null;
                  
                  return (
                    <>
                      {/* Первая страница */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                        className="px-2"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      
                      {/* Предыдущая страница */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      {/* Быстрый переход -5 страниц (только на десктопе и если есть много страниц) */}
                      {totalPages > 10 && currentPage > 6 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => goToPage(Math.max(1, currentPage - 5))}
                          className="px-2 text-xs hidden sm:inline-flex"
                          title="На 5 страниц назад"
                        >
                          -5
                        </Button>
                      )}
                      
                      {/* Номера страниц */}
                      {generatePageNumbers(currentPage, totalPages).map((page, index) => (
                        <div key={index}>
                          {page === '...' ? (
                            <span className="px-3 py-1 text-gray-500">...</span>
                          ) : (
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(page as number)}
                              className="min-w-[2.5rem]"
                            >
                              {page}
                            </Button>
                          )}
                        </div>
                      ))}
                      
                      {/* Быстрый переход +5 страниц (только на десктопе и если есть много страниц) */}
                      {totalPages > 10 && currentPage < totalPages - 5 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => goToPage(Math.min(totalPages, currentPage + 5))}
                          className="px-2 text-xs hidden sm:inline-flex"
                          title="На 5 страниц вперед"
                        >
                          +5
                        </Button>
                      )}
                      
                      {/* Следующая страница */}
              <Button
                variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-2"
                      >
                        <ChevronRight className="h-4 w-4" />
              </Button>
              
                      {/* Последняя страница */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-2"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </>
                  );
                })()}
              </div>
              
                            {/* Швидкий перехід на сторінку */}
              {(() => {
                const totalPages = data?.total_count ? Math.ceil(data.total_count / limit) : 1;
                if (totalPages > 10) {
                  return (
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-2 text-sm">
                      <span className="text-gray-600">Перейти на страницу:</span>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="1"
                          max={totalPages}
                          value={jumpToPage}
                          onChange={(e) => setJumpToPage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleJumpToPage();
                            }
                          }}
                          className="w-20 h-8 text-center"
                          placeholder="№"
                        />
              <Button
                          size="sm"
                          onClick={handleJumpToPage}
                          disabled={!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > totalPages}
                        >
                          Перейти
              </Button>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgramsList;