# hot-update-web

cocos creator 提供的热更新[tutorial-hot-update](https://github.com/cocos-creator/tutorial-hot-update) 只支持native，故尝试开发基于web的热更新  
  
目前已知的有不支持字体文件  
  
浏览器下的直接调试有bug，还在修复，可以build后测试demo  
  
服务器端的资源与 tutorial-hot-update 类似，可以按照 tutorial-hot-update 的web打包过程打包web资源  
  
客户端 修改HomeScript.js中第三行的versionUrl的值为自己服务器资源url即可测试学习  

# 使用插件

[vm.js](https://github.com/nothingsNeed/vm.js/tree/build-cocos-creator) fork了个vm.js，创建了个可以部分兼容cocos的分支build-cocos-creator  

# 说明

项目还处于开发阶段，未经作者允许切勿用于生产环境和其它用途  