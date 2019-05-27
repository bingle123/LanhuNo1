#!usr/bin/ebv python
# -*- coding:utf-8 -*-
from __future__ import absolute_import
from celery import task
from system_config.function import test
from celery.task import periodic_task
from gather_data import function
from monitor_item import tools
from celery.schedules import crontab
import market_day.celery_opt as co
from iqube_interface.gather import Gather
from datetime import datetime
from custom_process.function import clear_execute_status
from market_day.function import check_jobday
from monitor_item.models import *
from history_chart.function import select_scene_operation


@task
def crawl_task(**i):
    print u'爬虫开始'
    test()
    return 'success'


# 基本监控项和图表监控项的采集开始task
@task
def gather_data_task_one(**i):
    # 启动一个
    area_id = i['area_id']
    period = {
        'every': i['period'],
        'period': 'seconds'
    }
    task_name = i['task_name']
    info = {
        'id': i['id'],
        'gather_params': i['gather_params'],
        'params': i['params'],
        'gather_rule': i['gather_rule'],
        'task_name': i['task_name'],
        'endtime': i['endtime'],
        'score': i['score']
    }
    if check_jobday(area_id):
        co.create_task_interval(name=task_name, task='market_day.tasks.basic_monitor_task', interval_time=period,
                                task_args=info, desc=task_name)

    else:
        pass


# 基本监控项的采集任务
@task
def basic_monitor_task(**i):
    # 调用基本监控项和图标监控项数据采集的方法
    endtime = i['endtime']
    task_name = i['task_name']
    # 逾期删除本任务
    strnow = datetime.strftime(datetime.now(), '%H:%M')
    if strnow <= endtime:
        function.gather_data(**i)
    else:
        co.delete_task(task_name)


# @task
# def gather_data_task_two(**i):
#     """
#     作业监控项的采集开始任务
#     :param i:
#     :return:
#     """
#     area_id = i['area_id']
#     period = {
#         'every': i['period'],
#         'period': 'seconds'
#     }
#     task_name = i['task_name']
#     info = {
#         'id': i['id'],
#         'gather_params': i['gather_params'],
#         'params': i['params'],
#         'gather_rule': i['job_id'],
#         'task_name': i['task_name'],
#         'endtime': i['endtime']
#     }
#     if check_jobday(area_id):
#         co.create_task_interval(name=task_name, task='market_day.tasks.job_monitor_task', interval_time=period,
#                                 task_args=info, desc=task_name)
#     else:
#         pass


# @task
# def job_monitor_task(**i):
#     """
#     作业监控项的采集任务
#     :param i:
#     :return:
#     """
#     endtime = i['endtime']
#     task_name = i['task_name']
#     # 逾期删除本任务
#     strnow = datetime.strftime(datetime.now(), '%H:%M')
#     if strnow <= endtime:
#         # 调用作业采集的方法
#         tools.job_interface(i)
#     else:
#         co.delete_task(task_name)


# @task
# def gather_data_task_thrid(**i):
#     """
#     流程监控项的采集task
#     :param i:
#     :return:
#     """
#     endtime = i['endtime']
#     task_name = i['task_name']
#     # 逾期删除本任务
#     strnow = datetime.strftime(datetime.now(), '%H:%M')
#     if strnow <= endtime:
#         # 调用流程监控项数据采集的方法
#         tools.flow_gather_task(**i)
#     else:
#         print u'删除' + task_name
#         co.delete_task(task_name)


# @task
# def gather_data_task_thrid_test(**i):
#     """
#     流程监控项的采集测试专用task
#     :param i:
#     :return:
#     """
#     tools.flow_gather_task(**i)


# @task
# def start_flow_task(**info):
#     """
#     流程监控项的采集开始任务
#     :param info:
#     :return:
#     """
#     # 得到client对象，方便调用接口
#     area_id = info['area_id']
#     period = {
#         'every': info['period'],
#         'period': 'seconds'
#     }
#     if check_jobday(area_id):
#         user_account = BkUser.objects.filter(id=1).get()
#         client = get_client_by_user(user_account)
#         client.set_bk_api_ver('v2')
#         template_id = info['template_id']
#         constants_temp = info['constants']
#         constants = {}
#         for temp in constants_temp:
#             constants[temp['key']] = temp['value']
#         strnow = datetime.strftime(datetime.now(), '%Y-%m-%d %H:%M:%S')
#         name = str(info['template_id']) + strnow
#         param = {
#             "bk_biz_id": "2",
#             "template_id": template_id,
#             'name': name,
#             'constants': constants
#         }
#         res = client.sops.create_task(param)
#         # 调用接口创建任务并得到任务的id
#         task_id = res['data']['task_id']
#         # 调用接口启动任务，开始执行任务
#         param = {
#             "bk_biz_id": "2",
#             'task_id': task_id
#         }
#         res = client.sops.start_task(param)
#         flag = res['result']
#         status = 0
#         # 如果启动任务成功创建一个定时查看节点状态的任务
#         if flag:
#             node_times = info['node_times']
#             period = info['period']
#             args = {
#                 'item_id': info['id'],
#                 'task_id': task_id,  # 启动流程的任务id
#                 'node_times': node_times,
#                 'task_name': info['task_name'] + 'task',
#                 'endtime': info['endtime']
#             }
#             period = {
#                 'every': period,
#                 'period': 'seconds'
#             }
#             co.create_task_interval(name=info['task_name'], task='market_day.tasks.gather_data_task_thrid',
#                                     interval_time=period,
#                                     task_args=args, desc=name)
#         Flow(instance_id=task_id, status=flag, test_flag=0, flow_id=info['id']).save()
#     else:
#         pass

@task
def gather_data_task_five(**add_dicx):
    """
    作业监控项的采集开始任务
    :param i:
    :return:
    """
    area_id = add_dicx['area_id']
    period = {
        'every': add_dicx['period'],
        'period': 'seconds'
    }
    task_name = add_dicx['task_name']
    info = add_dicx
    if check_jobday(area_id):
        co.create_task_interval(name=task_name, task='market_day.tasks.base_monitor_task', interval_time=period,
                                task_args=info, desc=task_name)
    else:
        pass


@task
def base_monitor_task(**add_dicx):
    endtime = add_dicx['endtime']
    task_name = add_dicx['task_name']
    dimension_data = add_dicx['dimension']
    # 指标的构造参数
    dimension = '{hostname=*}'
    if dimension_data != None:
        for i in dimension_data:
            key = i['dimension_name']
            value = i['dimension_value']
            dimension += '{' + key + '=' + value + '}'
    interface_type = add_dicx['source_type']
    if 0 == interface_type:
        interface_type = 'log'
    elif interface_type == 1:
        interface_type = 'measures'
    else:
        interface_type = None
    measures_name = add_dicx['measure_name']
    measures = add_dicx['target_name']
    show_rule_type = add_dicx['display_type']
    gather_rule = add_dicx['display_rule']
    # 逾期删除本任务
    strnow = datetime.strftime(datetime.now(), '%H:%M')
    if strnow <= endtime:
        # 调用一体化监控项数据采集的方法
        Gather.gather_base_test(interface_type=interface_type, measures=measures, measures_name=measures_name,
                                show_rule_type=show_rule_type, gather_rule=gather_rule, interface_param=dimension)
    else:
        print u'删除' + task_name
        co.delete_task(task_name)


@task
def count_time(**i):
    """
    定时任务测试
    :param i:
    :return:
    """
    return i['x'] * i['y']


@periodic_task(run_every=crontab(hour=0, minute=0))
def clear_status_task():
    """
    定时清理定制流程状态任务
    :return:
    """
    clear_execute_status()


@periodic_task(run_every=crontab(hour=3, minute=0))
def select_scene_operation_task():
    """

    :return:
    """
    select_scene_operation()
