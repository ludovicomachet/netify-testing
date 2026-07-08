const REGIONS = [
  { key: "East Asia Pacific", color: "var(--series-1)" },
  { key: "South Asia", color: "var(--series-2)" },
  { key: "Sub-Saharan Africa", color: "var(--series-3)" },
  { key: "Europe and Central Asia", color: "var(--series-4)" },
  { key: "Latin America and Caribbean", color: "var(--series-5)" },
  { key: "Middle East and North Africa", color: "var(--series-6)" },
  { key: "North America", color: "var(--series-7)" },
];

function hideLoader() {
  const loader = document.getElementById("loader-wrapper");
  if (!loader) return;
  loader.classList.add("fade-out");
  setTimeout(() => { loader.style.display = "none"; }, 600);
}

function formatCompact(n) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
}

function renderHero(data) {
  const first = data[0];
  const last = data[data.length - 1];

  const worldFirst = d3.sum(REGIONS, r => first[r.key]);
  const worldLast = d3.sum(REGIONS, r => last[r.key]);
  const growth = worldLast / worldFirst;

  document.getElementById("hero-value").textContent = formatCompact(worldLast);
  document.getElementById("hero-sub").textContent =
    `${growth.toFixed(1)}x the ${first.Year} total across these seven regions.`;

  const growthByRegion = REGIONS.map(r => ({
    key: r.key,
    growth: last[r.key] / first[r.key],
  })).sort((a, b) => d3.descending(a.growth, b.growth));
  const top = growthByRegion[0];

  document.getElementById("hero-value-2").textContent = top.key;
  document.getElementById("hero-sub-2").textContent =
    `Population grew ${top.growth.toFixed(1)}x from ${first.Year} to ${last.Year}.`;
}

function renderTable(data) {
  const last = data[data.length - 1];
  const worldLast = d3.sum(REGIONS, r => last[r.key]);

  const rows = REGIONS.map(r => ({
    key: r.key,
    color: r.color,
    value: last[r.key],
    share: last[r.key] / worldLast,
  })).sort((a, b) => d3.descending(a.value, b.value));

  const container = d3.select("#table-container");
  const table = container.append("table").attr("class", "pop-table");
  const thead = table.append("thead").append("tr");
  thead.append("th").text("Region");
  thead.append("th").text("Population");
  thead.append("th").text("Share");

  const tbody = table.append("tbody");
  const tr = tbody.selectAll("tr").data(rows).join("tr");
  const th = tr.append("td");
  th.append("span").attr("class", "swatch").style("background-color", d => d.color);
  th.append("span").text(d => d.key);
  tr.append("td").attr("class", "num").text(d => formatCompact(d.value));
  tr.append("td").attr("class", "num").text(d => d3.format(".1%")(d.share));
}

function renderLegend(regions) {
  const legend = d3.select("#legend-container");
  const item = legend.selectAll(".legend-item").data(regions).join("div").attr("class", "legend-item");
  item.append("span").attr("class", "legend-swatch").style("background-color", d => d.color);
  item.append("span").attr("class", "legend-label").text(d => d.key);
}

function renderChart(data) {
  const container = document.getElementById("chart-container");
  const width = container.clientWidth || 600;
  const height = 380;
  const margin = { top: 16, right: 130, bottom: 28, left: 48 };

  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Year))
    .range([margin.left, width - margin.right]);

  const maxY = d3.max(data, d => d3.max(REGIONS, r => d[r.key]));
  const y = d3.scaleLinear()
    .domain([0, maxY]).nice()
    .range([height - margin.bottom, margin.top]);

  // gridlines
  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
    .attr("transform", `translate(${margin.left},0)`)
    .call(g => g.select(".domain").remove());

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(formatCompact));

  REGIONS.forEach(r => {
    const path = d3.line()
      .x(d => x(d.Year))
      .y(d => y(d[r.key]));

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", r.color)
      .attr("stroke-width", 2)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("d", path);
  });

  // direct end-labels for the top 3 series by final value (selective labeling)
  const last = data[data.length - 1];
  const topThree = [...REGIONS].sort((a, b) => d3.descending(last[a.key], last[b.key])).slice(0, 3);
  topThree.forEach(r => {
    svg.append("circle")
      .attr("cx", x(last.Year))
      .attr("cy", y(last[r.key]))
      .attr("r", 4)
      .attr("fill", r.color)
      .attr("stroke", "var(--surface-1)")
      .attr("stroke-width", 2);

    svg.append("text")
      .attr("x", x(last.Year) + 8)
      .attr("y", y(last[r.key]))
      .attr("dy", "0.32em")
      .attr("class", "end-label")
      .text(r.key.replace(" and Central Asia", "").replace(" Pacific", ""));
  });

  // hover crosshair + tooltip
  const focusLine = svg.append("line")
    .attr("class", "crosshair")
    .attr("y1", margin.top)
    .attr("y2", height - margin.bottom)
    .style("display", "none");

  const tooltip = d3.select(container).append("div").attr("class", "chart-tooltip").style("display", "none");

  svg.append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", width - margin.left - margin.right)
    .attr("height", height - margin.top - margin.bottom)
    .attr("fill", "transparent")
    .on("mousemove", function (event) {
      const [mx] = d3.pointer(event);
      const year = Math.round(x.invert(mx));
      const point = data.reduce((a, b) => Math.abs(b.Year - year) < Math.abs(a.Year - year) ? b : a);

      focusLine.attr("x1", x(point.Year)).attr("x2", x(point.Year)).style("display", null);

      const rows = REGIONS.map(r => `<div class="tooltip-row"><span class="line-key" style="background:${r.color}"></span><span class="tooltip-label">${r.key}</span><span class="tooltip-value">${formatCompact(point[r.key])}</span></div>`).join("");
      tooltip.html(`<div class="tooltip-year">${point.Year}</div>${rows}`)
        .style("display", null)
        .style("left", `${x(point.Year) + 12}px`)
        .style("top", `${margin.top}px`);
    })
    .on("mouseleave", function () {
      focusLine.style("display", "none");
      tooltip.style("display", "none");
    });
}

function main(data) {
  renderHero(data);
  renderTable(data);
  renderLegend(REGIONS);
  renderChart(data);
  hideLoader();
}

d3.csv("population.csv", d3.autoType).then(main);
