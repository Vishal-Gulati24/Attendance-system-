from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Class, Column, Row, Cell, MonthConfig, Holiday, Attendance
from .serializers import (
    ClassSerializer, ColumnSerializer, RowSerializer, CellSerializer,
    MonthConfigSerializer, HolidaySerializer, AttendanceSerializer,
    AttendanceBulkSerializer,
)
from .export import export_excel


def get_user_classes(request):
    """Classes belonging to the current user (excludes null user)."""
    return Class.objects.filter(user=request.user).order_by('-created_at')


def get_class_or_404(request, class_id):
    """Get Class by id if it belongs to request.user."""
    return Class.objects.filter(user=request.user).get(pk=class_id)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_health(request):
    return Response({'status': 'ok', 'message': 'Attendance API'})


@api_view(['GET', 'POST'])
def class_list(request):
    if request.method == 'GET':
        objs = get_user_classes(request)
        serializer = ClassSerializer(objs, many=True)
        return Response(serializer.data)
    serializer = ClassSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def class_detail(request, pk):
    try:
        obj = get_class_or_404(request, pk)
    except Class.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        serializer = ClassSerializer(obj)
        return Response(serializer.data)
    if request.method in ('PUT', 'PATCH'):
        serializer = ClassSerializer(obj, data=request.data, partial=(request.method == 'PATCH'))
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def column_list(request, class_id):
    try:
        class_ref = get_class_or_404(request, class_id)
    except Class.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        objs = Column.objects.filter(class_ref=class_ref).order_by('order', 'id')
        serializer = ColumnSerializer(objs, many=True)
        return Response(serializer.data)
    data = {**request.data, 'class_ref': class_id}
    serializer = ColumnSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def column_detail(request, class_id, pk):
    try:
        get_class_or_404(request, class_id)
        obj = Column.objects.get(pk=pk, class_ref_id=class_id)
    except (Class.DoesNotExist, Column.DoesNotExist):
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        serializer = ColumnSerializer(obj)
        return Response(serializer.data)
    if request.method in ('PUT', 'PATCH'):
        data = {**request.data, 'class_ref': class_id}
        serializer = ColumnSerializer(obj, data=data, partial=(request.method == 'PATCH'))
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def row_list(request, class_id):
    try:
        class_ref = get_class_or_404(request, class_id)
    except Class.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        objs = Row.objects.filter(class_ref=class_ref).order_by('row_order', 'id')
        serializer = RowSerializer(objs, many=True)
        return Response(serializer.data)
    data = {**request.data, 'class_ref': class_id}
    serializer = RowSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def row_detail(request, class_id, pk):
    try:
        get_class_or_404(request, class_id)
        obj = Row.objects.get(pk=pk, class_ref_id=class_id)
    except (Class.DoesNotExist, Row.DoesNotExist):
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        serializer = RowSerializer(obj)
        return Response(serializer.data)
    if request.method in ('PUT', 'PATCH'):
        data = {**request.data, 'class_ref': class_id}
        serializer = RowSerializer(obj, data=data, partial=(request.method == 'PATCH'))
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def cell_list(request, class_id):
    try:
        get_class_or_404(request, class_id)
    except Class.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    cells = Cell.objects.filter(row__class_ref_id=class_id).select_related('row', 'column')
    serializer = CellSerializer(cells, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PUT', 'PATCH'])
def cell_detail(request, class_id, row_id, column_id):
    try:
        get_class_or_404(request, class_id)
    except Class.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    try:
        cell = Cell.objects.get(row_id=row_id, column_id=column_id, row__class_ref_id=class_id)
    except Cell.DoesNotExist:
        if request.method in ('PUT', 'PATCH'):
            if not Row.objects.filter(pk=row_id, class_ref_id=class_id).exists():
                return Response({'error': 'Row not in this class'}, status=status.HTTP_400_BAD_REQUEST)
            if not Column.objects.filter(pk=column_id, class_ref_id=class_id).exists():
                return Response({'error': 'Column not in this class'}, status=status.HTTP_400_BAD_REQUEST)
            cell, created = Cell.objects.update_or_create(
                row_id=row_id,
                column_id=column_id,
                defaults={'value': request.data.get('value', '')},
            )
            return Response(CellSerializer(cell).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(CellSerializer(cell).data)
    serializer = CellSerializer(cell, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def cell_bulk(request, class_id):
    try:
        get_class_or_404(request, class_id)
    except Class.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    cells_data = request.data.get('cells', [])
    if not isinstance(cells_data, list):
        return Response({'error': 'cells must be a list'}, status=status.HTTP_400_BAD_REQUEST)
    if len(cells_data) > 1000:
        return Response({'error': 'Too many cells in one request (max 1000)'}, status=status.HTTP_400_BAD_REQUEST)
    updated = []
    for item in cells_data:
        try:
            row_id = item.get('row_id')
            column_id = item.get('column_id')
            value = item.get('value', '')
            if row_id is None or column_id is None:
                continue
            row_id = int(row_id)
            column_id = int(column_id)
        except (TypeError, ValueError):
            continue
        if not Row.objects.filter(pk=row_id, class_ref_id=class_id).exists():
            continue
        if not Column.objects.filter(pk=column_id, class_ref_id=class_id).exists():
            continue
        try:
            cell, _ = Cell.objects.update_or_create(
                row_id=row_id, column_id=column_id,
                defaults={'value': str(value)[:500]}
            )
            updated.append(CellSerializer(cell).data)
        except Exception:
            return Response({'error': 'Failed to save cells'}, status=status.HTTP_400_BAD_REQUEST)
    return Response(updated, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
def month_config_list(request, class_id):
    try:
        class_ref = get_class_or_404(request, class_id)
    except Class.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        objs = MonthConfig.objects.filter(class_ref=class_ref)
        serializer = MonthConfigSerializer(objs, many=True)
        return Response(serializer.data)
    data = {**request.data, 'class_ref': class_id}
    serializer = MonthConfigSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def month_config_detail(request, class_id, pk):
    try:
        get_class_or_404(request, class_id)
        obj = MonthConfig.objects.get(pk=pk, class_ref_id=class_id)
    except (Class.DoesNotExist, MonthConfig.DoesNotExist):
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(MonthConfigSerializer(obj).data)
    if request.method in ('PUT', 'PATCH'):
        serializer = MonthConfigSerializer(obj, data=request.data, partial=(request.method == 'PATCH'))
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def holiday_list(request, class_id):
    try:
        class_ref = get_class_or_404(request, class_id)
    except Class.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    month = request.query_params.get('month')
    year = request.query_params.get('year')
    qs = Holiday.objects.filter(class_ref=class_ref)
    if month:
        qs = qs.filter(month=int(month))
    if year:
        qs = qs.filter(year=int(year))
    if request.method == 'GET':
        serializer = HolidaySerializer(qs.order_by('year', 'month', 'day'), many=True)
        return Response(serializer.data)
    data = {**request.data, 'class_ref': class_id}
    serializer = HolidaySerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
def holiday_detail(request, class_id, pk):
    try:
        get_class_or_404(request, class_id)
        obj = Holiday.objects.get(pk=pk, class_ref_id=class_id)
    except (Class.DoesNotExist, Holiday.DoesNotExist):
        return Response(status=status.HTTP_404_NOT_FOUND)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def attendance_list(request, class_id):
    month = request.query_params.get('month')
    year = request.query_params.get('year')
    if not month or not year:
        return Response({'error': 'month and year required'}, status=status.HTTP_400_BAD_REQUEST)
    qs = Attendance.objects.filter(row__class_ref_id=class_id, month=int(month), year=int(year))
    serializer = AttendanceSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def attendance_bulk(request, class_id):
    try:
        get_class_or_404(request, class_id)
    except Class.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    serializer = AttendanceBulkSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data
    row_id = data['row_id']
    month = data['month']
    year = data['year']
    absent_days = data['absent_days']
    Attendance.objects.filter(row_id=row_id, month=month, year=year).delete()
    created = []
    for day in absent_days:
        att = Attendance.objects.create(row_id=row_id, month=month, year=year, day=day, status='A')
        created.append(AttendanceSerializer(att).data)
    return Response(created, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def export(request, class_id):
    month = request.query_params.get('month', '1')
    year = request.query_params.get('year', '2025')
    try:
        month = int(month)
        year = int(year)
    except ValueError:
        return Response({'error': 'month and year must be integers'}, status=status.HTTP_400_BAD_REQUEST)
    buffer = export_excel(class_id, month, year)
    if buffer is None:
        return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)
    response = HttpResponse(buffer.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="attendance_{class_id}_{year}_{month}.xlsx"'
    return response
