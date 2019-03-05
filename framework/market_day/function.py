#!usr/bin/ebv python
# -*- coding:utf-8 -*-
from models import Holiday,HeaderData,Area
import os
from xlrd import open_workbook
from conf import default
from monitor_item.models import Monitor
from django.forms import model_to_dict
from django.db.models import Q
import celery_opt as co
import json
from datetime import datetime
import pytz


def get_holiday(req,area):
    dates = Holiday.objects.filter(Q(flag=0)&Q(area=int(area))).values('day')
    days = []
    for date in dates:
        days.append(date['day'])
    return days


def get_file(req,area):
    if req.method == 'POST':
        try:
            obj = req.FILES.get('file')
            filename = obj.name
            path = os.getcwd() + r'\\static\\' + filename
            if not os.path.exists(path):
                with open(path, 'wb')as f:
                    for chunk in obj.chunks():
                        f.write(chunk)
                f.close()
            workbook = open_workbook(path)
            sheet = workbook.sheet_by_index(0)
            delall(area)
            for i in range(1, sheet.nrows):
                day = str(sheet.row_values(i)[0])
                d = day[0:4] + u'/' + str(int(day[4:6])) + u'/' + str(int(day[6:8]))
                flag = int(sheet.row_values(i)[1])
                holiday = Holiday(day=d, flag=flag,area=area)
                holiday.save()
        except:
            print '文件不匹配'


def delall(area):
    flag = Holiday.objects.filter(area=int(area)).delete()
    return flag


def delone(req):
    res=json.loads(req.body)
    date=res['date']
    area=res['area']
    flag = Holiday.objects.filter(Q(day=date)& Q(area=int(area))).update(flag=1)
    return flag


def addone(req):
    res = json.loads(req.body)
    date = res['date']
    area = res['area']
    flag = Holiday.objects.filter(Q(day=date)& Q(area=int(area))).update(flag=0)
    return flag


def addperdic_task():
    flag=co.create_task_interval(name='demo_per', task='market_day.tasks.count_time', task_args=[10,50], desc='demodemo',interval_time={'every':10,'period':'seconds'})
    return flag

#添加一个监控项定时任务
def add_unit_task(add_dicx):
    type=add_dicx['monitor_type']
    schename = add_dicx['monitor_name']
    print add_dicx
    id=Monitor.objects.filter(monitor_name=schename).last().id
    schename=str(id)
    if type=='基本单元类型':
        starthour = str(add_dicx['start_time']).split(':')[0]
        startmin=str(add_dicx['start_time']).split(':')[-1]
        endtime=add_dicx['end_time']
        period = int(add_dicx['period'])
        ctime = {
            'hour': starthour,
            'minute': startmin,
        }
        info = {
            'id': id,
            'gather_params': add_dicx['gather_params'],
            'params': add_dicx['params'],
            'gather_rule': add_dicx['gather_rule'],
            'period':period,
            'area_id':add_dicx['monitor_area'],
            'task_name':str(schename)+'task',
            'endtime':endtime
        }
        co.create_task_crontab(name=schename, task='market_day.tasks.gather_data_task_one', crontab_time=ctime,task_args=info, desc=schename)
    elif type=='图表单元类型':
        starthour = str(add_dicx['start_time'])[:2]
        startmin=str(add_dicx['start_time']).split(':')[-1]
        endhour = str(add_dicx['end_time'])[:2]
        period = int(add_dicx['period'])
        endtime=add_dicx['end_time']
        ctime = {
            'hour': starthour,
            'minute': startmin,
        }
        info = {
            'id': id,
            'gather_params': 'sql',
            'params': add_dicx['params'],
            'gather_rule': add_dicx['gather_rule'],
            'period': period,
            'area_id': add_dicx['monitor_area'],
            'task_name': str(schename) + 'task',
            'endtime': endtime
        }
        co.create_task_crontab(name=schename, task='market_day.tasks.gather_data_task_one', crontab_time=ctime,
                               task_args=info, desc=schename)

    elif type=='作业单元类型':
        starthour = str(add_dicx['start_time'])[:2]
        startmin=str(add_dicx['start_time']).split(':')[-1]
        endhour = str(add_dicx['end_time'])[:2]
        endtime=add_dicx['end_time']
        period = int(add_dicx['period'])
        ctime = {
            'hour': starthour,
            'minute': startmin,
        }
        info = {
            'id': id,
            'params' : add_dicx['params'],  # ip
            'gather_params' : add_dicx['gather_params'],
            'job_id': [{
                'name': add_dicx['gather_rule'],
                'id': add_dicx['jion_id']
            }],
            'period':period,
            'area_id': add_dicx['monitor_area'],
            'task_name': str(schename) + 'task',
            'endtime': endtime
        }
        co.create_task_crontab(name=schename, task='market_day.tasks.gather_data_task_two', crontab_time=ctime,task_args=info, desc=schename)
    elif type=='fourth':
        template_list=add_dicx['jion_id']
        period=add_dicx['period']
        node_times=add_dicx['node_times']
        constants=add_dicx['constants']
        starthour = str(node_times[0]['starttime']).split(':')[0]
        startmin = str(node_times[0]['starttime']).split(':')[-1]
        endtime=str(node_times[-1]['endtime'])
        ctime = {
            'hour': starthour,
            'minute': startmin,
        }
        info = {
            'id': id,
            'template_id':template_list,#创建任务的模板id
            'node_times':node_times,
            'period':period,
            'constants':constants,
            'area_id': add_dicx['monitor_area'],
            'task_name': str(schename) + 'task',
            'endtime': endtime
        }
        #创建一个开始流程的任务
        co.create_task_crontab(name=schename, task='market_day.tasks.start_flow_task', crontab_time=ctime,task_args=info, desc=schename)

#获取蓝鲸平台的头文件，并存入数据库
def get_header_data(request):
    h,flag=HeaderData.objects.get_or_create(id=1)
    headers = {
        "Content-Type": 'application/json;charset=utf-8',
        "Cookie": 'csrftoken=bNAyZ7pBsJ1OEi8TMq1NqxNXY2CUREEO; sessionid=r9g2ofn1wb0ykd1epg8crk9l5pgyeuu2; bk_csrftoken=GdxslZh1U3YVsCthqXIv09PbVoW0AaQd; bklogin_csrftoken=z8goJXIMXil80lFT3VtLQHMClrPIExl9; blueking_language=zh-cn; bk_token=kxgoYlRp77AkbGVX85AdFVR0t6eqqHeJ-BlMXxA6oM0',
        "Host": 'paas.bk.com',
        "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3679.0 Safari/537.36',
        "X-CSRFToken": 'FI1fszvZzgIsYYX8n6aPMduEeAL7qTV3',
        "X-Requested-With": 'XMLHttpRequest'
    }
    csrftoken = request.COOKIES["csrftoken"];
    Cookie = "keyA=1";
    for key in request.COOKIES:
        Cookie = "%s;%s=%s" % (Cookie, key, request.COOKIES[key]);
    headers["Cookie"] = Cookie;
    headers["X-CSRFToken"] = csrftoken;
    h.header=json.dumps(headers, ensure_ascii=False)
    h.save()
#添加一个新的日历地区
def add_area(req):
    res=json.loads(req.body)
    name=res['country']
    timezone=res['timezone']
    a,flag=Area.objects.get_or_create(country=name)
    a.timezone=timezone
    a.save()
    return 'ok'
#获取所有的日历地区
def get_all_area(req):
    areas=Area.objects.all()
    area_dict=[]
    for a in areas:
        area_dict.append(model_to_dict(a))
    return area_dict
#删除日历的某个地区
def del_area(name):
    Area.objects.get(id=name).delete()
    Holiday.objects.filter(area=name).delete()
    return 'ok'
#获得世界上的所有时区
def get_all_timezone():
    all=pytz.common_timezones
    return all
#判断今天是不是对应地区的工作日
def check_jobday(id):
    timezone=Area.objects.get(id=id).timezone
    tz=pytz.timezone(timezone)
    now=datetime.now(tz)
    str_date=datetime.strftime(now,'%Y/%m/%d')
    day=str_date[:4] + u'/' + str(int(str_date[5:7])) + u'/' + str(int(str_date[8:10]))
    hs=Holiday.objects.filter(Q(day=day)&Q(area=id))
    flag=0
    for h in hs:
        flag=h.flag
    if flag==1:
        return True
    elif flag==2:
        return False