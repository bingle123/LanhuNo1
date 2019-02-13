#!usr/bin/ebv python
# -*- coding:utf-8 -*-
from __future__ import absolute_import
from celery import task
from django.core.mail import send_mail
from django.conf import settings
from time import sleep
from celery.task import periodic_task
from system_config.crawl_template import crawl_temp
from system_config.function import *
from  system_config.models import SendMailLog as sml
import logging
import datetime


@task
def sendemail(email):
    content='www.baidu.com'+str(datetime.datetime.now())
    send_mail('i come from china',content,settings.DEFAULT_FROM_EMAIL,[email],fail_silently=False)
    return 'success'
@task
def count_time(**i):
    return i['x']*i['y']


@periodic_task(run_every=10)
def get_mail():
    count_time.delay({'x':10,'y':15})
    logging.error('计算成功')

@task
def crawl_task(**i):
    id = i['id']
    crawl_url = i['crawl_url']
    crawl_name = i['crawl_name']
    total_xpath = i['total_xpath']
    title_xpath = i['title_xpath']
    url_xpath = i['url_xpath']
    time_xpath = i['time_xpath']
    crawl_keyword = i['crawl_keyword']
    crawl_no_keyword = i['crawl_no_keyword']
    url_pre = i['url_pre']
    # 接收人--列表
    receivers = i['receivers'].split('@')
    # 开始爬虫
    crawl_result = crawl_temp(crawl_url, total_xpath, title_xpath, time_xpath, url_xpath)
    # 爬虫成功，且有数据
    print crawl_result
    if crawl_result['code'] == 0 and crawl_result['results'].__len__() != 0:
        send_result = []
        for j in range(crawl_result['results'].__len__()):
            # 增加爬虫配置ID
            crawl_result['results'][j].update(crawl_id=id)
            # 增加爬虫推送人---用户名需要转换成邮箱地址
            crawl_result['results'][j].update(receivers=receivers)
            # 拼接URL
            if crawl_result['results'][j]['resource'][0:4] == 'http':
                # 若resource自带http则不操作
                pass
            else:
                # 若resource不自带http则增加前缀
                crawl_result['results'][j]['resource'] = url_pre + crawl_result['results'][j]['resource']
            # 爬取内容包含关键字并且不包含非关键字的数据，并加入到结果集
            if crawl_keyword in crawl_result['results'][j]['title'] and crawl_no_keyword not in \
                    crawl_result['results'][j]['title']:
                res = CrawlContent.objects.filter(title_content=crawl_result['results'][j]['title'])
                # 爬取内容筛选数据库中不存在的内容增加到result_all
                if len(res) == 0:
                    # 增加到结果集
                    crawl_id = crawl_result['results'][j]['crawl_id']
                    title = crawl_result['results'][j]['title']
                    resource = crawl_result['results'][j]['resource']
                    time = crawl_result['results'][j]['time']
                    # 保存爬虫内容
                    CrawlContent.objects.create(crawl_id=crawl_id, title_content=title, url_content=resource,
                                                time_content=time)
                    # 此处为接收人的邮箱日后需要从清算园里查询出来,这里为测试数据
                    receivers_mail = ['761494073@qq.com', 'liaomingtao@zork.com.cn']
                    send_result.append(crawl_result['results'][j])
                    # send_content = change_to_html(crawl_result['results'][j])
                    # theme = crawl_name + datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S") + u'的爬虫信息'
                    # mail_send(theme, send_content, receivers_mail)
        if len(send_result) == 0:
            # 内容为空，不需要发送
            pass
        else:
            # print send_result
            send_content = change_to_html(send_result)
            receivers_mail = ['761494073@qq.com', 'liaomingtao@zork.com.cn']
            theme = crawl_name + datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S") + u'的爬虫信息'
            mail_send(theme, send_content, receivers_mail)
            sml.objects.create(link_id=id,message_title=theme,message_content=send_content)
            logging.error(u'消息日志保存成功')
    return 'success'

