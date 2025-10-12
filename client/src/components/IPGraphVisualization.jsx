import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

// --- Komponen Ikon Dihapus dari sini ---

const IPGraphVisualization = ({ data, onNodeClick, onLinkClick, rootId }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        d3.select(svgRef.current).selectAll("*").remove();

        if (!containerRef.current || !data || data.nodes.length === 0) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        if (width === 0 || height === 0) return;

        const nodes = data.nodes.map(d => ({ ...d }));
        const links = data.links.map(d => ({ ...d }));

        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [-width / 2, -height / 2, width, height]);

        const g = svg.append("g");
        
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(150).strength(0.5))
            .force("charge", d3.forceManyBody().strength(-600))
            .force("center", d3.forceCenter(0, 0))
            .force("x", d3.forceX().strength(0.05))
            .force("y", d3.forceY().strength(0.05));

        const link = g.append("g")
            .attr("stroke", "#4A4A4A")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", 2);

        const nodeGroup = g.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("cursor", "pointer")
            .on("click", (event, d) => onNodeClick(d.id))
            .call(drag(simulation));

        nodeGroup.append("circle")
            .attr("r", 22)
            .attr("fill", d => d.id === rootId ? '#FFD700' : (d.analytics?.disputeStatus === 'Active' ? '#F44336' : '#5A429C'))
            .attr("class", d => d.id === rootId ? 'animate-pulse' : '')
            .attr("fill-opacity", 0.3);

        nodeGroup.append("circle")
            .attr("r", 18)
            .attr("fill", "#1E1B33")
            .attr("stroke", d => d.id === rootId ? '#FFD700' : (d.analytics?.disputeStatus === 'Active' ? '#F44336' : '#8A63D2'))
            .attr("stroke-width", 2);
            
        // --- ▼▼▼ PERBAIKAN UTAMA DI SINI ▼▼▼ ---
        // Menggambar path SVG secara langsung, bukan menggunakan komponen React
        nodeGroup.append("path")
            .attr("d", d => {
                switch (d.mediaType) {
                    case 'IMAGE': return "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z";
                    case 'VIDEO': return "M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z";
                    case 'AUDIO': return "M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z";
                    case 'TEXT': return "M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z";
                    default: return "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z";
                }
            })
            .attr("transform", "translate(-12, -12)") // Pusatkan ikon 24x24
            .attr("fill", "#E0D5FF");

        nodeGroup.append("text")
            .attr("x", 26)
            .attr("y", "0.31em")
            .text(d => d.title.length > 20 ? d.title.substring(0, 18) + '...' : d.title)
            .attr("fill", "#ccc")
            .attr("font-size", "12px")
            .attr("stroke", "#111")
            .attr("stroke-width", 0.3)
            .attr("paint-order", "stroke");

        nodeGroup.on("mouseover", (event, d) => {
            d3.select("#tooltip")
                .style("opacity", 1)
                .html(`
                    <div class="font-bold text-purple-300">${d.title}</div>
                    <div class="text-xs text-gray-400 font-mono">${d.id.substring(0, 16)}...</div>
                    <div class="mt-2 text-xs">
                        ${d.analytics?.disputeStatus === 'Active' ? '<div class="font-bold text-red-400">STATUS: IN DISPUTE</div>' : ''}
                        <div>Type: ${d.mediaType}</div>
                    </div>
                `)
                .style("left", `${event.pageX + 15}px`)
                .style("top", `${event.pageY}px`);
            
            link.attr("stroke-opacity", l => (l.source === d || l.target === d) ? 1 : 0.2);
            nodeGroup.attr("opacity", n => (n === d || links.some(l => (l.source === d && l.target === n) || (l.source === n && l.target === d))) ? 1 : 0.3);
        }).on("mouseout", () => {
            d3.select("#tooltip").style("opacity", 0);
            link.attr("stroke-opacity", 0.6);
            nodeGroup.attr("opacity", 1);
        });

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
        });
        
        function drag(simulation) {
            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }
            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
            return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
        }

        svg.call(d3.zoom().extent([[0, 0], [width, height]]).scaleExtent([0.1, 8]).on("zoom", ({transform}) => {
            g.attr("transform", transform);
        }));

    }, [data, onNodeClick, onLinkClick, rootId]);

    return (
        <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: '70vh' }}>
            <svg ref={svgRef} className="block"></svg>
            <div id="tooltip" className="absolute opacity-0 bg-gray-900 border border-purple-500 text-sm text-white p-3 rounded-lg pointer-events-none transition-opacity duration-200 shadow-2xl z-50"></div>
        </div>
    );
};

export default IPGraphVisualization;