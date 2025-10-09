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
    return <p className="text-muted-foreground">No program data available</p>;
  }

  return (
    <div className="space-y-6">
      {data.businesses.map((biz) => (
        <Card key={biz.yelp_business_id}>
          <CardHeader>
            <CardTitle className="text-lg font-medium">{biz.yelp_business_id}</CardTitle>
            <CardDescription>Advertiser status: {biz.advertiser_status}</CardDescription>
          </CardHeader>
          <CardContent>
            {biz.programs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {biz.programs.map((p, index) => (
                    <TableRow key={p.program_id || `program-${biz.yelp_business_id}-${index}`}>
                      <TableCell className="font-mono text-xs">{p.program_id}</TableCell>
                      <TableCell>{p.program_type}</TableCell>
                      <TableCell>{p.program_status}</TableCell>
                      <TableCell>{p.start_date}</TableCell>
                      <TableCell>{p.end_date}</TableCell>
                      <TableCell className="text-right">
                        {p.program_metrics?.budget 
                          ? `$${(Number(p.program_metrics.budget) / 100).toFixed(2)}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {p.program_metrics?.billed_clicks?.toLocaleString() ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.program_metrics?.billed_impressions?.toLocaleString() ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.program_metrics?.ad_cost 
                          ? `$${(Number(p.program_metrics.ad_cost) / 100).toFixed(2)}`
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No programs for this business</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default BusinessProgramsView;
