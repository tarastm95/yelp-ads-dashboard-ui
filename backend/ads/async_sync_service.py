"""
Асинхронний сервіс синхронізації програм з Yelp API.
Використовує asyncio для максимальної швидкості.

Швидкість:
- 1914 програм: ~3-4 секунди (48 паралельних запитів по 40 програм)
- 10000 програм: ~8-12 секунд (250 паралельних запитів)

Автоматично визначає кількість сторінок та робить всі запити паралельно.
"""
import asyncio
import logging
import time
from typing import Dict, List, Set, Tuple
from django.conf import settings
from asgiref.sync import sync_to_async
import aiohttp
from aiohttp import BasicAuth
from aiohttp_retry import RetryClient, ExponentialRetry

from .models import ProgramRegistry, PartnerCredential

logger = logging.getLogger(__name__)


class AsyncProgramSyncService:
    """
    Асинхронний сервіс для ШВИДКОЇ синхронізації програм з Yelp API.
    
    Особливості:
    - Автоматично визначає кількість сторінок (total / batch_size)
    - Виконує ВСІ запити паралельно (asyncio.gather)
    - Retry логіка для надійності
    - Server-Sent Events для real-time прогресу
    """
    
    PARTNER_BASE = 'https://partner-api.yelp.com'
    
    @classmethod
    async def fetch_batch_async(
        cls, 
        session: RetryClient, 
        offset: int, 
        limit: int, 
        username: str,
        password: str
    ) -> Tuple[List[Dict], int]:
        """
        Асинхронно завантажує один батч програм.
        
        Args:
            session: Aiohttp retry client
            offset: Offset для пагінації
            limit: Limit для пагінації
            username: Username для Basic Auth
            password: Password для Basic Auth
            
        Returns:
            Tuple (programs, total_count)
        """
        url = f'{cls.PARTNER_BASE}/programs/v1'
        params = {
            'offset': offset,
            'limit': limit,
            'program_status': 'ALL'
        }
        
        try:
            auth = BasicAuth(username, password)
            async with session.get(url, params=params, auth=auth) as response:
                response.raise_for_status()
                data = await response.json()
                
                programs = data.get('payment_programs', [])
                total = data.get('total', 0)
                
                # Збагачуємо програми: витягуємо yelp_business_id з businesses[0]
                for program in programs:
                    businesses = program.get('businesses', [])
                    if businesses and len(businesses) > 0:
                        program['yelp_business_id'] = businesses[0].get('yelp_business_id')
                        program['partner_business_id'] = businesses[0].get('partner_business_id')
                    else:
                        program['yelp_business_id'] = None
                        program['partner_business_id'] = None
                
                logger.debug(f"✅ [ASYNC] Fetched batch at offset {offset}: {len(programs)} programs")
                return programs, total
                
        except Exception as e:
            logger.error(f"❌ [ASYNC] Error fetching batch at offset {offset}: {e}")
            return [], 0
    
    @classmethod
    async def fetch_all_programs_async(
        cls,
        username: str,
        password: str,
        batch_size: int = 40,
        progress_callback = None
    ) -> Tuple[List[Dict], int]:
        """
        Асинхронно завантажує ВСІ програми паралельно.
        Автоматично визначає кількість сторінок з total count.
        
        Args:
            username: Username для автентифікації
            password: Password для автентифікації
            batch_size: Розмір батчу (за замовчуванням 20)
            progress_callback: Optional callback(completed, total) для прогресу
            
        Returns:
            Tuple (all_programs, total_count)
        """
        
        # Налаштування retry
        retry_options = ExponentialRetry(
            attempts=3,
            start_timeout=1,
            max_timeout=10,
            factor=2.0
        )
        
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            retry_client = RetryClient(
                client_session=session,
                retry_options=retry_options
            )
            
            # Крок 1: Отримуємо перший батч для визначення total
            logger.info(f"🚀 [ASYNC] Fetching first batch to determine total...")
            first_batch, total = await cls.fetch_batch_async(
                retry_client, 0, batch_size, username, password
            )
            
            if total == 0:
                logger.error("❌ [ASYNC] Failed to get total count from API")
                return [], 0
            
            # Крок 2: Розраховуємо кількість сторінок автоматично
            num_pages = (total + batch_size - 1) // batch_size  # Округлення вгору
            logger.info(f"📊 [ASYNC] Total programs in API: {total}")
            logger.info(f"📄 [ASYNC] Batch size: {batch_size}")
            logger.info(f"🔢 [ASYNC] Number of pages: {num_pages}")
            logger.info(f"🚀 [ASYNC] Will execute {num_pages - 1} parallel requests...")
            
            # Крок 3: Створюємо задачі для ВСІХ решти сторінок
            tasks = []
            for page in range(1, num_pages):
                offset = page * batch_size
                task = cls.fetch_batch_async(
                    retry_client, offset, batch_size, username, password
                )
                tasks.append(task)
            
            # Крок 4: Виконуємо ВСІ запити ПАРАЛЕЛЬНО з прогресом
            logger.info(f"⚡ [ASYNC] Executing {len(tasks)} requests in parallel (unlimited concurrency)...")
            start_time = asyncio.get_event_loop().time()
            
            # Збираємо всі програми
            all_programs = list(first_batch)
            completed = 1  # Перший батч вже завантажений
            total_batches = num_pages
            
            # Виконуємо tasks з відстеженням прогресу
            for i, task in enumerate(asyncio.as_completed(tasks)):
                try:
                    result = await task
                    if isinstance(result, tuple):
                        programs, _ = result
                        all_programs.extend(programs)
                    completed += 1
                    
                    # Викликаємо callback для прогресу
                    if progress_callback and completed % 10 == 0:  # Кожні 10 батчів
                        progress_callback(completed, total_batches)
                    
                except Exception as e:
                    logger.error(f"❌ [ASYNC] Task failed: {e}")
                    completed += 1
                    continue
            
            elapsed = asyncio.get_event_loop().time() - start_time
            logger.info(f"⏱️  [ASYNC] Completed {len(tasks)} parallel requests in {elapsed:.2f} seconds!")
            
            logger.info(f"✅ [ASYNC] Successfully fetched {len(all_programs)} programs from {total} total")
            logger.info(f"🚀 [ASYNC] Speed: {len(all_programs) / elapsed:.0f} programs/second")
            
            return all_programs, total
    
    @classmethod
    async def fetch_all_programs_http2(
        cls,
        username: str,
        password: str,
        batch_size: int = 40,
        progress_callback = None
    ) -> Tuple[List[Dict], int]:
        """
        HTTP/2 optimized version - all requests through single connection.
        Expected: 1.5-2.0 seconds for ~1900 programs (vs 3.6s with aiohttp).
        """
        import httpx
        
        logger.info(f"🚀 [HTTP/2] Starting optimized sync with multiplexing...")
        logger.info(f"🔍 [HTTP/2] Username: {username}, Batch size: {batch_size}")
        start_time = time.time()
        
        # Timing checkpoints
        t_init = time.time()
        
        # HTTP/2 configuration with single connection
        limits = httpx.Limits(
            max_connections=1,  # Single connection for all requests
            max_keepalive_connections=1
        )
        
        timeout = httpx.Timeout(30.0, connect=10.0)
        
        t_config = time.time()
        logger.info(f"⏱️  [HTTP/2] Config setup: {(t_config - t_init)*1000:.1f}ms")
        
        async with httpx.AsyncClient(
            http2=True,  # Enable HTTP/2 multiplexing
            limits=limits,
            timeout=timeout,
            follow_redirects=True
        ) as client:
            
            t_client = time.time()
            logger.info(f"⏱️  [HTTP/2] Client created: {(t_client - t_config)*1000:.1f}ms")
            
            # Step 1: First request to get total count
            logger.info(f"📊 [HTTP/2] Fetching first batch to determine total...")
            url = f'{cls.PARTNER_BASE}/programs/v1'
            params = {'offset': 0, 'limit': batch_size, 'program_status': 'ALL'}
            
            try:
                t_req_start = time.time()
                response = await client.get(
                    url,
                    params=params,
                    auth=(username, password)
                )
                t_req_end = time.time()
                logger.info(f"⏱️  [HTTP/2] First request completed: {(t_req_end - t_req_start)*1000:.1f}ms")
                logger.info(f"🔍 [HTTP/2] Response status: {response.status_code}, HTTP version: {response.http_version}")
                
                response.raise_for_status()
                data = response.json()
                
                t_parse = time.time()
                logger.info(f"⏱️  [HTTP/2] JSON parsed: {(t_parse - t_req_end)*1000:.1f}ms")
                
                total = data.get('total', 0)
                first_programs = data.get('payment_programs', [])
                
                # Enrich first batch
                for program in first_programs:
                    businesses = program.get('businesses', [])
                    if businesses and len(businesses) > 0:
                        program['yelp_business_id'] = businesses[0].get('yelp_business_id')
                        program['partner_business_id'] = businesses[0].get('partner_business_id')
                    else:
                        program['yelp_business_id'] = None
                        program['partner_business_id'] = None
                
                if total == 0:
                    logger.error("❌ [HTTP/2] Failed to get total count")
                    return [], 0
                
                # Step 2: Calculate number of pages
                num_pages = (total + batch_size - 1) // batch_size
                logger.info(f"📊 [HTTP/2] Total: {total}, Pages: {num_pages}, Batch size: {batch_size}")
                logger.info(f"⚡ [HTTP/2] Will execute {num_pages - 1} requests through single connection...")
                
                # Step 3: Create tasks for remaining pages
                t_tasks_start = time.time()
                
                async def fetch_page(page_num):
                    t_page_start = time.time()
                    offset = page_num * batch_size
                    try:
                        resp = await client.get(
                            url,
                            params={'offset': offset, 'limit': batch_size, 'program_status': 'ALL'},
                            auth=(username, password)
                        )
                        t_page_req = time.time()
                        resp.raise_for_status()
                        page_data = resp.json()
                        programs = page_data.get('payment_programs', [])
                        
                        t_page_parse = time.time()
                        logger.debug(f"⏱️  [HTTP/2] Page {page_num}: request={((t_page_req - t_page_start)*1000):.0f}ms, parse={((t_page_parse - t_page_req)*1000):.0f}ms")
                        
                        # Enrich programs
                        for program in programs:
                            businesses = program.get('businesses', [])
                            if businesses and len(businesses) > 0:
                                program['yelp_business_id'] = businesses[0].get('yelp_business_id')
                                program['partner_business_id'] = businesses[0].get('partner_business_id')
                            else:
                                program['yelp_business_id'] = None
                                program['partner_business_id'] = None
                        
                        return programs
                    except Exception as e:
                        logger.error(f"❌ [HTTP/2] Error fetching page {page_num}: {e}")
                        return []
                
                # Step 4: Execute all requests in parallel through multiplexing
                tasks = [fetch_page(page) for page in range(1, num_pages)]
                
                t_tasks_created = time.time()
                logger.info(f"⏱️  [HTTP/2] Tasks created: {(t_tasks_created - t_tasks_start)*1000:.1f}ms")
                
                all_programs = list(first_programs)
                completed = 1
                total_batches = num_pages
                
                # Execute with progress tracking
                t_parallel_start = time.time()
                for i, task in enumerate(asyncio.as_completed(tasks)):
                    try:
                        programs = await task
                        all_programs.extend(programs)
                        completed += 1
                        
                        # Progress callback every 10 batches
                        if progress_callback and completed % 10 == 0:
                            progress_callback(completed, total_batches)
                            
                    except Exception as e:
                        logger.error(f"❌ [HTTP/2] Task failed: {e}")
                        completed += 1
                
                t_parallel_end = time.time()
                logger.info(f"⏱️  [HTTP/2] All parallel requests: {(t_parallel_end - t_parallel_start):.3f}s")
                
                elapsed = time.time() - start_time
                logger.info(f"⏱️  [HTTP/2] ⭐ TOTAL TIME: {elapsed:.3f}s")
                logger.info(f"✅ [HTTP/2] Fetched {len(all_programs)} programs from {total} total")
                logger.info(f"🚀 [HTTP/2] Speed: {len(all_programs) / elapsed:.0f} programs/second")
                
                # Breakdown
                logger.info(f"⏱️  [HTTP/2] 📊 Timing breakdown:")
                logger.info(f"⏱️  [HTTP/2]   - Setup: {(t_client - t_init)*1000:.0f}ms")
                logger.info(f"⏱️  [HTTP/2]   - First request: {(t_req_end - t_req_start)*1000:.0f}ms")
                logger.info(f"⏱️  [HTTP/2]   - Parallel requests: {(t_parallel_end - t_parallel_start)*1000:.0f}ms ({(t_parallel_end - t_parallel_start)/elapsed*100:.1f}%)")
                
                return all_programs, total
                
            except Exception as e:
                elapsed_on_error = time.time() - start_time
                logger.error(f"❌ [HTTP/2] Fatal error after {elapsed_on_error:.3f}s: {e}")
                logger.error(f"❌ [HTTP/2] Error type: {type(e).__name__}")
                import traceback
                logger.error(f"❌ [HTTP/2] Traceback:\n{traceback.format_exc()}")
                return [], 0
    
    @classmethod
    def sync_with_asyncio(cls, username: str, batch_size: int = 40):
        """
        Синхронна обгортка для асинхронної синхронізації.
        Використовується для виклику з Django views.
        
        Args:
            username: Username для автентифікації
            batch_size: Розмір батчу
            
        Yields:
            Dict з прогресом синхронізації (для SSE)
        """
        yield {
            'type': 'start',
            'message': '🚀 Starting ASYNC synchronization...'
        }
        
        # Початок загального таймінгу
        sync_start_time = time.time()
        
        try:
            # Отримуємо credentials ДО async частини
            from .models import PartnerCredential
            cred_start = time.time()
            try:
                cred = PartnerCredential.objects.filter(username=username).first()
                if not cred:
                    yield {
                        'type': 'error',
                        'message': 'No credentials found for user'
                    }
                    return
                password = cred.password
                cred_time = time.time() - cred_start
                logger.info(f"⏱️  [TIMING] Get credentials: {cred_time:.3f}s")
            except Exception as e:
                logger.error(f"❌ [ASYNC] Failed to get credentials: {e}")
                yield {
                    'type': 'error',
                    'message': f'Failed to get credentials: {str(e)}'
                }
                return
            
            # Запускаємо асинхронне завантаження з прогресом
            logger.info(f"🔄 [ASYNC] Starting async sync for {username}")
            api_start_time = time.time()
            
            # Створюємо список для збереження прогрес подій
            progress_events = []
            
            def progress_callback(completed, total):
                """Callback для прогресу завантаження"""
                percentage = int((completed / total) * 100)
                progress_events.append({
                    'type': 'progress',
                    'message': f'⚡ Fetching from API: {completed}/{total} batches',
                    'completed': completed,
                    'total': total,
                    'percentage': percentage
                })
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                # HTTP/2 DISABLED - it's slower than aiohttp for Yelp API
                # Reason: Yelp API processes requests slowly (~4s each), HTTP/2 multiplexing doesn't help
                # Result: aiohttp (3.6s) is faster than HTTP/2 (5.3s)
                logger.info(f"🔄 [ASYNC] Using aiohttp method (HTTP/2 disabled - slower for this API)...")
                all_programs, total = loop.run_until_complete(
                    cls.fetch_all_programs_async(username, password, batch_size, progress_callback)
                )
            finally:
                loop.close()
            
            # Час завантаження з API
            api_elapsed = time.time() - api_start_time
            logger.info(f"⏱️  [TIMING] ⚡ Yelp API fetch: {api_elapsed:.3f}s for {len(all_programs)} programs")
            logger.info(f"⏱️  [TIMING] 🚀 API Speed: {len(all_programs) / api_elapsed:.0f} programs/second")
            
            # Відправляємо прогрес події з API завантаження
            if progress_events:
                for event in progress_events:
                    yield event
            
            if not all_programs:
                yield {
                    'type': 'error',
                    'message': 'Failed to fetch programs from API'
                }
                return
            
            yield {
                'type': 'info',
                'total_api': total,
                'message': f'⚡ Fetched {len(all_programs)} programs from API in {api_elapsed:.2f}s'
            }
            
            # Отримуємо існуючі program_ids з БД
            db_query_start = time.time()
            db_program_ids = set(
                ProgramRegistry.objects.filter(username=username)
                .values_list('program_id', flat=True)
            )
            db_query_time = time.time() - db_query_start
            logger.info(f"⏱️  [TIMING] 💾 DB query (existing programs): {db_query_time:.3f}s")
            
            total_db_before = len(db_program_ids)
            
            yield {
                'type': 'info',
                'total_db': total_db_before,
                'message': f'💾 Database has {total_db_before} programs'
            }
            
            # Знаходимо нові та існуючі програми
            api_program_ids = {p.get('program_id') for p in all_programs if p.get('program_id')}
            missing_ids = api_program_ids - db_program_ids
            common_ids = api_program_ids & db_program_ids
            deleted_ids = db_program_ids - api_program_ids
            
            logger.info(f"📥 [ASYNC] Missing in DB: {len(missing_ids)} programs")
            logger.info(f"🔄 [ASYNC] Common programs: {len(common_ids)}")
            logger.info(f"🗑️  [ASYNC] Deleted from API: {len(deleted_ids)} programs")
            
            yield {
                'type': 'info',
                'message': f'📊 Analysis: +{len(missing_ids)} to add, ~{len(common_ids)} to update, -{len(deleted_ids)} to delete'
            }
            
            # Зберігаємо нові програми (Django ORM - синхронно)
            added = 0
            if missing_ids:
                yield {
                    'type': 'progress',
                    'message': f'📥 Adding {len(missing_ids)} new programs...',
                    'synced': 0,
                    'total': len(missing_ids),
                    'percentage': 0
                }
                
                logger.info(f"💾 [ASYNC] Saving {len(missing_ids)} new programs to DB...")
                from .sync_service import ProgramSyncService
                programs_to_add = [p for p in all_programs if p.get('program_id') in missing_ids]
                
                save_start = time.time()
                try:
                    added = ProgramSyncService._save_programs_batch(username, programs_to_add)
                    save_time = time.time() - save_start
                    logger.info(f"✅ [ASYNC] Saved {added} new programs to DB")
                    logger.info(f"⏱️  [TIMING] 💾 DB save (bulk_create): {save_time:.3f}s")
                    logger.info(f"⏱️  [TIMING] 🚀 Save speed: {added / save_time:.0f} programs/second")
                except Exception as e:
                    save_time = time.time() - save_start
                    logger.error(f"❌ [ASYNC] Failed to save programs: {e}", exc_info=True)
                    added = 0
                
                yield {
                    'type': 'progress',
                    'message': f'✅ Added {added} new programs',
                    'synced': added,
                    'total': len(missing_ids),
                    'added': added,
                    'percentage': 100
                }
            
            # Оновлюємо існуючі програми (ASYNCPG - швидко!)
            updated = 0
            update_time = 0
            if common_ids:
                logger.info(f"🔄 [ASYNC] Updating {len(common_ids)} existing programs...")
                
                programs_to_update = [p for p in all_programs if p.get('program_id') in common_ids]
                
                # Підготовка даних для asyncpg
                from .sync_service import ProgramSyncService
                programs_data = []
                
                for program in programs_to_update:
                    # Витягуємо business_id
                    yelp_business_id = program.get('yelp_business_id')
                    if not yelp_business_id:
                        businesses = program.get('businesses', [])
                        if businesses and len(businesses) > 0:
                            yelp_business_id = businesses[0].get('yelp_business_id')
                    
                    # Визначаємо статус
                    status = ProgramSyncService._determine_program_status(
                        program.get('program_status'),
                        program.get('program_pause_status'),
                        program.get('start_date'),
                        program.get('end_date')
                    )
                    
                    # Парсимо дати
                    from datetime import datetime
                    start_date = None
                    end_date = None
                    try:
                        if program.get('start_date'):
                            start_date = datetime.strptime(program.get('start_date'), '%Y-%m-%d').date()
                        if program.get('end_date'):
                            end_date = datetime.strptime(program.get('end_date'), '%Y-%m-%d').date()
                    except:
                        pass
                    
                    # Program metrics
                    program_metrics = program.get('program_metrics', {})
                    budget_cents = program_metrics.get('budget', 0) if program_metrics else 0
                    budget = budget_cents / 100.0 if budget_cents else None
                    
                    # Partner business ID
                    partner_business_id = None
                    businesses = program.get('businesses', [])
                    if businesses and len(businesses) > 0:
                        partner_business_id = businesses[0].get('partner_business_id')
                    
                    programs_data.append({
                        'program_id': program.get('program_id'),
                        'yelp_business_id': yelp_business_id,
                        'status': status,
                        'program_name': program.get('program_type'),
                        'start_date': start_date,
                        'end_date': end_date,
                        'program_status': program.get('program_status'),
                        'program_pause_status': program.get('program_pause_status'),
                        'budget': budget,
                        'currency': program_metrics.get('currency') if program_metrics else 'USD',
                        'is_autobid': program_metrics.get('is_autobid') if program_metrics else None,
                        'max_bid': program_metrics.get('max_bid', 0) / 100.0 if program_metrics and program_metrics.get('max_bid') else None,
                        'billed_impressions': program_metrics.get('billed_impressions', 0) if program_metrics else 0,
                        'billed_clicks': program_metrics.get('billed_clicks', 0) if program_metrics else 0,
                        'ad_cost': program_metrics.get('ad_cost', 0) / 100.0 if program_metrics else 0,
                        'fee_period': program_metrics.get('fee_period') if program_metrics else None,
                        'partner_business_id': partner_business_id,
                        'active_features': program.get('active_features', []),
                        'available_features': program.get('available_features', []),
                        'businesses': businesses,
                    })
                
                update_start = time.time()
                try:
                    # ⚡ Використовуємо AsyncProgramService для швидкого UPDATE
                    from .async_program_service import AsyncProgramService
                    from .async_business_service import AsyncBusinessService
                    
                    # Створюємо новий event loop для async операції
                    update_loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(update_loop)
                    
                    try:
                        pool = update_loop.run_until_complete(AsyncBusinessService.get_db_pool())
                        updated = update_loop.run_until_complete(
                            AsyncProgramService.bulk_update_programs(pool, username, programs_data)
                        )
                        update_loop.run_until_complete(pool.close())
                    finally:
                        update_loop.close()
                    
                    update_time = time.time() - update_start
                    logger.info(f"✅ [ASYNCPG] Updated {updated} programs in {update_time:.3f}s")
                    logger.info(f"⏱️  [TIMING] 💾 DB update (asyncpg): {update_time:.3f}s")
                    logger.info(f"⏱️  [TIMING] 🚀 Update speed: {updated / update_time:.0f} programs/second")
                except Exception as e:
                    update_time = time.time() - update_start
                    logger.error(f"❌ [ASYNCPG] Failed to update programs: {e}", exc_info=True)
                    updated = 0
                
                yield {
                    'type': 'info',
                    'message': f'🔄 Updated {updated} existing programs in {update_time:.2f}s'
                }
            
            # Видаляємо застарілі програми
            deleted = 0
            delete_time = 0
            if deleted_ids:
                logger.warning(f"🗑️  [ASYNC] Deleting {len(deleted_ids)} obsolete programs")
                delete_start = time.time()
                deleted, _ = ProgramRegistry.objects.filter(
                    username=username,
                    program_id__in=deleted_ids
                ).delete()
                delete_time = time.time() - delete_start
                logger.info(f"⏱️  [TIMING] 🗑️  DB delete: {delete_time:.3f}s")
                
                yield {
                    'type': 'info',
                    'message': f'🗑️  Deleted {deleted} obsolete programs'
                }
            
            # ✅ ТЕПЕР програми вже збережені в БД! Можна синхронізувати businesses
            logger.info(f"🔍 [DEBUG] Collecting business_ids from {len(all_programs)} programs...")
            business_ids = {
                p.get('yelp_business_id') 
                for p in all_programs 
                if p.get('yelp_business_id')
            }
            logger.info(f"🔍 [DEBUG] Collected {len(business_ids)} unique business_ids")
            
            business_time = 0
            businesses_map = {}
            if business_ids:
                logger.info(f"📊 Found {len(business_ids)} unique businesses")
                
                yield {
                    'type': 'progress',
                    'message': f'🏢 Syncing {len(business_ids)} businesses...',
                    'percentage': 80
                }
                
                business_start = time.time()
                api_key = settings.YELP_FUSION_API_KEY
                
                if not api_key:
                    logger.warning("⚠️  YELP_FUSION_API_KEY not set, skipping business names")
                else:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    
                    try:
                        from .async_business_service import AsyncBusinessService
                        pool = loop.run_until_complete(AsyncBusinessService.get_db_pool())
                        
                        # 1. Завантажуємо businesses (API + save to DB)
                        businesses_map = loop.run_until_complete(
                            AsyncBusinessService.sync_businesses(
                                business_ids,
                                api_key,
                                username,
                                max_concurrent=5  # Rate limit (знижено з 20 до 5 щоб уникнути 429)
                            )
                        )
                        
                        # 2. ⚡ ВАЖЛИВО: Лінкуємо програми ДО businesses (тепер програми вже є в БД!)
                        linked_count = loop.run_until_complete(
                            AsyncBusinessService.link_programs_to_businesses(pool, username)
                        )
                        logger.info(f"🔗 [ASYNCPG] Linked {linked_count} programs to businesses")
                        
                        loop.run_until_complete(pool.close())
                    except Exception as e:
                        logger.error(f"❌ Failed to sync businesses: {e}", exc_info=True)
                        businesses_map = {}
                    finally:
                        loop.close()
                
                business_time = time.time() - business_start
                logger.info(f"⏱️  [TIMING] 🏢 Business sync: {business_time:.3f}s ({len(businesses_map)} businesses)")
                
                yield {
                    'type': 'info',
                    'message': f'✅ Synced {len(businesses_map)}/{len(business_ids)} businesses in {business_time:.2f}s'
                }
            
            # Backfill business names - ВІДКЛЮЧЕНО (business names тепер через AsyncBusinessService)
            # backfill_time = 0
            # try:
            #     backfill_start = time.time()
            #     from .sync_service import ProgramSyncService
            #     backfill_result = ProgramSyncService.backfill_missing_business_names(
            #         username, max_fetch=50
            #     )
            #     backfill_time = time.time() - backfill_start
            #     
            #     if backfill_result.get('fetched', 0) > 0:
            #         logger.info(f"⏱️  [TIMING] 📡 Backfill business names: {backfill_time:.3f}s for {backfill_result['fetched']} names")
            #         yield {
            #             'type': 'info',
            #             'message': f"📡 Fetched {backfill_result['fetched']} business names"
            #         }
            # except Exception as e:
            #     logger.warning(f"⚠️  [ASYNC] Backfill failed: {e}")
            
            backfill_time = 0
            logger.debug(f"⏭️  [SKIP] Backfill skipped (business names handled by AsyncBusinessService)")
            
            # Фінальний результат
            total_db_after = ProgramRegistry.objects.filter(username=username).count()
            
            # Загальний час синхронізації
            total_sync_time = time.time() - sync_start_time
            message = f'✅ ASYNC sync complete: +{added} added, ~{updated} updated, -{deleted} deleted'
            
            logger.info(f"📊 [ASYNC] {message}")
            logger.info(f"⏱️  [TIMING] ⭐ TOTAL SYNC TIME: {total_sync_time:.3f}s")
            logger.info(f"⏱️  [TIMING] 📊 Breakdown:")
            logger.info(f"⏱️  [TIMING]   - Yelp API fetch: {api_elapsed:.3f}s ({api_elapsed/total_sync_time*100:.1f}%)")
            if added > 0:
                logger.info(f"⏱️  [TIMING]   - DB save: {save_time:.3f}s ({save_time/total_sync_time*100:.1f}%)")
            if updated > 0:
                logger.info(f"⏱️  [TIMING]   - DB update: {update_time:.3f}s ({update_time/total_sync_time*100:.1f}%)")
            if business_time > 0:
                logger.info(f"⏱️  [TIMING]   - Business sync: {business_time:.3f}s ({business_time/total_sync_time*100:.1f}%)")
            if backfill_time > 0:
                logger.info(f"⏱️  [TIMING]   - Business names (backfill): {backfill_time:.3f}s ({backfill_time/total_sync_time*100:.1f}%)")
            
            yield {
                'type': 'complete',
                'status': 'synced',
                'added': added,
                'updated': updated,
                'deleted': deleted,
                'total_synced': total_db_after,
                'message': message,
                'timing': {
                    'total': round(total_sync_time, 3),
                    'api': round(api_elapsed, 3),
                    'save': round(save_time, 3) if added > 0 else 0,
                    'update': round(update_time, 3) if updated > 0 else 0,
                    'backfill': round(backfill_time, 3) if backfill_time > 0 else 0
                }
            }
            
        except Exception as e:
            logger.error(f"❌ [ASYNC] Sync failed: {e}", exc_info=True)
            yield {
                'type': 'error',
                'message': f'Async sync failed: {str(e)}'
            }

