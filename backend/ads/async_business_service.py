"""
Асинхронний сервіс для роботи з Business через asyncpg.
Використовує пряме підключення до PostgreSQL для швидкого bulk збереження.
"""
import asyncio
import asyncpg
import logging
from typing import Dict, List, Set
from django.conf import settings
import aiohttp

logger = logging.getLogger(__name__)


class AsyncBusinessService:
    """Асинхронний сервіс для роботи з Business через asyncpg."""
    
    FUSION_BASE = 'https://api.yelp.com'
    
    @classmethod
    async def get_db_pool(cls):
        """Створює asyncpg connection pool."""
        db_config = settings.DATABASES['default']
        return await asyncpg.create_pool(
            host=db_config['HOST'],
            port=db_config.get('PORT', 5432),
            database=db_config['NAME'],
            user=db_config['USER'],
            password=db_config['PASSWORD'],
            min_size=5,
            max_size=20
        )
    
    @classmethod
    async def get_existing_businesses(cls, pool: asyncpg.Pool, business_ids: Set[str]) -> Dict[str, Dict]:
        """
        Bulk запит існуючих businesses з БД.
        
        Returns:
            Dict[business_id -> {name, url, alias}]
        """
        if not business_ids:
            return {}
        
        query = """
            SELECT yelp_business_id, name, url, alias
            FROM ads_business
            WHERE yelp_business_id = ANY($1)
                AND name IS NOT NULL
                AND name != ''
                AND fetch_failed = FALSE
        """
        
        async with pool.acquire() as conn:
            rows = await conn.fetch(query, list(business_ids))
        
        result = {
            row['yelp_business_id']: {
                'name': row['name'],
                'url': row['url'],
                'alias': row['alias']
            }
            for row in rows
        }
        
        logger.info(f"💾 [DB] Found {len(result)}/{len(business_ids)} businesses in cache")
        return result
    
    @classmethod
    async def fetch_business_from_api(
        cls, 
        session: aiohttp.ClientSession, 
        business_id: str, 
        semaphore: asyncio.Semaphore
    ):
        """
        Завантажує один business з Yelp Fusion API.
        
        Semaphore обмежує concurrent requests (rate limiting).
        """
        async with semaphore:
            url = f"{cls.FUSION_BASE}/v3/businesses/{business_id}"
            try:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            'yelp_business_id': business_id,
                            'name': data.get('name'),
                            'url': data.get('url'),
                            'alias': data.get('alias'),
                            'fetch_failed': False
                        }
                    elif response.status == 404:
                        logger.debug(f"Business {business_id} not found (404)")
                        return {'yelp_business_id': business_id, 'fetch_failed': True}
                    else:
                        logger.warning(f"Business {business_id} fetch failed with status {response.status}")
                        return {'yelp_business_id': business_id, 'fetch_failed': True}
            except Exception as e:
                logger.warning(f"Failed to fetch {business_id}: {e}")
                return {'yelp_business_id': business_id, 'fetch_failed': True}
        
        return None
    
    @classmethod
    async def fetch_businesses_async(
        cls, 
        business_ids: Set[str],
        api_key: str,
        max_concurrent: int = 20
    ) -> List[Dict]:
        """
        Паралельно завантажує businesses з Yelp Fusion API.
        
        Args:
            business_ids: Set of business IDs to fetch
            api_key: Yelp Fusion API key
            max_concurrent: Max concurrent requests (rate limiting)
        
        Returns:
            List of business dicts
        """
        if not business_ids:
            return []
        
        semaphore = asyncio.Semaphore(max_concurrent)
        headers = {'Authorization': f'Bearer {api_key}'}
        
        async with aiohttp.ClientSession(headers=headers) as session:
            tasks = [
                cls.fetch_business_from_api(session, bid, semaphore)
                for bid in business_ids
            ]
            results = await asyncio.gather(*tasks)
        
        # Фільтруємо None
        businesses = [r for r in results if r]
        successful = len([b for b in businesses if not b.get('fetch_failed')])
        logger.info(f"📡 [API] Fetched {successful}/{len(business_ids)} businesses successfully")
        
        return businesses
    
    @classmethod
    async def save_businesses_to_db(cls, pool: asyncpg.Pool, businesses: List[Dict]) -> int:
        """
        Bulk збереження businesses в БД через asyncpg.
        
        Використовує INSERT ... ON CONFLICT для upsert.
        """
        if not businesses:
            return 0
        
        query = """
            INSERT INTO ads_business (yelp_business_id, name, url, alias, cached_at, fetch_failed)
            VALUES ($1, $2, $3, $4, NOW(), $5)
            ON CONFLICT (yelp_business_id) 
            DO UPDATE SET
                name = EXCLUDED.name,
                url = EXCLUDED.url,
                alias = EXCLUDED.alias,
                cached_at = NOW(),
                fetch_failed = EXCLUDED.fetch_failed
        """
        
        async with pool.acquire() as conn:
            await conn.executemany(
                query,
                [
                    (
                        b['yelp_business_id'],
                        b.get('name'),
                        b.get('url'),
                        b.get('alias'),
                        b.get('fetch_failed', False)
                    )
                    for b in businesses
                ]
            )
        
        logger.info(f"💾 [ASYNCPG] Saved {len(businesses)} businesses to DB")
        return len(businesses)
    
    @classmethod
    async def link_programs_to_businesses(cls, pool: asyncpg.Pool, username: str) -> int:
        """
        Зв'язує програми з businesses через foreign key.
        Виконується після збереження businesses.
        """
        query = """
            UPDATE ads_programregistry pr
            SET business_id = b.id
            FROM ads_business b
            WHERE pr.yelp_business_id = b.yelp_business_id
                AND pr.username = $1
                AND pr.business_id IS NULL
        """
        
        async with pool.acquire() as conn:
            result = await conn.execute(query, username)
        
        # Парсимо результат "UPDATE N"
        updated = int(result.split()[-1]) if result else 0
        logger.info(f"🔗 [ASYNCPG] Linked {updated} programs to businesses for {username}")
        return updated
    
    @classmethod
    async def sync_businesses(
        cls,
        business_ids: Set[str],
        api_key: str,
        username: str,
        max_concurrent: int = 20
    ) -> Dict[str, Dict]:
        """
        Головний метод: синхронізує businesses (DB → API → DB).
        
        Returns:
            Dict[business_id -> {name, url, alias}]
        """
        if not business_ids:
            logger.info("No business IDs to sync")
            return {}
        
        pool = await cls.get_db_pool()
        
        try:
            # 1. Перевіряємо що вже є в БД
            existing = await cls.get_existing_businesses(pool, business_ids)
            
            # 2. Визначаємо що треба завантажити
            to_fetch = business_ids - set(existing.keys())
            
            if not to_fetch:
                logger.info("✅ All businesses already in DB")
                # ⚠️ НЕ лінкуємо тут - це буде зроблено окремо в async_sync_service
                return existing
            
            logger.info(f"📡 Need to fetch {len(to_fetch)} businesses from API")
            
            # 3. Завантажуємо з API (паралельно)
            new_businesses = await cls.fetch_businesses_async(to_fetch, api_key, max_concurrent)
            
            # 4. Зберігаємо в БД
            await cls.save_businesses_to_db(pool, new_businesses)
            
            # 5. ⚠️ НЕ лінкуємо тут - це буде зроблено окремо в async_sync_service після збереження програм
            
            # 6. Додаємо нові до результату
            for b in new_businesses:
                if not b.get('fetch_failed') and b.get('name'):
                    existing[b['yelp_business_id']] = {
                        'name': b['name'],
                        'url': b.get('url'),
                        'alias': b.get('alias')
                    }
            
            return existing
        
        finally:
            await pool.close()

