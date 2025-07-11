from rest_framework import serializers
from .models import Program, Report

class ProgramSerializer(serializers.ModelSerializer):
    program_id = serializers.CharField(source='job_id')
    product_type = serializers.CharField(source='name')
    budget_amount = serializers.DecimalField(source='budget', max_digits=12, decimal_places=2)
    created_date = serializers.DateTimeField(source='created_at')
    modified_date = serializers.DateTimeField(source='updated_at')
    business_id = serializers.SerializerMethodField()

    def get_business_id(self, obj):
        return ''

    class Meta:
        model = Program
        fields = [
            'program_id',
            'business_id',
            'product_type',
            'status',
            'created_date',
            'modified_date',
            'budget_amount',
        ]

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'
