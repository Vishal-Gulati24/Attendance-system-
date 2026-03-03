from django.contrib import admin
from .models import Class, Column, Row, Cell, MonthConfig, Holiday, Attendance


@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ('name', 'class_label', 'school_name', 'class_incharge')


@admin.register(Column)
class ColumnAdmin(admin.ModelAdmin):
    list_display = ('heading', 'class_ref', 'order')


@admin.register(Row)
class RowAdmin(admin.ModelAdmin):
    list_display = ('id', 'class_ref', 'row_order')


@admin.register(Cell)
class CellAdmin(admin.ModelAdmin):
    list_display = ('row', 'column', 'value')


@admin.register(MonthConfig)
class MonthConfigAdmin(admin.ModelAdmin):
    list_display = ('class_ref', 'year', 'month', 'num_days')


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ('class_ref', 'year', 'month', 'day', 'reason')


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('row', 'year', 'month', 'day', 'status')
