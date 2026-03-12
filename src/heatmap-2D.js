// heatmap-2D.js - 2D热力图（已去除折线趋势图）
// ✅ Inline CSV data (for heatmap)
(() => {
  // 等待DOM加载完成
  const init2DHeatmap = () => {
    // 使用 heatmap-2d 容器
    const container = document.getElementById("heatmap-2d") || document.getElementById("heatmap");
    if (!container) {
      console.error('❌ 找不到heatmap容器');
      return;
    }
    
    // 使用容器的ID进行选择
    const containerId = container.id;
    d3.select(`#${containerId}`).selectAll("*").remove();
    // ⚠️ 不要全局 remove：3D/2D 共享 tooltip，否则会互相删掉导致“tooltip 没了”

    const csvData = `month,classical,electronic,folk,jazz,pop,rock,ACG,rap
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
2025-12,33,32,60,45,23,32,33,39
`;

    const data = d3.csvParse(csvData.trim());

    // ✅ Genre keys（与你原逻辑一致）
    const genres = ["ACG", "classical", "electronic", "folk", "jazz", "pop", "rap", "rock"];
    const months = data.map(d => d["month"]);

    const heatmapData = data.flatMap(row =>
      genres.map(genre => ({
        month: row["month"],
        genre,
        value: +row[genre]
      }))
    );

    // === 自适应尺寸计算 ===
    const heatmapContainer = container;
    const containerWidth = heatmapContainer.clientWidth || 900;
    const containerHeight = heatmapContainer.clientHeight || 320;

    const margin = {
      top: Math.max(22, containerHeight * 0.10),
      right: Math.max(18, containerWidth * 0.03),
      bottom: Math.max(46, containerHeight * 0.18),
      left: Math.max(64, containerWidth * 0.10)
    };

    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const root = d3.select(`#${containerId}`)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // ✅ 背景“卡片内衬”
    root.append("rect")
      .attr("x", 10)
      .attr("y", 10)
      .attr("width", containerWidth - 20)
      .attr("height", containerHeight - 20)
      .attr("rx", 14)
      .attr("ry", 14)
      .attr("fill", "rgba(7, 3, 18, 0.18)")
      .attr("stroke", "rgba(50, 167, 255, 0.16)");

    const svg = root.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // === Axes ===
    const x = d3.scaleBand().range([0, width]).domain(months).padding(0.08);
    const y = d3.scaleBand().range([height, 0]).domain(genres).padding(0.10);

    const css = getComputedStyle(document.documentElement);
    const axisColor = (css.getPropertyValue("--axis-text-strong") || "").trim() || "rgba(226, 232, 240, 0.88)";
    const gridColor = (css.getPropertyValue("--axis-grid") || "").trim() || "rgba(50, 167, 255, 0.12)";

    const cssVar = (name, fallback) => (css.getPropertyValue(name) || "").trim() || fallback;
    const accentViolet = cssVar("--accent-violet", "#7c3aed");
    const accentCyan   = cssVar("--accent-cyan",   "#00fff0");

    const xAxis = svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickSizeOuter(0));

    if (months.length > 12 || containerWidth < 560) {
      xAxis.selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dx", "-0.45em")
        .attr("dy", "0.55em");
    }

    xAxis.selectAll("path, line").attr("stroke", "rgba(50, 167, 255, 0.26)");
    xAxis.selectAll("text")
      .attr("fill", axisColor)
      .style("font-size", "12px")
      .style("paint-order", "stroke")
      .style("stroke", "rgba(7, 3, 18, 0.72)")
      .style("stroke-width", "2.0px")
      .style("stroke-linejoin", "round");

    const yAxis = svg.append("g")
      .call(d3.axisLeft(y).tickSizeOuter(0));

    yAxis.selectAll("path, line").attr("stroke", "rgba(50, 167, 255, 0.26)");
    yAxis.selectAll("text")
      .attr("fill", axisColor)
      .style("font-size", "12px")
      .style("paint-order", "stroke")
      .style("stroke", "rgba(7, 3, 18, 0.72)")
      .style("stroke-width", "2.0px")
      .style("stroke-linejoin", "round");

    // === ✅ 颜色：赛博霓虹渐变（与 3D 一致） ===
    const vMin = d3.min(heatmapData, d => d.value);
    const vMax = d3.max(heatmapData, d => d.value);

    const cyberStops = [
      "#2a4e8f",   // 亮蓝底（低值不黑）
      accentViolet, // 紫
      accentCyan,  // 青
      "#ff5adf"    // 柔粉（最高值端）
    ];
    const cyberInterpolator = d3.interpolateRgbBasis(cyberStops);

    const colorScale = d3.scaleSequential()
      .domain([vMin, vMax])
      .interpolator(cyberInterpolator);

    // === 颜色映射图例（2D/3D 共用容器）===
    (function updateLegend() {
      const legend = document.getElementById("heatmap-color-legend");
      if (!legend) return;
      const fmt = d3.format(",d");
      legend.innerHTML = `
        <div class="legend-title">Score → Color</div>
        <div class="legend-bar" style="background: linear-gradient(90deg, ${cyberStops.join(",")});"></div>
        <div class="legend-labels">
          <span>${fmt(vMin ?? 0)}</span>
          <span>${fmt(vMax ?? 0)}</span>
        </div>
      `;
    })();

    // === Tooltip（2D/3D 复用同一个）===
    let tooltip = d3.select("body").select(".heatmap-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div").attr("class", "heatmap-tooltip");
    }
    tooltip
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

    // === Heatmap cells（仅保留方块，无任何折线/点/光晕）===
    svg.selectAll("rect.cell")
      .data(heatmapData)
      .enter()
      .append("rect")
      .attr("class", "cell")
      .attr("x", d => x(d.month))
      .attr("y", d => y(d.genre))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("fill", d => colorScale(d.value))
      .attr("stroke", gridColor)
      .attr("stroke-width", 1)
      .on("mousemove", (event, d) => {
        tooltip.style("opacity", 1).html(`<b>${d.genre}</b><br/>${d.month}<br/>Value: ${d.value}`);
        const cx = (event && typeof event.clientX === "number") ? event.clientX : (event && typeof event.pageX === "number" ? event.pageX : 0);
        const cy = (event && typeof event.clientY === "number") ? event.clientY : (event && typeof event.pageY === "number" ? event.pageY : 0);
        const node = tooltip.node();
        const w = node ? (node.offsetWidth || 0) : 0;
        const h = node ? (node.offsetHeight || 0) : 0;
        const pad = 10;
        let tx = cx + 12;
        let ty = cy - 18;
        tx = Math.max(pad, Math.min(tx, (window.innerWidth || 0) - w - pad));
        ty = Math.max(pad, Math.min(ty, (window.innerHeight || 0) - h - pad));
        tooltip.style("left", `${tx}px`).style("top", `${ty}px`);
      })
      .on("mouseout", () => tooltip.style("opacity", 0));

    console.log("✅ 2D Heatmap rendered (pure heatmap, trend lines removed)");
  };
  
  // 导出初始化函数，允许外部调用
  window.init2DHeatmap = init2DHeatmap;
  
  // 等待容器有尺寸后再执行（若容器隐藏则使用默认尺寸继续）
  const waitForContainer = () => {
    const container = document.getElementById("heatmap-2d") || document.getElementById("heatmap");
    if (!container) {
      console.error('❌ 找不到heatmap容器');
      return;
    }
    const width = container.offsetWidth || container.clientWidth;
    const height = container.offsetHeight || container.clientHeight;
    if (width > 0 && height > 0) {
      init2DHeatmap();
    } else if (container.style.display === 'none') {
      console.log('⚠️ 容器被隐藏，使用默认尺寸继续');
      init2DHeatmap();
    } else {
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
