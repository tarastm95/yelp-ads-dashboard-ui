# ⚡ Quick Domain Setup: ads.digitizeit.net

## 🎯 Мета
Перевести ваш Yelp Ads Dashboard з `http://72.60.66.164:8080` на `https://ads.digitizeit.net`

## ⚡ Швидкий старт (2 хвилини)

### 1️⃣ Налаштувати DNS (зробити один раз)
У вашого доменного провайдера:
```
Type: A
Name: ads  
Value: 72.60.66.164
```

### 2️⃣ Запустити з доменом
```bash
chmod +x start-with-domain.sh && ./start-with-domain.sh
```

### 3️⃣ Додати HTTPS (опціонально)
```bash
sudo chmod +x setup-ssl.sh && sudo ./setup-ssl.sh
```

## ✅ Результат
- 🌐 HTTP: `http://ads.digitizeit.net`
- 🔒 HTTPS: `https://ads.digitizeit.net` (після SSL)

## 🔧 Що створено

| Файл | Призначення |
|------|-------------|
| `docker-compose.prod.yml` | Production Docker конфігурація |
| `config-prod.env` | Backend налаштування |
| `frontend/config-prod.env` | Frontend налаштування |
| `nginx-ads.digitizeit.net.conf` | Nginx конфігурація |
| `start-with-domain.sh` | Автозапуск з доменом |
| `setup-ssl.sh` | SSL налаштування |

## 🛠 Корисні команди

```bash
# Подивитися статус
docker ps

# Логи
docker-compose -f docker-compose.prod.yml logs -f

# Перезапуск
docker-compose -f docker-compose.prod.yml restart

# Зупинка
docker-compose -f docker-compose.prod.yml down

# Тестування
curl http://ads.digitizeit.net
```

## 🆘 Якщо щось не працює

1. **DNS не працює:** Почекайте до 60 хвилин для поширення
2. **Контейнери не стартують:** `docker-compose -f docker-compose.prod.yml logs`
3. **Nginx помилки:** `sudo tail -f /var/log/nginx/error.log`
4. **SSL проблеми:** Переконайтеся що HTTP працює спочатку

**Детальні інструкції в `DOMAIN_SETUP_GUIDE.md`** 📖
