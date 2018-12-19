import {hex_md5} from './md5.js';
import {Base64} from './base64.js';
module.exports = {
    toString:function(str) {
        if (str) {
            return String(str);
        }
        return '';
    },
    callbackInit(callback){
        if (typeof callback === 'function')
            return callback;
        return function(){};
    },
    Trim(str){
        return this.toString(str).replace(/(^\s*)|(\s*$)/g, "");
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
        // 有些要创建文件 所以id里面不能有/-等特殊字符
        id = id.replace(/(\/|-)/g, "_");
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
    // WxDevTools 于 H5一样
    cacheContentWxDevTools(){
        this.cacheContentH5.apply(this, arguments);
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
    // 获取当前运行环境 WxGame|H5|WxDevTools
    getBrowserType() {
        // WxDevTools
        if (window.wx && window.wx.env && window.wx.env.USER_DATA_PATH === 'http://usr') {
            return 'WxDevTools';
        }
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
    getOctetStreamByUrlWxDevTools(){
        this.getOctetStreamByUrlWxGame.apply(this, arguments);
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
    }
};