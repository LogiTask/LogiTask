"""Integration checks for the libraries updated during security remediation."""
from io import BytesIO
from tempfile import TemporaryDirectory

import pandas as pd
from PIL import Image
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import Company, userProfile


class DependencyCompatibilityTests(TestCase):
    def test_jwt_login_refresh_and_authenticated_api(self):
        user = User.objects.create_user(username="upgrade-test", password="test-password")
        userProfile.objects.create(user=user, timezone="UTC")
        client = APIClient()
        login = client.post('/api/token/', {
            'username': 'upgrade-test', 'password': 'test-password',
        }, format='json')
        self.assertEqual(login.status_code, 200, login.data)
        refreshed = client.post('/api/token/refresh/', {
            'refresh': login.data['refresh'],
        }, format='json')
        self.assertEqual(refreshed.status_code, 200, refreshed.data)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {refreshed.data['access']}")
        profile = client.get('/api/get-user-profile/')
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.data['timezone'], 'UTC')
        client.credentials(HTTP_AUTHORIZATION='Bearer invalid-token')
        self.assertEqual(client.get('/api/get-user-profile/').status_code, 401)

    def test_company_logo_is_saved_as_thumbnail(self):
        user = User.objects.create_user(username="logo-test")
        source = BytesIO()
        Image.new('RGB', (800, 600), color='green').save(source, format='PNG')
        logo = SimpleUploadedFile('logo.png', source.getvalue(), content_type='image/png')
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            company = Company.objects.create(companyName='Logo test', user=user, logo=logo)
            with company.logo.open('rb') as saved, Image.open(saved) as image:
                self.assertEqual(image.size, (400, 300))
                self.assertEqual(image.format, 'PNG')

    def test_excel_import_creates_client_property_and_schedule(self):
        user = User.objects.create_user(username='import-test')
        company = Company.objects.create(companyName='Import test', user=user)
        userProfile.objects.create(user=user, company=company, timezone='UTC')
        workbook = BytesIO()
        pd.DataFrame([{
            'firstName': 'Test', 'lastName': 'Client', 'email': 'test@example.com',
            'phoneNumber': '5551234567', 'street': '123 Test St', 'city': 'Austin',
            'state': 'TX', 'zipCode': '78701', 'frequency': 'weekly',
            'nextDate': pd.Timestamp('2099-01-01'), 'service': 'Lawn mowing',
            'cost': 50, 'monthly_pricing': False,
        }]).to_excel(workbook, index=False)
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post('/api/multiple-clientsSetup', {
            'file': SimpleUploadedFile('clients.xlsx', workbook.getvalue()),
        }, format='multipart')
        self.assertEqual(response.status_code, 201, response.content)
        imported = company.client_set.get(firstName='Test')
        self.assertEqual(imported.properties.get().schedules.get().cost, 50)
