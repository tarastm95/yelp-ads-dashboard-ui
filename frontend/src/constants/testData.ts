// Тестові Business IDs надані Yelp для sandbox середовища
export const TEST_BUSINESS_IDS = [
  'J9R1gG5xy7DpWsCWBup7DQ',
  'e2JTWqyUwRHXjpG8TCZ7Ow'
] as const;

export const TEST_BUSINESS_INFO = {
  'J9R1gG5xy7DpWsCWBup7DQ': {
    id: 'J9R1gG5xy7DpWsCWBup7DQ',
    name: 'Test Business #1',
    description: 'Перший тестовий бізнес для Yelp Ads API'
  },
  'e2JTWqyUwRHXjpG8TCZ7Ow': {
    id: 'e2JTWqyUwRHXjpG8TCZ7Ow', 
    name: 'Test Business #2',
    description: 'Другий тестовий бізнес для Yelp Ads API'
  }
} as const;

// Типи для TypeScript
export type TestBusinessId = typeof TEST_BUSINESS_IDS[number];

// Чи є Business ID тестовим
export const isTestBusinessId = (businessId: string): businessId is TestBusinessId => {
  return TEST_BUSINESS_IDS.includes(businessId as TestBusinessId);
};

// Інформація про тестове середовище
export const TEST_ENVIRONMENT_INFO = {
  title: 'Тестове середовище Yelp Ads API',
  description: 'Поточно використовуються тестові облікові дані з обмеженим доступом до 2 тестових бізнесів',
  limitations: [
    'Можна створювати/редагувати/паузити кампанії тільки для 2 тестових бізнесів',
    'Всі API доступні: Ads API, Partner Support API, Program Feature APIs', 
    'Після тестування будуть надані продакшн облікові дані',
    'В продакшні зможете управляти всіма бізнесами як партнер'
  ],
  note: 'Це стандартна практика Yelp для інтеграції API. Спочатку тестування в sandbox середовищі, потім перехід до повноцінного продакшну.'
} as const;
