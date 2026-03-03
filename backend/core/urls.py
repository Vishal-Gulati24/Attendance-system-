from django.urls import path
from . import views
from . import auth_views

urlpatterns = [
    path('', views.api_health),
    path('auth/signup/', auth_views.signup),
    path('auth/login/', auth_views.login),
    path('auth/reset-password/', auth_views.reset_password),
    path('classes/', views.class_list),
    path('classes/<int:pk>/', views.class_detail),
    path('classes/<int:class_id>/columns/', views.column_list),
    path('classes/<int:class_id>/columns/<int:pk>/', views.column_detail),
    path('classes/<int:class_id>/rows/', views.row_list),
    path('classes/<int:class_id>/rows/<int:pk>/', views.row_detail),
    path('classes/<int:class_id>/cells/', views.cell_list),
    path('classes/<int:class_id>/cells/bulk/', views.cell_bulk),
    path('classes/<int:class_id>/cells/<int:row_id>/<int:column_id>/', views.cell_detail),
    path('classes/<int:class_id>/month-configs/', views.month_config_list),
    path('classes/<int:class_id>/month-configs/<int:pk>/', views.month_config_detail),
    path('classes/<int:class_id>/holidays/', views.holiday_list),
    path('classes/<int:class_id>/holidays/<int:pk>/', views.holiday_detail),
    path('classes/<int:class_id>/attendance/', views.attendance_list),
    path('classes/<int:class_id>/attendance/bulk/', views.attendance_bulk),
    path('classes/<int:class_id>/export/', views.export),
]
