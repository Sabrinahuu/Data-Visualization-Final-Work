// tree.js ✅ 轻松莫兰迪色系版（奶油白背景 + 绿/紫对调）：清晰 + 不删字 + 可缩放拖拽 + 完整交互

// 使用 Parcel 的 require 方式导入 JSON（Parcel 会自动处理）
// 注意：在 Parcel 1.x 中，require 在构建时会被处理
let treeData = null;
try {
  // Parcel 会在构建时处理 require，将 JSON 文件内容内联
  treeData = require('./assets/music_genres_full_with_scraped_info.json');
  console.log('✅ 通过 require 成功导入 JSON 数据');
} catch (e) {
  console.warn('⚠️ 无法使用 require 导入 JSON（可能文件不存在或路径错误），将使用 fetch：', e.message);
  treeData = null;
}

(() => {
  // 备用路径列表（按优先级排序）
  const DATA_URLS = [
    "./assets/music_genres_full_with_scraped_info.json",  // 相对路径（推荐）
    "assets/music_genres_full_with_scraped_info.json",     // 无前导斜杠
    "/assets/music_genres_full_with_scraped_info.json",   // 绝对路径
    "../assets/music_genres_full_with_scraped_info.json", // 上一级目录
    "/src/assets/music_genres_full_with_scraped_info.json" // src 目录
  ];

  function getSize() {
    const svgEl = document.getElementById("tree");
    if (!svgEl) {
      console.error("❌ tree.js: 找不到 #tree 元素");
      return { w: 800, h: 600 };
    }
    
    // 优先从 chart-content 获取尺寸
    const chartContent = svgEl.closest(".chart-content");
    let w = 800;
    let h = 600;
    
    if (chartContent) {
      w = chartContent.clientWidth || chartContent.offsetWidth || 800;
      h = chartContent.clientHeight || chartContent.offsetHeight || 600;
    } else {
      // 备用：从 panel-tree 获取
      const panel = document.getElementById("panel-tree");
      if (panel) {
        w = panel.clientWidth || panel.offsetWidth || 800;
        h = panel.clientHeight || panel.offsetHeight || 600;
      } else {
        // 最后备用：从 SVG 自身获取
        w = svgEl.clientWidth || svgEl.offsetWidth || 800;
        h = svgEl.clientHeight || svgEl.offsetHeight || 600;
      }
    }
    
    // 确保最小尺寸（至少要有可见区域）
    if (w < 200) {
      console.warn(`⚠️ tree.js: 宽度太小 (${w})，使用默认值 800`);
      w = 800;
    }
    if (h < 200) {
      console.warn(`⚠️ tree.js: 高度太小 (${h})，使用默认值 600`);
      h = 600;
    }
    
    console.log(`✅ tree.js: 获取尺寸 w=${w}, h=${h}`);
    return { w, h };
  }

  // ✅ 过滤门槛
  const minGrandchildCount = 5;
  const minGrandchildCountClassical = 1;
  const minGrandchildCountElectronic = 8;

  function getThreshold(categoryName, subcategoryName) {
    const name = (subcategoryName || categoryName || "").toLowerCase();
    if (name.includes("electronic") || name.includes("electro")) return minGrandchildCountElectronic;
    if (categoryName === "Classical") return minGrandchildCountClassical;
    return minGrandchildCount;
  }

  function buildHierarchy(raw) {
    const allowedCategories = ["Popular", "Classical"];
    const filteredData = raw.filter((d) => allowedCategories.includes(d.category));

    return d3.hierarchy({
      name: "Music Genres",
      children: filteredData.map((d) => ({
        name: d.category,
        children: (d.subcategories || [])
          .map((sc) => {
            const threshold = getThreshold(d.category, sc.subcategory);
            const genres = (sc.genres || [])
              .map((g) => ({ name: g.name, children: g.children || [] }))
              .filter((g) => (g.children || []).length >= threshold);

            if (genres.length < threshold) return null;
            return { name: sc.subcategory || "General", children: genres };
          })
          .filter(Boolean),
      })),
    });
  }

  function getTopCategory(d) {
    const strictNames = ["Rock", "Classical", "Electronic", "Popular"];
    const fuzzyNames = ["Rap", "Jazz", "Folk"];
    const excludeNames = ["Trap"];

    const ancestors = d.ancestors();
    for (const ancestor of ancestors) {
      const name = (ancestor.data.name || "").toLowerCase();

      const strictMatch = strictNames.find((k) => name === k.toLowerCase());
      if (strictMatch) return strictMatch;

      const isExcluded = excludeNames.some((k) => name.includes(k.toLowerCase()));
      if (isExcluded) continue;

      const fuzzyMatch = fuzzyNames.find((k) => name.includes(k.toLowerCase()));
      if (fuzzyMatch) return fuzzyMatch;
    }
    return d.data.name;
  }

  function isTopLevelCategory(d) {
    const name = (d.data.name || "").toLowerCase();
    return name === "popular" || name === "classical";
  }

  function isHighlightedNode(d) {
    const strictNames = ["Rock", "Classical", "Electronic", "Popular"];
    const fuzzyNames = ["Rap", "Jazz", "Folk"];
    const excludeNames = ["Trap"];
    const name = (d.data.name || "").toLowerCase();

    const isExcluded = excludeNames.some((k) => name.includes(k.toLowerCase()));
    if (isExcluded) return false;

    const isStrictMatch = strictNames.some((k) => name === k.toLowerCase());
    const isFuzzyMatch = fuzzyNames.some((k) => name.includes(k.toLowerCase()));
    return isStrictMatch || isFuzzyMatch;
  }

  // ✅ 方案三：按层级固定圆点半径（更清晰）
  function rByDepth(d) {
    if (d.depth === 0) return 0;
    if (d.depth === 1) return 14;
    if (d.depth === 2) return 9;
    if (d.depth === 3) return 6;
    return 4;
  }

  function stretchRadialDistance(root) {
    root.descendants().forEach((d) => {
      if (d.depth === 0) d.y = 0;
      else if (d.depth === 1) d.y *= 1.15;
      else if (d.depth === 2) d.y *= 1.45;
      else if (d.depth === 3) d.y *= 1.85;
      else d.y *= 2.25;
    });
  }

  // ✅ 深色科技风背景（与页面主题一致）
  // 图表背景：保持透明（背景由独立视觉层 + 面板承载）
  const CREAM_BG = "transparent";

  // ✅ 轻松莫兰迪 + “绿/紫对调”
  // 原本：Electronic=绿，Classical=紫
  // 现在：Electronic=紫，Classical=绿（更符合你偏爱紫色）
 // ✅ 霓虹赛博配色方案（与热力图一致）
// 亮度高、对比强、用于深色背景下的发光视觉
const categoryDomain = ["Pop","ACG",  "Rock", "Classical", "Electronic", "Folk", "Jazz", "Rap"];

const neonPalette = {
  Pop: "#7c3aed",        // 霓虹紫
  ACG: "#ff3bd4",        // 霓虹粉
  Rock: "#00fff0",       // 电青
  Classical: "#F59E0B",  // 琥珀金
  Electronic: "#32a7ff", // 电蓝
  Folk: "#a78bfa",       // 低饱和紫
  Jazz: "#f472b6",       // 柔粉
  Rap: "#94A3B8"         // 冷灰蓝
};

const colorScale = d3.scaleOrdinal()
  .domain(categoryDomain)
  .range(categoryDomain.map(k => neonPalette[k] || "#999"));

  // 文字要用到与连线一致的颜色
function lineColorOf(d) {
  return colorScale(normalizeCategoryName(getTopCategory(d)));
}

// 被放大的文字（顶层/高亮）用线色；其余用默认浅色
function textFill(d) {
  return (isTopLevelCategory(d) || isHighlightedNode(d)) ? lineColorOf(d) : TEXT_COLOR;
}


  function normalizeCategoryName(name) {
    const n = (name || "").toLowerCase();
    if (n.includes("popular")) return "Popular";
    if (n.includes("rock")) return "Rock";
    if (n.includes("electronic") || n.includes("electro")) return "Electronic";
    if (n.includes("classical")) return "Classical";
    if (n.includes("jazz")) return "Jazz";
    if (n.includes("folk")) return "Folk";
    if (n.includes("rap") || n.includes("hip hop") || n.includes("hiphop")) return "Rap";
    return "Other";
  }

  // ✅ 深色主题下的文字颜色（浅色文字，适应深色背景）
  const TEXT_COLOR = "#e2e8f0"; // 浅色文字，与页面主题一致
  const TEXT_STROKE = "rgba(10, 14, 39, 0.85)"; // 深色描边，增强文字可读性
  const LINK_OPACITY = 0.32;
  const LINK_WIDTH = 1.6;
  const NODE_OPACITY = 0.92;

 // ---------- Legend + Filter Utilities (updated) ----------
const LEGEND_GAP_Y = 8;
const LEGEND_PAD = 10;
const LEGEND_CORNER = 10;
const LEGEND_ALPHA_OFF = 0.22;
const disabledCategories = new Set();

/** 🧮 汇总每个类别在整棵树中的节点总数（包括所有后代） */
function computeCategoryCounts(root) {
  const counts = {};
  root.descendants().forEach((d) => {
    const cat = normalizeCategoryName(getTopCategory(d));
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return counts;
}

/** 根据禁用集更新节点与连线的可见性 */
function applyCategoryFilter(svg) {
  svg.selectAll('g.node')
    .attr('display', function() {
      const cat = this.getAttribute('data-cat');
      return (cat && disabledCategories.has(cat)) ? 'none' : null;
    });

  svg.selectAll('path.link')
    .attr('display', function() {
      const cat = this.getAttribute('data-cat');
      return (cat && disabledCategories.has(cat)) ? 'none' : null;
    });
}

/** 绘制左上角的图例，圆圈大小按类别节点总数缩放 */
function renderLegend(svg, w, h, root) {
  svg.selectAll('g.legend').remove();

  const counts = computeCategoryCounts(root);
  const maxCount = d3.max(Object.values(counts)) || 1;

  const sizeScale = d3.scaleSqrt()
    .domain([0, maxCount])
    .range([4, 14]); // 最小 4px，最大 14px

  const legendItems = categoryDomain
    .map(k => ({ key: k, color: colorScale(k), size: sizeScale(counts[k] || 0) }))
    .filter(d => d.color && d.key !== 'Other');

  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${-w/2 + 16}, ${-h/2 + 16})`)
    .style('pointer-events', 'all');

  const bg = legend.append('rect')
    .attr('rx', LEGEND_CORNER)
    .attr('ry', LEGEND_CORNER)
    .attr('fill', 'rgba(2,6,23,0.72)')
    .attr('stroke', 'rgba(88,101,242,0.45)')
    .attr('stroke-width', 1);

  const itemsG = legend.append('g');

  const item = itemsG.selectAll('g.item')
    .data(legendItems)
    .join('g')
    .attr('class', 'item')
    .attr('transform', (_, i) => 
      `translate(${LEGEND_PAD}, ${LEGEND_PAD + i*(18 + LEGEND_GAP_Y)})`)
    .style('cursor', 'pointer')
    .on('click', function(_, d) {
      if (disabledCategories.has(d.key)) disabledCategories.delete(d.key);
      else disabledCategories.add(d.key);
      d3.select(this).attr('opacity', disabledCategories.has(d.key) ? LEGEND_ALPHA_OFF : 1);
      applyCategoryFilter(svg);
      d3.event?.stopPropagation?.();
    })
    .on('dblclick', function(_, d) {
      const onlyThis =
        (disabledCategories.size === (legendItems.length - 1)) &&
        !disabledCategories.has(d.key);
      if (onlyThis) disabledCategories.clear();
      else {
        disabledCategories.clear();
        legendItems.forEach(li => li.key !== d.key && disabledCategories.add(li.key));
      }
      itemsG.selectAll('g.item')
        .attr('opacity', li => disabledCategories.has(li.key) ? LEGEND_ALPHA_OFF : 1);
      applyCategoryFilter(svg);
      d3.event?.stopPropagation?.();
    });

  // ✅ 圆圈大小代表该类所有后代节点数
  item.append('circle')
    .attr('r', d => d.size)
    .attr('fill', d => d.color)
    .attr('fill-opacity', 0.95)
    .attr('stroke', 'rgba(226,232,240,0.5)');

  item.append('text')
    .attr('x', 20)
    .attr('dy', '0.32em')
    .attr('font-size', 12)
    .attr('font-weight', 560)
    .attr('fill', TEXT_COLOR)
    .text(d => `${d.key} (${counts[d.key] || 0})`);

  const bbox = itemsG.node().getBBox();
  bg.attr('x', bbox.x - LEGEND_PAD)
    .attr('y', bbox.y - LEGEND_PAD)
    .attr('width', bbox.width + LEGEND_PAD*2)
    .attr('height', bbox.height + LEGEND_PAD*2);

  legend.on('mousedown touchstart', (event) => event.stopPropagation());
}


  function render(raw) {
    const svgEl = document.getElementById("tree");
    if (!svgEl) {
      console.error("❌ tree.js: render 时找不到 #tree 元素");
      return;
    }
    
    const { w, h } = getSize();
    const radius = Math.min(w, h) / 2;
    
    if (radius < 50) {
      console.error(`❌ tree.js: 尺寸太小，无法渲染 (w=${w}, h=${h}, radius=${radius})`);
      return;
    }

    const svg = d3.select("#tree");
    if (svg.empty()) {
      console.error("❌ tree.js: d3.select('#tree') 返回空");
      return;
    }
    
    svg.selectAll("*").remove();

    svg
      .attr("width", w)
      .attr("height", h)
      .attr("viewBox", `${-w / 2} ${-h / 2} ${w} ${h}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("font", "11px sans-serif")
      .style("cursor", "grab")
      .style("display", "block")
      .style("min-width", "200px")
      .style("min-height", "200px")
      .style("background", CREAM_BG);

    // ✅ 画布 g（zoom/pan 只作用在这个 g）
    const g = svg.append("g");

    const root = buildHierarchy(raw);
    if (!root.children || root.children.length === 0) {
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("font-size", 18)
        .attr("fill", "#666")
        .text("Tree: no data after filtering");
      return;
    }

    const tree = d3.tree().size([2 * Math.PI, radius - 60]);
    tree(root);
    stretchRadialDistance(root);

    // ✅ 连线
    g.append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", LINK_OPACITY)
      .attr("stroke-width", LINK_WIDTH)
      .selectAll("path")
      .data(root.links())
      .join("path")
      .attr("stroke", (d) => colorScale(normalizeCategoryName(getTopCategory(d.target))))
      .attr("d", d3.linkRadial().angle((d) => d.x).radius((d) => d.y));

    // ✅ 节点
    const node = g.append("g")
      .selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", (d) => `
        rotate(${(d.x * 180) / Math.PI - 90})
        translate(${d.y},0)
      `);

    // ✅ 创建 tooltip
    let tooltip = d3.select("body").select(".tree-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body")
        .append("div")
        .attr("class", "tree-tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("padding", "12px 14px")
        .style("border-radius", "12px")
        .style("background", "rgba(15, 23, 42, 0.95)")
        .style("color", "#e2e8f0")
        .style("font", "13px/1.4 system-ui, -apple-system, Segoe UI, Microsoft YaHei, sans-serif")
        .style("opacity", 0)
        .style("backdrop-filter", "blur(6px)")
        .style("z-index", 1000)
        .style("border", "1px solid rgba(88, 101, 242, 0.5)");
    }

    // ✅ 节点 hover 交互 - 绑定到整个node组，这样circle和text都能响应
    node
      .style("cursor", "pointer")
      .on("mouseenter", function(event, d) {
        if (d.depth === 0) return;
        
        const ancestors = d.ancestors();
        const category = ancestors.length > 1 ? ancestors[1].data.name : "";
        const subcategory = ancestors.length > 2 ? ancestors[2].data.name : "";
        const scrapedInfo = d.data.scraped_info || {};
        const location = scrapedInfo.location || null;
        const years = scrapedInfo.years || [];
        const culturalOrigins = scrapedInfo.cultural_origins || null;
        const stylisticOrigins = scrapedInfo.stylistic_origins || null;
        
        let html = `<div style="font-weight:800;margin-bottom:6px;letter-spacing:.3px">${d.data.name}</div>`;
        
        if (d.depth === 1) {
          html += `<div style="opacity:.92">类别：${category}</div>`;
        } else if (d.depth === 2) {
          html += `<div style="opacity:.92">类别：${category}</div>`;
          html += `<div style="opacity:.92">子类别：${subcategory}</div>`;
        } else if (d.depth >= 3) {
          html += `<div style="opacity:.92">类别：${category}</div>`;
          if (subcategory) {
            html += `<div style="opacity:.92">子类别：${subcategory}</div>`;
          }
          html += `<div style="opacity:.92">流派：${d.data.name}</div>`;
        }
        
        if (years && years.length > 0) {
          const yearStr = years.length === 1 ? years[0] : 
                         years.length === 2 ? `${years[0]} - ${years[1]}` : 
                         `${years[0]} - ${years[years.length - 1]}`;
          html += `<div style="opacity:.92;margin-top:6px">时间：${yearStr}</div>`;
        } else if (culturalOrigins) {
          const yearMatch = culturalOrigins.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
          if (yearMatch) {
            html += `<div style="opacity:.92;margin-top:6px">时间：${culturalOrigins}</div>`;
          }
        }
        
        if (location) {
          html += `<div style="opacity:.92">地点：${location}</div>`;
        }
        
        if (culturalOrigins && !years.length) {
          html += `<div style="opacity:.92">文化起源：${culturalOrigins}</div>`;
        }
        
        if (stylisticOrigins) {
          html += `<div style="opacity:.92">风格起源：${stylisticOrigins}</div>`;
        }
        
        if (d.children && d.children.length > 0) {
          html += `<div style="opacity:.70;margin-top:6px">子节点数：${d.children.length}</div>`;
        }
        
        // 高亮当前节点
        d3.select(this).select("circle")
          .attr("stroke-width", 2.5)
          .attr("stroke", "#5865f2");
        
        tooltip
          .style("opacity", 1)
          .html(html);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", (event.pageX + 14) + "px")
          .style("top", (event.pageY + 14) + "px");
      })
      .on("mouseleave", function(event, d) {
        // 恢复原始样式
        d3.select(this).select("circle")
          .attr("stroke-width", 1)
          .attr("stroke", "rgba(226, 232, 240, 0.6)"); // 浅色描边，适应深色背景
        tooltip.style("opacity", 0);
      });

    node.append("circle")
      .attr("r", rByDepth)
      .attr("fill", (d) => colorScale(normalizeCategoryName(getTopCategory(d))))
      .attr("fill-opacity", NODE_OPACITY)
      .attr("stroke", "rgba(226, 232, 240, 0.6)") // 浅色描边，适应深色背景
      .attr("stroke-width", 1);

    // ✅ 文字（不删字）
    const baseFont = 8;
    const midFont = 13;
    const bigFont = 16;

    node.append("text")
  .attr("class", "genre-label")
  .attr("dy", "0.31em")
  .attr("x", (d) => {
    const offset = 10 + d.depth * 6;
    return d.x < Math.PI === !d.children ? offset : -offset;
  })
  .attr("text-anchor", (d) =>
    d.x < Math.PI === !d.children ? "start" : "end"
  )
  .attr("transform", (d) =>
    d.x >= Math.PI ? "rotate(180)" : null
  )
  .attr("font-size", (d) => {
    if (isTopLevelCategory(d)) return `${bigFont}px`;
    if (isHighlightedNode(d)) return `${midFont}px`;
    return `${baseFont}px`;
  })
  .attr("font-weight", (d) =>
    isTopLevelCategory(d) ? "750" : (isHighlightedNode(d) ? "650" : "450")
  )
  // 关键：用行内样式并加 !important，避免被外部 CSS 覆盖
  .attr("style", (d) => `fill: ${textFill(d)} !important;`)
  .text((d) => (d.depth === 0 ? "" : d.data.name))
  // 克隆一份做描边阴影
  .clone(true)
  .lower()
  .attr("stroke", TEXT_STROKE)
  .attr("stroke-width", 0.8)
  // 再保险：把克隆文本的填充也锁定（防止某些全局样式影响）
  .attr("style", (d) => `fill: ${textFill(d)} !important;`);

    // ✅ 缩放 + 拖拽
    const zoom = d3.zoom()
      .scaleExtent([0.45, 7])
      .on("start", () => svg.style("cursor", "grabbing"))
      .on("end", () => svg.style("cursor", "grab"))
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.scale(0.95));

    // ✅ 渲染左上角图例（圆圈大小代表所有后代总数）
renderLegend(svg, w, h, root);

    console.log("✅ tree 绘制完成（奶油白背景 + 紫色偏好）");
  }

  // 尝试加载数据的函数（支持多个备用路径）
  function loadData() {
    // 如果已经有通过 require 导入的数据，直接使用
    if (treeData && Array.isArray(treeData)) {
      console.log("✅ tree 数据加载成功（通过 require），数据条数：", treeData.length);
      return Promise.resolve(treeData);
    }
    
    // 否则尝试 fetch
    return tryFetchData();
  }
  
  // 尝试多个路径加载数据
  function tryFetchData() {
    console.log("✅ tree.js: 开始尝试加载数据...");
    
    function tryUrl(index) {
      if (index >= DATA_URLS.length) {
        throw new Error("所有路径都尝试失败");
      }
      
      const url = DATA_URLS[index];
      console.log(`📡 尝试路径 ${index + 1}/${DATA_URLS.length}: ${url}`);
      
      return d3.json(url)
        .then(raw => {
          // 检查返回的是否是 HTML（404 页面）
          if (typeof raw === 'string' || (raw && raw.documentElement)) {
            throw new Error(`路径 ${url} 返回了 HTML 而不是 JSON`);
          }
          
          if (!raw || !Array.isArray(raw)) {
            throw new Error(`路径 ${url} 返回的数据格式错误`);
          }
          
          console.log(`✅ tree 数据加载成功（路径: ${url}），数据条数：`, raw.length);
          return raw;
        })
        .catch(err => {
          console.warn(`❌ 路径 ${url} 失败:`, err.message);
          // 尝试下一个路径
          return tryUrl(index + 1);
        });
    }
    
    return tryUrl(0);
  }
  
  // 等待 DOM 加载完成
  function init() {
    const svgEl = document.getElementById("tree");
    if (!svgEl) {
      console.warn("⚠️ tree.js: DOM 未就绪，等待 100ms 后重试...");
      setTimeout(init, 100);
      return;
    }
    
    loadData()
      .then((raw) => {
        render(raw);
        window.addEventListener("resize", () => {
          setTimeout(() => render(raw), 100);
        });
      })
      .catch((err) => {
        console.error("❌ tree 数据加载失败：所有路径都尝试失败", err);
        const svg = d3.select("#tree");
        if (!svg.empty()) {
          svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", 0)
            .attr("y", 0)
            .attr("font-size", 14)
            .attr("fill", "#ff4444")
            .text(`数据加载失败，请检查文件路径`);
        }
      });
  }
  
  // 如果 DOM 已加载，立即执行；否则等待
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    // DOM 已加载，但可能 SVG 元素还没创建，延迟一下
    setTimeout(init, 50);
  }
})();

  
