import React from 'react';
import { BusinessProgramsResponse } from '../types/yelp';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';

interface Props {
  data: BusinessProgramsResponse;
}

const BusinessProgramsView: React.FC<Props> = ({ data }) => {
  if (data.businesses.length === 0) {
    return <p className="text-muted-foreground">Нет данных о программах</p>;
  }

  return (
    <div className="space-y-6">
      {data.businesses.map((biz) => (
        <Card key={biz.yelp_business_id}>
          <CardHeader>
            <CardTitle className="text-lg font-medium">{biz.yelp_business_id}</CardTitle>
            <CardDescription>Статус рекламодателя: {biz.advertiser_status}</CardDescription>
          </CardHeader>
          <CardContent>
            {biz.programs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID программы</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Начало</TableHead>
                    <TableHead>Конец</TableHead>
                    <TableHead className="text-right">Бюджет</TableHead>
                    <TableHead className="text-right">Клики</TableHead>
                    <TableHead className="text-right">Показы</TableHead>
                    <TableHead className="text-right">Стоимость</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {biz.programs.map((p) => (
                    <TableRow key={p.program_id}>
                      <TableCell className="font-mono text-xs">{p.program_id}</TableCell>
                      <TableCell>{p.program_type}</TableCell>
                      <TableCell>{p.program_status}</TableCell>
                      <TableCell>{p.start_date}</TableCell>
                      <TableCell>{p.end_date}</TableCell>
                      <TableCell className="text-right">
                        {p.program_metrics?.budget ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.program_metrics?.billed_clicks ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.program_metrics?.billed_impressions ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.program_metrics?.ad_cost ?? '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">Нет программ для этого бизнеса</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default BusinessProgramsView;
