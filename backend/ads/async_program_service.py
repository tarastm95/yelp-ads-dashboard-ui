"""
Асинхронний сервіс для bulk UPDATE програм через asyncpg.
Прискорює оновлення 1914 програм з 15s → ~1s.
"""
import asyncio
import asyncpg
import logging
from typing import Dict, List
from django.conf import settings
from datetime import datetime

logger = logging.getLogger(__name__)


class AsyncProgramService:
    """Асинхронний сервіс для швидкого UPDATE програм через asyncpg."""
    
    @classmethod
    async def get_db_pool(cls):
        """Створює asyncpg connection pool (спільний з AsyncBusinessService)."""
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
    async def bulk_update_programs(
        cls, 
        pool: asyncpg.Pool, 
        username: str,
        programs_data: List[Dict]
    ) -> int:
        """
        Швидкий bulk UPDATE програм через asyncpg.
        
        Args:
            pool: asyncpg connection pool
            username: Username для фільтрації
            programs_data: List of dicts з полями для оновлення
            
        Returns:
            Кількість оновлених програм
        """
        if not programs_data:
            return 0
        
        # SQL для bulk update через UNNEST (швидко!)
        query = """
            UPDATE ads_programregistry AS pr
            SET
                yelp_business_id = data.yelp_business_id,
                status = data.status,
                program_name = data.program_name,
                start_date = data.start_date,
                end_date = data.end_date,
                program_status = data.program_status,
                program_pause_status = data.program_pause_status,
                budget = data.budget,
                currency = data.currency,
                is_autobid = data.is_autobid,
                max_bid = data.max_bid,
                billed_impressions = data.billed_impressions,
                billed_clicks = data.billed_clicks,
                ad_cost = data.ad_cost,
                fee_period = data.fee_period,
                partner_business_id = data.partner_business_id,
                active_features = data.active_features::jsonb,
                available_features = data.available_features::jsonb,
                businesses = data.businesses::jsonb
            FROM (
                SELECT
                    unnest($1::varchar[]) AS program_id,
                    unnest($2::varchar[]) AS yelp_business_id,
                    unnest($3::varchar[]) AS status,
                    unnest($4::varchar[]) AS program_name,
                    unnest($5::date[]) AS start_date,
                    unnest($6::date[]) AS end_date,
                    unnest($7::varchar[]) AS program_status,
                    unnest($8::varchar[]) AS program_pause_status,
                    unnest($9::numeric[]) AS budget,
                    unnest($10::varchar[]) AS currency,
                    unnest($11::boolean[]) AS is_autobid,
                    unnest($12::numeric[]) AS max_bid,
                    unnest($13::integer[]) AS billed_impressions,
                    unnest($14::integer[]) AS billed_clicks,
                    unnest($15::numeric[]) AS ad_cost,
                    unnest($16::varchar[]) AS fee_period,
                    unnest($17::varchar[]) AS partner_business_id,
                    unnest($18::text[]) AS active_features,
                    unnest($19::text[]) AS available_features,
                    unnest($20::text[]) AS businesses
            ) AS data
            WHERE pr.username = $21
                AND pr.program_id = data.program_id
        """
        
        # Підготовка даних для UNNEST (масиви)
        program_ids = []
        yelp_business_ids = []
        statuses = []
        program_names = []
        start_dates = []
        end_dates = []
        program_statuses = []
        program_pause_statuses = []
        budgets = []
        currencies = []
        is_autobids = []
        max_bids = []
        billed_impressions_list = []
        billed_clicks_list = []
        ad_costs = []
        fee_periods = []
        partner_business_ids = []
        active_features_list = []
        available_features_list = []
        businesses_list = []
        
        import json
        
        for data in programs_data:
            program_ids.append(data['program_id'])
            yelp_business_ids.append(data.get('yelp_business_id') or '')
            statuses.append(data.get('status') or 'INACTIVE')
            program_names.append(data.get('program_name') or '')
            start_dates.append(data.get('start_date'))
            end_dates.append(data.get('end_date'))
            program_statuses.append(data.get('program_status') or '')
            program_pause_statuses.append(data.get('program_pause_status') or '')
            budgets.append(data.get('budget') or 0)
            currencies.append(data.get('currency') or 'USD')
            is_autobids.append(data.get('is_autobid') or False)
            max_bids.append(data.get('max_bid') or 0)
            billed_impressions_list.append(data.get('billed_impressions') or 0)
            billed_clicks_list.append(data.get('billed_clicks') or 0)
            ad_costs.append(data.get('ad_cost') or 0)
            fee_periods.append(data.get('fee_period') or '')
            partner_business_ids.append(data.get('partner_business_id') or '')
            active_features_list.append(json.dumps(data.get('active_features') or []))
            available_features_list.append(json.dumps(data.get('available_features') or []))
            businesses_list.append(json.dumps(data.get('businesses') or []))
        
        async with pool.acquire() as conn:
            result = await conn.execute(
                query,
                program_ids,
                yelp_business_ids,
                statuses,
                program_names,
                start_dates,
                end_dates,
                program_statuses,
                program_pause_statuses,
                budgets,
                currencies,
                is_autobids,
                max_bids,
                billed_impressions_list,
                billed_clicks_list,
                ad_costs,
                fee_periods,
                partner_business_ids,
                active_features_list,
                available_features_list,
                businesses_list,
                username
            )
        
        # Парсимо результат "UPDATE N"
        updated_count = int(result.split()[-1]) if result else 0
        logger.info(f"⚡ [ASYNCPG] Bulk updated {updated_count} programs in DB")
        
        return updated_count
    
    @classmethod
    async def bulk_create_programs(
        cls, 
        pool: asyncpg.Pool, 
        username: str,
        programs_data: List[Dict]
    ) -> int:
        """
        Швидкий bulk CREATE програм через asyncpg.
        
        Args:
            pool: asyncpg connection pool
            username: Username для всіх програм
            programs_data: List of dicts з даними для створення
            
        Returns:
            Кількість створених програм
        """
        if not programs_data:
            return 0
        
        query = """
            INSERT INTO ads_programregistry (
                username, program_id, yelp_business_id, status, program_name,
                start_date, end_date, program_status, program_pause_status,
                budget, currency, is_autobid, max_bid,
                billed_impressions, billed_clicks, ad_cost, fee_period,
                partner_business_id, active_features, available_features, businesses,
                created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20::jsonb, $21::jsonb, NOW(), NOW())
            ON CONFLICT (username, program_id) DO NOTHING
        """
        
        import json
        
        values = []
        for data in programs_data:
            values.append((
                username,
                data['program_id'],
                data.get('yelp_business_id') or '',
                data.get('status') or 'INACTIVE',
                data.get('program_name') or '',
                data.get('start_date'),
                data.get('end_date'),
                data.get('program_status') or '',
                data.get('program_pause_status') or '',
                data.get('budget') or 0,
                data.get('currency') or 'USD',
                data.get('is_autobid') or False,
                data.get('max_bid') or 0,
                data.get('billed_impressions') or 0,
                data.get('billed_clicks') or 0,
                data.get('ad_cost') or 0,
                data.get('fee_period') or '',
                data.get('partner_business_id') or '',
                json.dumps(data.get('active_features') or []),
                json.dumps(data.get('available_features') or []),
                json.dumps(data.get('businesses') or [])
            ))
        
        async with pool.acquire() as conn:
            await conn.executemany(query, values)
        
        logger.info(f"⚡ [ASYNCPG] Bulk created {len(programs_data)} programs")
        
        return len(programs_data)

