#!/usr/bin/env python
"""
Тестовий скрипт для перевірки синхронізації business names.

Використання:
    python backend/test_business_names.py
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yelp_dashboard.settings')
django.setup()

from ads.models import ProgramRegistry
from ads.sync_service import ProgramSyncService
from django.contrib.auth import get_user_model

User = get_user_model()


def test_business_names_in_db():
    """Перевіряє кількість бізнесів з назвами в БД"""
    print("\n" + "="*60)
    print("📊 Тест 1: Перевірка business names в БД")
    print("="*60)
    
    # Всього бізнесів
    total_businesses = (
        ProgramRegistry.objects
        .values('yelp_business_id')
        .distinct()
        .count()
    )
    
    # Бізнеси з назвами
    businesses_with_names = (
        ProgramRegistry.objects
        .filter(business_name__isnull=False)
        .exclude(business_name='')
        .values('yelp_business_id')
        .distinct()
        .count()
    )
    
    # Бізнеси без назв
    businesses_without_names = total_businesses - businesses_with_names
    
    print(f"\n✅ Всього бізнесів: {total_businesses}")
    print(f"✅ З назвами: {businesses_with_names}")
    print(f"⚠️  Без назв: {businesses_without_names}")
    
    if businesses_without_names > 0:
        print(f"\n💡 Рекомендація: Запустити backfill для {businesses_without_names} бізнесів")
        return False
    
    return True


def test_backfill(username=None):
    """Тестує backfill для користувача"""
    print("\n" + "="*60)
    print("📡 Тест 2: Backfill відсутніх business names")
    print("="*60)
    
    if not username:
        # Берем першого користувача з програмами
        first_program = ProgramRegistry.objects.first()
        if not first_program:
            print("❌ Немає програм в БД")
            return False
        username = first_program.username
    
    print(f"\n🔍 Тестуємо для користувача: {username}")
    
    # Запускаємо backfill (тільки 5 для тесту)
    result = ProgramSyncService.backfill_missing_business_names(username, max_fetch=5)
    
    print(f"\n📊 Результат backfill:")
    print(f"   • Завантажено: {result.get('fetched', 0)}")
    print(f"   • Помилок: {result.get('failed', 0)}")
    print(f"   • Всього без назв: {result.get('total', 0)}")
    print(f"   • Статус: {result.get('status', 'unknown')}")
    
    return result.get('status') in ['completed', 'up_to_date']


def test_business_ids_view():
    """Перевіряє що BusinessIdsView повертає назви"""
    print("\n" + "="*60)
    print("🔍 Тест 3: BusinessIdsView response")
    print("="*60)
    
    # Берем першого користувача
    first_program = ProgramRegistry.objects.first()
    if not first_program:
        print("❌ Немає програм в БД")
        return False
    
    username = first_program.username
    
    # Отримуємо business IDs
    businesses = ProgramSyncService.get_business_ids_for_user(username)
    
    if not businesses:
        print("❌ Немає бізнесів для користувача")
        return False
    
    print(f"\n✅ Знайдено {len(businesses)} бізнесів")
    print("\n📋 Перші 5 бізнесів:")
    
    for i, biz in enumerate(businesses[:5], 1):
        business_id = biz['business_id']
        business_name = biz.get('business_name', 'N/A')
        program_count = biz.get('program_count', 0)
        
        # Перевіряємо чи є назва
        has_name = business_name and business_name != business_id
        status = "✅" if has_name else "⚠️"
        
        print(f"{status} {i}. {business_name[:40]}... • {business_id[:16]}... • {program_count} programs")
    
    # Рахуємо скільки з назвами
    with_names = sum(1 for b in businesses if b.get('business_name') and b['business_name'] != b['business_id'])
    percentage = (with_names / len(businesses)) * 100 if businesses else 0
    
    print(f"\n📊 Статистика:")
    print(f"   • З назвами: {with_names}/{len(businesses)} ({percentage:.1f}%)")
    
    return percentage > 80  # Очікуємо що хоча б 80% мають назви


def test_sample_business_name():
    """Перевіряє конкретний приклад business name"""
    print("\n" + "="*60)
    print("🔍 Тест 4: Перевірка конкретного бізнесу")
    print("="*60)
    
    # Знаходимо бізнес з назвою
    program_with_name = (
        ProgramRegistry.objects
        .filter(business_name__isnull=False)
        .exclude(business_name='')
        .first()
    )
    
    if not program_with_name:
        print("⚠️  Немає програм з business_name в БД")
        return False
    
    print(f"\n✅ Знайдено програму:")
    print(f"   • Program ID: {program_with_name.program_id}")
    print(f"   • Business ID: {program_with_name.yelp_business_id}")
    print(f"   • Business Name: {program_with_name.business_name}")
    print(f"   • Program Type: {program_with_name.program_name}")
    print(f"   • Status: {program_with_name.status}")
    
    return True


def main():
    """Запускає всі тести"""
    print("\n" + "="*60)
    print("🚀 ТЕСТУВАННЯ BUSINESS NAMES IMPLEMENTATION")
    print("="*60)
    
    results = []
    
    # Тест 1: Перевірка БД
    results.append(("Перевірка БД", test_business_names_in_db()))
    
    # Тест 2: Backfill (тільки якщо є користувачі)
    if ProgramRegistry.objects.exists():
        results.append(("Backfill", test_backfill()))
    
    # Тест 3: BusinessIdsView
    results.append(("BusinessIdsView", test_business_ids_view()))
    
    # Тест 4: Конкретний приклад
    results.append(("Приклад бізнесу", test_sample_business_name()))
    
    # Підсумок
    print("\n" + "="*60)
    print("📊 ПІДСУМОК ТЕСТІВ")
    print("="*60)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("\n🎉 Всі тести пройдені успішно!")
    else:
        print("\n⚠️  Деякі тести не пройшли. Перевірте логи вище.")
    
    print("="*60 + "\n")
    
    return 0 if all_passed else 1


if __name__ == '__main__':
    sys.exit(main())

