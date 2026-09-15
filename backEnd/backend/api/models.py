from django.db import models, transaction
from django.db.models import Sum
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
import pytz
from decimal import Decimal


# Create your models here.

    
class Company(models.Model):
    companyName = models.CharField(max_length=100)
    logo = models.ImageField(upload_to='company_logos/', null=True, blank=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    
    def save(self, *args, **kwargs):
        if self.logo:
            try:
                img = Image.open(self.logo)
                img.thumbnail((400, 400))
                buffer = BytesIO()
                img.save(buffer, format='PNG', quality=80, optimize=True)
                buffer.seek(0)
                self.logo.save(self.logo.name, ContentFile(buffer.getvalue()), save=False)
            except Exception as e:
                print("error processing image", e)
        super().save(*args, **kwargs)


class userProfile(models.Model):
    ROLE_CHOICES = [
        ('BOSS', 'Boss'),
        ('WORKER', 'Worker'),
        ('VIEWER','VIEWER')
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    timezone = models.CharField(max_length=100, default='UTC')
    company = models.ForeignKey(Company, on_delete=models.CASCADE,null=True,blank=True)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='BOSS')
class Client(models.Model):
    firstName = models.CharField(max_length=100)
    lastName = models.CharField(max_length=100, null=True, blank=True)
    phoneNumber = models.CharField(max_length=15)
    email = models.EmailField(max_length=254, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    author  = models.ForeignKey(User, on_delete=models.CASCADE, related_name="clients")
    company = models.ForeignKey(Company,on_delete=models.CASCADE)

    def __str__(self):
        return self.firstName
    
    
    

class Property(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="properties")
    street = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2, default="TX")
    zipCode = models.CharField(max_length=5)   

    def __str__(self):
        return self.street

class Note(models.Model):
    title = models.CharField(max_length=100)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notes")
    

    def __str__(self):
        return self.title



class Schedule(models.Model):
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY = "Friday"
    SATURDAY = "Saturday"
    SUNDAY = "Sunday"

    WEEKDAY_CHOICES = [
        (MONDAY, "Monday"),
        (TUESDAY, "Tuesday"),
        (WEDNESDAY, "Wednesday"),
        (THURSDAY, "Thursday"),
        (FRIDAY, "Friday"),
        (SATURDAY, "Saturday"),
        (SUNDAY, "Sunday"),
    ]
    
    
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="schedules")
    frequency = models.CharField(max_length=50)
    nextDate = models.DateField(null=False,blank=False)
    endDate = models.DateField(null=True,blank=True)
    service = models.CharField(max_length=50)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    isActive = models.BooleanField(default=True)
    schedule_day = models.CharField(max_length=9,choices=WEEKDAY_CHOICES, default=MONDAY)
    order = models.PositiveIntegerField(default=999, db_index=True) # Default to a high number to push unsorted items to the end
    monthly_pricing = models.BooleanField(default=False)
    class Meta:
        ordering = ["schedule_day", "order"]  

    @classmethod
    def generate_jobs(cls, user=None):
        if user:
            try:
                profile = userProfile.objects.get(user=user)
                user_timezone = pytz.timezone(profile.timezone)
            except (userProfile.DoesNotExist, pytz.exceptions.UnknownTimeZoneError):
                user_timezone = pytz.UTC
            users = [profile]
        else:
            users = userProfile.objects.all()
        
        for profile in users:
            try:
                user_timezone = pytz.timezone(profile.timezone)
            except pytz.exceptions.UnknownTimeZoneError:
                user_timezone = pytz.UTC

            user = profile.user
            local_now = timezone.now().astimezone(user_timezone)
            today_in_user_tz = local_now.date()
            
            
            schedules = cls.objects.filter(
                nextDate=today_in_user_tz,
                isActive=True,
                property__client__company=profile.company
            ).order_by("order")
           
            for schedule in schedules:
                if schedule.monthly_pricing:
                    schedule.cost=0
                Job.objects.create(
                    schedule=schedule,
                    cost=schedule.cost,
                    jobDate=schedule.nextDate,
                    client=schedule.property.client,
                    order = schedule.order
                )
                
                if schedule.endDate and schedule.nextDate > schedule.endDate:
                    schedule.isActive = False
                else:
                    if schedule.frequency.lower() == "daily":
                        schedule.nextDate += timedelta(days=1)
                    elif schedule.frequency.lower() == "weekly":
                        schedule.nextDate += timedelta(weeks=1)
                    elif schedule.frequency.lower() == "biweekly":
                        schedule.nextDate += timedelta(weeks=2)
                    elif schedule.frequency.lower() == "triweekly":
                        schedule.nextDate += timedelta(weeks=3)
                    elif schedule.frequency.lower() == "monthly":
                        schedule.nextDate += timedelta(weeks=4)
                    elif schedule.frequency.lower() == "once":
                        schedule.isActive = False
                        schedule.endDate = today_in_user_tz

                schedule.save()
    
                    
    def save(self, *args, **kwargs):
        if self.nextDate:
            # Use strftime to get full weekday name
            self.schedule_day = self.nextDate.strftime("%A")
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.service} - {self.nextDate}"

class Job(models.Model):
    STATUS_CHOICES = [
        ('complete', 'Complete'),
        ('uncomplete', 'Uncomplete'),
    ]
    schedule = models.ForeignKey(Schedule,on_delete=models.SET_NULL,null=True)
    client = models.ForeignKey(Client,on_delete=models.CASCADE)
    jobDate = models.DateField(null=False,blank=False)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='uncomplete')
    complete_date = models.DateTimeField(null=True, blank=True)
    cost = models.DecimalField(max_digits=10,decimal_places=2)
    is_applied_to_balance = models.BooleanField(default=False)
    order = models.PositiveIntegerField(help_text="Order of the job. Must be a positive number.", null=True, blank=True)

class Payment(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10,decimal_places=2)
    paymentType = models.CharField(max_length=50,default='cash')
    paymentDate = models.DateTimeField(auto_now_add=True)
    is_applied_to_balance = models.BooleanField(default=False)


class Balance(models.Model):
    client = models.OneToOneField(Client, on_delete=models.CASCADE)
    current_balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    updated_at = models.DateTimeField(auto_now=True)

    def recalculate_balance(self):
        with transaction.atomic():
            unapplied_jobs = Job.objects.filter(client=self.client, is_applied_to_balance=False, status='complete', schedule__monthly_pricing = False)
            unapplied_payments = Payment.objects.filter(client=self.client, is_applied_to_balance=False)
            unapplied_adjustments = BalanceAdjustment.objects.filter(client=self.client, is_applied_to_balance=False)
            
           
            total_jobs = unapplied_jobs.aggregate(Sum("cost"))["cost__sum"] or 0
            total_payments = unapplied_payments.aggregate(Sum("amount"))["amount__sum"] or 0
            total_adjustments = unapplied_adjustments.aggregate(Sum("amount"))["amount__sum"] or 0
            
            total_jobs = Decimal(total_jobs)
            total_payments = Decimal(total_payments)
            total_adjustments= Decimal(total_adjustments)
            
            
            delta = total_payments - total_jobs + total_adjustments 

            unapplied_jobs = Job.objects.filter(client=self.client, is_applied_to_balance=False, status='complete', schedule__monthly_pricing = True)
             
            self.current_balance += delta

            # Save current balance
            self.save()

            #calculate invoice month and year
            base_date = timezone.now()
            prev_month = base_date.replace(day=1) - timedelta(days=1)
            
            # Create balance history record
            history = BalanceHistory.objects.create(
                balance=self,
                delta=delta,
                new_balance=self.current_balance,
                adjustment=total_adjustments,
                service_month=prev_month.month,
                service_year = prev_month.year

            )
            history.jobs.set(unapplied_jobs)
            history.payments.set(unapplied_payments)
            history.adjustments.set(unapplied_adjustments)

            # Reset adjustment
        
            # Mark jobs/payments as applied
            unapplied_jobs.update(is_applied_to_balance=True)
            unapplied_payments.update(is_applied_to_balance=True)
            unapplied_adjustments.update(is_applied_to_balance=True)

        return self.current_balance
    
    def calculate_estimated_balace(self):
        unapplied_jobs = Job.objects.filter(client=self.client, is_applied_to_balance=False, status='complete')
        unapplied_payments = Payment.objects.filter(client=self.client, is_applied_to_balance=False)
        unapplied_adjustments = BalanceAdjustment.objects.filter(client=self.client, is_applied_to_balance=False)
            
        total_jobs = unapplied_jobs.aggregate(Sum("cost"))["cost__sum"] or 0
        total_payments = unapplied_payments.aggregate(Sum("amount"))["amount__sum"] or 0
        total_adjustments = unapplied_adjustments.aggregate(Sum("amount"))["amount__sum"] or 0
            
        total_jobs = Decimal(total_jobs)
        total_payments = Decimal(total_payments)
        total_adjustments= Decimal(total_adjustments)
            
        delta = total_payments - total_jobs + total_adjustments

        return self.current_balance + delta
        
class BalanceAdjustment(models.Model):
    ADJUSTMENT_TYPE = (
    ('credit', 'Credit'),
    ('debit', 'Debit'),
    )   
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='adjustments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_applied_to_balance = models.BooleanField(default=False)
    adjustment_type = models.CharField(max_length=6, choices=ADJUSTMENT_TYPE,default='credit')
    
    def save(self, *args, **kwargs):
        if self.adjustment_type == 'debit':
            self.amount = abs(self.amount) * -1
        else:
            self.amount = abs(self.amount)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Adjustment of {self.amount} on {self.created_at.date()}"
class BalanceHistory(models.Model):
    balance = models.ForeignKey(Balance, on_delete=models.CASCADE, related_name='history')
    delta = models.DecimalField(max_digits=10, decimal_places=2)
    new_balance = models.DecimalField(max_digits=10, decimal_places=2)
    adjustment = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    service_month = models.PositiveSmallIntegerField(null=True,blank=True)
    service_year = models.PositiveSmallIntegerField(null=True,blank=True)
    
    
    # Store related job/payment IDs for traceability
    jobs = models.ManyToManyField("Job")
    payments = models.ManyToManyField("Payment")
    adjustments = models.ManyToManyField("BalanceAdjustment")

    def __str__(self):
        return f"Change of {self.delta} on {self.created_at.date()}"
    
class NoteTemplate(models.Model):
    title = models.CharField(max_length=100,null=True,blank=True)
    content = models.TextField(max_length=100,null=True,blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    last_modified = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True

class ScheduleNote(NoteTemplate):
    schedule = models.OneToOneField(Schedule, on_delete=models.CASCADE)

class PropertyNote(NoteTemplate):
    property = models.OneToOneField(Property, on_delete=models.CASCADE)

class JobNote(NoteTemplate):
    job = models.OneToOneField(Job, on_delete=models.CASCADE)