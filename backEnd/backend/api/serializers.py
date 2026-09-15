from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Client, Property,Schedule,Job,Payment,Company,Balance,BalanceHistory,BalanceAdjustment,userProfile,NoteTemplate,ScheduleNote,PropertyNote,JobNote
from django.utils import timezone
from datetime import timedelta
import pytz



class StrippedSerializer(serializers.ModelSerializer):
    """
    Base serializer that trims whitespace from all string fields.
    Safe for None values.
    """
    def to_internal_value(self, data):
        data = data.copy()  # make a mutable copy
        for field, value in data.items():
            if isinstance(value, str):  # only strip strings, ignore None/other types
                data[field] = value.strip()
        return super().to_internal_value(data)
class userSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password": {"write_only":True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        userProfile.objects.create(user=user)
        return user

class PropertyNoteSerializer(serializers.ModelSerializer):
   
    class Meta:
        model = PropertyNote
        fields = ["id","title","content","created_at","last_modified"]
        extra_kwargs = {"id": {"read_only":True},
                        "created_at": {"read_only":True}}

class ScheduleNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleNote
        fields = ["id","title","content","created_at","last_modified"]
  
class JobNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobNote
        fields = ["id","title","content","created_at","last_modified"]
class PropertySerializer(serializers.ModelSerializer):
    propertynote = PropertyNoteSerializer(read_only=True)
    class Meta:
        model = Property
        fields = ["id", "street", "city", "state", "zipCode","propertynote"]

class ClientSerializer(serializers.ModelSerializer):
    properties = PropertySerializer(many=True, read_only=True)
    class Meta:
        model = Client
        fields = ["id", "firstName", "lastName", "phoneNumber", "email", "properties"]
        extra_kwargs = {
            "created_at": {"read_only":True}
        }

class ClientOnlySerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ["id", "firstName", "lastName", "phoneNumber", "email"]
        extra_kwargs = {
            "created_at": {"read_only":True}
        }
    
    

class ScheduleSerializer(serializers.ModelSerializer):
    schedulenote = ScheduleNoteSerializer(read_only=True)
    class Meta:
        model = Schedule
        fields = ["id", "frequency","nextDate","endDate","service","cost","isActive","order","schedule_day",'schedulenote', "monthly_pricing"]
    
    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        user_profile = getattr(instance.property.client.company.user, "userprofile", None)
        tz_name = user_profile.timezone if user_profile else "America/Chicago"
        user_tz = pytz.timezone(tz_name)

                    # Localize current time
        local_now = timezone.now().astimezone(user_tz)
        today_in_user_tz = local_now.date()
        if instance.nextDate == today_in_user_tz:
            instance.generate_jobs()
        return instance

class PropertyandClientSerializer(serializers.ModelSerializer):
    client = ClientOnlySerializer()
    class Meta:
        model = Property
        fields = ["id", "street", "city", "state", "zipCode","client"]

class ScheduleManagementSerializer(serializers.ModelSerializer):
    property = PropertyandClientSerializer()
    class Meta:
        model = Schedule
        fields = ["id", "frequency","nextDate","endDate","service","cost","isActive","order","schedule_day","property"]

class PropertyAndSchedule(serializers.ModelSerializer):
    schedules = ScheduleSerializer(many=True)

    class Meta:
        model = Property
        fields = ["id","street", "city", "state","zipCode","schedules"]

class ClientPropertySetUpSerializer(serializers.ModelSerializer):
    properties = PropertyAndSchedule(many=True)
    
    class Meta:
        model = Client
        fields = ["id","firstName", "lastName", "phoneNumber","email","properties"]
    
    def create(self, validated_data):
        properties_data = validated_data.pop('properties',[])
        author = validated_data.pop('author', None)
        company = validated_data.pop('company', None)
        client = Client.objects.create(author=author,company=company,**validated_data)
        
         # Create the Balance record
        Balance.objects.create(client=client)
        
        for property_data in properties_data:
            try:
                schedules_data = property_data.pop('schedules', [])
                property_instance = Property.objects.create(client=client, **property_data)
                for schedule_data in schedules_data:
                    new_schedule = Schedule.objects.create(property=property_instance ,**schedule_data)
                    user_profile = getattr(new_schedule.property.client.company.user, "userprofile", None)
                    tz_name = user_profile.timezone if user_profile else "America/Chicago"
                    user_tz = pytz.timezone(tz_name)

                    # Localize current time
                    local_now = timezone.now().astimezone(user_tz)
                    today_in_user_tz = local_now.date()

                    if new_schedule.nextDate == today_in_user_tz:  
                        new_schedule.generate_jobs()
            except Exception as e:
                client.delete()
                raise serializers.ValidationError(f"Error Creating Property or Schedule")
        
        return client

class OnlyClientSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = Client
        fields = ["id", "firstName", "lastName", "phoneNumber", "email"]
        extra_kwargs = {
            "created_at": {"read_only":True}
        }


class JobSerializer(serializers.ModelSerializer):
    property = serializers.SerializerMethodField()
    schedule = ScheduleSerializer()
    client = OnlyClientSerializer()
    
    class Meta:
        model = Job
        fields = ['id', 'jobDate', 'status', 'cost','complete_date', 'property', 'schedule', 'client','order']
        
    def get_property(self, obj):
        property_obj = obj.schedule.property
        return PropertySerializer(property_obj).data



class PropertyAndScheduleSetUp(serializers.ModelSerializer):
    schedules = ScheduleSerializer(many=True)
    clientId = serializers.IntegerField(write_only=True)
    class Meta:
        model = Property
        fields = ["id","street", "city", "state","zipCode","clientId","schedules"]
    
    def create(self, validated_data):
        schedules_data = validated_data.pop('schedules', [])
        client_id = validated_data.pop('clientId')
        
        try:
            client = Client.objects.get(id=client_id)
        except Client.DoesNotExist:
            raise serializers.ValidationError({"client_id": "Invalid client ID"})
        
        property_instance = Property.objects.create(client=client,**validated_data)
        
        for schedule_data in schedules_data:
            new_schedule = Schedule.objects.create(property=property_instance, **schedule_data)
            user_profile = getattr(new_schedule.property.client.company.user, "userprofile", None)
            tz_name = user_profile.timezone if user_profile else "America/Chicago"
            user_tz = pytz.timezone(tz_name)

                    # Localize current time
            local_now = timezone.now().astimezone(user_tz)
            today_in_user_tz = local_now.date()

            if new_schedule.nextDate == today_in_user_tz:  
                new_schedule.generate_jobs()
        return property_instance

class PaymentSerializer(serializers.ModelSerializer):
    
    class Meta:
        model=Payment
        fields = ["id","amount","paymentType","paymentDate"]

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id','companyName','logo']

    def create(self, validated_data):
        user = self.context['request'].user
        company = Company.objects.create(user=user, **validated_data)

        # Update the user's profile with the new company
        profile = user.userprofile
        profile.company = company
        profile.save()

        return company
class JobOnlySerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = ['id', 'jobDate', 'status', 'cost','complete_date','order']

   
class ScheduleJobsSerializer(serializers.ModelSerializer):
    jobs = JobOnlySerializer(source='job_set',many=True,read_only=True)
    schedulenote = ScheduleNoteSerializer(read_only=True)
    class Meta:
        model = Schedule
        fields = fields = ["id", "frequency","service","cost","nextDate","endDate","isActive","jobs","schedulenote"]

class PropertyServiceInfoSerializer(serializers.ModelSerializer):
    schedules = ScheduleJobsSerializer(many=True,read_only=True)
    
    class Meta:
        model = Property
        fields = ["id", "street", "city", "state", "zipCode", 'schedules']
        
class BalanceSerializer(serializers.ModelSerializer):

    class Meta:
        model = Balance
        fields = ["id","current_balance", "updated_at"]
        extra_kwargs = {
            "id": {"read_only": True},
            "updated_at": {"read_only": True},
        }

class BalanceAdjustmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = BalanceAdjustment
        fields = ["id","amount","reason","created_at",'adjustment_type']
        extra_kwargs = {
            "id": {"read_only": True},
            "created_at": {"read_only": True},
        }

# serializers.py
class ScheduleNestedSerializer(serializers.ModelSerializer):
    jobs = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = ['id', 'service', 'nextDate', 'jobs']

    def get_jobs(self, schedule):
        jobs = self.context.get('jobs_for_schedule', {}).get(schedule.id, [])
        return JobOnlySerializer(jobs, many=True).data
class PropertyNestedSerializer(serializers.ModelSerializer):
    schedules = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = ['id', 'street', 'city', 'state', 'zipCode', 'schedules']

    def get_schedules(self, property_obj):
        all_jobs = self.context.get('jobs_queryset', [])
        schedule_map = {}

        for job in all_jobs:
            if job.schedule and job.schedule.property_id == property_obj.id:
                schedule_map.setdefault(job.schedule.id, []).append(job)

        schedules = property_obj.schedules.filter(id__in=schedule_map.keys())
        return ScheduleNestedSerializer(
            schedules,
            many=True,
            context={'jobs_for_schedule': schedule_map}
        ).data
    
class JobInfoSerializer(serializers.ModelSerializer):
    property = serializers.SerializerMethodField()
    schedule = ScheduleSerializer()

    class Meta:
        model = Job
        fields = ['id', 'jobDate', 'status', 'cost','complete_date', 'property', 'schedule']
        
    def get_property(self, obj):
        property_obj = obj.schedule.property
        return PropertySerializer(property_obj).data
class BalanceHistorySerializer(serializers.ModelSerializer):
    jobs = JobInfoSerializer(many=True)
    payments = PaymentSerializer(many=True)
    adjustments = BalanceAdjustmentSerializer(many=True)

    class Meta:
        model = BalanceHistory
        fields = ['id', 'delta', 'new_balance', 'adjustment', 'created_at','service_month','service_year',
                  'jobs', 'payments', 'adjustments']

   

    



class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = userProfile
        fields = ['timezone','role']

class ClientPropertiesSerializer(serializers.ModelSerializer):
    properties = PropertySerializer(many=True, read_only=True)

    class Meta:
        model = Client
        fields = ["id", "firstName", "lastName", "phoneNumber", "email",'properties']
        extra_kwargs = {
            "created_at": {"read_only":True}
        }

class PaymentInfoSerializer(serializers.ModelSerializer):
    client = OnlyClientSerializer(read_only=True)
    class Meta:
        model=Payment
        fields = ["id","amount","paymentType","paymentDate","client"]


  