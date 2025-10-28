#!/usr/bin/env python3
"""
Test script to verify HTTP/2 implementation works correctly
"""
import asyncio
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, '/var/www/yelp-ads-dashboard-ui/backend')

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from ads.async_sync_service import AsyncProgramSyncService

async def test_http2():
    """Test the HTTP/2 method directly"""
    try:
        print("🚀 Testing HTTP/2 method directly...")
        
        # Test credentials (you'll need to replace with actual credentials)
        username = "demarketing_ads_testing"
        password = "test_password"  # This should be the actual password
        
        # Test the HTTP/2 method
        programs, total = await AsyncProgramSyncService.fetch_all_programs_http2(
            username, password, batch_size=40
        )
        
        print(f"✅ HTTP/2 test successful!")
        print(f"   Programs fetched: {len(programs)}")
        print(f"   Total: {total}")
        
    except Exception as e:
        print(f"❌ HTTP/2 test failed: {e}")
        print(f"   Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_http2())
