import React, { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';

function PieChart({ data, height = 260, colors }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  const items = useMemo(() => {
    const entries = Object.entries(data || {}).filter(([, v]) => typeof v === 'number' && v > 0);
    return entries.map(([k, v]) => ({ key: k, value: v }));
  }, [data]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 480;
    const radius = Math.min(width, height) / 2 - 8;

    let svg = d3.select(svgRef.current);
    if (svg.empty()) {
      svg = d3.select(container).append('svg').attr('ref', svgRef);
      svgRef.current = svg.node();
    }
    svg.attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

    if (!items || items.length === 0) {
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', '#9CA3AF')
        .style('font-size', '12px')
        .text('No data');
      return;
    }

    const pie = d3.pie().sort(null).value(d => d.value);
    const arc = d3.arc().innerRadius(radius * 0.55).outerRadius(radius);

    const defaultColor = d3.scaleOrdinal()
      .domain(items.map(d => d.key))
      .range(colors || ['#60A5FA', '#34D399', '#F59E0B', '#F472B6', '#A78BFA', '#F87171']);

    const arcs = g.selectAll('path').data(pie(items)).enter().append('g');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => defaultColor(d.data.key))
      .attr('stroke', '#111827')
      .attr('stroke-width', 1);

    // Labels
    const labelArc = d3.arc().innerRadius(radius * 0.75).outerRadius(radius * 0.9);
    arcs.append('text')
      .attr('transform', d => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('fill', '#E5E7EB')
      .style('font-size', '10px')
      .text(d => `${d.data.key} (${d.data.value})`);
  }, [items, height, colors]);

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} />
    </div>
  );
}

export default PieChart;
