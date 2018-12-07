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
		console.log('onload homes');
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
		_this.onloadJsFromCache('src/settings.js', function(){
			return _this.onloadBoot(window._CCSettings);
		});
		// cc.game.restart();
	},

	// 加载js
	onloadJsFromCache(name, callback) {
		PublicFunc.cacheContent(versionCachePre, name, function(data){
			if (data.code === 0) {
				PublicFunc.getUrlCacheContent(versionCachePre, data.data.url, true, function(data){
					_this.runInContextReal(data.data);
					callback(data);
					return true;
				});
			}
		});
	},

	onloadBoot(settings) {
		_this.replaceCC(settings);
		cc.game._prepared = false;
		var bootReal = function(){
			var settings = window._CCSettings;
			window._CCSettings = undefined;

			if ( !settings.debug ) {
				var uuids = settings.uuids;

				var rawAssets = settings.rawAssets;
				var assetTypes = settings.assetTypes;
				var realRawAssets = settings.rawAssets = {};
				for (var mount in rawAssets) {
					var entries = rawAssets[mount];
					var realEntries = realRawAssets[mount] = {};
					for (var id in entries) {
						var entry = entries[id];
						var type = entry[1];
						// retrieve minified raw asset
						if (typeof type === 'number') {
							entry[1] = assetTypes[type];
						}
						// retrieve uuid
						realEntries[uuids[id] || id] = entry;
					}
				}

				var scenes = settings.scenes;
				for (var i = 0; i < scenes.length; ++i) {
					var scene = scenes[i];
					if (typeof scene.uuid === 'number') {
						scene.uuid = uuids[scene.uuid];
					}
				}

				var packedAssets = settings.packedAssets;
				for (var packId in packedAssets) {
					var packedIds = packedAssets[packId];
					for (var j = 0; j < packedIds.length; ++j) {
						if (typeof packedIds[j] === 'number') {
							packedIds[j] = uuids[packedIds[j]];
						}
					}
				}
			}

			function setLoadingDisplay () {
				// Loading splash scene
				var splash = document.getElementById('splash');
				var progressBar = splash.querySelector('.progress-bar span');
				cc.loader.onProgress = function (completedCount, totalCount, item) {
					var percent = 100 * completedCount / totalCount;
					if (progressBar) {
						progressBar.style.width = percent.toFixed(2) + '%';
					}
				};
				splash.style.display = 'block';
				progressBar.style.width = '0%';

				cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () {
					splash.style.display = 'none';
				});
			}

			var onStart = function () {
				cc.loader.downloader._subpackages = settings.subpackages;

				cc.view.enableRetina(true);
				cc.view.resizeWithBrowserSize(true);

				if (!false && !false) {
					if (cc.sys.isBrowser) {
						setLoadingDisplay();
					}

					if (cc.sys.isMobile) {
						if (settings.orientation === 'landscape') {
							cc.view.setOrientation(cc.macro.ORIENTATION_LANDSCAPE);
						}
						else if (settings.orientation === 'portrait') {
							cc.view.setOrientation(cc.macro.ORIENTATION_PORTRAIT);
						}
						cc.view.enableAutoFullScreen([
							cc.sys.BROWSER_TYPE_BAIDU,
							cc.sys.BROWSER_TYPE_WECHAT,
							cc.sys.BROWSER_TYPE_MOBILE_QQ,
							cc.sys.BROWSER_TYPE_MIUI,
						].indexOf(cc.sys.browserType) < 0);
					}

					// Limit downloading max concurrent task to 2,
					// more tasks simultaneously may cause performance draw back on some android system / browsers.
					// You can adjust the number based on your own test result, you have to set it before any loading process to take effect.
					if (cc.sys.isBrowser && cc.sys.os === cc.sys.OS_ANDROID) {
						cc.macro.DOWNLOAD_MAX_CONCURRENT = 2;
					}
				}

				// init assets
				cc.AssetLibrary.init({
					libraryPath: 'res/import',
					rawAssetsBase: 'res/raw-',
					rawAssets: settings.rawAssets,
					packedAssets: settings.packedAssets,
					md5AssetsMap: settings.md5AssetsMap
				});

				var launchScene = settings.launchScene;

				// load scene
				cc.director.loadScene(launchScene, null,
					function () {
						if (cc.sys.isBrowser) {
							// show canvas
							var canvas = document.getElementById('GameCanvas');
							canvas.style.visibility = '';
							var div = document.getElementById('GameDiv');
							if (div) {
								div.style.backgroundImage = '';
							}
						}
						cc.loader.onProgress = null;
						console.log('Success to load scene: ' + launchScene);
					}
				);
			};

			// jsList
			var jsList = settings.jsList;

			if (false) {
				BK.Script.loadlib();
			}
			else {
				var bundledScript = settings.debug ? 'src/project.dev.js' : 'src/project.js';
				if (jsList) {
					jsList = jsList.map(function (x) {
						return 'src/' + x;
					});
					jsList.push(bundledScript);
				}
				else {
					jsList = [bundledScript];
				}
			}

			// anysdk scripts
			if (cc.sys.isNative && cc.sys.isMobile) {
				jsList = jsList.concat(['src/anysdk/jsb_anysdk.js', 'src/anysdk/jsb_anysdk_constants.js']);
			}

			var option = {
				id: 'GameCanvas',
				scenes: settings.scenes,
				debugMode: settings.debug ? cc.debug.DebugMode.INFO : cc.debug.DebugMode.ERROR,
				showFPS: !false && settings.debug,
				frameRate: 60,
				jsList: jsList,
				groupList: settings.groupList,
				collisionMatrix: settings.collisionMatrix,
			}

			cc.game.run(option, onStart);
		};
		window.boot = window.boot || bootReal;
		window.boot();
	},

	replaceCC(settings){
		// packedAssets 的处理
		if (settings && settings.packedAssets) {
			var PackDownloader = cc.Pipeline.Downloader.PackDownloader;
			PackDownloader.initPacks(settings.packedAssets);
			var _loadNewPackOld = PackDownloader._loadNewPack;
			function error (uuid, packUuid) {
				return new Error('Can not retrieve ' + uuid + ' from packer ' + packUuid);
			}
			function _loadNewPackNew(uuid, packUuid, callback) {
				var packUrl = cc.AssetLibrary.getLibUrlNoExt(packUuid) + '.json';
				if (!webAssetsList[packUrl]) {
					return _loadNewPackOld(uuid, packUuid, callback);
				}
				var packJson = webAssetsList[packUrl].content;
				// var res = _doLoadNewPack.call(PackDownloader, uuid, packUuid, packJson);
				var res = PackDownloader._doLoadNewPack(uuid, packUuid, packJson);
				if (res) {
					callback(null, res);
				}
				else {
					callback(error(uuid, packUuid));
				}
			};
			PackDownloader._loadNewPack = _loadNewPackNew;
			cc.Pipeline.Downloader.PackDownloader = PackDownloader;
		}
		// 请求资源的处理
		_this.extMapReplace();
	},

    // start () {},

    // update (dt) {},
    
    // 获取主配置文件 主配置文件只能有一个
    loadMainJs(callbackSuccess) {
		_this.checkUpdate(function(data){
			if (data.code === 0) {
				_this.downloadUpdate(data.data.update, function(data){
					if (data.code !== 0) {
						callbackSuccess(data);
						return false;
					}
					PublicFunc.cacheContent(versionCachePre, versionACacheKey, versionInfo, function(){
						callbackSuccess(data);
					});
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
				callbackSuccess(PublicFunc.backFormat(0, '', {update:versionA!==versionB}));
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
			PublicFunc.cacheContent(versionCachePre, item.name, item, function(){
				item.content = data.data;
				item.contentBase64 = data.dataBase64;
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
			window:window,
			cc:cc,
			__require:window.__require
		};
		var result = vm.runInContext(str, vm.createContext(obj));
		console.log(result);
		return result;
    },
	

	// cc.loader.downloader.extMap 类型很多
	extMapReplace() {
		// 根据item获取地址uuid或id
		function getContent(item) {
			var action = item.type || 'default';
			var name = item.id;
			if (action === 'uuid') name = item.uuid;
			return webAssetsList[name].content;
		};
		function getContentBase64(item) {
			var action = item.type || 'default';
			var name = item.id;
			if (action === 'uuid') name = item.uuid;
			return webAssetsList[name].contentBase64;
		};
		// JS
		function downloadScript(item, callback, isAsync) {
			var url = item.url,
				d = document,
				s = document.createElement('script');
			s.async = isAsync;
			s.src = versionInfo.packageUrl+url;
			function loadHandler () {
				s.parentNode.removeChild(s);
				s.removeEventListener('load', loadHandler, false);
				s.removeEventListener('error', errorHandler, false);
				callback(null, url);
			}
			function errorHandler() {
				s.parentNode.removeChild(s);
				s.removeEventListener('load', loadHandler, false);
				s.removeEventListener('error', errorHandler, false);
				callback(new Error(debug.getError(4928, url)));
			}
			s.addEventListener('load', loadHandler, false);
			s.addEventListener('error', errorHandler, false);
			d.body.appendChild(s);
		};
		// 图片类 images=downloadImage
		function downloadImage(item, callback, isCrossOrigin, img) {
			if (isCrossOrigin === undefined) {
				isCrossOrigin = true;
			}
			// url 是base64后的内容
			var url = 'data:image/'+item.type+';base64,'+getContentBase64(item);
			img = img || new Image();
			if (isCrossOrigin && window.location.protocol !== 'file:') {
				img.crossOrigin = 'anonymous';
			}
			else {
				img.crossOrigin = null;
			}
		
			if (img.complete && img.naturalWidth > 0 && img.src === url) {
				return img;
			}
			else {
				function loadCallback () {
					img.removeEventListener('load', loadCallback);
					img.removeEventListener('error', errorCallback);
		
					img.id = item.id;
					callback(null, img);
				}
				function errorCallback () {
					img.removeEventListener('load', loadCallback);
					img.removeEventListener('error', errorCallback);
		
					// Retry without crossOrigin mark if crossOrigin loading fails
					// Do not retry if protocol is https, even if the image is loaded, cross origin image isn't renderable.
					if (window.location.protocol !== 'https:' && img.crossOrigin && img.crossOrigin.toLowerCase() === 'anonymous') {
						downloadImage(item, callback, false, img);
					}
					else {
						callback(new Error(debug.getError(4930, url)));
					}
				}
		
				img.addEventListener('load', loadCallback);
				img.addEventListener('error', errorCallback);
				img.src = url;
			}
		};
		// Audio
		function downloadAudio(item, callback) {
			var debug = cc.debug;
			var __audioSupport = cc.sys.__audioSupport;
			var formatSupport = __audioSupport.format;
			var context = __audioSupport.context;
			function loadDomAudio(item, callback){
				var dom = document.createElement('audio');
				dom.src = 'data:video/'+item.type+';base64,'+getContentBase64(item);

				if (CC_WECHATGAME) {
					callback(null, dom);
					return;
				}

				var clearEvent = function () {
					clearTimeout(timer);
					dom.removeEventListener("canplaythrough", success, false);
					dom.removeEventListener("error", failure, false);
					if(__audioSupport.USE_LOADER_EVENT)
						dom.removeEventListener(__audioSupport.USE_LOADER_EVENT, success, false);
				};
				var timer = setTimeout(function () {
					if (dom.readyState === 0)
						failure();
					else
						success();
				}, 8000);
				var success = function () {
					clearEvent();
					callback(null, dom);
				};
				var failure = function () {
					clearEvent();
					var message = 'load audio failure - ' + item.url;
					cc.log(message);
					callback(message);
				};
				dom.addEventListener("canplaythrough", success, false);
				dom.addEventListener("error", failure, false);
				if(__audioSupport.USE_LOADER_EVENT)
					dom.addEventListener(__audioSupport.USE_LOADER_EVENT, success, false);
			};
			function loadWebAudio(item, callback){
				if (!context)
					callback(new Error(debug.getError(4926)));
				callback(null, Base64.toArrayBuffer(getContent(item)));
			};
			if (formatSupport.length === 0) {
				return new Error(debug.getError(4927));
			}
		
			var loader;
			if (!__audioSupport.WEB_AUDIO) {
				// If WebAudio is not supported, load using DOM mode
				loader = loadDomAudio;
			}
			else {
				var loadByDeserializedAudio = item._owner instanceof cc.AudioClip;
				if (loadByDeserializedAudio) {
					loader = (item._owner.loadMode === cc.AudioClip.LoadMode.WEB_AUDIO) ? loadWebAudio : loadDomAudio;
				}
				else {
					loader = (item.urlParam && item.urlParam['useDom']) ? loadDomAudio : loadWebAudio;
				}
			}
			loader(item, callback);
		};
		// Txt
		function downloadText(item, callback) {
			// 从缓存取资源
			callback(null, getContent(item));
		};
		// Deserializer
		function downloadUuid(item, callback) {
			var PackDownloader = cc.Pipeline.Downloader.PackDownloader;
			var result = PackDownloader.load(item, callback);
			if (result === undefined) {
				return downloadText(item, callback);
			}
			return result || undefined;
		};
		// Binary
		function downloadBinary(item, callback) {
			callback(null, new Uint8Array(Base64.toArrayBuffer(getContentBase64(item))));
		};

		var mapOld = cc.loader.downloader.extMap;
		mapOld.extMap = mapOld;
		cc.loader.downloader.extMap = {};
		var mapNewFunc = {
			// JS
			'js' : downloadScript,

			// Images
			'png' : downloadImage,
			'jpg' : downloadImage,
			'bmp' : downloadImage,
			'jpeg' : downloadImage,
			'gif' : downloadImage,
			'ico' : downloadImage,
			'tiff' : downloadImage,
			'webp' : downloadImage,
			'image' : downloadImage,
		
			// Audio
			'mp3' : downloadAudio,
			'ogg' : downloadAudio,
			'wav' : downloadAudio,
			'm4a' : downloadAudio,
		
			// Txt
			'txt' : downloadText,
			'xml' : downloadText,
			'vsh' : downloadText,
			'fsh' : downloadText,
			'atlas' : downloadText,
		
			'tmx' : downloadText,
			'tsx' : downloadText,
		
			'json' : downloadText,
			'ExportJson' : downloadText,
			'plist' : downloadText,
		
			'fnt' : downloadText,

			// Deserializer
			'uuid' : downloadUuid,
		
			// Binary
			'binary' : downloadBinary,
		
			'default' : downloadText
		};
		var mapNew = {};
		for (var k in mapOld) {
			mapNew[k] = function(item){
				var action = item.type || 'default';
				var name = item.id;
				if (action === 'uuid') name = item.uuid;
				if (mapNewFunc[action]) {
					return mapNewFunc[action](arguments[0], arguments[1], arguments[2], arguments[3]);
				}
				mapOld[action](arguments[0], arguments[1], arguments[2], arguments[3]);
			};
		}
		cc.loader.downloader.addHandlers(mapNew);
	}
});
