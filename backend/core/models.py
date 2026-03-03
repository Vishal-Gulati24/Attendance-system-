from django.conf import settings
from django.db import models


class Class(models.Model):
    """Class/section (e.g. 2nd). Holds heading config. Belongs to one user."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='classes',
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=100)
    class_label = models.CharField(max_length=50, blank=True)
    school_name = models.CharField(max_length=200, blank=True)
    class_incharge = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.class_label or self.name


class Column(models.Model):
    """User-defined column (heading only)."""
    class_ref = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='columns')
    heading = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.heading


class Row(models.Model):
    """One row = one student row in the sheet."""
    class_ref = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='rows')
    row_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['row_order', 'id']

    def __str__(self):
        return f"Row {self.row_order}"


class Cell(models.Model):
    """One cell: value for one row and one column."""
    row = models.ForeignKey(Row, on_delete=models.CASCADE, related_name='cells')
    column = models.ForeignKey(Column, on_delete=models.CASCADE, related_name='cells')
    value = models.CharField(max_length=500, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['row', 'column'], name='unique_row_column')
        ]

    def __str__(self):
        return f"Row {self.row_id} Col {self.column_id}: {self.value[:20]}"


class MonthConfig(models.Model):
    """Per-class, per-month: number of days."""
    class_ref = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='month_configs')
    month = models.PositiveIntegerField()
    year = models.PositiveIntegerField()
    num_days = models.PositiveIntegerField(default=31)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['class_ref', 'month', 'year'], name='unique_class_month_year')
        ]

    def __str__(self):
        return f"{self.year}-{self.month} ({self.num_days} days)"


class Holiday(models.Model):
    """A date marked as holiday with reason."""
    class_ref = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='holidays')
    month = models.PositiveIntegerField()
    year = models.PositiveIntegerField()
    day = models.PositiveIntegerField()
    reason = models.CharField(max_length=100)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['class_ref', 'year', 'month', 'day'], name='unique_holiday_date')
        ]

    def __str__(self):
        return f"{self.year}-{self.month}-{self.day} ({self.reason})"


class Attendance(models.Model):
    """Absent only: (row, date) = A. Present is derived."""
    row = models.ForeignKey(Row, on_delete=models.CASCADE, related_name='attendances')
    month = models.PositiveIntegerField()
    year = models.PositiveIntegerField()
    day = models.PositiveIntegerField()
    status = models.CharField(max_length=1, default='A')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['row', 'year', 'month', 'day'], name='unique_attendance')
        ]

    def __str__(self):
        return f"Row {self.row_id} {self.year}-{self.month}-{self.day} A"
