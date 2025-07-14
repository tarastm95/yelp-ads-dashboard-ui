from rest_framework import serializers
from .models import Program, Report

class ProgramSerializer(serializers.ModelSerializer):
    program_id = serializers.SerializerMethodField()
    job_id = serializers.CharField()
    product_type = serializers.CharField(source='name')
    budget_amount = serializers.DecimalField(source='budget', max_digits=12, decimal_places=2)
    created_date = serializers.DateTimeField(source='created_at')
    modified_date = serializers.DateTimeField(source='updated_at')
    business_id = serializers.SerializerMethodField()
    start_date = serializers.DateField()
    end_date = serializers.DateField(allow_null=True)

    def get_program_id(self, obj):
        return obj.partner_program_id or obj.job_id

    def get_business_id(self, obj):
        return ''

    class Meta:
        model = Program
        fields = [
            'program_id',
            'job_id',
            'business_id',
            'product_type',
            'status',
            'created_date',
            'modified_date',
            'budget_amount',
            'start_date',
            'end_date',
        ]

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'
