
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { useRequestDailyReportMutation, useGetDailyReportQuery } from '../store/api/yelpApi';
import { setDateRange } from '../store/slices/reportsSlice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calendar, TrendingUp, Eye, MousePointer, Phone, DollarSign } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const { dateRange, dailyData } = useSelector((state: RootState) => state.reports);
  const [requestDailyReport] = useRequestDailyReportMutation();
  const [businessId, setBusinessId] = useState('');
  const [reportId, setReportId] = useState('');

  const { data: reportData, isLoading: reportLoading } = useGetDailyReportQuery(
    reportId,
    { skip: !reportId }
  );

  const handleRequestReport = async () => {
    if (!businessId) {
      toast({
        title: "Укажите Business ID",
        description: "Business ID обязателен для запроса отчета",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await requestDailyReport({
        business_id: businessId,
        start_date: dateRange.start,
        end_date: dateRange.end,
      }).unwrap();

      setReportId(result.report_id);
      toast({
        title: "Отчет запрошен",
        description: `Report ID: ${result.report_id}`,
      });
    } catch (error) {
      toast({
        title: "Ошибка запроса отчета",
        description: "Попробуйте еще раз",
        variant: "destructive",
      });
    }
  };

  // Подготовка данных для графиков
  const chartData = reportData?.data || [];
  
  const totalImpressions = chartData.reduce((sum, item) => sum + item.impressions, 0);
  const totalClicks = chartData.reduce((sum, item) => sum + item.clicks, 0);
  const totalCalls = chartData.reduce((sum, item) => sum + item.calls, 0);
  const totalCost = chartData.reduce((sum, item) => sum + item.cost, 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Дашборд аналитики</h1>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Параметры отчета
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business_id">Business ID</Label>
              <Input
                id="business_id"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                placeholder="Введите Business ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Начальная дата</Label>
              <Input
                id="start_date"
                type="date"
                value={dateRange.start}
                onChange={(e) => dispatch(setDateRange({ ...dateRange, start: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Конечная дата</Label>
              <Input
                id="end_date"
                type="date"
                value={dateRange.end}
                onChange={(e) => dispatch(setDateRange({ ...dateRange, end: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleRequestReport} className="w-full">
                Запросить отчет
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Метрики */}
      {chartData.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Показы</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Клики</CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Звонки</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCalls.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Затраты</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* CTR метрика */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Дополнительные метрики
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">CTR (Click-Through Rate)</p>
                  <p className="text-2xl font-bold">{ctr}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Средняя стоимость клика</p>
                  <p className="text-2xl font-bold">
                    ${totalClicks > 0 ? (totalCost / totalClicks).toFixed(2) : '0.00'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Конверсия в звонки</p>
                  <p className="text-2xl font-bold">
                    {totalClicks > 0 ? ((totalCalls / totalClicks) * 100).toFixed(2) : '0'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Графики */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Показы и клики по дням</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="impressions" stroke="#8884d8" name="Показы" />
                    <Line type="monotone" dataKey="clicks" stroke="#82ca9d" name="Клики" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Звонки и затраты</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="calls" fill="#ffc658" name="Звонки" />
                    <Bar dataKey="cost" fill="#ff7300" name="Затраты ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {reportLoading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center">Загрузка отчета...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
