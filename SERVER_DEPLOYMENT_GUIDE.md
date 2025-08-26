# 🚀 Server Deployment Guide для 72.60.66.164

## ✅ Що було виправлено

1. **Fixed hardcoded localhost URLs** в `Login.tsx`
2. **Updated CORS middleware** для підтримки IP сервера
3. **Created configuration templates** для .env файлів
4. **Created deployment script** для автоматичного розгортання

## 🔧 Швидке розгортання

### Крок 1: Запустити автоматичний скрипт
```bash
# Дати права на виконання та запустити
chmod +x deploy-server.sh
./deploy-server.sh
```

### Крок 2: Оновити API ключі
Відредагуйте `backend/.env` та додайте ваші справжні Yelp API ключі:
```bash
nano backend/.env
# Замініть:
YELP_API_KEY=your_actual_yelp_api_key
YELP_API_SECRET=your_actual_yelp_api_secret  
YELP_FUSION_TOKEN=your_actual_yelp_fusion_token
```

### Крок 3: Запустити сервіси
```bash
# Terminal 1: Backend
./start-backend.sh

# Terminal 2: Frontend
./start-frontend.sh
```

## 🔍 Альтернативний розгортання (мануально)

### Backend Setup
```bash
cd backend

# Створити .env файл
cp config.env.template .env
# Відредагувати .env з вашими налаштуваннями

# Встановити залежності
pip install -r requirements.txt

# Запустити міграції
python manage.py migrate

# Запустити сервер
python manage.py runserver 0.0.0.0:8000
```

### Frontend Setup
```bash
cd frontend

# Створити .env файл
cp config.env.template .env

# Встановити залежності
npm install

# Зібрати проект
npm run build

# Запустити preview сервер
npm run preview -- --host 0.0.0.0 --port 8080
```

## 🌐 URLs після розгортання

- **Frontend**: http://72.60.66.164:8080
- **Backend**: http://72.60.66.164:8000  
- **API**: http://72.60.66.164:8000/api

## 🔒 Безпека

### Firewall
```bash
# Відкрити потрібні порти
sudo ufw allow 8000
sudo ufw allow 8080
sudo ufw allow 22
sudo ufw enable
```

### Nginx (Рекомендовано для продакшена)
```bash
# Скопіювати конфігурацію
sudo cp nginx.conf.template /etc/nginx/sites-available/yelp-ads
sudo ln -s /etc/nginx/sites-available/yelp-ads /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🐛 Troubleshooting

### Помилка "ERR_CONNECTION_REFUSED"
- ✅ **Fixed**: Оновлено URL в Login.tsx з localhost на відносний шлях
- ✅ **Fixed**: Оновлено CORS middleware для підтримки IP сервера

### Помилка CORS
- ✅ **Fixed**: Middleware тепер підтримує всі необхідні origins
- Перевірте, що backend запущений на правильному порту

### API ключі
- Переконайтеся, що ви оновили справжні Yelp API ключі в `backend/.env`
- Перевірте формат ключів (без пробілів/переносів)

## 📊 Моніторинг

### Логи Backend
```bash
# Django логи відображаються в консолі
# Або перенаправте в файл:
python manage.py runserver 0.0.0.0:8000 > backend.log 2>&1 &
tail -f backend.log
```

### Логи Frontend
```bash
# Vite логи відображаються в консолі
npm run preview -- --host 0.0.0.0 --port 8080 > frontend.log 2>&1 &
tail -f frontend.log
```

## 🔄 Process Management (Production)

### Using PM2
```bash
npm install -g pm2

# Backend
pm2 start "python manage.py runserver 0.0.0.0:8000" --name "yelp-backend" --cwd ./backend

# Frontend  
pm2 start "npm run preview -- --host 0.0.0.0 --port 8080" --name "yelp-frontend" --cwd ./frontend

# Save configuration
pm2 save
pm2 startup
```

## ✨ Features

- ✅ Auto CORS configuration
- ✅ Environment variables setup
- ✅ Production-ready builds
- ✅ Logging configuration
- ✅ Error handling
- ✅ Security headers

## 🆘 Support

Якщо виникли проблеми:
1. Перевірте логи backend та frontend
2. Переконайтеся, що порти 8000 та 8080 відкриті
3. Перевірте .env файли на правильність
4. Перевірте статус процесів: `ps aux | grep python` та `ps aux | grep node`
