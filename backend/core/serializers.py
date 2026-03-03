from rest_framework import serializers
from .models import Class, Column, Row, Cell, MonthConfig, Holiday, Attendance


class ClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = Class
        fields = ['id', 'name', 'class_label', 'school_name', 'class_incharge', 'created_at']

    def validate(self, data):
        if self.instance is not None:
            for key in ('school_name', 'class_label', 'class_incharge'):
                val = data.get(key) if key in data else getattr(self.instance, key, '')
                if not (val or '').strip():
                    raise serializers.ValidationError({key: 'This field is required.'})
        return data


class ColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = Column
        fields = ['id', 'class_ref', 'heading', 'order']


class RowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Row
        fields = ['id', 'class_ref', 'row_order']


class CellSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cell
        fields = ['id', 'row', 'column', 'value']


class MonthConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthConfig
        fields = ['id', 'class_ref', 'month', 'year', 'num_days']


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ['id', 'class_ref', 'month', 'year', 'day', 'reason']


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ['id', 'row', 'month', 'year', 'day', 'status']


class CellBulkSerializer(serializers.Serializer):
    row_id = serializers.IntegerField()
    column_id = serializers.IntegerField()
    value = serializers.CharField(allow_blank=True)


class AttendanceBulkSerializer(serializers.Serializer):
    row_id = serializers.IntegerField()
    absent_days = serializers.ListField(child=serializers.IntegerField(min_value=1, max_value=31))
    month = serializers.IntegerField(min_value=1, max_value=12)
    year = serializers.IntegerField()
