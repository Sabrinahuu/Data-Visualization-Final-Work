// 将本地或 CDN 加载的 d3 绑定到 window.d3，供现有脚本使用
(function () {
  try {
    // ✅ 如果 require 存在（例如在 Parcel 打包环境），用 require
    if (typeof require !== "undefined") {
      window.d3 = require("d3");
      console.log("✅ 本地 d3 已加载（通过 require）");
    } 
    // ✅ 否则（浏览器直接运行时），使用已有的全局 d3
    else if (typeof window.d3 !== "undefined") {
      console.log("✅ 已检测到全局 d3（来自 CDN）");
    } 
    // ❌ 如果两者都没有，报错提示
    else {
      console.error("❌ 未检测到 d3，请检查是否已通过 <script> 标签加载 CDN 版本");
    }
  } catch (e) {
    console.error("❌ 本地 d3 加载失败：", e);
  }
})();
