var PublicFunc = require('./PublicFunc');
var vm = require('./vm');
var versionUrl = 'http://192.168.83.197:9504/cocosfile/HelloWorld/remote-assets/version.manifest';
var _this;
var versionCachePre = 'versionCachePre';
var versionACacheKey = 'versionA:'+versionUrl;
var versionInfo = {};
var webAssetsList = {};
cc.Class({
    extends: cc.Component,

    properties: {
    },

    // 所有组件onload 完毕后才会执行start 所以所有方法应该写在start 但之前都写在onload了 就先不改了
    onLoad () {
		_this = this;
		window.chongqi = _this.chongqi;
		this.loadMainJs(function(data){
			// 这里一定是成功加载完成
			// web端重启游戏
			console.log('chongqi');
		});
	},
	
	chongqi(){
		console.log('chong qi click.');
		PublicFunc.cacheContent(versionCachePre, 'src/settings.js', function(data){
			console.log(data);
			if (data.code === 0) {
				PublicFunc.getUrlCacheContent(versionCachePre, data.data.url, true, function(data){
					console.log(data);
					_this.runInContextReal(data.data);
					_this.onloadBoot(window._CCSettings);
					return true;
				});
			}
		});
		// cc.game.restart();
	},

	onloadBoot(settings) {
		_this.replaceCC();
		if (window.boot) {
			window.boot();
			return true;
		}
		window.onload();
		cc.director.loadScene(settings.launchScene);
	},

	replaceCC(){
		var mapOld = cc.loader.downloader.extMap;
		cc.loader.downloader.extMap = {};
		var mapNew = {};
		for (var k in mapOld) {
			mapNew[k] = function(item, callback) {
				var name = item.url;
				if (!name || !webAssetsList[name]) {
					return mapOld[k](item, callback);
				}
				// 从缓存取资源
				callback(null, webAssetsList[name].content);
			};
		}
		cc.loader.downloader.addHandlers(mapNew);
	},

    // start () {},

    // update (dt) {},
    
    // 获取主配置文件 主配置文件只能有一个
    loadMainJs(callbackSuccess) {
		_this.checkUpdate(function(data){
			if (data.code === 0) {
				_this.downloadUpdate(data.data.update, function(data){
					callbackSuccess(data);
				});
				return false;
			}
			return callbackSuccess(data);
		});
	},
	
	// 检测更新
	checkUpdate(callbackSuccess) {
		cc.loader.release(versionUrl);
		PublicFunc.cacheContent(versionCachePre, versionACacheKey, function(data){
			var versionA = '0';
			if (data.code === 0) {
				versionA = data.data.version;
			}
			_this.updateSceneInfo('', '当前版本:'+versionA);
			PublicFunc.getUrlCacheContent(versionCachePre, versionUrl, false, function(data){
				if (data.code !== 0) {
					_this.updateSceneInfo(versionUrl, data.msg, true);
					return false;
				}
				var info = JSON.parse(data.data);
				if (!info) {
					_this.updateSceneInfo(versionUrl, '格式错误', true);
					return false;
				}
				versionInfo = info;
				var versionB = info.version;
				_this.updateSceneInfo('', '最新版本:'+versionB);
				PublicFunc.cacheContent(versionCachePre, versionACacheKey, info, function(){
					callbackSuccess(PublicFunc.backFormat(0, '', {update:versionA!==versionB}));
				});
				return true;
			});
		});
	},
	// 更新 就是是否从缓存取数据
	downloadUpdate(update, callbackSuccess) {
		var cache = !update;
		if (versionInfo.version === undefined) {
			_this.updateSceneInfo(versionUrl, '未知版本', true);
			return false;
		}
		PublicFunc.getUrlCacheContent(versionCachePre, versionInfo.remoteManifestUrl, cache, function(data){
			if (data.code !== 0) {
				_this.updateSceneInfo(versionInfo.remoteManifestUrl, data.msg, true);
				return false;
			}
			var info = JSON.parse(data.data);
			if (!info) {
				_this.updateSceneInfo(versionInfo.remoteManifestUrl, '格式错误', true);
				return false;
			}
			function loadSuccess() {
				_this.updateSceneInfo('', '资源加载完成');
				return callbackSuccess(PublicFunc.backFormat(0, ''));
			}
			var actions = [];
			for (var k in info.assets) {
				var item = info.assets[k];
				item.name = k;
				item.url = info.packageUrl + k;
				actions.push(item);
			}
			var length = actions.length;
			function loadSelf(key) {
				if (key >= length) {
					return loadSuccess();
				}
				_this.cacheItemByAsset(actions[key], cache, function(data){
					if (data.code !== 0) {
						_this.updateSceneInfo(actions[key].url, data.msg, true);
						return false;
					}
					loadSelf(++key);
				});
			}
			loadSelf(0);
		});
	},

	cacheItemByAsset(item, cache, callback) {
		// item={name,url,size,md5} 这特么md5的是文件 不是内容
		// 先缓存url 再缓存对象
		PublicFunc.getUrlCacheContent(versionCachePre, item.url, cache, function(data){
			if (data.code !== 0) return callback(data);
			PublicFunc.cacheContent(versionCachePre, item.name, item, function(data){
				item.content = data.data;
				webAssetsList[item.name] = item;
				callback(data);
			});
		});
	},

    // 根据 fileName process 更新加载界面信息显示
    updateSceneInfo(fileName, process, btnShow) {
        this.node.getChildByName('fileName').getComponent('cc.Label').string = fileName;
        this.node.getChildByName('processName').getComponent('cc.Label').string = process;
        if (btnShow) {
            this.node.getChildByName('reload').active = true;
        } else {
            this.node.getChildByName('reload').active = false;
        }
	},
	
    // runInContext
    runInContextReal(str) {
		var obj = {
			window:window
		};
		return vm.runInContext(str, vm.createContext(obj));
    },
	
});
