"""
Redis service for caching and batch processing of programs.

This module implements external sorting with Redis for handling large datasets.
It fetches all programs through pagination, caches them in Redis, and groups by business_id.
"""
import redis
import json
import hashlib
import logging
from typing import List, Dict, Any, Optional
from django.conf import settings

logger = logging.getLogger(__name__)


class RedisService:
    """Service for Redis operations with program data."""
    
    def __init__(self):
        """Initialize Redis connection."""
        redis_host = getattr(settings, 'REDIS_HOST', 'localhost')
        redis_port = getattr(settings, 'REDIS_PORT', 6379)
        redis_db = getattr(settings, 'REDIS_DB', 0)
        
        try:
            self.client = redis.Redis(
                host=redis_host,
                port=redis_port,
                db=redis_db,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            # Test connection
            self.client.ping()
            logger.info(f"✅ Redis connected: {redis_host}:{redis_port}/{redis_db}")
        except redis.ConnectionError as e:
            logger.warning(f"⚠️ Redis not available: {e}. Falling back to non-cached mode.")
            self.client = None
    
    def is_available(self) -> bool:
        """Check if Redis is available."""
        return self.client is not None
    
    def cache_programs_chunk(self, chunk_key: str, programs: List[Dict], ttl: int = 300):
        """
        Cache a chunk of programs in Redis.
        
        Args:
            chunk_key: Unique key for this chunk (e.g., 'programs:all:0-999')
            programs: List of program dictionaries
            ttl: Time to live in seconds (default 5 minutes)
        """
        if not self.is_available():
            return
        
        try:
            self.client.setex(
                chunk_key,
                ttl,
                json.dumps(programs)
            )
            logger.debug(f"📦 Cached {len(programs)} programs to {chunk_key}")
        except Exception as e:
            logger.error(f"Failed to cache chunk {chunk_key}: {e}")
    
    def get_programs_chunk(self, chunk_key: str) -> Optional[List[Dict]]:
        """
        Retrieve a cached chunk of programs.
        
        Args:
            chunk_key: Key of the cached chunk
            
        Returns:
            List of programs or None if not found
        """
        if not self.is_available():
            return None
        
        try:
            data = self.client.get(chunk_key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Failed to get chunk {chunk_key}: {e}")
            return None
    
    def cache_grouped_result(self, cache_key: str, grouped_data: Dict[str, Any], ttl: int = 300):
        """
        Cache the final grouped result.
        
        Args:
            cache_key: Unique key for this result
            grouped_data: Grouped programs data
            ttl: Time to live in seconds (default 5 minutes)
        """
        if not self.is_available():
            return
        
        try:
            self.client.setex(
                cache_key,
                ttl,
                json.dumps(grouped_data)
            )
            logger.info(f"💾 Cached grouped result to {cache_key} (TTL: {ttl}s)")
        except Exception as e:
            logger.error(f"Failed to cache grouped result: {e}")
    
    def get_grouped_result(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached grouped result.
        
        Args:
            cache_key: Key of the cached result
            
        Returns:
            Grouped data or None if not found
        """
        if not self.is_available():
            return None
        
        try:
            data = self.client.get(cache_key)
            if data:
                logger.info(f"✅ Retrieved cached grouped result from {cache_key}")
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Failed to get grouped result: {e}")
            return None
    
    def delete_pattern(self, pattern: str):
        """
        Delete all keys matching a pattern.
        
        Args:
            pattern: Pattern to match (e.g., 'programs:all:*')
        """
        if not self.is_available():
            return
        
        try:
            keys = self.client.keys(pattern)
            if keys:
                self.client.delete(*keys)
                logger.debug(f"🗑️ Deleted {len(keys)} keys matching {pattern}")
        except Exception as e:
            logger.error(f"Failed to delete pattern {pattern}: {e}")
    
    @staticmethod
    def generate_cache_key(username: str, program_status: str = 'ALL') -> str:
        """
        Generate a unique cache key based on username and filters.
        
        Args:
            username: Partner username
            program_status: Status filter
            
        Returns:
            Unique cache key
        """
        hash_input = f"{username}:{program_status}"
        hash_value = hashlib.md5(hash_input.encode()).hexdigest()[:12]
        return f"grouped_programs:{hash_value}"
    
    def clear_user_cache(self, username: str):
        """
        Clear all cached data for a specific user.
        
        Args:
            username: Partner username
        """
        if not self.is_available():
            return
        
        try:
            # Clear all grouped results for this user
            pattern = f"grouped_programs:*{username}*"
            self.delete_pattern(pattern)
            logger.info(f"🧹 Cleared cache for user {username}")
        except Exception as e:
            logger.error(f"Failed to clear cache for user {username}: {e}")


class ProgramGroupingService:
    """Service for grouping programs by business_id with external sorting."""
    
    def __init__(self, redis_service: RedisService):
        """
        Initialize grouping service.
        
        Args:
            redis_service: RedisService instance
        """
        self.redis = redis_service
    
    def fetch_all_programs_batch(self, fetch_function, batch_size: int = 40, username: str = None) -> List[Dict]:
        """
        Fetch all programs using pagination and caching.
        
        Args:
            fetch_function: Function to fetch programs (takes offset, limit, username)
            batch_size: Number of programs per batch
            username: Username for authentication
            
        Returns:
            List of all programs
        """
        all_programs = []
        offset = 0
        max_iterations = 1000  # Safety limit
        
        logger.info(f"🔄 Starting batch fetch with batch_size={batch_size}")
        
        for iteration in range(max_iterations):
            try:
                logger.info(f"📥 Fetching batch {iteration + 1} (offset={offset}, limit={batch_size})")
                
                # Fetch batch
                result = fetch_function(offset=offset, limit=batch_size, program_status='ALL', username=username)
                programs = result.get('programs', [])
                total_count = result.get('total_count', 0)
                
                if not programs:
                    logger.info(f"✅ No more programs. Total fetched: {len(all_programs)}")
                    break
                
                all_programs.extend(programs)
                logger.info(f"📊 Batch {iteration + 1}: {len(programs)} programs (total: {len(all_programs)}/{total_count})")
                
                # Check if we've fetched everything
                if len(all_programs) >= total_count:
                    logger.info(f"✅ Fetched all {len(all_programs)} programs")
                    break
                
                offset += batch_size
                
            except Exception as e:
                logger.error(f"❌ Error fetching batch at offset {offset}: {e}")
                break
        
        logger.info(f"🎉 Batch fetch complete: {len(all_programs)} total programs")
        return all_programs
    
    def group_programs_by_business(self, programs: List[Dict]) -> List[Dict[str, Any]]:
        """
        Group programs by business_id and calculate statistics.
        
        Args:
            programs: List of program dictionaries
            
        Returns:
            List of grouped business data with statistics
        """
        logger.info(f"📊 Grouping {len(programs)} programs by business_id")
        
        # Group by business_id
        business_groups = {}
        
        for program in programs:
            business_id = program.get('yelp_business_id') or 'Unknown'
            
            if business_id not in business_groups:
                business_groups[business_id] = {
                    'business_id': business_id,
                    'programs': [],
                    'stats': {
                        'total_count': 0,
                        'active_count': 0,
                        'paused_count': 0,
                        'terminated_count': 0,
                        'total_budget': 0,
                        'total_spend': 0,
                        'total_impressions': 0,
                        'total_clicks': 0,
                    }
                }
            
            # Add program to group
            business_groups[business_id]['programs'].append(program)
            
            # Update stats
            stats = business_groups[business_id]['stats']
            stats['total_count'] += 1
            
            # Count by status
            status = program.get('program_status', '').upper()
            if status == 'ACTIVE':
                stats['active_count'] += 1
            
            pause_status = program.get('program_pause_status', '').upper()
            if pause_status == 'PAUSED':
                stats['paused_count'] += 1
            
            if status == 'TERMINATED':
                stats['terminated_count'] += 1
            
            # Aggregate metrics
            metrics = program.get('program_metrics', {})
            if metrics:
                stats['total_budget'] += metrics.get('budget', 0)
                stats['total_spend'] += metrics.get('ad_cost', 0)
                stats['total_impressions'] += metrics.get('billed_impressions', 0)
                stats['total_clicks'] += metrics.get('billed_clicks', 0)
        
        # Convert to sorted list
        result = sorted(
            business_groups.values(),
            key=lambda x: (x['stats']['total_count'], x['business_id']),
            reverse=True
        )
        
        logger.info(f"✅ Grouped into {len(result)} businesses")
        return result
    
    def get_all_grouped_programs(
        self,
        fetch_function,
        username: str,
        program_status: str = 'ALL',
        use_cache: bool = True,
        cache_ttl: int = 300
    ) -> Dict[str, Any]:
        """
        Main method to get all programs grouped by business_id.
        
        Uses Redis caching to avoid repeated API calls.
        
        Args:
            fetch_function: Function to fetch programs from Yelp API
            username: Partner username
            program_status: Status filter
            use_cache: Whether to use Redis cache
            cache_ttl: Cache time-to-live in seconds
            
        Returns:
            Dictionary with grouped programs and metadata
        """
        # Generate cache key
        cache_key = self.redis.generate_cache_key(username, program_status)
        
        # Try to get from cache
        if use_cache and self.redis.is_available():
            cached = self.redis.get_grouped_result(cache_key)
            if cached:
                logger.info(f"💾 Returning cached result for {username}")
                cached['from_cache'] = True
                return cached
        
        # Fetch all programs
        logger.info(f"🔄 Fetching all programs for {username} (status={program_status})")
        all_programs = self.fetch_all_programs_batch(fetch_function, batch_size=40, username=username)
        
        # Group by business_id
        grouped = self.group_programs_by_business(all_programs)
        
        # Prepare result
        result = {
            'total_programs': len(all_programs),
            'total_businesses': len(grouped),
            'grouped_by_business': grouped,
            'from_cache': False,
            'cached_until': None,
        }
        
        # Cache result
        if use_cache and self.redis.is_available():
            self.redis.cache_grouped_result(cache_key, result, ttl=cache_ttl)
            import datetime
            result['cached_until'] = (datetime.datetime.now() + datetime.timedelta(seconds=cache_ttl)).isoformat()
        
        logger.info(f"✅ Returning fresh grouped result: {len(all_programs)} programs in {len(grouped)} businesses")
        return result

