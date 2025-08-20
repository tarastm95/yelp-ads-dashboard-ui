import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TEST_BUSINESS_IDS } from '@/constants/testData';
import { useCreateProgramMutation } from '@/store/api/yelpApi';
import { toast } from '@/hooks/use-toast';
import { TestTube, Copy } from 'lucide-react';

const ApiTestPanel: React.FC = () => {
  const [createProgram, { isLoading }] = useCreateProgramMutation();
  const [results, setResults] = useState<string>('');

  // Приклади правильних запитів
  const testCases = [
    {
      name: 'BP (Branded Profile)',
      description: 'Створення Branded Profile без CPC параметрів',
      payload: {
        business_id: TEST_BUSINESS_IDS[0],
        program_name: 'BP',
        start: '2025-08-21',
        end: '2025-08-23'
      }
    },
    {
      name: 'CPC з автобідом',
      description: 'CPC програма з автоматичним бідуванням',
      payload: {
        business_id: TEST_BUSINESS_IDS[0],
        program_name: 'CPC',
        budget: 20000, // $200.00 в центах
        is_autobid: true,
        start: '2025-08-21',
        end: '2025-08-23'
      }
    },
    {
      name: 'CPC з ручним бідом',
      description: 'CPC програма з ручним бідуванням',
      payload: {
        business_id: TEST_BUSINESS_IDS[1],
        program_name: 'CPC',
        budget: 20000, // $200.00 в центах
        is_autobid: false,
        max_bid: 500, // $5.00 в центах
        start: '2025-08-21',
        end: '2025-08-23'
      }
    }
  ];

  const runTest = async (testCase: typeof testCases[0]) => {
    try {
      setResults(prev => prev + `\n🧪 Тестуємо: ${testCase.name}\n`);
      setResults(prev => prev + `📤 Payload: ${JSON.stringify(testCase.payload, null, 2)}\n`);
      
      const result = await createProgram(testCase.payload).unwrap();
      
      setResults(prev => prev + `✅ Успіх: ${JSON.stringify(result, null, 2)}\n`);
      setResults(prev => prev + `🔗 Job ID: ${result.job_id}\n`);
      setResults(prev => prev + '─'.repeat(50) + '\n');
      
      toast({
        title: `${testCase.name} успішно створено`,
        description: `Job ID: ${result.job_id}`,
      });
    } catch (error: any) {
      setResults(prev => prev + `❌ Помилка: ${JSON.stringify(error, null, 2)}\n`);
      setResults(prev => prev + '─'.repeat(50) + '\n');
      
      toast({
        title: `Помилка в ${testCase.name}`,
        description: error?.data?.detail || 'Невідома помилка',
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопійовано",
      description: "Результати скопійовано в буфер обміну",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            API Test Panel
          </CardTitle>
          <CardDescription>
            Тестування правильних запитів згідно з Yelp Ads API правилами
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {testCases.map((testCase, index) => (
              <div key={index} className="border rounded p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold">{testCase.name}</h4>
                    <p className="text-sm text-gray-600">{testCase.description}</p>
                  </div>
                  <Button
                    onClick={() => runTest(testCase)}
                    disabled={isLoading}
                    size="sm"
                  >
                    {isLoading ? 'Тестування...' : 'Запустити тест'}
                  </Button>
                </div>
                <details className="mt-2">
                  <summary className="text-sm text-blue-600 cursor-pointer">
                    Показати payload
                  </summary>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                    {JSON.stringify(testCase.payload, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Результати тестування</CardTitle>
            <div className="space-x-2">
              <Button
                onClick={() => copyToClipboard(results)}
                variant="outline"
                size="sm"
                disabled={!results}
              >
                <Copy className="h-4 w-4 mr-2" />
                Копіювати
              </Button>
              <Button
                onClick={() => setResults('')}
                variant="outline"
                size="sm"
                disabled={!results}
              >
                Очистити
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={results}
            readOnly
            placeholder="Результати тестів з'являться тут..."
            className="min-h-[400px] font-mono text-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiTestPanel;
