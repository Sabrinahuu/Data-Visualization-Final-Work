// ============================================
// heatmap.js - D3伪3D热力图（等轴测投影）
// ============================================
// X轴：风格（genres），Y轴：时间（months），Z轴：乐曲数量
console.log('🎨 D3伪3D热力图脚本开始加载...');
(() => {
  // 优先使用 heatmap-3d 容器
  const container = document.getElementById("heatmap-3d") || document.getElementById("heatmap");
  if (!container) {
    console.error('❌ 找不到heatmap容器');
    return;
  }
  
  container.innerHTML = '';
  // ⚠️ 不要在这里全局 remove tooltip：2D/3D 会互相删掉导致“tooltip 消失”

  let genreData = null;
  let surfaceData = null;
  // ✅ 3D 折线/曲目数量：使用该 JSON 的 genre_distribution（你说“之前是对的”的那套映射）
  let lineGenreData = null;
  try {
    lineGenreData = require('./assets/歌单_2314343014_genre分布统计_归类后.json');
    console.log('✅ 3D折线：通过 require 成功导入 genre_distribution JSON');
  } catch (e) {
    console.warn('⚠️ 3D折线：require 导入 JSON 失败，将回退到 2D CSV 数据：', e && e.message ? e.message : e);
    lineGenreData = null;
  }

  const months = [
    '2023-12', '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
    '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12',
    '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
    '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'
  ];

  const allGenres = ["ACG", "classical", "electronic", "folk", "jazz", "pop", "rap", "rock"];

  // ✅ 与 2D 热力图保持一致的数据源（避免 3D 使用 JSON 失败后随机数导致“XOY 平面数据不一致”）
  const CSV_DATA_2D = `month,classical,electronic,folk,jazz,pop,rock,ACG,rap
2023-12,35,34,64,47,24,32,37,37
2024-01,35,33,58,46,23,31,32,36
2024-02,34,32,62,48,26,33,34,39
2024-03,35,34,59,48,23,34,37,38
2024-04,31,34,55,47,21,34,31,36
2024-05,32,48,57,46,24,34,32,38
2024-06,32,49,62,48,23,36,31,40
2024-07,31,38,64,49,25,32,31,38
2024-08,30,39,62,46,23,32,32,37
2024-09,32,35,60,45,23,36,33,45
2024-10,31,32,60,49,23,33,31,46
2024-11,35,33,58,45,22,32,32,39
2024-12,35,35,63,48,23,33,37,39
2025-01,32,34,54,47,22,32,32,38
2025-02,33,33,58,48,22,31,29,42
2025-03,33,32,56,48,22,31,31,36
2025-04,31,33,59,45,22,31,30,36
2025-05,30,37,58,46,23,32,30,39
2025-06,29,33,57,46,21,32,31,36
2025-07,29,36,60,48,21,39,31,38
2025-08,31,35,59,46,22,34,31,34
2025-09,30,32,61,46,22,33,30,32
2025-10,33,33,59,44,21,34,31,36
2025-11,31,32,57,46,21,33,30,33
2025-12,33,32,60,45,23,32,33,39`;

  function buildFrom2DCsv() {
    const rows = d3.csvParse(CSV_DATA_2D.trim());
    // 统一成 heatmap.js 原来的 genreData 结构：[{month, genre_distribution:{...}}]
    genreData = months.map((m) => {
      const row = rows.find(r => r.month === m);
      const dist = {};
      for (const g of allGenres) dist[g] = row ? (+row[g] || 0) : 0;
      return { month: m, genre_distribution: dist };
    });

    // 同时生成 surfaceData（monthIdx x genreIdx）
    surfaceData = months.map((m) => {
      const chunk = genreData.find(d => d.month === m);
      return allGenres.map(g => (chunk && chunk.genre_distribution ? (chunk.genre_distribution[g] || 0) : 0));
    });
  }

  function loadData() {
    // 直接使用与 2D 一致的 CSV 数据，保证 XOY 平面一致
    console.log('✅ 3D热力图使用与2D一致的CSV数据源');
    buildFrom2DCsv();
    processData();
    init3DHeatmap();
  }

  function processData() {
    // surfaceData 已在 buildFrom2DCsv 中生成；这里兜底确保结构正确
    if (!surfaceData || surfaceData.length !== months.length) {
      buildFrom2DCsv();
    }
    
    console.log('✅ 数据处理完成');
  }

  // 旋转角度（全局变量，支持鼠标拖动旋转）
  let rotationAngle = Math.PI / 6; // 默认30度

  // 等轴测投影函数（支持旋转）
  function isometricProjection(x, y, z) {
    // 等轴测投影：x轴向右，y轴向前（深度），z轴向上
    // 支持水平旋转（绕Z轴）
    const angle = Math.PI / 6; // 基础等轴测角度30度
    const scale = 1.2; // 稍微放大一点，让3D效果更明显
    
    // 应用水平旋转
    const cosR = Math.cos(rotationAngle);
    const sinR = Math.sin(rotationAngle);
    const rotatedX = x * cosR - y * sinR;
    const rotatedY = x * sinR + y * cosR;
    
    // 等轴测投影
    const isoX = (rotatedX - rotatedY) * Math.cos(angle) * scale;
    const isoY = (rotatedX + rotatedY) * Math.sin(angle) * scale - z * scale;
    return { x: isoX, y: isoY };
  }

  function init3DHeatmap() {
    if (!surfaceData || surfaceData.length === 0) {
      console.warn('surfaceData为空，创建默认数据');
      surfaceData = Array(25).fill(null).map(() => Array(allGenres.length).fill(10));
    }

    // 获取容器尺寸的函数 - 使用实际容器尺寸
    const getContainerSize = () => {
      // 获取实际容器尺寸，如果为0则使用默认值
      const actualWidth = container.clientWidth || container.offsetWidth || 1600;
      const actualHeight = container.clientHeight || container.offsetHeight || 800;
      return {
        width: actualWidth > 0 ? actualWidth : 1600,
        height: actualHeight > 0 ? actualHeight : 800
      };
    };

    let containerSize = getContainerSize();
    // 使用实际容器尺寸，不强制最小值
    let containerWidth = containerSize.width;
    let containerHeight = containerSize.height;

    // 计算数据范围
    let minValue = Infinity;
    let maxValue = 0;
    for (let i = 0; i < surfaceData.length; i++) {
      for (let j = 0; j < surfaceData[i].length; j++) {
        minValue = Math.min(minValue, surfaceData[i][j]);
        maxValue = Math.max(maxValue, surfaceData[i][j]);
      }
    }
    if (maxValue === 0) maxValue = 1;
    const valueRange = maxValue - minValue || 1;

    // ✅ 赛博霓虹渐变（与 2D 使用同一套主题色），保证 2D/3D 颜色映射一致
    function cssVar(name, fallback) {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name);
      return (v || "").trim() || fallback;
    }
    const accentBlue = cssVar("--accent-blue", "#32a7ff");
    const accentViolet = cssVar("--accent-violet", "#7c3aed");
    const accentPink = cssVar("--accent-pink", "#ff3bd4");
    const accentCyan = cssVar("--accent-cyan", "#00fff0");

    // 赛博渐变：进一步提亮下界，并降低粉色段强度（避免 pop 行过于突出）
    // 渐变段数收敛到 4 段：彻底去掉“黑段”，低值直接从亮蓝底开始
    // 目标：整体更亮、更赛博；粉色只在高值端出现
    const cyberStops = [
      "#2a4e8f",
      accentViolet,
      accentCyan,
      "#ff5adf"
    ];
    const cyberInterpolator = d3.interpolateRgbBasis(cyberStops);

    const colorScale = d3.scaleSequential()
      .domain([minValue, maxValue])
      .interpolator(cyberInterpolator);

    function getColor(value) {
      return colorScale(value || 0);
    }

    // === 颜色映射图例（2D/3D 共用容器）===
    (function updateLegend() {
      const legend = document.getElementById("heatmap-color-legend");
      if (!legend) return;
      const fmt = d3.format(",d");
      legend.innerHTML = `
        <div class="legend-title">Score → Color</div>
        <div class="legend-bar" style="background: linear-gradient(90deg, ${cyberStops.join(",")});"></div>
        <div class="legend-labels">
          <span>${fmt(minValue ?? 0)}</span>
          <span>${fmt(maxValue ?? 0)}</span>
        </div>
      `;
    })();

    // === Tooltip（2D/3D 复用同一个）===
    let tooltip = d3.select("body").select(".heatmap-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div").attr("class", "heatmap-tooltip");
    }
    tooltip
      // ⚠️ 统一用 fixed + clientX/clientY，避免页面缩放/滚动导致 tooltip “跑到屏幕外”
      .style("position", "fixed")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("padding", "10px 12px")
      .style("border-radius", "12px")
      .style("background", "rgba(30,41,59,0.92)")
      .style("color", "#fff")
      .style("font", '13px/1.35 system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif')
      .style("box-shadow", "0 10px 24px rgba(0,0,0,0.16)")
      .style("z-index", 1000);

    function placeTooltip(evt, offsetX = 12, offsetY = -18) {
      const e = evt && evt.sourceEvent ? evt.sourceEvent : evt;
      const cx = (e && typeof e.clientX === "number") ? e.clientX : (e && typeof e.pageX === "number" ? e.pageX : 0);
      const cy = (e && typeof e.clientY === "number") ? e.clientY : (e && typeof e.pageY === "number" ? e.pageY : 0);

      // 基于 tooltip 当前尺寸做边界夹紧
      const node = tooltip.node();
      const w = node ? (node.offsetWidth || 0) : 0;
      const h = node ? (node.offsetHeight || 0) : 0;
      const pad = 10;

      let x = cx + offsetX;
      let y = cy + offsetY;
      const maxX = (window.innerWidth || 0) - w - pad;
      const maxY = (window.innerHeight || 0) - h - pad;
      x = Math.max(pad, Math.min(x, maxX));
      y = Math.max(pad, Math.min(y, maxY));

      tooltip.style("left", `${x}px`).style("top", `${y}px`);
    }

    // 创建SVG，先不设置viewBox，等计算完内容尺寸后再设置
    const svg = d3.select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .style("cursor", "grab");
    
    // 鼠标拖动旋转相关变量
    let isDragging = false;
    let lastMouseX = 0;

    // 3D空间参数（放大）
    const cellWidth = 50;  // 每个单元格的宽度（X轴：genre方向）
    const cellDepth = 25;  // 每个单元格的深度（Y轴：month方向）
    const maxHeight = 120;  // 最大高度（Z轴）
    const numGenres = allGenres.length;
    const numMonths = months.length;

    // 计算3D空间的边界
    const totalWidth = numGenres * cellWidth;
    const totalDepth = numMonths * cellDepth;

    // 计算投影后的边界，用于居中
    const corners = [
      isometricProjection(0, 0, 0),
      isometricProjection(totalWidth, 0, 0),
      isometricProjection(0, totalDepth, 0),
      isometricProjection(totalWidth, totalDepth, 0),
      isometricProjection(0, 0, maxHeight),
      isometricProjection(totalWidth, 0, maxHeight)
    ];

    const minX = d3.min(corners, d => d.x);
    const maxX = d3.max(corners, d => d.x);
    const minY = d3.min(corners, d => d.y);
    const maxY = d3.max(corners, d => d.y);

    const projectedWidth = maxX - minX;
    const projectedHeight = maxY - minY;

    // 添加边距，确保内容不会被裁剪
    const padding = 50;
    const viewBoxMinX = minX - padding;
    const viewBoxMinY = minY - padding;
    const viewBoxWidth = projectedWidth + padding * 2;
    const viewBoxHeight = projectedHeight + padding * 2;
    
    // 使用内容尺寸作为 viewBox，让 SVG 自动缩放适应容器
    // preserveAspectRatio="xMidYMid meet" 会自动居中内容
    svg.attr("viewBox", `${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`)
       .attr("preserveAspectRatio", "xMidYMid meet");

    // 不需要 transform，内容使用原始坐标
    // viewBox 已经包含了所有内容，preserveAspectRatio 会自动居中
    const g = svg.append("g");

    // 存储所有交互元素
    const interactiveElements = [];
    
    // 存储所有单元格数据，用于旋转时重新渲染
    const cellDataArray = [];
    // 存储所有折线数据
    const lineDataArray = [];

    // 辅助函数：绘制立方体的一个面
    function drawFace(svgGroup, points, fillColor, strokeColor, opacity = 1) {
      const path = d3.path();
      path.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        path.lineTo(points[i].x, points[i].y);
      }
      path.closePath();
      
      return svgGroup.append("path")
        .attr("d", path.toString())
        .attr("fill", fillColor)
        .attr("stroke", strokeColor)
        .attr("stroke-width", 0.5)
        .attr("opacity", opacity);
    }

    // 辅助函数：使颜色变暗（用于侧面）
    function darkenColor(rgb, factor) {
      const match = rgb.match(/\d+/g);
      if (!match) return rgb;
      const r = Math.max(0, Math.round(parseInt(match[0]) * factor));
      const g = Math.max(0, Math.round(parseInt(match[1]) * factor));
      const b = Math.max(0, Math.round(parseInt(match[2]) * factor));
      return `rgb(${r}, ${g}, ${b})`;
    }

    // ========== 第一步：绘制3D热力图（带厚度的立方体） ==========
    const cellThickness = 6; // 每个单元格的厚度（Z轴高度），参考图看起来约6像素
    
    for (let genreIdx = 0; genreIdx < numGenres; genreIdx++) {
      for (let monthIdx = 0; monthIdx < numMonths; monthIdx++) {
        const value = surfaceData[monthIdx][genreIdx];
        const baseColor = getColor(value);
        const darkColor = darkenColor(baseColor, 0.85); // 侧面颜色（稍微暗一点，不要太深）
        const darkerColor = darkenColor(baseColor, 0.75); // 背面颜色（稍微更暗一点）

        // 3D坐标（X=genre, Y=month, Z=0为底部，Z=thickness为顶部）
        const x = genreIdx * cellWidth;
        const y = monthIdx * cellDepth;
        const zBottom = 0;
        const zTop = cellThickness;

        // 计算立方体的8个顶点
        // 底部四个角
        const bottom1 = isometricProjection(x, y, zBottom);
        const bottom2 = isometricProjection(x + cellWidth, y, zBottom);
        const bottom3 = isometricProjection(x + cellWidth, y + cellDepth, zBottom);
        const bottom4 = isometricProjection(x, y + cellDepth, zBottom);
        
        // 顶部四个角
        const top1 = isometricProjection(x, y, zTop);
        const top2 = isometricProjection(x + cellWidth, y, zTop);
        const top3 = isometricProjection(x + cellWidth, y + cellDepth, zTop);
        const top4 = isometricProjection(x, y + cellDepth, zTop);

        // 创建单元格组
        const cellGroup = g.append("g")
          .attr("class", `cell-group cell-${monthIdx}-${genreIdx}`)
          .datum({
            month: months[monthIdx],
            genre: allGenres[genreIdx],
            value: value,
            monthIdx: monthIdx,
            genreIdx: genreIdx,
            x: x,
            y: y,
            z: zBottom
          })
          .style("cursor", "pointer");
        
        // 存储单元格数据
        cellDataArray.push({
          monthIdx,
          genreIdx,
          x,
          y,
          zBottom,
          zTop,
          value,
          baseColor,
          darkColor,
          darkerColor,
          cellGroup
        });

        // 绘制立方体的各个面（从后往前，确保正确的遮挡）
        // 1. 底面
        drawFace(cellGroup, [bottom1, bottom2, bottom3, bottom4], baseColor, "rgba(255,255,255,0.3)", 0.9);
        
        // 2. 右侧面
        drawFace(cellGroup, [bottom2, top2, top3, bottom3], darkColor, "rgba(255,255,255,0.2)", 0.9);
        
        // 3. 背面
        drawFace(cellGroup, [bottom4, bottom3, top3, top4], darkerColor, "rgba(255,255,255,0.2)", 0.85);
        
        // 4. 顶面（最后绘制，确保在最上层）
        const topFace = drawFace(cellGroup, [top1, top2, top3, top4], baseColor, "rgba(255,255,255,0.4)", 1);
        
        // 将顶面添加到交互元素（用于tooltip）
        interactiveElements.push(topFace);
      }
    }


    // ========== 添加交互事件 ==========
    // 折线/曲目数量的数据源：优先 JSON（lineGenreData），否则回退到 CSV（genreData）
    const lineSource = (lineGenreData && Array.isArray(lineGenreData) && lineGenreData.length) ? lineGenreData : genreData;

    interactiveElements.forEach(element => {
      element
        .on("mouseover", function(event) {
          // ⚠️ 关键修复：面(path)本身没绑定 datum，数据在父级 cellGroup 上
          const parentGroup = d3.select(this.parentNode);
          const d = parentGroup.datum();
          if (!d) return;

          // 高亮整个立方体组
          parentGroup.selectAll("path")
            .attr("opacity", 1)
            .attr("stroke-width", 1.5);

          // 从 JSON/CSV 的 genre_distribution 获取曲目数量
          let trackCount = 0;
          if (lineSource && lineSource[d.monthIdx]) {
            const chunk = lineSource[d.monthIdx];
            const genreKey = allGenres[d.genreIdx];
            if (chunk && chunk.genre_distribution && chunk.genre_distribution[genreKey] !== undefined) {
              trackCount = chunk.genre_distribution[genreKey];
            }
          } else {
            trackCount = Math.round(d.value);
          }

          // 直接设置（不走 transition，避免在切换/重绘时被打断导致“tooltip 不显示”）
          tooltip.style("opacity", 0.95);
          tooltip.html(`<b>${d.genre}</b><br/>${d.month}<br/>分值: ${(+d.value).toFixed(2)}<br/>曲目数量: ${trackCount}`);
          placeTooltip(event);
        })
        .on("mousemove", function(event) {
          // tooltip 跟随鼠标（不重新算内容，减少抖动）
          placeTooltip(event);
        })
        .on("mouseout", function() {
          // 恢复整个立方体组的原始样式
          const parentGroup = d3.select(this.parentNode);
          parentGroup.selectAll("path")
            .attr("opacity", function() {
              // 根据面的类型恢复不同的透明度
              const fill = d3.select(this).attr("fill");
              if (fill && fill.includes("rgb")) {
                const match = fill.match(/\d+/g);
                if (match) {
                  const r = parseInt(match[0]);
                  const g = parseInt(match[1]);
                  const b = parseInt(match[2]);
                  // 根据亮度判断是顶面、侧面还是底面
                  const brightness = (r + g + b) / 3;
                  if (brightness > 200) return 1; // 顶面
                  if (brightness > 150) return 0.85; // 侧面
                  return 0.8; // 背面/底面
                }
              }
              return 0.9;
            })
            .attr("stroke-width", 0.5);
          tooltip.style("opacity", 0);
        });
    });

    // ========== 添加折线趋势图（每个月份一条，沿X轴延伸，Z轴表示高度） ==========
    // 计算折线高度的范围
    let minLineHeight = Infinity;
    let maxLineHeight = 0;
    if (lineSource && lineSource.length > 0) {
      for (let i = 0; i < lineSource.length; i++) {
        const chunk = lineSource[i];
        if (chunk && chunk.genre_distribution) {
          for (let genre of allGenres) {
            const val = chunk.genre_distribution[genre] || 0;
            minLineHeight = Math.min(minLineHeight, val);
            maxLineHeight = Math.max(maxLineHeight, val);
          }
        }
      }
    }
    
    // 如果genreData为空，使用surfaceData的数据
    if (!lineSource || lineSource.length === 0 || minLineHeight === Infinity) {
      minLineHeight = Infinity;
      maxLineHeight = 0;
      for (let i = 0; i < surfaceData.length; i++) {
        for (let j = 0; j < surfaceData[i].length; j++) {
          const val = surfaceData[i][j] || 0;
          minLineHeight = Math.min(minLineHeight, val);
          maxLineHeight = Math.max(maxLineHeight, val);
        }
      }
    }
    
    // 确保有有效的数据范围
    if (minLineHeight === Infinity) minLineHeight = 0;
    if (maxLineHeight === 0) maxLineHeight = 1;
    const lineHeightRange = maxLineHeight - minLineHeight || 1;
    const maxLineZ = maxHeight * 1.2; // 折线最大高度，降低高度
    
    console.log('📊 折线图数据范围:', { minLineHeight, maxLineHeight, lineHeightRange, maxLineZ });

    // D3的平滑曲线生成器（沿X轴延伸，所以用curveMonotoneX）
    const lineGenerator = d3.line()
      .curve(d3.curveMonotoneX) // 平滑曲线，沿X轴
      .x((d) => {
        const projected = isometricProjection(d.x, d.y, d.z);
        return projected.x;
      })
      .y((d) => {
        const projected = isometricProjection(d.x, d.y, d.z);
        return projected.y;
      });

    // D3的面积生成器（用于填充）
    const areaGenerator = d3.area()
      .curve(d3.curveMonotoneX) // 沿X轴
      .x((d) => {
        const projected = isometricProjection(d.x, d.y, d.z);
        return projected.x;
      })
      .y0((d) => {
        // 底部（热力图顶部）
        const projected = isometricProjection(d.x, d.y, cellThickness);
        return projected.y;
      })
      .y1((d) => {
        // 顶部（折线高度）
        const projected = isometricProjection(d.x, d.y, d.z);
        return projected.y;
      });

    // 为每个月份绘制折线（沿X轴：风格方向）
    for (let monthIdx = 0; monthIdx < numMonths; monthIdx++) {
      const month = months[monthIdx];
      const monthY = monthIdx * cellDepth + cellDepth / 2; // 月份的中心Y坐标
      
      // 生成折线的数据点（沿X轴：从genre 0到genre 7）
      const lineData = [];
      for (let genreIdx = 0; genreIdx < numGenres; genreIdx++) {
        let value = 0;
        if (lineSource && lineSource[monthIdx] && lineSource[monthIdx].genre_distribution) {
          const genre = allGenres[genreIdx];
          value = lineSource[monthIdx].genre_distribution[genre] || 0;
        } else if (surfaceData && surfaceData[monthIdx]) {
          // 如果genreData为空，使用surfaceData
          value = surfaceData[monthIdx][genreIdx] || 0;
        }
        
        // 归一化高度，确保不会出现NaN
        const normalizedValue = lineHeightRange > 0 ? (value - minLineHeight) / lineHeightRange : 0;
        const z = cellThickness + (isNaN(normalizedValue) ? 0 : normalizedValue) * maxLineZ; // 从热力图顶部开始
        
        const genreX = genreIdx * cellWidth + cellWidth / 2; // genre的中心X坐标
        
        // 验证坐标不是NaN
        if (!isNaN(genreX) && !isNaN(monthY) && !isNaN(z)) {
          lineData.push({
            x: genreX,
            y: monthY,
            z: z,
            value: value,
            monthIdx: monthIdx,
            genreIdx: genreIdx
          });
        }
      }

      // 获取该月份的平均颜色（使用热力图的颜色方案，但加深颜色使其更明显）
      const avgValue = lineData.reduce((sum, d) => sum + d.value, 0) / lineData.length;
      let lineColor = getColor(avgValue);
      // 折线颜色：不要太暗（更贴合赛博背景、提升可读性）
      const darkerLineColor = darkenColor(lineColor, 0.86);
      
      // 存储折线数据（用于旋转时更新）
      if (lineData.length > 0) {
        lineDataArray.push({
          monthIdx,
          month,
          lineData: [...lineData], // 复制数组
          darkerLineColor,
          lineColor
        });
      }
      
      // 只有当有有效数据点时才绘制
      if (lineData.length > 0) {
        // 创建面积填充（半透明）
        const areaPath = areaGenerator(lineData);
        if (areaPath && !areaPath.includes('NaN')) {
          const areaElement = g.append("path")
            .attr("class", `area-path area-${monthIdx}`)
            .attr("d", areaPath)
            .attr("fill", darkerLineColor)
            .attr("fill-opacity", 0.28)
            .attr("stroke", "none")
            .datum({ lineData: lineData, month: month, monthIdx: monthIdx }) // 存储数据
            .style("cursor", "pointer")
            // ✅ 关键：确保面积能接收鼠标事件（避免被 SVG 默认/父层样式影响）
            .style("pointer-events", "fill");
          
          // 为面积填充也添加鼠标事件（确保tooltip能显示）
          areaElement
            .on("mousemove", function(event) {
              // 获取鼠标在SVG中的坐标
              const [mouseX, mouseY] = d3.pointer(event, g.node());
              
              // 找到最近的数据点
              let minDistance = Infinity;
              let nearestPoint = null;
              let nearestGenreIdx = -1;
              
              lineData.forEach((point, idx) => {
                const projected = isometricProjection(point.x, point.y, point.z);
                const distance = Math.sqrt(
                  Math.pow(mouseX - projected.x, 2) + 
                  Math.pow(mouseY - projected.y, 2)
                );
                if (distance < minDistance) {
                  minDistance = distance;
                  nearestPoint = point;
                  nearestGenreIdx = idx;
                }
              });
              
              // ✅ 放宽阈值：面积本身就很大，只要能算出最近点就显示
              if (nearestPoint) {
                // 曲目数量：优先 lineSource(JSON)，否则回退
                let trackCount = 0;
                const chunk = lineSource && lineSource[monthIdx] ? lineSource[monthIdx] : null;
                const genre = allGenres[nearestGenreIdx];
                if (chunk && chunk.genre_distribution && chunk.genre_distribution[genre] !== undefined) {
                  trackCount = chunk.genre_distribution[genre];
                } else {
                  trackCount = Math.round(nearestPoint.value);
                }

                tooltip.style("opacity", 0.95);
                tooltip.html(`<b>${allGenres[nearestGenreIdx]}</b><br/>${month}<br/>分值: ${nearestPoint.value.toFixed(2)}<br/>曲目数量: ${trackCount}`);
                placeTooltip(event);
              }
            })
            .on("mouseout", function() {
              tooltip.style("opacity", 0);
            });
        }

        // 创建折线（确保在最上层显示，使用深色使其更明显）
        const linePath = lineGenerator(lineData);
        if (linePath && !linePath.includes('NaN')) {
          const lineElement = g.append("path")
            .attr("class", `line-path line-${monthIdx}`)
            .attr("d", linePath)
            .attr("fill", "none")
            .attr("stroke", darkerLineColor)
            .attr("stroke-width", 3.0)
            .attr("opacity", 1)
            .datum({ lineData: lineData, month: month, monthIdx: monthIdx }) // 存储数据
            .style("cursor", "pointer")
            // ✅ 关键：折线只用 stroke 命中，更好点到线
            .style("pointer-events", "stroke");
          
          // ✅ 给折线加“隐形粗命中层”，解决“线太细很难 hover 到”
          const hitLine = g.append("path")
            .attr("class", `line-hit line-hit-${monthIdx}`)
            .attr("d", linePath)
            .attr("fill", "none")
            // ⚠️ 不要用完全 transparent：部分浏览器下会导致 pointer hit 失效
            .attr("stroke", "#ffffff")
            .attr("stroke-opacity", 0.001)
            .attr("stroke-width", 14) // 命中更容易
            .attr("opacity", 1)
            .datum({ lineData: lineData, month: month, monthIdx: monthIdx })
            .style("cursor", "pointer")
            .style("pointer-events", "stroke");

          // 为折线图添加鼠标事件（绑定到 hitLine；视觉线保留原样）
          const onLineMove = function(event) {
              // 获取鼠标在SVG中的坐标
              const [mouseX, mouseY] = d3.pointer(event, g.node());
              
              // 找到最近的数据点
              let minDistance = Infinity;
              let nearestPoint = null;
              let nearestGenreIdx = -1;
              
              lineData.forEach((point, idx) => {
                const projected = isometricProjection(point.x, point.y, point.z);
                const distance = Math.sqrt(
                  Math.pow(mouseX - projected.x, 2) + 
                  Math.pow(mouseY - projected.y, 2)
                );
                if (distance < minDistance) {
                  minDistance = distance;
                  nearestPoint = point;
                  nearestGenreIdx = idx;
                }
              });
              
              // ✅ 放宽阈值：折线 hover 体验要“容易命中”，不做严格距离门槛
              if (nearestPoint) {
                // 曲目数量：优先 lineSource(JSON)，否则回退
                let trackCount = 0;
                const chunk = lineSource && lineSource[monthIdx] ? lineSource[monthIdx] : null;
                const genre = allGenres[nearestGenreIdx];
                if (chunk && chunk.genre_distribution && chunk.genre_distribution[genre] !== undefined) {
                  trackCount = chunk.genre_distribution[genre];
                } else {
                  trackCount = Math.round(nearestPoint.value);
                }

                tooltip.style("opacity", 0.95);
                tooltip.html(`<b>${allGenres[nearestGenreIdx]}</b><br/>${month}<br/>分值: ${nearestPoint.value.toFixed(2)}<br/>曲目数量: ${trackCount}`);
                placeTooltip(event);
              }
          };

          hitLine
            .on("mousemove", onLineMove)
            .on("mouseout", function() { tooltip.style("opacity", 0); });

          // 视觉线也绑定同样逻辑（双保险）
          lineElement
            .on("mousemove", onLineMove)
            .on("mouseout", function() { tooltip.style("opacity", 0); });
          
          // ========== 添加最高点标记 ==========
          // 找到最高点（z值最大的点）
          let maxZ = -Infinity;
          let maxPoint = null;
          lineData.forEach(point => {
            if (point.z > maxZ) {
              maxZ = point.z;
              maxPoint = point;
            }
          });
          
          if (maxPoint) {
            const maxProjected = isometricProjection(maxPoint.x, maxPoint.y, maxPoint.z);
            
            // 绘制外圈（白色，更大）
            g.append("circle")
              .attr("class", `max-point-outer max-point-outer-${monthIdx}`)
              .attr("cx", maxProjected.x)
              .attr("cy", maxProjected.y)
              .attr("r", 6)
              .attr("fill", "#ffffff")
              .attr("stroke", darkerLineColor)
              .attr("stroke-width", 2)
              .attr("opacity", 1)
              .style("pointer-events", "none"); // 允许鼠标事件穿透到折线
            
            // 绘制内圈（折线颜色，更小）
            g.append("circle")
              .attr("class", `max-point-inner max-point-inner-${monthIdx}`)
              .attr("cx", maxProjected.x)
              .attr("cy", maxProjected.y)
              .attr("r", 3.5)
              .attr("fill", darkerLineColor)
              .attr("stroke", "none")
              .attr("opacity", 1)
              .style("pointer-events", "none"); // 允许鼠标事件穿透到折线
          }
          
          console.log(`✅ 已绘制${month}的折线图，颜色: ${darkerLineColor}, 数据点: ${lineData.length}`);
        } else {
          console.warn(`⚠️ ${month}的折线路径生成失败，路径: ${linePath}`);
        }
      } else {
        console.warn(`⚠️ ${month}没有有效的数据点`);
      }
    }
    console.log('🎉 折线趋势图绘制完成！');
    // ========== 添加坐标轴线（原点与第一个方格左上角对齐） ==========
    const axisOffset = 8; // 坐标轴往外偏移的距离（增加，更往外）
    
    // 辅助函数：绘制带箭头的轴线
    function drawAxisWithArrow(start, end, color = "#555", axisClass = "") {
      const line = g.append("line")
        .attr("class", `axis-line ${axisClass}`)
        .attr("x1", start.x)
        .attr("y1", start.y)
        .attr("x2", end.x)
        .attr("y2", end.y)
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("opacity", 0.7)
        // ✅ 坐标轴只显示，不要拦截折线/方块 hover
        .style("pointer-events", "none");
      
      // 计算箭头方向
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const angle = Math.atan2(dy, dx);
      const arrowLength = 8;
      
      // 绘制箭头
      const arrowPath = d3.path();
      arrowPath.moveTo(end.x, end.y);
      arrowPath.lineTo(
        end.x - arrowLength * Math.cos(angle - Math.PI / 6),
        end.y - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      arrowPath.lineTo(
        end.x - arrowLength * Math.cos(angle + Math.PI / 6),
        end.y - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      arrowPath.closePath();
      
      g.append("path")
        .attr("class", `axis-arrow ${axisClass}`)
        .attr("d", arrowPath.toString())
        .attr("fill", color)
        .attr("opacity", 0.7)
        .style("pointer-events", "none");
      
      return { line, start, end };
    }

    // 坐标原点在 (0, 0, 0)，即第一个方格的左上角
    let origin = isometricProjection(-axisOffset, -axisOffset, 0);
    
    // 赛博深色主题：轴线/箭头用浅色系，避免发灰看不清
    const AXIS_LINE = "rgba(50, 167, 255, 0.30)";
    const AXIS_TEXT = "rgba(226, 232, 240, 0.88)";
    const AXIS_STROKE = "rgba(7, 3, 18, 0.72)";

    // X轴（genres方向）- 从原点沿X轴延伸
    let xAxisEnd = isometricProjection(totalWidth + axisOffset, -axisOffset, 0);
    drawAxisWithArrow(origin, xAxisEnd, AXIS_LINE, "x-axis");

    // Y轴（months方向）- 从原点沿Y轴延伸
    let yAxisEnd = isometricProjection(-axisOffset, totalDepth + axisOffset, 0);
    drawAxisWithArrow(origin, yAxisEnd, AXIS_LINE, "y-axis");

    // Z轴（高度方向）- 从原点向上延伸
    let zAxisEnd = isometricProjection(-axisOffset, -axisOffset, maxHeight + axisOffset);
    drawAxisWithArrow(origin, zAxisEnd, AXIS_LINE, "z-axis");

    // ========== 添加坐标轴标签 ==========
    const labelOffset = 40; // X轴标签往外偏移的距离（增加，确保在方格外面）
    
    // X轴标签（genres）- 在底部前方（y<0的部分）
    allGenres.forEach((genre, idx) => {
      const x = idx * cellWidth + cellWidth / 2;
      const y = -labelOffset; // y<0，在底部前方
      const projected = isometricProjection(x, y, 0); // 在y<0的位置
      
      g.append("text")
        .attr("class", `axis-label x-label x-label-${idx}`)
        .attr("x", projected.x)
        .attr("y", projected.y)
        .attr("text-anchor", "middle")
        .attr("fill", AXIS_TEXT)
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .style("font-family", "system-ui, -apple-system, sans-serif")
        .style("paint-order", "stroke")
        .style("stroke", AXIS_STROKE)
        .style("stroke-width", "2.2px")
        .style("stroke-linejoin", "round")
        .style("pointer-events", "none")
        .text(genre);
    });

    // Y轴标签（months）- 在左侧
    months.forEach((month, idx) => {
      if (idx % 3 === 0) { // 只显示部分月份，避免太密集
        const x = 0;
        const y = idx * cellDepth + cellDepth / 2;
        const projected = isometricProjection(x - labelOffset, y, 0);
        
        g.append("text")
          .attr("class", `axis-label y-label y-label-${idx}`)
          .attr("x", projected.x)
          .attr("y", projected.y)
          .attr("text-anchor", "end")
          .attr("fill", AXIS_TEXT)
          .attr("font-size", "10px")
          .style("font-family", "system-ui, -apple-system, sans-serif")
          .style("paint-order", "stroke")
          .style("stroke", AXIS_STROKE)
          .style("stroke-width", "2.2px")
          .style("stroke-linejoin", "round")
          .style("pointer-events", "none")
          .text(month);
      }
    });

    // Z轴标签（乐曲数量）- 再往上移
    let zLabelPos = isometricProjection(-10, 0, maxHeight + 25); // 增加Z坐标，让标签更往上
    g.append("text")
      .attr("class", "axis-label z-label")
      .attr("x", zLabelPos.x)
      .attr("y", zLabelPos.y)
      .attr("text-anchor", "middle")
      .attr("fill", AXIS_TEXT)
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .style("font-family", "system-ui, -apple-system, sans-serif")
      .style("paint-order", "stroke")
      .style("stroke", AXIS_STROKE)
      .style("stroke-width", "2.2px")
      .style("stroke-linejoin", "round")
      .style("pointer-events", "none")
      .text("乐曲数量");

    console.log('🎉 D3伪3D热力图初始化完成！');

    // ========== 更新函数：重新渲染所有元素（用于旋转） ==========
    function updateProjection() {
      // 重新计算边界
      const corners = [
        isometricProjection(0, 0, 0),
        isometricProjection(totalWidth, 0, 0),
        isometricProjection(0, totalDepth, 0),
        isometricProjection(totalWidth, totalDepth, 0),
        isometricProjection(0, 0, maxHeight),
        isometricProjection(totalWidth, 0, maxHeight)
      ];
      
      const minX = d3.min(corners, d => d.x);
      const maxX = d3.max(corners, d => d.x);
      const minY = d3.min(corners, d => d.y);
      const maxY = d3.max(corners, d => d.y);
      
      const projectedWidth = maxX - minX;
      const projectedHeight = maxY - minY;
      
      // 更新 viewBox
      const padding = 50;
      const viewBoxMinX = minX - padding;
      const viewBoxMinY = minY - padding;
      const viewBoxWidth = projectedWidth + padding * 2;
      const viewBoxHeight = projectedHeight + padding * 2;
      
      svg.attr("viewBox", `${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`);
      
      // 更新所有单元格
      cellDataArray.forEach(cellData => {
        const { x, y, zBottom, zTop, monthIdx, genreIdx, baseColor, darkColor, darkerColor } = cellData;
        
        // 重新计算8个顶点
        const bottom1 = isometricProjection(x, y, zBottom);
        const bottom2 = isometricProjection(x + cellWidth, y, zBottom);
        const bottom3 = isometricProjection(x + cellWidth, y + cellDepth, zBottom);
        const bottom4 = isometricProjection(x, y + cellDepth, zBottom);
        const top1 = isometricProjection(x, y, zTop);
        const top2 = isometricProjection(x + cellWidth, y, zTop);
        const top3 = isometricProjection(x + cellWidth, y + cellDepth, zTop);
        const top4 = isometricProjection(x, y + cellDepth, zTop);
        
        // 更新单元格组的所有面
        const cellGroup = g.select(`.cell-${monthIdx}-${genreIdx}`);
        if (!cellGroup.empty()) {
          const paths = cellGroup.selectAll("path");
          const faces = [
            [bottom1, bottom2, bottom3, bottom4], // 底面
            [bottom2, top2, top3, bottom3], // 右侧面
            [bottom4, bottom3, top3, top4], // 背面
            [top1, top2, top3, top4] // 顶面
          ];
          
          paths.each(function(d, i) {
            if (i < faces.length) {
              const path = d3.path();
              path.moveTo(faces[i][0].x, faces[i][0].y);
              for (let j = 1; j < faces[i].length; j++) {
                path.lineTo(faces[i][j].x, faces[i][j].y);
              }
              path.closePath();
              d3.select(this).attr("d", path.toString());
            }
          });
        }
      });
      
      // 更新所有折线
      lineDataArray.forEach(({ monthIdx, lineData, darkerLineColor }) => {
        // 重新生成折线路径（使用与初始化时相同的lineGenerator逻辑）
        // 注意：需要按照投影后的X坐标排序，确保曲线方向正确
        const sortedLineData = [...lineData].sort((a, b) => {
          const projA = isometricProjection(a.x, a.y, a.z);
          const projB = isometricProjection(b.x, b.y, b.z);
          return projA.x - projB.x;
        });
        
        const lineGeneratorUpdate = d3.line()
          .curve(d3.curveMonotoneX)
          .x((d) => {
            const projected = isometricProjection(d.x, d.y, d.z);
            return projected.x;
          })
          .y((d) => {
            const projected = isometricProjection(d.x, d.y, d.z);
            return projected.y;
          });
        
        // 更新折线（使用正确的选择器，class是 "line-path line-${monthIdx}"）
        const lineElement = g.select(`.line-path.line-${monthIdx}`);
        if (!lineElement.empty()) {
          const newPath = lineGeneratorUpdate(sortedLineData);
          if (newPath && !newPath.includes('NaN')) {
            lineElement.attr("d", newPath);
          }
        }
        
        // 更新面积填充（重新创建areaGenerator，因为投影函数已更新）
        // 使用排序后的数据，确保与折线一致
        const areaGeneratorUpdate = d3.area()
          .curve(d3.curveMonotoneX)
          .x((d) => {
            const projected = isometricProjection(d.x, d.y, d.z);
            return projected.x;
          })
          .y0((d) => {
            const projected = isometricProjection(d.x, d.y, cellThickness);
            return projected.y;
          })
          .y1((d) => {
            const projected = isometricProjection(d.x, d.y, d.z);
            return projected.y;
          });
        
        const areaElement = g.select(`.area-${monthIdx}`);
        if (!areaElement.empty()) {
          areaElement.attr("d", areaGeneratorUpdate(sortedLineData));
        }
        
        // 更新最高点标记
        let maxZ = -Infinity;
        let maxPoint = null;
        lineData.forEach(point => {
          if (point.z > maxZ) {
            maxZ = point.z;
            maxPoint = point;
          }
        });
        
        if (maxPoint) {
          const maxProjected = isometricProjection(maxPoint.x, maxPoint.y, maxPoint.z);
          g.select(`.max-point-outer-${monthIdx}`)
            .attr("cx", maxProjected.x)
            .attr("cy", maxProjected.y);
          g.select(`.max-point-inner-${monthIdx}`)
            .attr("cx", maxProjected.x)
            .attr("cy", maxProjected.y);
        }
      });
      
      // 更新坐标轴（使用外部定义的axisOffset和labelOffset）
      
      // 更新原点
      origin = isometricProjection(-axisOffset, -axisOffset, 0);
      
      // 更新X轴
      xAxisEnd = isometricProjection(totalWidth + axisOffset, -axisOffset, 0);
      g.select(".x-axis.axis-line")
        .attr("x1", origin.x)
        .attr("y1", origin.y)
        .attr("x2", xAxisEnd.x)
        .attr("y2", xAxisEnd.y);
      
      const xAxisAngle = Math.atan2(xAxisEnd.y - origin.y, xAxisEnd.x - origin.x);
      const xArrowLength = 8;
      const xArrowPath = d3.path();
      xArrowPath.moveTo(xAxisEnd.x, xAxisEnd.y);
      xArrowPath.lineTo(
        xAxisEnd.x - xArrowLength * Math.cos(xAxisAngle - Math.PI / 6),
        xAxisEnd.y - xArrowLength * Math.sin(xAxisAngle - Math.PI / 6)
      );
      xArrowPath.lineTo(
        xAxisEnd.x - xArrowLength * Math.cos(xAxisAngle + Math.PI / 6),
        xAxisEnd.y - xArrowLength * Math.sin(xAxisAngle + Math.PI / 6)
      );
      xArrowPath.closePath();
      g.select(".x-axis.axis-arrow").attr("d", xArrowPath.toString());
      
      // 更新Y轴
      yAxisEnd = isometricProjection(-axisOffset, totalDepth + axisOffset, 0);
      g.select(".y-axis.axis-line")
        .attr("x1", origin.x)
        .attr("y1", origin.y)
        .attr("x2", yAxisEnd.x)
        .attr("y2", yAxisEnd.y);
      
      const yAxisAngle = Math.atan2(yAxisEnd.y - origin.y, yAxisEnd.x - origin.x);
      const yArrowLength = 8;
      const yArrowPath = d3.path();
      yArrowPath.moveTo(yAxisEnd.x, yAxisEnd.y);
      yArrowPath.lineTo(
        yAxisEnd.x - yArrowLength * Math.cos(yAxisAngle - Math.PI / 6),
        yAxisEnd.y - yArrowLength * Math.sin(yAxisAngle - Math.PI / 6)
      );
      yArrowPath.lineTo(
        yAxisEnd.x - yArrowLength * Math.cos(yAxisAngle + Math.PI / 6),
        yAxisEnd.y - yArrowLength * Math.sin(yAxisAngle + Math.PI / 6)
      );
      yArrowPath.closePath();
      g.select(".y-axis.axis-arrow").attr("d", yArrowPath.toString());
      
      // 更新Z轴
      zAxisEnd = isometricProjection(-axisOffset, -axisOffset, maxHeight + axisOffset);
      g.select(".z-axis.axis-line")
        .attr("x1", origin.x)
        .attr("y1", origin.y)
        .attr("x2", zAxisEnd.x)
        .attr("y2", zAxisEnd.y);
      
      const zAxisAngle = Math.atan2(zAxisEnd.y - origin.y, zAxisEnd.x - origin.x);
      const zArrowLength = 8;
      const zArrowPath = d3.path();
      zArrowPath.moveTo(zAxisEnd.x, zAxisEnd.y);
      zArrowPath.lineTo(
        zAxisEnd.x - zArrowLength * Math.cos(zAxisAngle - Math.PI / 6),
        zAxisEnd.y - zArrowLength * Math.sin(zAxisAngle - Math.PI / 6)
      );
      zArrowPath.lineTo(
        zAxisEnd.x - zArrowLength * Math.cos(zAxisAngle + Math.PI / 6),
        zAxisEnd.y - zArrowLength * Math.sin(zAxisAngle + Math.PI / 6)
      );
      zArrowPath.closePath();
      g.select(".z-axis.axis-arrow").attr("d", zArrowPath.toString());
      
      // 更新X轴标签
      allGenres.forEach((genre, idx) => {
        const x = idx * cellWidth + cellWidth / 2;
        const y = -labelOffset;
        const projected = isometricProjection(x, y, 0);
        g.select(`.x-label-${idx}`)
          .attr("x", projected.x)
          .attr("y", projected.y);
      });
      
      // 更新Y轴标签
      months.forEach((month, idx) => {
        if (idx % 3 === 0) {
          const x = 0;
          const y = idx * cellDepth + cellDepth / 2;
          const projected = isometricProjection(x - labelOffset, y, 0);
          g.select(`.y-label-${idx}`)
            .attr("x", projected.x)
            .attr("y", projected.y);
        }
      });
      
      // 更新Z轴标签
      zLabelPos = isometricProjection(-10, 0, maxHeight + 25);
      g.select(".z-label")
        .attr("x", zLabelPos.x)
        .attr("y", zLabelPos.y);
    }

    // ========== 鼠标拖动旋转事件 ==========
    svg.on("mousedown", function(event) {
      isDragging = true;
      lastMouseX = event.clientX;
      svg.style("cursor", "grabbing");
      event.preventDefault();
    });

    svg.on("mousemove", function(event) {
      if (isDragging) {
        const deltaX = event.clientX - lastMouseX;
        rotationAngle += deltaX * 0.01; // 旋转速度
        
        // 更新投影
        updateProjection();
        
        lastMouseX = event.clientX;
        event.preventDefault();
      } else {
        // ✅ 折线 tooltip 的“兜底”逻辑：不依赖命中折线本体
        // 原因：不同浏览器对透明 stroke 的命中行为不一致，导致“挪到折线也不触发”
        // 策略：鼠标移动时，计算离鼠标最近的折线点；只要靠近折线就显示 tooltip。
        try {
          // 如果鼠标在热力图方块上（cell-group），优先让方块 tooltip 生效
          const t = event && event.target ? event.target : null;
          if (t && t.closest && t.closest(".cell-group")) return;

          // 鼠标在 g 内部坐标
          const [mouseX, mouseY] = d3.pointer(event, g.node());

          let best = null; // {monthIdx, genreIdx, month, genre, value, dist}
          for (let mi = 0; mi < lineDataArray.length; mi++) {
            const series = lineDataArray[mi];
            if (!series || !series.lineData) continue;
            for (let gi = 0; gi < series.lineData.length; gi++) {
              const p = series.lineData[gi];
              const projected = isometricProjection(p.x, p.y, p.z);
              const dx = mouseX - projected.x;
              const dy = mouseY - projected.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (!best || dist < best.dist) {
                best = {
                  monthIdx: p.monthIdx,
                  genreIdx: p.genreIdx,
                  month: series.month,
                  genre: allGenres[p.genreIdx],
                  value: p.value,
                  dist
                };
              }
            }
          }

          // 命中阈值：比折线/点更宽松，确保“靠近就弹”
          if (best && best.dist < 22) {
            let trackCount = 0;
            const chunk = lineSource && lineSource[best.monthIdx] ? lineSource[best.monthIdx] : null;
            if (chunk && chunk.genre_distribution && chunk.genre_distribution[best.genre] !== undefined) {
              trackCount = chunk.genre_distribution[best.genre];
            } else {
              trackCount = Math.round(best.value);
            }

            tooltip.style("opacity", 0.95);
            tooltip.html(`<b>${best.genre}</b><br/>${best.month}<br/>曲目数量: ${trackCount}`);
            placeTooltip(event);
          } else {
            // 远离折线时隐藏（避免一直黏着）
            tooltip.style("opacity", 0);
          }
        } catch (e) {
          // 不影响拖拽/绘制
        }
      }
    });

    svg.on("mouseup", function() {
      isDragging = false;
      svg.style("cursor", "grab");
    });

    svg.on("mouseleave", function() {
      isDragging = false;
      svg.style("cursor", "grab");
    });

    // 监听窗口大小变化，SVG的viewBox会自动处理缩放
    // 不需要手动更新，因为viewBox基于内容尺寸，preserveAspectRatio会自动适应容器
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // viewBox 基于内容尺寸，不需要更新
        // preserveAspectRatio 会自动处理缩放
        console.log('📐 容器尺寸变化，SVG自动适应');
      }, 150);
    };

    window.addEventListener('resize', handleResize);
  }

  // 等待容器有尺寸后再加载数据
  // 简化：如果容器被隐藏，使用默认尺寸继续
  const waitForContainer = () => {
    const width = container.offsetWidth || container.clientWidth;
    const height = container.offsetHeight || container.clientHeight;
    
    // 如果容器有尺寸，或者容器被隐藏（使用默认尺寸）
    if (width > 0 && height > 0) {
      console.log('✅ 容器已准备好，开始加载数据');
      loadData();
    } else if (container.style.display === 'none') {
      // 如果容器被隐藏，使用默认尺寸继续
      console.log('⚠️ 容器被隐藏，使用默认尺寸继续');
      loadData();
    } else {
      console.log('⏳ 等待容器尺寸...', width, height);
      setTimeout(waitForContainer, 100);
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(waitForContainer, 100);
    });
  } else {
    setTimeout(waitForContainer, 100);
  }
})();
console.log('✅ D3伪3D热力图脚本加载完成');
