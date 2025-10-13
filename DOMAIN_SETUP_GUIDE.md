# 🌐 Domain Setup Guide for ads.digitizeit.net

## 📋 Quick Start

Цей гайд допоможе вам налаштувати ваш Yelp Ads Dashboard для роботи з доменом `ads.digitizeit.net` замість IP адреси.

## 🚀 Швидкий запуск (3 команди)

```bash
# 1. Зробити скрипт виконуваним та запустити
chmod +x start-with-domain.sh
./start-with-domain.sh

# 2. Після того як все працює по HTTP, додати HTTPS
sudo chmod +x setup-ssl.sh
sudo ./setup-ssl.sh

# 3. Готово! Ваш сайт доступний на https://ads.digitizeit.net
```

## 📁 Створені файли

### 🐳 Docker конфігурація
- `docker-compose.prod.yml` - Production версія Docker Compose
- `config-prod.env` - Backend environment variables
- `frontend/config-prod.env` - Frontend environment variables

### 🌐 Nginx конфігурація
- `nginx-ads.digitizeit.net.conf` - Конфігурація Nginx для домену

### 🛠 Скрипти автоматизації
- `start-with-domain.sh` - Автоматичний запуск з доменом
- `setup-ssl.sh` - Налаштування SSL сертифіката

## 🔧 Детальна інструкція

### Крок 1: DNS налаштування

**⚠️ ВАЖЛИВО:** Спочатку налаштуйте DNS!

У вашого доменного провайдера додайте A record:
```
Type: A
Name: ads
Value: 72.60.66.164
TTL: 300
```

Перевірити можна командою:
```bash
nslookup ads.digitizeit.net
# Повинно показати: 72.60.66.164
```

### Крок 2: Запустити проект з доменом

```bash
# Дати права виконання
chmod +x start-with-domain.sh

# Запустити автоматичне налаштування
./start-with-domain.sh
```

Цей скрипт:
- ✅ Створює .env файли
- ✅ Налаштовує Nginx
- ✅ Запускає Docker контейнери
- ✅ Тестує всі endpoint'и

### Крок 3: Перевірити що працює

```bash
# Перевірити контейнери
docker ps

# Перевірити сайт
curl http://ads.digitizeit.net

# Перевірити API
curl http://ads.digitizeit.net/api/
```

### Крок 4: Додати HTTPS (SSL)

```bash
# Запустити SSL setup
sudo chmod +x setup-ssl.sh
sudo ./setup-ssl.sh
```

Цей скрипт:
- ✅ Встановлює Certbot
- ✅ Отримує SSL сертифікат
- ✅ Налаштовує автооновлення
- ✅ Оновлює конфігурацію для HTTPS

## 🌐 Результат

Після виконання всіх кроків ваш сайт буде доступний:

- **🔒 HTTPS:** `https://ads.digitizeit.net`
- **🔄 HTTP:** `http://ads.digitizeit.net` (редірект на HTTPS)
- **⚙️ API:** `https://ads.digitizeit.net/api`
- **👤 Admin:** `https://ads.digitizeit.net/admin`

## 🛠 Корисні команди

### Docker управління
```bash
# Подивитися логи
docker-compose -f docker-compose.prod.yml logs -f

# Перезапустити тільки frontend
docker-compose -f docker-compose.prod.yml restart frontend

# Зупинити все
docker-compose -f docker-compose.prod.yml down

# Повністю перезібрати
docker-compose -f docker-compose.prod.yml up -d --build
```

### SSL управління
```bash
# Перевірити сертифікати
sudo certbot certificates

# Оновити сертифікат вручну
sudo certbot renew

# Перевірити автооновлення
sudo systemctl status certbot.timer
```

### Nginx управління
```bash
# Перевірити конфігурацію
sudo nginx -t

# Перезавантажити
sudo systemctl reload nginx

# Подивитися логи
sudo tail -f /var/log/nginx/ads.digitizeit.net.error.log
```

## 🔧 Налаштування API ключів

Після запуску оновіть ваші Yelp API ключі:

```bash
# Редагувати .env.prod
nano .env.prod

# Змінити:
YELP_API_KEY=your_actual_api_key
YELP_API_SECRET=your_actual_api_secret
YELP_FUSION_TOKEN=your_actual_fusion_token

# Перезапустити backend
docker-compose -f docker-compose.prod.yml restart backend
```

## 🐛 Troubleshooting

### DNS не працює
```bash
# Перевірити DNS
nslookup ads.digitizeit.net
dig ads.digitizeit.net

# Почекати поширення DNS (до 60 хвилин)
```

### Контейнери не запускаються
```bash
# Подивитися логи
docker-compose -f docker-compose.prod.yml logs

# Перевірити порти
sudo netstat -tlnp | grep -E "(8000|8080)"
```

### SSL не працює
```bash
# Перевірити що HTTP працює спочатку
curl -I http://ads.digitizeit.net

# Подивитися логи Certbot
sudo journalctl -u certbot -f
```

### Nginx помилки
```bash
# Подивитися логи помилок
sudo tail -f /var/log/nginx/error.log

# Перевірити статус
sudo systemctl status nginx
```

## 📊 Моніторинг

### Перевірка здоров'я системи
```bash
# Статус контейнерів
docker-compose -f docker-compose.prod.yml ps

# Статус сервісів
sudo systemctl status nginx
sudo systemctl status certbot.timer

# Використання ресурсів
docker stats

# Дискове місце
df -h
```

## 🔄 Оновлення додатка

```bash
# Витягнути останні зміни з git
git pull

# Перезібрати та перезапустити
docker-compose -f docker-compose.prod.yml up -d --build

# Перевірити що все працює
curl https://ads.digitizeit.net
```

## 📞 Підтримка

Якщо виникли проблеми:

1. 📋 Перевірте логи контейнерів
2. 🌐 Переконайтеся що DNS налаштований правильно  
3. 🔒 Перевірте що HTTP працює перед додаванням SSL
4. 📧 Перевірте що порти 80 та 443 відкриті в firewall

**🎉 Готово! Ваш Yelp Ads Dashboard тепер працює на красивому домені!**
