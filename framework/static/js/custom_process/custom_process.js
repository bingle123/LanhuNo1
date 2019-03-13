var vue = null;
$(function(){
    var site_url = $('#siteUrl').val();
    //csrf验证
    axios.interceptors.request.use((config) => {
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        let regex = /.*csrftoken=([^;.]*).*$/; // 用于从cookie中匹配 csrftoken值
        config.headers['X-CSRFToken'] = document.cookie.match(regex) === null ? null : document.cookie.match(regex)[1];
        return config
    });
    //接收人校验
    const receiversCheck = (rule, value, callback) => {
        if(0 == vue.customProcessNode.receivers.length){
            callback(new Error('请输入通知接收人'));
        }else{
            return callback();
        }
    };
    //节点顺序校验
    const seqCheck = (rule, value, callback) => {
        if(null == vue.customProcessNode.seq || 0 == vue.customProcessNode.seq.length){
            callback(new Error('请输入节点顺序'));
        }else if(!/^[1-9][0-9]{0,1}$/.test(vue.customProcessNode.seq)){
            return callback(new Error('节点值在1~99之间'));
        }else{
            $.each(vue.customProcessTableData, function(k, v){
                if(vue.customProcessNode.seq == v.seq){
                    if(null == vue.customProcessNodeInitSeq){
                        return callback(new Error('该节点顺序已被定义'));
                    }else if(vue.customProcessNodeInitSeq != vue.customProcessNode.seq){
                        return callback(new Error('该节点顺序已被定义'));
                    }
                }
            });
            return callback();
        }
    };
    vue = new Vue({
        el: '#customProcess',
        data: {
            currentUser: null,
            customProcessPageCount: 0,
            currentPage: 1,
            //用于列表显示的节点信息
            customProcessTableListData: [],
            //蓝鲸平台用户列表信息
            bkUsers: {},
            //步骤条默认高度
            customProcessHeight: '1000',
            //发送通知按钮属性控制
            customProcessNotifyButtonType: 'primary',
            customProcessNotifyButtonText: '发送通知',
            customProcessNotifyButtonDisabled: false,
            //执行流程按钮属性控制
            customProcessStartButtonType: 'primary',
            customProcessStartButtonText: '开始执行流程',
            customProcessStartButtonDisabled: false,
            addDialogVisible: false,
            customProcessSendMsgDialogVisible: false,
            //添加节点的table当前状态，list=列表显示,add=添加节点,edit=编辑节点
            customProcessTableStatus: 'list',
            //当前流程中节点所处的位置，初始化为-1即未开始流程，后续应从数据库表中读取该信息
            customProcessStep: -1,
            //当前流程中节点总数，后续应从数据库读取该信息,或直接计算processDataList的长度获得
            customProcessStepSum: -1,
            //流程是否已经开始执行，应该根据数据库中的信息来判断
            customProcessStatus: false,
            //当前是否有流程节点标记位
            customProcessHasNode: false,
            customProcessReceivers: '',
            customProcessNoticeContent: '',
            customProcessNode: {
                /*node_name: null,
                send_content: null,
                seq: null,
                receivers: null*/
            },
            customProcessNodeInitSeq: null,
            customProcessTableData: [],
            //校验规则定义
            rules: {
                node_name: [
                    { required: true, message: '请输入节点名称', trigger: 'blur' },
                    { min: 1, max: 50, message: '节点名称长度在1~50之间', trigger: 'blur' }
                ],
                send_content: [
                    { required: true, message: '请输入通知内容', trigger: 'blur' },
                    { min: 1, max: 1000, message: '通知内容长度在1~1000之间', trigger: 'blur' }
                ],
                seq: [
                    { validator: seqCheck, trigger: 'blur' }
                ],
                receivers: [
                    { validator: receiversCheck, trigger: 'blur' }
                ]
            }
        },
        methods:{
            //获取当前用户名
            customProcessCurrUser: function(){
                axios({
                    method: 'post',
                    url: site_url + 'position/get_active_user',
                }).then((res) => {
                    this.currentUser=res.data.message
                }).catch((res) => {
                    var msg = '当前用户信息获取失败！';
                    this.alertRulePopupErrorMessage(msg + res);
                });
            },
            //分页显示方法
            customProcessPageChange: function(page) {
                const loading = this.customProcessPopupLoading();
                var data = {
                    page: page,
                    limit: 5
                };
                axios({
                    method: 'post',
                    url: site_url + 'custom_process/select_nodes_pagination',
                    data: data
                }).then((res) => {
                    loading.close();
                    this.customProcessTableListData = res.data.items;
                    this.customProcessPageCount = res.data.pages;
                    this.currentPage = page;
                    if(page > res.data.pages){
                        this.currentPage = res.data.pages;
                    }
                }).catch((res) => {
                    loading.close();
                    var msg = '节点信息加载失败！';
                    this.alertRulePopupErrorMessage(msg + res);
                });
            },
            //Date()对象转yyyy-MM-dd HH:mm:ss函数
            formatDateTime: function (date) {
                var y = date.getFullYear();
                var m = date.getMonth() + 1;
                m = m < 10 ? ('0' + m) : m;
                var d = date.getDate();
                d = d < 10 ? ('0' + d) : d;
                var h = date.getHours();
                h=h < 10 ? ('0' + h) : h;
                var minute = date.getMinutes();
                minute = minute < 10 ? ('0' + minute) : minute;
                var seconds = date.getSeconds();
                seconds = seconds < 10 ? ('0' + seconds) : seconds;
                return y + '-' + m + '-' + d+' '+h+':'+minute+':'+seconds;
            },
            //发送通知
            customProcessSendNotification: function(){
                this.customProcessNotifyButtonText = '正在发送...';
                this.customProcessNotifyButtonType = 'info';
                this.customProcessNotifyButtonDisabled = true;
                var url = site_url + 'custom_process/send_notification';
                var nofityData = {
                    'receivers': this.customProcessReceivers,
                    'content': this.customProcessNoticeContent
                };
                axios({
                    method: 'post',
                    url: url,
                    data: nofityData
                }).then((res) =>{
                    this.customProcessSendMsgDialogVisible = false;
                    this.customProcessNotifyButtonText = '发送通知';
                    this.customProcessNotifyButtonType = 'primary';
                    this.customProcessNotifyButtonDisabled = false;
                    if('ok' == res.data.message){
                        var msg = res.data.info;
                        this.customProcessPopupSuccessMessage(msg);
                    }else{
                        var msg = '通知发送失败！' + res.data.info;
                        this.customProcessPopupErrorMessage(msg);
                    }
                }).catch((res) => {
                    this.customProcessSendMsgDialogVisible = false;
                    this.customProcessSendMsgDialogVisible = false;
                    this.customProcessNotifyButtonText = '发送通知';
                    this.customProcessNotifyButtonType = 'primary';
                    this.customProcessNotifyButtonDisabled = false;
                    var msg = '通知发送失败！' + res;
                    this.customProcessPopupErrorMessage(msg);
                });
            },
            //弹出加载界面
            customProcessPopupLoading: function() {
                //返回加载标记，供外部关闭
                return this.$loading({
                    lock: true,
                    text: '正在拼命加载中...',
                    spinner: 'el-icon-loading',
                    background: 'rgba(0, 0, 0, 0.7)'
                });
            },
            //弹出数据加载错误的警告信息
            customProcessPopupErrorMessage: function(msg) {
                this.$notify.error({
                  title: '错误',
                  message: msg
                });
            },
            //弹出成功的信息
            customProcessPopupSuccessMessage: function(msg) {
                this.$notify({
                  title: '成功',
                  message: msg,
                  type: 'success'
                });
            },
            //生成当前执行节点的信息
            generateCurrentProcessInfo: function() {
                const loading = this.customProcessPopupLoading();
                //上传当前节点执行信息
                var url = site_url + 'custom_process/update_node_status';
                var execTime = this.formatDateTime(new Date());
                //此处执行人固定，实际使用时应该从接口取用户名称
                var execPerson = this.currentUser;
                var statusData = {};
                statusData.node_id = this.customProcessTableData[this.customProcessStep].id;
                statusData.is_done = 'c';
                statusData.do_time = execTime;
                statusData.do_person = execPerson;
                axios({
                    method: 'post',
                    url: url,
                    data: statusData
                }).then((res) =>{
                    if('ok' == res.data.message){
                        loading.close();
                    }else{
                        var msg = '节点信息上传失败！';
                        this.customProcessPopupErrorMessage(msg);
                    }
                }).catch((res) => {
                    var msg = '节点信息上传失败！';
                    this.customProcessPopupErrorMessage(msg);
                });
                var customProcessExecPerson = '<div>执行人：'+ execPerson +'</div>';
                var customProcessExecTime = '<div>' + execTime + '</div>';
                var customProcessExecStatus = '<div id="customProcessExecStatus">执行状态：正在执行...<i class="el-icon-loading"></i></div>';
                var customProcesses = $('#customMainProcess').children();
                var selectedProcess = customProcesses.eq(this.customProcessStep);
                selectedProcess.find('.el-step__description')
                        .html(customProcessExecPerson + customProcessExecTime + customProcessExecStatus);
                var nextButton = '<button id="customProcessNextButton" type="button" class="el-button el-button--success el-button--small" onclick="vue.customProcessNextNode()"><span>下一步</span></button>';
                selectedProcess.find('.el-step__main').append(nextButton);
            },
            //执行下一个节点
            customProcessNextNode: function() {
                const loading = this.customProcessPopupLoading();
                //上传当前节点已执行状态
                var url = site_url + 'custom_process/change_status_flag';
                var statusData = {};
                statusData.node_id = this.customProcessTableData[this.customProcessStep].id;
                statusData.is_done = 'y';
                axios({
                    method: 'post',
                    url: url,
                    data: statusData
                }).then((res) =>{
                    if('ok' == res.data.message){
                        loading.close();
                    }else{
                        var msg = '节点信息上传失败！';
                        this.customProcessPopupErrorMessage(msg);
                    }
                }).catch((res) => {
                    var msg = '节点信息上传失败！';
                    this.customProcessPopupErrorMessage(msg);
                });
                this.customProcessStep += 1;
                var customProcessExecStatus = '执行状态：执行完毕！<i class="el-icon-check"></i>';
                var temp = $('#customProcessExecStatus');
                temp.html(customProcessExecStatus);
                temp.removeAttr('id');
                $('#customProcessNextButton').remove();
                this.customProcessSendMessage(this.customProcessStep - 1);
                //如果当前已经执行到最后一个节点
                if(this.customProcessStep == this.customProcessStepSum){
                    this.customProcessStartButtonType = 'info';
                    this.customProcessStartButtonText = '当日流程已执行完毕';
                    //this.customProcessEnd();
                    return;
                }
                this.generateCurrentProcessInfo();
            },
            //发送短信通知
            customProcessSendMessage: function(nodeOrder) {
                this.customProcessReceivers = this.customProcessTableData[nodeOrder].receivers;
                this.customProcessNoticeContent = this.customProcessTableData[nodeOrder].send_content;
                this.customProcessSendMsgDialogVisible = true;
            },
            //短信通知关闭前的确认
            customProcessHandleClose: function() {
                this.$confirm('确定不发送短信通知吗？').then(_ => {
                    this.customProcessSendMsgDialogVisible = false;
                }).catch(_ => {

                });
            },
            //切换添加节点的界面
            customProcessAddNode: function() {
                this.customProcessTableStatus = 'add';
            },
            //切换列出所有节点的界面
            customProcessListNode: function() {
                this.customProcessNode = {};
                this.customProcessTableStatus = 'list';
            },
            //切换修改节点信息的界面
            customProcessEditNode: function(id) {
                const loading = this.customProcessPopupLoading();
                var url = site_url + 'custom_process/select_node';
                var editData = {};
                editData.id = id;
                axios({
                    method: 'post',
                    url: url,
                    data: editData,
                }).then((res) =>{
                    loading.close();
                    this.customProcessNode = res.data.message[0];
                    this.customProcessNodeInitSeq = this.customProcessNode.seq;
                    //切换修改节点的时候使用逗号切割发送人信息，使select组件能识别选中默认值
                    this.customProcessNode.receivers = this.customProcessNode.receivers.split(',');
                    this.customProcessTableStatus = 'edit';
                }).catch((res) => {
                    loading.close();
                    var msg = '请求节点数据失败！';
                    this.customProcessPopupErrorMessage(msg);
                });
            },
            //增加/修改流程节点
            defineOrChangeProcess: function() {
                if(this.customProcessStatus){
                    this.$confirm('当前流程正在使用中, 强制修改将会导致执行状态信息丢失，是否继续?', '提示', {
                      confirmButtonText: '确定',
                      cancelButtonText: '取消',
                      type: 'warning',
                      center: true
                    }).then(() => {
                        var url = site_url + 'custom_process/clear_execute_status';
                        const loading = this.customProcessPopupLoading();
                        axios({
                            method: 'post',
                            url: url
                        }).then((res) =>{
                            if('ok' == res.data.message){
                                this.customProcessPageChange(1);
                                this.addDialogVisible = true;
                                this.customProcessSelectAllNodes()
                            }else{
                                var msg = '修改过程通知失败！';
                                this.customProcessPopupErrorMessage(msg);
                            }
                            loading.close();
                        }).catch((res) => {
                            loading.close();
                            var msg = '修改过程通知失败！';
                            this.customProcessPopupErrorMessage(msg);
                        });
                    }).catch(() => {
                        this.$message({
                            type: 'info',
                            message: '取消修改过程通知'
                        });
                    });
                }else{
                    this.customProcessPageChange(1);
                    this.addDialogVisible = true;
                }
            },
            //从数据库中删除节点信息
            customProcessDeleteNode: function(id) {
                this.$confirm('此操作将删除该节点, 是否继续?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning',
                    center: true
                }).then(() => {
                    const loading = this.customProcessPopupLoading();
                    var url = site_url + 'custom_process/del_node';
                    var delData = {};
                    delData.id = id;
                    axios({
                        method: 'post',
                        url: url,
                        data: delData,
                    }).then((res) =>{
                        loading.close();
                        if('ok' == res.data.message){
                            this.customProcessPageChange(this.currentPage);
                            this.customProcessSelectAllNodes();
                            this.customProcessListNode();
                            this.$message({
                                type: 'success',
                                message: '删除节点成功!'
                            });
                        }else{
                            var msg = '请求删除节点数据失败！';
                            this.customProcessPopupErrorMessage(msg);
                        }
                    }).catch((res) => {
                        loading.close();
                        var msg = '请求删除节点数据失败！';
                        this.customProcessPopupErrorMessage(msg);
                    });
                }).catch(() => {
                    this.$message({
                        type: 'info',
                        message: '取消节点删除'
                    });
                });
            },
            get_header_data(){
            axios.get('/market_day/get_header/').then(function (res) {
               console.log(res)
            })
             },
            //添加节点信息到数据库中
            customProcessSaveNodeInfo: function(formName) {
                this.$refs[formName].validate((valid) => {
                    if (!valid) {
                        this.$message({
                            type: 'error',
                            message: '请仔细检查表单项!'
                        });
                        return false;
                    }else {
                        const loading = this.customProcessPopupLoading();
                        var url = site_url + 'custom_process/add_node';
                        if(1 != this.customProcessNode.receivers.length){
                            this.customProcessNode.receivers = this.customProcessNode.receivers.join(',');
                        }else{
                            this.customProcessNode.receivers = this.customProcessNode.receivers[0];
                        }
                        this.customProcessNodeInitSeq = null;
                        axios({
                            method: 'post',
                            url: url,
                            data: this.customProcessNode,
                        }).then((res) =>{
                            loading.close();
                            if('ok' == res.data.message){
                                this.customProcessSelectAllNodes();
                                if('edit' == this.customProcessTableStatus){
                                    this.customProcessPageChange(this.currentPage);
                                }
                                else if('add' == this.customProcessTableStatus){
                                    this.customProcessPageChange(res.data.total_pages);
                                }
                                this.customProcessListNode();
                            }else{
                                var msg = '请求添加/修改节点数据失败！';
                                this.customProcessPopupErrorMessage(msg);
                            }
                        }).catch((res) => {
                            loading.close();
                            var msg = '请求添加/修改节点数据失败！';
                            this.customProcessPopupErrorMessage(msg);
                        });
                    }
                });
            },
            //流程开始
            customProcessBegin: function(elem) {
                this.$confirm('即将开始执行当前流程，执行过程中将不能再随意修改节点, 是否继续?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning',
                    center: true
                }).then(() => {
                    this.customProcessStartButtonDisabled = true;
                    this.customProcessStartButtonType = 'success';
                    this.customProcessStartButtonText = '正在执行流程';
                    this.customProcessStep = 0;
                    //流程开始执行，执行标记为置为true
                    this.customProcessStatus = true;
                    this.generateCurrentProcessInfo();
                    this.$message({
                        type: 'success',
                        message: '开始执行流程'
                    });
                }).catch(() => {
                        this.$message({
                        type: 'info',
                        message: '取消执行操作'
                    });
                });
            },
            //流程全部执行完毕
            customProcessEnd: function() {
                this.$alert('流程节点已全部执行完成！', '提示', {
                    confirmButtonText: '确定',
                    type: 'success',
                    center: true
            });
            },
            //删除当前流程
            customProcessDelete: function() {
                var alertMessage = null;
                if(!this.customProcessStatus){
                    alertMessage = '确认删除当前过程通知吗？';
                }else{
                    alertMessage = '当前流程正在使用，是否强制删除？';
                }
                this.$confirm(alertMessage, '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning',
                    center: true
                }).then(() => {
                    const loading = this.customProcessPopupLoading();
                    //数据库删除所有节点信息
                    var url = site_url + 'custom_process/truncate_node';
                    axios({
                        method: 'post',
                        url: url
                    }).then((res) =>{
                        if('ok' == res.data.message){
                            loading.close();
                            //前端缓存数据和标记位清空
                            this.customProcessStep = -1;
                            this.customProcessStepSum = 0;
                            this.customProcessHasNode = false;
                            this.customProcessStatus = false;
                            this.customProcessTableData = [];
                            this.customProcessStartButtonType = 'primary';
                            this.customProcessStartButtonText = '开始执行流程';
                            this.customProcessStartButtonDisabled = false;
                            this.$message({
                                type: 'success',
                                message: '流程已被删除！'
                            });
                        }else{
                            var msg = '请求删除节点数据失败！';
                            this.customProcessPopupErrorMessage(msg);
                        }
                    }).catch((res) => {
                        var msg = '请求删除节点数据失败！';
                        this.customProcessPopupErrorMessage(msg);
                    });
                }).catch(() => {
                        this.$message({
                        type: 'info',
                        message: '取消流程删除操作'
                    });
                });
            },
            //从后台数据库获取所有节点信息
            customProcessSelectAllNodes: function() {
                const loading = this.customProcessPopupLoading();
                this.customProcessTableData = null;
                var url = site_url + 'custom_process/select_all_nodes';
                var count = 0;
                axios({
                    method: 'post',
                    url: url,
                }).then((res) =>{
                    this.customProcessTableData = res.data.message;
                    this.customProcessStepSum = this.customProcessTableData.length;
                    //根据节点数量计算步骤条的高度
                    var stepsHeight = this.customProcessStepSum * 120;
                    $('#customProcessStepsHeight').css('height',stepsHeight + 'px');
                    if(0 != this.customProcessStepSum) {
                        this.customProcessHasNode = true;
                        //-----------当前流程节点执行位置判断----------
                        $.each(this.customProcessTableData, function(index, elem){
                            if(elem.status.is_done == 'c'){
                                return false;
                            }
                            count++;
                        });
                        //流程节点没有开始执行或已经执行完毕的情况
                        if(count == this.customProcessStepSum){
                            //执行完毕
                            if(this.customProcessTableData[count - 1].status.is_done == 'y'){
                                this.customProcessStartButtonType = 'info';
                                this.customProcessStartButtonDisabled = true;
                                this.customProcessStartButtonText = '当日流程已执行完毕';
                                this.customProcessStep = this.customProcessTableData.length;
                                this.customProcessStatus = true;
                            } else{ //还未开始执行
                                this.customProcessStep = -1;
                                this.customProcessStatus = false;
                                this.customProcessStartButtonType = 'primary';
                                this.customProcessStartButtonText = '开始执行流程';
                                this.customProcessStartButtonDisabled = false;
                            }
                        }else{//流程节点正在执行的情况
                            this.customProcessStartButtonType = 'success';
                            this.customProcessStartButtonDisabled = true;
                            this.customProcessStartButtonText = '正在执行流程';
                            this.customProcessStep = count;
                            this.customProcessStatus = true;
                        }
                    }
                    loading.close();
                }).catch((res) => {
                    loading.close();
                    var msg = '节点数据信息加载错误！';
                    this.customProcessPopupErrorMessage(msg);
                });
            },
            loadBkUsers: function(){
                const loading = this.customProcessPopupLoading();
                var url = site_url + 'custom_process/select_all_bkusers';
                axios({
                    method: 'post',
                    url: url
                }).then((res) =>{
                    this.bkUsers = res.data.message;
                    console.log(res.data.message);
                    loading.close();
                }).catch((res) => {
                    loading.close();
                    var msg = '蓝鲸用户信息加载失败！' + res;
                    this.customProcessPopupErrorMessage(msg);
                });
            }
        },
        watch: {
            //监听流程节点总数，如果总数发生变化，重新获取所有节点的状态信息，由于初始默认节点数是0
            //因此在页面加载完成节点总数会发生变化，从而在页面加载完成后自动加载所有节点的状态信息
            customProcessStepSum: function(val, oldVal) {
                if(-1 == oldVal){
                    this.$nextTick(() => {
                        var customMainProcesses = $('#customMainProcess').children();
                        $.each(this.customProcessTableData, function(index, elem){
                            //设置正在执行的步骤的状态信息
                            if(index == vue.customProcessStep){
                                var execTime =  vue.customProcessTableData[index].status.do_time;
                                var execPerson = vue.customProcessTableData[index].status.do_person;
                                var customProcessExecPerson = '<div>执行人：'+ execPerson +'</div>';
                                var customProcessExecTime = '<div>' + execTime + '</div>';
                                var customProcessExecStatus = '<div id="customProcessExecStatus">执行状态：正在执行...<i class="el-icon-loading"></i></div>';
                                var nextButton = '<button id="customProcessNextButton" type="button" class="el-button el-button--success el-button--small" onclick="vue.customProcessNextNode()"><span>下一步</span></button>';
                                var selectedProcess =  customMainProcesses.eq(index);
                                selectedProcess.find('.el-step__description')
                                    .html(customProcessExecPerson + customProcessExecTime + customProcessExecStatus);
                                selectedProcess.find('.el-step__main').append(nextButton);
                            //已执行的步骤状态信息
                            }else if(index < vue.customProcessStep){
                                var execTime =  vue.customProcessTableData[index].status.do_time;
                                var execPerson = vue.customProcessTableData[index].status.do_person;
                                var customProcessExecPerson = '<div>执行人：'+ execPerson +'</div>';
                                var customProcessExecTime = '<div>' + execTime + '</div>';
                                var customProcessExecStatus = '执行状态：执行完毕！<i class="el-icon-check"></i>';
                                var selectedProcess =  customMainProcesses.eq(index);
                                selectedProcess.find('.el-step__description')
                                    .html(customProcessExecPerson + customProcessExecTime + customProcessExecStatus);
                            }else{
                            //还未执行的步骤直接返回
                                return false;
                            }
                        });
                    });
                }
            }
        },
        mounted(){
            //在页面加载完成后获取所有的流程节点
            this.customProcessSelectAllNodes();
            //在页面加载完成后加载所有的蓝鲸用户数据，用于在填写发送通知信息时指定用户
            this.loadBkUsers();
            //获取当前用户信息
            this.customProcessCurrUser();
            this.get_header_data();
        }
    });
});