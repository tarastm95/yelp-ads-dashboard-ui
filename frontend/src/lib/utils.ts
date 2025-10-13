import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFeatureType(featureType: string): string {
  return featureType
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Yelp API Error Codes mapping to user-friendly messages
const errorMap: Record<string, { title: string; description: string; actionRequired: boolean }> = {
  // Critical Errors
  'BUSINESS_NOT_ACTIVE': {
    title: 'Бізнес неактивний',
    description: 'Цей бізнес закритий і не може використовувати рекламу.',
    actionRequired: true
  },
  'PROGRAM_NOT_ACTIVE_CLOSED_BUSINESS': {
    title: 'Програма неактивна',
    description: 'Програма завершена через закриття бізнесу. Зверніться до partner-support@yelp.com якщо це помилка.',
    actionRequired: true
  },
  'PROGRAM_NOT_ACTIVE_BUSINESS_REMOVED_FROM_SEARCH': {
    title: 'Бізнес видалено з пошуку',
    description: 'Бізнес видалено через дублікат або невідповідність вимогам. Зверніться до partner-support@yelp.com.',
    actionRequired: true
  },
  'PROGRAM_HAS_EXPIRED': {
    title: 'Програма прострочена',
    description: 'Програма більше не активна через закінчення терміну або видалення бізнесу з пошуку.',
    actionRequired: false
  },

  // Validation Errors
  'INVALID_OR_MISSING_KEY': {
    title: 'Неправильні дані',
    description: 'Відсутні або некоректні обов\'язкові поля в запиті.',
    actionRequired: true
  },
  'PROGRAM_ALREADY_RUNNING_BY_ANOTHER_PROVIDER': {
    title: 'Програма вже запущена',
    description: 'Клієнт вже купив цей продукт у іншого провайдера.',
    actionRequired: true
  },
  'CANNOT_ADD_PROGRAM_IN_PAST': {
    title: 'Неправильна дата',
    description: 'Неможливо створити програму з датою початку в минулому.',
    actionRequired: true
  },
  'PROGRAM_ALREADY_REQUESTED': {
    title: 'Дублікат запиту',
    description: 'Ви вже відправили запит на створення цього продукту для клієнта.',
    actionRequired: false
  },
  'CONFLICTS_WITH_ANOTHER_ACTIVE_PROGRAM': {
    title: 'Конфлікт програм',
    description: 'Програма конфліктує з активною або нещодавно завершеною програмою.',
    actionRequired: true
  },
  'CANNOT_DECREASE_BUDGET_BELOW_AMOUNT_ALREADY_SPENT': {
    title: 'Бюджет вже витрачено',
    description: 'Неможливо зменшити бюджет нижче вже витраченої суми.',
    actionRequired: true
  },
  'CURRENCY_MISMATCH': {
    title: 'Невідповідність валюти',
    description: 'Валюта повинна залишатися незмінною для існуючої програми.',
    actionRequired: true
  },
  'BUSINESS_RESTRICTED_FROM_ADVERTISING': {
    title: 'Обмеження реклами',
    description: 'Yelp заблокував можливість купівлі реклами для цього бізнесу.',
    actionRequired: true
  },
  'INVALID_PRICE': {
    title: 'Неправильна ціна',
    description: 'Ціна повинна бути числовою і вказана в центах.',
    actionRequired: true
  },
  'UNSUPPORTED_CATEGORIES': {
    title: 'Непідтримувана категорія',
    description: 'Категорія бізнесу не підтримується через політику обмежень.',
    actionRequired: true
  },
  'BID_TOO_HIGH_FOR_BUDGET': {
    title: 'Ставка занадто висока',
    description: 'Ставка перевищує пропорційний бюджет. Збільште бюджет.',
    actionRequired: true
  },
  'COULD_NOT_MODIFY_PROGRAM': {
    title: 'Помилка редагування',
    description: 'Не вдалося змінити вказану програму.',
    actionRequired: true
  },
  'NO_CATEGORIES': {
    title: 'Відсутні категорії',
    description: 'Бізнес не має категорій або вони очікують підтвердження.',
    actionRequired: true
  },
  'CAMPAIGN_BUDGET_VIOLATES_PROMO_RESTRICTIONS': {
    title: 'Порушення промо-кодів',
    description: 'Бюджет кампанії порушує обмеження промо-коду.',
    actionRequired: true
  },

  // General errors
  'PROGRAM_NOT_FOUND': {
    title: 'Program Not Found',
    description: 'Program with the specified identifier was not found in your account.',
    actionRequired: true
  }
};

export function getYelpErrorInfo(errorCode: string) {
  return errorMap[errorCode] || {
    title: 'Unknown Error',
    description: `Error code: ${errorCode}. Please contact support.`,
    actionRequired: true
  };
}

export function formatErrorForToast(error: any): { title: string; description: string } {
  // Handle validation error for program not found specifically
  if (error?.data?.detail?.includes?.('Program with the specified identifier was not found')) {
    return {
      title: 'Program Not Found',
      description: 'Program with this ID does not exist or was deleted. Check the programs list and try again.'
    };
  }

  // Handle Yelp API error codes
  if (error?.data?.detail && typeof error.data.detail === 'string') {
    const errorCode = error.data.detail.split(':')[0]?.trim();
    if (errorCode && errorMap[errorCode]) {
      const errorInfo = getYelpErrorInfo(errorCode);
      return {
        title: errorInfo.title,
        description: errorInfo.description + (errorInfo.actionRequired ? ' 💡 Contact support with error details' : '')
      };
    }
  }

  // Handle HTTP errors
  if (error?.status) {
    switch (error.status) {
      case 400:
        return {
          title: 'Bad Request',
          description: 'Please check the entered data'
        };
      case 401:
        return {
          title: 'Authentication Error',
          description: 'Please check your credentials'
        };
      case 403:
        return {
          title: 'Access Forbidden',
          description: 'You do not have permission to perform this operation'
        };
      case 404:
        return {
          title: 'Not Found',
          description: 'The requested resource was not found'
        };
      case 500:
        return {
          title: 'Server Error',
          description: 'Internal server error. Please try again later'
        };
      default:
        return {
          title: `Error ${error.status}`,
          description: error.data?.detail || 'Unknown server error'
        };
    }
  }

  // Fallback for any other errors
  return {
    title: 'Error',
    description: error?.message || error?.data?.detail || 'An unknown error occurred'
  };
}
