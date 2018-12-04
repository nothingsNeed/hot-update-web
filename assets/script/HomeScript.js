var PublicFunc = require('./PublicFunc');
var vm = require('./vm');
var web = require('./web');
var _this;
cc.Class({
    extends: cc.Component,

    properties: {
        // foo: {
        //     // ATTRIBUTES:
        //     default: null,        // The default value will be used only when the component attaching
        //                           // to a node for the first time
        //     type: cc.SpriteFrame, // optional, default is typeof default
        //     serializable: true,   // optional, default is true
        // },
        // bar: {
        //     get () {
        //         return this._bar;
        //     },
        //     set (value) {
        //         this._bar = value;
        //     }
        // },
    },

    // 所有组件onload 完毕后才会执行start 所以所有方法应该写在start 但之前都写在onload了 就先不改了
    onLoad () {
		throw "debug";
        _this = this;
        return _this.test(1);
        this.updateSceneInfo('', '');
        this.loadMainJs(function(){
            // 所有数据加载完毕 进入主界面
            PublicFunc.loadWebStart('HomeSceneScript', _this, web, function(data){
                return _this.test(data);
                return PublicFunc.callbackInit(data.data.onLoadCallback)(data);
            });
        });
    },

    testpre() {
        var old = cc.director._getSceneUuid;
        cc.director._getSceneUuid = function(){
            var back = old.apply(cc.director, arguments);
            if (back !== null) {
                return back;
            }
            // null  name不存在

        };
    },

    test(data) {
        var str = this.someStr();
        cc.loader.loadRes('LoginPage.prefab', function(){
            console.log(arguments);
            cc.director.loadScene('LoginPage');
        });
        return false;
        console.log(this, _this, data);
        cc.director.loadScene('loginScene');
        // cc.director.loadScene('LoginSceneScript');
    },

    // start () {},

    // update (dt) {},
    
    // 获取主配置文件 主配置文件只能有一个
    loadMainJs(callbackSuccess) {
        var url = 'http://192.168.83.197:9501/static/main.js';
        cc.loader.release(url);
        PublicFunc.getUrlCacheContent('config', url, false, function(data){
            if (data.code !== 0) {
                return _this.updateSceneInfo(data.url, data.msg, true);
            }
            var data = JSON.parse(data.data);
            for (var k in data) {
                Global[k] = data[k];
            }
            _this.getMainJsAssets(function(content){
                _this.loadMainJsAssets(content, function(){
                    // 所有数据加载完毕
                    callbackSuccess();
                });
            });
        });
    },


    // 根据 主配置资源url获取要加载资源url的内容
    getMainJsAssets(callbackSuccess, goto) {
        var url = Global.urlAssets;
        _this.updateSceneInfo(url, '加载配置文件');
        var type = 'assets';
        var id = hex_md5(url);
        if (Global.cacheAssets && goto === undefined) {
            PublicFunc.cacheContent(type, id, function(back){
                if (back.code === 0) {
                    var data = back.data;
                    if (data.version === Global.version) {
                        return callbackSuccess(data.content);
                    }
                }
                // 从服务器获取资源 只要assets文件重新加载 其他文件均需要重新加载
                Global.cacheAssets = false;
                return _this.getMainJsAssets(callbackSuccess, 'cache');
            });
            return false;
        }
        // 不缓存 从服务器获取资源
        if (!Global.cacheAssets || goto === 'cache') {
            return PublicFunc.getUrlCacheContent('config', Global.urlAssets, false, function(data){
                if (data.code === 0) {
                    // 缓存结果
                    return PublicFunc.cacheContent(type, id, {version:Global.version, content:data.data}, function(back){
                        if (back.code === 0) return callbackSuccess(back.data.content);
                        return _this.updateSceneInfo(data.url, back.msg, true);
                    });
                }
                return _this.updateSceneInfo(url, data.msg, true);
            });
        }
    },
    // 根据 主配置资源url的内容加载所有资源
    loadMainJsAssets(content, callbackSuccess) {
        function loadSuccess() {
            _this.updateSceneInfo('', '资源加载完成');
            return callbackSuccess();
        }
        var urlAssets = _this.runInContextReal(content);
        var actions = urlAssets.actions;
        var length = actions.length;
        function loadSelf(key) {
            if (key >= length) {
                return loadSuccess();
            }
            if (typeof _this[actions[key]] === 'function') {
                return _this[actions[key]](urlAssets.lists[actions[key]], urlAssets, function(){
                    loadSelf(++key);
                });
            }
            loadSelf(++key);
        }
        loadSelf(0);
    },
    // 根据配置文件的一个item处理这个item

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

    // 赋值 windows 变量
    windowProperty(list, objs, callbackSuccess) {
        for( var i=0; i<list.length; i++) {
            var key = list[i];
            if (objs[key]) {
                window[key] = objs[key];
            }
        }
        callbackSuccess();
    },

    // 缓存静态资源
    staticAssets(list, objs, callbackSuccess) {
        // 合并所有url
        var listAssets = [];
        for (var i=0; i<list.length; i++) {
            var key = list[i];
            if (objs[key]) {
                listAssets = listAssets.concat(objs[key]);
            }
        }
        var listAssetsLength = listAssets.length;
        function staticAssetsLoad(key){
            if (key >= listAssetsLength) {
                return callbackSuccess();
            }
            // 加载资源
            var url = listAssets[key];
            _this.updateSceneInfo(url, '('+(key+1)+'/'+listAssetsLength+') 正在加载');
            PublicFunc.getUrlCacheContent('staticAssets', url, Global.cacheAssets, function(data){
                if (data.code === 0) {
                    return staticAssetsLoad(++key);
                }
                // 加载出错
                return _this.updateSceneInfo(url, data.msg, true);
            });
        }
        staticAssetsLoad(0);
    },
    
    // 定义全局变量
    webProperty(list, objs, callbackSuccess) {
        // 合并所有url
        var listAssets = [];
        for (var i=0; i<list.length; i++) {
            var key = list[i];
            if (objs[key]) {
                listAssets = listAssets.concat(objs[key]);
            }
        }
        var listAssetsLength = listAssets.length;
        function assetsLoad(key){
            if (key >= listAssetsLength) {
                return callbackSuccess();
            }
            // 加载资源
            var url = '';
            for (var name in listAssets[key]) {
                url = listAssets[key][name];
            }
            _this.updateSceneInfo(url, '('+(key+1)+'/'+listAssetsLength+') 正在加载');
            PublicFunc.getUrlCacheContent('webProperty', url, Global.cacheAssets, function(data){
                if (data.code === 0) {
                    // 记录本地全局变量
                    web[name] = _this.runInContextReal(data.data, _this.localValue());
                    return assetsLoad(++key);
                }
                // 加载出错
                return _this.updateSceneInfo(url, data.msg, true);
            });
        }
        assetsLoad(0);
    },

    // 这里需要注入一些本地资源
    localValue() {
        return {
            cc:cc,
            window:window,
            // require
            PublicFunc:PublicFunc,
            web:web,
            // 插件
            Alert:Alert,
            hex_md5:hex_md5,
            WebSocket:WebSocket,
            console:console
        };
    },
    // runInContext
    runInContextReal() {
        if (arguments.length > 1 && vm.createContext) {
            arguments[1] = vm.createContext(arguments[1]);
        }
        return vm.runInContext.apply(vm, arguments);
    },

    someStr(){
        return `
        [
            {
              "__type__": "cc.Prefab",
              "_name": "",
              "_objFlags": 0,
              "_native": "",
              "data": {
                "__id__": 1
              },
              "optimizationPolicy": 0,
              "asyncLoadAssets": false
            },
            {
              "__type__": "cc.Node",
              "_name": "LoginPage",
              "_objFlags": 512,
              "_parent": null,
              "_children": [
                {
                  "__id__": 2
                },
                {
                  "__id__": 14
                }
              ],
              "_active": true,
              "_level": 1,
              "_components": [
                {
                  "__id__": 21
                }
              ],
              "_prefab": {
                "__id__": 22
              },
              "_opacity": 255,
              "_color": {
                "__type__": "cc.Color",
                "r": 255,
                "g": 255,
                "b": 255,
                "a": 255
              },
              "_contentSize": {
                "__type__": "cc.Size",
                "width": 480,
                "height": 960
              },
              "_anchorPoint": {
                "__type__": "cc.Vec2",
                "x": 0.5,
                "y": 0.5
              },
              "_position": {
                "__type__": "cc.Vec3",
                "x": 0,
                "y": 0,
                "z": 0
              },
              "_scale": {
                "__type__": "cc.Vec3",
                "x": 1,
                "y": 1,
                "z": 1
              },
              "_rotationX": 0,
              "_rotationY": 0,
              "_quat": {
                "__type__": "cc.Quat",
                "x": 0,
                "y": 0,
                "z": 0,
                "w": 1
              },
              "_skewX": 0,
              "_skewY": 0,
              "_localZOrder": 13,
              "groupIndex": 0,
              "_id": ""
            },
            {
              "__type__": "cc.Node",
              "_name": "New EditBox",
              "_objFlags": 0,
              "_parent": {
                "__id__": 1
              },
              "_children": [
                {
                  "__id__": 3
                },
                {
                  "__id__": 6
                },
                {
                  "__id__": 9
                }
              ],
              "_active": true,
              "_level": 2,
              "_components": [
                {
                  "__id__": 12
                }
              ],
              "_prefab": {
                "__id__": 13
              },
              "_opacity": 255,
              "_color": {
                "__type__": "cc.Color",
                "r": 255,
                "g": 255,
                "b": 255,
                "a": 255
              },
              "_contentSize": {
                "__type__": "cc.Size",
                "width": 320,
                "height": 120
              },
              "_anchorPoint": {
                "__type__": "cc.Vec2",
                "x": 0.5,
                "y": 0.5
              },
              "_position": {
                "__type__": "cc.Vec3",
                "x": 0,
                "y": 120,
                "z": 0
              },
              "_scale": {
                "__type__": "cc.Vec3",
                "x": 1,
                "y": 1,
                "z": 1
              },
              "_rotationX": 0,
              "_rotationY": 0,
              "_quat": {
                "__type__": "cc.Quat",
                "x": 0,
                "y": 0,
                "z": 0,
                "w": 1
              },
              "_skewX": 0,
              "_skewY": 0,
              "_localZOrder": 14,
              "groupIndex": 0,
              "_id": ""
            },
            {
              "__type__": "cc.Node",
              "_name": "BACKGROUND_SPRITE",
              "_objFlags": 0,
              "_parent": {
                "__id__": 2
              },
              "_children": [],
              "_active": true,
              "_level": 2,
              "_components": [
                {
                  "__id__": 4
                }
              ],
              "_prefab": {
                "__id__": 5
              },
              "_opacity": 255,
              "_color": {
                "__type__": "cc.Color",
                "r": 255,
                "g": 255,
                "b": 255,
                "a": 255
              },
              "_contentSize": {
                "__type__": "cc.Size",
                "width": 320,
                "height": 120
              },
              "_anchorPoint": {
                "__type__": "cc.Vec2",
                "x": 0.5,
                "y": 0.5
              },
              "_position": {
                "__type__": "cc.Vec3",
                "x": 0,
                "y": 0,
                "z": 0
              },
              "_scale": {
                "__type__": "cc.Vec3",
                "x": 1,
                "y": 1,
                "z": 1
              },
              "_rotationX": 0,
              "_rotationY": 0,
              "_quat": {
                "__type__": "cc.Quat",
                "x": 0,
                "y": 0,
                "z": 0,
                "w": 1
              },
              "_skewX": 0,
              "_skewY": 0,
              "_localZOrder": 15,
              "groupIndex": 0,
              "_id": ""
            },
            {
              "__type__": "cc.Sprite",
              "_name": "",
              "_objFlags": 0,
              "node": {
                "__id__": 3
              },
              "_enabled": true,
              "_srcBlendFactor": 770,
              "_dstBlendFactor": 771,
              "_spriteFrame": {
                "__uuid__": "ff0e91c7-55c6-4086-a39f-cb6e457b8c3b"
              },
              "_type": 1,
              "_sizeMode": 0,
              "_fillType": 0,
              "_fillCenter": {
                "__type__": "cc.Vec2",
                "x": 0,
                "y": 0
              },
              "_fillStart": 0,
              "_fillRange": 0,
              "_isTrimmedMode": true,
              "_state": 0,
              "_atlas": null,
              "_id": "ca8OwEL55PQoTu/It3Hf7V"
            },
            {
              "__type__": "cc.PrefabInfo",
              "root": {
                "__id__": 1
              },
              "asset": {
                "__id__": 0
              },
              "fileId": "d7dPeaOWlF+rP7S2ag5frs",
              "sync": false
            },
            {
              "__type__": "cc.Node",
              "_name": "TEXT_LABEL",
              "_objFlags": 0,
              "_parent": {
                "__id__": 2
              },
              "_children": [],
              "_active": false,
              "_level": 2,
              "_components": [
                {
                  "__id__": 7
                }
              ],
              "_prefab": {
                "__id__": 8
              },
              "_opacity": 255,
              "_color": {
                "__type__": "cc.Color",
                "r": 236,
                "g": 203,
                "b": 203,
                "a": 255
              },
              "_contentSize": {
                "__type__": "cc.Size",
                "width": 318,
                "height": 120
              },
              "_anchorPoint": {
                "__type__": "cc.Vec2",
                "x": 0,
                "y": 1
              },
              "_position": {
                "__type__": "cc.Vec3",
                "x": -158,
                "y": 60,
                "z": 0
              },
              "_scale": {
                "__type__": "cc.Vec3",
                "x": 1,
                "y": 1,
                "z": 1
              },
              "_rotationX": 0,
              "_rotationY": 0,
              "_quat": {
                "__type__": "cc.Quat",
                "x": 0,
                "y": 0,
                "z": 0,
                "w": 1
              },
              "_skewX": 0,
              "_skewY": 0,
              "_localZOrder": 16,
              "groupIndex": 0,
              "_id": ""
            },
            {
              "__type__": "cc.Label",
              "_name": "",
              "_objFlags": 0,
              "node": {
                "__id__": 6
              },
              "_enabled": true,
              "_srcBlendFactor": 1,
              "_dstBlendFactor": 771,
              "_useOriginalSize": true,
              "_string": "",
              "_N$string": "",
              "_fontSize": 40,
              "_lineHeight": 40,
              "_enableWrapText": false,
              "_N$file": null,
              "_isSystemFontUsed": true,
              "_spacingX": 0,
              "_N$horizontalAlign": 1,
              "_N$verticalAlign": 1,
              "_N$fontFamily": "Arial",
              "_N$overflow": 1,
              "_id": "d3dAj/KIxNR7KsbYJy27Zl"
            },
            {
              "__type__": "cc.PrefabInfo",
              "root": {
                "__id__": 1
              },
              "asset": {
                "__id__": 0
              },
              "fileId": "21KlbGA+5Gp5dNwWx/CXlU",
              "sync": false
            },
            {
              "__type__": "cc.Node",
              "_name": "PLACEHOLDER_LABEL",
              "_objFlags": 0,
              "_parent": {
                "__id__": 2
              },
              "_children": [],
              "_active": true,
              "_level": 2,
              "_components": [
                {
                  "__id__": 10
                }
              ],
              "_prefab": {
                "__id__": 11
              },
              "_opacity": 255,
              "_color": {
                "__type__": "cc.Color",
                "r": 187,
                "g": 187,
                "b": 187,
                "a": 255
              },
              "_contentSize": {
                "__type__": "cc.Size",
                "width": 318,
                "height": 120
              },
              "_anchorPoint": {
                "__type__": "cc.Vec2",
                "x": 0,
                "y": 1
              },
              "_position": {
                "__type__": "cc.Vec3",
                "x": -158,
                "y": 60,
                "z": 0
              },
              "_scale": {
                "__type__": "cc.Vec3",
                "x": 1,
                "y": 1,
                "z": 1
              },
              "_rotationX": 0,
              "_rotationY": 0,
              "_quat": {
                "__type__": "cc.Quat",
                "x": 0,
                "y": 0,
                "z": 0,
                "w": 1
              },
              "_skewX": 0,
              "_skewY": 0,
              "_localZOrder": 17,
              "groupIndex": 0,
              "_id": ""
            },
            {
              "__type__": "cc.Label",
              "_name": "",
              "_objFlags": 0,
              "node": {
                "__id__": 9
              },
              "_enabled": true,
              "_srcBlendFactor": 1,
              "_dstBlendFactor": 771,
              "_useOriginalSize": true,
              "_string": "请输入你的大名",
              "_N$string": "请输入你的大名",
              "_fontSize": 40,
              "_lineHeight": 120,
              "_enableWrapText": false,
              "_N$file": null,
              "_isSystemFontUsed": true,
              "_spacingX": 0,
              "_N$horizontalAlign": 0,
              "_N$verticalAlign": 1,
              "_N$fontFamily": "Arial",
              "_N$overflow": 1,
              "_id": "5dV89WeodDzKXMYQTozyw4"
            },
            {
              "__type__": "cc.PrefabInfo",
              "root": {
                "__id__": 1
              },
              "asset": {
                "__id__": 0
              },
              "fileId": "71+lkyiK5BobPAb30VOikb",
              "sync": false
            },
            {
              "__type__": "cc.EditBox",
              "_name": "",
              "_objFlags": 0,
              "node": {
                "__id__": 2
              },
              "_enabled": true,
              "_useOriginalSize": false,
              "_string": "",
              "_tabIndex": 0,
              "editingDidBegan": [],
              "textChanged": [],
              "editingDidEnded": [],
              "editingReturn": [],
              "_N$backgroundImage": {
                "__uuid__": "ff0e91c7-55c6-4086-a39f-cb6e457b8c3b"
              },
              "_N$returnType": 0,
              "_N$inputFlag": 5,
              "_N$inputMode": 6,
              "_N$fontSize": 40,
              "_N$lineHeight": 40,
              "_N$fontColor": {
                "__type__": "cc.Color",
                "r": 236,
                "g": 203,
                "b": 203,
                "a": 255
              },
              "_N$placeholder": "请输入你的大名",
              "_N$placeholderFontSize": 40,
              "_N$placeholderFontColor": {
                "__type__": "cc.Color",
                "r": 187,
                "g": 187,
                "b": 187,
                "a": 255
              },
              "_N$maxLength": 8,
              "_N$stayOnTop": false,
              "_id": "11T+WI7x9BRrd1XyznwHZo"
            },
            {
              "__type__": "cc.PrefabInfo",
              "root": {
                "__id__": 1
              },
              "asset": {
                "__id__": 0
              },
              "fileId": "5c75j/3VJPEb2aiOTh1YgF",
              "sync": false
            },
            {
              "__type__": "cc.Node",
              "_name": "New Button",
              "_objFlags": 0,
              "_parent": {
                "__id__": 1
              },
              "_children": [
                {
                  "__id__": 15
                }
              ],
              "_active": true,
              "_level": 2,
              "_components": [
                {
                  "__id__": 18
                },
                {
                  "__id__": 19
                }
              ],
              "_prefab": {
                "__id__": 20
              },
              "_opacity": 255,
              "_color": {
                "__type__": "cc.Color",
                "r": 255,
                "g": 255,
                "b": 255,
                "a": 255
              },
              "_contentSize": {
                "__type__": "cc.Size",
                "width": 160,
                "height": 60
              },
              "_anchorPoint": {
                "__type__": "cc.Vec2",
                "x": 0.5,
                "y": 0.5
              },
              "_position": {
                "__type__": "cc.Vec3",
                "x": 0,
                "y": -60,
                "z": 0
              },
              "_scale": {
                "__type__": "cc.Vec3",
                "x": 1,
                "y": 1,
                "z": 1
              },
              "_rotationX": 0,
              "_rotationY": 0,
              "_quat": {
                "__type__": "cc.Quat",
                "x": 0,
                "y": 0,
                "z": 0,
                "w": 1
              },
              "_skewX": 0,
              "_skewY": 0,
              "_localZOrder": 18,
              "groupIndex": 0,
              "_id": ""
            },
            {
              "__type__": "cc.Node",
              "_name": "Label",
              "_objFlags": 0,
              "_parent": {
                "__id__": 14
              },
              "_children": [],
              "_active": true,
              "_level": 0,
              "_components": [
                {
                  "__id__": 16
                }
              ],
              "_prefab": {
                "__id__": 17
              },
              "_opacity": 255,
              "_color": {
                "__type__": "cc.Color",
                "r": 255,
                "g": 0,
                "b": 153,
                "a": 255
              },
              "_contentSize": {
                "__type__": "cc.Size",
                "width": 160,
                "height": 60
              },
              "_anchorPoint": {
                "__type__": "cc.Vec2",
                "x": 0.5,
                "y": 0.5
              },
              "_position": {
                "__type__": "cc.Vec3",
                "x": 0,
                "y": 0,
                "z": 0
              },
              "_scale": {
                "__type__": "cc.Vec3",
                "x": 1,
                "y": 1,
                "z": 1
              },
              "_rotationX": 0,
              "_rotationY": 0,
              "_quat": {
                "__type__": "cc.Quat",
                "x": 0,
                "y": 0,
                "z": 0,
                "w": 1
              },
              "_skewX": 0,
              "_skewY": 0,
              "_localZOrder": 19,
              "groupIndex": 0,
              "_id": ""
            },
            {
              "__type__": "cc.Label",
              "_name": "",
              "_objFlags": 0,
              "node": {
                "__id__": 15
              },
              "_enabled": true,
              "_srcBlendFactor": 1,
              "_dstBlendFactor": 771,
              "_useOriginalSize": false,
              "_string": "Enter",
              "_N$string": "Enter",
              "_fontSize": 40,
              "_lineHeight": 40,
              "_enableWrapText": false,
              "_N$file": null,
              "_isSystemFontUsed": true,
              "_spacingX": 0,
              "_N$horizontalAlign": 1,
              "_N$verticalAlign": 1,
              "_N$fontFamily": "Arial",
              "_N$overflow": 2,
              "_id": "bcg4g2uz5JA6HgH60Se23x"
            },
            {
              "__type__": "cc.PrefabInfo",
              "root": {
                "__id__": 1
              },
              "asset": {
                "__id__": 0
              },
              "fileId": "e2qLlob0BCs4w5HkNfgAjK",
              "sync": false
            },
            {
              "__type__": "cc.Sprite",
              "_name": "",
              "_objFlags": 0,
              "node": {
                "__id__": 14
              },
              "_enabled": true,
              "_srcBlendFactor": 770,
              "_dstBlendFactor": 771,
              "_spriteFrame": {
                "__uuid__": "f0048c10-f03e-4c97-b9d3-3506e1d58952"
              },
              "_type": 1,
              "_sizeMode": 0,
              "_fillType": 0,
              "_fillCenter": {
                "__type__": "cc.Vec2",
                "x": 0,
                "y": 0
              },
              "_fillStart": 0,
              "_fillRange": 0,
              "_isTrimmedMode": true,
              "_state": 0,
              "_atlas": null,
              "_id": "e6tpEwQTBDkZlTrlmyJrbA"
            },
            {
              "__type__": "cc.Button",
              "_name": "",
              "_objFlags": 0,
              "node": {
                "__id__": 14
              },
              "_enabled": true,
              "transition": 2,
              "pressedColor": {
                "__type__": "cc.Color",
                "r": 255,
                "g": 255,
                "b": 255,
                "a": 255
              },
              "hoverColor": {
                "__type__": "cc.Color",
                "r": 255,
                "g": 255,
                "b": 255,
                "a": 255
              },
              "duration": 0.1,
              "zoomScale": 1.2,
              "clickEvents": [],
              "_N$interactable": true,
              "_N$enableAutoGrayEffect": false,
              "_N$normalColor": {
                "__type__": "cc.Color",
                "r": 255,
                "g": 255,
                "b": 255,
                "a": 255
              },
              "_N$disabledColor": {
                "__type__": "cc.Color",
                "r": 255,
                "g": 255,
                "b": 255,
                "a": 255
              },
              "_N$normalSprite": {
                "__uuid__": "f0048c10-f03e-4c97-b9d3-3506e1d58952"
              },
              "_N$pressedSprite": {
                "__uuid__": "e9ec654c-97a2-4787-9325-e6a10375219a"
              },
              "pressedSprite": {
                "__uuid__": "e9ec654c-97a2-4787-9325-e6a10375219a"
              },
              "_N$hoverSprite": {
                "__uuid__": "f0048c10-f03e-4c97-b9d3-3506e1d58952"
              },
              "hoverSprite": {
                "__uuid__": "f0048c10-f03e-4c97-b9d3-3506e1d58952"
              },
              "_N$disabledSprite": {
                "__uuid__": "29158224-f8dd-4661-a796-1ffab537140e"
              },
              "_N$target": {
                "__id__": 14
              },
              "_id": "74pS0ZYlVLCrxxT2H6RkzZ"
            },
            {
              "__type__": "cc.PrefabInfo",
              "root": {
                "__id__": 1
              },
              "asset": {
                "__id__": 0
              },
              "fileId": "dbdj3sTPNGspwIXN/a86NF",
              "sync": false
            },
            {
              "__type__": "cc.Sprite",
              "_name": "",
              "_objFlags": 0,
              "node": {
                "__id__": 1
              },
              "_enabled": true,
              "_srcBlendFactor": 770,
              "_dstBlendFactor": 771,
              "_spriteFrame": {
                "__uuid__": "a23235d1-15db-4b95-8439-a2e005bfff91"
              },
              "_type": 0,
              "_sizeMode": 0,
              "_fillType": 0,
              "_fillCenter": {
                "__type__": "cc.Vec2",
                "x": 0,
                "y": 0
              },
              "_fillStart": 0,
              "_fillRange": 0,
              "_isTrimmedMode": true,
              "_state": 0,
              "_atlas": null,
              "_id": "58sHQjxVZL54P14m2ltteJ"
            },
            {
              "__type__": "cc.PrefabInfo",
              "root": {
                "__id__": 1
              },
              "asset": {
                "__id__": 0
              },
              "fileId": "90EnoScd5MrqFGGSlTFP+K",
              "sync": false
            }
          ]`;
    },
});
