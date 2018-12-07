module.exports = {
    autoAddCookieType:'',
    autoAddCookieObj:{},
    xhrObj:null,
    // 自定义的方法
    // 根据数组将数组打乱
    shuffleArray:function (arr) {
        var len = arr.length;
        var backArr = [];
        for (var i=0; i<len; i++) {
            var k = Math.floor(cc.random0To1()*arr.length);
            backArr.push(arr[k]);
            arr.splice(k, 1);
        }
        return backArr;
    },
    // 请求网络接口 默认 post 同步
    $ajaxData:function(url, data, type, async, func) {
        var back = {code:-1,msg:'网络异常,请稍后重试.', data:null};
        type = type ? type : 'post';
        $.ajax({
            url: url,
            async: !!async,
            data: data,
            type: type,
            dataType: "json",
            success: function(data) {
                back.data = data;
                back.code = 0;
                back.msg = '通讯成功.';
                if (typeof func == 'function') func(back);
            },
            error: function(data) {
                back.msg = '通讯失败！';
                back.data = data;
                if (typeof func == 'function') func(back);
            }
        });
        return back;
    },
    // 使用原生网络请求 构建到某些平台 平台并不支持同步请求所以坑自己填
    ajaxData:function(url, data, type, async, func) {
        data = this.addCookieArgs(data);
        var backDef = {code:-1,msg:'网络异常,请稍后重试.', data:null};
        type = type ? type : 'post';
        type = type.toUpperCase();
        if (this.isWxMiniProgramEnvironment()) {
            return this.ajaxDataWx(url, data, type, func);
        }
        if (true || !this.xhrObj) {
            this.xhrObj = new XMLHttpRequest();
        }
        var xhr = this.xhrObj;
        var back = null;
        xhr.onreadystatechange = function() {
            // console.log(xhr.getResponseHeader('Cookie'));
            back = backDef;
            if (xhr.readyState == 4) {
                back.data = xhr.responseText;
                // console.log(back);
                if (xhr.status == 200) {
                    if (xhr.getResponseHeader('Content-Type') == 'application/json') {
                        back.data = JSON.parse(xhr.responseText);
                    }
                    back.code = 0;
                    back.msg = '';
                } else {
                    back.msg = '通讯失败！';
                }
                // 回调
                if (typeof func == 'function') func(back);
            } else {
                // console.log('readyState='+xhr.readyState);
            }
        };
        var args = null;
        if (type == 'POST' && data) {
            args = this.getFormData(data);
        }
        if (type == 'GET') {
            url += (url.indexOf('?')>0 ? '&' : '?');
            url += this.getFormArgs(data);
        }
        xhr.open(type, url, !!async);
        if (!!async) {
            xhr.timeout = 30000; // 超时时间，单位是毫秒
        }
        xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
        xhr.withCredentials = true; //支持跨域发送cookies
        xhr.send(args);
        return back;
    },
    isWxMiniProgramEnvironment:function(){
        if (window && window.wx && typeof window.wx.exitMiniProgram === 'function') {
            return true;
        }
        return false;
    },
    ajaxDataWx:function(url, data, type, func) {
        // 微信小程序请求
        wx.request({
            url:url,
            data:data,
            header:{
                "Content-Type":"application/x-www-form-urlencoded"
            },
            method:type,
            dataType:'json',
            success:function(data){
                var back = {code:0, data:data.data, msg:''};
                func(back);
            },
            fail:function(data){
                var back = {code:-1, data:null, msg: data.errMsg};
                func(back);
            },
            complete:function(){
                // console.log('complete', arguments);
            }
        });
    },
    ajaxDataParse:function(data) {
        if (data.code !== 0)
            return data;
        data = data.data;
        return data;
    },
    // 字符串转int
    toInt:function(str) {
        str = Number(str);
        isNaN(str) && (str = 0);
        return str;
    },
    toString:function(str) {
        if (str) {
            return String(str);
        }
        return '';
    },
    toObj:function(str) {
        var result = null;
        try{
            result = JSON.parse(str);
        }catch(e){}
        return result;
    },
    getFormData:function(data) {
        var formData = new FormData();
        if (data) {
            for (var k in data) {
                formData.append(k, data[k]);
            }
        }
        return formData;
    },
    getFormArgs:function(data) {
        var result = '';
        if (data) {
            var i = 0;
            for (var k in data) {
                var v = data[k];
                if (i>0) {
                    k = '&'+k;
                }
                i++;
                result += k+'='+encodeURIComponent(v);
            }
        }
        return result;
    },
    // 由于发布到某些平台cookie搞不定 所以自定义参数代替cookie 由此封装一个请求
    addCookieArgs: function(args) {
        if (this.autoAddCookieType && this.autoAddCookieObj[this.autoAddCookieType]) {
            var obj = this.autoAddCookieObj[this.autoAddCookieType];
            for (var k in obj) {
                args[k] = obj[k];
            }
        }
        return args;
    },
    setCookieArgs: function(type, args) {
        this.autoAddCookieObj[type] = args;
    },
    setCookieType: function(type) {
        this.autoAddCookieType = type;
    },
    getCookieArgs: function(type) {
        return this.autoAddCookieObj[type];
    },
    callbackInit(callback){
        if (typeof callback === 'function')
            return callback;
        return function(){};
    },
    lTrim(str){
        return this.toString(str).replace(/(^\s*)/g, "");
    },
    rTrim(str){
        return this.toString(str).replace(/(\s*$)/g, "");
    },
    Trim(str){
        return this.toString(str).replace(/(^\s*)|(\s*$)/g, "");
    },
    gblen(str) {
        str = this.toString(str);
        var charlen = arguments[0]?arguments[0]:2;
        var len = 0;
            for (var i=0; i<str.length; i++) {
                if (this.charCodeAt(i)>127 || this.charCodeAt(i)==94) {
                    len += charlen;
                } else {
                    len ++;
                }
            }
        return len;
    },
    // 去除数组重复值
    uniqueArray(arr) {
        if (arr.length < 1)
            return [];
        var need = arr.join(':0,')+':0';
        eval('need={'+need+'};');
        var back = [];
        for (var k in need) {
            back.push(k);
        }
        return back;
    },
    // 判断值是否存在于数组中
    inArray(key, arr) {
        for (var i=0; i < arr.length; i++) {
            if (key === arr[i]) return true;
        }
        return false;
    },
    // 根据type, id 获取或设置缓存内容 callback=操作结束后回调的方法
    cacheContent(type, id, content, callback) {
        if (typeof content === 'function' && callback === undefined) {
            callback = content;
            content = undefined;
        }
        type = this.toString(type);
        id = this.toString(id);
        if (!type || !id) {
            return callback(this.backFormat(1, '类型和id必须存在'));
        }
        callback = this.callbackInit(callback);
        var browserType = cc.sys.browserType;
        var browserLists = {
            // 微信小游戏环境
            'WxGame': [cc.sys.BROWSER_TYPE_WECHAT_GAME]
        };
        for (var k in browserLists) {
            if (this.inArray(browserType, browserLists[k])) {
                var _this = this;
                return _this['cacheContent'+k](type, id, content, callback);
            }
        }
        return this.cacheContentH5(type, id, content, callback);
    },
    // 基于微信小游戏环境 根据type, id 获取或设置缓存内容
    cacheContentWxGame(type, id, content, callback) {
        var errBack = undefined;
        var key = type+'_'+id;
        var keyAdd = 'cacheContentWxGame';
        var data = {key:keyAdd, type:type, id:id};
        var filePath = wx.env.USER_DATA_PATH+'/cacheContentWxGame/'+type +'/'+key;
        var encoding = 'utf8';
        var fs = wx.getFileSystemManager();
        var _this = this;
        if (content === undefined) {
            // 获取 这里异步
            fs.readFile({filePath:filePath, encoding:encoding, complete:function(res){
                var back = _this.WX_errMsgFormat(res.errMsg);
                if (back.code !== 0) return callback(back);
                try {
                    var dataSave = JSON.parse(res.data);
                    data.content = dataSave.content;
                    var keyVerify = hex_md5(JSON.stringify(data));
                    if (keyVerify === dataSave.key) {
                        return callback(_this.backFormat(0, '', dataSave.content));
                    }
                } catch(e) {
                    return callback(_this.backFormat(1, e.message));
                }
                return callback(_this.backFormat(2, '未知错误'));
            }});
            // 这是获取 不再往下执行
            return false;
        }
        // 设置
        data.content = content;
        var keyVerify = hex_md5(JSON.stringify(data));
        var dataSave = {key:keyVerify, content:content};
        // console.log(filePath);
        // 真尼玛逗比 微信开发者工具不能多级目录直接写文件 那就创建文件夹吧
        var dirPath = filePath.match(/(^.*)\//)[1];
        _this.WX_mkDir(fs, wx.env.USER_DATA_PATH, dirPath, function(back){
            if (back.code !== 0) return callback(back);
            fs.writeFile({filePath:filePath, encoding:encoding, data:JSON.stringify(dataSave), complete:function(res){
                var back = _this.WX_errMsgFormat(res.errMsg);
                if (back.code === 0) return callback(_this.backFormat(0, '', content));
                return callback(back);
            }});
        });
    },
    // 基于h5环境 根据type, id 获取或设置缓存内容
    cacheContentH5(type, id, content, callback) {
        var key = type+'_'+id;
        var keyAdd = 'cacheContentH5';
        var data = {key:keyAdd, type:type, id:id};
        if (content === undefined) {
            // 获取
            // try {
                var dataSave = JSON.parse(cc.sys.localStorage.getItem(key));
                dataSave = dataSave || {};
                data.content = dataSave.content;
                var keyVerify = hex_md5(JSON.stringify(data));
                if (keyVerify === dataSave.key) {
                    return callback(this.backFormat(0, '', dataSave.content));
                }
            // } catch(e) {
            //     return callback(this.backFormat(1, e.message));
            // }
            return callback(this.backFormat(2, '未知错误'));
        }
        // 设置
        data.content = content;
        var keyVerify = hex_md5(JSON.stringify(data));
        var dataSave = {key:keyVerify, content:content};
        cc.sys.localStorage.setItem(key, JSON.stringify(dataSave));
        return callback(this.backFormat(0, '', content));
    },
    backFormat(code, msg, data, back) {
        if (back === undefined) {
            back = {};
        }
        back.code = code;
        back.msg = msg;
        back.data = data;
        return back;
    },
    // 获取当前运行环境 WxGame|H5
    getBrowserType() {
        var browserType = cc.sys.browserType;
        var browserLists = {
            // 微信小游戏环境
            'WxGame': [cc.sys.BROWSER_TYPE_WECHAT_GAME]
        };
        for (var k in browserLists) {
            if (this.inArray(browserType, browserLists[k])) {
                return k;
            }
        }
        return 'H5';
    },
    arrayBufferToStr(arraybuffer) {
        return String.fromCharCode.apply(null, new Uint8Array(arraybuffer));
    },
    // 根据 url type 异步获取url内容 返回base64后的arraybuffer
    getOctetStreamByUrl(url, type, callback) {
        var browserType = this.getBrowserType();
        var _this = this;
        _this['getOctetStreamByUrl'+browserType](url, type, callback);
    },
    // 根据 url type 异步获取url内容 H5
    getOctetStreamByUrlH5(url, type, callback) {
        var _this = this;
        type = type || 'application/octet-stream';
        var xhr = window.XMLHttpRequest ? new window.XMLHttpRequest() : new ActiveXObject('MSXML2.XMLHTTP');
        var errInfo = 'Load '+type+' file failed: ' + url;
        function errBack(item) {
            var status = item.status;
            var msg = item.errorMessage;
            callback(_this.backFormat(1, msg, {status:status}));
        }
        xhr.open('GET', url, true);
        xhr.overrideMimeType(type);
        xhr.responseType = "arraybuffer";
        xhr.onload = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 0) {
                    var str = Base64.fromArrayBuffer(xhr.response);
                    callback(_this.backFormat(0, '', str));
                }
                else {
                    errBack({status:xhr.status, errorMessage:errInfo + '(wrong status)'});
                }
            }
            else {
                errBack({status:xhr.status, errorMessage:errInfo + '(wrong readyState)'});
            }
        };
        xhr.onerror = function(){
            errBack({status:xhr.status, errorMessage:errInfo + '(error)'});
        };
        xhr.ontimeout = function(){
            errBack({status:xhr.status, errorMessage:errInfo + '(time out)'});
        };
        xhr.send(null);
    },
    getOctetStreamByUrlWxGame:function(url, type, callback) {
        var _this = this;
        type = type || 'application/octet-stream';
        function errBack(code, msg, data) {
            callback(_this.backFormat(code, msg, data));
        }
        // 微信小程序请求
        wx.request({
            url:url,
            data:'',
            header:{
                "Content-Type":type
            },
            method:'GET',
            dataType:'json',
            responseType:'arraybuffer',
            success:function(data){
                var str = Base64.fromArrayBuffer(data.data);
                errBack(0, '', str);
            },
            fail:function(data){
                errBack(1, data.errMsg);
            },
            complete:function(){
                // console.log('complete', arguments);
            }
        });
    },
    // 根据 url 获取url内容
    getUrlCacheContent(type, url, cache, callback) {
        var _this = this;
        type = type ? type : 'urlCache';
        var backAdd = {url:url, type:type};
        var id = hex_md5(url);
        // 这里cache的都是base64的内容
        function callbackSuccess(data) {
            data.dataBase64 = data.data;
            data.data = _this.arrayBufferToStr(Base64.toArrayBuffer(data.data));
            callback(data);
        }
        if (cache) {
            this.cacheContent(type, id, function(data){
                if (data.code === 0) {
                    return callbackSuccess(_this.backFormat(0, '', data.data, backAdd));
                }
                return _this.getUrlCacheContent(type, url, false, callback);
            });
            return false;
        }
        // 从服务器获取
        _this.getOctetStreamByUrl(url, '', function(data){
            if (data.code !== 0) return callback(data);
            var content = data.data;
            // 加载成功 cache
            _this.cacheContent(type, id, content, function(data){
                if (data.code === 0) {
                    return callbackSuccess(_this.backFormat(0, '', data.data, backAdd));
                }
                return callback(_this.backFormat(1, data.msg, '', backAdd));
            });
        });
    },
    WX_errMsgFormat(errMsg) {
        if (errMsg.match(/^[^\:]+:ok$/)) {
            return this.backFormat(0, errMsg);
        }
        return this.backFormat(1, errMsg);
    },
    WX_mkDir(fs, pathPre, path, callback) {
        var _this = this;
        path = path.replace(/\/$/, '');
        if (path == pathPre) return callback(_this.backFormat(0, '', path));
        // 微信文件系统的mkdir 真尼玛逗比文档描述于实际不符recursive参数就是废柴 版本已经最新
        var pathReal = path.replace(new RegExp("^"+pathPre), '');
        var pathFirst = pathPre + _this.toString(pathReal.match(/^\/[^\/]+/)[0]);
        fs.access({path:pathFirst, complete:function(res){
            var back = _this.WX_errMsgFormat(res.errMsg);
            if (back.code === 0) return _this.WX_mkDir(fs, pathFirst, path, callback);
            return fs.mkdir({dirPath:pathFirst, recursive:true, complete:function(res){
                var back = _this.WX_errMsgFormat(res.errMsg);
                if (back.code === 0) return _this.WX_mkDir(fs, pathFirst, path, callback);
                // 创建文件夹失败
                return callback(_this.backFormat(1, back.msg, [path, pathFirst]));
            }});
        }});
    },
    loadWebStart(name, sceneObj, web, callback) {
        callback = this.callbackInit(callback);
        var back = this.backFormat(0, '', sceneObj);
        // 这里 web直接传递 就不用require了
        if (!web[name]) {
            return callback(back);
        }
        // properties节点复制到根节点
        // if (web[name]['properties']) {
        //     var newScript = cc.Class(web[name]);
        //     console.log(newScript);
        //     for (var k in web[name]['properties']) {
        //         web[name][k] = newScript[k];
        //     }
        // }
        // 应用所有节点
        for (var action in web[name]) {
            sceneObj[action] = web[name][action];
        }
        // 再次激活当前节点 使覆盖的方法生效 除了onLoad 因为所有方法在onLoad中重写
        var activeOld = sceneObj.node.active;
        if (activeOld) {
            sceneObj.node.active = false;
            sceneObj.node.active = activeOld;
        }
        return callback(back);
    }
};