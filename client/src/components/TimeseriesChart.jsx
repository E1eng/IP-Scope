import React, { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';

function TimeseriesChart({ data, bucket = 'daily', height = 260, mode = 'area' }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  const parsed = useMemo(() => {
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
    const base = points
      .map(p => ({
        date: parseKeyToDate(p.date || p.key),
        value: Number(p.totalUsdt || 0),
        ohlc: p.ohlc && typeof p.ohlc === 'object' ? {
          open: Number(p.ohlc.open ?? p.totalUsdt ?? 0),
          high: Number(p.ohlc.high ?? p.totalUsdt ?? 0),
          low: Number(p.ohlc.low ?? p.totalUsdt ?? 0),
          close: Number(p.ohlc.close ?? p.totalUsdt ?? 0)
        } : null
      }))
      .filter(p => p.date && Number.isFinite(p.value))
      .sort((a, b) => a.date - b.date);
    return base;
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

      if (!parsed || parsed.length === 0) {
        g.append('text')
          .attr('x', innerWidth / 2)
          .attr('y', innerHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('fill', '#9CA3AF')
          .style('font-size', '12px')
          .text('No timeseries data');
        return;
      }

      // Scales
      const x = d3.scaleTime()
        .domain(d3.extent(parsed, d => d.date))
        .range([0, innerWidth]);

      let yDomainMax = 0;
      if (mode === 'candle') {
        yDomainMax = d3.max(parsed, d => (d.ohlc ? d.ohlc.high : d.value)) || 0;
      } else {
        yDomainMax = d3.max(parsed, d => d.value) || 0;
      }
      const y = d3.scaleLinear()
        .domain([0, yDomainMax * 1.1])
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

      if (mode === 'candle') {
        // Compute candle width
        const steps = [];
        for (let i = 0; i < parsed.length - 1; i++) {
          const a = parsed[i].date, b = parsed[i + 1].date;
          const dx = x(b) - x(a);
          if (dx > 0) steps.push(dx);
        }
        const medianStep = steps.length ? d3.median(steps) : innerWidth / Math.max(1, parsed.length);
        const candleWidth = Math.max(4, Math.min(28, (medianStep || 12) * 0.6));

        const candles = g.selectAll('g.candle')
          .data(parsed)
          .enter()
          .append('g')
          .attr('class', 'candle')
          .attr('transform', d => `translate(${x(d.date)},0)`);

        // Wicks
        candles.append('line')
          .attr('y1', d => y(d.ohlc ? d.ohlc.high : d.value))
          .attr('y2', d => y(d.ohlc ? d.ohlc.low : d.value))
          .attr('stroke', d => {
            const up = d.ohlc ? (d.ohlc.close >= d.ohlc.open) : true;
            return up ? '#34D399' : '#F87171';
          })
          .attr('stroke-width', 1);

        // Bodies
        candles.append('rect')
          .attr('x', -candleWidth / 2)
          .attr('width', candleWidth)
          .attr('y', d => {
            const o = d.ohlc ? d.ohlc.open : d.value;
            const c = d.ohlc ? d.ohlc.close : d.value;
            return y(Math.max(o, c));
          })
          .attr('height', d => {
            const o = d.ohlc ? d.ohlc.open : d.value;
            const c = d.ohlc ? d.ohlc.close : d.value;
            const h = Math.abs(y(o) - y(c));
            return Math.max(1, h);
          })
          .attr('fill', d => {
            const up = d.ohlc ? (d.ohlc.close >= d.ohlc.open) : true;
            return up ? '#34D399' : '#F87171';
          })
          .attr('stroke', d => {
            const up = d.ohlc ? (d.ohlc.close >= d.ohlc.open) : true;
            return up ? '#059669' : '#DC2626';
          })
          .attr('stroke-width', 1)
          .attr('opacity', 0.9);
      } else {
        // Area
        const area = d3.area()
          .x(d => x(d.date))
          .y0(y(0))
          .y1(d => y(d.value))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(parsed)
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
          .datum(parsed)
          .attr('fill', 'none')
          .attr('stroke', '#A78BFA')
          .attr('stroke-width', 2)
          .attr('d', line);
      }

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
  }, [parsed, height, mode]);

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} />
    </div>
  );
}

export default TimeseriesChart;
