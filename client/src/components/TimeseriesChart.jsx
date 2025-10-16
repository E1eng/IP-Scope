import React, { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';

function TimeseriesChart({ data, bucket = 'daily', height = 260 }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  const series = useMemo(() => {
    const isoWeekToDate = (year, week) => {
      const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
      const dayOfWeek = simple.getUTCDay() || 7; // ISO Monday
      if (dayOfWeek !== 1) simple.setUTCDate(simple.getUTCDate() + (1 - dayOfWeek));
      return simple;
    };
    const parseKeyToDate = (key) => {
      if (!key) return null;
      if (bucket === 'daily') return new Date(`${key}T00:00:00Z`);
      if (bucket === 'monthly') return new Date(`${key}-01T00:00:00Z`);
      if (bucket === 'weekly') {
        const m = String(key).match(/^(\d{4})-W(\d{1,2})$/);
        if (m) return isoWeekToDate(parseInt(m[1], 10), parseInt(m[2], 10));
      }
      const d = new Date(key);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const points = Array.isArray(data) ? data : [];
    return points
      .map(p => ({
        date: parseKeyToDate(p.date || p.key),
        value: Number(p.totalUsdt || 0)
      }))
      .filter(p => p.date && Number.isFinite(p.value))
      .sort((a, b) => a.date - b.date);
  }, [data, bucket]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const margin = { top: 16, right: 24, bottom: 32, left: 56 };
    const makeChart = () => {
      const width = container.clientWidth || 600;
      const innerWidth = Math.max(200, width - margin.left - margin.right);
      const innerHeight = Math.max(120, height - margin.top - margin.bottom);

      // Init svg
      let svg = d3.select(svgRef.current);
      if (svg.empty()) {
        svg = d3.select(container).append('svg').attr('ref', svgRef);
        svgRef.current = svg.node();
      }
      svg.attr('width', width).attr('height', height);

      // Clear previous
      svg.selectAll('*').remove();

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      if (!series || series.length === 0) {
        g.append('text')
          .attr('x', innerWidth / 2)
          .attr('y', innerHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('fill', '#9CA3AF')
          .style('font-size', '12px')
          .text('No timeseries data');
        return;
      }

      const x = d3.scaleTime()
        .domain(d3.extent(series, d => d.date))
        .range([0, innerWidth]);

      const maxY = d3.max(series, d => d.value) || 0;
      const y = d3.scaleLinear()
        .domain([0, maxY * 1.1])
        .nice()
        .range([innerHeight, 0]);

      // Gridlines
      const yAxisGrid = d3.axisLeft(y).ticks(4).tickSize(-innerWidth).tickFormat('');
      g.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.25)
        .call(yAxisGrid)
        .selectAll('line')
        .attr('stroke', '#374151');

      // Area
      const area = d3.area()
        .x(d => x(d.date))
        .y0(y(0))
        .y1(d => y(d.value))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(series)
        .attr('fill', 'url(#grad)')
        .attr('d', area);

      // Gradient
      const defs = svg.append('defs');
      const gradient = defs.append('linearGradient')
        .attr('id', 'grad')
        .attr('x1', '0')
        .attr('x2', '0')
        .attr('y1', '0')
        .attr('y2', '1');
      gradient.append('stop').attr('offset', '0%').attr('stop-color', '#A78BFA').attr('stop-opacity', 0.45);
      gradient.append('stop').attr('offset', '100%').attr('stop-color', '#A78BFA').attr('stop-opacity', 0.05);

      // Line
      const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(series)
        .attr('fill', 'none')
        .attr('stroke', '#A78BFA')
        .attr('stroke-width', 2)
        .attr('d', line);

      // Axes
      const xAxis = d3.axisBottom(x).ticks(6).tickSizeOuter(0);
      const yAxis = d3.axisLeft(y).ticks(4).tickSizeOuter(0).tickFormat(d => `$${Number(d).toLocaleString()}`);

      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll('text')
        .attr('fill', '#9CA3AF')
        .style('font-size', '10px');

      g.append('g')
        .call(yAxis)
        .selectAll('text')
        .attr('fill', '#9CA3AF')
        .style('font-size', '10px');

      g.selectAll('.domain, .tick line').attr('stroke', '#4B5563');
    };

    makeChart();

    const ro = new ResizeObserver(() => makeChart());
    ro.observe(container);
    return () => ro.disconnect();
  }, [series, height]);

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} />
    </div>
  );
}

export default TimeseriesChart;
