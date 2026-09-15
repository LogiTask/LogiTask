from django.test import TestCase, RequestFactory
from rest_framework.exceptions import ValidationError
from .models import Client, Property, Schedule, Job, Company, userProfile
from .serializers import ClientPropertySetUpSerializer
from django.contrib.auth.models import User
from django.utils.timezone import now
from datetime import timedelta
###
class ScheduleJobGenerationTest(TestCase):
    
    def setUp(self):
        """Set up test data before each test"""
        self.user = User.objects.create_user(username="testuser", password="testpass")
        self.company = Company.objects.create(companyName="Test company", user=self.user)
        userProfile.objects.create(user=self.user, company=self.company, timezone="UTC")
        self.client = Client.objects.create(
            firstName="John",
            lastName="Doe",
            phoneNumber="1234567890",
            email="john@example.com",
            author=self.user,
            company=self.company,
            )
        

        self.property = Property.objects.create(
            client=self.client,
            street="123 Main St",
            city="Austin",
            state="TX",
            zipCode="78701"
        )

        self.schedule_daily = Schedule.objects.create(
            property=self.property,
            frequency="daily",
            nextDate=now().date(),
            endDate=now().date() + timedelta(days=5),
            service="Lawn Mowing",
            cost=50.00
        )

        self.schedule_weekly = Schedule.objects.create(
            property=self.property,
            frequency="weekly",
            nextDate=now().date(),
            endDate=now().date() + timedelta(weeks=4),
            service="Tree Trimming",
            cost=100.00
        )

    def test_generate_jobs_creates_jobs(self):
        """Test if jobs are created for schedules with today's date"""
        Schedule.generate_jobs()
        
        jobs = Job.objects.all()
        self.assertEqual(jobs.count(), 2)  # Two jobs should be created
        self.assertEqual(jobs[0].cost, self.schedule_daily.cost)
        self.assertEqual(jobs[1].cost, self.schedule_weekly.cost)

    def test_nextDate_updates_correctly(self):
        """Test if nextDate updates based on frequency"""
        Schedule.generate_jobs()
        self.schedule_daily.refresh_from_db()
        self.schedule_weekly.refresh_from_db()

        self.assertEqual(self.schedule_daily.nextDate, now().date() + timedelta(days=1))
        self.assertEqual(self.schedule_weekly.nextDate, now().date() + timedelta(weeks=1))

    def test_jobs_not_created_if_nextDate_is_future(self):
        """Test that jobs are NOT created if nextDate is in the future"""
        self.schedule_daily.nextDate = now().date() + timedelta(days=1)
        self.schedule_daily.save()

        Schedule.generate_jobs()
        jobs = Job.objects.all()
        self.assertEqual(jobs.count(), 1)  # Only the weekly job should be created

    def test_jobs_not_created_past_endDate(self):
        """Test that jobs are not created if nextDate is past endDate"""
        self.schedule_daily.nextDate = self.schedule_daily.endDate + timedelta(days=1)
        self.schedule_daily.save()

        Schedule.generate_jobs()
        jobs = Job.objects.all()
        self.assertEqual(jobs.count(), 1)  # Only the weekly job should be created
