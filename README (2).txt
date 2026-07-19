打开 map.html 查看地图；打开 数据大屏.html 查看总览。若要启用高德地图，请在 config.js 中填写高德 Web 端 Key。
地图点击点位会跳转：数据大屏.html?id=古树编号。

数据来源：已按 id 合并“数据组交付包_0701_v1/points.json”中的 53 条标准点位字段，包括 lng/lat、town、village、location、story、protection、coordinate_status、data_note。
高德配置：将 config.js 中的 window.AMap_KEY = "YOUR_AMAP_WEB_KEY"; 替换为真实 Web 端 Key。如控制台开启安全密钥校验，再同步填写 window.AMap_SECURITY_CODE。
